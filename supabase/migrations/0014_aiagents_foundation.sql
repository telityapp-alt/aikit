-- aikit — AIAGENTS foundation
-- Adds agent registry, agent-bound threads, richer messages, turn logs, and artifacts.

create table if not exists public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  mascot_asset text,
  theme jsonb not null default '{}'::jsonb,
  system_prompt text,
  default_model_alias text not null default 'balanced-general',
  starter_prompts jsonb not null default '[]'::jsonb,
  capabilities jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_agent_profiles on public.agent_profiles;
create trigger set_updated_at_agent_profiles
  before update on public.agent_profiles
  for each row execute function public.set_updated_at();

alter table public.agent_profiles enable row level security;

drop policy if exists "agent_profiles_read" on public.agent_profiles;
create policy "agent_profiles_read" on public.agent_profiles
  for select using (auth.role() = 'authenticated');

alter table public.chats
  add column if not exists agent_slug text references public.agent_profiles(slug),
  add column if not exists summary text,
  add column if not exists status text not null default 'active',
  add column if not exists pinned boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists last_message_at timestamptz,
  add column if not exists last_artifact_at timestamptz;

update public.chats
set agent_slug = coalesce(agent_slug, 'spark')
where agent_slug is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chats_status_check'
  ) then
    alter table public.chats
      add constraint chats_status_check
      check (status in ('active', 'archived', 'deleted'));
  end if;
end $$;

create index if not exists chats_user_agent_updated_idx
  on public.chats(user_id, agent_slug, updated_at desc);

drop trigger if exists set_updated_at_chats on public.chats;
create trigger set_updated_at_chats
  before update on public.chats
  for each row execute function public.set_updated_at();

alter table public.messages
  add column if not exists agent_slug text references public.agent_profiles(slug),
  add column if not exists content_json jsonb,
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists latency_ms integer,
  add column if not exists status text not null default 'completed',
  add column if not exists parent_turn_id uuid;

update public.messages m
set agent_slug = c.agent_slug
from public.chats c
where c.id = m.chat_id
  and m.agent_slug is null;

alter table public.messages drop constraint if exists messages_role_check;
alter table public.messages
  add constraint messages_role_check
  check (role in ('user', 'ai', 'assistant', 'system', 'tool', 'event'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_status_check'
  ) then
    alter table public.messages
      add constraint messages_status_check
      check (status in ('pending', 'streaming', 'completed', 'failed'));
  end if;
end $$;

create index if not exists messages_chat_agent_created_idx
  on public.messages(chat_id, agent_slug, created_at);

create table if not exists public.chat_turns (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null references public.agent_profiles(slug),
  user_message_id uuid references public.messages(id) on delete set null,
  assistant_message_id uuid references public.messages(id) on delete set null,
  provider_request_id text,
  gateway_route text,
  model_alias text,
  resolved_provider text,
  resolved_model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  tool_count integer not null default 0,
  cost_credits integer not null default 0,
  duration_ms integer,
  status text not null default 'completed',
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_turns_user_thread_created_idx
  on public.chat_turns(user_id, thread_id, created_at desc);

alter table public.chat_turns enable row level security;

drop policy if exists "chat_turns_own" on public.chat_turns;
create policy "chat_turns_own" on public.chat_turns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.chat_artifacts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chats(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null references public.agent_profiles(slug),
  type text not null,
  title text not null,
  summary text,
  content_json jsonb,
  storage_path text,
  mime_type text,
  source_refs jsonb not null default '[]'::jsonb,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_artifacts_user_thread_updated_idx
  on public.chat_artifacts(user_id, thread_id, updated_at desc);

alter table public.chat_artifacts enable row level security;

drop policy if exists "chat_artifacts_own" on public.chat_artifacts;
create policy "chat_artifacts_own" on public.chat_artifacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at_chat_artifacts on public.chat_artifacts;
create trigger set_updated_at_chat_artifacts
  before update on public.chat_artifacts
  for each row execute function public.set_updated_at();

insert into public.agent_profiles (
  slug,
  name,
  tagline,
  description,
  mascot_asset,
  default_model_alias,
  starter_prompts,
  capabilities,
  sort_order
)
values
  (
    'spark',
    'Spark',
    'General AI assistant untuk founder dan tim inti.',
    'Mitra kerja serbaguna untuk berpikir, menulis, merangkum, dan memecah problem bisnis sehari-hari.',
    '/mascots/flash-chat.webp',
    'balanced-general',
    '["Bantu breakdown prioritas bisnis minggu ini","Ringkas brief ini jadi action plan","Bikin draft email update untuk tim"]'::jsonb,
    '["Brainstorm strategi dan ide cepat","Ringkas dokumen, brief, atau meeting","Tulis draft email, memo, dan presentasi"]'::jsonb,
    1
  ),
  (
    'finance',
    'Finance',
    'Cashflow, budgeting, dan insight keuangan bisnis.',
    'Partner khusus untuk membaca angka, merapikan laporan, dan menerjemahkan data keuangan jadi keputusan.',
    '/mascots/flash-laptop.webp',
    'balanced-general',
    '["Bantu review cashflow bulan ini","Bikin template budgeting operasional","Jelaskan metrik keuangan yang harus dipantau"]'::jsonb,
    '["Analisis cashflow dan burn","Bantu budgeting dan unit economics","Ubah angka jadi laporan manajemen"]'::jsonb,
    2
  ),
  (
    'operations',
    'Operations',
    'SOP, workflow, dan efisiensi tim operasional.',
    'Agent untuk merapikan proses, membuat SOP, dan mengubah pekerjaan manual jadi alur yang bisa diulang.',
    '/mascots/hedgehog-point.webp',
    'balanced-general',
    '["Bantu bikin SOP onboarding karyawan","Pecah workflow order fulfilment","Cari bottleneck operasional dari proses ini"]'::jsonb,
    '["Bikin SOP dan checklist operasional","Pecah workflow jadi langkah yang jelas","Optimasi proses yang bottleneck"]'::jsonb,
    3
  ),
  (
    'ecommerce',
    'Ecommerce',
    'Catalog, merchandising, listing, dan campaign jualan.',
    'Agent spesialis jualan digital untuk copy katalog, promo, bundling, dan optimasi conversion di storefront.',
    '/mascots/flash-wave.webp',
    'balanced-general',
    '["Bantu optimasi deskripsi produk ini","Ide promo bundle untuk katalog saya","Bandingkan positioning 3 SKU utama"]'::jsonb,
    '["Tulis listing dan deskripsi produk","Bantu promo, bundling, dan merchandising","Analisis SKU dan positioning produk"]'::jsonb,
    4
  ),
  (
    'knowledge',
    'Knowledge',
    'Central brain untuk docs, notes, dan institutional memory.',
    'Agent yang fokus menyimpan konteks bisnis, merangkum informasi, dan menjawab dari dokumen internal.',
    '/mascots/hedgehog-peek.webp',
    'long-context',
    '["Bantu bikin knowledge base dari notes ini","Ringkas meeting jadi keputusan penting","Susun FAQ internal dari dokumen ini"]'::jsonb,
    '["Rangkum dokumen dan catatan internal","Jadi pusat Q&A knowledge tim","Bangun memory yang reusable"]'::jsonb,
    5
  ),
  (
    'growth',
    'Growth',
    'Positioning, experiments, campaign planning, dan opportunity scan.',
    'Agent pertumbuhan yang membantu riset pasar, angle campaign, eksperimen channel, dan peluang revenue baru.',
    '/mascots/hedgehog-celebrate.png',
    'deep-reasoning',
    '["Bantu susun eksperimen growth bulan ini","Cari angle positioning baru untuk produk","Bikin plan campaign launch yang lean"]'::jsonb,
    '["Cari angle campaign dan positioning","Bantu design eksperimen growth","Susun prioritas testing yang realistis"]'::jsonb,
    6
  )
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  mascot_asset = excluded.mascot_asset,
  default_model_alias = excluded.default_model_alias,
  starter_prompts = excluded.starter_prompts,
  capabilities = excluded.capabilities,
  sort_order = excluded.sort_order,
  updated_at = now();
