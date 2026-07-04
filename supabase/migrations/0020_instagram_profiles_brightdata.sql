-- Fresh-start automation catalog update:
-- 1. remove Google Maps Bright Data placeholder
-- 2. add production-ready Instagram Profiles by URL automation

delete from public.automations
where slug = 'google-maps-leads-brightdata';

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
  metadata
)
values (
  'instagram-profiles-brightdata',
  'Instagram Profiles by URL',
  'Scrape profile intelligence Instagram dari daftar URL menggunakan Bright Data, dengan output JSON terstruktur yang siap dianalisis atau diunduh.',
  'App',
  'Pay per run',
  0,
  'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400&h=200&fit=crop&auto=format',
  10,
  true,
  jsonb_build_object(
    'provider', 'brightdata',
    'input_mode', 'collect_by_url',
    'dataset_env', 'BRIGHTDATA_INSTAGRAM_PROFILES_DATASET_ID',
    'default_dataset_id', 'gd_l1vikfch901nx3by4'
  )
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
  metadata = excluded.metadata,
  updated_at = now();
