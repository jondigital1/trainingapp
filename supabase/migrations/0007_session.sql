-- A workout becomes a thing with a start and an end, rather than a date and a
-- title. Duration falls out of it, and so does somewhere to hang the one
-- question worth asking afterwards: how was that, one to ten.
--
-- All three are nullable. Every session logged before this existed has no
-- start, no end and no score, and that is the honest answer for them rather
-- than a number invented after the fact.

alter table public.workouts
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists intensity smallint
    check (intensity is null or (intensity >= 1 and intensity <= 10));

-- save_workout, fourth edition: the session carries when it ran and how it felt.
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

  insert into public.workouts (id, user_id, date, title, started_at, ended_at, intensity)
  values (
    w_id, uid, (payload ->> 'date')::date, payload ->> 'title',
    (payload ->> 'startedAt')::timestamptz,
    (payload ->> 'endedAt')::timestamptz,
    (payload ->> 'intensity')::smallint
  )
  on conflict (id) do update
    set date = excluded.date,
        title = excluded.title,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        intensity = excluded.intensity;

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
