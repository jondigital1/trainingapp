-- Bodyweight over time, as its own table rather than two fields on the profile.
-- Strength climbing while bodyweight holds is a different story from both
-- climbing together, and only a series can tell them apart.
--
-- One reading per day: weighing twice in a morning is noise, and the primary
-- key makes the second reading an edit rather than a second point. Weight is
-- stored in pounds, like every other load in this app; kilos are a display
-- choice applied at the edges.

create table if not exists public.body_weights (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight numeric not null check (weight > 0 and weight < 2000),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.body_weights enable row level security;

drop policy if exists body_weights_own on public.body_weights;
create policy body_weights_own on public.body_weights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists body_weights_user_date_idx
  on public.body_weights (user_id, date desc);
