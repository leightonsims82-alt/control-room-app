-- Programme Buddy cloud schema
-- Run this in Supabase SQL editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  site_manager_name text,
  site_manager_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid,
  email text not null,
  role text not null default 'site_manager',
  created_at timestamptz not null default now()
);

create table if not exists public.plot_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  local_template_id text not null,
  name text not null,
  activities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, local_template_id)
);

create table if not exists public.plots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  local_plot_id text not null,
  plot_no text not null,
  template_id text not null,
  stage9_complete_week integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, local_plot_id),
  unique(project_id, plot_no)
);

create table if not exists public.trade_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  local_trade_id text not null,
  trade text not null,
  contractor text,
  supervisor_name text,
  supervisor_email text,
  supervisor_phone text,
  access_token text not null default encode(gen_random_bytes(16), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, local_trade_id),
  unique(access_token)
);

create table if not exists public.activity_delays (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  plot_id text not null,
  activity_code text not null,
  delay_days integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(project_id, plot_id, activity_code)
);

create table if not exists public.issue_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  local_issue_id text,
  start_week integer not null,
  recipient_count integer not null default 0,
  revision text,
  issue_type text not null default 'PDF record',
  note text,
  issued_at timestamptz not null default now(),
  issued_by text
);

create or replace view public.supervisor_trade_view as
select
  tc.access_token,
  tc.project_id,
  p.name as project_name,
  tc.trade,
  tc.contractor,
  tc.supervisor_name,
  tc.supervisor_email,
  tc.active
from public.trade_contacts tc
join public.projects p on p.id = tc.project_id
where tc.active = true;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.plot_templates enable row level security;
alter table public.plots enable row level security;
alter table public.trade_contacts enable row level security;
alter table public.activity_delays enable row level security;
alter table public.issue_logs enable row level security;

create policy "project members read projects" on public.projects
for select using (
  exists (select 1 from public.project_members m where m.project_id = id and m.user_id = auth.uid())
);

create policy "project members manage plots" on public.plots
for all using (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
);

create policy "project members manage templates" on public.plot_templates
for all using (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
);

create policy "project members manage trades" on public.trade_contacts
for all using (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
);

create policy "project members manage delays" on public.activity_delays
for all using (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
);

create policy "project members manage issue logs" on public.issue_logs
for all using (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.project_members m where m.project_id = project_id and m.user_id = auth.uid())
);
