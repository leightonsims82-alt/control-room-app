-- Programme Buddy / SiteProg user cloud backup
-- Apply this migration to the Supabase project dedicated to SiteProg.

create table if not exists public.app_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.app_backups enable row level security;

drop policy if exists "users read own programme backup" on public.app_backups;
create policy "users read own programme backup"
on public.app_backups
for select
using (auth.uid() = user_id);

drop policy if exists "users insert own programme backup" on public.app_backups;
create policy "users insert own programme backup"
on public.app_backups
for insert
with check (auth.uid() = user_id);

drop policy if exists "users update own programme backup" on public.app_backups;
create policy "users update own programme backup"
on public.app_backups
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users delete own programme backup" on public.app_backups;
create policy "users delete own programme backup"
on public.app_backups
for delete
using (auth.uid() = user_id);