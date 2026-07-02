/**
 * push-migration-0011.mjs
 * Pushes 0011_marketing_operations_foundation.sql statements
 * that are safe (skips ALTER TABLE on non-existent report tables)
 */

const PAT = process.env.SUPABASE_PAT || 'REMOVED_SECRET';
const PROJECT_REF = 'lftgaziycyvxqtlwvxgi';

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

// First check which report tables exist
async function getExistingTables() {
  const rows = await query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  return rows.map(r => r.table_name);
}

const coreStatements = [
  // 1. activities table
  `create table if not exists public.activities (
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
)`,

  `create index if not exists activities_user_entity_happened_idx
  on public.activities(user_id, entity_type, entity_id, happened_at desc)`,

  `create index if not exists activities_user_created_idx
  on public.activities(user_id, created_at desc)`,

  `alter table public.activities enable row level security`,

  `drop policy if exists "activities_own" on public.activities`,

  `create policy "activities_own" on public.activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`,

  `drop trigger if exists set_updated_at_activities on public.activities`,

  `create trigger set_updated_at_activities
  before update on public.activities
  for each row execute function public.set_updated_at()`,

  // 2. contacts extra columns
  `alter table public.contacts
  add column if not exists last_interaction_at timestamptz,
  add column if not exists next_follow_up_at timestamptz`,

  `create index if not exists contacts_user_follow_up_idx
  on public.contacts(user_id, next_follow_up_at)
  where next_follow_up_at is not null`,

  // 3. content_posts extra columns
  `alter table public.content_posts
  add column if not exists content_type text not null default 'post'
    check (content_type in ('post', 'reel', 'story', 'carousel', 'video', 'ad', 'other')),
  add column if not exists approval_status text not null default 'not_needed'
    check (approval_status in ('not_needed', 'pending', 'approved', 'changes_requested')),
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high'))`,

  `create index if not exists content_posts_user_approval_idx
  on public.content_posts(user_id, approval_status)`,

  `create index if not exists content_posts_user_platform_idx
  on public.content_posts(user_id, platform)`,
];

// Report table alterations — only run if table exists
const reportAlterations = [
  {
    table: 'instagram_competitor_reports',
    stmts: [
      `alter table public.instagram_competitor_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null`,
      `create index if not exists instagram_competitor_reports_campaign_idx
  on public.instagram_competitor_reports(campaign_id)
  where campaign_id is not null`,
    ]
  },
  {
    table: 'tiktok_profile_reports',
    stmts: [
      `alter table public.tiktok_profile_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null`,
      `create index if not exists tiktok_profile_reports_campaign_idx
  on public.tiktok_profile_reports(campaign_id)
  where campaign_id is not null`,
    ]
  },
  {
    table: 'instagram_profile_reports',
    stmts: [
      `alter table public.instagram_profile_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null`,
      `create index if not exists instagram_profile_reports_campaign_idx
  on public.instagram_profile_reports(campaign_id)
  where campaign_id is not null`,
    ]
  },
  {
    table: 'tiktok_ads_reports',
    stmts: [
      `alter table public.tiktok_ads_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null`,
      `create index if not exists tiktok_ads_reports_campaign_idx
  on public.tiktok_ads_reports(campaign_id)
  where campaign_id is not null`,
    ]
  },
  {
    table: 'meta_ads_reports',
    stmts: [
      `alter table public.meta_ads_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null`,
      `create index if not exists meta_ads_reports_campaign_idx
  on public.meta_ads_reports(campaign_id)
  where campaign_id is not null`,
    ]
  },
];

async function runStatements(statements) {
  let ok = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.trim().split('\n')[0].slice(0, 70);
    try {
      await query(stmt);
      console.log(`✅ ${preview}`);
      ok++;
    } catch (err) {
      if (
        err.message.includes('already exists') ||
        err.message.includes('42710') ||
        err.message.includes('42P07') ||
        err.message.includes('42701') // column already exists
      ) {
        console.log(`⚠️  already exists — skipped: ${preview}`);
        ok++;
      } else {
        console.error(`❌ FAILED: ${preview}`);
        console.error(`   ${err.message.slice(0, 300)}`);
      }
    }
  }
  return ok;
}

async function main() {
  console.log('Checking existing tables...');
  const existing = await getExistingTables();
  console.log('Tables in DB:', existing.join(', '), '\n');

  console.log(`Running ${coreStatements.length} core statements...\n`);
  const coreOk = await runStatements(coreStatements);

  // Report table alterations — only if table exists
  let reportStmts = [];
  let skippedTables = [];
  for (const { table, stmts } of reportAlterations) {
    if (existing.includes(table)) {
      reportStmts.push(...stmts);
    } else {
      skippedTables.push(table);
    }
  }

  if (skippedTables.length > 0) {
    console.log(`\nSkipping ALTER for non-existent tables: ${skippedTables.join(', ')}`);
  }

  if (reportStmts.length > 0) {
    console.log(`\nRunning ${reportStmts.length} report table statements...\n`);
    await runStatements(reportStmts);
  }

  console.log(`\n✅ Done! Core: ${coreOk}/${coreStatements.length} succeeded.`);
}

main().catch(console.error);
