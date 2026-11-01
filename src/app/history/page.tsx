"use client";

import { useState } from "react";
import { EXERCISES } from "@/lib/exercises";
import { DAYS, weekInfo } from "@/lib/program";
import { convert, fmt } from "@/lib/progression";
import { deleteSession, useStore } from "@/lib/store";

export default function HistoryPage() {
  const { sessions, settings, loaded } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"sessions" | "lifts">("sessions");
  if (!loaded) return <div className="screen center muted">Loading…</div>;

  const unit = settings.unit;

  // Best weight per exercise and its trend (first vs latest)
  const lifts = new Map<string, { first: number; best: number; latest: number; count: number }>();
  for (const s of sessions) {
    const byEx = new Map<string, number>();
    for (const set of s.sets) {
      if (set.weight == null) continue;
      const w = convert(set.weight, s.unit, unit);
      byEx.set(set.exerciseId, Math.max(byEx.get(set.exerciseId) ?? 0, w));
    }
    byEx.forEach((w, id) => {
      const cur = lifts.get(id);
      lifts.set(id, cur ? { first: cur.first, best: Math.max(cur.best, w), latest: w, count: cur.count + 1 } : { first: w, best: w, latest: w, count: 1 });
    });
  }

  return (
    <div className="screen">
      <h1>History</h1>
      <div className="seg">
        <button className={tab === "sessions" ? "on" : ""} onClick={() => setTab("sessions")}>
          Workouts
        </button>
        <button className={tab === "lifts" ? "on" : ""} onClick={() => setTab("lifts")}>
          Lift progress
        </button>
      </div>

      {sessions.length === 0 && <p className="muted center-text">No workouts yet. Your first one is waiting on the Today tab.</p>}

      {tab === "sessions" &&
        [...sessions].reverse().map((s) => {
          const day = DAYS.find((d) => d.id === s.dayId);
          const info = weekInfo(s.week);
          const grouped = new Map<string, string[]>();
          for (const set of s.sets) {
            const v = set.seconds != null ? `${set.seconds}s` : `${set.reps}`;
            const txt = set.weight != null ? `${v}×${fmt(set.weight)}` : v;
            grouped.set(set.exerciseId, [...(grouped.get(set.exerciseId) ?? []), txt]);
          }
          return (
            <div key={s.id} className="card tight">
              <button className="ex-row" onClick={() => setOpen(open === s.id ? null : s.id)}>
                <div>
                  <b>
                    Day {day?.num}: {day?.name}
                  </b>
                  <div className="small muted">
                    {new Date(s.completedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · Wk{" "}
                    {info.week} · {Math.round(s.durationSec / 60)} min
                  </div>
                </div>
                <span className="small muted">{s.synced ? "☁" : "⌂"}</span>
              </button>
              {open === s.id && (
                <div className="ex-detail">
                  {[...grouped].map(([id, sets]) => (
                    <div key={id} className="small">
                      <b>{EXERCISES[id]?.name ?? id}</b> <span className="muted">{sets.join(", ")} {s.unit}</span>
                    </div>
                  ))}
                  <button
                    className="link small warn"
                    onClick={() => {
                      if (confirm("Delete this workout?")) void deleteSession(s.id);
                    }}
                  >
                    Delete workout
                  </button>
                </div>
              )}
            </div>
          );
        })}

      {tab === "lifts" &&
        [...lifts]
          .sort((a, b) => b[1].count - a[1].count)
          .map(([id, l]) => {
            const gain = l.latest - l.first;
            return (
              <div key={id} className="card tight row-between">
                <div>
                  <b>{EXERCISES[id]?.name ?? id}</b>
                  <div className="small muted">
                    {l.count} sessions · best {fmt(l.best)} {unit}
                  </div>
                </div>
                <div className={`small ${gain > 0 ? "accent" : "muted"}`}>
                  {fmt(l.first)} → {fmt(l.latest)} {gain > 0 ? "▲" : ""}
                </div>
              </div>
            );
          })}
    </div>
  );
}
