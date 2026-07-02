create table if not exists public.meta_ads_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  country text not null default 'ID',
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

create index if not exists meta_ads_reports_user_created_idx
  on public.meta_ads_reports(user_id, created_at desc);

create table if not exists public.meta_ads_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.meta_ads_reports(id) on delete cascade,
  rank_position integer,
  ad_archive_id text not null,
  ad_library_url text,
  is_active boolean not null default false,
  advertiser_name text,
  page_id text,
  title text,
  body_text text,
  cta_type text,
  cta_text text,
  link_url text,
  display_format text,
  start_shown timestamptz,
  end_shown timestamptz,
  days_active integer not null default 0,
  collation_count integer not null default 1,
  market_total integer not null default 0,
  currency text,
  spend_estimate bigint not null default 0,
  is_political boolean not null default false,
  spy_score numeric(10,2) not null default 0,
  thumbnail_url text,
  video_url text,
  ai_enrichment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists meta_ads_report_items_report_rank_idx
  on public.meta_ads_report_items(report_id, rank_position asc);

create table if not exists public.meta_ads_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.meta_ads_reports(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  stage text not null,
  status text not null default 'running',
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists meta_ads_events_report_idx
  on public.meta_ads_events(report_id, created_at asc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meta_ads_reports_artifact_fk'
  ) then
    alter table public.meta_ads_reports
      add constraint meta_ads_reports_artifact_fk
      foreign key (artifact_id) references public.generated_artifacts(id) on delete set null;
  end if;
end $$;

alter table public.meta_ads_reports enable row level security;
alter table public.meta_ads_report_items enable row level security;
alter table public.meta_ads_events enable row level security;

drop policy if exists "meta_ads_reports_own" on public.meta_ads_reports;
create policy "meta_ads_reports_own" on public.meta_ads_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meta_ads_report_items_own" on public.meta_ads_report_items;
create policy "meta_ads_report_items_own" on public.meta_ads_report_items
  for select using (
    exists (
      select 1 from public.meta_ads_reports reports
      where reports.id = meta_ads_report_items.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "meta_ads_events_own" on public.meta_ads_events;
create policy "meta_ads_events_own" on public.meta_ads_events
  for select using (
    exists (
      select 1 from public.meta_ads_reports reports
      where reports.id = meta_ads_events.report_id
        and reports.user_id = auth.uid()
    )
  );

insert into public.automations (
  slug, title, description, type, pricing, cost_per_run, image, sort_order, is_active, system_prompt, model
)
values (
  'meta-ads-spy',
  'Meta Ads Spy',
  'Spy iklan kompetitor di Meta Ads Library (Facebook + Instagram): creative gallery, ad copy, format & platform mix, longevity, dan influencer partnerships.',
  'App',
  'Pro',
  150,
  'https://images.unsplash.com/photo-1633675254053-d96c7668c3b8?w=400&h=200&fit=crop&auto=format',
  4,
  true,
  'Analisis strategi iklan kompetitor di Meta: kreatif, copy, format, longevity, dan partnership.',
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
  'meta-ads-spy',
  'Meta Ads Spy',
  'Competitive ad intelligence untuk Facebook & Instagram: swipe creative, ad copy, format mix, dan influencer partnerships.',
  'Marketing',
  'Pro',
  'https://images.unsplash.com/photo-1633675254053-d96c7668c3b8?w=400&h=200&fit=crop&auto=format',
  4,
  true,
  'Bantu analisis iklan kompetitor Meta: pola kreatif, copy, CTA, format, dan peluang.',
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
