create table if not exists public.google_maps_lead_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  query_label text not null,
  location text,
  language text not null default 'en',
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

create index if not exists google_maps_lead_reports_user_created_idx
  on public.google_maps_lead_reports(user_id, created_at desc);

create table if not exists public.google_maps_lead_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.google_maps_lead_reports(id) on delete cascade,
  rank_position integer,
  place_id text not null,
  cid text,
  title text,
  category text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  primary_phone text,
  primary_email text,
  website text,
  google_maps_url text,
  web_host text,
  current_status text,
  price_range text,
  rating numeric(10,2) not null default 0,
  review_count integer not null default 0,
  latitude numeric(12,8),
  longitude numeric(12,8),
  lead_score numeric(10,2) not null default 0,
  google_ads_active boolean not null default false,
  meta_ads_active boolean not null default false,
  socials jsonb not null default '{}'::jsonb,
  ai_enrichment jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists google_maps_lead_items_report_rank_idx
  on public.google_maps_lead_report_items(report_id, rank_position asc);

create index if not exists google_maps_lead_items_report_place_idx
  on public.google_maps_lead_report_items(report_id, place_id);

create table if not exists public.google_maps_lead_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.google_maps_lead_reports(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  stage text not null,
  status text not null default 'running',
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists google_maps_lead_events_report_idx
  on public.google_maps_lead_events(report_id, created_at asc);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'google_maps_lead_reports_artifact_fk'
  ) then
    alter table public.google_maps_lead_reports
      add constraint google_maps_lead_reports_artifact_fk
      foreign key (artifact_id) references public.generated_artifacts(id) on delete set null;
  end if;
end $$;

alter table public.google_maps_lead_reports enable row level security;
alter table public.google_maps_lead_report_items enable row level security;
alter table public.google_maps_lead_events enable row level security;

drop policy if exists "google_maps_lead_reports_own" on public.google_maps_lead_reports;
create policy "google_maps_lead_reports_own" on public.google_maps_lead_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "google_maps_lead_items_own" on public.google_maps_lead_report_items;
create policy "google_maps_lead_items_own" on public.google_maps_lead_report_items
  for select using (
    exists (
      select 1 from public.google_maps_lead_reports reports
      where reports.id = google_maps_lead_report_items.report_id
        and reports.user_id = auth.uid()
    )
  );

drop policy if exists "google_maps_lead_events_own" on public.google_maps_lead_events;
create policy "google_maps_lead_events_own" on public.google_maps_lead_events
  for select using (
    exists (
      select 1 from public.google_maps_lead_reports reports
      where reports.id = google_maps_lead_events.report_id
        and reports.user_id = auth.uid()
    )
  );

insert into public.automations (
  slug, title, description, type, pricing, cost_per_run, image, sort_order, is_active, system_prompt, model
)
values (
  'google-maps-leads-scraper',
  'Google Maps Leads Scraper',
  'Scrape business leads dari Google Maps lengkap dengan email, phone, socials, jam buka, tech stack, dan peta lead yang siap dipakai tim sales.',
  'App',
  'Pay per run',
  180,
  'https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=400&h=200&fit=crop&auto=format',
  50,
  true,
  'Bantu tim growth dan sales menghasilkan lead Google Maps yang rapi, actionable, dan siap dioperasionalkan.',
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
  'google-maps-leads-scraper',
  'Google Maps Leads Scraper',
  'Workspace lead intelligence untuk Google Maps: scrape, filter, peta territory, dan simpan lead prioritas.',
  'Marketing',
  'Pay per run',
  'https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=400&h=200&fit=crop&auto=format',
  50,
  true,
  'Bantu analisis lead lokal dari Google Maps: kualitas lead, coverage kontak, tech stack, dan prioritas follow-up.',
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
