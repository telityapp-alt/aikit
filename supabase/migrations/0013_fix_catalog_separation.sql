-- aikit — fix catalog separation: automations vs modules are distinct products
-- Automations = per-run API scrapers (App type, opens a tool page)
-- Modules     = built-in apps (always type App, open a mini-app in dashboard)

-- ── 1. Clean dummy automations (seed data that was never real) ──────────────
delete from public.automations
where slug in (
  'ats-cv',
  'invoice-gen',
  'email-blast',
  'social-caption',
  'pdf-summarizer',
  'data-cleaner'
);

-- ── 2. Upsert the 5 real automations ──────────────────────────────────────
insert into public.automations (slug, title, description, type, pricing, cost_per_run, image, sort_order, is_active)
values
  ('competitor-analyzer',
   'Generator Laporan Kompetitor Instagram',
   'Ambil data Posts atau Reels kompetitor, analisis top content dan komentar, lalu download report Excel yang siap dipakai tim.',
   'App', 'Pay per run', 0,
   '/automation-covers/competitor-analyzer.webp', 10, true),

  ('tiktok-profile-intelligence',
   'TikTok Profile Intelligence',
   'Tarik video TikTok, hitung KPI virality dan intent, lalu baca dashboard insight yang siap dipakai tim growth.',
   'App', 'Pay per run', 125,
   '/automation-covers/tiktok-profile-intelligence.webp', 20, true),

  ('instagram-profile-intelligence',
   'Instagram Profile Intelligence',
   'Tarik data profil Instagram, hitung KPI engagement & format, lalu baca dashboard insight siap pakai tim growth.',
   'App', 'Pay per run', 125,
   '/automation-covers/instagram-profile-intelligence.webp', 30, true),

  ('tiktok-ads-spy',
   'TikTok Ads Spy',
   'Spy iklan kompetitor di TikTok Ads Library — creative gallery, share-of-voice, targeting & region intelligence.',
   'App', 'Pay per run', 150,
   '/automation-covers/tiktok-ads-spy.webp', 40, true),

  ('meta-ads-spy',
   'Meta Ads Spy',
   'Spy iklan kompetitor di Meta Ads Library (Facebook + Instagram) — creative gallery, ad copy, format & platform mix, longevity & influencer partnerships.',
   'App', 'Pay per run', 150,
   '/automation-covers/meta-ads-spy.webp', 50, true)

on conflict (slug) do update set
  title        = excluded.title,
  description  = excluded.description,
  type         = excluded.type,
  pricing      = excluded.pricing,
  cost_per_run = excluded.cost_per_run,
  image        = excluded.image,
  sort_order   = excluded.sort_order,
  is_active    = excluded.is_active;

-- ── 3. Remove automasi tools that were wrongly in the modules table ─────────
delete from public.modules
where slug in (
  'competitor-analyzer',
  'tiktok-profile-intelligence',
  'instagram-profile-intelligence',
  'tiktok-ads-spy',
  'meta-ads-spy'
);

-- ── 4. Upsert the 4 real modules (built-in apps) ───────────────────────────
insert into public.modules (slug, title, description, category, pricing, image, sort_order, is_active)
values
  ('keuangan-pribadi',
   'Manajer Keuangan Pribadi',
   'Lacak pengeluaran, buat anggaran, dan analisis pola keuangan bulanan kamu secara otomatis.',
   'Keuangan', 'Free', '/module-covers/keuangan-pribadi.png', 10, true),

  ('contact-manager',
   'Contact Manager',
   'Kelola kontak bisnis — customers, leads, creator, vendor, dan kompetitor dalam satu database terpusat.',
   'Marketing', 'Free', '/module-covers/contact-manager.png', 20, true),

  ('campaign-manager',
   'Campaign Manager',
   'Rencanakan dan kelola campaign marketing end-to-end: objective, budget, timeline, dan kontak terlibat.',
   'Marketing', 'Free', '/module-covers/campaign-manager.png', 30, true),

  ('content-calendar',
   'Content Calendar',
   'Rencanakan, jadwalkan, dan pantau konten dari semua platform dalam satu kalender visual.',
   'Marketing', 'Free', '/module-covers/content-calendar.png', 40, true)

on conflict (slug) do update set
  title       = excluded.title,
  description = excluded.description,
  category    = excluded.category,
  pricing     = excluded.pricing,
  image       = excluded.image,
  sort_order  = excluded.sort_order,
  is_active   = excluded.is_active;
