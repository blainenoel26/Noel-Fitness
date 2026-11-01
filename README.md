# Anywhere Strength

Guided dumbbell & kettlebell strength training you can run from your phone — at home or traveling.

- **12-week program**, 4 full-body sessions/week, 30, 45 or 60 min each — your choice per workout (Foundation → Build → Strength, deload every 4th week)
- **Guided player**: warm-up timer, set-by-set targets, rest timer with beeps/vibration, timed holds with "switch sides" cue, screen stays awake
- **Auto progression** (double progression): suggests your next weight from what you logged last time
- **Travel mode / equipment toggles**: no bench or box? Exercises auto-swap to floor/standing versions. Tap "Swap" for alternatives any time
- **Core work** every session: McGill Big 3, dead bugs, carries, Turkish get-ups
- **Local-first**: works offline; syncs to Supabase when you sign in (email code, no password)
- Installable PWA (Add to Home Screen)

Stack: Next.js (App Router) · Supabase (Auth + Postgres with RLS) · Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key (optional — app works local-only without it)
npm run dev
```

## Supabase setup (one time)

1. Create a project at https://supabase.com/dashboard.
2. **SQL Editor** → paste `supabase/migrations/0001_init.sql` → Run.
3. **Authentication → Sign In / Providers → Email**: enabled (default).
4. **Authentication → Emails → Magic Link** template: add `{{ .Token }}` so the email contains a 6-digit code, e.g.
   `<p>Your code: <b>{{ .Token }}</b></p><p>Or <a href="{{ .ConfirmationURL }}">tap to sign in</a></p>`
   (The code matters on iPhone: a home-screen app can't receive links opened in Safari.)
5. **Authentication → URL Configuration**: set Site URL to your Vercel URL and add it to Redirect URLs.
6. **Project Settings → API**: copy the Project URL and anon/publishable key.

## Deploy to Vercel

1. Push this repo to GitHub.
2. https://vercel.com/new → import the repo (framework auto-detected as Next.js).
3. Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Every push to `main` redeploys automatically.

## Customising

- Exercises and cues: `src/lib/exercises.ts`
- Days, phases, sets/reps/rest: `src/lib/program.ts`
- Progression rules: `src/lib/progression.ts`

Not medical advice — check with a professional if you have injuries or health conditions.
