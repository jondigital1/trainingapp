-- A note that belongs to the movement rather than to one Tuesday.
--
-- Sessions already carry a note, and that is the right home for how a session
-- went. It is the wrong home for "seat at 4, feet on the plate, elbows
-- tucked", which is true of this movement every time you do it and which
-- somebody currently has to remember or go hunting through history for.
--
-- One row per person per movement. The name is the key rather than an id
-- because the library is a static list in the app and custom movements are
-- named by the person who made them, so there is no id both kinds share. A
-- movement that gets renamed loses its note, which is the same thing that
-- happens to its history and is understood everywhere else in the app.

create table if not exists public.exercise_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

alter table public.exercise_notes enable row level security;

drop policy if exists "own exercise notes" on public.exercise_notes;
create policy "own exercise notes" on public.exercise_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Same list as always: everything cascades from auth.users, and the explicit
-- deletes are kept complete so that reading this function tells you everything
-- a person leaves behind.
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
  delete from public.exercise_notes where user_id = uid;
  delete from public.push_devices where user_id = uid;
  delete from public.settings where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_me() from public;
grant execute on function public.delete_me() to authenticated;
