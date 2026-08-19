-- The weekly nudge.
--
-- One message a week, on a day and at an hour somebody picks, that compares
-- the week they said they wanted against the week they have had. It is not a
-- streak: a streak punishes a rest day, and rest days are part of the plan.
--
-- This is the first thing in the app that needs a push subscription to outlive
-- the request that carried it. The rest alert deliberately stores nothing,
-- because it is sent seconds after the phone hands it over. A message sent on
-- Friday evening to somebody who has not opened the app since Tuesday has
-- nowhere to be sent from unless the endpoint is on disk. So it is stored, and
-- only when the nudge is switched on: turning it off deletes the row, and so
-- does the browser replacing the subscription, which comes back from the push
-- service as a 404 or a 410.

create table if not exists public.push_devices (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  -- An IANA name rather than an offset, because an offset is wrong twice a
  -- year and this only fires in the evening.
  zone text not null default 'UTC',
  created_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);

create index if not exists push_devices_user_idx on public.push_devices (user_id);

alter table public.push_devices enable row level security;

drop policy if exists "own push devices" on public.push_devices;
create policy "own push devices" on public.push_devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Columns rather than another key in the profile jsonb, because unlike every
-- answer in the questionnaire these are read across users: the job that sends
-- the nudges asks who is due, and asking that of jsonb is how a small table
-- turns into a slow one.
--
-- A null day is off, which is the default. Nobody is opted in to being
-- messaged by a thing they installed to count sets.
alter table public.settings
  add column if not exists nudge_day smallint check (nudge_day between 0 and 6),
  add column if not exists nudge_hour smallint not null default 18 check (nudge_hour between 0 and 23),
  add column if not exists nudged_at timestamptz,
  -- Consecutive nudges that were followed by no training at all. After enough
  -- of them the app stops talking, because somebody who has not trained in two
  -- months is not being helped by a fourth reminder that they have not
  -- trained in two months.
  add column if not exists nudge_misses smallint not null default 0;

-- Deleting an account has to take the endpoints with it. Every one of these
-- cascades from auth.users already, so the list is belt and braces; it is kept
-- complete so that reading this function tells you everything a person leaves
-- behind. Shared workouts were missing from it and are added here.
create or replace function public.delete_me()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.workouts where user_id = uid;
  delete from public.custom_exercises where user_id = uid;
  delete from public.custom_workouts where user_id = uid;
  delete from public.body_weights where user_id = uid;
  delete from public.shared_workouts where user_id = uid;
  delete from public.push_devices where user_id = uid;
  delete from public.settings where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_me() from public;
grant execute on function public.delete_me() to authenticated;
