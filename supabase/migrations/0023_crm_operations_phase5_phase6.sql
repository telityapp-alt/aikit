-- aikit - CRM operations phase 5/6
-- Adds saved views, segments, import jobs, and merge audit for CRM operations scale.

create table if not exists public.crm_segments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  entity_type        text not null
                     check (entity_type in ('person', 'organization', 'lead', 'deal')),
  description        text,
  filter_definition  jsonb not null default '{}'::jsonb,
  is_dynamic         boolean not null default true,
  is_shared          boolean not null default false,
  last_preview_count integer not null default 0,
  last_refreshed_at  timestamptz,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists crm_segments_user_entity_idx
  on public.crm_segments(user_id, entity_type, updated_at desc);

create table if not exists public.crm_saved_views (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  entity_type       text not null
                    check (entity_type in ('person', 'organization', 'lead', 'deal', 'task')),
  name              text not null,
  filter_definition jsonb not null default '{}'::jsonb,
  column_definition jsonb not null default '{}'::jsonb,
  sort_definition   jsonb not null default '{}'::jsonb,
  is_default        boolean not null default false,
  is_shared         boolean not null default false,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists crm_saved_views_user_entity_idx
  on public.crm_saved_views(user_id, entity_type, updated_at desc);
create unique index if not exists crm_saved_views_default_unique_idx
  on public.crm_saved_views(user_id, entity_type)
  where is_default = true;

create table if not exists public.crm_import_jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  entity_type     text not null
                  check (entity_type in ('person', 'organization', 'lead')),
  source_type     text not null default 'upload',
  status          text not null default 'draft'
                  check (status in ('draft', 'processing', 'completed', 'failed', 'cancelled')),
  file_name       text,
  raw_rows        jsonb not null default '[]'::jsonb,
  mapping         jsonb not null default '{}'::jsonb,
  input_summary   jsonb not null default '{}'::jsonb,
  result_summary  jsonb not null default '{}'::jsonb,
  error_message   text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists crm_import_jobs_user_entity_idx
  on public.crm_import_jobs(user_id, entity_type, created_at desc);

create table if not exists public.crm_merge_audits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  entity_type      text not null
                   check (entity_type in ('person', 'organization')),
  source_record_id uuid not null,
  target_record_id uuid not null,
  merge_summary    jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists crm_merge_audits_user_entity_idx
  on public.crm_merge_audits(user_id, entity_type, created_at desc);

alter table public.crm_segments enable row level security;
alter table public.crm_saved_views enable row level security;
alter table public.crm_import_jobs enable row level security;
alter table public.crm_merge_audits enable row level security;

drop policy if exists "crm_segments_own" on public.crm_segments;
create policy "crm_segments_own" on public.crm_segments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_saved_views_own" on public.crm_saved_views;
create policy "crm_saved_views_own" on public.crm_saved_views
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_import_jobs_own" on public.crm_import_jobs;
create policy "crm_import_jobs_own" on public.crm_import_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_merge_audits_own" on public.crm_merge_audits;
create policy "crm_merge_audits_own" on public.crm_merge_audits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at_crm_segments on public.crm_segments;
create trigger set_updated_at_crm_segments
  before update on public.crm_segments
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_saved_views on public.crm_saved_views;
create trigger set_updated_at_crm_saved_views
  before update on public.crm_saved_views
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_import_jobs on public.crm_import_jobs;
create trigger set_updated_at_crm_import_jobs
  before update on public.crm_import_jobs
  for each row execute function public.set_updated_at();

create or replace function public.crm_merge_people(
  p_source_id uuid,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_source public.crm_people%rowtype;
  v_target public.crm_people%rowtype;
  v_user_id uuid;
  v_actor_user_id uuid;
begin
  if p_source_id is null or p_target_id is null then
    raise exception 'SOURCE_AND_TARGET_REQUIRED';
  end if;

  if p_source_id = p_target_id then
    raise exception 'SOURCE_AND_TARGET_MUST_DIFFER';
  end if;

  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_source from public.crm_people where id = p_source_id;
  select * into v_target from public.crm_people where id = p_target_id;

  if not found then
    raise exception 'TARGET_NOT_FOUND';
  end if;

  if v_source.id is null then
    raise exception 'SOURCE_NOT_FOUND';
  end if;

  if v_source.user_id <> v_target.user_id then
    raise exception 'CROSS_WORKSPACE_MERGE_NOT_ALLOWED';
  end if;

  v_user_id := v_target.user_id;

  if v_actor_user_id <> v_user_id then
    raise exception 'MERGE_NOT_ALLOWED';
  end if;

  update public.crm_leads
    set person_id = p_target_id,
        updated_at = now()
  where person_id = p_source_id;

  update public.crm_leads
    set converted_person_id = p_target_id,
        updated_at = now()
  where converted_person_id = p_source_id;

  update public.crm_deals
    set primary_person_id = p_target_id,
        updated_at = now()
  where primary_person_id = p_source_id;

  update public.crm_deal_people
    set person_id = p_target_id,
        updated_at = now()
  where person_id = p_source_id
    and not exists (
      select 1
      from public.crm_deal_people existing
      where existing.deal_id = public.crm_deal_people.deal_id
        and existing.person_id = p_target_id
    );

  delete from public.crm_deal_people
  where person_id = p_source_id;

  update public.crm_person_organizations
    set person_id = p_target_id,
        updated_at = now()
  where person_id = p_source_id
    and not exists (
      select 1
      from public.crm_person_organizations existing
      where existing.organization_id = public.crm_person_organizations.organization_id
        and existing.person_id = p_target_id
    );

  delete from public.crm_person_organizations
  where person_id = p_source_id;

  update public.crm_tasks
    set entity_id = p_target_id,
        updated_at = now()
  where entity_type = 'person'
    and entity_id = p_source_id;

  update public.activities
    set entity_id = p_target_id,
        updated_at = now()
  where entity_type = 'person'
    and entity_id = p_source_id;

  update public.crm_record_links
    set from_entity_id = p_target_id,
        updated_at = now()
  where from_entity_type = 'person'
    and from_entity_id = p_source_id
    and not exists (
      select 1
      from public.crm_record_links existing
      where existing.user_id = public.crm_record_links.user_id
        and existing.from_entity_type = public.crm_record_links.from_entity_type
        and existing.from_entity_id = p_target_id
        and existing.to_entity_type = public.crm_record_links.to_entity_type
        and existing.to_entity_id = public.crm_record_links.to_entity_id
        and existing.link_type = public.crm_record_links.link_type
    );

  update public.crm_record_links
    set to_entity_id = p_target_id,
        updated_at = now()
  where to_entity_type = 'person'
    and to_entity_id = p_source_id
    and not exists (
      select 1
      from public.crm_record_links existing
      where existing.user_id = public.crm_record_links.user_id
        and existing.from_entity_type = public.crm_record_links.from_entity_type
        and existing.from_entity_id = public.crm_record_links.from_entity_id
        and existing.to_entity_type = public.crm_record_links.to_entity_type
        and existing.to_entity_id = p_target_id
        and existing.link_type = public.crm_record_links.link_type
    );

  delete from public.crm_record_links
  where (from_entity_type = 'person' and from_entity_id = p_source_id)
     or (to_entity_type = 'person' and to_entity_id = p_source_id);

  update public.crm_people
    set
      primary_email = coalesce(public.crm_people.primary_email, v_source.primary_email),
      primary_phone = coalesce(public.crm_people.primary_phone, v_source.primary_phone),
      primary_organization_id = coalesce(public.crm_people.primary_organization_id, v_source.primary_organization_id),
      social_handles = coalesce(public.crm_people.social_handles, '{}'::jsonb) || coalesce(v_source.social_handles, '{}'::jsonb),
      tags = (
        select array(
          select distinct unnest(coalesce(public.crm_people.tags, '{}'::text[]) || coalesce(v_source.tags, '{}'::text[]))
        )
      ),
      metadata = coalesce(public.crm_people.metadata, '{}'::jsonb) || jsonb_build_object(
        'merged_from', coalesce(public.crm_people.metadata->'merged_from', '[]'::jsonb) || jsonb_build_array(v_source.id::text)
      ),
      last_activity_at = greatest(public.crm_people.last_activity_at, v_source.last_activity_at),
      next_follow_up_at = coalesce(public.crm_people.next_follow_up_at, v_source.next_follow_up_at),
      updated_at = now()
  where id = p_target_id;

  insert into public.crm_merge_audits (
    user_id,
    entity_type,
    source_record_id,
    target_record_id,
    merge_summary
  )
  values (
    v_user_id,
    'person',
    p_source_id,
    p_target_id,
    jsonb_build_object(
      'source_name', v_source.display_name,
      'target_name', v_target.display_name
    )
  );

  delete from public.crm_people where id = p_source_id;

  return jsonb_build_object(
    'status', 'merged',
    'source_id', p_source_id,
    'target_id', p_target_id
  );
end;
$$;
