# TikTok Apify Intelligence Blueprint

## Quick answer

Ya, informasi yang sudah ada **cukup untuk mulai desain arsitektur dan fase implementasi pertama**.

Yang sudah cukup:

- target platform: TikTok
- provider scraping: Apify
- sample output shape
- use case utama: input profile random, bisa set jumlah output
- outcome product: dashboard analitik yang jauh lebih lengkap dari sekadar tabel hasil scrape

Yang masih perlu dilock sebelum implementasi production:

- actor Apify yang akan dipakai persisnya apa
- input schema actor tersebut
- apakah butuh profile-only, posts-only, atau profile + posts + comments
- batas biaya per run
- aturan maksimum jumlah video yang boleh diambil per run

## Current repo fit

Repo ini sudah punya pondasi yang sangat berguna:

- worker async dengan Cloudflare Queue
- generic storage tables `platform_accounts`, `platform_content_items`, `platform_content_comments`
- report pipeline Instagram yang bisa dijadikan template orchestration
- React module workspace untuk report history, progress, summary, dan raw explorer

Kesimpulan:

- kita **tidak perlu bikin sistem baru**
- kita perlu bikin **TikTok foundation via Apify**
- lalu bikin **TikTok report workspace** di atas foundation itu

## Product recommendation

Jangan treat ini sebagai "scraper TikTok". Yang lebih kuat adalah:

- `TikTok Profile Intelligence`

V1 behavior:

- user input satu handle TikTok
- user set jumlah video yang mau diambil
- worker jalan ke Apify actor
- result disimpan sebagai raw + normalized data
- sistem hitung KPI turunan
- dashboard tampilkan executive summary, top videos, pattern analysis, audience signal, dan downloadable artifact

V2 behavior:

- compare dua periode
- compare beberapa profile
- trend watch
- content opportunity scoring

## Recommended architecture

### 1. Backend flow

1. frontend submit `handle`, `maxItems`, optional date range
2. worker API validate input
3. create `run`
4. create `tiktok_profile_reports`
5. publish queue message
6. queue consumer trigger Apify actor
7. poll run status until `SUCCEEDED` / `FAILED`
8. fetch dataset items
9. normalize profile and video rows
10. compute derived KPIs
11. run AI analysis
12. save report summary + artifacts
13. dashboard reads report detail from API

### 2. Service split

Recommended files:

- `worker/platforms/tiktok-apify.js`
- `worker/modules/tiktok-profile-intelligence.js`
- `src/modules/TikTokProfileIntelligence.jsx`

Recommended responsibility split:

- `platforms/tiktok-apify.js`
  - call Apify API
  - start actor run
  - poll actor run
  - fetch dataset items
  - map transport errors

- `modules/tiktok-profile-intelligence.js`
  - validate input
  - normalize dataset rows
  - compute KPIs
  - store report rows
  - build summary
  - build export artifact

- `TikTokProfileIntelligence.jsx`
  - launcher form
  - progress workspace
  - signal strip
  - top content board
  - insight sections
  - raw explorer

## Apify integration plan

### Security

Token Apify **jangan di-hardcode** di repo atau client.

Store as:

- local: `.dev.vars`
- production: Cloudflare Worker secret

Suggested env var:

- `APIFY_API_TOKEN`
- `APIFY_TIKTOK_ACTOR_ID`

### Generic contract

Karena actor final belum dikunci, bangun adapter dengan contract ini:

- `runTikTokActor(env, input)`
- `waitForApifyRun(env, runId, timeoutMs)`
- `getApifyDatasetItems(env, datasetId, options)`

### API pattern

Use Apify asynchronously:

1. `POST /v2/acts/{actorId}/runs`
2. read returned `runId`
3. poll run detail
4. after success, read default dataset items

This fits the repo better than synchronous waiting inside the request cycle.

### Input contract for our app

Suggested V1 form:

```json
{
  "handle": "dr.giovanniabraham",
  "maxItems": 30,
  "dateFrom": "2026-06-01",
  "dateTo": "2026-07-02",
  "includeComments": false
}
```

Even if the actor uses a different native input shape, convert from this app-level contract into actor-specific payload inside the adapter.

### Sample actor-level mapping

Because actor selection is not locked yet, use configurable mapping:

```js
function buildActorInput({ handle, maxItems, dateFrom, dateTo }) {
  return {
    profiles: [handle],
    resultsPerPage: maxItems,
    maxItems,
    dateFrom,
    dateTo,
  };
}
```

If the chosen actor expects `profileUrls`, `usernames`, or `searchQueries`, we only swap this mapper, not the module architecture.

## Data mapping from your sample JSON

The sample output is already enough for a strong V1.

### Raw fields available now

- `authorMeta.name`
- `authorMeta.avatar`
- `text`
- `diggCount`
- `shareCount`
- `playCount`
- `commentCount`
- `collectCount`
- `videoMeta.duration`
- `musicMeta.musicName`
- `musicMeta.musicAuthor`
- `musicMeta.musicOriginal`
- `createTimeISO`
- `webVideoUrl`

### Suggested normalized shape

Map into `platform_content_items` like this:

- `platform`: `tiktok`
- `platform_content_id`: extract from URL or raw item id when available
- `content_type`: `video`
- `url`: `webVideoUrl`
- `caption`: `text`
- `published_at`: `createTimeISO`
- `metrics.likes`: `diggCount`
- `metrics.comments`: `commentCount`
- `metrics.shares`: `shareCount`
- `metrics.saves`: `collectCount`
- `metrics.views`: `playCount`
- `normalized_metrics.duration_seconds`: `videoMeta.duration`
- `normalized_metrics.music_name`: `musicMeta.musicName`
- `normalized_metrics.music_author`: `musicMeta.musicAuthor`
- `normalized_metrics.music_original`: `musicMeta.musicOriginal`

## Recommended new tables

Keep generic platform tables, then add TikTok-specific report tables.

### `tiktok_profile_reports`

- `id`
- `run_id`
- `user_id`
- `profile_account_id`
- `tiktok_handle`
- `status`
- `date_from`
- `date_to`
- `filters` jsonb
- `profile_snapshot` jsonb
- `summary` jsonb
- `artifact_id`
- `completed_at`
- `created_at`
- `updated_at`

### `tiktok_profile_report_items`

- `id`
- `report_id`
- `content_item_id`
- `rank_position`
- `top_score`
- `url`
- `caption`
- `published_at`
- `like_count`
- `comment_count`
- `share_count`
- `save_count`
- `view_count`
- `duration_seconds`
- `velocity_score`
- `engagement_rate`
- `view_to_engagement_rate`
- `share_rate`
- `save_rate`
- `hook_style`
- `content_format`
- `topic_cluster`
- `music_cluster`
- `ai_enrichment` jsonb
- `created_at`

### `tiktok_report_events`

- `id`
- `report_id`
- `run_id`
- `stage`
- `status`
- `message`
- `payload` jsonb
- `created_at`

## KPI design

Ini bagian yang bikin dashboard-nya naik kelas.

### Base KPIs

- total videos analyzed
- total views
- total likes
- total comments
- total shares
- total saves
- median video duration
- posting frequency

### Derived KPIs

- `engagement_count = likes + comments + shares + saves`
- `view_to_engagement_rate = engagement_count / max(views, 1)`
- `share_rate = shares / max(views, 1)`
- `save_rate = saves / max(views, 1)`
- `comment_rate = comments / max(views, 1)`
- `like_rate = likes / max(views, 1)`
- `engagement_mix_comment = comments / max(engagement_count, 1)`
- `engagement_mix_share = shares / max(engagement_count, 1)`
- `engagement_mix_save = saves / max(engagement_count, 1)`
- `watchability_proxy = views / max(duration_seconds, 1)`

### New KPIs that feel premium

- `virality_score`
  - weight shares heavily
  - use saves as secondary intent signal

- `conversation_score`
  - weight comments per 1k views

- `intent_score`
  - weight saves + comments more than likes

- `hook_efficiency_score`
  - compare first-line hook patterns against views and engagement

- `content_replay_value`
  - proxy from saves + short duration + strong engagement density

- `format_dominance`
  - which content format most often enters top quartile

- `topic_heatmap`
  - topics that consistently outperform baseline

## Scoring model

Suggested V1 `top_score`:

```txt
top_score =
  0.30 * normalized_view_to_engagement_rate
  + 0.25 * normalized_share_rate
  + 0.20 * normalized_save_rate
  + 0.15 * normalized_comment_rate
  + 0.10 * normalized_views
```

Why this is better than sorting by views:

- views alone reward reach
- save/share/comment rates reward actual content strength
- result lebih dekat ke "kenapa video ini penting"

## AI enrichment recommendation

Per video, generate:

- hook style
- likely content format
- topic cluster
- emotion / promise angle
- CTA style
- short explanation of why it worked

Portfolio summary, generate:

- executive summary
- repeated winning patterns
- weak patterns
- best posting windows from available timestamps
- content recommendations
- experiments for next 7 posts

## Dashboard structure

### 1. Command bar

- handle
- date range
- max items
- status
- export

### 2. Signal strip

- total videos
- total views
- avg engagement density
- virality score
- dominant topic
- strongest format

### 3. Top content board

Each card:

- rank
- short summary
- key metrics
- why it won
- format / hook / topic chips
- link to source video

### 4. Pattern intelligence

- top hook patterns
- top content formats
- top music patterns
- top caption themes

### 5. Audience and intent panel

- comment proxy if available later
- save-heavy content
- share-heavy content
- discussion-heavy content

### 6. Opportunity engine

- underused formats with strong return
- topics to repeat
- topics to avoid
- recommended content tests

### 7. Raw explorer

- sortable table
- filters by topic / date / score
- export CSV / Excel / JSON

## UX direction

Current Instagram workspace is usable, but for this module the ideal direction is more premium and sharper.

Recommended look:

- darker editorial data-room tone
- strong contrast
- denser cards
- asymmetric layout
- bold data typography
- visible confidence / coverage badges

Recommended section language:

- `Signal Deck`
- `Top Movers`
- `Pattern Clusters`
- `Intent Signals`
- `Opportunity Queue`

## Delivery phases

### Phase 1: working TikTok pipeline

- Apify adapter
- new report tables
- queue job
- fetch dataset items
- normalize rows
- save report
- basic dashboard

### Phase 2: premium insights

- KPI scoring
- AI per-video enrichment
- portfolio summary
- top content board
- CSV/Excel export

### Phase 3: complete total mode

- compare period vs period
- compare profile vs profile
- benchmark against internal baseline
- saved dashboard presets
- artifact center
- optional scheduled refresh

## What is enough from your side right now

For implementation start, yes.

The only missing critical item is:

- **exact Apify actor ID or actor URL**

Without that, we can still build:

- schema
- queue pipeline
- adapter skeleton
- UI
- normalization layer

But we cannot finalize actor input mapping confidently until the actor is locked.

## Strong recommendation

Build this as:

- `TikTok Profile Intelligence`

not:

- `TikTok scraper`

Because the real value is:

- decision-making dashboard
- KPI engine
- repeatable report workspace
- reusable platform foundation

The scraper is only the first 10% of the product.
