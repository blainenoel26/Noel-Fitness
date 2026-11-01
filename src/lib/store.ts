"use client";

import { useEffect, useState } from "react";
import { DAYS, type SessionLength } from "./program";
import type { EquipmentSettings } from "./exercises";
import { supabase } from "./supabase";

// Local-first store: everything lives in localStorage so the app works
// offline (gyms, hotels, planes); when signed in it syncs with Supabase.

export type Unit = "kg" | "lb";

export interface SetLog {
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  weight: number | null;
  seconds: number | null;
}

export interface Session {
  id: string;
  dayId: string;
  week: number; // absolute program week
  startedAt: string;
  completedAt: string;
  durationSec: number;
  unit: Unit;
  sets: SetLog[];
  synced?: boolean;
}

export interface Settings {
  unit: Unit;
  length: SessionLength;
  equipment: EquipmentSettings;
  // Lets the user jump to a week: at `sessionCount` completed sessions the week was `week`.
  anchor: { week: number; sessionCount: number };
}

const DEFAULT_SETTINGS: Settings = {
  unit: "lb",
  length: 45,
  equipment: { db: true, kb: true, bench: true, box: true },
  anchor: { week: 1, sessionCount: 0 },
};

const K_SESSIONS = "as.sessions";
const K_SETTINGS = "as.settings";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

// ---------- tiny reactive store ----------
const listeners = new Set<() => void>();
let state: { sessions: Session[]; settings: Settings; loaded: boolean } = {
  sessions: [],
  settings: DEFAULT_SETTINGS,
  loaded: false,
};

function load() {
  if (state.loaded || typeof window === "undefined") return;
  const s = read<Partial<Settings>>(K_SETTINGS, {});
  state = {
    sessions: read<Session[]>(K_SESSIONS, []),
    settings: { ...DEFAULT_SETTINGS, ...s, equipment: { ...DEFAULT_SETTINGS.equipment, ...s.equipment } },
    loaded: true,
  };
}

function emit() {
  listeners.forEach((l) => l());
}

function setSessions(sessions: Session[]) {
  sessions.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  state = { ...state, sessions };
  write(K_SESSIONS, sessions);
  emit();
}

export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    load();
    force((n) => n + 1);
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

export function updateSettings(patch: Partial<Settings>) {
  load();
  state = { ...state, settings: { ...state.settings, ...patch } };
  write(K_SETTINGS, state.settings);
  emit();
  void pushSettings();
}

// ---------- program position ----------
export function currentWeek(sessions: Session[], settings: Settings) {
  const { week, sessionCount } = settings.anchor;
  const done = Math.max(0, sessions.length - sessionCount);
  return week + Math.floor(done / DAYS.length);
}

export function nextDayId(sessions: Session[], settings: Settings) {
  const done = Math.max(0, sessions.length - settings.anchor.sessionCount);
  const inWeek = done % DAYS.length;
  const thisWeek = sessions.slice(sessions.length - inWeek).map((s) => s.dayId);
  return (DAYS.find((d) => !thisWeek.includes(d.id)) ?? DAYS[0]).id;
}

export function daysDoneThisWeek(sessions: Session[], settings: Settings) {
  const done = Math.max(0, sessions.length - settings.anchor.sessionCount);
  const inWeek = done % DAYS.length;
  return sessions.slice(sessions.length - inWeek).map((s) => s.dayId);
}

export function setCurrentWeek(week: number) {
  load();
  updateSettings({ anchor: { week: Math.max(1, week), sessionCount: state.sessions.length } });
}

// ---------- sessions ----------
export function saveSession(session: Session) {
  load();
  setSessions([...state.sessions.filter((s) => s.id !== session.id), { ...session, synced: false }]);
  void syncNow();
}

export async function deleteSession(id: string) {
  load();
  setSessions(state.sessions.filter((s) => s.id !== id));
  const sb = supabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  if (data.session) await sb.from("workout_sessions").delete().eq("id", id);
}

// Most recent logged sets for an exercise (from the latest session that has it).
export function lastSetsFor(sessions: Session[], exerciseId: string): { sets: SetLog[]; unit: Unit } | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const sets = sessions[i].sets.filter((s) => s.exerciseId === exerciseId);
    if (sets.length) return { sets, unit: sessions[i].unit };
  }
  return null;
}

// ---------- cloud sync ----------
export type SyncStatus = "local" | "syncing" | "synced" | "error";
let syncStatus: SyncStatus = "local";
let syncError = "";
export const getSyncStatus = () => ({ status: syncStatus, error: syncError });

function setStatus(s: SyncStatus, err = "") {
  syncStatus = s;
  syncError = err;
  emit();
}

interface SessionRow {
  id: string;
  day_id: string;
  program_week: number;
  started_at: string;
  completed_at: string;
  duration_sec: number;
  unit: Unit;
  set_logs: { exercise_id: string; set_index: number; reps: number | null; weight: number | null; seconds: number | null }[];
}

let syncing: Promise<void> | null = null;

export function syncNow() {
  if (!syncing) syncing = doSync().finally(() => (syncing = null));
  return syncing;
}

async function doSync() {
  load();
  const sb = supabase();
  if (!sb) return;
  const { data: auth } = await sb.auth.getSession();
  if (!auth.session) {
    setStatus("local");
    return;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus("error", "Offline — will sync when you reconnect");
    return;
  }
  setStatus("syncing");
  try {
    const { data, error } = await sb
      .from("workout_sessions")
      .select("id, day_id, program_week, started_at, completed_at, duration_sec, unit, set_logs(exercise_id, set_index, reps, weight, seconds)")
      .order("completed_at");
    if (error) throw error;
    const rows = (data ?? []) as SessionRow[];
    const cloudIds = new Set(rows.map((r) => r.id));

    // Upload anything local that the cloud doesn't have.
    for (const s of state.sessions.filter((x) => !cloudIds.has(x.id))) {
      const { error: e1 } = await sb.from("workout_sessions").insert({
        id: s.id,
        day_id: s.dayId,
        program_week: s.week,
        started_at: s.startedAt,
        completed_at: s.completedAt,
        duration_sec: s.durationSec,
        unit: s.unit,
      });
      if (e1) throw e1;
      if (s.sets.length) {
        const { error: e2 } = await sb.from("set_logs").insert(
          s.sets.map((x) => ({
            session_id: s.id,
            exercise_id: x.exerciseId,
            set_index: x.setIndex,
            reps: x.reps,
            weight: x.weight,
            seconds: x.seconds,
          })),
        );
        if (e2) throw e2;
      }
    }

    // Pull down anything recorded on another device.
    const localIds = new Set(state.sessions.map((s) => s.id));
    const pulled: Session[] = rows
      .filter((r) => !localIds.has(r.id))
      .map((r) => ({
        id: r.id,
        dayId: r.day_id,
        week: r.program_week,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        durationSec: r.duration_sec,
        unit: r.unit,
        sets: r.set_logs
          .map((l) => ({ exerciseId: l.exercise_id, setIndex: l.set_index, reps: l.reps, weight: l.weight, seconds: l.seconds }))
          .sort((a, b) => a.setIndex - b.setIndex),
        synced: true,
      }));
    setSessions([...state.sessions.map((s) => ({ ...s, synced: true })), ...pulled]);
    setStatus("synced");
  } catch (e) {
    setStatus("error", e instanceof Error ? e.message : String(e));
  }
}

async function pushSettings() {
  const sb = supabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  if (data.session) await sb.auth.updateUser({ data: { settings: state.settings } });
}

// Called after sign-in: adopt settings saved on another device, then sync.
export async function onSignedIn() {
  const sb = supabase();
  if (!sb) return;
  const { data } = await sb.auth.getUser();
  const remote = data.user?.user_metadata?.settings as Settings | undefined;
  load();
  if (remote) {
    state = { ...state, settings: { ...DEFAULT_SETTINGS, ...remote, equipment: { ...DEFAULT_SETTINGS.equipment, ...remote.equipment } } };
    write(K_SETTINGS, state.settings);
    emit();
  }
  await syncNow();
}

export function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}
