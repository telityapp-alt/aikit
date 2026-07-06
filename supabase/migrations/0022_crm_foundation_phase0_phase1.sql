-- aikit - CRM foundation phase 0/1
-- Adds shared CRM schema as additive foundation and sync bridge from legacy contacts.

create or replace function public.crm_normalize_text(value text)
returns text
language sql
immutable
as $$
  select nullif(lower(regexp_replace(trim(coalesce(value, '')), '[^a-zA-Z0-9]+', '-', 'g')), '');
$$;

create or replace function public.crm_contact_type_to_lifecycle(value text)
returns text
language sql
immutable
as $$
  select case coalesce(value, 'lead')
    when 'customer' then 'customer'
    when 'vendor' then 'vendor'
    when 'creator' then 'creator'
    when 'competitor' then 'competitor'
    else 'lead'
  end;
$$;

create table if not exists public.crm_organizations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  legacy_company_key text,
  name               text not null,
  name_normalized    text not null,
  domain             text,
  website            text,
  industry           text,
  size_band          text,
  country            text,
  city               text,
  status             text not null default 'active'
                     check (status in ('active', 'inactive', 'archived')),
  owner_user_id      uuid references auth.users(id) on delete set null,
  tags               text[] not null default '{}'::text[],
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, name_normalized)
);

create index if not exists crm_organizations_user_updated_idx
  on public.crm_organizations(user_id, updated_at desc);
create index if not exists crm_organizations_user_status_idx
  on public.crm_organizations(user_id, status);

create table if not exists public.crm_people (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  legacy_contact_id       uuid unique,
  display_name            text not null,
  primary_email           text,
  primary_phone           text,
  job_title               text,
  status                  text not null default 'active'
                          check (status in ('active', 'inactive', 'archived')),
  lifecycle_stage         text not null default 'lead'
                          check (
                            lifecycle_stage in (
                              'lead',
                              'prospect',
                              'customer',
                              'partner',
                              'vendor',
                              'creator',
                              'competitor',
                              'advocate',
                              'other'
                            )
                          ),
  owner_user_id           uuid references auth.users(id) on delete set null,
  primary_organization_id uuid references public.crm_organizations(id) on delete set null,
  source_type             text not null default 'manual',
  source_ref              text,
  linkedin_url            text,
  social_handles          jsonb not null default '{}'::jsonb,
  tags                    text[] not null default '{}'::text[],
  metadata                jsonb not null default '{}'::jsonb,
  last_activity_at        timestamptz,
  next_follow_up_at       timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists crm_people_user_updated_idx
  on public.crm_people(user_id, updated_at desc);
create index if not exists crm_people_user_status_idx
  on public.crm_people(user_id, status);
create index if not exists crm_people_user_lifecycle_idx
  on public.crm_people(user_id, lifecycle_stage);
create index if not exists crm_people_user_org_idx
  on public.crm_people(user_id, primary_organization_id)
  where primary_organization_id is not null;
create index if not exists crm_people_user_follow_up_idx
  on public.crm_people(user_id, next_follow_up_at)
  where next_follow_up_at is not null;

create table if not exists public.crm_person_organizations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  person_id        uuid not null references public.crm_people(id) on delete cascade,
  organization_id  uuid not null references public.crm_organizations(id) on delete cascade,
  relationship_type text not null default 'employee'
                    check (
                      relationship_type in (
                        'employee',
                        'founder',
                        'decision_maker',
                        'advisor',
                        'creator_partner',
                        'vendor_contact',
                        'other'
                      )
                    ),
  job_title        text,
  is_primary       boolean not null default false,
  start_date       date,
  end_date         date,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (person_id, organization_id)
);

create index if not exists crm_person_orgs_user_person_idx
  on public.crm_person_organizations(user_id, person_id);
create index if not exists crm_person_orgs_user_org_idx
  on public.crm_person_organizations(user_id, organization_id);

create table if not exists public.crm_leads (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  person_id                 uuid references public.crm_people(id) on delete set null,
  organization_id           uuid references public.crm_organizations(id) on delete set null,
  source_type               text not null default 'manual',
  source_ref                text,
  source_campaign_id        uuid references public.campaigns(id) on delete set null,
  stage                     text not null default 'new'
                            check (
                              stage in (
                                'new',
                                'attempted',
                                'connected',
                                'qualified',
                                'proposal',
                                'converted',
                                'lost'
                              )
                            ),
  status                    text not null default 'open'
                            check (status in ('open', 'qualified', 'disqualified', 'converted', 'archived')),
  score                     integer not null default 0,
  temperature               text not null default 'warm'
                            check (temperature in ('cold', 'warm', 'hot')),
  owner_user_id             uuid references auth.users(id) on delete set null,
  qualification_notes       text,
  disqualification_reason   text,
  converted_person_id       uuid references public.crm_people(id) on delete set null,
  converted_organization_id uuid references public.crm_organizations(id) on delete set null,
  converted_deal_id         uuid,
  metadata                  jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists crm_leads_user_updated_idx
  on public.crm_leads(user_id, updated_at desc);
create index if not exists crm_leads_user_status_idx
  on public.crm_leads(user_id, status);
create index if not exists crm_leads_user_stage_idx
  on public.crm_leads(user_id, stage);

create table if not exists public.crm_pipelines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  entity_type   text not null default 'deal'
                check (entity_type in ('deal')),
  is_default    boolean not null default false,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists crm_pipelines_user_updated_idx
  on public.crm_pipelines(user_id, updated_at desc);
create unique index if not exists crm_pipelines_default_unique_idx
  on public.crm_pipelines(user_id, entity_type)
  where is_default = true;

create table if not exists public.crm_pipeline_stages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  pipeline_id     uuid not null references public.crm_pipelines(id) on delete cascade,
  name            text not null,
  stage_key       text not null,
  position        integer not null,
  win_probability integer not null default 0
                  check (win_probability between 0 and 100),
  is_closed       boolean not null default false,
  is_won          boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (pipeline_id, stage_key),
  unique (pipeline_id, position)
);

create index if not exists crm_pipeline_stages_user_pipeline_idx
  on public.crm_pipeline_stages(user_id, pipeline_id, position asc);

create table if not exists public.crm_deals (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  pipeline_id        uuid references public.crm_pipelines(id) on delete set null,
  stage_id           uuid references public.crm_pipeline_stages(id) on delete set null,
  organization_id    uuid references public.crm_organizations(id) on delete set null,
  primary_person_id  uuid references public.crm_people(id) on delete set null,
  owner_user_id      uuid references auth.users(id) on delete set null,
  amount             numeric(15, 2),
  currency           text not null default 'IDR',
  expected_close_at  timestamptz,
  status             text not null default 'open'
                     check (status in ('open', 'won', 'lost', 'archived')),
  source_type        text not null default 'manual',
  source_ref         text,
  campaign_id        uuid references public.campaigns(id) on delete set null,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists crm_deals_user_updated_idx
  on public.crm_deals(user_id, updated_at desc);
create index if not exists crm_deals_user_status_idx
  on public.crm_deals(user_id, status);
create index if not exists crm_deals_user_pipeline_idx
  on public.crm_deals(user_id, pipeline_id)
  where pipeline_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_leads_converted_deal_fk'
  ) then
    alter table public.crm_leads
      add constraint crm_leads_converted_deal_fk
      foreign key (converted_deal_id) references public.crm_deals(id) on delete set null;
  end if;
end;
$$;

create table if not exists public.crm_deal_people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  deal_id     uuid not null references public.crm_deals(id) on delete cascade,
  person_id   uuid not null references public.crm_people(id) on delete cascade,
  role        text not null default 'stakeholder'
              check (role in ('primary', 'decision_maker', 'champion', 'stakeholder', 'other')),
  is_primary  boolean not null default false,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (deal_id, person_id)
);

create index if not exists crm_deal_people_user_deal_idx
  on public.crm_deal_people(user_id, deal_id);
create index if not exists crm_deal_people_user_person_idx
  on public.crm_deal_people(user_id, person_id);

create table if not exists public.crm_tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  entity_type      text not null
                   check (
                     entity_type in (
                       'contact',
                       'person',
                       'organization',
                       'lead',
                       'deal',
                       'campaign',
                       'content_post'
                     )
                   ),
  entity_id        uuid not null,
  title            text not null,
  body             text,
  status           text not null default 'open'
                   check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  priority         text not null default 'medium'
                   check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_user_id uuid references auth.users(id) on delete set null,
  due_at           timestamptz,
  completed_at     timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists crm_tasks_user_due_idx
  on public.crm_tasks(user_id, due_at asc)
  where due_at is not null;
create index if not exists crm_tasks_user_status_idx
  on public.crm_tasks(user_id, status);
create index if not exists crm_tasks_user_entity_idx
  on public.crm_tasks(user_id, entity_type, entity_id);

create table if not exists public.crm_record_links (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  from_entity_type text not null,
  from_entity_id   uuid not null,
  to_entity_type   text not null,
  to_entity_id     uuid not null,
  link_type        text not null,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, link_type)
);

create index if not exists crm_record_links_user_from_idx
  on public.crm_record_links(user_id, from_entity_type, from_entity_id);
create index if not exists crm_record_links_user_to_idx
  on public.crm_record_links(user_id, to_entity_type, to_entity_id);

alter table public.activities
  drop constraint if exists activities_entity_type_check;

alter table public.activities
  add constraint activities_entity_type_check
  check (
    entity_type in (
      'contact',
      'person',
      'organization',
      'lead',
      'deal',
      'campaign',
      'content_post',
      'task'
    )
  );

alter table public.activities
  drop constraint if exists activities_activity_type_check;

alter table public.activities
  add constraint activities_activity_type_check
  check (
    activity_type in (
      'note',
      'call',
      'email',
      'meeting',
      'task',
      'status_change',
      'system',
      'import',
      'automation'
    )
  );

alter table public.activities
  add column if not exists direction text
    check (direction in ('inbound', 'outbound', 'internal')),
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists source_type text,
  add column if not exists source_ref text;

create index if not exists activities_user_source_idx
  on public.activities(user_id, source_type, source_ref)
  where source_type is not null;

alter table public.crm_organizations enable row level security;
alter table public.crm_people enable row level security;
alter table public.crm_person_organizations enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_pipelines enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_deal_people enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_record_links enable row level security;

drop policy if exists "crm_organizations_own" on public.crm_organizations;
create policy "crm_organizations_own" on public.crm_organizations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_people_own" on public.crm_people;
create policy "crm_people_own" on public.crm_people
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_person_organizations_own" on public.crm_person_organizations;
create policy "crm_person_organizations_own" on public.crm_person_organizations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_leads_own" on public.crm_leads;
create policy "crm_leads_own" on public.crm_leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_pipelines_own" on public.crm_pipelines;
create policy "crm_pipelines_own" on public.crm_pipelines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_pipeline_stages_own" on public.crm_pipeline_stages;
create policy "crm_pipeline_stages_own" on public.crm_pipeline_stages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_deals_own" on public.crm_deals;
create policy "crm_deals_own" on public.crm_deals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_deal_people_own" on public.crm_deal_people;
create policy "crm_deal_people_own" on public.crm_deal_people
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_tasks_own" on public.crm_tasks;
create policy "crm_tasks_own" on public.crm_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crm_record_links_own" on public.crm_record_links;
create policy "crm_record_links_own" on public.crm_record_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at_crm_organizations on public.crm_organizations;
create trigger set_updated_at_crm_organizations
  before update on public.crm_organizations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_people on public.crm_people;
create trigger set_updated_at_crm_people
  before update on public.crm_people
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_person_organizations on public.crm_person_organizations;
create trigger set_updated_at_crm_person_organizations
  before update on public.crm_person_organizations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_leads on public.crm_leads;
create trigger set_updated_at_crm_leads
  before update on public.crm_leads
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_pipelines on public.crm_pipelines;
create trigger set_updated_at_crm_pipelines
  before update on public.crm_pipelines
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_pipeline_stages on public.crm_pipeline_stages;
create trigger set_updated_at_crm_pipeline_stages
  before update on public.crm_pipeline_stages
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_deals on public.crm_deals;
create trigger set_updated_at_crm_deals
  before update on public.crm_deals
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_deal_people on public.crm_deal_people;
create trigger set_updated_at_crm_deal_people
  before update on public.crm_deal_people
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_tasks on public.crm_tasks;
create trigger set_updated_at_crm_tasks
  before update on public.crm_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_crm_record_links on public.crm_record_links;
create trigger set_updated_at_crm_record_links
  before update on public.crm_record_links
  for each row execute function public.set_updated_at();

create or replace function public.crm_ensure_default_deal_pipeline(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_pipeline_id uuid;
begin
  if p_user is null then
    return;
  end if;

  select id into v_pipeline_id
  from public.crm_pipelines
  where user_id = p_user
    and entity_type = 'deal'
    and is_default = true
  limit 1;

  if v_pipeline_id is null then
    insert into public.crm_pipelines (user_id, name, entity_type, is_default, metadata)
    values (p_user, 'Default Sales Pipeline', 'deal', true, '{"source":"crm_foundation"}'::jsonb)
    returning id into v_pipeline_id;
  else
    update public.crm_pipelines
      set name = 'Default Sales Pipeline',
          updated_at = now()
    where id = v_pipeline_id;
  end if;

  if v_pipeline_id is null then
    return;
  end if;

  insert into public.crm_pipeline_stages
    (user_id, pipeline_id, name, stage_key, position, win_probability, is_closed, is_won, metadata)
  values
    (p_user, v_pipeline_id, 'New', 'new', 1, 10, false, false, '{}'::jsonb),
    (p_user, v_pipeline_id, 'Discovery', 'discovery', 2, 25, false, false, '{}'::jsonb),
    (p_user, v_pipeline_id, 'Proposal', 'proposal', 3, 55, false, false, '{}'::jsonb),
    (p_user, v_pipeline_id, 'Negotiation', 'negotiation', 4, 75, false, false, '{}'::jsonb),
    (p_user, v_pipeline_id, 'Closed Won', 'closed-won', 5, 100, true, true, '{}'::jsonb),
    (p_user, v_pipeline_id, 'Closed Lost', 'closed-lost', 6, 0, true, false, '{}'::jsonb)
  on conflict (pipeline_id, stage_key) do update
    set
      name = excluded.name,
      position = excluded.position,
      win_probability = excluded.win_probability,
      is_closed = excluded.is_closed,
      is_won = excluded.is_won;
end;
$$;

create or replace function public.crm_profiles_default_pipeline_trigger()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.crm_ensure_default_deal_pipeline(new.id);
  return new;
end;
$$;

drop trigger if exists crm_profiles_default_pipeline on public.profiles;
create trigger crm_profiles_default_pipeline
  after insert on public.profiles
  for each row execute function public.crm_profiles_default_pipeline_trigger();

create or replace function public.crm_sync_contact_record(p_contact_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  c public.contacts%rowtype;
  v_org_id uuid;
  v_person_id uuid;
  v_company_key text;
begin
  select * into c from public.contacts where id = p_contact_id;

  if not found then
    delete from public.crm_person_organizations
    where person_id in (
      select id from public.crm_people where legacy_contact_id = p_contact_id
    );

    delete from public.crm_people
    where legacy_contact_id = p_contact_id;
    return;
  end if;

  v_company_key := public.crm_normalize_text(c.company);
  v_org_id := null;

  if v_company_key is not null then
    insert into public.crm_organizations (
      user_id,
      legacy_company_key,
      name,
      name_normalized,
      status,
      owner_user_id,
      tags,
      metadata
    )
    values (
      c.user_id,
      v_company_key,
      c.company,
      v_company_key,
      case when c.status = 'archived' then 'archived' else 'active' end,
      c.user_id,
      c.tags,
      jsonb_build_object('source', 'legacy_contact_sync')
    )
    on conflict (user_id, name_normalized) do update
      set
        name = excluded.name,
        legacy_company_key = excluded.legacy_company_key,
        owner_user_id = coalesce(public.crm_organizations.owner_user_id, excluded.owner_user_id),
        tags = (
          select array(
            select distinct unnest(coalesce(public.crm_organizations.tags, '{}'::text[]) || coalesce(excluded.tags, '{}'::text[]))
          )
        ),
        updated_at = now()
    returning id into v_org_id;
  end if;

  insert into public.crm_people (
    user_id,
    legacy_contact_id,
    display_name,
    primary_email,
    primary_phone,
    status,
    lifecycle_stage,
    owner_user_id,
    primary_organization_id,
    source_type,
    source_ref,
    social_handles,
    tags,
    metadata,
    last_activity_at,
    next_follow_up_at
  )
  values (
    c.user_id,
    c.id,
    c.name,
    c.email,
    c.phone,
    c.status,
    public.crm_contact_type_to_lifecycle(c.type),
    c.user_id,
    v_org_id,
    'legacy_contact',
    c.id::text,
    c.social_handles,
    c.tags,
    jsonb_strip_nulls(
      jsonb_build_object(
        'source', 'legacy_contact_sync',
        'legacy_contact_type', c.type,
        'legacy_notes', c.notes,
        'avatar_url', c.avatar_url,
        'platform_account_id', c.platform_account_id,
        'metadata', c.metadata
      )
    ),
    c.last_interaction_at,
    c.next_follow_up_at
  )
  on conflict (legacy_contact_id) do update
    set
      display_name = excluded.display_name,
      primary_email = excluded.primary_email,
      primary_phone = excluded.primary_phone,
      status = excluded.status,
      lifecycle_stage = excluded.lifecycle_stage,
      owner_user_id = excluded.owner_user_id,
      primary_organization_id = excluded.primary_organization_id,
      social_handles = excluded.social_handles,
      tags = excluded.tags,
      metadata = excluded.metadata,
      last_activity_at = excluded.last_activity_at,
      next_follow_up_at = excluded.next_follow_up_at,
      updated_at = now()
  returning id into v_person_id;

  delete from public.crm_person_organizations
  where person_id = v_person_id
    and coalesce(metadata->>'source', '') = 'legacy_contact_sync';

  if v_org_id is not null then
    insert into public.crm_person_organizations (
      user_id,
      person_id,
      organization_id,
      relationship_type,
      is_primary,
      metadata
    )
    values (
      c.user_id,
      v_person_id,
      v_org_id,
      'employee',
      true,
      jsonb_build_object('source', 'legacy_contact_sync')
    )
    on conflict (person_id, organization_id) do update
      set
        is_primary = true,
        metadata = excluded.metadata,
        updated_at = now();
  end if;
end;
$$;

create or replace function public.crm_sync_contact_trigger()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.crm_sync_contact_record(old.id);
    return old;
  end if;

  perform public.crm_sync_contact_record(new.id);
  return new;
end;
$$;

drop trigger if exists crm_sync_contact_on_contacts on public.contacts;
create trigger crm_sync_contact_on_contacts
  after insert or update or delete on public.contacts
  for each row execute function public.crm_sync_contact_trigger();

do $$
declare
  profile_row record;
begin
  for profile_row in
    select id from public.profiles
  loop
    perform public.crm_ensure_default_deal_pipeline(profile_row.id);
  end loop;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'contacts'
  ) then
    perform public.crm_sync_contact_record(id)
    from public.contacts;
  end if;
end;
$$;
