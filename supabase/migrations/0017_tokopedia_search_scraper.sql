create table if not exists public.tokopedia_search_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  start_url text,
  status text not null default 'queued'
    check (status in ('queued','running','completed','failed')),
  filters jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  input_snapshot jsonb not null default '{}'::jsonb,
  artifact_id uuid,
  apify_run_id text,
  apify_dataset_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tokopedia_search_reports_user_created_idx
  on public.tokopedia_search_reports(user_id, created_at desc);

create table if not exists public.tokopedia_search_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.tokopedia_search_reports(id) on delete cascade,
  rank_position integer,
  page integer not null default 1,
  position integer not null default 0,
  product_id text not null,
  title text,
  product_url text,
  image_url text,
  price_display text,
  price_number numeric(14,2) not null default 0,
  original_price text,
  discount_percentage numeric(10,2) not null default 0,
  rating numeric(10,2) not null default 0,
  sold_count text,
  sold_count_number integer not null default 0,
  shop_id text,
  shop_name text,
  shop_url text,
  shop_city text,
  shop_tier text,
  badge_title text,
  badge_url text,
  category_id text,
  category_name text,
  category_breadcrumb text,
  is_ad boolean not null default false,
  is_wishlist boolean not null default false,
  source_url text,
  fetched_at timestamptz,
  ai_enrichment jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tokopedia_search_items_report_rank_idx
  on public.tokopedia_search_report_items(report_id, rank_position asc);

create index if not exists tokopedia_search_items_report_shop_idx
  on public.tokopedia_search_report_items(report_id, shop_name);

create table if not exists public.tokopedia_search_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.tokopedia_search_reports(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  stage text not null,
  status text not null default 'running',
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tokopedia_search_events_report_idx
  on public.tokopedia_search_events(report_id, created_at asc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tokopedia_search_reports_artifact_fk'
  ) then
    alter table public.tokopedia_search_reports
      add constraint tokopedia_search_reports_artifact_fk
      foreign key (artifact_id) references public.generated_artifacts(id) on delete set null;
  end if;
end $$;

alter table public.tokopedia_search_reports enable row level security;
alter table public.tokopedia_search_report_items enable row level security;
alter table public.tokopedia_search_events enable row level security;

drop policy if exists "tokopedia_search_reports_own" on public.tokopedia_search_reports;
create policy "tokopedia_search_reports_own" on public.tokopedia_search_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tokopedia_search_items_own" on public.tokopedia_search_report_items;
create policy "tokopedia_search_items_own" on public.tokopedia_search_report_items
  for select using (
    exists (
      select 1 from public.tokopedia_search_reports reports
      where reports.id = tokopedia_search_report_items.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "tokopedia_search_events_own" on public.tokopedia_search_events;
create policy "tokopedia_search_events_own" on public.tokopedia_search_events
  for select using (
    exists (
      select 1 from public.tokopedia_search_reports reports
      where reports.id = tokopedia_search_events.report_id
        and reports.user_id = auth.uid()
    )
  );

insert into public.automations (
  slug, title, description, type, pricing, cost_per_run, image, sort_order, is_active, system_prompt, model
)
values (
  'tokopedia-search-scraper',
  'Tokopedia Search Scraper',
  'Scrape hasil pencarian Tokopedia untuk market research, price tracking, seller benchmarking, dan dashboard shelf intelligence yang siap dipakai tim commerce.',
  'App',
  'Pay per run',
  140,
  'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400&h=200&fit=crop&auto=format',
  55,
  true,
  'Bantu tim commerce membaca search shelf Tokopedia: price ladder, ad density, seller concentration, dan peluang positioning produk.',
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
  'tokopedia-search-scraper',
  'Tokopedia Search Scraper',
  'Workspace shelf intelligence untuk Tokopedia: scrape hasil search, baca price ladder, seller leaderboard, dan shortlist produk prioritas.',
  'Marketing',
  'Pay per run',
  'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=400&h=200&fit=crop&auto=format',
  55,
  true,
  'Bantu analisis hasil pencarian Tokopedia: ranking, price architecture, ad share, seller concentration, dan peluang optimasi listing.',
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
