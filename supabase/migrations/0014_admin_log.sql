-- The audit trail.
--
-- Admin can be granted to other people from the admin screen, and the moment a
-- second admin exists, a ban or a delete with no record of who did it is a
-- hole. Every action the admin route takes lands here first: who, did what,
-- to whom, when.
--
-- Emails are stored as text and the ids carry no foreign keys, on purpose. An
-- audit trail has to survive the accounts it mentions, so deleting a user must
-- not cascade their history out of it, and delete_me leaves this table alone
-- for the same reason.
--
-- Row level security is enabled with no policies at all, which locks the table
-- to the service role: admins read it through the admin route, where the
-- allowlist runs on every request, and nobody writes it but the route itself.

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_email text not null,
  action text not null,
  target_id uuid not null,
  target_email text not null,
  at timestamptz not null default now()
);

create index if not exists admin_actions_at_idx on public.admin_actions (at desc);

alter table public.admin_actions enable row level security;
