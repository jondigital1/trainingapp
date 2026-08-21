-- A custom exercise trained one muscle group. Plenty of the movements people
-- type in do not have a single home: a clean and press is not a shoulder
-- exercise with an asterisk, and filing it as one credited the shoulders in
-- the weekly count while quietly dropping the back and the quads that did the
-- work.
--
-- No column changes. muscle_group now holds a comma separated list, and a row
-- written before this is simply a list of one, so nothing needs backfilling
-- and nothing breaks if this file is never run.
--
-- One text column rather than an array column on purpose. An array column
-- means a migration that has to land before the deploy that needs it, and
-- there is no order of those two that is safe: deploy first and every save
-- fails on an unknown column, migrate first and nothing is reading it yet.
-- No muscle group name contains a comma, so the list reads back unambiguously.

comment on column public.custom_exercises.muscle_group is
  'Comma separated list of the muscle groups this movement trains, first one primary. A single name is a list of one.';
