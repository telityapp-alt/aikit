# CRM Foundation Phase 0-1 Plan

Updated: 2026-07-06

## Goal

Turn CRM into the first real foundation of aikit so every module can connect to the same business records instead of maintaining siloed data.

This document focuses on:

- canonical field map per entity
- bridge architecture across modules
- migration plan from current `contacts` to shared CRM schema
- implementation scope for Phase 0 and Phase 1

This is the operational companion to [crm-multi-app-masterplan.md](C:/Nabil/aikit-blue/docs/crm-multi-app-masterplan.md:1).

## Core principle

CRM is not another module.

CRM is:

- the canonical identity layer
- the canonical relationship layer
- the canonical workflow layer for GTM and customer-facing modules

Every module should either:

- read CRM records
- attach activity/context to CRM records
- produce data that can be linked back to CRM records

## Canonical field map per entity

The rule is simple:

- fields used across multiple modules become canonical
- fields used in filtering, sorting, linking, ownership, or reporting must be first-class columns
- provider-specific or temporary fields can stay in `metadata jsonb`

## 1. People

Canonical table:

- `crm_people`

Purpose:

- one canonical person record for any human the workspace relates to

Canonical fields:

- `id`
- `user_id`
- `legacy_contact_id`
- `display_name`
- `primary_email`
- `primary_phone`
- `job_title`
- `status`
- `lifecycle_stage`
- `owner_user_id`
- `primary_organization_id`
- `source_type`
- `source_ref`
- `linkedin_url`
- `social_handles`
- `tags`
- `metadata`
- `last_activity_at`
- `next_follow_up_at`
- timestamps

Field semantics:

- `status`
  - operational record state
  - example: `active`, `inactive`, `archived`
- `lifecycle_stage`
  - commercial relationship state
  - example: `lead`, `prospect`, `customer`, `partner`, `advocate`
- `source_type`
  - origin channel
  - example: `manual`, `import`, `automation`, `campaign`, `api`
- `source_ref`
  - external reference or internal source pointer

Modules that should consume these fields:

- CRM People
- Leads
- Deals
- Campaigns
- Marketing Growth
- Automation imports
- AI Agents

## 2. Organizations

Canonical table:

- `crm_organizations`

Purpose:

- one canonical business/account/company record

Canonical fields:

- `id`
- `user_id`
- `legacy_company_key`
- `name`
- `name_normalized`
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

Why separate from people:

- multiple people can belong to one organization
- one person can move across organizations
- deals and campaigns often target organizations, not just individuals

Modules that should consume these fields:

- CRM Organizations
- Deals
- Campaigns
- Marketing Growth
- Account-based workflows later

## 3. Person-Organization relationships

Canonical table:

- `crm_person_organizations`

Purpose:

- relationship bridge between people and organizations

Canonical fields:

- `id`
- `person_id`
- `organization_id`
- `relationship_type`
- `job_title`
- `is_primary`
- `start_date`
- `end_date`
- `metadata`
- timestamps

Example `relationship_type` values:

- `employee`
- `founder`
- `decision_maker`
- `advisor`
- `creator_partner`
- `vendor_contact`

This table is the first proof that aikit modules are connected through explicit bridges, not guessed from text fields.

## 4. Leads

Canonical table:

- `crm_leads`

Purpose:

- intake and qualification workflow

Canonical fields:

- `id`
- `user_id`
- `person_id`
- `organization_id`
- `source_type`
- `source_ref`
- `source_campaign_id`
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

Lead-specific notes:

- `stage` is workflow progression
- `status` is operational state
- a lead can exist before full person or organization records are confirmed

Modules that should consume these fields:

- CRM Leads
- Marketing Growth
- Sales pipeline
- Automation ingestion

## 5. Deals

Canonical tables:

- `crm_deals`
- `crm_pipelines`
- `crm_pipeline_stages`
- `crm_deal_people`

Purpose:

- commercial workflow and revenue motion

Canonical deal fields:

- `id`
- `user_id`
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
- `campaign_id`
- `metadata`
- timestamps

Canonical pipeline fields:

- pipeline name
- stage ordering
- stage probability
- won/lost closure markers

Modules that should consume these fields:

- CRM Deals
- Campaign attribution later
- Finance / billing later
- AI sales copilots later

## 6. Activities

Canonical table:

- `activities` in Phase 1, enriched to support CRM-wide usage

Purpose:

- universal relationship history and system event log

Canonical fields:

- `id`
- `user_id`
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

Phase 1 supported entity types should include:

- `contact`
- `person`
- `organization`
- `lead`
- `deal`
- `campaign`
- `content_post`
- `task`

Why this matters:

- every module can read the same timeline spine
- CRM, campaigns, content, automations, and AI can all append context to the same history

## 7. Tasks

Canonical table:

- `crm_tasks`

Purpose:

- one generic work queue tied to CRM records

Canonical fields:

- `id`
- `user_id`
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

Why separate from activities:

- tasks are actionable queue items
- activities are history

Modules that should consume these fields:

- CRM overview
- Leads
- Deals
- Campaigns
- AI reminder/queue assistance

## 8. Generic record links

Canonical table:

- `crm_record_links`

Purpose:

- generic bridge layer for cross-domain relationships that are not worth hard-coding on day one

Canonical fields:

- `id`
- `user_id`
- `from_entity_type`
- `from_entity_id`
- `to_entity_type`
- `to_entity_id`
- `link_type`
- `metadata`
- timestamps

Examples:

- `automation_run -> person`
- `automation_run -> organization`
- `campaign -> lead`
- `content_post -> deal`

This is one of the main enablers for modules feeling connected.

## Bridge architecture across modules

## Principle

Modules should not own customer truth.

Modules should own:

- their workflow UI
- their module-specific metadata
- their module-specific outputs

But they should attach to shared CRM records using canonical IDs and explicit bridges.

## Bridge layers

### Layer A: Canonical entity tables

Shared source of truth:

- `crm_people`
- `crm_organizations`
- `crm_leads`
- `crm_deals`
- `crm_tasks`
- `activities`

### Layer B: Explicit relationship tables

Explicit joins:

- `crm_person_organizations`
- `crm_deal_people`
- `campaign_contacts` now, later should map to people/org strategy
- `crm_record_links`

### Layer C: Module-owned artifacts with CRM pointers

Examples:

- `campaigns`
  - links to people, organizations, leads, deals, segments
- `content_posts`
  - links to campaign
  - may later link to person, org, deal using `crm_record_links`
- `runs`
  - automation outputs can link to CRM records via `crm_record_links`

## Bridge matrix by module

### CRM -> Campaign Manager

Shared bridge:

- target people
- target organizations
- stakeholders
- creator roster
- campaign-linked leads

Recommended implementation:

- keep `campaigns`
- gradually evolve `campaign_contacts`
- add `crm_record_links` for broader attachments

### CRM -> Content Calendar

Shared bridge:

- campaign relation
- audience/segment relation
- optional person/org/deal relation later

Recommended implementation:

- keep `campaign_id`
- use `crm_record_links` for non-campaign relationship expansion

### CRM -> Marketing Growth module later

Shared bridge:

- shared lead and account records
- segments
- lifecycle stage
- activities
- tasks

### CRM -> Automation runs

Shared bridge:

- import jobs create/update CRM records
- runs can attach to person/org/lead/deal via `crm_record_links`
- `source_type` and `source_ref` trace where each record came from

### CRM -> AI Agents

Shared bridge:

- structured memory comes from CRM records
- agent actions create activities and tasks
- AI suggestions point to canonical IDs, not free text

## Migration plan: from `contacts` to shared CRM schema

## Current state

Current `contacts` table mixes:

- person identity
- company label
- lifecycle hints
- follow-up hints
- free-form notes

That is acceptable as a bootstrap table, but not as the long-term foundation.

## Migration target

Move from:

- `contacts`

To:

- `crm_people`
- `crm_organizations`
- `crm_person_organizations`
- `crm_leads`

while keeping legacy UI operational during transition.

## Migration strategy

### Phase M1: additive schema

Add new shared CRM tables without removing legacy tables.

Result:

- no breaking production behavior
- new features can start using canonical schema

### Phase M2: backfill

Backfill legacy `contacts` into:

- `crm_people`
- `crm_organizations`
- `crm_person_organizations`

Rules:

- one contact becomes one person
- `company` becomes organization when present
- organization rows deduplicate by `(user_id, normalized company name)`
- person gets linked to organization if company exists

### Phase M3: sync bridge

During transition, keep legacy `contacts` and new CRM records synchronized.

Recommended Phase 1 bridge:

- trigger on `contacts`
- create/update matching `crm_people`
- upsert organization by normalized company name
- refresh person-organization relationship
- delete mirrored person if legacy contact deleted

This keeps the old Contact Manager alive while new CRM foundation grows.

### Phase M4: progressive UI cutover

Order:

1. CRM shell
2. CRM People reads `crm_people`
3. legacy Contact Manager becomes bridge entrypoint
4. modules begin linking to canonical CRM IDs

### Phase M5: deprecate legacy contact semantics

Once enough UI is migrated:

- legacy `contacts.type` stops being the primary lifecycle model
- `crm_leads` and `crm_people.lifecycle_stage` become source of truth

### Phase M6: optional final clean-up

Only after all consumers are migrated:

- freeze writes to legacy `contacts`
- make it compatibility-only
- later archive or replace

## Phase 0 implementation scope

Phase 0 should deliver:

- app namespace under `/dashboard/apps/crm`
- CRM shell with internal sections
- navigation bridge from dashboard/module world to CRM app world
- safe coexistence with existing modules

Production-grade meaning for Phase 0:

- deep-linkable
- route-stable
- not breaking legacy module paths
- clear entrypoint for future CRM sub-apps

## Phase 1 implementation scope

Phase 1 should deliver:

- shared CRM schema tables
- stronger `activities` schema
- sync bridge from `contacts`
- backfill migration from existing `contacts`
- default integrity constraints, indexes, RLS, triggers

Production-grade meaning for Phase 1:

- additive and safe
- user-scoped via current RLS model
- indexed for list and linkage use
- forward-compatible with future CRM apps

## Decisions locked by this plan

1. `contacts` is no longer the final model.
2. `crm_people` and `crm_organizations` are the canonical identity foundation.
3. Leads and deals are separate workflow objects, not just tags.
4. Shared IDs and relationship tables are the bridge across modules.
5. Migration must be additive first, not destructive.

## Recommended immediate build order

1. add technical schema migration
2. add CRM app registry and route namespace
3. add CRM shell with overview and early sections
4. redirect legacy `contact-manager` entrypoints to CRM app
5. keep legacy module alive while data bridge runs underneath
