-- A custom exercise used to be a name and a set type, which made it a ghost in
-- half the app: no muscle group meant it never appeared in the weekly coverage
-- count, could not be swapped around a sore joint, and had its rest guessed
-- from the name by a classifier that has never heard of it.
--
-- All three are nullable, so every custom exercise already saved keeps working
-- and simply has nothing to say about its group until it is edited.

alter table public.custom_exercises
  add column if not exists muscle_group text,
  add column if not exists rest_tier text
    check (rest_tier is null or rest_tier in ('heavy', 'compound', 'isolation', 'cable', 'small')),
  add column if not exists default_sets smallint
    check (default_sets is null or (default_sets >= 1 and default_sets <= 10));
