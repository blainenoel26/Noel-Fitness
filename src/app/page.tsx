"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EXERCISES, resolveExercise } from "@/lib/exercises";
import { DAYS, LENGTHS, buildSteps, estimateMinutes, weekInfo } from "@/lib/program";
import { currentWeek, daysDoneThisWeek, nextDayId, updateSettings, useStore } from "@/lib/store";

export default function Today() {
  const { sessions, settings, loaded } = useStore();
  const [resumeDay, setResumeDay] = useState<string | null>(null);

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem("as.active") ?? "null");
      setResumeDay(a?.dayId ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  if (!loaded) return <div className="screen center muted">Loading…</div>;

  const absWeek = currentWeek(sessions, settings);
  const info = weekInfo(absWeek);
  const next = DAYS.find((d) => d.id === nextDayId(sessions, settings))!;
  const done = daysDoneThisWeek(sessions, settings);
  const steps = buildSteps(next, info, settings.length);
  const eq = settings.equipment;
  const traveling = !eq.bench && !eq.box;

  const exercisesFor = (dayId: string) =>
    DAYS.find((d) => d.id === dayId)!
      .blocks.filter((b) => !b.minLength || settings.length >= b.minLength)
      .flatMap((b) => b.items.map((i) => resolveExercise(i.id, eq).name));

  return (
    <div className="screen">
      <header className="hero">
        <div className="small muted">
          Cycle {info.cycle} · Week {info.week} of 12
        </div>
        <h1>
          {info.phase.name}
          {info.deload ? " — Deload" : ""}
        </h1>
        <p className="muted">{info.deload ? "Lighter week: half the sets, ~80% weight. Recover and come back stronger." : info.phase.goal}</p>
        <div className="week-dots">
          {DAYS.map((d) => (
            <span key={d.id} className={done.includes(d.id) ? "on" : d.id === next.id ? "next" : ""}>
              {d.num}
            </span>
          ))}
        </div>
      </header>

      {resumeDay && (
        <Link href={`/workout/${resumeDay}`} className="card resume">
          <b>Resume workout in progress ›</b>
          <div className="small muted">Day {DAYS.find((d) => d.id === resumeDay)?.num} — your sets are saved</div>
        </Link>
      )}

      <div className="card feature">
        <div className="small muted">Up next</div>
        <h2>
          Day {next.num}: {next.name}
        </h2>
        <div className="small muted">
          {next.focus} · ~{estimateMinutes(steps)} min
        </div>
        <div className="seg" role="group" aria-label="Session length">
          {LENGTHS.map((l) => (
            <button key={l.value} className={settings.length === l.value ? "on" : ""} onClick={() => updateSettings({ length: l.value })}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="small muted">{LENGTHS.find((l) => l.value === settings.length)?.hint}</div>
        <ul className="ex-list">
          {exercisesFor(next.id).map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
        <Link href={`/workout/${next.id}`} className="btn primary block">
          ▶ Start workout
        </Link>
      </div>

      <div className="card">
        <div className="row-between">
          <div>
            <b>Travel mode</b>
            <div className="small muted">No bench or box — auto-swaps to floor &amp; standing versions</div>
          </div>
          <button
            className={`toggle ${traveling ? "on" : ""}`}
            aria-pressed={traveling}
            onClick={() => updateSettings({ equipment: { ...eq, bench: traveling, box: traveling } })}
          >
            <span />
          </button>
        </div>
      </div>

      <h3 className="section">All workouts this week</h3>
      <div className="day-grid">
        {DAYS.map((d) => (
          <Link key={d.id} href={`/workout/${d.id}`} className={`card day-card ${done.includes(d.id) ? "done" : ""}`}>
            <div className="small muted">Day {d.num}{done.includes(d.id) ? " ✓" : ""}</div>
            <b>{d.name}</b>
            <div className="small muted">~{estimateMinutes(buildSteps(d, info, settings.length))} min</div>
          </Link>
        ))}
      </div>

      {sessions.length > 0 && (
        <p className="small muted center-text">
          {sessions.length} workout{sessions.length === 1 ? "" : "s"} logged · last:{" "}
          {new Date(sessions[sessions.length - 1].completedAt).toLocaleDateString()}
        </p>
      )}
      <p className="small muted center-text">{Object.keys(EXERCISES).length} exercises in the library</p>
    </div>
  );
}
