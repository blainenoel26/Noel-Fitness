import type { Exercise } from "./exercises";
import type { SetLog, Unit } from "./store";

const KG_PER_LB = 0.45359237;

export function convert(weight: number, from: Unit, to: Unit) {
  if (from === to) return weight;
  return from === "kg" ? weight / KG_PER_LB : weight * KG_PER_LB;
}

function roundTo(w: number, step: number) {
  return Math.round(w / step) * step;
}

// Jump size when a lift graduates: next dumbbell pair or next kettlebell.
export function increment(ex: Exercise, unit: Unit) {
  const kbOnly = !ex.implements.includes("db");
  if (unit === "kg") return kbOnly ? 4 : 2;
  return kbOnly ? 9 : 5;
}

export interface Suggestion {
  weight: number | null;
  note: string;
  lastSummary: string | null;
}

// Double progression: if every working set last time reached the top of the
// rep range, add one increment; otherwise repeat the weight and chase reps.
export function suggest(
  ex: Exercise,
  last: { sets: SetLog[]; unit: Unit } | null,
  repRange: [number, number] | null,
  unit: Unit,
  deload: boolean,
): Suggestion {
  if (ex.implements.length === 0) return { weight: null, note: "", lastSummary: summarize(last, unit) };
  if (!last) return { weight: null, note: "First time — pick a weight you could lift ~3 more reps than the target", lastSummary: null };

  const weights = last.sets.map((s) => s.weight).filter((w): w is number => w != null);
  if (!weights.length) return { weight: null, note: "", lastSummary: summarize(last, unit) };
  const base = convert(Math.max(...weights), last.unit, unit);
  const step = unit === "kg" ? 0.5 : 2.5;

  if (deload) {
    return { weight: roundTo(base * 0.8, step), note: "Deload week: ~80% of last weight, focus on crisp reps", lastSummary: summarize(last, unit) };
  }
  if (repRange) {
    const hitTop = last.sets.every((s) => (s.reps ?? 0) >= repRange[1]);
    if (hitTop) {
      return { weight: roundTo(base + increment(ex, unit), step), note: "You hit the top of the range — go heavier", lastSummary: summarize(last, unit) };
    }
    return { weight: roundTo(base, step), note: `Same weight — aim for ${repRange[1]} reps on every set`, lastSummary: summarize(last, unit) };
  }
  return { weight: roundTo(base, step), note: "", lastSummary: summarize(last, unit) };
}

function summarize(last: { sets: SetLog[]; unit: Unit } | null, unit: Unit) {
  if (!last) return null;
  return last.sets
    .map((s) => {
      const amt = s.seconds != null ? `${s.seconds}s` : `${s.reps ?? "?"}`;
      return s.weight != null ? `${amt}×${fmt(convert(s.weight, last.unit, unit))}` : amt;
    })
    .join(", ");
}

export function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}
