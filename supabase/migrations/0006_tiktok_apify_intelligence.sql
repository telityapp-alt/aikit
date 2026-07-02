create table if not exists public.tiktok_profile_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_account_id uuid references public.platform_accounts(id) on delete set null,
  tiktok_handle text not null,
  status text not null default 'queued'
    check (status in ('queued','running','completed','failed')),
  date_from timestamptz,
  date_to timestamptz,
  filters jsonb not null default '{}'::jsonb,
  profile_snapshot jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  artifact_id uuid,
  apify_run_id text,
  apify_dataset_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tiktok_profile_reports_user_created_idx
  on public.tiktok_profile_reports(user_id, created_at desc);

create table if not exists public.tiktok_profile_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.tiktok_profile_reports(id) on delete cascade,
  content_item_id uuid not null references public.platform_content_items(id) on delete cascade,
  rank_position integer,
  top_score numeric(10,2),
  url text not null,
  caption text,
  published_at timestamptz,
  thumbnail_url text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  share_count integer not null default 0,
  save_count integer not null default 0,
  view_count integer not null default 0,
  duration_seconds integer not null default 0,
  engagement_count integer not null default 0,
  engagement_rate numeric(12,4) not null default 0,
  view_to_engagement_rate numeric(12,4) not null default 0,
  share_rate numeric(12,4) not null default 0,
  save_rate numeric(12,4) not null default 0,
  comment_rate numeric(12,4) not null default 0,
  velocity_score numeric(10,2) not null default 0,
  ai_enrichment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tiktok_profile_report_items_report_rank_idx
  on public.tiktok_profile_report_items(report_id, rank_position asc);

create table if not exists public.tiktok_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.tiktok_profile_reports(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  stage text not null,
  status text not null default 'running',
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tiktok_report_events_report_idx
  on public.tiktok_report_events(report_id, created_at asc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tiktok_reports_artifact_fk'
  ) then
    alter table public.tiktok_profile_reports
      add constraint tiktok_reports_artifact_fk
      foreign key (artifact_id) references public.generated_artifacts(id) on delete set null;
  end if;
end $$;

alter table public.tiktok_profile_reports enable row level security;
alter table public.tiktok_profile_report_items enable row level security;
alter table public.tiktok_report_events enable row level security;

drop policy if exists "tiktok_reports_own" on public.tiktok_profile_reports;
create policy "tiktok_reports_own" on public.tiktok_profile_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tiktok_report_items_own" on public.tiktok_profile_report_items;
create policy "tiktok_report_items_own" on public.tiktok_profile_report_items
  for select using (
    exists (
      select 1
      from public.tiktok_profile_reports reports
      where reports.id = tiktok_profile_report_items.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "tiktok_report_events_own" on public.tiktok_report_events;
create policy "tiktok_report_events_own" on public.tiktok_report_events
  for select using (
    exists (
      select 1
      from public.tiktok_profile_reports reports
      where reports.id = tiktok_report_events.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "platform_accounts_via_tiktok_reports" on public.platform_accounts;
create policy "platform_accounts_via_tiktok_reports" on public.platform_accounts
  for select using (
    exists (
      select 1
      from public.tiktok_profile_reports reports
      where reports.profile_account_id = platform_accounts.id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "platform_content_items_via_tiktok_reports" on public.platform_content_items;
create policy "platform_content_items_via_tiktok_reports" on public.platform_content_items
  for select using (
    exists (
      select 1
      from public.tiktok_profile_report_items report_items
      join public.tiktok_profile_reports reports
        on reports.id = report_items.report_id
      where report_items.content_item_id = platform_content_items.id
        and reports.user_id = auth.uid()
    )
  );

insert into public.automations (
  slug,
  title,
  description,
  type,
  pricing,
  cost_per_run,
  image,
  sort_order,
  is_active,
  system_prompt,
  model
)
values (
  'tiktok-profile-intelligence',
  'TikTok Profile Intelligence',
  'Scrape profil TikTok via Apify, hitung KPI konten, dan tampilkan dashboard insight + workbook.',
  'App',
  'Pro',
  125,
  'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&h=200&fit=crop&auto=format',
  1,
  true,
  'Analisis performa konten TikTok secara strategis, tajam, dan dapat ditindaklanjuti.',
  'claude-sonnet-4-5'
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
  system_prompt = excluded.system_prompt,
  model = excluded.model;

insert into public.modules (
  slug,
  title,
  description,
  category,
  pricing,
  image,
  sort_order,
  is_active,
  system_prompt,
  model,
  cost_per_chat_msg
)
values (
  'tiktok-profile-intelligence',
  'TikTok Profile Intelligence',
  'Workspace intelligence untuk membedah performa konten TikTok dari satu profil.',
  'Marketing',
  'Pro',
  'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&h=200&fit=crop&auto=format',
  1,
  true,
  'Analisis report TikTok secara kritis, fokus ke KPI, pattern, dan eksperimen konten berikutnya.',
  'claude-sonnet-4-5',
  1
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  pricing = excluded.pricing,
  image = excluded.image,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  system_prompt = excluded.system_prompt,
  model = excluded.model,
  cost_per_chat_msg = excluded.cost_per_chat_msg;
