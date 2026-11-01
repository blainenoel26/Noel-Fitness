"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EXERCISES, canDo, resolveExercise, videoUrl, type Exercise } from "@/lib/exercises";
import { buildSteps, estimateMinutes, getDay, weekInfo, type SessionLength, type Step } from "@/lib/program";
import { fmt, suggest } from "@/lib/progression";
import { currentWeek, lastSetsFor, saveSession, useStore, uuid, type SetLog } from "@/lib/store";

type SetStep = Extract<Step, { kind: "set" }>;

interface Entry {
  exerciseId: string;
  reps: number | null;
  weight: number | null;
  seconds: number | null;
}

interface Active {
  id: string;
  dayId: string;
  week: number;
  length: SessionLength;
  startedAt: number;
  idx: number;
  entries: Record<string, Entry>;
  swaps: Record<string, string>;
}

const K_ACTIVE = "as.active";

function loadActive(dayId: string): Active | null {
  try {
    const a = JSON.parse(localStorage.getItem(K_ACTIVE) ?? "null") as Active | null;
    return a && a.dayId === dayId ? a : null;
  } catch {
    return null;
  }
}

// ---------- audio + haptics ----------
let audio: AudioContext | null = null;
function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    /* no audio */
  }
}
function beep(times = 1, freq = 880) {
  try {
    navigator.vibrate?.(times > 1 ? [200, 100, 200, 100, 300] : 200);
    if (!audio) return;
    for (let i = 0; i < times; i++) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = freq;
      o.connect(g);
      g.connect(audio.destination);
      const t = audio.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t);
      o.stop(t + 0.22);
    }
  } catch {
    /* ignore */
  }
}

function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (wl && document.visibilityState === "visible") lock = await wl.request("screen");
      } catch {
        /* not supported */
      }
    };
    void req();
    const onVis = () => void req();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, []);
}

function clock(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------- timer hook ----------
function useCountdown(onDone: () => void) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (endAt == null) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endAt) {
        setEndAt(null);
        done.current();
      }
    }, 200);
    return () => clearInterval(t);
  }, [endAt]);
  return {
    running: endAt != null,
    left: endAt == null ? 0 : (endAt - now) / 1000,
    start: (sec: number) => {
      setNow(Date.now());
      setEndAt(Date.now() + sec * 1000);
    },
    add: (sec: number) => setEndAt((e) => (e == null ? e : e + sec * 1000)),
    stop: () => setEndAt(null),
  };
}

export default function Player({ dayId }: { dayId: string }) {
  const router = useRouter();
  const store = useStore();
  const { settings, sessions } = store;
  const day = getDay(dayId)!;
  useWakeLock();

  const [active, setActive] = useState<Active | null>(null);
  const [mode, setMode] = useState<"work" | "rest">("work");
  const [showHow, setShowHow] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Start or resume
  useEffect(() => {
    if (!store.loaded || active) return;
    const resumed = loadActive(dayId);
    setActive(
      resumed ?? {
        id: uuid(),
        dayId,
        week: currentWeek(sessions, settings),
        length: settings.length,
        startedAt: Date.now(),
        idx: 0,
        entries: {},
        swaps: {},
      },
    );
  }, [store.loaded, active, dayId, sessions, settings]);

  useEffect(() => {
    if (active) localStorage.setItem(K_ACTIVE, JSON.stringify(active));
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setElapsed((Date.now() - active.startedAt) / 1000), 1000);
    return () => clearInterval(t);
  }, [active]);

  const info = weekInfo(active?.week ?? 1);
  const length = active?.length ?? 45;
  const steps = useMemo(() => buildSteps(day, info, length), [day, info.week, info.cycle, length]); // eslint-disable-line react-hooks/exhaustive-deps
  const idx = active?.idx ?? 0;
  const step: Step | undefined = steps[idx];

  const exFor = useCallback(
    (s: SetStep): Exercise => {
      const sw = active?.swaps[s.exerciseId];
      return sw ? EXERCISES[sw] : resolveExercise(s.exerciseId, settings.equipment);
    },
    [active?.swaps, settings.equipment],
  );

  const goto = (i: number) => {
    setActive((a) => (a ? { ...a, idx: Math.max(0, Math.min(steps.length, i)) } : a));
    setMode("work");
    setShowHow(false);
    setShowSwap(false);
  };

  const rest = useCountdown(() => {
    beep(3);
    goto(idx + 1);
  });
  const work = useCountdown(() => {
    beep(2, 660);
    if (step?.kind === "warmup") goto(idx + 1);
  });

  // Half-way "switch sides" cue for timed per-side holds.
  const halfBeeped = useRef(false);
  useEffect(() => {
    if (!work.running) {
      halfBeeped.current = false;
      return;
    }
    if (step?.kind === "set" && step.seconds && exFor(step).perSide && !halfBeeped.current && work.left <= step.seconds) {
      halfBeeped.current = true;
      beep(1, 520);
    }
  }, [work.left, work.running, step, exFor]);

  // ---------- current-set form values ----------
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<number>(0);

  const setStep = step?.kind === "set" ? step : null;
  const ex = setStep ? exFor(setStep) : null;
  const last = ex ? lastSetsFor(sessions, ex.id) : null;
  const sug = ex && setStep ? suggest(ex, last, setStep.repRange, settings.unit, setStep.deload) : null;

  useEffect(() => {
    if (!setStep || !ex || !active) return;
    const existing = active.entries[setStep.key];
    // previous set of the same exercise in this workout
    const prevKey = Object.keys(active.entries)
      .reverse()
      .find((k) => active.entries[k].exerciseId === ex.id);
    const prev = prevKey ? active.entries[prevKey] : null;
    const w = existing?.weight ?? prev?.weight ?? sug?.weight ?? null;
    setWeight(w == null ? "" : fmt(w));
    const fallbackReps = setStep.repRange ? setStep.repRange[1] : parseInt(setStep.target) || 10;
    setReps(existing?.reps ?? prev?.reps ?? fallbackReps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, ex?.id, active?.id]);

  if (!active || !store.loaded) return <div className="screen center muted">Loading…</div>;

  const progress = Math.min(1, idx / steps.length);
  const remainingMin = estimateMinutes(steps.slice(idx));

  const exit = () => router.push("/");

  // ---------- finished ----------
  if (!step) {
    const entries = Object.values(active.entries);
    const volume = entries.reduce((v, e) => v + (e.weight ?? 0) * (e.reps ?? 0), 0);
    const finish = () => {
      const sets: SetLog[] = steps
        .filter((s): s is SetStep => s.kind === "set" && !!active.entries[s.key])
        .map((s) => {
          const e = active.entries[s.key];
          return { exerciseId: e.exerciseId, setIndex: s.set, reps: e.reps, weight: e.weight, seconds: e.seconds };
        });
      saveSession({
        id: active.id,
        dayId,
        week: active.week,
        startedAt: new Date(active.startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        durationSec: Math.round((Date.now() - active.startedAt) / 1000),
        unit: settings.unit,
        sets,
      });
      localStorage.removeItem(K_ACTIVE);
      router.push("/?done=1");
    };
    return (
      <div className="screen">
        <div className="finish">
          <div className="big-emoji">💪</div>
          <h1>Workout complete</h1>
          <p className="muted">
            Day {day.num} · {day.name} · Week {info.week}
          </p>
          <div className="stats">
            <div>
              <b>{clock(elapsed)}</b>
              <span>time</span>
            </div>
            <div>
              <b>{entries.length}</b>
              <span>sets</span>
            </div>
            <div>
              <b>{fmt(Math.round(volume))}</b>
              <span>{settings.unit} lifted</span>
            </div>
          </div>
          <p className="muted small">Cool down: 2–3 min easy walking, then a hip-flexor and chest stretch.</p>
          <button className="btn primary block" onClick={finish}>
            Save workout
          </button>
          <button className="btn ghost block" onClick={() => goto(steps.length - 1)}>
            Back to last set
          </button>
        </div>
      </div>
    );
  }

  const header = (
    <div className="player-top">
      <button className="icon-btn" onClick={exit} aria-label="Exit (progress is saved)">
        ✕
      </button>
      <div className="grow">
        <div className="bar">
          <div style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="small muted row-between">
          <span>
            Day {day.num} · Wk {info.week} · {length}m
            {info.deload ? " · Deload" : ""}
          </span>
          <span>
            {clock(elapsed)} · ~{remainingMin} min left
          </span>
        </div>
      </div>
    </div>
  );

  // ---------- warm-up ----------
  if (step.kind === "warmup") {
    return (
      <div className="screen player">
        {header}
        <div className="chip">
          Warm-up {step.index + 1}/{step.total}
        </div>
        <h1 className="ex-name">{step.move.name}</h1>
        <p className="lead">{step.move.cue}</p>
        <div className="timer-ring">{work.running ? clock(work.left) : clock(step.move.seconds)}</div>
        <div className="actions">
          {work.running ? (
            <button className="btn ghost" onClick={() => { work.stop(); goto(idx + 1); }}>
              Skip ›
            </button>
          ) : (
            <>
              <button className="btn primary" onClick={() => { unlockAudio(); work.start(step.move.seconds); }}>
                ▶ Start {step.move.seconds}s
              </button>
              <button className="btn ghost" onClick={() => goto(steps.findIndex((s) => s.kind === "set"))}>
                Skip warm-up
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const s = step;
  const exercise = ex!;
  const nextSet = steps.slice(idx + 1).find((x): x is SetStep => x.kind === "set");
  const nextEx = nextSet ? exFor(nextSet) : null;
  const weighted = exercise.implements.length > 0;
  const timed = s.seconds != null;
  const timedTotal = timed ? s.seconds! * (exercise.perSide ? 2 : 1) : 0;

  const logSet = () => {
    unlockAudio();
    const w = parseFloat(weight);
    const entry: Entry = {
      exerciseId: exercise.id,
      reps: timed ? null : reps,
      weight: weighted && !Number.isNaN(w) ? w : null,
      seconds: timed ? s.seconds : null,
    };
    setActive((a) => (a ? { ...a, entries: { ...a.entries, [s.key]: entry } } : a));
    work.stop();
    if (idx + 1 >= steps.length) {
      goto(idx + 1);
    } else {
      setMode("rest");
      rest.start(s.rest);
    }
  };

  // ---------- rest ----------
  if (mode === "rest") {
    return (
      <div className="screen player">
        {header}
        <div className="chip">Rest</div>
        <div className="timer-ring rest">{clock(rest.left)}</div>
        <div className="row center gap">
          <button className="btn ghost" onClick={() => rest.add(15)}>
            +15s
          </button>
          <button className="btn ghost" onClick={() => { rest.stop(); goto(idx + 1); }}>
            Skip rest ›
          </button>
        </div>
        {nextSet && nextEx && (
          <div className="card next-up">
            <div className="small muted">Up next · {nextSet.block}</div>
            <div className="h3">{nextEx.name}</div>
            <div className="muted">
              Set {nextSet.set}/{nextSet.totalSets} · {nextSet.target}
            </div>
          </div>
        )}
        <button className="link small" onClick={() => { rest.stop(); setMode("work"); }}>
          ‹ Edit the set I just logged
        </button>
      </div>
    );
  }

  // ---------- work ----------
  const swapOptions = [EXERCISES[s.exerciseId], ...EXERCISES[s.exerciseId].swaps.map((id) => EXERCISES[id])].filter(
    (e, i, arr) => e && arr.findIndex((x) => x.id === e.id) === i,
  );
  const wStep = settings.unit === "kg" ? 1 : 2.5;

  return (
    <div className="screen player">
      {header}
      <div className="row-between">
        <div className="chip">
          {s.block} · {s.blockTitle}
        </div>
        <div className="small muted">
          Set {s.set} of {s.totalSets}
        </div>
      </div>

      <h1 className="ex-name">{exercise.name}</h1>
      <div className="muted small">{exercise.muscles}</div>
      {exercise.id !== s.exerciseId && <div className="small accent">Swapped from {EXERCISES[s.exerciseId].name}</div>}

      <div className="target">
        <div className="target-main">{s.target}</div>
        {s.rir !== "—" && <div className="small muted">Stop with {s.rir} rep{s.rir === "1" ? "" : "s"} left in the tank</div>}
      </div>

      {(sug?.lastSummary || sug?.note) && (
        <div className="card tight">
          {sug?.lastSummary && (
            <div className="small">
              <span className="muted">Last time:</span> {sug.lastSummary} {weighted ? settings.unit : ""}
            </div>
          )}
          {sug?.note && <div className="small accent">{sug.note}</div>}
        </div>
      )}

      <div className="inputs">
        {weighted && (
          <div className="field">
            <label>Weight ({settings.unit})</label>
            <div className="stepper">
              <button onClick={() => setWeight((w) => fmt(Math.max(0, (parseFloat(w) || 0) - wStep)))}>−</button>
              <input inputMode="decimal" value={weight} placeholder="0" onChange={(e) => setWeight(e.target.value)} />
              <button onClick={() => setWeight((w) => fmt((parseFloat(w) || 0) + wStep))}>+</button>
            </div>
          </div>
        )}
        {!timed && (
          <div className="field">
            <label>Reps{exercise.perSide ? " (per side)" : ""}</label>
            <div className="stepper">
              <button onClick={() => setReps((r) => Math.max(0, r - 1))}>−</button>
              <input inputMode="numeric" value={reps} onChange={(e) => setReps(parseInt(e.target.value) || 0)} />
              <button onClick={() => setReps((r) => r + 1)}>+</button>
            </div>
          </div>
        )}
      </div>

      {timed && (
        <div className="timed">
          <div className="timer-ring small-ring">
            {work.running
              ? exercise.perSide
                ? `${clock(work.left > s.seconds! ? work.left - s.seconds! : work.left)}`
                : clock(work.left)
              : clock(s.seconds!)}
          </div>
          {work.running && exercise.perSide && <div className="small accent center-text">{work.left > s.seconds! ? "Side 1" : "Side 2 — switch!"}</div>}
          {!work.running && (
            <button className="btn ghost block" onClick={() => { unlockAudio(); work.start(timedTotal); }}>
              ▶ Start timer{exercise.perSide ? " (both sides)" : ""}
            </button>
          )}
        </div>
      )}

      <div className="row gap wrap">
        <button className="btn ghost sm" onClick={() => setShowHow((v) => !v)}>
          {showHow ? "Hide" : "How to"}
        </button>
        <button className="btn ghost sm" onClick={() => setShowSwap((v) => !v)}>
          ⇄ Swap
        </button>
        <a className="btn ghost sm" href={videoUrl(exercise)} target="_blank" rel="noreferrer">
          ▶ Video
        </a>
      </div>

      {showHow && (
        <div className="card">
          <ol className="cues">
            {exercise.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
          <div className="small warn">Avoid: {exercise.avoid}</div>
        </div>
      )}

      {showSwap && (
        <div className="card">
          <div className="small muted">Choose an alternative</div>
          {swapOptions.map((o) => (
            <button
              key={o.id}
              className={`swap-opt ${o.id === exercise.id ? "on" : ""}`}
              onClick={() => {
                setActive((a) => (a ? { ...a, swaps: { ...a.swaps, [s.exerciseId]: o.id } } : a));
                setShowSwap(false);
              }}
            >
              <span>{o.name}</span>
              <span className="small muted">{canDo(o, settings.equipment) ? o.pattern : "needs " + (o.needs ?? []).join(", ")}</span>
            </button>
          ))}
        </div>
      )}

      <div className="bottom-bar">
        <button className="btn ghost" disabled={idx === 0} onClick={() => goto(idx - 1)} aria-label="Previous">
          ‹
        </button>
        <button className="btn primary grow" onClick={logSet}>
          ✓ Log set{s.rest ? ` · rest ${s.rest}s` : ""}
        </button>
      </div>
      <Link href="/" className="sr-only">
        Home
      </Link>
    </div>
  );
}
