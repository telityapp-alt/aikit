-- aikit — 100x Scale Migration (AI Prompts & Cost Management)
-- Run in Supabase SQL Editor. Idempotent where practical.

-- 1. Add AI Prompt and Cost columns to modules
alter table public.modules
add column if not exists system_prompt text,
add column if not exists model text default 'claude-sonnet-4-6',
add column if not exists cost_per_chat_msg integer not null default 1;

-- 2. Add AI Prompt to automations (cost_per_run already exists)
alter table public.automations
add column if not exists system_prompt text,
add column if not exists model text default 'claude-sonnet-4-6';

-- 3. Seed some default prompts for the initial modules (optional)
update public.modules
set system_prompt = 'Kamu adalah asisten pengelola Keuangan Pribadi. Jawab dengan ringkas dan profesional.'
where slug = 'keuangan-pribadi' and system_prompt is null;

update public.modules
set system_prompt = 'Kamu adalah analis SEO dan kompetitor bisnis yang kritis dan berbasis data.'
where slug = 'competitor-analyzer' and system_prompt is null;

update public.automations
set system_prompt = 'Ubah teks CV berikut menjadi format poin-poin yang ATS-friendly.'
where slug = 'ats-cv' and system_prompt is null;
