-- aikit - instagram foundation + competitor report pipeline

create table if not exists public.platform_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  handle text not null,
  platform_user_id text,
  display_name text,
  profile_url text,
  profile_snapshot jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, handle)
);

create table if not exists public.platform_content_items (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  account_id uuid not null references public.platform_accounts(id) on delete cascade,
  platform_content_id text not null,
  content_type text,
  url text not null,
  shortcode text,
  caption text,
  published_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  normalized_metrics jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, account_id, platform_content_id)
);

create table if not exists public.platform_content_comments (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  content_item_id uuid not null references public.platform_content_items(id) on delete cascade,
  platform_comment_id text not null,
  author_handle text,
  text text,
  metrics jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, content_item_id, platform_comment_id)
);

create table if not exists public.instagram_competitor_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_account_id uuid references public.platform_accounts(id) on delete set null,
  instagram_handle text not null,
  source_tab text not null check (source_tab in ('posts', 'reels')),
  status text not null default 'queued'
    check (status in ('queued','running','completed','failed')),
  date_from timestamptz not null,
  date_to timestamptz not null,
  filters jsonb not null default '{}'::jsonb,
  profile_snapshot jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  excel_artifact_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists instagram_reports_user_created_idx
  on public.instagram_competitor_reports(user_id, created_at desc);

create table if not exists public.instagram_competitor_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.instagram_competitor_reports(id) on delete cascade,
  content_item_id uuid not null references public.platform_content_items(id) on delete cascade,
  is_top_content boolean not null default false,
  rank_position integer,
  top_score numeric(10,2),
  source_tab text not null,
  media_type text,
  url text not null,
  caption text,
  published_at timestamptz,
  thumbnail_url text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  play_count integer not null default 0,
  view_count integer not null default 0,
  engagement_count integer not null default 0,
  engagement_rate numeric(12,4) not null default 0,
  follower_count_snapshot integer not null default 0,
  transcript text,
  ai_enrichment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists instagram_report_items_report_rank_idx
  on public.instagram_competitor_report_items(report_id, rank_position asc);

create table if not exists public.instagram_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.instagram_competitor_reports(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  stage text not null,
  status text not null default 'running',
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists instagram_report_events_report_idx
  on public.instagram_report_events(report_id, created_at asc);

create table if not exists public.generated_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  report_id uuid references public.instagram_competitor_reports(id) on delete cascade,
  kind text not null,
  storage_provider text not null default 'r2',
  path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generated_artifacts_report_fk'
  ) then
    alter table public.generated_artifacts
      add constraint generated_artifacts_report_fk
      foreign key (report_id) references public.instagram_competitor_reports(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'instagram_reports_excel_artifact_fk'
  ) then
    alter table public.instagram_competitor_reports
      add constraint instagram_reports_excel_artifact_fk
      foreign key (excel_artifact_id) references public.generated_artifacts(id) on delete set null;
  end if;
end $$;

alter table public.platform_accounts enable row level security;
alter table public.platform_content_items enable row level security;
alter table public.platform_content_comments enable row level security;
alter table public.instagram_competitor_reports enable row level security;
alter table public.instagram_competitor_report_items enable row level security;
alter table public.instagram_report_events enable row level security;
alter table public.generated_artifacts enable row level security;

drop policy if exists "instagram_reports_own" on public.instagram_competitor_reports;
create policy "instagram_reports_own" on public.instagram_competitor_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "generated_artifacts_own" on public.generated_artifacts;
create policy "generated_artifacts_own" on public.generated_artifacts
  for select using (
    exists (
      select 1
      from public.instagram_competitor_reports reports
      where reports.id = generated_artifacts.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "instagram_report_items_own" on public.instagram_competitor_report_items;
create policy "instagram_report_items_own" on public.instagram_competitor_report_items
  for select using (
    exists (
      select 1
      from public.instagram_competitor_reports reports
      where reports.id = instagram_competitor_report_items.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "instagram_report_events_own" on public.instagram_report_events;
create policy "instagram_report_events_own" on public.instagram_report_events
  for select using (
    exists (
      select 1
      from public.instagram_competitor_reports reports
      where reports.id = instagram_report_events.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "platform_accounts_via_reports" on public.platform_accounts;
create policy "platform_accounts_via_reports" on public.platform_accounts
  for select using (
    exists (
      select 1
      from public.instagram_competitor_reports reports
      where reports.profile_account_id = platform_accounts.id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "platform_content_items_via_reports" on public.platform_content_items;
create policy "platform_content_items_via_reports" on public.platform_content_items
  for select using (
    exists (
      select 1
      from public.instagram_competitor_report_items report_items
      join public.instagram_competitor_reports reports
        on reports.id = report_items.report_id
      where report_items.content_item_id = platform_content_items.id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "platform_content_comments_via_reports" on public.platform_content_comments;
create policy "platform_content_comments_via_reports" on public.platform_content_comments
  for select using (
    exists (
      select 1
      from public.instagram_competitor_report_items report_items
      join public.instagram_competitor_reports reports
        on reports.id = report_items.report_id
      where report_items.content_item_id = platform_content_comments.content_item_id
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
  'competitor-analyzer',
  'Generator Laporan Kompetitor Instagram',
  'Ambil data Posts atau Reels kompetitor Instagram, analisis top content, komentar, dan export ke Excel.',
  'App',
  'Pro',
  75,
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&auto=format',
  0,
  true,
  'Analisis performa konten Instagram kompetitor secara tajam dan berbasis data.',
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
  'competitor-analyzer',
  'Generator Laporan Kompetitor Instagram',
  'Workspace intelligence untuk report kompetitor Instagram dari Posts atau Reels.',
  'Marketing',
  'Pro',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&auto=format',
  0,
  true,
  'Analisis report kompetitor Instagram secara kritis, tajam, dan bisa ditindaklanjuti.',
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
