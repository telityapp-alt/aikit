# CRM Multi-App Masterplan

Updated: 2026-07-06

## Why this exists

`contact-manager` di repo saat ini masih berbentuk entity module:

- satu app screen
- satu tabel utama `contacts`
- activity timeline masih generic
- belum ada concept kuat untuk account, deal, inbox, lifecycle, ownership, custom fields, atau relationship graph

Kalau vision aikit adalah platform multi-module yang saling pakai data yang sama, maka CRM tidak boleh berhenti sebagai "contact manager".

CRM harus jadi:

- identity layer
- relationship layer
- commercial workflow layer
- orchestration layer untuk modul lain

Artinya: `CRM` harus naik kelas dari module menjadi app suite.

## Quick audit of current state

### Current app state in repo

Source context:

- `src/modules/ContactManager/index.jsx`
- `src/modules/registry.js`
- `supabase/migrations/0010_marketing_core_entities.sql`
- `supabase/migrations/0011_marketing_operations_foundation.sql`

What exists now:

- `contacts`
  - `type`, `name`, `email`, `phone`, `company`
  - `social_handles`, `tags`, `notes`
  - `status`
  - `last_interaction_at`, `next_follow_up_at`
- `campaigns`
- `campaign_contacts`
- `content_posts`
- `activities`

Current strengths:

- relational base already exists
- RLS per user is already in place
- `activities` already gives a reusable timeline backbone
- `campaign_contacts` proves cross-entity linking is already accepted in the architecture

Current limitations:

- contact and company are still mixed into one row
- no `organizations/accounts`
- no `deals/opportunities`
- no proper lead qualification model
- no tasks queue / work queue system
- no inbox or communication thread model
- no saved views / segments / smart filters
- no deduplication / merge / import system
- no custom field system
- no team ownership / assignment model
- no cross-app CRM shell
- route architecture still assumes a standalone module, not a multi-app workspace

## What modern CRM products consistently get right

This section is an inference from current market patterns visible in major CRMs.

Across Salesforce, HubSpot, Attio, and Pipedrive, the recurring pattern is:

1. CRM is not one screen.
2. CRM always has a canonical record model.
3. People and companies are separated.
4. Revenue workflow gets its own pipeline object.
5. Every record has a timeline.
6. Views, filters, ownership, and automation matter as much as CRUD.
7. The best systems are multi-workspace by behavior even when marketed as one app.

Observed product tendencies:

- Salesforce pattern:
  - strong object graph
  - account/contact/lead/opportunity separation
  - heavy workflow and permissions
- HubSpot pattern:
  - one customer platform spanning marketing, sales, and service
  - lifecycle stages
  - segmentation and automation
- Attio pattern:
  - modern flexible object model
  - strong relationship-centric records
  - customizable views and workflows
- Pipedrive pattern:
  - pipeline-first execution
  - simple but powerful deal flow and activity management

What this means for aikit:

- we should not build one giant `contacts` super-table
- we should not build a generic enterprise monster first
- we should build a CRM app suite with a strong shared core

## North star for aikit CRM

The right north star is:

**Aikit CRM is a multi-app operating system for workspace relationships.**

It should manage:

- people
- organizations
- leads
- accounts
- deals
- activities
- tasks
- communication context
- campaigns
- content relations
- automation outputs
- customer lifecycle state

And it should expose all of that to other modules.

## Product architecture: app suite, not module

### Positioning

Current:

- `/dashboard/module/contact-manager`

Target:

- one top-level CRM app shell
- several CRM sub-apps inside it
- one shared record graph underneath

### Proposed route architecture

Option recommended for aikit:

- `/dashboard/apps/crm`
- `/dashboard/apps/crm/overview`
- `/dashboard/apps/crm/people`
- `/dashboard/apps/crm/organizations`
- `/dashboard/apps/crm/leads`
- `/dashboard/apps/crm/deals`
- `/dashboard/apps/crm/activities`
- `/dashboard/apps/crm/tasks`
- `/dashboard/apps/crm/inbox`
- `/dashboard/apps/crm/campaigns`
- `/dashboard/apps/crm/segments`
- `/dashboard/apps/crm/imports`
- `/dashboard/apps/crm/settings`

Record-level routes:

- `/dashboard/apps/crm/people/:id`
- `/dashboard/apps/crm/organizations/:id`
- `/dashboard/apps/crm/leads/:id`
- `/dashboard/apps/crm/deals/:id`
- `/dashboard/apps/crm/campaigns/:id`

Why this is better than module routes:

- matches "CRM as app suite"
- lets every sub-app stay focused
- keeps shared shell navigation possible
- scales better once service, success, and AI workspaces join later

## App map inside CRM

### 1. Overview

Purpose:

- executive snapshot
- team queue
- health of pipeline
- tasks due today
- follow-ups due
- new leads
- stalled deals
- campaign-linked relationship activity

Must show:

- pipeline totals
- leads by stage
- tasks due
- overdue follow-ups
- recently touched contacts
- accounts at risk
- linked automation/import jobs

### 2. People

Purpose:

- canonical person record

Core capabilities:

- unified list and compact table
- profile detail panel
- tags
- lifecycle stage
- role in org
- linked organization(s)
- linked deals
- linked campaigns
- linked tasks
- communication timeline
- merge duplicate records

### 3. Organizations

Purpose:

- canonical company/account record

Core capabilities:

- account profile
- industry / segment / territory
- website and domain intelligence
- linked people
- linked deals
- linked campaigns
- linked automation outputs
- account notes and risk markers

### 4. Leads

Purpose:

- manage intake and qualification before conversion

Core capabilities:

- source tracking
- qualification status
- score
- owner
- lead stage
- conversion to person + organization + deal
- disqualification reasons
- SLA for first response / follow-up

Important note:

`lead` should become workflow state, not only one value inside `contacts.type`.

### 5. Deals

Purpose:

- commercial pipeline

Core capabilities:

- pipeline per workspace
- stage progression
- value
- expected close date
- owner
- linked people and organizations
- competitor tags
- activities and next steps
- closed-won handoff to downstream modules later

### 6. Activities

Purpose:

- system-wide relationship history

Core capabilities:

- calls
- emails
- meetings
- notes
- tasks completed
- state changes
- automation events
- imports

This should evolve from the current generic `activities` table into a richer event backbone.

### 7. Tasks

Purpose:

- action queue

Core capabilities:

- follow-up tasks
- due dates
- reminders
- linked record
- owner
- status
- priority
- queue views

This should not be squeezed into `activities` forever.

### 8. Inbox

Purpose:

- communication workspace

Near-term version:

- manual logging
- outbound templates
- linked communication records

Long-term version:

- email sync
- WhatsApp / DM logging
- thread-to-record matching
- AI summaries

### 9. Campaigns

Purpose:

- marketing execution attached to CRM graph

Why it stays inside CRM suite:

- campaigns are not only content folders
- they are commercial motion attached to people, companies, deals, and segments

### 10. Segments

Purpose:

- saved filters / smart lists

Core capabilities:

- static list
- dynamic segment
- reusable audience definitions
- can feed campaigns, exports, and automations

### 11. Imports

Purpose:

- bring outside data into CRM safely

Core capabilities:

- CSV import
- paste import
- automation import
- field mapping
- dedupe preview
- merge resolution
- audit trail

### 12. Settings

Purpose:

- configure CRM behavior per workspace

Core capabilities:

- pipelines
- lifecycle stages
- custom fields
- scoring rules
- ownership rules
- import templates
- automations

## Shared platform services underneath the apps

These are the real foundation. If these are right, many CRM apps become much easier.

### A. Record service

Every major record should support:

- stable ID
- display title
- owner
- stage / status
- tags
- metadata
- search fields
- timestamps

### B. Relationship service

Need explicit relationships, not string hacks.

Examples:

- person belongs to organization
- person is decision-maker for deal
- organization is target for campaign
- deal linked to campaign
- contact sourced from automation run

### C. Timeline service

One normalized activity/event backbone:

- user-generated entries
- system-generated events
- communication logs
- automation events
- workflow transitions

### D. Task service

One generic task system linked to any CRM entity:

- entity type
- entity id
- assignee
- due_at
- completed_at
- status
- priority

### E. View service

Every wide CRM needs:

- saved views
- filters
- column visibility
- sorting
- grouping
- pinned filters

### F. Data quality service

Need from early phase:

- dedupe checks
- merge flow
- required-field policy
- lifecycle consistency
- import audit

### G. Automation service

CRM should react to events:

- when lead created -> assign owner
- when no follow-up in 3 days -> create task
- when deal moved to won -> create onboarding entity later
- when automation report imported -> suggest record match

## Recommended data model target

This is the main structural shift.

### Core tables

#### `crm_people`

- `id`
- `workspace_id` or current user/workspace scoping equivalent
- `display_name`
- `primary_email`
- `primary_phone`
- `job_title`
- `status`
- `lifecycle_stage`
- `owner_user_id`
- `primary_organization_id` nullable
- `source_type`
- `source_ref`
- `linkedin_url`
- `social_handles jsonb`
- `tags text[]`
- `metadata jsonb`
- timestamps

#### `crm_organizations`

- `id`
- scope column
- `name`
- `domain`
- `website`
- `industry`
- `size_band`
- `country`
- `city`
- `status`
- `owner_user_id`
- `tags`
- `metadata`
- timestamps

#### `crm_person_organizations`

Because one person can move or be tied to multiple orgs.

- `id`
- `person_id`
- `organization_id`
- `relationship_type`
- `job_title`
- `is_primary`
- `start_date`
- `end_date`
- `metadata`

#### `crm_leads`

Lead intake and qualification should be separate.

- `id`
- scope column
- `person_id` nullable at intake
- `organization_id` nullable
- `source_type`
- `source_ref`
- `source_campaign_id` nullable
- `stage`
- `status`
- `score`
- `temperature`
- `owner_user_id`
- `qualification_notes`
- `disqualification_reason`
- `converted_person_id`
- `converted_organization_id`
- `converted_deal_id`
- timestamps

#### `crm_pipelines`

- `id`
- scope column
- `name`
- `entity_type` usually `deal`
- `is_default`
- `metadata`

#### `crm_pipeline_stages`

- `id`
- `pipeline_id`
- `name`
- `stage_key`
- `position`
- `win_probability`
- `is_closed`
- `is_won`

#### `crm_deals`

- `id`
- scope column
- `name`
- `pipeline_id`
- `stage_id`
- `organization_id`
- `primary_person_id`
- `owner_user_id`
- `amount`
- `currency`
- `expected_close_at`
- `status`
- `source_type`
- `source_ref`
- `campaign_id` nullable
- `metadata`
- timestamps

#### `crm_deal_contacts`

- `id`
- `deal_id`
- `person_id`
- `role`
- `is_primary`

#### `crm_activities`

Evolve from current `activities`.

- `id`
- scope column
- `entity_type`
- `entity_id`
- `activity_type`
- `direction`
- `title`
- `body`
- `happened_at`
- `actor_user_id`
- `source_type`
- `source_ref`
- `metadata`
- timestamps

#### `crm_tasks`

- `id`
- scope column
- `entity_type`
- `entity_id`
- `title`
- `body`
- `status`
- `priority`
- `assignee_user_id`
- `due_at`
- `completed_at`
- `metadata`
- timestamps

#### `crm_segments`

- `id`
- scope column
- `name`
- `entity_type`
- `filter_definition jsonb`
- `is_dynamic`
- `is_shared`
- timestamps

#### `crm_communications`

Optional early, stronger later.

- `id`
- scope column
- `entity_type`
- `entity_id`
- `channel`
- `direction`
- `subject`
- `body_preview`
- `external_thread_id`
- `sent_at`
- `metadata`

#### `crm_custom_fields`

- `id`
- scope column
- `entity_type`
- `field_key`
- `label`
- `field_type`
- `config jsonb`
- `is_required`
- `is_active`

#### `crm_custom_field_values`

Or JSON strategy if wanting fewer tables early. For long-term CRM, proper field model wins.

#### `crm_record_links`

For future graph-like relations beyond first-class junctions.

- `id`
- `from_entity_type`
- `from_entity_id`
- `to_entity_type`
- `to_entity_id`
- `link_type`
- `metadata`

#### `crm_import_jobs`

- `id`
- scope column
- `source_type`
- `status`
- `mapping jsonb`
- `summary jsonb`
- timestamps

### Near-term migration strategy from current schema

Do not hard-break the existing app immediately.

Safer path:

1. keep `contacts` alive as compatibility layer
2. add new CRM tables beside current schema
3. migrate UI to CRM shell gradually
4. later decide whether `contacts` becomes:
   - deprecated legacy table
   - or renamed / migrated into `crm_people`

## Cross-module role of CRM in aikit

This is the key architectural point.

CRM is not a silo. It is shared infrastructure.

### Other modules that should depend on CRM

Campaigns:

- target segments
- linked organizations
- linked creators
- linked stakeholders

Content:

- content tied to campaign
- content tied to audience segment
- performance tied back to deal/account context later

Automations:

- imported intelligence should suggest create/update CRM records
- runs should be attachable to people/org/deal/campaign

AI agents:

- CRM should become structured memory for GTM agents
- agent can summarize account history
- prepare follow-ups
- suggest next actions

Billing / finance later:

- won deals can hand off to invoice or revenue modules

Support / service later:

- customer issues and health state should attach to the same account graph

## UX direction: wide, compact, rich, still controlled

User request is clear: wide, compact, feature-rich.

That should translate to:

- app-shell layout, not narrow module card layout
- left nav for CRM sub-apps
- top toolbar for view switching, search, filters, bulk actions
- center grid/list area
- right contextual drawer for record details
- keyboard-first quick actions
- dense but readable rows
- cross-record breadcrumbs

### Recommended visual shell

- full-width workspace canvas
- sticky header
- sticky filter bar
- resizable list/detail split later
- command palette for create/search/jump

### Density principle

Compact does not mean noisy.

Need:

- progressive disclosure
- summary first, detail on demand
- stable record cards/rows
- consistent chips and badges
- fast scanning states

## Technical architecture for frontend

### Recommended frontend structure

- `src/apps/crm/`
  - `shell/`
  - `routes/`
  - `people/`
  - `organizations/`
  - `leads/`
  - `deals/`
  - `activities/`
  - `tasks/`
  - `campaigns/`
  - `segments/`
  - `imports/`
  - `settings/`
  - `shared/`

### Shared frontend primitives needed

- `RecordTable`
- `RecordFiltersBar`
- `SavedViewPicker`
- `RecordDetailDrawer`
- `ActivityComposer`
- `TaskComposer`
- `EntityLinkPicker`
- `BulkActionBar`
- `ImportMappingWizard`

### Data hooks

Current `useEntity()` is good for basic CRUD but too thin for CRM scale.

Eventually we need:

- query hooks with richer filtering
- view definitions
- pagination / infinite loading
- optimistic mutation per domain
- relation loaders
- dedupe / merge actions
- bulk update actions

## Phased implementation plan

This is the recommended order.

### Phase 0 - CRM framing and shell

Goal:

- stop treating CRM as only `contact-manager`

Deliverables:

- define new route namespace for CRM app
- create CRM app shell
- keep current module alive as fallback/bridge
- establish domain naming conventions

Decision gate:

- approve CRM as top-level app suite

### Phase 1 - Data foundation hardening

Goal:

- prepare schema for real CRM growth

Deliverables:

- introduce `organizations`
- introduce `tasks`
- enrich `activities`
- define lifecycle vocabularies
- define ownership model
- define source tracking model
- add indexes for CRM list views

Decision gate:

- agree on canonical object model before UI explosion

### Phase 2 - People and Organizations app

Goal:

- replace simple contact manager with real identity graph

Deliverables:

- People app
- Organizations app
- relationship linking
- merged detail drawer
- dedupe indicators
- activity timeline per record
- quick task creation

Success criteria:

- one person record can safely support other modules

### Phase 3 - Leads app

Goal:

- formalize qualification workflow

Deliverables:

- source tracking
- lead stages
- scoring
- owner queues
- convert lead flow
- lost/disqualified reasons

Success criteria:

- inbound automation outputs can land here cleanly

### Phase 4 - Deals and Pipeline app

Goal:

- add commercial engine

Deliverables:

- pipelines
- stages
- deal board
- expected revenue views
- stage movement logging
- next-step task enforcement

Success criteria:

- CRM now manages revenue motion, not only contacts

### Phase 5 - Segments, saved views, and bulk ops

Goal:

- make CRM operationally powerful

Deliverables:

- saved views
- dynamic segments
- column configs
- bulk tag/status/owner updates
- export views

Success criteria:

- users can work at scale without drowning in rows

### Phase 6 - Imports and data quality

Goal:

- safely absorb outside data

Deliverables:

- CSV import wizard
- field mapping
- duplicate preview
- merge flow
- import job history

Success criteria:

- automation outputs and spreadsheets can become CRM fuel

### Phase 7 - Campaign and content deep links

Goal:

- CRM becomes growth operating layer

Deliverables:

- segments feed campaigns
- campaigns link to deals/accounts/people
- content and reports tie back to CRM graph
- automation runs attach to CRM records

Success criteria:

- marketing modules stop feeling isolated

### Phase 8 - Inbox and communication intelligence

Goal:

- unify relationship history

Deliverables:

- communication log model
- email/thread logging
- message summaries
- AI follow-up suggestions

Success criteria:

- timeline becomes genuinely useful for daily operations

### Phase 9 - Team workflows and permissions

Goal:

- make CRM workspace-grade

Deliverables:

- team ownership
- queue-based views
- role permissions
- SLA logic
- assignment rules

Success criteria:

- CRM ready for real multi-user operations

## What to build now vs later

### Build now

- CRM app shell
- organizations
- tasks
- richer activities
- people/organization split
- leads workflow
- saved views foundation

### Build soon after

- deals pipelines
- imports
- dedupe + merge
- segments

### Delay until usage proves it

- full omnichannel inbox sync
- advanced forecasting
- heavy custom object builder
- enterprise permission matrix
- complex attribution engine

## Key risks to avoid

### Risk 1: keeping everything inside `contacts`

This will make:

- poor reporting
- bad dedupe
- weak deal/account support
- hard integration with other modules

### Risk 2: building screens before object model is locked

You will move faster for two weeks and slower for six months.

### Risk 3: overgeneralizing too early

Do not start with "custom objects for everything".

First lock:

- people
- organizations
- leads
- deals
- activities
- tasks

### Risk 4: treating campaigns and CRM as separate worlds

Aikit's strength should be the opposite:

- campaign, content, automation, and CRM share one relationship graph

## Recommended decision set

If we choose today, the best decision set is:

1. Reposition `contact-manager` into `CRM` app suite.
2. Move from single `contacts` worldview to `people + organizations + leads + deals`.
3. Keep CRM as the shared identity and workflow backbone for other modules.
4. Add `tasks`, richer `activities`, and saved views before chasing fancy UI polish.
5. Build wide compact shell UX, but only on top of a clean record architecture.

## Immediate execution proposal

If we want the smartest next implementation path in this repo, do this next:

1. create CRM route namespace and shell
2. define new schema draft for `organizations`, `tasks`, `leads`, `pipelines`, `deals`
3. migrate current Contact Manager UI into `People` app inside CRM shell
4. add `Organizations` app
5. add `Leads` app
6. only then add `Deals` board

That path keeps momentum high without building the wrong house bigger.

## External benchmark notes

Research was informed by current public benchmark material accessed on 2026-07-06:

- [Attio CRM review (TechRadar, June 2026)](https://www.techradar.com/pro/software-services/attio-crm-review)
- [HubSpot CRM review (TechRadar, April 2026)](https://www.techradar.com/reviews/hubspot-crm-review)
- [Pipedrive CRM review (TechRadar, April 2026)](https://www.techradar.com/reviews/pipedrive-crm-review)
- [Salesforce company/platform overview (Wikipedia, accessed via web search)](https://en.wikipedia.org/wiki/Salesforce)

These were used as market-shape inputs, not as a direct feature checklist.
