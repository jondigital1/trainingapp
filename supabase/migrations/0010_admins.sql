-- Who can see everybody else.
--
-- A separate table rather than a column on settings, because settings is a row
-- the user owns and can write to. A flag anybody can set on their own row is
-- not a permission, it is a suggestion.
--
-- Row level security is on and there are deliberately no policies, which means
-- no policy ever matches and nothing reached through the anon key can read or
-- write this table. The service role bypasses RLS, so the admin endpoints can,
-- and they are the only thing that ever touches it.
--
-- ADMIN_EMAILS in the environment stays the root of trust on top of this. It
-- cannot be edited from inside the app at all, so an empty or broken table
-- still leaves a way in.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

revoke all on public.admins from anon, authenticated;
