-- aikit - marketing operations foundation
-- Adds:
-- 1. activity timeline backbone
-- 2. campaign links for intelligence report tables
-- 3. stronger content workflow metadata
-- 4. stronger contact follow-up metadata

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null
    check (entity_type in ('contact', 'campaign', 'content_post')),
  entity_id uuid not null,
  activity_type text not null
    check (activity_type in ('note', 'call', 'email', 'meeting', 'task', 'status_change', 'system')),
  title text not null,
  body text,
  happened_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activities_user_entity_happened_idx
  on public.activities(user_id, entity_type, entity_id, happened_at desc);

create index if not exists activities_user_created_idx
  on public.activities(user_id, created_at desc);

alter table public.activities enable row level security;

drop policy if exists "activities_own" on public.activities;
create policy "activities_own" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at_activities on public.activities;
create trigger set_updated_at_activities
  before update on public.activities
  for each row execute function public.set_updated_at();

alter table public.contacts
  add column if not exists last_interaction_at timestamptz,
  add column if not exists next_follow_up_at timestamptz;

create index if not exists contacts_user_follow_up_idx
  on public.contacts(user_id, next_follow_up_at)
  where next_follow_up_at is not null;

alter table public.content_posts
  add column if not exists content_type text not null default 'post'
    check (content_type in ('post', 'reel', 'story', 'carousel', 'video', 'ad', 'other')),
  add column if not exists approval_status text not null default 'not_needed'
    check (approval_status in ('not_needed', 'pending', 'approved', 'changes_requested')),
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high'));

create index if not exists content_posts_user_approval_idx
  on public.content_posts(user_id, approval_status);

create index if not exists content_posts_user_platform_idx
  on public.content_posts(user_id, platform);

alter table public.instagram_competitor_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists instagram_competitor_reports_campaign_idx
  on public.instagram_competitor_reports(campaign_id)
  where campaign_id is not null;

alter table public.tiktok_profile_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists tiktok_profile_reports_campaign_idx
  on public.tiktok_profile_reports(campaign_id)
  where campaign_id is not null;

alter table public.instagram_profile_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists instagram_profile_reports_campaign_idx
  on public.instagram_profile_reports(campaign_id)
  where campaign_id is not null;

alter table public.tiktok_ads_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists tiktok_ads_reports_campaign_idx
  on public.tiktok_ads_reports(campaign_id)
  where campaign_id is not null;

alter table public.meta_ads_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists meta_ads_reports_campaign_idx
  on public.meta_ads_reports(campaign_id)
  where campaign_id is not null;
