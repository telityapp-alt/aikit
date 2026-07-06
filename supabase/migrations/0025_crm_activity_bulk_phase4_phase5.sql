-- aikit - CRM activity composer + bulk ops phase 4/5
-- Expands activities vocabulary for richer CRM logging while staying backward-compatible.

alter table public.activities
  drop constraint if exists activities_activity_type_check;

alter table public.activities
  add constraint activities_activity_type_check
  check (
    activity_type in (
      'note',
      'call',
      'call_outbound',
      'call_inbound',
      'email',
      'email_outbound',
      'email_inbound',
      'meeting',
      'task',
      'status_change',
      'owner_change',
      'system',
      'import',
      'import_event',
      'automation',
      'automation_event'
    )
  );

create index if not exists activities_user_type_happened_idx
  on public.activities(user_id, entity_type, activity_type, happened_at desc);
