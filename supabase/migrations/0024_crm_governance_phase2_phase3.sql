-- aikit - CRM governance phase 2/3
-- Adds role vocabulary, archive audits, and lifecycle RPCs for archive/restore/delete safety.

alter table public.profiles
  add column if not exists crm_role text not null default 'admin'
    check (crm_role in ('admin', 'manager', 'rep', 'viewer')),
  add column if not exists crm_archive_policy text not null default 'archive_first'
    check (crm_archive_policy in ('archive_first', 'restore_supported', 'delete_guarded')),
  add column if not exists crm_permissions_override jsonb not null default '{}'::jsonb;

create table if not exists public.crm_archive_audits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  entity_type       text not null
                    check (entity_type in ('person', 'organization', 'lead', 'deal', 'task')),
  entity_id         uuid not null,
  action_type       text not null
                    check (action_type in ('archived', 'restored', 'delete_blocked', 'deleted')),
  actor_user_id     uuid not null references auth.users(id) on delete cascade,
  reason            text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists crm_archive_audits_user_entity_idx
  on public.crm_archive_audits(user_id, entity_type, created_at desc);

alter table public.crm_archive_audits enable row level security;

drop policy if exists "crm_archive_audits_own" on public.crm_archive_audits;
create policy "crm_archive_audits_own" on public.crm_archive_audits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.crm_people
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

alter table public.crm_organizations
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

alter table public.crm_leads
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

alter table public.crm_deals
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

alter table public.crm_tasks
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

alter table public.crm_segments
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

alter table public.crm_saved_views
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

alter table public.crm_import_jobs
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

create index if not exists crm_people_archived_idx
  on public.crm_people(user_id, archived_at desc) where archived_at is not null;
create index if not exists crm_organizations_archived_idx
  on public.crm_organizations(user_id, archived_at desc) where archived_at is not null;
create index if not exists crm_leads_archived_idx
  on public.crm_leads(user_id, archived_at desc) where archived_at is not null;
create index if not exists crm_deals_archived_idx
  on public.crm_deals(user_id, archived_at desc) where archived_at is not null;
create index if not exists crm_tasks_archived_idx
  on public.crm_tasks(user_id, archived_at desc) where archived_at is not null;

create or replace function public.crm_has_permission(
  p_action text,
  p_workspace_user_id uuid,
  p_record_owner_user_id uuid default null,
  p_assignee_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_role text;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    return false;
  end if;

  if v_actor_user_id <> p_workspace_user_id then
    return false;
  end if;

  select crm_role
  into v_role
  from public.profiles
  where id = v_actor_user_id;

  v_role := coalesce(v_role, 'admin');

  case p_action
    when 'view' then
      return v_role in ('admin', 'manager', 'rep', 'viewer');
    when 'edit' then
      return v_role in ('admin', 'manager')
        or (v_role = 'rep' and p_record_owner_user_id = v_actor_user_id);
    when 'archive' then
      return v_role in ('admin', 'manager')
        or (v_role = 'rep' and p_record_owner_user_id = v_actor_user_id);
    when 'restore' then
      return v_role in ('admin', 'manager');
    when 'delete' then
      return v_role = 'admin';
    when 'assign' then
      return v_role in ('admin', 'manager');
    when 'manage_settings' then
      return v_role = 'admin';
    when 'export' then
      return v_role in ('admin', 'manager');
    when 'create_task' then
      return v_role in ('admin', 'manager', 'rep');
    when 'log_activity' then
      return v_role in ('admin', 'manager', 'rep');
    else
      return false;
  end case;
end;
$$;

create or replace function public.crm_write_archive_audit(
  p_workspace_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action_type text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crm_archive_audits (
    user_id,
    entity_type,
    entity_id,
    action_type,
    actor_user_id,
    reason,
    metadata
  )
  values (
    p_workspace_user_id,
    p_entity_type,
    p_entity_id,
    p_action_type,
    auth.uid(),
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.crm_archive_record(
  p_entity_type text,
  p_record_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_workspace_user_id uuid;
  v_owner_user_id uuid;
  v_assignee_user_id uuid;
  v_previous_status text;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  case p_entity_type
    when 'person' then
      select user_id, owner_user_id, status
      into v_workspace_user_id, v_owner_user_id, v_previous_status
      from public.crm_people
      where id = p_record_id;
    when 'organization' then
      select user_id, owner_user_id, status
      into v_workspace_user_id, v_owner_user_id, v_previous_status
      from public.crm_organizations
      where id = p_record_id;
    when 'lead' then
      select user_id, owner_user_id, status
      into v_workspace_user_id, v_owner_user_id, v_previous_status
      from public.crm_leads
      where id = p_record_id;
    when 'deal' then
      select user_id, owner_user_id, status
      into v_workspace_user_id, v_owner_user_id, v_previous_status
      from public.crm_deals
      where id = p_record_id;
    when 'task' then
      select user_id, null::uuid, status, assignee_user_id
      into v_workspace_user_id, v_owner_user_id, v_previous_status, v_assignee_user_id
      from public.crm_tasks
      where id = p_record_id;
    else
      raise exception 'UNSUPPORTED_ENTITY_TYPE';
  end case;

  if v_workspace_user_id is null then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  if not public.crm_has_permission('archive', v_workspace_user_id, v_owner_user_id, v_assignee_user_id) then
    raise exception 'ARCHIVE_NOT_ALLOWED';
  end if;

  case p_entity_type
    when 'person' then
      update public.crm_people
      set status = 'archived',
          archived_at = now(),
          archived_by_user_id = v_actor_user_id,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'archive_state',
            jsonb_build_object('previous_status', v_previous_status, 'reason', p_reason, 'archived_at', now())
          ),
          updated_at = now()
      where id = p_record_id;
    when 'organization' then
      update public.crm_organizations
      set status = 'archived',
          archived_at = now(),
          archived_by_user_id = v_actor_user_id,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'archive_state',
            jsonb_build_object('previous_status', v_previous_status, 'reason', p_reason, 'archived_at', now())
          ),
          updated_at = now()
      where id = p_record_id;
    when 'lead' then
      update public.crm_leads
      set status = 'archived',
          archived_at = now(),
          archived_by_user_id = v_actor_user_id,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'archive_state',
            jsonb_build_object('previous_status', v_previous_status, 'reason', p_reason, 'archived_at', now())
          ),
          updated_at = now()
      where id = p_record_id;
    when 'deal' then
      update public.crm_deals
      set status = 'archived',
          archived_at = now(),
          archived_by_user_id = v_actor_user_id,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'archive_state',
            jsonb_build_object('previous_status', v_previous_status, 'reason', p_reason, 'archived_at', now())
          ),
          updated_at = now()
      where id = p_record_id;
    when 'task' then
      update public.crm_tasks
      set archived_at = now(),
          archived_by_user_id = v_actor_user_id,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'archive_state',
            jsonb_build_object('previous_status', v_previous_status, 'reason', p_reason, 'archived_at', now())
          ),
          updated_at = now()
      where id = p_record_id;
  end case;

  perform public.crm_write_archive_audit(
    v_workspace_user_id,
    p_entity_type,
    p_record_id,
    'archived',
    p_reason,
    jsonb_build_object('previous_status', v_previous_status)
  );

  return jsonb_build_object('status', 'archived', 'entity_type', p_entity_type, 'record_id', p_record_id);
end;
$$;

create or replace function public.crm_restore_record(
  p_entity_type text,
  p_record_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_workspace_user_id uuid;
  v_owner_user_id uuid;
  v_assignee_user_id uuid;
  v_previous_status text;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  case p_entity_type
    when 'person' then
      select user_id, owner_user_id, coalesce(metadata->'archive_state'->>'previous_status', 'active')
      into v_workspace_user_id, v_owner_user_id, v_previous_status
      from public.crm_people
      where id = p_record_id;
    when 'organization' then
      select user_id, owner_user_id, coalesce(metadata->'archive_state'->>'previous_status', 'active')
      into v_workspace_user_id, v_owner_user_id, v_previous_status
      from public.crm_organizations
      where id = p_record_id;
    when 'lead' then
      select user_id, owner_user_id, coalesce(metadata->'archive_state'->>'previous_status', 'open')
      into v_workspace_user_id, v_owner_user_id, v_previous_status
      from public.crm_leads
      where id = p_record_id;
    when 'deal' then
      select user_id, owner_user_id, coalesce(metadata->'archive_state'->>'previous_status', 'open')
      into v_workspace_user_id, v_owner_user_id, v_previous_status
      from public.crm_deals
      where id = p_record_id;
    when 'task' then
      select user_id, null::uuid, coalesce(metadata->'archive_state'->>'previous_status', status), assignee_user_id
      into v_workspace_user_id, v_owner_user_id, v_previous_status, v_assignee_user_id
      from public.crm_tasks
      where id = p_record_id;
    else
      raise exception 'UNSUPPORTED_ENTITY_TYPE';
  end case;

  if v_workspace_user_id is null then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  if not public.crm_has_permission('restore', v_workspace_user_id, v_owner_user_id, v_assignee_user_id) then
    raise exception 'RESTORE_NOT_ALLOWED';
  end if;

  case p_entity_type
    when 'person' then
      update public.crm_people
      set status = v_previous_status,
          archived_at = null,
          archived_by_user_id = null,
          metadata = coalesce(metadata, '{}'::jsonb) - 'archive_state',
          updated_at = now()
      where id = p_record_id;
    when 'organization' then
      update public.crm_organizations
      set status = v_previous_status,
          archived_at = null,
          archived_by_user_id = null,
          metadata = coalesce(metadata, '{}'::jsonb) - 'archive_state',
          updated_at = now()
      where id = p_record_id;
    when 'lead' then
      update public.crm_leads
      set status = v_previous_status,
          archived_at = null,
          archived_by_user_id = null,
          metadata = coalesce(metadata, '{}'::jsonb) - 'archive_state',
          updated_at = now()
      where id = p_record_id;
    when 'deal' then
      update public.crm_deals
      set status = v_previous_status,
          archived_at = null,
          archived_by_user_id = null,
          metadata = coalesce(metadata, '{}'::jsonb) - 'archive_state',
          updated_at = now()
      where id = p_record_id;
    when 'task' then
      update public.crm_tasks
      set archived_at = null,
          archived_by_user_id = null,
          metadata = coalesce(metadata, '{}'::jsonb) - 'archive_state',
          updated_at = now()
      where id = p_record_id;
  end case;

  perform public.crm_write_archive_audit(
    v_workspace_user_id,
    p_entity_type,
    p_record_id,
    'restored',
    null,
    jsonb_build_object('restored_status', v_previous_status)
  );

  return jsonb_build_object('status', 'restored', 'entity_type', p_entity_type, 'record_id', p_record_id);
end;
$$;

create or replace function public.crm_delete_record(
  p_entity_type text,
  p_record_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  case p_entity_type
    when 'task' then
      select user_id into v_workspace_user_id from public.crm_tasks where id = p_record_id;
    else
      raise exception 'HARD_DELETE_BLOCKED_FOR_CORE_RECORD';
  end case;

  if v_workspace_user_id is null then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  if not public.crm_has_permission('delete', v_workspace_user_id, null, null) then
    raise exception 'DELETE_NOT_ALLOWED';
  end if;

  perform public.crm_write_archive_audit(
    v_workspace_user_id,
    p_entity_type,
    p_record_id,
    'deleted',
    p_reason,
    '{}'::jsonb
  );

  case p_entity_type
    when 'task' then
      delete from public.crm_tasks where id = p_record_id;
  end case;

  return jsonb_build_object('status', 'deleted', 'entity_type', p_entity_type, 'record_id', p_record_id);
end;
$$;
