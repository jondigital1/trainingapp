-- Somewhere to write down why. The log has every number and none of the
-- reasons, and "slept four hours, shoulder felt off" is the thing that
-- explains a bad week when you look back at it a month later.
--
-- On the session rather than the set, because that is the grain people
-- actually write at.

alter table public.workouts add column if not exists note text;

-- save_workout, fifth edition: the note travels with the session.
create or replace function public.save_workout(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  w_id uuid := (payload ->> 'id')::uuid;
  ex jsonb;
  st jsonb;
  ex_id uuid;
  ex_pos int := 0;
  st_pos int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.workouts (id, user_id, date, title, started_at, ended_at, intensity, note)
  values (
    w_id, uid, (payload ->> 'date')::date, payload ->> 'title',
    (payload ->> 'startedAt')::timestamptz,
    (payload ->> 'endedAt')::timestamptz,
    (payload ->> 'intensity')::smallint,
    payload ->> 'note'
  )
  on conflict (id) do update
    set date = excluded.date,
        title = excluded.title,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        intensity = excluded.intensity,
        note = excluded.note;

  delete from public.exercises where workout_id = w_id;

  for ex in select * from jsonb_array_elements(coalesce(payload -> 'exercises', '[]'::jsonb))
  loop
    ex_id := (ex ->> 'id')::uuid;

    insert into public.exercises (id, user_id, workout_id, name, type, position, superset)
    values (ex_id, uid, w_id, ex ->> 'name', ex ->> 'type', ex_pos, ex ->> 'superset');

    st_pos := 0;
    for st in select * from jsonb_array_elements(coalesce(ex -> 'sets', '[]'::jsonb))
    loop
      insert into public.sets (id, user_id, exercise_id, position, w, r, rpe, t, d, raw, dropset)
      values (
        (st ->> 'id')::uuid, uid, ex_id, st_pos,
        (st ->> 'w')::numeric, (st ->> 'r')::int, (st ->> 'rpe')::numeric,
        (st ->> 't')::int, (st ->> 'd')::numeric, st ->> 'raw',
        coalesce((st ->> 'drop')::boolean, false)
      );
      st_pos := st_pos + 1;
    end loop;

    ex_pos := ex_pos + 1;
  end loop;
end;
$$;

grant execute on function public.save_workout(jsonb) to authenticated;

-- Taking everything away. Every table cascades from auth.users, so the only
-- rows this has to reach are the ones this app owns; the account itself is
-- deleted by Supabase when this returns.
--
-- security definer because a user cannot delete from auth.users, and the id is
-- read from the session rather than taken as an argument, so it can only ever
-- delete the caller.
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
  delete from public.settings where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_me() from public;
grant execute on function public.delete_me() to authenticated;
