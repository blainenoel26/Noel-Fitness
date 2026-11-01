-- Anywhere Strength schema. Run in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.workout_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day_id text not null,
  program_week int not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_sec int not null default 0,
  unit text not null default 'lb' check (unit in ('lb', 'kg')),
  created_at timestamptz not null default now()
);

create table if not exists public.set_logs (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null,
  set_index int not null,
  reps int,
  weight numeric(6, 2),
  seconds int,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_idx on public.workout_sessions (user_id, completed_at);
create index if not exists set_logs_session_idx on public.set_logs (session_id);
create index if not exists set_logs_user_exercise_idx on public.set_logs (user_id, exercise_id);

alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;

-- Each user can only see and change their own rows.
create policy "own sessions" on public.workout_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own sets" on public.set_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  );
