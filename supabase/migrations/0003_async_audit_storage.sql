-- aikit — phase 3: audit log, rate limiting, credit ops, storage.
-- Idempotent. Run in Supabase SQL Editor or via the apply script.

-- ─────────────────────────────────────────────────────────────
-- audit_logs  (meaningful events; written by service role)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null,
  metadata   jsonb default '{}'::jsonb,
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists audit_user_idx on public.audit_logs(user_id, created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists "audit_select_own" on public.audit_logs;
create policy "audit_select_own" on public.audit_logs
  for select using (auth.uid() = user_id);
-- writes happen via service role (bypasses RLS); no client write policy.

-- ─────────────────────────────────────────────────────────────
-- rate_events  (sliding-window counter for API rate limiting)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.rate_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  bucket     text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_lookup_idx
  on public.rate_events(user_id, bucket, created_at desc);

alter table public.rate_events enable row level security;
-- no client policies — only the service role touches this table.

-- Returns true if the request is allowed, false if the limit is exceeded.
-- Records the event and opportunistically prunes old rows.
create or replace function public.rate_limit_check(
  p_user uuid, p_bucket text, p_limit int, p_window int
) returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  cnt int;
begin
  delete from public.rate_events
   where created_at < now() - make_interval(secs => p_window * 4)
     and user_id = p_user and bucket = p_bucket;

  select count(*) into cnt
    from public.rate_events
   where user_id = p_user and bucket = p_bucket
     and created_at > now() - make_interval(secs => p_window);

  if cnt >= p_limit then
    return false;
  end if;

  insert into public.rate_events(user_id, bucket) values (p_user, p_bucket);
  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- credit ops (used by runs refund + xendit webhook)
-- ─────────────────────────────────────────────────────────────
create or replace function public.add_credits(p_user uuid, p_amount integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
     set credits_balance = credits_balance + p_amount,
         updated_at = now()
   where id = p_user
  returning credits_balance into new_balance;
  return new_balance;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Storage: private "uploads" bucket + per-user folder policies
-- (object path convention: "<auth.uid()>/<filename>")
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

drop policy if exists "uploads_read_own" on storage.objects;
create policy "uploads_read_own" on storage.objects
  for select using (
    bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads_insert_own" on storage.objects;
create policy "uploads_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads_delete_own" on storage.objects;
create policy "uploads_delete_own" on storage.objects
  for delete using (
    bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text
  );
