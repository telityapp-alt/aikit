-- aikit — foundational schema, RLS, triggers, seed
-- Run in Supabase SQL Editor (or `supabase db push`). Idempotent where practical.

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- profiles  (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  workspace_name  text default 'Workspace',
  avatar_initials text,
  credits_balance integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create a profile when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_name text;
begin
  base_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  insert into public.profiles (id, full_name, avatar_initials)
  values (
    new.id,
    base_name,
    upper(left(regexp_replace(base_name, '[^a-zA-Z]', '', 'g') || 'A', 2))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- automations  (catalog — one card = one job)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.automations (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  description  text,
  type         text default 'Automation',
  pricing      text default 'Free',
  cost_per_run integer not null default 0,
  image        text,
  is_active    boolean not null default true,
  sort_order   integer default 0,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- modules  (catalog — full mini-apps)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  description text,
  category    text,
  pricing     text default 'Free',
  image       text,
  is_active   boolean not null default true,
  sort_order  integer default 0,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- runs  (automation executions — powers activity + usage stats)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  automation_id uuid references public.automations(id) on delete set null,
  automation_slug text,
  title         text,
  status        text not null default 'queued'
                check (status in ('queued','running','completed','failed')),
  input         jsonb default '{}'::jsonb,
  output        jsonb,
  error         text,
  credits_spent integer not null default 0,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists runs_user_created_idx on public.runs(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- module_instances  (per-user persisted state of a mini-app)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.module_instances (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  module_id  uuid references public.modules(id) on delete cascade,
  module_slug text not null,
  state      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module_slug)
);

-- ─────────────────────────────────────────────────────────────
-- chats + messages  (AI Agent)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.chats (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Obrolan Baru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chats_user_updated_idx on public.chats(user_id, updated_at desc);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user','ai','system')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_chat_idx on public.messages(chat_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- transactions  (credit top-up / spend ledger — gateway stubbed)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('topup','spend','adjustment')),
  amount      integer not null,            -- credits (+topup / -spend)
  status      text not null default 'pending'
              check (status in ('pending','completed','failed')),
  provider    text,                        -- 'xendit' | 'midtrans' | 'system'
  reference   text,                        -- external invoice id
  invoice_url text,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.automations       enable row level security;
alter table public.modules           enable row level security;
alter table public.runs              enable row level security;
alter table public.module_instances  enable row level security;
alter table public.chats             enable row level security;
alter table public.messages          enable row level security;
alter table public.transactions      enable row level security;

-- profiles: owner can read/update own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- catalogs: readable by any authenticated user
drop policy if exists "automations_read" on public.automations;
create policy "automations_read" on public.automations
  for select using (auth.role() = 'authenticated');
drop policy if exists "modules_read" on public.modules;
create policy "modules_read" on public.modules
  for select using (auth.role() = 'authenticated');

-- helper: user-owned CRUD policy generator pattern (applied per table)
drop policy if exists "runs_own" on public.runs;
create policy "runs_own" on public.runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "module_instances_own" on public.module_instances;
create policy "module_instances_own" on public.module_instances
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chats_own" on public.chats;
create policy "chats_own" on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages_own" on public.messages;
create policy "messages_own" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
-- inserts/updates to transactions & credits_balance go through the service role
-- (Pages Functions), which bypasses RLS — so no write policy for clients here.

-- ─────────────────────────────────────────────────────────────
-- RPC: spend credits atomically (called by service role)
-- ─────────────────────────────────────────────────────────────
create or replace function public.spend_credits(p_user uuid, p_amount integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
    set credits_balance = credits_balance - p_amount,
        updated_at = now()
  where id = p_user and credits_balance >= p_amount
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  return new_balance;
end;
$$;
