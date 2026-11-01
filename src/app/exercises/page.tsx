"use client";

import { useState } from "react";
import { EXERCISES, videoUrl } from "@/lib/exercises";

const GEAR_LABEL = { db: "Dumbbell", kb: "Kettlebell" } as const;

export default function ExercisesPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const list = Object.values(EXERCISES).filter((e) =>
    `${e.name} ${e.muscles} ${e.pattern}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="screen">
      <h1>Exercises</h1>
      <input className="search" placeholder="Search by name or muscle…" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map((e) => (
        <div key={e.id} className="card tight">
          <button className="ex-row" onClick={() => setOpen(open === e.id ? null : e.id)}>
            <div>
              <b>{e.name}</b>
              <div className="small muted">{e.muscles}</div>
            </div>
            <span className="pill">{e.pattern}</span>
          </button>
          {open === e.id && (
            <div className="ex-detail">
              <div className="small muted">
                {e.implements.length ? e.implements.map((i) => GEAR_LABEL[i]).join(" or ") : "Bodyweight"}
                {e.needs?.length ? ` · needs ${e.needs.join(", ")}` : ""}
                {e.perSide ? " · each side" : ""}
              </div>
              <ol className="cues">
                {e.cues.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
              <div className="small warn">Avoid: {e.avoid}</div>
              {e.swaps.length > 0 && (
                <div className="small muted">Alternatives: {e.swaps.map((s) => EXERCISES[s]?.name).join(", ")}</div>
              )}
              <a className="btn ghost sm" href={videoUrl(e)} target="_blank" rel="noreferrer">
                ▶ Watch form videos
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
