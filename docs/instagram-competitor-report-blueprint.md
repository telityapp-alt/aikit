# Instagram Competitor Report Generator Blueprint

## Goal

Bangun automasi production-grade untuk:

- ambil data Instagram kompetitor dari tab `Posts` atau `Reels`
- filter by periode
- hitung engagement dan ranking top 5 content
- tarik komentar untuk post prioritas
- jalankan AI analysis untuk insight konten, audience reaction, dan pattern
- simpan raw data, normalized data, dan AI insight ke database
- generate file Excel siap download
- tampilkan history, report detail, dan benchmark dashboard di aplikasi

## Core Architecture Principle

Instagram scraping logic jangan dibangun sebagai logic milik satu module. Jadikan dia `shared foundation` yang reusable, lalu semua module Instagram tinggal consume foundation yang sama.

Target shape:

- 1 Instagram scrape foundation
- many Instagram intelligence modules on top

Contoh module turunan:

- `Instagram Competitor Analyzer`
- `Instagram Content Analyzer`
- `Instagram Tags Analyzer`
- `Instagram Comment Intelligence`
- `Instagram Trend / Pattern Analyzer`

Rule penting:

- scraping, normalization, pagination, retry, caching, dan raw persistence hidup di parent foundation
- scoring, insight, UI narrative, dan export flavor hidup di module-specific service
- logic yang sama untuk platform lain nanti juga ikuti pattern ini

## Current Repo Assessment

### What already exists

- Frontend React + Vite dengan host dashboard dan module registry
- Supabase schema dasar untuk `automations`, `runs`, `module_instances`, `transactions`, `chats`
- Cloudflare Pages Functions untuk `POST /api/runs`
- Credit charging flow dan async placeholder via `waitUntil`

### What is not ready yet

- `src/modules/CompetitorAnalyzer.jsx` masih full mock dan use case-nya website competitor, bukan Instagram
- `functions/api/runs.js` masih placeholder, belum ada orchestration provider
- Belum ada queue, retry policy, artifact storage, report schema, atau Excel export pipeline
- Belum ada persistent report detail UI

## Recommended Product Shape

Jangan treat ini sebagai satu form kecil + file download. Product yang kuat harus punya tiga layer:

1. `Run launcher`
Masukkan handle, source tab, periode, region/proxy, dan opsi analisis.

2. `Report workspace`
Menampilkan progress, snapshot account, top performers, comment insight, content pattern, dan downloadable artifacts.

3. `History + benchmark`
User bisa buka report lama, compare periode, compare beberapa competitor, dan lihat repeated patterns.

## Production Architecture

### 1. Request and orchestration

Recommended flow:

1. Frontend submit ke `POST /api/runs`
2. API validate input dan charge credits
3. API create `run` dengan status `queued`
4. API publish message ke Cloudflare Queue
5. Queue consumer process run step-by-step
6. Consumer persist progress + partial outputs
7. Consumer generate Excel
8. Consumer mark run `completed` atau `failed`

Kenapa jangan andalkan `waitUntil` di Pages Function untuk semua workload:

- current pattern oke untuk task ringan
- scraping + comments + transcript + AI summarization + Excel export bakal terlalu panjang dan rapuh
- queue kasih retry, batching, delayed retry, dan separation antara request lifecycle vs processing lifecycle

### 1.5. Foundation-first service layering

Recommended layer split:

1. `Platform foundation`
- reusable scraper clients
- normalization
- pagination helpers
- cursor handling
- rate limit handling
- raw response persistence

2. `Platform domain services`
- Instagram profile service
- Instagram media index service
- Instagram comments service
- Instagram transcript service

3. `Module analyzers`
- competitor analyzer
- content analyzer
- hashtag analyzer
- comment analyzer

4. `Artifact builders`
- Excel workbook builder
- JSON export builder
- report summary builder

Dengan pattern ini, module baru nggak perlu bikin scraper baru. Mereka cukup define:

- input contract
- which foundation services to call
- scoring rules
- AI prompts
- output/dashboard structure

### 2. Cloudflare components

Recommended stack:

- Cloudflare Pages: frontend app
- Pages Functions: authenticated API surface
- Cloudflare Queues: job dispatch + retry control
- Queue consumer Worker: heavy processing
- Supabase Postgres: metadata, normalized analytics, report state
- Supabase Storage or R2: generated Excel files and optional JSON snapshots

### 3. ScrapeCreators usage

Minimum endpoint set:

- `/v1/instagram/profile`
- `/v2/instagram/user/posts`
- `/v1/instagram/user/reels`
- `/v1/instagram/post`
- `/v2/instagram/post/comments`
- `/v2/instagram/media/transcript` for reels when available
- `/v1/credit/balance` for ops monitoring

Foundation contract yang disarankan:

- `getInstagramProfile(handle)`
- `getInstagramPosts(handle, options)`
- `getInstagramReels(handle, options)`
- `getInstagramPostDetail(url)`
- `getInstagramPostComments(url, options)`
- `getInstagramTranscript(url, options)`
- `normalizeInstagramMediaItem(raw, profileSnapshot)`
- `paginateUntilDateBoundary(fetcher, dateFrom, dateTo)`

Recommended fetch strategy:

- resolve account metadata once
- fetch paginated posts or reels until date lower bound is crossed
- normalize metrics into one canonical `media_items` table
- rank by engagement score after normalization
- fetch comments only for top N items, not all items
- fetch transcript only for short-form videos selected for AI analysis

Semua module Instagram harus lewat foundation contract ini, bukan panggil endpoint ScrapeCreators langsung dari analyzer masing-masing.

### 4. AI analysis pipeline

Pisahkan analysis jadi beberapa passes:

1. `Per-post enrichment`
- detect hook style
- classify content format
- classify CTA
- summarize caption
- summarize transcript
- extract comment themes

2. `Portfolio analysis`
- rank top 5 content
- identify repeated winning patterns
- explain engagement drivers
- explain audience sentiment and objections
- generate strategy recommendations

3. `Excel narrative`
- produce short executive summary that matches workbook tabs

Jangan lempar raw JSON besar langsung sekali ke model. Lebih aman:

- pre-clean data
- trim comment samples
- chunk top post analyses
- aggregate structured outputs

## Data Model Recommendation

Tambahkan tabel baru:

Selain tabel report per-module, tambahkan storage layer yang lebih generik untuk platform foundation.

### Generic foundation tables

### `platform_accounts`

- `id`
- `platform` (`instagram`, later `tiktok`, `youtube`, etc.)
- `handle`
- `platform_user_id`
- `display_name`
- `profile_url`
- `profile_snapshot` jsonb
- `last_synced_at`
- `created_at`
- `updated_at`

### `platform_content_items`

- `id`
- `platform`
- `account_id`
- `platform_content_id`
- `content_type`
- `url`
- `shortcode`
- `caption`
- `published_at`
- `metrics` jsonb
- `normalized_metrics` jsonb
- `raw_payload` jsonb
- `last_synced_at`
- `created_at`
- `updated_at`

### `platform_content_comments`

- `id`
- `platform`
- `content_item_id`
- `platform_comment_id`
- `author_handle`
- `text`
- `metrics` jsonb
- `raw_payload` jsonb
- `published_at`
- `created_at`

### `platform_sync_jobs`

- `id`
- `platform`
- `job_type`
- `target_ref`
- `status`
- `cursor_state` jsonb
- `stats` jsonb
- `started_at`
- `completed_at`
- `created_at`

Layer ini berguna supaya hasil scrape bisa dipakai lintas module tanpa re-fetch semua data dari nol.

### `instagram_competitor_reports`

- `id`
- `run_id`
- `user_id`
- `instagram_handle`
- `source_tab` (`posts` | `reels`)
- `date_from`
- `date_to`
- `status`
- `profile_snapshot` jsonb
- `summary` jsonb
- `top_content_ids` uuid[]
- `excel_path`
- `raw_archive_path`
- `created_at`
- `updated_at`

### `instagram_media_items`

- `id`
- `report_id`
- `platform_media_id`
- `shortcode`
- `url`
- `media_type`
- `caption`
- `published_at`
- `like_count`
- `comment_count`
- `view_count`
- `play_count`
- `engagement_count`
- `engagement_rate`
- `follower_count_snapshot`
- `is_top_content`
- `transcript`
- `ai_enrichment` jsonb
- `raw_payload` jsonb

### `instagram_media_comments`

- `id`
- `report_id`
- `media_item_id`
- `platform_comment_id`
- `author_handle`
- `text`
- `like_count`
- `published_at`
- `sentiment`
- `theme`
- `raw_payload` jsonb

### `instagram_report_events`

- `id`
- `report_id`
- `run_id`
- `stage`
- `status`
- `message`
- `payload` jsonb
- `created_at`

### `generated_artifacts`

- `id`
- `run_id`
- `report_id`
- `kind` (`excel` | `json` | `csv`)
- `path`
- `mime_type`
- `size_bytes`
- `created_at`

## Run Stages

Define explicit stages biar UI progress-nya real:

1. `validating_input`
2. `fetching_profile`
3. `fetching_media_index`
4. `filtering_period`
5. `normalizing_metrics`
6. `ranking_top_content`
7. `fetching_comments`
8. `fetching_transcripts`
9. `running_ai_enrichment`
10. `building_workbook`
11. `saving_artifacts`
12. `completed`

## Scoring Logic

Jangan cuma sort by likes. Pakai composite score:

- engagement count
- engagement rate
- comment depth
- view-to-engagement ratio
- freshness weighting within selected period

Recommended derived metrics:

- `engagement_count = likes + comments`
- `engagement_rate = engagement_count / follower_count_snapshot`
- `comment_rate = comments / follower_count_snapshot`
- `view_engagement_rate = engagement_count / max(views, 1)`
- `top_score = weighted composite normalized 0-100`

## Excel Output Design

Workbook yang strong:

1. `README`
- report metadata
- filters used
- metric definitions

2. `Summary`
- profile snapshot
- top 5 content
- key insights
- recommended action points

3. `Raw Media`
- one row per post/reel

4. `Clean Media`
- normalized columns only

5. `Top Content`
- top 5 with hooks, themes, CTA, reasons it worked

6. `Comments`
- sampled comments and AI labels

7. `Comment Themes`
- aggregated themes, sentiment, notable quotes

8. `Ops Log`
- fetch timestamps, cursor info, failures, retries

## Dashboard Redesign Direction

Current module tampilannya terlalu generic, cream-heavy, dan terasa seperti internal admin. Untuk automasi ini, tampilannya harus terasa seperti forensic intelligence tool.

### Recommended visual direction

- theme: editorial intelligence + premium analysis desk
- base palette: obsidian, warm sand, muted brass, signal coral, analytical green
- typography: serif display untuk headline + clean grotesk untuk data layer
- cards: denser, sharper, less rounded, higher contrast
- layout: asymmetric hero + dense analysis panels, bukan grid kartu marketplace biasa

### New report workspace structure

1. `Hero command bar`
- handle
- source tab
- date range
- report status
- export button

2. `Signal strip`
- total media analyzed
- avg engagement
- top content score
- dominant format
- strongest comment theme

3. `Top 5 content board`
- ranked cards
- thumbnail
- hook
- metrics
- why it won

4. `Pattern clusters`
- format patterns
- hook patterns
- CTA patterns
- recurring audience reactions

5. `Comment intelligence`
- theme buckets
- positive/negative split
- quote highlights

6. `Raw data explorer`
- filterable table
- sortable columns
- export CSV/Excel

### Micro-interactions

- progress rail with real stages, not fake loading
- staggered reveal when sections complete
- pinned insight annotations on top-content cards
- inline confidence badges for AI-generated claims

## What Will Make This Stand Out

Most tools stop at scraping and exporting rows. To stand out:

- show `why this post worked`, not only `this post worked`
- turn comments into audience language clusters
- compare posts vs reels behavior for the same account
- preserve raw proof behind every AI claim
- show confidence and data coverage
- make workbook match dashboard narrative

## Reliability Requirements

### Validation

- normalize handle without `@`
- reject invalid date ranges
- cap max lookback on first version
- warn when too few media items are available

### Idempotency

- queue message should include `run_id`
- consumer must check current run status before re-processing
- save stage checkpoints

### Retry policy

- retry transient API failures
- backoff for comment fetch and transcript fetch
- partial completion allowed with warnings

### Observability

- structured logs with `run_id`, `report_id`, `stage`
- persist stage events to DB
- store provider response metadata and credit usage

### Security

- keep `SCRAPECREATORS_API_KEY` server-side only
- never call ScrapeCreators directly from client
- signed URL for Excel download
- RLS on report tables via `user_id`

## Recommended Repo Changes

### Backend

- add `src/lib/platforms/instagram` style service layer or server-side equivalent
- create reusable foundation helpers before any module-specific analyzer
- replace placeholder logic in `functions/api/runs.js`
- add producer binding for queue
- create consumer Worker for Instagram report jobs
- add report tables migration
- add storage upload helper
- add Excel builder utility

Suggested package/service shape:

- `server/foundations/instagram/client.js`
- `server/foundations/instagram/profile-service.js`
- `server/foundations/instagram/media-service.js`
- `server/foundations/instagram/comment-service.js`
- `server/foundations/instagram/transcript-service.js`
- `server/foundations/instagram/normalize.js`
- `server/modules/instagram-competitor-analyzer/*`
- `server/modules/instagram-content-analyzer/*`
- `server/modules/instagram-tags-analyzer/*`

### Frontend

- rebuild `src/modules/CompetitorAnalyzer.jsx` from scratch
- split into launcher, run-progress, report-detail, and history components
- add persisted fetch layer for report detail
- stop shipping mock competitor website data

### Catalog/product positioning

Recommended rename in UI:

- `Generator Laporan Kompetitor Instagram`

Optional internal slug:

- keep `competitor-analyzer` if you want to avoid migration pain
- or create new slug `instagram-competitor-report`

## Delivery Plan

### Phase 1

- DB schema
- queue pipeline
- ScrapeCreators fetch for posts/reels
- normalized media table
- raw Excel export

### Phase 2

- comments for top content
- AI enrichment
- top 5 ranking
- summary workbook tabs
- real progress UI

### Phase 3

- transcripts for reels
- benchmark compare mode
- account history
- recurring pattern intelligence
- stronger artifact center

## Strong Recommendation

Untuk versi production pertama, fokus ke:

- single competitor per run
- source tab `Posts` atau `Reels`
- one date range
- top 5 analysis
- comments only on top content
- workbook + dashboard detail

Jangan langsung multi-account compare dalam satu run. Lebih aman dan lebih cepat stabil.

Tapi dari sisi code architecture, foundation Instagram-nya tetap dibangun generic dari awal, supaya module 2, 3, 4, dan 5 tinggal nambah analyzer layer tanpa bongkar ulang fondasi.

## Source Notes

- ScrapeCreators skill and endpoint routing: https://github.com/ScrapeCreators/social-media-research-skills
- ScrapeCreators API skill reference: https://scrapecreators.com
- Cloudflare Pages Functions API reference: https://developers.cloudflare.com/pages/functions/api-reference/
- Cloudflare Queues guide: https://developers.cloudflare.com/queues/get-started/
- Cloudflare Queues JavaScript APIs: https://developers.cloudflare.com/queues/configuration/javascript-apis/
