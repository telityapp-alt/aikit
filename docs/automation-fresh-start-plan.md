# Automation Fresh Start Plan

## Goal
- Keep the current app/auth Supabase untouched.
- Move automation storage onto a separate Supabase project.
- Let the migration happen gradually without breaking the current dashboard shell.

## Rule of engagement
- Auth stays on the current app Supabase.
- Automation reads/writes move to `AUTOMATION_SUPABASE_*`.
- If the new automation env vars are not present yet, runtime falls back to the current Supabase so the app remains stable during migration.

## Fresh automation database scope
- `automations`
- `runs`
- `generated_artifacts`
- `automation_audit_logs`

## Important design choice
- Fresh automation tables use `workspace_user_id text`, not `auth.users` foreign keys.
- This keeps the new automation database independent from the current auth project.
- Worker authenticates the user against the current app Supabase, then stores the user identity in the fresh automation database as workspace metadata.

## Next migration steps
1. Move dashboard recent runs / files / automation catalog reads to worker API.
2. Port generic run creation to the fresh automation database.
3. Rebuild new Bright Data automations on top of the fresh database.
4. Leave legacy Apify reports and tables untouched until final archive.
