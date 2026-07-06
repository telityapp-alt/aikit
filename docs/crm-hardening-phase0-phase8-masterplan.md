# CRM Hardening Phase 0-8 Masterplan

Updated: 2026-07-06

## Goal

Turn the current CRM foundation into a true workspace-grade operating layer that can support:

- real click-flow validation
- multi-role usage
- safe archive/delete/restore actions
- richer activity capture
- bulk operations across all core entities
- related-record navigation
- deeper reporting
- live settings and policy control
- enrichment, SLA logic, assignments, and automation triggers

This document continues the earlier CRM foundation plans:

- [crm-multi-app-masterplan.md](C:/Nabil/aikit-blue/docs/crm-multi-app-masterplan.md:1)
- [crm-foundation-phase0-phase1-plan.md](C:/Nabil/aikit-blue/docs/crm-foundation-phase0-phase1-plan.md:1)

## Current state audit

As of 2026-07-06, the repo already has:

- CRM app shell under `/dashboard/apps/crm/*`
- canonical people, organizations, leads, deals, tasks, segments, import jobs
- saved views for people
- duplicate merge RPC for people
- compact workspace tables for people, organizations, leads, deals, tasks
- record detail panes with quick task creation
- import pipeline writing to canonical CRM tables

What still remains weak or incomplete:

- no end-to-end browser validation
- no role/permission model beyond workspace-user scoping
- no unified archive/delete/restore semantics
- no advanced note/call/email composer
- bulk ops are strongest only in people
- related records are summarized, but not truly navigable as first-class jumps
- settings is not yet the real control plane for policies
- reporting is still overview-light
- no enrichment and automation orchestration layer yet

## Research synthesis

This section is an inference based on current public benchmark material and current repo state.

Modern CRMs consistently treat the following as first-class platform services:

1. validation and reliable click-flow UX
2. role-based controls and ownership boundaries
3. reversible lifecycle actions on records
4. multi-channel activity capture
5. scalable bulk operation surfaces
6. deeply linked record graph navigation
7. reporting and queue visibility
8. workspace-level configuration
9. event-driven automations

The product-shape signal is consistent across current public benchmark material:

- HubSpot tends to unify CRM, segmentation, automation, and reporting in one customer platform.
- Pipedrive emphasizes compact sales execution, visual pipeline movement, activities, and usability.
- Attio emphasizes flexible object modeling, modern permissions, workflows, and reporting.

These are not copied as a checklist, but they confirm the direction we should take for aikit.

## North star for this stream

The next CRM stream should make aikit CRM behave like:

**a workspace-grade relationship operating system with policy, validation, and automation control**

Not just:

- record CRUD
- pretty list screens
- isolated entity views

## Scope map

This stream covers:

### 1. Browser / E2E validation

Needed because:

- wide compact CRM UIs fail in real usage if click flow is not verified
- detail drawers, inline forms, quick actions, and bulk actions are easy to break

Must validate:

- navigation into each CRM sub-app
- row click opens detail pane
- form edits persist
- quick task creation works
- imports open and parse
- bulk actions complete correctly
- lead conversion works
- deal stage movement works

### 2. Permissions and roles

Needed because:

- current data model is user-scoped, but not workspace-role-aware
- future CRM must support at least ownership and action boundaries

Target role baseline:

- `admin`
- `manager`
- `rep`
- `viewer`

Action groups:

- view record
- edit owned record
- edit any record
- delete record
- archive / restore
- export
- manage settings
- manage automation rules

### 3. Delete / archive / restore

Needed because:

- records need reversible lifecycle semantics
- archive is safer than delete for most CRM usage

Rules:

- archive should be default destructive action
- hard delete should be gated
- restore should preserve relations
- activities should log all destructive lifecycle events

### 4. Activity composer expansion

Needed because:

- timelines become valuable only when entries are meaningful and structured

Activity types to support:

- note
- outbound call
- inbound call
- outbound email
- inbound email
- meeting
- status change
- owner reassignment
- automation event
- import event

### 5. Bulk ops across leads, deals, tasks

Needed because:

- scale work happens in tables, not one row at a time

Target bulk actions:

- update owner
- update status
- update stage
- add/remove tags
- create tasks for selected records
- archive selected records

### 6. Related-record navigation

Needed because:

- summary counts are not enough
- users need to jump from person -> org -> lead -> deal -> task -> campaign context

Target behavior:

- related lists inside detail panel
- click related item to open that record in-place
- preserve current section context when possible

### 7. Reporting and dashboards

Needed because:

- CRM becomes operational only when the team can see flow, backlog, conversion, and aging

First reporting pack:

- lead funnel by stage
- lead SLA overdue
- task backlog by assignee / priority
- deal pipeline value by stage
- stale deal report
- source breakdown
- import quality trend

### 8. Live settings workspace

Needed because:

- CRM logic should not stay hidden in code forever
- team behavior needs a visible control plane

Settings areas:

- lifecycle vocabulary
- role model
- archive policy
- SLA defaults
- assignment rules
- activity composer options
- reporting pack toggles
- automation trigger catalog

### 9. Enrichment and automations

Needed because:

- CRM should react to events and improve data quality automatically

Near-term enrichment targets:

- normalize domains
- detect missing owner
- suggest org from email domain
- enrich tags from imports or automations

Near-term automation triggers:

- lead created
- lead untouched beyond SLA
- deal stage changed
- deal stale
- import completed
- note/call/email logged

## Delivery strategy

This stream should not start by adding ten half-working features.

It should move in this order:

### Phase 0 - Control plane framing

Goal:

- define the hardening surface before deeper feature work

Deliverables:

- complete planning document
- capability taxonomy
- settings workspace foundation
- role vocabulary
- archive policy vocabulary
- activity composer vocabulary
- automation trigger catalog
- reporting pack catalog
- acceptance criteria map for all following phases

Success criteria:

- next phases have stable naming, scope, and readiness states
- settings is no longer a placeholder

### Phase 1 - Validation and instrumentation

Goal:

- make the CRM testable and observable

Deliverables:

- browser/E2E spec matrix
- stable selectors / test ids where needed
- click-flow smoke tests
- instrumentation for key actions

Success criteria:

- real user flows can be verified consistently

### Phase 2 - Permissions and ownership hardening

Goal:

- add granular action safety

Deliverables:

- role definitions
- permission matrix
- ownership semantics
- UI gating for restricted actions
- data-layer enforcement plan

### Phase 3 - Archive / restore / delete consistency

Goal:

- make lifecycle actions safe and reversible

Deliverables:

- unified record action model
- archive views
- restore flows
- guarded hard delete paths
- timeline logging for lifecycle actions

### Phase 4 - Activity composer expansion

Goal:

- turn timeline into a real operating log

Deliverables:

- note composer
- call composer
- email log composer
- metadata model for richer activities
- activity filtering

### Phase 5 - Bulk ops for all major entities

Goal:

- support scale work from tables

Deliverables:

- selection model for leads, deals, tasks
- bulk update actions
- bulk archive
- bulk task creation
- confirmation and audit UI

### Phase 6 - Related graph navigation

Goal:

- let users move through the CRM graph fluidly

Deliverables:

- related lists with navigation
- in-panel record jumps
- cross-record breadcrumbs
- reusable entity link primitives

### Phase 7 - Reporting and settings maturity

Goal:

- make CRM manageable as an operating system

Deliverables:

- deeper dashboards
- queue reports
- funnel reports
- source reports
- live settings persistence

### Phase 8 - Enrichment, SLA, assignment, automation

Goal:

- make CRM proactive

Deliverables:

- assignment rules
- SLA timers
- reminder logic
- automation trigger engine
- enrichment pass hooks

## Cross-cutting rules for all phases

### Rule 1

Prefer archive over delete.

### Rule 2

Every meaningful mutation should be loggable in timeline history.

### Rule 3

Settings should use canonical vocabularies that the rest of the app consumes.

### Rule 4

Bulk actions should always have dry summary and confirmation UX.

### Rule 5

Navigation should favor in-context detail jumps instead of route sprawl where possible.

## Phase 0 implementation plan

Phase 0 in repo should ship:

1. planning masterdoc
2. CRM control-plane config module
3. live settings workspace replacing placeholder
4. readiness/risk matrix visible in UI
5. canonical vocabularies for:
   - roles
   - permissions
   - archive policies
   - activity types
   - reporting packs
   - automation triggers

This is intentionally not the same as “all settings are persisted already”.

Phase 0 means:

- the app now knows what it will govern
- the user can inspect the hardening surface inside CRM itself
- the next implementation phases stop being vague

## External benchmark notes

Research inputs were checked on 2026-07-06:

- [Attio CRM review (TechRadar, June 2026)](https://www.techradar.com/pro/software-services/attio-crm-review)
- [HubSpot CRM review (TechRadar, April 2026)](https://www.techradar.com/reviews/hubspot-crm-review)
- [Pipedrive CRM review (TechRadar, April 2026)](https://www.techradar.com/reviews/pipedrive-crm-review)

These were used as market-shape references only. The implementation plan in this repo is still driven primarily by aikit's own shared-schema architecture and current product state.
