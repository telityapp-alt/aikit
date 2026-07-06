-- aikit - CRM control plane persistence phase 6/7/8
-- Adds profile-backed CRM settings for SLA, assignment, enrichment, and automation toggles.

alter table public.profiles
  add column if not exists crm_settings jsonb not null default '{}'::jsonb;
