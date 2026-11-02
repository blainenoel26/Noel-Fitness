"use client";

import { useEffect, useState } from "react";
import type { EquipmentSettings } from "@/lib/exercises";
import { currentWeek, getSyncStatus, setCurrentWeek, syncNow, updateSettings, useStore } from "@/lib/store";
import { cloudEnabled, supabase } from "@/lib/supabase";

const GEAR: { key: keyof EquipmentSettings; label: string; hint: string }[] = [
  { key: "db", label: "Dumbbells", hint: "Adjustable or a set of pairs" },
  { key: "kb", label: "Kettlebell(s)", hint: "Dumbbells stand in if you don't have one" },
  { key: "bench", label: "Bench / couch edge", hint: "For bench press, split squats, hip thrusts" },
  { key: "box", label: "Box / sturdy step", hint: "For step-ups" },
];

export default function SettingsPage() {
  const { settings, sessions, loaded } = useStore();
  const sync = getSyncStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "link">("password");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    void sb.auth.getUser().then(({ data }) => setUser(data.user?.email ?? null));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!loaded) return <div className="screen center muted">Loading…</div>;
  const week = currentWeek(sessions, settings);

  const signIn = async () => {
    const sb = supabase();
    if (!sb || !email || !password) return;
    setMsg("Signing in…");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setMsg(error ? error.message : "Signed in — syncing your workouts.");
  };

  const signUp = async () => {
    const sb = supabase();
    if (!sb || !email) return;
    if (password.length < 8) return setMsg("Use a password of at least 8 characters.");
    setMsg("Creating account…");
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/settings" },
    });
    if (error) setMsg(error.message);
    else if (!data.session) setMsg("Account created. Tap the confirmation link in your email once, then come back here and sign in.");
    else setMsg("Account created — syncing your workouts.");
  };

  const sendCode = async () => {
    const sb = supabase();
    if (!sb || !email) return;
    setMsg("Sending…");
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/settings" },
    });
    if (error) setMsg(error.message);
    else {
      setSent(true);
      setMsg("Check your email. Tap the link, or type the 6-digit code here (best for the home-screen app).");
    }
  };

  const verify = async () => {
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setMsg(error ? error.message : "Signed in — syncing your workouts.");
  };

  return (
    <div className="screen">
      <h1>Settings</h1>

      <h3 className="section">Units</h3>
      <div className="seg">
        {(["lb", "kg"] as const).map((u) => (
          <button key={u} className={settings.unit === u ? "on" : ""} onClick={() => updateSettings({ unit: u })}>
            {u}
          </button>
        ))}
      </div>

      <h3 className="section">Workout</h3>
      <div className="card tight row-between">
        <div>
          <b>Hands-free mode</b>
          <div className="small muted">Each set runs on a timer, logs itself, then rest starts and the next set follows. Off = tap to log each set.</div>
        </div>
        <button
          className={`toggle ${settings.autoAdvance ? "on" : ""}`}
          aria-pressed={settings.autoAdvance}
          onClick={() => updateSettings({ autoAdvance: !settings.autoAdvance })}
        >
          <span />
        </button>
      </div>

      <h3 className="section">Equipment available right now</h3>
      <p className="small muted">Exercises you can&apos;t do are automatically swapped for an alternative.</p>
      {GEAR.map((g) => (
        <div key={g.key} className="card tight row-between">
          <div>
            <b>{g.label}</b>
            <div className="small muted">{g.hint}</div>
          </div>
          <button
            className={`toggle ${settings.equipment[g.key] ? "on" : ""}`}
            aria-pressed={settings.equipment[g.key]}
            onClick={() => updateSettings({ equipment: { ...settings.equipment, [g.key]: !settings.equipment[g.key] } })}
          >
            <span />
          </button>
        </div>
      ))}

      <h3 className="section">Program week</h3>
      <div className="card tight row-between">
        <div>
          <b>Week {week}</b>
          <div className="small muted">Advances after every 4 workouts</div>
        </div>
        <div className="row gap">
          <button className="btn ghost sm" onClick={() => setCurrentWeek(week - 1)} disabled={week <= 1}>
            −
          </button>
          <button className="btn ghost sm" onClick={() => setCurrentWeek(week + 1)}>
            +
          </button>
        </div>
      </div>

      <h3 className="section">Account &amp; sync</h3>
      {!cloudEnabled ? (
        <p className="small muted">Cloud sync isn&apos;t configured — workouts are saved on this device only.</p>
      ) : user ? (
        <div className="card">
          <div>
            Signed in as <b>{user}</b>
          </div>
          <div className="small muted">
            Sync: {sync.status}
            {sync.error ? ` — ${sync.error}` : ""}
          </div>
          <div className="row gap">
            <button className="btn ghost sm" onClick={() => void syncNow()}>
              Sync now
            </button>
            <button className="btn ghost sm" onClick={() => void supabase()?.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="small muted">Sign in to back up your workouts and use them on any device. </p>
          <input className="search" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode === "password" ? (
            <>
              <input
                className="search"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="btn primary block" onClick={signIn}>
                Sign in
              </button>
              <button className="btn ghost block" onClick={signUp}>
                Create account
              </button>
              <button className="link small" onClick={() => { setMode("link"); setMsg(""); }}>
                Email me a sign-in link instead
              </button>
            </>
          ) : !sent ? (
            <button className="btn primary block" onClick={sendCode}>
              Email me a sign-in code
            </button>
          ) : (
            <>
              <input className="search" inputMode="numeric" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
              <button className="btn primary block" onClick={verify}>
                Verify code
              </button>
            </>
          )}
          {msg && <p className="small muted">{msg}</p>}
        </div>
      )}

      <h3 className="section">Install on your phone</h3>
      <div className="card tight small muted">
        <b>iPhone:</b> open in Safari → Share → <i>Add to Home Screen</i>.<br />
        <b>Android:</b> open in Chrome → ⋮ menu → <i>Install app</i>.<br />
        Works offline once loaded; workouts sync when you&apos;re back online.
      </div>
    </div>
  );
}
