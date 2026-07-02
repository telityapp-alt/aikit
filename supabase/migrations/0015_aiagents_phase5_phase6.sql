-- aikit -- AIAGENTS phase 5 and 6
-- Adds thread actions plus lightweight knowledge/attachment retrieval.

create table if not exists public.ai_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null references public.agent_profiles(slug),
  thread_id uuid references public.chats(id) on delete set null,
  title text not null,
  source_type text not null default 'note',
  file_name text,
  mime_type text,
  content_text text not null,
  content_preview text,
  token_estimate integer,
  status text not null default 'ready',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_knowledge_documents_user_agent_updated_idx
  on public.ai_knowledge_documents(user_id, agent_slug, updated_at desc);

alter table public.ai_knowledge_documents enable row level security;

drop policy if exists "ai_knowledge_documents_own" on public.ai_knowledge_documents;
create policy "ai_knowledge_documents_own" on public.ai_knowledge_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at_ai_knowledge_documents on public.ai_knowledge_documents;
create trigger set_updated_at_ai_knowledge_documents
  before update on public.ai_knowledge_documents
  for each row execute function public.set_updated_at();

create table if not exists public.ai_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.ai_knowledge_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null references public.agent_profiles(slug),
  chunk_index integer not null,
  content text not null,
  content_preview text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_knowledge_chunks_user_agent_created_idx
  on public.ai_knowledge_chunks(user_id, agent_slug, created_at desc);

create index if not exists ai_knowledge_chunks_document_chunk_idx
  on public.ai_knowledge_chunks(document_id, chunk_index);

alter table public.ai_knowledge_chunks enable row level security;

drop policy if exists "ai_knowledge_chunks_own" on public.ai_knowledge_chunks;
create policy "ai_knowledge_chunks_own" on public.ai_knowledge_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
