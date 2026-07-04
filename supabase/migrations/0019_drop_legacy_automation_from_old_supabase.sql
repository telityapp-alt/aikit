-- Drops only legacy automation/reporting tables from the OLD app Supabase.
-- Intentionally preserves:
-- - auth.users
-- - profiles
-- - modules / module_instances
-- - chats / messages / AI agents
-- - contacts / campaigns / content_posts / activities
-- - transactions / credits / audit foundation

begin;

drop table if exists public.google_maps_lead_events cascade;
drop table if exists public.google_maps_lead_report_items cascade;
drop table if exists public.google_maps_lead_reports cascade;

drop table if exists public.tokopedia_search_events cascade;
drop table if exists public.tokopedia_search_report_items cascade;
drop table if exists public.tokopedia_search_reports cascade;

drop table if exists public.meta_ads_events cascade;
drop table if exists public.meta_ads_report_items cascade;
drop table if exists public.meta_ads_reports cascade;

drop table if exists public.tiktok_ads_events cascade;
drop table if exists public.tiktok_ads_report_items cascade;
drop table if exists public.tiktok_ads_reports cascade;

drop table if exists public.instagram_pi_events cascade;
drop table if exists public.instagram_profile_report_items cascade;
drop table if exists public.instagram_profile_reports cascade;

drop table if exists public.tiktok_report_events cascade;
drop table if exists public.tiktok_profile_report_items cascade;
drop table if exists public.tiktok_profile_reports cascade;

drop table if exists public.instagram_report_events cascade;
drop table if exists public.instagram_competitor_report_items cascade;
drop table if exists public.instagram_competitor_reports cascade;

drop table if exists public.platform_content_comments cascade;
drop table if exists public.platform_content_items cascade;
drop table if exists public.platform_accounts cascade;

drop table if exists public.generated_artifacts cascade;
drop table if exists public.runs cascade;

drop table if exists public.automations cascade;

delete from public.modules
where slug in (
  'competitor-analyzer',
  'tiktok-profile-intelligence',
  'instagram-profile-intelligence',
  'tiktok-ads-spy',
  'meta-ads-spy',
  'google-maps-leads-scraper',
  'tokopedia-search-scraper'
);

commit;
