"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EXERCISES, canDo, resolveExercise, videoUrl, type Exercise } from "@/lib/exercises";
import {
  PREP_SECONDS,
  SWITCH_SECONDS,
  buildSteps,
  estimateMinutes,
  getDay,
  weekInfo,
  workSeconds,
  type SessionLength,
  type Step,
} from "@/lib/program";
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
const GET_READY = 10; // seconds before a set that doesn't follow a rest

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
function beep(times = 1, freq = 880, dur = 0.2) {
  try {
    navigator.vibrate?.(times > 1 ? [200, 100, 200, 100, 300] : Math.round(dur * 1000));
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
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
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

// ---------- one shared timer for ready / work / rest ----------
type Phase = "idle" | "ready" | "work" | "rest";

function useTimer(onDone: (phase: Phase) => void) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [now, setNow] = useState(Date.now());
  const phaseRef = useRef<Phase>("idle");
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (endAt == null) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endAt) {
        setEndAt(null);
        done.current(phaseRef.current);
      }
    }, 200);
    return () => clearInterval(t);
  }, [endAt]);

  return {
    left: pausedLeft ?? (endAt == null ? 0 : Math.max(0, (endAt - now) / 1000)),
    total,
    running: endAt != null,
    paused: pausedLeft != null,
    start(sec: number, phase: Phase) {
      phaseRef.current = phase;
      const n = Date.now();
      setNow(n);
      setTotal(sec);
      setPausedLeft(null);
      setEndAt(n + sec * 1000);
    },
    pause() {
      if (endAt == null) return;
      setPausedLeft(Math.max(0, (endAt - Date.now()) / 1000));
      setEndAt(null);
    },
    resume() {
      if (pausedLeft == null) return;
      const n = Date.now();
      setNow(n);
      setEndAt(n + pausedLeft * 1000);
      setPausedLeft(null);
    },
    add(sec: number) {
      if (endAt != null) setEndAt(endAt + sec * 1000);
      else if (pausedLeft != null) setPausedLeft(pausedLeft + sec);
      setTotal((t) => t + sec);
    },
    stop() {
      setEndAt(null);
      setPausedLeft(null);
    },
  };
}

export default function Player({ dayId }: { dayId: string }) {
  const router = useRouter();
  const store = useStore();
  const { settings, sessions } = store;
  const auto = settings.autoAdvance;
  const day = getDay(dayId)!;
  useWakeLock();

  const [active, setActive] = useState<Active | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
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
    const tick = () => setElapsed((Date.now() - active.startedAt) / 1000);
    tick();
    const t = setInterval(tick, 1000);
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

  // ---------- flow control ----------
  const timer = useTimer((p) => handlers.current[p]?.());

  const resetUi = () => {
    setShowHow(false);
    setShowSwap(false);
  };

  const startWork = (i: number) => {
    const st = steps[i];
    if (!st || st.kind === "prep") return;
    const secs = st.kind === "warmup" ? st.move.seconds : workSeconds(st, exFor(st));
    setPhase("work");
    timer.start(secs, "work");
    beep(1, 990, 0.15);
  };

  // Move to step i. `flowing` = we're in the automatic flow (after a rest or warm-up move).
  const enter = (i: number, flowing: boolean) => {
    const target = Math.max(0, Math.min(steps.length, i));
    timer.stop();
    resetUi();
    setActive((a) => (a ? { ...a, idx: target } : a));
    const st = steps[target];
    if (!st) {
      setPhase("idle");
      return;
    }
    if (!auto || !flowing) {
      setPhase("idle");
      return;
    }
    if (st.kind === "warmup") startWork(target);
    else if (st.kind === "prep") {
      setPhase("ready");
      timer.start(PREP_SECONDS, "ready");
    } else if (steps[target - 1]?.kind === "prep" || (steps[target - 1]?.kind === "set" && phase === "rest")) startWork(target);
    else {
      setPhase("ready");
      timer.start(GET_READY, "ready");
    }
  };

  const commit = () => {
    if (!setStep || !ex) return;
    const w = parseFloat(weight);
    const timed = setStep.seconds != null;
    const entry: Entry = {
      exerciseId: ex.id,
      reps: timed ? null : reps,
      weight: ex.implements.length > 0 && !Number.isNaN(w) ? w : null,
      seconds: timed ? setStep.seconds : null,
    };
    setActive((a) => (a ? { ...a, entries: { ...a.entries, [setStep.key]: entry } } : a));
  };

  const finishWork = () => {
    timer.stop();
    if (!step) return;
    if (step.kind === "warmup" || step.kind === "prep") {
      beep(1, 660);
      enter(idx + 1, auto);
      return;
    }
    commit();
    beep(2, 660);
    if (idx + 1 >= steps.length) {
      enter(steps.length, false);
      return;
    }
    setPhase("rest");
    timer.start(step.rest, "rest");
  };

  const finishRest = () => {
    commit(); // pick up any edits made while resting
    beep(1, 990, 0.3);
    enter(idx + 1, true);
  };

  // Called when the user taps Start / Resume from idle.
  const begin = () => {
    unlockAudio();
    if (!step) return;
    if (step.kind === "prep") {
      if (auto) {
        setPhase("ready");
        timer.start(PREP_SECONDS, "ready");
      } else enter(idx + 1, false);
    } else if (step.kind === "warmup" || !auto) startWork(idx);
    else {
      setPhase("ready");
      timer.start(GET_READY, "ready");
    }
  };

  const handlers = useRef<Partial<Record<Phase, () => void>>>({});
  handlers.current = {
    ready: () => (step?.kind === "prep" ? enter(idx + 1, true) : startWork(idx)),
    work: finishWork,
    rest: finishRest,
  };

  // 3-2-1 countdown ticks and the side-switch cue
  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (!timer.running) return;
    const sec = Math.ceil(timer.left);
    if (sec === lastTick.current) return;
    lastTick.current = sec;
    if ((phase === "ready" || phase === "rest") && sec >= 1 && sec <= 3) beep(1, 660, 0.08);
    // heads-up that the current timer is about to end
    if (sec === 10 && timer.total > 15 && (phase !== "ready" || step?.kind === "prep")) beep(2, 1250, 0.1);
    if (phase === "work" && ex?.perSide && setStep) {
      const side = (timer.total - SWITCH_SECONDS) / 2;
      const el = timer.total - timer.left;
      if (Math.abs(el - side) < 0.6) beep(2, 520, 0.12);
    }
  }, [timer.left, timer.running, timer.total, phase, ex?.perSide, setStep, step?.kind]);

  if (!active || !store.loaded) return <div className="screen center muted">Loading…</div>;

  const progress = Math.min(1, idx / steps.length);
  const remainingMin = estimateMinutes(steps.slice(idx));
  const exit = () => {
    timer.stop();
    router.push("/");
  };

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
          <button className="btn ghost block" onClick={() => enter(steps.length - 1, false)}>
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
            Day {day.num} · Wk {info.week} · {length}m{info.deload ? " · Deload" : ""}
          </span>
          <span>
            {clock(elapsed)} · ~{remainingMin} min left
          </span>
        </div>
      </div>
    </div>
  );

  const pauseBtn = (
    <button className="btn ghost" onClick={() => (timer.paused ? timer.resume() : timer.pause())} aria-label={timer.paused ? "Resume" : "Pause"}>
      {timer.paused ? "▶" : "❚❚"}
    </button>
  );

  // ---------- warm-up ----------
  if (step.kind === "warmup") {
    const firstSet = steps.findIndex((s) => s.kind === "prep");
    return (
      <div className="screen player">
        {header}
        <div className="chip">
          Warm-up {step.index + 1}/{step.total}
        </div>
        <h1 className="ex-name">{step.move.name}</h1>
        <p className="lead">{step.move.cue}</p>
        <div className={`timer-ring ${timer.paused ? "paused" : ""}`}>{phase === "work" ? clock(timer.left) : clock(step.move.seconds)}</div>
        {phase === "work" ? (
          <div className="control-row">
            {pauseBtn}
            <button className="btn ghost grow" onClick={finishWork}>
              Next move ›
            </button>
          </div>
        ) : (
          <button className="btn primary block" onClick={begin}>
            ▶ {idx === 0 && auto ? "Start workout" : `Start ${step.move.seconds}s`}
          </button>
        )}
        <button className="btn ghost block" onClick={() => enter(firstSet, auto && phase !== "idle")}>
          Skip warm-up ››
        </button>
        {idx === 0 && auto && phase === "idle" && (
          <p className="small muted center-text">Hands-free: the workout runs itself from here. Pause or skip any time.</p>
        )}
      </div>
    );
  }

  // ---------- weights you'll need ----------
  if (step.kind === "prep") {
    const seen = new Set<string>();
    const items: { ex: Exercise; block: string; weight: number | null }[] = [];
    for (const st of steps) {
      if (st.kind !== "set") continue;
      const e = exFor(st);
      if (!e.implements.length || seen.has(e.id)) continue;
      seen.add(e.id);
      const sg = suggest(e, lastSetsFor(sessions, e.id), st.repRange, settings.unit, st.deload);
      items.push({ ex: e, block: st.block, weight: sg.weight });
    }
    const need = new Map<number, number>();
    for (const it of items) if (it.weight != null) need.set(it.weight, Math.max(need.get(it.weight) ?? 0, it.ex.pair ? 2 : 1));
    const grab = [...need].sort((a, b) => b[0] - a[0]);
    const unknown = items.some((it) => it.weight == null);
    const leave = () => enter(idx + 1, auto && phase !== "idle");

    return (
      <div className="screen player">
        {header}
        <div className="row-between">
          <div className="chip">Set up</div>
          {phase === "ready" && <div className={`small ${timer.paused ? "muted" : "accent"}`}>Starting in {clock(timer.left)}</div>}
        </div>
        <h1 className="ex-name">Weights you&apos;ll need</h1>
        {grab.length > 0 && (
          <div className="card">
            <div className="small muted">Grab these now</div>
            <div className="grab">
              {grab.map(([w, n]) => (
                <span key={w} className="grab-chip">
                  {fmt(w)} {settings.unit}
                  {n > 1 ? <b> ×{n}</b> : null}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="card tight">
          {items.map((it) => (
            <div key={it.ex.id} className="weight-row">
              <span className="block-label sm">{it.block}</span>
              <span className="grow">{it.ex.name}</span>
              <b className={it.weight == null ? "muted" : ""}>
                {it.weight == null ? "pick" : `${it.ex.pair ? "2 × " : ""}${fmt(it.weight)} ${settings.unit}`}
              </b>
            </div>
          ))}
        </div>
        <p className="small muted">
          {unknown
            ? "\"pick\" = no history yet: choose a weight you could lift ~3 more reps than the target."
            : "Based on your last workouts, including any weight increases you've earned."}
        </p>
        <div className="control-row">
          {phase === "ready" && pauseBtn}
          <button className="btn primary grow" onClick={leave}>
            I&apos;m ready ›
          </button>
          {phase === "ready" && (
            <button className="btn ghost" onClick={() => timer.add(15)}>
              +15s
            </button>
          )}
        </div>
        {phase === "idle" && auto && (
          <button className="btn ghost block" onClick={begin}>
            ▶ Resume countdown
          </button>
        )}
      </div>
    );
  }

  // ---------- set ----------
  const s = step;
  const exercise = ex!;
  const nextSet = steps.slice(idx + 1).find((x): x is SetStep => x.kind === "set");
  const nextEx = nextSet ? exFor(nextSet) : null;
  const weighted = exercise.implements.length > 0;
  const timed = s.seconds != null;
  const blockLetter = s.block[0];
  const nextBlock = steps.findIndex((x, i) => i > idx && x.kind === "set" && x.block[0] !== blockLetter);
  const skipBlock = () => enter(nextBlock === -1 ? steps.length : nextBlock, auto && phase !== "idle");

  const inputs = (
    <div className="inputs">
      {weighted && (
        <div className="field">
          <label>Weight ({settings.unit})</label>
          <div className="stepper">
            <button onClick={() => setWeight((w) => fmt(Math.max(0, (parseFloat(w) || 0) - (settings.unit === "kg" ? 1 : 2.5))))}>−</button>
            <input inputMode="decimal" value={weight} placeholder="0" onChange={(e) => setWeight(e.target.value)} />
            <button onClick={() => setWeight((w) => fmt((parseFloat(w) || 0) + (settings.unit === "kg" ? 1 : 2.5)))}>+</button>
          </div>
        </div>
      )}
      {!timed && (
        <div className="field">
          <label>Reps{exercise.perSide ? " / side" : ""}</label>
          <div className="stepper">
            <button onClick={() => setReps((r) => Math.max(0, r - 1))}>−</button>
            <input inputMode="numeric" value={reps} onChange={(e) => setReps(parseInt(e.target.value) || 0)} />
            <button onClick={() => setReps((r) => r + 1)}>+</button>
          </div>
        </div>
      )}
    </div>
  );

  // ---------- rest ----------
  if (phase === "rest") {
    return (
      <div className="screen player">
        {header}
        <div className="chip rest-chip">Rest{timer.paused ? " — paused" : ""}</div>
        <div className={`timer-ring rest ${timer.paused ? "paused" : ""}`}>{clock(timer.left)}</div>
        <div className="control-row">
          <button className="btn ghost" onClick={() => timer.add(15)}>
            +15s
          </button>
          {pauseBtn}
          <button className="btn ghost grow" onClick={finishRest}>
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
        {(weighted || !timed) && (
          <div className="card">
            <div className="small muted">
              Logged {exercise.name}, set {s.set}. Adjust if it differed:
            </div>
            {inputs}
          </div>
        )}
      </div>
    );
  }

  // ---------- ready / work / idle ----------
  const swapOptions = [EXERCISES[s.exerciseId], ...EXERCISES[s.exerciseId].swaps.map((id) => EXERCISES[id])].filter(
    (e, i, arr) => e && arr.findIndex((x) => x.id === e.id) === i,
  );

  let sideLabel = "";
  if (phase === "work" && exercise.perSide) {
    const side = (timer.total - SWITCH_SECONDS) / 2;
    const el = timer.total - timer.left;
    sideLabel = el < side ? "Side 1" : el < side + SWITCH_SECONDS ? "Switch sides!" : "Side 2";
  }

  const ringText =
    phase === "ready" || phase === "work" ? clock(timer.left) : clock(workSeconds(s, exercise));

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

      <div className="work-row">
        <div className="target">
          <div className="target-main">{s.target}</div>
          {s.rir !== "—" && <div className="small muted">Stop with {s.rir} rep{s.rir === "1" ? "" : "s"} left in the tank</div>}
        </div>
        {(auto || timed) && (
          <div className="mini-timer">
            <div className={`timer-ring small-ring ${phase === "ready" ? "ready" : ""} ${timer.paused ? "paused" : ""}`}>{ringText}</div>
            <div className="small center-text accent">
              {phase === "ready" ? "Get ready" : phase === "work" ? sideLabel || (timer.paused ? "Paused" : "Go!") : "Set time"}
            </div>
          </div>
        )}
      </div>

      {phase === "idle" ? (
        auto || timed ? (
          <button className="btn primary block" onClick={begin}>
            ▶ {auto ? (Object.keys(active.entries).length ? "Resume" : "Start") : "Start timer"}
          </button>
        ) : null
      ) : (
        <div className="control-row">
          {pauseBtn}
          {phase === "ready" ? (
            <button className="btn primary grow" onClick={() => startWork(idx)}>
              Start now
            </button>
          ) : (
            <button className="btn primary grow" onClick={finishWork}>
              ✓ Done
            </button>
          )}
          <button className="btn ghost" onClick={() => timer.add(15)}>
            +15s
          </button>
        </div>
      )}

      {inputs}

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
        <button className="btn ghost" disabled={idx === 0} onClick={() => enter(idx - 1, false)} aria-label="Previous set">
          ‹
        </button>
        {auto ? (
          <>
            <button className="btn ghost grow" onClick={() => enter(idx + 1, phase !== "idle")}>
              Skip set ›
            </button>
            <button className="btn ghost grow" onClick={skipBlock}>
              Skip {blockLetter} ››
            </button>
          </>
        ) : (
          <>
            <button className="btn primary grow" onClick={finishWork}>
              ✓ Log set{s.rest ? ` · rest ${s.rest}s` : ""}
            </button>
            <button className="btn ghost" onClick={skipBlock} aria-label="Skip block">
              ››
            </button>
          </>
        )}
      </div>
    </div>
  );
}
