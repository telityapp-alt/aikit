/**
 * push-migration.mjs
 * Pushes 0010_marketing_core_entities.sql to Supabase via Management API
 * Run: node scripts/push-migration.mjs
 */

const PAT = process.env.SUPABASE_PAT || "";
const PROJECT_REF = "lftgaziycyvxqtlwvxgi";

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

const statements = [
  // ─── 1. updated_at trigger function ───────────────────────────────────────────
  `create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$`,

  // ─── 2. contacts ──────────────────────────────────────────────────────────────
  `create table if not exists public.contacts (
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
  platform_account_id text,
  tags                text[]      not null default '{}'::text[],
  notes               text,
  status              text        not null default 'active'
                                  check (status in ('active','inactive','archived')),
  metadata            jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
)`,

  `create index if not exists contacts_user_created_idx on public.contacts(user_id, created_at desc)`,
  `create index if not exists contacts_user_type_idx    on public.contacts(user_id, type)`,
  `create index if not exists contacts_user_status_idx  on public.contacts(user_id, status)`,
  `alter table public.contacts enable row level security`,
  `drop policy if exists "contacts_own" on public.contacts`,
  `create policy "contacts_own" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`,
  `drop trigger if exists set_updated_at_contacts on public.contacts`,
  `create trigger set_updated_at_contacts
  before update on public.contacts
  for each row execute function public.set_updated_at()`,

  // ─── 3. campaigns ─────────────────────────────────────────────────────────────
  `create table if not exists public.campaigns (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  description text,
  type        text        not null default 'awareness'
                          check (type in ('awareness','conversion','retention','ugc','influencer','product_launch')),
  status      text        not null default 'draft'
                          check (status in ('draft','active','paused','completed','archived')),
  start_date  date,
  end_date    date,
  budget      numeric(12,2),
  spent       numeric(12,2) not null default 0,
  goals       jsonb       not null default '{}'::jsonb,
  metrics     jsonb       not null default '{}'::jsonb,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)`,

  `create index if not exists campaigns_user_created_idx on public.campaigns(user_id, created_at desc)`,
  `create index if not exists campaigns_user_status_idx  on public.campaigns(user_id, status)`,
  `alter table public.campaigns enable row level security`,
  `drop policy if exists "campaigns_own" on public.campaigns`,
  `create policy "campaigns_own" on public.campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`,
  `drop trigger if exists set_updated_at_campaigns on public.campaigns`,
  `create trigger set_updated_at_campaigns
  before update on public.campaigns
  for each row execute function public.set_updated_at()`,

  // ─── 4. campaign_contacts ─────────────────────────────────────────────────────
  `create table if not exists public.campaign_contacts (
  id          uuid        primary key default gen_random_uuid(),
  campaign_id uuid        not null references public.campaigns(id) on delete cascade,
  contact_id  uuid        not null references public.contacts(id)  on delete cascade,
  role        text        not null default 'target'
                          check (role in ('target','influencer','competitor','partner')),
  added_at    timestamptz not null default now(),
  notes       text,
  unique(campaign_id, contact_id)
)`,

  `create index if not exists campaign_contacts_campaign_idx on public.campaign_contacts(campaign_id)`,
  `create index if not exists campaign_contacts_contact_idx  on public.campaign_contacts(contact_id)`,
  `alter table public.campaign_contacts enable row level security`,
  `drop policy if exists "campaign_contacts_own" on public.campaign_contacts`,
  `create policy "campaign_contacts_own" on public.campaign_contacts
  for all using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.user_id = auth.uid()
    )
  )`,

  // ─── 5. content_posts ─────────────────────────────────────────────────────────
  `create table if not exists public.content_posts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  campaign_id  uuid        references public.campaigns(id) on delete set null,
  title        text        not null,
  body         text,
  platform     text        not null default 'instagram'
                           check (platform in ('instagram','tiktok','youtube','twitter','linkedin','facebook','threads','other')),
  format       text        not null default 'post'
                           check (format in ('post','reel','story','short','thread','article','ad')),
  status       text        not null default 'idea'
                           check (status in ('idea','draft','review','scheduled','published','archived')),
  scheduled_at timestamptz,
  published_at timestamptz,
  media_urls   text[]      not null default '{}'::text[],
  tags         text[]      not null default '{}'::text[],
  metrics      jsonb       not null default '{}'::jsonb,
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
)`,

  `create index if not exists content_posts_user_created_idx   on public.content_posts(user_id, created_at desc)`,
  `create index if not exists content_posts_user_status_idx    on public.content_posts(user_id, status)`,
  `create index if not exists content_posts_user_platform_idx  on public.content_posts(user_id, platform)`,
  `create index if not exists content_posts_scheduled_idx      on public.content_posts(user_id, scheduled_at)`,
  `alter table public.content_posts enable row level security`,
  `drop policy if exists "content_posts_own" on public.content_posts`,
  `create policy "content_posts_own" on public.content_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`,
  `drop trigger if exists set_updated_at_content_posts on public.content_posts`,
  `create trigger set_updated_at_content_posts
  before update on public.content_posts
  for each row execute function public.set_updated_at()`,

  // ─── 6. modules seed (only columns that exist) ────────────────────────────────
  `insert into public.modules (slug, title, description, category, pricing, image, sort_order, is_active)
values
  (
    'contact-manager',
    'Contact Manager',
    'Kelola leads, customers, influencer, dan semua kontak bisnis kamu dalam satu tempat.',
    'Marketing',
    'Free',
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=200&fit=crop&auto=format',
    10,
    true
  ),
  (
    'campaign-manager',
    'Campaign Manager',
    'Buat, kelola, dan pantau performa campaign marketing kamu dari awareness sampai konversi.',
    'Marketing',
    'Free',
    'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&h=200&fit=crop&auto=format',
    11,
    true
  ),
  (
    'content-calendar',
    'Content Calendar',
    'Rencanakan, jadwalkan, dan pantau konten dari semua platform dalam satu kalender visual.',
    'Marketing',
    'Free',
    'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=400&h=200&fit=crop&auto=format',
    12,
    true
  )
on conflict (slug) do update set
  title       = excluded.title,
  description = excluded.description,
  category    = excluded.category,
  pricing     = excluded.pricing,
  image       = excluded.image,
  sort_order  = excluded.sort_order,
  is_active   = excluded.is_active`,
];

async function main() {
  console.log(`Pushing ${statements.length} statements to Supabase...\n`);
  let ok = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.trim().split("\n")[0].slice(0, 60);
    try {
      await query(stmt);
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}`);
      ok++;
    } catch (err) {
      // ignore "already exists" errors for idempotency
      if (
        err.message.includes("already exists") ||
        err.message.includes("42710") ||
        err.message.includes("42P07")
      ) {
        console.log(
          `⚠️  [${i + 1}/${statements.length}] already exists — skipped: ${preview}`,
        );
        ok++;
      } else {
        console.error(`❌ [${i + 1}/${statements.length}] FAILED: ${preview}`);
        console.error(`   ${err.message.slice(0, 200)}`);
      }
    }
  }
  console.log(`\n${ok}/${statements.length} statements succeeded.`);
}

main().catch(console.error);
