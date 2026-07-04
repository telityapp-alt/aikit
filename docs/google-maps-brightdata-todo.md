# Google Maps Bright Data TODO

## Goal

Rebuild `google-maps-leads-brightdata` on the fresh automation stack without touching dashboard styling, cover assets, or non-automation modules.

## Product Scope

- Run from the new automation worker only
- Store runs, artifacts, and audit logs in the automation-specific Supabase schema
- Support production-grade lead output for Google Maps business scraping
- Keep dashboard shell and visual language unchanged

## Backend

- Finalize Bright Data provider contract and request schema
- Define normalized input shape for:
  - keyword
  - location
  - language
  - max results
  - enrichment toggles
- Build worker module for `google-maps-leads-brightdata`
- Add queue processing and retry policy
- Persist raw payload snapshot for debugging
- Persist normalized business rows and run summary
- Generate downloadable artifact payloads
- Add audit events for queued, running, completed, failed

## Data

- Confirm final automation tables are enough for Google Maps output
- Decide whether lead rows live inside `runs.output` or a dedicated detail table
- Define output contract for:
  - place id
  - business name
  - category
  - address
  - phone
  - email
  - website
  - socials
  - rating
  - reviews count
  - opening hours
  - coordinates
  - source url
  - enrichment metadata

## Frontend

- Add real form component for `google-maps-leads-brightdata`
- Keep current dashboard styling and product-card system
- Add run state UX: queued, running, success, failed
- Add artifact preview and clean JSON/export view
- Evaluate embedded map UX:
  - phase 1: static result cards plus coordinate links
  - phase 2: interactive Google Maps-style visualization if provider and licensing are safe

## Quality

- Add validation tests for input schema
- Add worker tests for provider failure and partial enrichment
- Add empty-state and error-state UI checks
- Verify rate-limit and credit behavior
- Verify run output still appears under dashboard File tab

## Launch Checklist

- Env vars wired for automation-only stack
- Bright Data secret added in worker environment
- New automation row active in automation catalog
- Production dry run with known keyword/location
- Result payload reviewed against sales team needs
