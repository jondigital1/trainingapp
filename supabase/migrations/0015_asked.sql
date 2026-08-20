-- What people ask Lifty, and whether Lifty had an answer.
--
-- The panel is a lookup over hand written entries, so its worth is decided
-- entirely by what is written into it, and until now every question it could
-- not answer vanished the moment somebody closed the sheet. Writing more
-- entries without this table is guessing at what people want to know. With it,
-- the next entry to write is the top row of a list.
--
-- Answered searches are kept too, not only the misses. Asked most is a
-- hardcoded four today, chosen by hand before anybody had asked anything, and
-- this is what eventually makes that list true.
--
-- The text is capped, because a search box is not a place to write an essay
-- and an unbounded column somebody can post to is a place to store one.
--
-- Row level security with a single policy, and it is insert only: a person may
-- record their own question and read nothing back, including their own. The
-- report is assembled by the admin route through the service role, which is
-- also the only thing that ever reads this table.
--
-- Deleting an account takes its questions with it. A question is something a
-- person typed, so it does not outlive them the way the audit trail does.

create table if not exists public.asked_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null check (char_length(question) between 2 and 200),
  answered boolean not null default false,
  at timestamptz not null default now()
);

create index if not exists asked_questions_at_idx on public.asked_questions (at desc);

alter table public.asked_questions enable row level security;

create policy asked_questions_own on public.asked_questions
  for insert to authenticated
  with check (auth.uid() = user_id);
