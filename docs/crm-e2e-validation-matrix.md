# CRM E2E Validation Matrix

Updated: 2026-07-06

## Purpose

This document defines the browser validation scope for CRM hardening Phase 1.

It exists so the team can distinguish between:

- test harness readiness
- selector / instrumentation readiness
- real browser execution against a live authenticated workspace

## Current status

### Ready in repo

- Playwright config exists in [playwright.config.js](C:/Nabil/aikit-blue/playwright.config.js:1)
- CRM smoke spec exists in [e2e/crm-smoke.spec.js](C:/Nabil/aikit-blue/e2e/crm-smoke.spec.js:1)
- stable `data-testid` hooks exist across CRM shell and key workspaces
- test discovery was verified locally with `npx.cmd playwright test --list`

### Verified on 2026-07-06

- `npm.cmd run build` succeeded
- Playwright suite discovery succeeded
- direct Playwright browser execution inside sandbox failed with `spawn EPERM`

### Not yet completed

- full authenticated browser run against live workspace

Reason:

- the browser needs unsandboxed launch
- current smoke flow logs into a real account
- current smoke flow performs live CRM mutations
- that runtime path requires explicit approval

## Scope matrix

### Flow A - CRM shell smoke

Route:

- `/dashboard/apps/crm/overview`

Checks:

- CRM shell renders
- nav items render
- overview section renders

Status:

- implemented

### Flow B - People workspace smoke

Route:

- `/dashboard/apps/crm/people`

Checks:

- people filters render
- saved view controls render
- person detail panel can appear on row click when data exists

Status:

- implemented in selector surface

### Flow C - Organizations workspace smoke

Route:

- `/dashboard/apps/crm/organizations`

Checks:

- compact table renders
- create organization flow opens detail panel
- save action is targetable

Status:

- implemented

Risk:

- live mutation

### Flow D - Tasks workspace smoke

Route:

- `/dashboard/apps/crm/tasks`

Checks:

- task table renders
- create task opens detail panel
- save action is targetable

Status:

- implemented

Risk:

- live mutation

### Flow E - Deals workspace smoke

Route:

- `/dashboard/apps/crm/deals`

Checks:

- deals workspace renders
- table / board toggle works

Status:

- implemented

### Flow F - Settings control plane smoke

Route:

- `/dashboard/apps/crm/settings`

Checks:

- settings control plane renders
- stream map renders

Status:

- implemented

## Required env for live execution

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

Optional:

- `E2E_BASE_URL`
- `E2E_PORT`

## Recommended execution modes

### Safe local validation

- `npm.cmd run build`
- `npx.cmd playwright test --list`

### Real browser validation

- requires browser launch outside sandbox
- requires explicit approval if using live account credentials

## Next improvements

1. Add read-only authenticated smoke path if a dedicated fixture account is available.
2. Split mutation tests into a separate suite:
   - `crm-readonly.spec.js`
   - `crm-mutations.spec.js`
3. Add cleanup strategy for created E2E records.
4. Add screenshot baselines only after core click flows are stable.
