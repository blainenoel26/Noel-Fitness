import { EXERCISES } from "@/lib/exercises";
import { DAYS, PHASES, PRINCIPLES, SOURCES, buildSteps, estimateMinutes, weekInfo } from "@/lib/program";

const ROLE_LABEL = { primary: "Primary", secondary: "Secondary", isolation: "Isolation", power: "Power" } as const;

export default function ProgramPage() {
  return (
    <div className="screen">
      <h1>The Program</h1>
      <p className="muted">
        12 weeks, 4 full-body sessions per week. Choose 30, 45 or 60 minutes before each workout — shorter sessions trim a set per exercise, longer ones add a set, an extra core round and more rest. Train on any 4 days — e.g. Mon/Tue/Thu/Fri or
        Mon/Wed/Fri/Sat. Repeat the cycle with heavier weights after week 12.
      </p>

      <h3 className="section">Phases</h3>
      {Object.values(PHASES).map((p) => (
        <div key={p.key} className="card">
          <div className="row-between">
            <b>{p.name}</b>
            <span className="small muted">{p.weeks}</span>
          </div>
          <p className="small muted">{p.goal}</p>
          <table className="scheme">
            <thead>
              <tr>
                <th></th>
                <th>Sets</th>
                <th>Reps</th>
                <th>RIR</th>
                <th>Rest</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => {
                const s = p.roles[r];
                return (
                  <tr key={r}>
                    <td>{ROLE_LABEL[r]}</td>
                    <td>{s.sets}</td>
                    <td>{r === "power" ? "see day" : `${s.reps[0]}–${s.reps[1]}`}</td>
                    <td>{s.rir}</td>
                    <td>{s.rest}s</td>
                  </tr>
                );
              })}
              <tr>
                <td>Core</td>
                <td>{p.coreRounds} rounds</td>
                <td colSpan={3}>circuit</td>
              </tr>
              <tr>
                <td>Finisher</td>
                <td>1 round</td>
                <td colSpan={3}>Days 2 &amp; 4, 45+ min · 30s hard / 15s off</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
      <div className="card tight small">
        <b>Deload — weeks 4, 8, 12:</b> half the sets, ~80% of your working weights, RIR 4.
      </div>

      <h3 className="section">Weekly schedule</h3>
      {DAYS.map((d) => (
        <div key={d.id} className="card">
          <div className="row-between">
            <b>
              Day {d.num}: {d.name}
            </b>
            <span className="small muted">
              ~{estimateMinutes(buildSteps(d, weekInfo(5), 30))} / {estimateMinutes(buildSteps(d, weekInfo(5), 45))} / {estimateMinutes(buildSteps(d, weekInfo(5), 60))} min
            </span>
          </div>
          <div className="small muted">{d.focus}</div>
          {d.blocks.map((b) => (
            <div key={b.label} className="block-row">
              <span className="block-label">{b.label}</span>
              <div>
                <div className="small muted">
                  {b.title}
                  {b.minLength ? ` · ${b.minLength}+ min sessions` : ""}
                </div>
                {b.items.map((i, n) => (
                  <div key={i.id}>
                    {b.items.length > 1 ? `${b.label}${n + 1}. ` : ""}
                    {EXERCISES[i.id].name}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="small muted">+ 3.5-minute guided warm-up and a weights check</div>
        </div>
      ))}

      <h3 className="section">Why it works</h3>
      {PRINCIPLES.map((p) => (
        <div key={p.title} className="card tight">
          <b>{p.title}</b>
          <p className="small muted">{p.body}</p>
        </div>
      ))}

      <h3 className="section">Research</h3>
      <ul className="sources">
        {SOURCES.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="small muted">
        Not medical advice. If you have pain, an injury or a health condition, check with a doctor or physical therapist
        before starting.
      </p>
    </div>
  );
}
