create extension if not exists pgcrypto;

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  type text not null default 'App',
  pricing text not null default 'Pay per run',
  cost_per_run integer not null default 0,
  image text,
  system_prompt text not null default '',
  model text not null default 'claude-sonnet-4-5',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automations_active_sort_idx
  on public.automations(is_active, sort_order asc, created_at desc);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id text not null,
  workspace_email text,
  automation_id uuid references public.automations(id) on delete set null,
  automation_slug text not null,
  title text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  credits_spent integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists runs_workspace_user_created_idx
  on public.runs(workspace_user_id, created_at desc);

create index if not exists runs_status_created_idx
  on public.runs(status, created_at desc);

create table if not exists public.generated_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.runs(id) on delete cascade,
  report_id uuid,
  kind text not null default 'json',
  storage_provider text not null default 'r2',
  path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists generated_artifacts_run_idx
  on public.generated_artifacts(run_id, created_at desc);

create table if not exists public.automation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_user_id text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists automation_audit_logs_user_created_idx
  on public.automation_audit_logs(workspace_user_id, created_at desc);

insert into public.automations (
  slug, title, description, type, pricing, cost_per_run, image, sort_order, is_active
)
values
  (
    'google-maps-leads-brightdata',
    'Google Maps Leads Bright Data',
    'Fresh-start placeholder untuk vertical Google Maps berbasis provider baru.',
    'App',
    'Pay per run',
    0,
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=400&h=200&fit=crop&auto=format',
    10,
    true
  ),
  (
    'tokopedia-search-brightdata',
    'Tokopedia Search Bright Data',
    'Fresh-start placeholder untuk vertical Tokopedia Search berbasis provider baru.',
    'App',
    'Pay per run',
    0,
    'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400&h=200&fit=crop&auto=format',
    20,
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  pricing = excluded.pricing,
  cost_per_run = excluded.cost_per_run,
  image = excluded.image,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();
