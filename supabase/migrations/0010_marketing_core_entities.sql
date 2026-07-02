-- aikit — Marketing Core: contacts, campaigns, campaign_contacts, content_posts

-- ─────────────────────────────────────────────────────────────
-- 1. updated_at trigger function (shared, reusable)
-- ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. contacts
-- ─────────────────────────────────────────────────────────────

create table if not exists public.contacts (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  type                text        not null default 'lead'
                                  check (type in ('lead','customer','vendor','creator','competitor')),
  name                text        not null,
  email               text,
  phone               text,
  company             text,
  avatar_url          text,
  social_handles      jsonb       not null default '{}'::jsonb,
  platform_account_id text,                                    -- slug/id dari platform account (no FK, platform_accounts belum ada)
  tags                text[]      not null default '{}'::text[],
  notes               text,
  status              text        not null default 'active'
                                  check (status in ('active','inactive','archived')),
  metadata            jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists contacts_user_created_idx on public.contacts(user_id, created_at desc);
create index if not exists contacts_user_type_idx    on public.contacts(user_id, type);
create index if not exists contacts_user_status_idx  on public.contacts(user_id, status);

alter table public.contacts enable row level security;

drop policy if exists "contacts_own" on public.contacts;
create policy "contacts_own" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at_contacts on public.contacts;
create trigger set_updated_at_contacts
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. campaigns
-- ─────────────────────────────────────────────────────────────

create table if not exists public.campaigns (
  id         uuid           primary key default gen_random_uuid(),
  user_id    uuid           not null references auth.users(id) on delete cascade,
  name       text           not null,
  objective  text,
  status     text           not null default 'draft'
                            check (status in ('draft','active','paused','completed','archived')),
  start_date date,
  end_date   date,
  budget     numeric(15,2),
  currency   text           not null default 'IDR',
  notes      text,
  metadata   jsonb          not null default '{}'::jsonb,
  created_at timestamptz    not null default now(),
  updated_at timestamptz    not null default now()
);

create index if not exists campaigns_user_created_idx on public.campaigns(user_id, created_at desc);
create index if not exists campaigns_user_status_idx  on public.campaigns(user_id, status);

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_own" on public.campaigns;
create policy "campaigns_own" on public.campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at_campaigns on public.campaigns;
create trigger set_updated_at_campaigns
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. campaign_contacts  (M:M junction)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.campaign_contacts (
  id          uuid        primary key default gen_random_uuid(),
  campaign_id uuid        not null references public.campaigns(id) on delete cascade,
  contact_id  uuid        not null references public.contacts(id)  on delete cascade,
  role        text        not null default 'target'
                          check (role in ('target','influencer','competitor','partner')),
  added_at    timestamptz not null default now(),
  unique (campaign_id, contact_id)
);

create index if not exists campaign_contacts_campaign_idx on public.campaign_contacts(campaign_id);
create index if not exists campaign_contacts_contact_idx  on public.campaign_contacts(contact_id);

alter table public.campaign_contacts enable row level security;

drop policy if exists "campaign_contacts_own" on public.campaign_contacts;
create policy "campaign_contacts_own" on public.campaign_contacts
  for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. content_posts
-- ─────────────────────────────────────────────────────────────

create table if not exists public.content_posts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  campaign_id  uuid        references public.campaigns(id) on delete set null,
  platform     text,
  status       text        not null default 'idea'
                           check (status in ('idea','draft','scheduled','published','cancelled')),
  title        text,
  body         text,
  media_urls   text[]      not null default '{}'::text[],
  scheduled_at timestamptz,
  published_at timestamptz,
  tags         text[]      not null default '{}'::text[],
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists content_posts_user_created_idx on public.content_posts(user_id, created_at desc);
create index if not exists content_posts_user_status_idx  on public.content_posts(user_id, status);
create index if not exists content_posts_campaign_idx     on public.content_posts(campaign_id)
  where campaign_id is not null;
create index if not exists content_posts_scheduled_idx    on public.content_posts(user_id, scheduled_at)
  where scheduled_at is not null;

alter table public.content_posts enable row level security;

drop policy if exists "content_posts_own" on public.content_posts;
create policy "content_posts_own" on public.content_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at_content_posts on public.content_posts;
create trigger set_updated_at_content_posts
  before update on public.content_posts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 6. modules catalog seed
-- ─────────────────────────────────────────────────────────────

insert into public.modules (
  slug, title, description, category, pricing, image, sort_order, is_active, system_prompt, model, cost_per_chat_msg
)
values
  (
    'contact-manager',
    'Contact Manager',
    'Kelola kontak bisnis — customers, leads, creator, vendor, dan kompetitor dalam satu database terpusat.',
    'Marketing',
    'Free',
    '/module-covers/contact-manager.png',
    10,
    true,
    'Kamu adalah asisten CRM yang membantu menganalisis dan mengelola kontak bisnis.',
    'claude-sonnet-4-5',
    1
  ),
  (
    'campaign-manager',
    'Campaign Manager',
    'Rencanakan dan kelola campaign marketing end-to-end: objective, budget, timeline, dan kontak terlibat.',
    'Marketing',
    'Free',
    '/module-covers/campaign-manager.png',
    11,
    true,
    'Kamu adalah strategi campaign marketing yang membantu merencanakan dan menganalisis campaign.',
    'claude-sonnet-4-5',
    1
  ),
  (
    'content-calendar',
    'Content Calendar',
    'Rencanakan, jadwalkan, dan pantau konten dari semua platform dalam satu kalender visual.',
    'Marketing',
    'Free',
    '/module-covers/content-calendar.png',
    12,
    true,
    'Kamu adalah content strategist yang membantu merencanakan dan mengoptimalkan kalender konten.',
    'claude-sonnet-4-5',
    1
  )
on conflict (slug) do update set
  title             = excluded.title,
  description       = excluded.description,
  category          = excluded.category,
  pricing           = excluded.pricing,
  image             = excluded.image,
  sort_order        = excluded.sort_order,
  is_active         = excluded.is_active,
  system_prompt     = excluded.system_prompt,
  model             = excluded.model,
  cost_per_chat_msg = excluded.cost_per_chat_msg;
