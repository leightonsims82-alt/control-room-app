-- Programme Buddy / SiteProg cloud schema
-- Designed to live safely inside a shared Supabase project.
-- Every table is prefixed with siteprog_ so it remains isolated from other apps.

create extension if not exists pgcrypto;

create table if not exists public.siteprog_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  client text,
  site_manager_name text,
  site_manager_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.siteprog_plot_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references public.siteprog_projects(id) on delete cascade,
  local_template_id text not null,
  name text not null,
  activities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, local_template_id)
);

create table if not exists public.siteprog_plots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references public.siteprog_projects(id) on delete cascade,
  local_plot_id text not null,
  plot_no text not null,
  template_id text not null,
  stage9_complete_week integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, local_plot_id),
  unique(project_id, plot_no)
);

create table if not exists public.siteprog_trade_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references public.siteprog_projects(id) on delete cascade,
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

create table if not exists public.siteprog_activity_delays (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references public.siteprog_projects(id) on delete cascade,
  plot_id text not null,
  activity_code text not null,
  delay_days integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(project_id, plot_id, activity_code)
);

create table if not exists public.siteprog_issue_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  project_id uuid not null references public.siteprog_projects(id) on delete cascade,
  local_issue_id text,
  start_week integer not null,
  recipient_count integer not null default 0,
  revision text,
  issue_type text not null default 'PDF record',
  note text,
  issued_at timestamptz not null default now(),
  issued_by text,
  unique(project_id, local_issue_id)
);

create table if not exists public.siteprog_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.siteprog_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null default auth.uid(),
  page text,
  category text not null default 'General' check (category in ('Bug','Idea','Usability','General')),
  message text not null check (char_length(message) between 3 and 4000),
  screenshot_path text,
  app_version text,
  status text not null default 'new' check (status in ('new','reviewed','planned','resolved')),
  created_at timestamptz not null default now()
);

alter table public.siteprog_projects enable row level security;
alter table public.siteprog_plot_templates enable row level security;
alter table public.siteprog_plots enable row level security;
alter table public.siteprog_trade_contacts enable row level security;
alter table public.siteprog_activity_delays enable row level security;
alter table public.siteprog_issue_logs enable row level security;
alter table public.siteprog_backups enable row level security;
alter table public.siteprog_feedback enable row level security;

create policy "siteprog owner manages projects" on public.siteprog_projects
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "siteprog owner manages templates" on public.siteprog_plot_templates
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "siteprog owner manages plots" on public.siteprog_plots
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "siteprog owner manages trades" on public.siteprog_trade_contacts
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "siteprog owner manages delays" on public.siteprog_activity_delays
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "siteprog owner manages issue logs" on public.siteprog_issue_logs
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "siteprog users manage own backup" on public.siteprog_backups
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "siteprog feedback insert" on public.siteprog_feedback
for insert to anon, authenticated with check (char_length(message) between 3 and 4000);

create policy "siteprog users read own feedback" on public.siteprog_feedback
for select to authenticated using (user_id = auth.uid());

create index if not exists siteprog_projects_owner_idx on public.siteprog_projects(owner_id);
create index if not exists siteprog_plots_project_idx on public.siteprog_plots(project_id);
create index if not exists siteprog_trades_project_idx on public.siteprog_trade_contacts(project_id);
create index if not exists siteprog_issue_logs_project_idx on public.siteprog_issue_logs(project_id);
create index if not exists siteprog_feedback_created_at_idx on public.siteprog_feedback(created_at desc);
create index if not exists siteprog_feedback_status_idx on public.siteprog_feedback(status);
