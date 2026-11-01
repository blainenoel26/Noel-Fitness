// Exercise library. Every movement works with dumbbells OR a kettlebell
// unless `needs` lists extra gear; `swaps` are ordered fallbacks used when
// gear is missing (e.g. hotel room with no bench) or when the user taps "Swap".

export type Implement = "db" | "kb";
export type Gear = "bench" | "box";
export type Role = "primary" | "secondary" | "isolation" | "power" | "core";
export type Mode = "reps" | "time";

export interface Exercise {
  id: string;
  name: string;
  implements: Implement[]; // any one of these works; [] = bodyweight
  needs?: Gear[];
  muscles: string;
  pattern: string;
  mode: Mode;
  perSide?: boolean;
  cues: string[];
  avoid: string;
  swaps: string[];
  // Core/power targets per phase [Foundation, Build, Strength]
  fixedTarget?: [string, string, string];
  // Seconds per set for timed work [Foundation, Build, Strength]
  seconds?: [number, number, number];
}

export const EXERCISES: Record<string, Exercise> = {
  // ---------- Lower body ----------
  "goblet-squat": {
    id: "goblet-squat",
    name: "Goblet Squat",
    implements: ["kb", "db"],
    muscles: "Quads, glutes, adductors, upper back",
    pattern: "Squat",
    mode: "reps",
    cues: [
      "Hold the bell at your chest, elbows pointing down",
      "Sit between your heels, knees track over toes",
      "Keep chest tall; elbows brush inside the knees at the bottom",
      "Drive the floor away and squeeze glutes at the top",
    ],
    avoid: "Heels lifting or chest collapsing forward",
    swaps: ["db-front-squat", "db-reverse-lunge"],
  },
  "db-front-squat": {
    id: "db-front-squat",
    name: "Dumbbell Front Squat",
    implements: ["db"],
    muscles: "Quads, glutes, core",
    pattern: "Squat",
    mode: "reps",
    cues: [
      "Rest one end of each dumbbell on your shoulders",
      "Brace before you descend",
      "Hit depth with a neutral spine, then stand tall",
    ],
    avoid: "Elbows dropping and rounding the upper back",
    swaps: ["goblet-squat"],
  },
  "db-reverse-lunge": {
    id: "db-reverse-lunge",
    name: "Dumbbell Reverse Lunge",
    implements: ["db", "kb"],
    muscles: "Quads, glutes, hamstrings",
    pattern: "Single-leg",
    mode: "reps",
    perSide: true,
    cues: [
      "Dumbbells at your sides, step one foot straight back",
      "Lower until the back knee hovers just above the floor",
      "Front shin stays roughly vertical",
      "Push through the front heel to return",
    ],
    avoid: "Front knee caving inward",
    swaps: ["db-split-squat", "goblet-squat"],
  },
  "db-split-squat": {
    id: "db-split-squat",
    name: "Dumbbell Split Squat",
    implements: ["db", "kb"],
    muscles: "Quads, glutes",
    pattern: "Single-leg",
    mode: "reps",
    perSide: true,
    cues: [
      "Staggered stance, both feet planted",
      "Drop straight down, back knee toward the floor",
      "Stay tall and drive up through the front foot",
    ],
    avoid: "Bouncing out of the bottom",
    swaps: ["db-reverse-lunge"],
  },
  "bulgarian-split-squat": {
    id: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    implements: ["db", "kb"],
    needs: ["bench"],
    muscles: "Quads, glutes, adductors",
    pattern: "Single-leg",
    mode: "reps",
    perSide: true,
    cues: [
      "Rear foot laces-down on a bench, couch or bed",
      "Front foot far enough forward that you can drop straight down",
      "Slight forward torso lean = more glutes",
      "Control the descent for 2 seconds",
    ],
    avoid: "Pushing off the back foot",
    swaps: ["db-split-squat", "db-reverse-lunge"],
  },
  "db-step-up": {
    id: "db-step-up",
    name: "Dumbbell Step-Up",
    implements: ["db", "kb"],
    needs: ["box"],
    muscles: "Quads, glutes",
    pattern: "Single-leg",
    mode: "reps",
    perSide: true,
    cues: [
      "Knee-height box, bench or sturdy step",
      "Whole foot on the box; lean slightly forward",
      "Stand up using the top leg only — no push from the bottom foot",
      "Lower slowly under control",
    ],
    avoid: "Bouncing off the trailing leg",
    swaps: ["db-reverse-lunge", "db-split-squat"],
  },
  "goblet-lateral-lunge": {
    id: "goblet-lateral-lunge",
    name: "Goblet Lateral Lunge",
    implements: ["kb", "db"],
    muscles: "Adductors, glutes, quads",
    pattern: "Single-leg",
    mode: "reps",
    perSide: true,
    cues: [
      "Hold bell at chest, take a wide step to the side",
      "Sit back into that hip, other leg straight",
      "Push back to the start",
    ],
    avoid: "Rounding the back to get lower",
    swaps: ["db-reverse-lunge"],
  },
  "db-rdl": {
    id: "db-rdl",
    name: "Dumbbell Romanian Deadlift",
    implements: ["db", "kb"],
    muscles: "Hamstrings, glutes, spinal erectors",
    pattern: "Hinge",
    mode: "reps",
    cues: [
      "Soft knees, push your hips back like closing a car door",
      "Weights slide down the front of your thighs",
      "Stop when you feel a strong hamstring stretch (about mid-shin)",
      "Snap hips forward to stand, squeeze glutes",
    ],
    avoid: "Rounding the lower back or turning it into a squat",
    swaps: ["kb-single-leg-rdl"],
  },
  "kb-single-leg-rdl": {
    id: "kb-single-leg-rdl",
    name: "Single-Leg RDL",
    implements: ["kb", "db"],
    muscles: "Hamstrings, glutes, hip stabilisers",
    pattern: "Hinge",
    mode: "reps",
    perSide: true,
    cues: [
      "Hold the bell in the hand opposite the standing leg",
      "Hinge forward as the free leg reaches back",
      "Keep hips square to the floor",
      "Drive the standing heel down to return",
    ],
    avoid: "Hips rotating open",
    swaps: ["db-rdl"],
  },
  "db-hip-thrust": {
    id: "db-hip-thrust",
    name: "Dumbbell Hip Thrust",
    implements: ["db", "kb"],
    needs: ["bench"],
    muscles: "Glutes, hamstrings",
    pattern: "Hinge",
    mode: "reps",
    cues: [
      "Upper back on a bench or couch edge, dumbbell across hips",
      "Feet flat, shins vertical at the top",
      "Tuck your chin and ribs, drive hips to full extension",
      "Pause 1 second at the top",
    ],
    avoid: "Arching the lower back instead of extending the hips",
    swaps: ["db-glute-bridge"],
  },
  "db-glute-bridge": {
    id: "db-glute-bridge",
    name: "Dumbbell Glute Bridge",
    implements: ["db", "kb"],
    muscles: "Glutes, hamstrings",
    pattern: "Hinge",
    mode: "reps",
    cues: [
      "Lie on the floor, weight across your hips",
      "Drive through heels, ribs down",
      "Hold 2 seconds at the top",
    ],
    avoid: "Over-arching the back",
    swaps: ["db-hip-thrust"],
  },
  "kb-swing": {
    id: "kb-swing",
    name: "Kettlebell Swing",
    implements: ["kb", "db"],
    muscles: "Glutes, hamstrings, back, grip — power",
    pattern: "Hinge (power)",
    mode: "reps",
    cues: [
      "Bell a foot in front of you; hike it back high between the thighs",
      "Snap the hips forward — the bell floats to chest height",
      "Stand tall like a plank at the top: glutes and abs tight",
      "Let the bell fall, then hinge late (wait for it)",
    ],
    avoid: "Squatting the swing or lifting with your arms",
    swaps: ["db-rdl"],
    fixedTarget: ["12", "15", "10 heavy"],
  },
  "single-leg-calf-raise": {
    id: "single-leg-calf-raise",
    name: "Single-Leg Calf Raise",
    implements: ["db", "kb"],
    muscles: "Calves",
    pattern: "Isolation",
    mode: "reps",
    perSide: true,
    cues: [
      "Ball of the foot on a step, hold a weight on the same side",
      "Full stretch at the bottom — pause 1 second",
      "Rise as high as possible, pause again",
    ],
    avoid: "Bouncing through a half range of motion",
    swaps: [],
  },

  // ---------- Push ----------
  "db-bench-press": {
    id: "db-bench-press",
    name: "Dumbbell Bench Press",
    implements: ["db"],
    needs: ["bench"],
    muscles: "Chest, front delts, triceps",
    pattern: "Horizontal push",
    mode: "reps",
    cues: [
      "Shoulder blades pinched and down, feet planted",
      "Lower the bells to mid-chest, elbows about 45° from your body",
      "Press up and slightly in",
    ],
    avoid: "Flaring elbows out to 90°",
    swaps: ["db-floor-press", "push-up"],
  },
  "db-floor-press": {
    id: "db-floor-press",
    name: "Dumbbell Floor Press",
    implements: ["db", "kb"],
    muscles: "Chest, triceps, front delts",
    pattern: "Horizontal push",
    mode: "reps",
    cues: [
      "Lie on the floor, knees bent",
      "Lower until triceps gently touch the floor — pause",
      "Press back up without bouncing",
    ],
    avoid: "Slamming elbows into the floor",
    swaps: ["push-up"],
  },
  "push-up": {
    id: "push-up",
    name: "Push-Up",
    implements: [],
    muscles: "Chest, triceps, core",
    pattern: "Horizontal push",
    mode: "reps",
    cues: [
      "Hands just outside shoulders (on dumbbell handles for extra range)",
      "Body in one straight line — squeeze glutes",
      "Chest to the floor, elbows at 45°",
      "Too easy? Feet elevated or 3-second lowering",
    ],
    avoid: "Hips sagging",
    swaps: ["db-floor-press"],
  },
  "half-kneeling-kb-press": {
    id: "half-kneeling-kb-press",
    name: "Half-Kneeling Single-Arm Press",
    implements: ["kb", "db"],
    muscles: "Shoulders, triceps, core (anti-lean)",
    pattern: "Vertical push",
    mode: "reps",
    perSide: true,
    cues: [
      "Kneel on the same side as the working arm, glute squeezed",
      "Bell in the rack position, wrist straight",
      "Press up until biceps is by your ear",
      "Don't lean away — ribs stay down",
    ],
    avoid: "Arching the back to finish the rep",
    swaps: ["db-overhead-press"],
  },
  "db-overhead-press": {
    id: "db-overhead-press",
    name: "Standing Dumbbell Overhead Press",
    implements: ["db", "kb"],
    muscles: "Shoulders, triceps, upper chest",
    pattern: "Vertical push",
    mode: "reps",
    cues: [
      "Feet hip-width, squeeze glutes and brace",
      "Press up and slightly back so the weights finish over your ears",
      "Lower to shoulder height under control",
    ],
    avoid: "Leaning back to cheat the press",
    swaps: ["half-kneeling-kb-press"],
  },
  "kb-clean-press": {
    id: "kb-clean-press",
    name: "Kettlebell Clean & Press",
    implements: ["kb", "db"],
    muscles: "Full body — hips, shoulders, triceps, core",
    pattern: "Power + vertical push",
    mode: "reps",
    perSide: true,
    cues: [
      "Hike the bell back, then drive the hips to bring it to the rack",
      "Keep the bell close — zip up a jacket — so it doesn't flop on your wrist",
      "Pause in the rack, brace, then press overhead",
      "Lower to the rack, then let it drop back between your legs",
    ],
    avoid: "Swinging the bell wide and banging the forearm",
    swaps: ["db-overhead-press"],
  },
  "db-chest-fly": {
    id: "db-chest-fly",
    name: "Dumbbell Chest Fly",
    implements: ["db"],
    muscles: "Chest",
    pattern: "Isolation",
    mode: "reps",
    cues: [
      "On a bench or the floor, palms facing in",
      "Slight bend in the elbows — keep it fixed",
      "Open wide until you feel a chest stretch",
      "Hug a big tree to bring them back together",
    ],
    avoid: "Turning it into a press by bending the elbows more",
    swaps: ["push-up"],
  },
  "db-lateral-raise": {
    id: "db-lateral-raise",
    name: "Dumbbell Lateral Raise",
    implements: ["db"],
    muscles: "Side delts",
    pattern: "Isolation",
    mode: "reps",
    cues: [
      "Light weights, slight forward lean",
      "Lead with the elbows, raise to shoulder height",
      "Lower for a slow 2-3 count",
    ],
    avoid: "Shrugging or swinging",
    swaps: ["kb-halo"],
  },
  "db-overhead-triceps": {
    id: "db-overhead-triceps",
    name: "Overhead Triceps Extension",
    implements: ["db", "kb"],
    muscles: "Triceps (long head)",
    pattern: "Isolation",
    mode: "reps",
    cues: [
      "Hold one dumbbell (or bell by the horns) overhead with both hands",
      "Elbows point forward, lower behind your head for a deep stretch",
      "Extend fully without moving the upper arms",
    ],
    avoid: "Elbows flaring wide",
    swaps: ["db-skull-crusher"],
  },
  "db-skull-crusher": {
    id: "db-skull-crusher",
    name: "Dumbbell Skull Crusher",
    implements: ["db"],
    muscles: "Triceps",
    pattern: "Isolation",
    mode: "reps",
    cues: [
      "Lie on bench or floor, dumbbells above shoulders, palms in",
      "Bend only at the elbows to lower beside your head",
      "Extend back to lockout",
    ],
    avoid: "Upper arms drifting",
    swaps: ["db-overhead-triceps"],
  },

  // ---------- Pull ----------
  "one-arm-db-row": {
    id: "one-arm-db-row",
    name: "One-Arm Dumbbell Row",
    implements: ["db", "kb"],
    muscles: "Lats, mid-back, rear delts, biceps",
    pattern: "Horizontal pull",
    mode: "reps",
    perSide: true,
    cues: [
      "Hand on a bench/chair or staggered-stance hinge",
      "Flat back, let the weight hang for a full stretch",
      "Pull the elbow toward your back pocket",
      "Pause at the top, lower slowly",
    ],
    avoid: "Twisting the torso to heave the weight",
    swaps: ["kb-gorilla-row"],
  },
  "kb-gorilla-row": {
    id: "kb-gorilla-row",
    name: "Gorilla Row",
    implements: ["kb", "db"],
    muscles: "Lats, mid-back, core",
    pattern: "Horizontal pull",
    mode: "reps",
    perSide: true,
    cues: [
      "Wide stance, hinge to ~45°, bells on the floor between feet",
      "Row one bell while pushing the other into the floor",
      "Alternate sides; hips stay square",
    ],
    avoid: "Standing up between reps",
    swaps: ["one-arm-db-row"],
  },
  "db-bent-over-row": {
    id: "db-bent-over-row",
    name: "Dumbbell Bent-Over Row",
    implements: ["db", "kb"],
    muscles: "Lats, mid-back, rear delts",
    pattern: "Horizontal pull",
    mode: "reps",
    cues: [
      "Hinge to about 45°, flat back, brace",
      "Row both dumbbells to your lower ribs",
      "Squeeze shoulder blades together, lower with control",
    ],
    avoid: "Using your hips to throw the weight up",
    swaps: ["one-arm-db-row"],
  },
  "db-pullover": {
    id: "db-pullover",
    name: "Dumbbell Pullover",
    implements: ["db", "kb"],
    muscles: "Lats, chest, serratus",
    pattern: "Vertical pull",
    mode: "reps",
    cues: [
      "Lie on bench or floor, hold one dumbbell over the chest",
      "Slight elbow bend, lower behind your head until lats stretch",
      "Pull back over your chest; keep ribs down",
    ],
    avoid: "Arching your lower back off the floor",
    swaps: ["db-bent-over-row"],
  },
  "db-rear-delt-fly": {
    id: "db-rear-delt-fly",
    name: "Rear Delt Fly",
    implements: ["db"],
    muscles: "Rear delts, rhomboids",
    pattern: "Isolation",
    mode: "reps",
    cues: [
      "Hinge forward, light dumbbells hanging, palms in",
      "Sweep the arms out wide — pinkies lead",
      "Pause, then lower slowly",
    ],
    avoid: "Shrugging into your neck",
    swaps: ["db-bent-over-row"],
  },
  "db-hammer-curl": {
    id: "db-hammer-curl",
    name: "Hammer Curl",
    implements: ["db", "kb"],
    muscles: "Biceps, brachialis, forearms",
    pattern: "Isolation",
    mode: "reps",
    cues: [
      "Palms facing each other, elbows pinned to your sides",
      "Curl up without swinging",
      "Lower for a 2-3 count",
    ],
    avoid: "Rocking the torso",
    swaps: ["db-biceps-curl"],
  },
  "db-biceps-curl": {
    id: "db-biceps-curl",
    name: "Dumbbell Biceps Curl",
    implements: ["db", "kb"],
    muscles: "Biceps",
    pattern: "Isolation",
    mode: "reps",
    cues: [
      "Palms forward, elbows fixed",
      "Rotate pinkies up slightly as you curl",
      "Full stretch at the bottom of every rep",
    ],
    avoid: "Elbows drifting forward",
    swaps: ["db-hammer-curl"],
  },

  // ---------- Core ----------
  "dead-bug": {
    id: "dead-bug",
    name: "Dead Bug",
    implements: [],
    muscles: "Deep abs (anti-extension)",
    pattern: "Core",
    mode: "reps",
    perSide: true,
    cues: [
      "On your back, arms up, knees over hips",
      "Press lower back into the floor and keep it there",
      "Slowly extend opposite arm and leg, exhale fully",
      "Hold a light weight overhead to progress",
    ],
    avoid: "Lower back peeling off the floor",
    swaps: ["hollow-hold"],
    fixedTarget: ["6", "8", "10"],
  },
  "side-plank": {
    id: "side-plank",
    name: "Side Plank",
    implements: [],
    muscles: "Obliques, QL, glute med (McGill Big 3)",
    pattern: "Core",
    mode: "time",
    perSide: true,
    cues: [
      "Elbow under shoulder, body in a straight line",
      "Push hips forward and up",
      "Breathe normally while braced",
    ],
    avoid: "Hips sagging or rolling backward",
    swaps: [],
    seconds: [25, 35, 45],
  },
  "mcgill-curl-up": {
    id: "mcgill-curl-up",
    name: "McGill Curl-Up",
    implements: [],
    muscles: "Rectus abdominis (spine-sparing) — McGill Big 3",
    pattern: "Core",
    mode: "reps",
    cues: [
      "One knee bent, one leg straight, hands under the low back",
      "Lift head and shoulders just an inch — no neck crank",
      "Hold 8-10 seconds per rep",
    ],
    avoid: "Flattening the low back or tucking the chin",
    swaps: ["dead-bug"],
    fixedTarget: ["5 × 8s hold", "6 × 10s hold", "6 × 10s hold"],
  },
  "bird-dog": {
    id: "bird-dog",
    name: "Bird Dog",
    implements: [],
    muscles: "Spinal stabilisers, glutes — McGill Big 3",
    pattern: "Core",
    mode: "reps",
    perSide: true,
    cues: [
      "On all fours, spine neutral",
      "Reach opposite arm and leg long — don't lift high",
      "Hold 5-10 seconds, sweep back under",
    ],
    avoid: "Rotating the hips or arching",
    swaps: ["dead-bug"],
    fixedTarget: ["5", "6", "8"],
  },
  "turkish-get-up": {
    id: "turkish-get-up",
    name: "Turkish Get-Up",
    implements: ["kb", "db"],
    muscles: "Full body stability, shoulders, core",
    pattern: "Core (loaded)",
    mode: "reps",
    perSide: true,
    cues: [
      "Eyes on the bell the whole time, arm locked",
      "Roll to elbow → hand → high bridge → sweep leg → kneel → stand",
      "Reverse each step slowly",
      "Start with a light bell or shoe on your fist to learn it",
    ],
    avoid: "Rushing the steps or bending the working elbow",
    swaps: ["kb-windmill"],
    fixedTarget: ["1", "2", "2"],
  },
  "suitcase-carry": {
    id: "suitcase-carry",
    name: "Suitcase Carry",
    implements: ["kb", "db"],
    muscles: "Obliques, QL, grip (anti-lateral flexion)",
    pattern: "Carry",
    mode: "time",
    perSide: true,
    cues: [
      "Heavy weight in one hand only",
      "Walk tall — don't lean toward or away from the bell",
      "Short space? March in place or walk laps",
    ],
    avoid: "Shoulder shrugging up or hip hiking",
    swaps: ["side-plank"],
    seconds: [30, 40, 45],
  },
  "farmer-carry": {
    id: "farmer-carry",
    name: "Farmer Carry",
    implements: ["db", "kb"],
    muscles: "Grip, traps, core, total body",
    pattern: "Carry",
    mode: "time",
    cues: [
      "Heaviest weights you can hold with perfect posture",
      "Shoulders packed down, short quick steps",
      "Brace like someone may poke your stomach",
    ],
    avoid: "Shoulders rounding forward",
    swaps: ["suitcase-carry"],
    seconds: [40, 50, 60],
  },
  "hollow-hold": {
    id: "hollow-hold",
    name: "Hollow Body Hold",
    implements: [],
    muscles: "Abs (anti-extension)",
    pattern: "Core",
    mode: "time",
    cues: [
      "Lower back glued to the floor",
      "Arms and legs extended, shoulders and feet just off the floor",
      "Bend knees to make it easier",
    ],
    avoid: "Back arching off the floor",
    swaps: ["dead-bug"],
    seconds: [20, 30, 40],
  },
  "plank-shoulder-tap": {
    id: "plank-shoulder-tap",
    name: "Plank Shoulder Taps",
    implements: [],
    muscles: "Abs, obliques (anti-rotation)",
    pattern: "Core",
    mode: "reps",
    perSide: true,
    cues: [
      "High plank, feet wider than hips",
      "Tap opposite shoulder slowly",
      "Hips stay still — imagine a glass of water on your back",
    ],
    avoid: "Hips swaying side to side",
    swaps: ["dead-bug"],
    fixedTarget: ["8", "10", "12"],
  },
  "kb-windmill": {
    id: "kb-windmill",
    name: "Kettlebell Windmill",
    implements: ["kb", "db"],
    muscles: "Obliques, hips, shoulder stability",
    pattern: "Core (loaded)",
    mode: "reps",
    perSide: true,
    cues: [
      "Bell locked out overhead, eyes on it",
      "Feet angled away from the bell, push hip out to that side",
      "Slide the free hand down the inside of the leg",
      "Light weight — mobility first",
    ],
    avoid: "Bending the locked arm",
    swaps: ["side-plank"],
    fixedTarget: ["4", "5", "6"],
  },
  "reverse-crunch": {
    id: "reverse-crunch",
    name: "Reverse Crunch",
    implements: [],
    muscles: "Lower abs",
    pattern: "Core",
    mode: "reps",
    cues: [
      "On your back, knees bent at 90°",
      "Curl your hips off the floor toward your ribs",
      "Lower slowly — no swinging",
    ],
    avoid: "Using momentum from the legs",
    swaps: ["dead-bug"],
    fixedTarget: ["10", "12", "15"],
  },
  "kb-halo": {
    id: "kb-halo",
    name: "Kettlebell Halo",
    implements: ["kb", "db"],
    muscles: "Shoulders, upper back, core",
    pattern: "Mobility",
    mode: "reps",
    perSide: true,
    cues: [
      "Hold the bell upside-down by the horns",
      "Circle it close around your head",
      "Ribs down, glutes tight — torso stays still",
    ],
    avoid: "Leaning or arching",
    swaps: [],
    fixedTarget: ["5", "6", "8"],
  },
};

export interface WarmupMove {
  name: string;
  seconds: number;
  cue: string;
}

export const WARMUP: WarmupMove[] = [
  { name: "Jumping jacks + arm circles", seconds: 45, cue: "Raise your heart rate; big arm circles every 10 seconds" },
  { name: "World's greatest stretch", seconds: 45, cue: "Lunge, elbow to instep, rotate the arm up. Alternate sides" },
  { name: "Bodyweight squat + pry", seconds: 40, cue: "Sit deep, push knees out with elbows, rock gently" },
  { name: "Hip hinge drill", seconds: 40, cue: "Hands on hips, push them back, flat back, stand tall" },
  { name: "Ramp-up set", seconds: 40, cue: "One light set of your first exercise at ~50% weight" },
];

export function videoUrl(ex: Exercise) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " proper form")}`;
}

export interface EquipmentSettings {
  db: boolean;
  kb: boolean;
  bench: boolean;
  box: boolean;
}

export function canDo(ex: Exercise, eq: EquipmentSettings) {
  const hasImplement = ex.implements.length === 0 || ex.implements.some((i) => eq[i]);
  const hasGear = (ex.needs ?? []).every((g) => eq[g]);
  return hasImplement && hasGear;
}

// Pick the exercise itself, else the first swap the user's gear allows.
export function resolveExercise(id: string, eq: EquipmentSettings): Exercise {
  const ex = EXERCISES[id];
  if (canDo(ex, eq)) return ex;
  for (const s of ex.swaps) {
    const alt = EXERCISES[s];
    if (alt && canDo(alt, eq)) return alt;
  }
  return ex;
}
