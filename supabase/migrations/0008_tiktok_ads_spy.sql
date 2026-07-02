create table if not exists public.tiktok_ads_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  region text not null default 'all',
  status text not null default 'queued'
    check (status in ('queued','running','completed','failed')),
  date_from timestamptz,
  date_to timestamptz,
  filters jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  start_url text,
  artifact_id uuid,
  apify_run_id text,
  apify_dataset_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tiktok_ads_reports_user_created_idx
  on public.tiktok_ads_reports(user_id, created_at desc);

create table if not exists public.tiktok_ads_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.tiktok_ads_reports(id) on delete cascade,
  rank_position integer,
  ad_id text not null,
  ad_name text,
  caption text,
  click_url text,
  cta text,
  advertiser_id text,
  advertiser_name text,
  paid_by text,
  audit_status text,
  ad_type text,
  first_shown timestamptz,
  last_shown timestamptz,
  days_active integer not null default 0,
  impressions_lower integer not null default 0,
  impressions_upper integer not null default 0,
  impressions_estimate integer not null default 0,
  reach_estimate integer not null default 0,
  audience_size_estimate bigint not null default 0,
  video_url text,
  cover_image_url text,
  tiktok_user jsonb not null default '{}'::jsonb,
  ai_enrichment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tiktok_ads_report_items_report_rank_idx
  on public.tiktok_ads_report_items(report_id, rank_position asc);

create table if not exists public.tiktok_ads_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.tiktok_ads_reports(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  stage text not null,
  status text not null default 'running',
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tiktok_ads_events_report_idx
  on public.tiktok_ads_events(report_id, created_at asc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tiktok_ads_reports_artifact_fk'
  ) then
    alter table public.tiktok_ads_reports
      add constraint tiktok_ads_reports_artifact_fk
      foreign key (artifact_id) references public.generated_artifacts(id) on delete set null;
  end if;
end $$;

alter table public.tiktok_ads_reports enable row level security;
alter table public.tiktok_ads_report_items enable row level security;
alter table public.tiktok_ads_events enable row level security;

drop policy if exists "tiktok_ads_reports_own" on public.tiktok_ads_reports;
create policy "tiktok_ads_reports_own" on public.tiktok_ads_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tiktok_ads_report_items_own" on public.tiktok_ads_report_items;
create policy "tiktok_ads_report_items_own" on public.tiktok_ads_report_items
  for select using (
    exists (
      select 1 from public.tiktok_ads_reports reports
      where reports.id = tiktok_ads_report_items.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "tiktok_ads_events_own" on public.tiktok_ads_events;
create policy "tiktok_ads_events_own" on public.tiktok_ads_events
  for select using (
    exists (
      select 1 from public.tiktok_ads_reports reports
      where reports.id = tiktok_ads_events.report_id
        and reports.user_id = auth.uid()
    )
  );

insert into public.automations (
  slug, title, description, type, pricing, cost_per_run, image, sort_order, is_active, system_prompt, model
)
values (
  'tiktok-ads-spy',
  'TikTok Ads Spy',
  'Spy iklan kompetitor di TikTok Ads Library: creative gallery, share-of-voice, targeting, dan region intelligence.',
  'App',
  'Pro',
  150,
  'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=400&h=200&fit=crop&auto=format',
  3,
  true,
  'Analisis strategi iklan kompetitor TikTok secara tajam: kreatif, targeting, dan share-of-voice.',
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
  slug, title, description, category, pricing, image, sort_order, is_active, system_prompt, model, cost_per_chat_msg
)
values (
  'tiktok-ads-spy',
  'TikTok Ads Spy',
  'Competitive ad intelligence untuk TikTok: bedah kreatif, targeting, dan share-of-voice kompetitor.',
  'Marketing',
  'Pro',
  'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=400&h=200&fit=crop&auto=format',
  3,
  true,
  'Bantu analisis iklan kompetitor TikTok: pola kreatif, CTA, targeting, dan peluang.',
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
