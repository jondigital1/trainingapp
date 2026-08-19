-- Passing a workout to somebody else.
--
-- Only the shape of a session travels: its name and the movements in it, in
-- order, with their superset tags. Nothing anybody logged is in here, so a link
-- can never leak a number somebody lifted.
--
-- The row is owned like every other row and protected by the same one policy,
-- so nobody can list what anybody else has published. Reading one by its link
-- goes through a security definer function instead, which returns exactly one
-- row and only to somebody who already knows the id. The id is a uuid, so
-- knowing it means having been given it.

create table if not exists public.shared_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists shared_workouts_user_idx on public.shared_workouts (user_id);

alter table public.shared_workouts enable row level security;

drop policy if exists "own shared workouts" on public.shared_workouts;
create policy "own shared workouts" on public.shared_workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The one way to read somebody else's. Definer so it runs past the policy
-- above, and it takes the id as the whole argument, so there is nothing to
-- enumerate and no way to ask for a list.
create or replace function public.shared_workout(share uuid)
returns table (id uuid, name text, items jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.name, s.items, s.created_at
  from public.shared_workouts s
  where s.id = share
  limit 1;
$$;

revoke all on function public.shared_workout(uuid) from public;
grant execute on function public.shared_workout(uuid) to anon, authenticated;
