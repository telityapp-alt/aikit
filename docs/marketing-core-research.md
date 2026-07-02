# Marketing Core Research

Updated: 2026-07-02

## Goal

Define a production-grade foundation for:

- Contact Manager
- Campaign Manager
- Content Calendar
- Table/grid UX that stays lightweight and keeps aikit's styling control

This research is written for aikit's current direction:

- marketing-first
- modular mini-ERP
- Supabase/Postgres + RLS
- React frontend with custom styling
- preference for lightweight dependencies and strong ownership of UX

## Executive Summary

The right foundation is not "one giant flexible table" and not "install enterprise grid now".

The right foundation is:

1. Keep core business objects relational and explicit.
2. Keep flexible per-module extras in `metadata jsonb`.
3. Model cross-module links as junction tables, not strings.
4. Treat Contact, Campaign, and Content as separate first-class records.
5. Use a lightweight table strategy:
   - near term: custom styled semantic table/list
   - when needed: TanStack Table style architecture
   - do not anchor the system to AG Grid-style complexity right now

## What Big Apps Commonly Do

### 1. Contact systems

Across CRM tools, the pattern is very consistent:

- one canonical contact record
- separate companies/accounts/organizations
- activity timeline attached to the record
- custom properties/fields
- segmentation/views
- relationship links to deals, campaigns, tasks, and communication history

Observed recurring patterns:

- HubSpot-style pattern:
  - strong contact record
  - segmentation
  - custom properties
  - integrated marketing context
- Salesforce-style pattern:
  - detailed contact profile
  - communication history
  - account hierarchy
  - structured sales/campaign relations

What this means for aikit:

- `contacts` cannot just be a pretty address book
- it must become the identity layer for people/brands/entities the workspace interacts with
- campaign, intelligence, content, reports, and later invoicing should attach to that identity layer

### 2. Campaign systems

Big apps usually separate campaign into two layers:

- campaign as business intent
- execution artifacts under the campaign

The campaign object usually owns:

- name
- objective
- status
- date range
- budget
- owner
- channels
- audience/segment
- linked contacts/accounts
- linked assets/content/posts
- linked reports/performance

Important lesson:

Campaign is not just a folder and not just a calendar item.
It is the business container that ties planning, execution, and measurement together.

For aikit:

- existing report modules should eventually link to campaign
- content calendar items should optionally belong to campaign
- campaign should become the first real "integration spine" for marketing modules

### 3. Content calendar systems

Big apps usually keep content planning as a separate object with workflow state.

Common fields:

- title
- caption/body
- platform/channel
- planned date
- publish date
- owner
- campaign link
- approval status
- asset attachments
- tags

Common UX patterns:

- calendar view
- kanban/status view
- per-platform filtering
- direct relation to campaign
- direct relation to approvals/assets

Important lesson:

Content calendar should not be merged into campaigns table.
It should be its own table linked to campaign.

## Recommendation for Aikit Data Model

### Core principle

Use dedicated tables for core entities.
Use `metadata jsonb` only for flexible extras.

### Recommended first-class tables

#### `contacts`

Purpose:

- canonical people/brand/entity record

Recommended columns:

- `id`
- `user_id`
- `kind` or `type`
  - `lead`
  - `customer`
  - `vendor`
  - `creator`
  - `competitor`
  - `partner`
- `display_name`
- `company_name`
- `email`
- `phone`
- `status`
- `owner_user_id` optional later for teams
- `primary_channel`
- `social_handles jsonb`
- `platform_account_id` nullable bridge to intelligence data
- `notes`
- `metadata jsonb`
- `created_at`
- `updated_at`

Do not put these in `metadata` if you know they will be queried often:

- name
- type
- status
- owner
- email
- company

#### `organizations`

Purpose:

- optional but highly recommended if contact volume grows
- cleanly separates person from business entity

If you skip this now, at least leave room to add it later.

Recommended columns:

- `id`
- `user_id`
- `name`
- `type`
- `industry`
- `website`
- `status`
- `notes`
- `metadata jsonb`
- timestamps

Then add:

- `contact_organizations`

This avoids overloading one contact row with all business meaning.

#### `campaigns`

Purpose:

- business container for marketing initiatives

Recommended columns:

- `id`
- `user_id`
- `name`
- `objective`
- `status`
- `start_date`
- `end_date`
- `budget`
- `currency`
- `primary_channel`
- `owner_user_id` optional later
- `notes`
- `metadata jsonb`
- timestamps

Add later if needed:

- `target_audience_summary`
- `goal_metric`
- `goal_value`

#### `campaign_contacts`

Purpose:

- many-to-many relation between campaign and contacts

Recommended columns:

- `id`
- `campaign_id`
- `contact_id`
- `role`
  - `target`
  - `creator`
  - `competitor`
  - `partner`
  - `stakeholder`
- `metadata jsonb`
- `added_at`

This is the correct place for campaign-level role context.
Do not put campaign role inside `contacts`.

#### `content_posts`

Purpose:

- planned or published content unit

Recommended columns:

- `id`
- `user_id`
- `campaign_id` nullable
- `title`
- `body`
- `platform`
- `status`
  - `idea`
  - `draft`
  - `review`
  - `approved`
  - `scheduled`
  - `published`
  - `cancelled`
- `scheduled_at`
- `published_at`
- `owner_user_id` optional later
- `asset_count` optional derived later
- `media_urls text[]`
- `tags text[]`
- `metadata jsonb`
- timestamps

If team collaboration matters soon, add:

- `content_approvals`
- `content_assignees`

#### `activities`

Strong recommendation:

Add a generic activity timeline table earlier than you think.

Purpose:

- notes
- manual log entries
- follow-ups
- interactions
- future reminders

Recommended columns:

- `id`
- `user_id`
- `entity_type`
- `entity_id`
- `activity_type`
- `title`
- `body`
- `happened_at`
- `created_by`
- `metadata jsonb`
- timestamps

This one table gives Contact Manager and Campaign Manager much more depth fast.

## What Should Stay Flexible

Use `jsonb` only for:

- extra profile details that are not universally queried
- channel-specific structured payloads
- per-module annotations
- imported intelligence payload fragments

Good candidates for flexibility:

- `social_handles jsonb`
- `metadata jsonb`
- external provider snapshots

Bad candidates for flexibility:

- names
- statuses
- owners
- campaign links
- dates
- budget
- platform

If a field is filterable, sortable, joinable, or shown in list views often, it should be a real column.

## Table/Grid Research

### Problem statement

You called out an important concern:

- AG Grid-style tables feel too heavy
- generic tables often fight your product styling
- but basic HTML tables break down once you need sorting, filtering, bulk actions, hidden columns, pinned columns, and row state

That concern is valid.

### Big-app pattern

Most serious apps separate:

- data model
- table state
- visual rendering

They do not rely on one magical table package for the whole product.

### Recommended direction for aikit

#### Option A: custom semantic table/list first

Best when:

- rows are below a few hundred on screen
- features are basic
- styling control matters most

Use:

- semantic table or div-based data list
- manual sort/filter state
- reusable toolbar and row actions

Pros:

- zero new dependency
- full styling ownership
- fastest to make aikit feel distinct

Cons:

- repeated logic if every module grows independently

#### Option B: TanStack Table architecture

Best when:

- you need reusable table behavior across many modules
- you want headless logic, not opinionated UI
- you still want aikit's styling to stay custom

Why it fits aikit:

- headless
- controlled state
- good for custom rendering
- works with your own layout and design system

What it should own:

- sorting
- filtering
- column visibility
- row selection
- expandable rows

What it should not own:

- visual identity
- card chrome
- empty states
- sticky layout decisions

#### Option C: AG Grid / enterprise-style datagrid

Not recommended for aikit right now.

Why:

- heavier mental model
- pushes product toward generic enterprise UI
- too easy to let the grid dictate the UX
- overkill before team permissions, bulk ops, and massive datasets are proven needs

### Final table recommendation

For aikit:

1. Do not adopt AG Grid as the foundation.
2. For the next step, either:
   - stay custom if Contact/Campaign data volume is still modest
   - or adopt TanStack Table-style headless table architecture when you want one reusable grid foundation
3. Keep list/table rendering visually custom.

## Feature Expansion Research

### Contact Manager should expand into

#### Core MVP+

- searchable list
- filters by type/status/tag
- sort by updated/recent/name
- detail drawer/panel
- notes
- social handles
- linked campaigns
- basic activity timeline

#### Strong next features

- saved views
- bulk tag/status update
- duplicate detection
- import from CSV/paste
- convert intelligence profile into contact
- last interaction / next follow-up
- owner assignment for teams later

#### Long-term ERP-grade features

- account hierarchy
- custom fields
- merge contacts
- relationship graph
- linked invoices/orders/deals later

### Campaign Manager should expand into

#### Core MVP+

- campaign CRUD
- budget
- objective
- date range
- status
- linked contacts
- notes

#### Strong next features

- linked intelligence reports
- channel summary
- campaign timeline
- campaign activity feed
- asset/content count
- budget vs execution snapshot

#### Long-term ERP-grade features

- performance rollups
- attribution inputs
- approval workflow
- spend tracking
- campaign templates

### Content Calendar should expand into

#### Core MVP+

- calendar view
- kanban by status
- campaign relation
- platform filter
- scheduled/published dates
- tags

#### Strong next features

- approval status
- assignee
- content brief template
- reusable content types
- asset attachments
- duplicate as new draft

#### Long-term ERP-grade features

- publishing integration
- review workflow
- performance sync back into content item
- campaign content scorecard

## Recommended Implementation Order

### Phase A - stabilize foundations

1. Keep `contacts`, `campaigns`, `campaign_contacts`, `content_posts`
2. Add `activities`
3. Add stronger indexes for list views
4. Define consistent enum/status vocabulary

### Phase B - deepen Contact Manager

1. search/filter/sort toolbar
2. linked campaigns panel
3. activity timeline
4. quick-add note / quick-add follow-up
5. import flow

### Phase C - deepen Campaign Manager

1. linked reports section
2. linked content section
3. campaign summary cards
4. channel tags
5. campaign activity feed

### Phase D - deepen Content Calendar

1. review/approval status
2. assignee
3. content type
4. richer filters
5. duplicate/reschedule workflow

### Phase E - shared table foundation

Build one reusable headless table layer for:

- contacts list
- campaigns list
- content list
- future products/inventory lists

Recommended shared table capabilities:

- controlled sorting
- text search
- filter chips
- row selection
- column visibility
- pagination or infinite list
- empty states
- bulk toolbar

## Final Recommendation

If you want lightweight but powerful:

- database foundation:
  - relational core tables + `jsonb` for extras
- UI foundation:
  - custom visual shell + headless table behavior
- product foundation:
  - contact is identity layer
  - campaign is strategy/execution container
  - content calendar is execution workflow

The biggest mistake to avoid:

- building pretty screens before the relationship model is locked

The second biggest mistake:

- overbuying a giant table/grid before aikit's own UX language is mature

## Suggested Decision for Aikit Right Now

If choosing today:

1. Keep the current core entity tables approach.
2. Add `activities` next.
3. Expand Contact Manager first.
4. Expand Campaign Manager second.
5. Expand Content Calendar third.
6. Use custom tables now, and move to TanStack-style headless table foundation when cross-module list complexity is real.
