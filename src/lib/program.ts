import { EXERCISES, WARMUP, type Exercise, type Role, type WarmupMove } from "./exercises";

// 12-week block-periodised program, 4 sessions/week. Each muscle group is
// trained twice a week for ~10-16 hard sets, using double progression.

export type PhaseKey = "foundation" | "build" | "strength";

export interface RoleScheme {
  sets: number;
  reps: [number, number];
  rir: string;
  rest: number; // after the final exercise of a superset round (each muscle also rests while its partner works)
}

export interface Phase {
  key: PhaseKey;
  name: string;
  weeks: string;
  goal: string;
  coreRounds: number;
  roles: Record<Exclude<Role, "core">, RoleScheme>;
}

export const PHASES: Record<PhaseKey, Phase> = {
  foundation: {
    key: "foundation",
    name: "Foundation",
    weeks: "Weeks 1–3",
    goal: "Learn the movements, build work capacity and connective-tissue tolerance. Leave 3 reps in the tank.",
    coreRounds: 2,
    roles: {
      primary: { sets: 3, reps: [10, 12], rir: "3", rest: 75 },
      secondary: { sets: 3, reps: [10, 12], rir: "3", rest: 60 },
      isolation: { sets: 2, reps: [12, 15], rir: "2", rest: 45 },
      power: { sets: 4, reps: [12, 12], rir: "—", rest: 60 },
    },
  },
  build: {
    key: "build",
    name: "Build",
    weeks: "Weeks 5–7",
    goal: "More sets, moderate reps — the hypertrophy sweet spot. Push to 1–2 reps shy of failure.",
    coreRounds: 2,
    roles: {
      primary: { sets: 4, reps: [8, 10], rir: "2", rest: 75 },
      secondary: { sets: 3, reps: [8, 12], rir: "2", rest: 60 },
      isolation: { sets: 3, reps: [10, 15], rir: "1–2", rest: 45 },
      power: { sets: 5, reps: [15, 15], rir: "—", rest: 60 },
    },
  },
  strength: {
    key: "strength",
    name: "Strength",
    weeks: "Weeks 9–11",
    goal: "Heavier loads, lower reps, longer rest. Convert new muscle into strength.",
    coreRounds: 2,
    roles: {
      primary: { sets: 4, reps: [5, 8], rir: "1–2", rest: 90 },
      secondary: { sets: 3, reps: [6, 10], rir: "2", rest: 75 },
      isolation: { sets: 3, reps: [8, 12], rir: "1", rest: 45 },
      power: { sets: 5, reps: [10, 10], rir: "—", rest: 60 },
    },
  },
};

export interface WeekInfo {
  cycle: number; // 1, 2, 3… (program repeats with heavier weights)
  week: number; // 1-12 within the cycle
  phase: Phase;
  deload: boolean;
}

export function weekInfo(absoluteWeek: number): WeekInfo {
  const w = Math.max(1, absoluteWeek);
  const cycle = Math.floor((w - 1) / 12) + 1;
  const week = ((w - 1) % 12) + 1;
  const deload = week % 4 === 0;
  const phase = week <= 4 ? PHASES.foundation : week <= 8 ? PHASES.build : PHASES.strength;
  return { cycle, week, phase, deload };
}

interface BlockItem {
  id: string;
  role: Role;
}

interface Block {
  label: string; // "A", "B"…
  title: string;
  items: BlockItem[]; // 1 = straight sets, 2 = superset, 3+ = circuit
}

export interface Day {
  id: string;
  num: number;
  name: string;
  focus: string;
  blocks: Block[];
}

export const DAYS: Day[] = [
  {
    id: "day-1",
    num: 1,
    name: "Squat + Push/Pull",
    focus: "Quads, chest, back, shoulders, arms",
    blocks: [
      { label: "A", title: "Strength superset", items: [{ id: "goblet-squat", role: "primary" }, { id: "one-arm-db-row", role: "primary" }] },
      { label: "B", title: "Strength superset", items: [{ id: "db-reverse-lunge", role: "secondary" }, { id: "db-bench-press", role: "secondary" }] },
      { label: "C", title: "Isolation superset", items: [{ id: "db-lateral-raise", role: "isolation" }, { id: "db-hammer-curl", role: "isolation" }] },
      { label: "D", title: "Core circuit (McGill)", items: [{ id: "dead-bug", role: "core" }, { id: "side-plank", role: "core" }, { id: "mcgill-curl-up", role: "core" }] },
    ],
  },
  {
    id: "day-2",
    num: 2,
    name: "Hinge + Overhead",
    focus: "Glutes, hamstrings, shoulders, back, triceps",
    blocks: [
      { label: "A", title: "Power superset", items: [{ id: "kb-swing", role: "power" }, { id: "half-kneeling-kb-press", role: "primary" }] },
      { label: "B", title: "Strength superset", items: [{ id: "db-rdl", role: "primary" }, { id: "kb-gorilla-row", role: "secondary" }] },
      { label: "C", title: "Isolation superset", items: [{ id: "single-leg-calf-raise", role: "isolation" }, { id: "db-overhead-triceps", role: "isolation" }] },
      { label: "D", title: "Loaded core circuit", items: [{ id: "kb-plank-pull-through", role: "core" }, { id: "suitcase-carry", role: "core" }, { id: "bird-dog", role: "core" }] },
    ],
  },
  {
    id: "day-3",
    num: 3,
    name: "Single-Leg + Push/Pull",
    focus: "Quads, glutes, back, chest, rear delts, biceps",
    blocks: [
      { label: "A", title: "Strength superset", items: [{ id: "bulgarian-split-squat", role: "primary" }, { id: "db-bent-over-row", role: "primary" }] },
      { label: "B", title: "Strength superset", items: [{ id: "db-hip-thrust", role: "secondary" }, { id: "push-up", role: "secondary" }] },
      { label: "C", title: "Isolation superset", items: [{ id: "db-rear-delt-fly", role: "isolation" }, { id: "db-biceps-curl", role: "isolation" }] },
      { label: "D", title: "Core circuit", items: [{ id: "hollow-hold", role: "core" }, { id: "plank-shoulder-tap", role: "core" }, { id: "kb-windmill", role: "core" }] },
    ],
  },
  {
    id: "day-4",
    num: 4,
    name: "Kettlebell Power + Pump",
    focus: "Full body power, hamstrings, lats, chest, triceps",
    blocks: [
      { label: "A", title: "Power superset", items: [{ id: "kb-clean-press", role: "primary" }, { id: "db-step-up", role: "primary" }] },
      { label: "B", title: "Strength superset", items: [{ id: "kb-single-leg-rdl", role: "secondary" }, { id: "db-pullover", role: "secondary" }] },
      { label: "C", title: "Isolation superset", items: [{ id: "db-chest-fly", role: "isolation" }, { id: "db-skull-crusher", role: "isolation" }] },
      { label: "D", title: "Core + carry circuit", items: [{ id: "farmer-carry", role: "core" }, { id: "reverse-crunch", role: "core" }, { id: "kb-halo", role: "core" }] },
    ],
  },
];

export function getDay(id: string) {
  return DAYS.find((d) => d.id === id);
}

// ---------- Flattened guided steps ----------

export type Step =
  | { kind: "warmup"; move: WarmupMove; index: number; total: number }
  | { kind: "prep" } // "weights you'll need" screen between warm-up and set 1
  | {
      kind: "set";
      key: string; // unique per step
      block: string; // "A1"
      blockTitle: string;
      exerciseId: string;
      role: Role;
      set: number;
      totalSets: number;
      repRange: [number, number] | null; // null for fixed / timed targets
      target: string; // human-readable, e.g. "8–10 reps"
      seconds: number | null; // timed set length
      rir: string;
      rest: number; // rest after this step
      deload: boolean;
    };

const PHASE_INDEX: Record<PhaseKey, 0 | 1 | 2> = { foundation: 0, build: 1, strength: 2 };
const TRANSITION_REST = 15; // between exercises inside a superset (weights are within reach)
const CORE_TRANSITION = 10;
const CORE_ROUND_REST = 30;

// Session length options. 45 is the standard program; 30 trims a set per
// exercise, 60 adds one plus an extra core round and longer rests.
export type SessionLength = 30 | 45 | 60;
export const LENGTHS: { value: SessionLength; label: string; hint: string }[] = [
  { value: 30, label: "30 min", hint: "Express — one fewer set per exercise" },
  { value: 45, label: "45 min", hint: "Standard program" },
  { value: 60, label: "60 min", hint: "Extended — extra set, extra core round, longer rest" },
];
const LENGTH_ADJ: Record<SessionLength, { sets: number; core: number; rest: number }> = {
  30: { sets: -1, core: 0, rest: -15 },
  45: { sets: 0, core: 0, rest: 0 },
  60: { sets: 1, core: 1, rest: 15 },
};

export function buildSteps(day: Day, info: WeekInfo, length: SessionLength = 45): Step[] {
  const adj = LENGTH_ADJ[length];
  const steps: Step[] = WARMUP.map((move, i) => ({ kind: "warmup", move, index: i, total: WARMUP.length }));
  steps.push({ kind: "prep" });
  const pi = PHASE_INDEX[info.phase.key];

  for (const block of day.blocks) {
    const isCore = block.items.every((i) => i.role === "core");
    const roundsFor = (role: Role) => {
      let n = role === "core" ? info.phase.coreRounds + adj.core : Math.max(2, info.phase.roles[role].sets + adj.sets);
      if (info.deload) n = Math.max(1, Math.ceil(n / 2));
      return n;
    };
    const rounds = Math.max(...block.items.map((i) => roundsFor(i.role)));

    for (let r = 1; r <= rounds; r++) {
      block.items.forEach((item, idx) => {
        const total = roundsFor(item.role);
        if (r > total) return;
        const ex = EXERCISES[item.id];
        const last = idx === block.items.length - 1;
        const side = ex.perSide ? " each side" : "";
        let repRange: [number, number] | null = null;
        let target: string;
        let seconds: number | null = null;
        let rir = "—";
        let rest: number;

        if (item.role === "core") {
          if (ex.mode === "time" && ex.seconds) {
            seconds = ex.seconds[pi];
            target = `${seconds}s${side}`;
          } else {
            target = `${ex.fixedTarget?.[pi] ?? "10"} reps${side}`;
          }
          rest = last ? CORE_ROUND_REST : CORE_TRANSITION;
        } else {
          const scheme = info.phase.roles[item.role];
          rir = info.deload ? "4" : scheme.rir;
          if (item.role === "power" && ex.fixedTarget) {
            target = `${ex.fixedTarget[pi]} reps${side}`;
          } else {
            repRange = scheme.reps;
            target = (scheme.reps[0] === scheme.reps[1] ? `${scheme.reps[0]}` : `${scheme.reps[0]}–${scheme.reps[1]}`) + ` reps${side}`;
          }
          rest = last || block.items.length === 1 ? (info.deload ? 60 : Math.max(45, scheme.rest + adj.rest)) : TRANSITION_REST;
        }

        steps.push({
          kind: "set",
          key: `${block.label}${idx + 1}-${r}`,
          block: `${block.label}${block.items.length > 1 ? idx + 1 : ""}`,
          blockTitle: isCore ? `${block.title} — round ${r}/${rounds}` : block.title,
          exerciseId: item.id,
          role: item.role,
          set: r,
          totalSets: total,
          repRange,
          target,
          seconds,
          rir,
          rest,
          deload: info.deload,
        });
      });
    }
  }
  return steps;
}

export const PREP_SECONDS = 45;
export const SWITCH_SECONDS = 5;

// Prescribed time for a set. Holds use their hold time; rep sets allow
// ~1.8s per rep plus a little setup. Per-side work runs both sides with a switch gap.
export function workSeconds(s: Extract<Step, { kind: "set" }>, ex: Exercise) {
  let per: number;
  const holds = s.target.match(/(\d+) × (\d+)s/);
  if (s.seconds != null) per = s.seconds;
  else if (holds) per = +holds[1] * (+holds[2] + 2);
  else per = Math.max(12, Math.round((s.repRange ? s.repRange[1] : parseInt(s.target) || 10) * 1.8 + (ex.perSide ? 3 : 6)));
  return ex.perSide ? per * 2 + SWITCH_SECONDS : per;
}

// Session length: set timers plus rest, warm-up and the weights screen.
export function estimateMinutes(steps: Step[]) {
  let s = 0;
  for (const st of steps) {
    if (st.kind === "warmup") s += st.move.seconds;
    else if (st.kind === "prep") s += PREP_SECONDS;
    else s += workSeconds(st, EXERCISES[st.exerciseId]) + st.rest;
  }
  return Math.round(s / 60);
}

export const PRINCIPLES = [
  {
    title: "Double progression",
    body: "Each lift has a rep range. When you hit the top of the range on every set, go up in weight next time (≈2.5 kg / 5 lb dumbbells, or the next kettlebell). The app tracks this and suggests the weight for you.",
  },
  {
    title: "Reps in reserve (RIR)",
    body: "RIR 2 means you stop with ~2 good reps left. Training close to — but not at — failure gives most of the muscle-building stimulus with less fatigue and lower injury risk.",
  },
  {
    title: "Volume drives growth",
    body: "Meta-analyses show weekly hard sets per muscle is the strongest predictor of hypertrophy. This plan gives each major muscle roughly 10–16 sets per week across two sessions.",
  },
  {
    title: "Twice per muscle, per week",
    body: "Training a muscle twice weekly outperforms once weekly for growth, and higher frequency gives a small additional strength benefit.",
  },
  {
    title: "Supersets save time",
    body: "Pairing non-competing exercises (e.g. squat + row) keeps total volume while cutting session time — that's how full-body work fits into 30–45 minutes.",
  },
  {
    title: "Spine-sparing core",
    body: "Core work emphasises bracing and resisting movement (dead bugs, side planks, carries, McGill's Big 3) — the most transferable kind of core strength for lifting and back health.",
  },
  {
    title: "Deload every 4th week",
    body: "Weeks 4, 8 and 12 halve the sets and back off intensity so you recover and come back stronger. After week 12, restart at week 1 with heavier weights.",
  },
];

export const SOURCES = [
  { label: "Schoenfeld, Ogborn & Krieger (2016) — training frequency & hypertrophy meta-analysis", url: "https://pubmed.ncbi.nlm.nih.gov/27102172/" },
  { label: "Pelland et al. — frequency meta-regression (2,058 participants)", url: "https://sportrxiv.org/index.php/server/preprint/download/460/967/908" },
  { label: "Weekly volume dose-response review", url: "https://biolayne.com/reps/issue-31/the-king-of-volume-metas/" },
  { label: "McGill Big 3 overview (MUSC Health)", url: "https://advance.muschealth.org/library/2022/december/the-big-three" },
  { label: "Kettlebell core training plan (Breaking Muscle)", url: "https://breakingmuscle.com/kettlebells-for-an-iron-core-a-3-phase-training-plan/" },
];
