# AIAGENTS Foundation Plan

Updated: 2026-07-02

## 1. Goal

Build a business-grade AI workspace inside `AIAGENTS` with:

- 6 specialized agents
- one shared foundational chat engine
- persistent chat history
- separated agent skills, instructions, and tools
- left history rail, center conversation, right artifact/canvas rail
- strong cost control via a gateway-based provider layer

This document is the foundational plan for the first real implementation wave. It is intentionally deeper than a UI spec: it covers product architecture, backend contracts, memory, orchestration, cost, and rollout.

## 2. What We Have Today

Current repo state already gives us a useful starting point:

- Frontend already has an `AI Agent` entry in the dashboard.
- Chat UI already exists in [`src/pages/Dashboard.jsx`](/C:/Nabil/aikit-blue/src/pages/Dashboard.jsx).
- Chat persistence already exists through `public.chats` and `public.messages`.
- Chat API already exists in [`worker/index.js`](/C:/Nabil/aikit-blue/worker/index.js) and [`functions/api/chat.js`](/C:/Nabil/aikit-blue/functions/api/chat.js).
- Supabase already handles auth, RLS, credits, modules, and user-owned records.
- Cloudflare Worker is already the right place to become the AI gateway/orchestrator.
- Mascot assets already exist in [`public/mascots`](/C:/Nabil/aikit-blue/public/mascots).

Current limitations:

- The chat is still single-agent and prompt-only.
- `moduleSlug` is being used as a lightweight prompt switch, not a real agent system.
- No streaming response path yet.
- No tool execution framework for chat.
- No right-side artifact/canvas model.
- No memory layers beyond raw message history.
- No distinction between thread state, artifacts, skills, knowledge, and execution logs.
- No provider abstraction yet; current implementation calls Anthropic directly.

## 3. Product Direction

### 3.1 Agent lineup

Phase-1 agent lineup should be:

1. `spark`
   General AI assistant for founders and teams.
2. `finance`
   Cashflow, budgeting, unit economics, reporting, invoice reasoning.
3. `operations`
   SOPs, workflows, task decomposition, process optimization.
4. `ecommerce`
   product ops, campaign ideas, catalog copy, pricing, merchandising.
5. `knowledge`
   workspace memory, docs Q&A, meeting summaries, internal knowledge retrieval.
6. `growth` or `strategy`
   recommendation: `growth`
   market analysis, positioning, campaign planning, content angles, experiments.

Recommendation:

- Lock the first 5 exactly as above.
- Reserve the 6th as `growth` unless a sharper business function appears.

### 3.2 Core principle

The phrase "same foundational AI chat, completely same total history, but separated by skills" should be implemented as:

- one shared chat platform
- one shared identity, auth, storage, billing, retrieval, and gateway layer
- one shared conversation engine and artifact system
- each thread belongs to exactly one agent
- each agent has its own prompt, tools, memory rules, starter cards, and output behaviors
- cross-agent knowledge is shared through controlled memory and workspace knowledge, not by mixing raw chat transcripts automatically

This matters because "everyone sees all raw history" creates contamination:

- finance replies start sounding like general assistant replies
- tool selection becomes noisy
- prompts become expensive
- safety and privacy boundaries become unclear

So the right design is:

- shared platform
- separate agent runtime profiles
- optional shared workspace memory

## 4. UX Foundation

## 4.1 Main AIAGENTS home

The `AIAGENTS` dashboard page should show 6 cards:

- mascot on top
- agent name
- short role description
- 3-4 example capabilities
- recent activity badge
- CTA: `Open Agent`

For now use existing mascot set and assign one per agent by config.

Recommended temporary mapping:

- `spark` -> `flash-chat.webp`
- `finance` -> `flash-laptop.webp`
- `operations` -> `flash-point.webp`
- `ecommerce` -> `flash-wave.webp`
- `knowledge` -> `flash-peek.webp`
- `growth` -> `flash-celebrate.webp`

Do not hardcode this in page logic. Put it in an agent registry config.

## 4.2 Chat workspace layout

Target layout:

- Left rail: threads, folders/views, new chat, search, pinned chats
- Center: main conversation stream
- Right rail: canvas/artifacts/documents/tools/output

Right rail states:

- collapsed
- narrow preview
- full canvas

Right rail content types:

- generated document
- table
- chart
- checklist
- SOP
- extracted data
- citations/sources
- image/file preview
- task plan

This should feel like modern ChatGPT/Claude-style workspace behavior:

- the conversation stays primary
- outputs with structure can "lift" into the right canvas
- the user can keep chatting while the canvas stays open

## 4.3 Thread behavior

Each thread must be bound to exactly one agent:

- user starts thread inside `spark`
- thread remains a `spark` thread
- switching to `finance` opens the finance home or a finance thread list

Do not let one thread silently change agent identity mid-thread.

If needed later, add:

- `handoff to another agent`

That should create a linked thread, not mutate the current thread.

## 5. Recommended Architecture

## 5.1 High-level architecture

Use the current stack and extend it:

- React/Vite for app UI
- Cloudflare Worker as API layer and gateway/orchestrator
- Supabase Postgres as system of record
- Supabase Realtime for UI sync where useful
- Cloudflare Queues for long-running jobs
- R2 for uploaded files and generated artifacts
- optional Durable Objects for real-time session coordination and streaming state

Recommended split:

- Supabase = canonical persistence
- Worker = orchestration, auth verification, tool policy, provider routing, billing, artifact generation
- Durable Objects = optional live session coordinator, not the source of truth

Why this split:

- your repo already fits it
- Supabase is better for durable queryable business data
- Worker is ideal for provider abstraction and streaming
- Durable Objects are useful for stateful live coordination, not required for first release

## 5.2 Core services

We should formalize the AI platform into these modules:

1. `agent registry`
   Stores persona, tools, model preferences, mascot, starter prompts, output modes.

2. `thread service`
   Creates, titles, loads, archives, and searches threads.

3. `message service`
   Stores user, assistant, system, tool, and event messages.

4. `orchestrator`
   Builds runtime prompt, attaches memory, chooses tools/model, streams result, emits artifacts.

5. `gateway adapter`
   Talks to model providers through one normalized interface.

6. `memory service`
   Handles short-term history, summaries, workspace memory, retrieval memory.

7. `artifact service`
   Stores generated outputs for the right rail.

8. `tool runtime`
   Executes business tools under agent-specific permission scopes.

9. `usage/billing service`
   Tracks token, request, tool, storage, and artifact costs.

10. `observability service`
    Logs traces, latency, errors, provider selection, retries, and tool usage.

## 6. Data Model Proposal

Current `chats/messages` tables are too thin for where we want to go.

Recommended schema additions:

### 6.1 Agents

`agent_profiles`

- `id`
- `slug` (`spark`, `finance`, etc.)
- `name`
- `tagline`
- `description`
- `mascot_asset`
- `theme`
- `system_prompt`
- `default_model_alias`
- `temperature_policy`
- `starter_prompts` jsonb
- `capabilities` jsonb
- `is_active`
- `sort_order`

### 6.2 Threads

Rename conceptually from `chats` to `chat_threads`.

Either:

- keep `chats` and extend it

or:

- migrate to a new `chat_threads` table and deprecate old shape

Recommended new fields:

- `id`
- `user_id`
- `agent_id`
- `title`
- `status` (`active`, `archived`, `deleted`)
- `last_message_at`
- `last_artifact_at`
- `summary`
- `pinned`
- `metadata`
- `created_at`
- `updated_at`

### 6.3 Messages

Recommended `chat_messages` fields:

- `id`
- `thread_id`
- `user_id`
- `agent_id`
- `role` (`user`, `assistant`, `system`, `tool`, `event`)
- `content_text`
- `content_json`
- `token_in`
- `token_out`
- `provider`
- `model`
- `latency_ms`
- `status`
- `parent_turn_id`
- `created_at`

### 6.4 Turns

Add a turn-level table:

`chat_turns`

- `id`
- `thread_id`
- `agent_id`
- `user_message_id`
- `assistant_message_id`
- `provider_request_id`
- `gateway_route`
- `model_alias`
- `resolved_provider`
- `resolved_model`
- `input_tokens`
- `output_tokens`
- `cache_read_tokens`
- `cache_write_tokens`
- `tool_count`
- `cost_credits`
- `duration_ms`
- `status`
- `error`
- `created_at`

This table becomes the backbone for analytics, billing, and debugging.

### 6.5 Artifacts

`chat_artifacts`

- `id`
- `thread_id`
- `message_id`
- `agent_id`
- `type` (`doc`, `table`, `chart`, `checklist`, `json`, `file`, `citation_set`, `plan`, `canvas`)
- `title`
- `summary`
- `content_json`
- `storage_path`
- `mime_type`
- `source_refs` jsonb
- `is_pinned`
- `created_at`
- `updated_at`

### 6.6 Memory

`memory_items`

- `id`
- `user_id`
- `workspace_id` optional later
- `agent_id` nullable if global
- `thread_id` nullable
- `scope` (`thread`, `agent`, `workspace`)
- `kind` (`summary`, `preference`, `fact`, `entity`, `instruction`, `document_note`)
- `content`
- `content_json`
- `importance`
- `source_message_id`
- `last_used_at`
- `expires_at`
- `created_at`

### 6.7 Knowledge

`knowledge_sources`

- `id`
- `user_id`
- `agent_id` nullable
- `title`
- `kind` (`upload`, `url`, `note`, `generated`)
- `storage_path`
- `status`
- `metadata`
- `created_at`

`knowledge_chunks`

- `id`
- `source_id`
- `chunk_index`
- `content`
- `embedding`
- `metadata`

### 6.8 Tools

`tool_executions`

- `id`
- `thread_id`
- `turn_id`
- `agent_id`
- `tool_name`
- `tool_input`
- `tool_output`
- `status`
- `duration_ms`
- `error`
- `created_at`

## 7. Agent Separation Model

Each agent should be configured, not hardcoded into one big component.

Recommended registry shape:

```ts
type AgentConfig = {
  slug: string;
  name: string;
  mascot: string;
  shortDescription: string;
  systemPrompt: string;
  defaultModelAlias: string;
  tools: string[];
  retrievalScopes: ("thread" | "agent" | "workspace")[];
  starterPrompts: string[];
  artifactModes: string[];
  ui: {
    accent: string;
    welcomeTitle: string;
    placeholder: string;
  };
};
```

Separation happens in 5 layers:

1. prompt layer
2. tool layer
3. retrieval layer
4. artifact behavior layer
5. evaluation layer

Example:

- `finance` can access ledger/report tools and finance memory.
- `knowledge` can access document ingestion and retrieval tools.
- `spark` can be the broadest agent but still under controlled tool policy.

## 8. Foundational Chat Engine

## 8.1 Normalized request pipeline

Every send-message call should go through one orchestration pipeline:

1. authenticate user
2. load thread
3. load agent config
4. persist user message
5. resolve memory package
6. resolve model route via gateway
7. execute model call with streaming
8. execute tools if requested
9. finalize assistant message
10. store usage, traces, artifacts, summaries
11. publish realtime updates to UI

This pipeline should replace the current "append message and call Anthropic directly" flow.

## 8.2 Conversation state strategy

Do not send full raw history forever.

Use a layered context pack:

- latest raw turns
- rolling thread summary
- pinned user preferences
- agent instructions
- retrieval snippets
- artifact context if the user is interacting with something on the right rail

Recommended context policy:

- keep last 12-20 raw messages
- maintain rolling summary after threshold
- inject only relevant memories
- attach artifact state only if active

This is cheaper and more stable than replaying the entire transcript.

## 8.3 Streaming

Streaming is mandatory for premium chat feel.

Phase 1:

- SSE from Worker to frontend

Phase 2:

- optional WebSocket/Durable Object live session for richer coordination

Stream event types:

- `message.delta`
- `message.completed`
- `tool.started`
- `tool.completed`
- `artifact.created`
- `artifact.updated`
- `turn.completed`
- `turn.failed`

## 8.4 Background tasks

Some requests should not block the main chat response:

- long document analysis
- report generation
- large file extraction
- ecommerce catalog batch work
- knowledge indexing

These should create background jobs and post progress back into the thread as event messages.

## 9. Gateway Strategy

## 9.1 Recommended approach

Do not bind the product to one model API directly.

Build an internal gateway contract in the Worker:

`model alias -> routing policy -> provider adapter -> provider model`

Example aliases:

- `fast-general`
- `balanced-general`
- `deep-reasoning`
- `cheap-extraction`
- `long-context`

Then the agent config uses aliases, not raw provider model names.

## 9.2 Why this is the right abstraction

It gives:

- cost control
- fallback
- per-agent routing
- A/B testing
- latency tuning
- provider migration without product rewrite

## 9.3 Routing policy

Routing should consider:

- task type
- estimated token load
- latency target
- tool usage requirement
- context size
- user tier later if needed
- provider health
- cached prompt opportunities

Example policy:

- `spark`
  short queries -> cheap fast model
  complex planning -> better reasoning alias
- `knowledge`
  large doc Q&A -> long-context alias
- `finance`
  structured output/reporting -> balanced or reasoning alias

## 9.4 Gateway options

Recommendation order for this repo:

1. Build your own Worker-level gateway first.
2. Put Cloudflare AI Gateway in front for observability, caching, rate limits, and fallback policy if compatible with chosen providers.
3. If you want external multi-provider routing later, evaluate OpenRouter only as a route behind your abstraction, never as product-coupled core logic.

Why:

- your own gateway protects product architecture
- Cloudflare fits your current deployment
- external router can be swapped in later

## 10. Cost Efficiency Strategy

Cost control must be designed from day 1, not added later.

## 10.1 Main levers

1. context compaction
2. prompt caching
3. model alias routing
4. background processing for heavy tasks
5. structured retrieval instead of raw transcript replay
6. artifact reuse instead of regenerating
7. summary checkpoints
8. rate limits and credit controls

## 10.2 Practical cost rules

- Do not include inactive right-rail artifacts in every request.
- Do not include full file text if retrieval can select relevant chunks.
- Summarize old turns after threshold.
- Use cheaper extraction/summarization models for preprocess steps.
- Use better reasoning models only for decision-heavy turns.
- Cache stable system prompt blocks and large workspace instructions where provider supports it.
- Store usage at turn level so routing can be tuned from real data.

## 10.3 Credit model

Your current flat "1 credit per chat message" is too blunt.

Move to a turn-cost formula:

- base turn fee
- plus model band multiplier
- plus tool execution cost
- plus storage/artifact cost if applicable

Still keep pricing simple in UI:

- show "from X credits"
- show per-turn estimate before run for expensive operations

## 11. Memory Model

This is the most important architectural decision after gateway routing.

Recommended memory layers:

## 11.1 Thread memory

Used only inside one thread.

Contains:

- recent raw messages
- rolling thread summary
- active artifact context

## 11.2 Agent memory

Used by one specific agent across that user's threads.

Contains:

- stable preferences for that domain
- recurring business entities
- recurring formats

Example:

- finance remembers preferred currency, report format, chart style
- knowledge remembers preferred document grouping

## 11.3 Workspace memory

Shared across all agents, but only as curated facts/preferences.

Contains:

- company name
- brand voice
- business model
- product lines
- glossary
- SOP anchors

Important:

- workspace memory is shared
- raw thread transcript is not globally shared by default

That is the clean answer to "same total history but separated."

## 11.4 Retrieval memory

This is document-backed memory:

- uploaded docs
- URLs
- generated reports
- notes
- meeting summaries

This should power the `knowledge` agent first, then be usable by others with permission.

## 12. Right-Side Canvas / Artifact System

Treat the right sidebar as an artifact renderer, not a generic random panel.

## 12.1 Artifact-first design

Every structured output can be elevated into an artifact.

Examples:

- SOP draft
- pricing table
- monthly summary
- campaign plan
- product copy set
- extracted entities
- citations bundle
- doc summary

## 12.2 Artifact lifecycle

1. model/tool generates structured result
2. orchestrator stores artifact
3. UI opens artifact in right rail
4. user can continue chatting against that artifact
5. updates create new artifact revisions or patch current artifact

## 12.3 Canvas modes

- preview mode
- focus mode
- compare mode later

## 12.4 Why this matters

Without artifacts, the right panel becomes a shallow UI toy.

With artifacts:

- outputs become persistent
- user can iterate on business assets
- thread becomes a workspace, not just a transcript

## 13. Tools and Skills

Skill separation must not live only inside prompts.

We need real tool policy.

## 13.1 Tool categories

Phase-1 likely tool families:

- `knowledge.search_docs`
- `knowledge.open_artifact`
- `finance.build_report`
- `finance.analyze_csv`
- `operations.generate_sop`
- `operations.make_checklist`
- `ecommerce.generate_listing_copy`
- `ecommerce.compare_skus`
- `growth.plan_campaign`
- `workspace.lookup_entity`

## 13.2 Tool permissions by agent

Each agent gets an allowlist.

Example:

- `spark` -> broad read, narrow write
- `finance` -> finance tools only
- `knowledge` -> retrieval-heavy tools
- `operations` -> SOP/checklist/process tools

## 13.3 Tool execution pattern

Tool calls should:

- be visible in the UI
- be stored in `tool_executions`
- support retries
- emit partial progress
- attach outputs as artifacts when appropriate

## 14. Security and Governance

## 14.1 Tenant isolation

Keep Supabase RLS as a core security boundary.

All new thread, artifact, memory, and tool tables must remain user-owned or workspace-owned with explicit policy.

## 14.2 Prompt/knowledge safety

Guardrails needed:

- file type restrictions
- upload scanning later
- tool input validation
- allowlisted outbound connectors only
- prompt injection resistant retrieval format
- hidden system prompt never exposed to client

## 14.3 Auditability

For business use, store:

- who triggered the turn
- which agent replied
- which model/provider handled it
- which tools ran
- what artifacts were created
- what credits were charged

## 15. Observability

You need traceability from day 1.

At minimum per turn:

- user id
- agent slug
- thread id
- model alias
- provider
- resolved model
- latency
- token usage
- cache usage
- tool count
- error type
- credit charge

Dashboard views needed later:

- usage by agent
- cost by model alias
- latency by provider
- failure rate by tool
- top artifact types

## 16. Recommended Repo Refactor Plan

## 16.1 Frontend

Create a dedicated AI feature area instead of keeping everything inside `Dashboard.jsx`.

Recommended structure:

```text
src/features/ai/
  agents/
    registry.js
  components/
    AgentCard.jsx
    AgentSidebar.jsx
    ChatComposer.jsx
    ChatMessageList.jsx
    ThreadList.jsx
    RightCanvas.jsx
    ArtifactRenderer.jsx
  hooks/
    useAgentThreads.js
    useChatSession.js
    useArtifacts.js
  pages/
    AIAgentsHome.jsx
    AgentWorkspace.jsx
  lib/
    ai-api.js
    artifact-types.js
```

Why:

- `Dashboard.jsx` is already too large
- AI workspace will grow faster than other dashboard tabs
- keeping it modular prevents another rewrite in 2 weeks

## 16.2 Backend

Split chat orchestration out of `worker/index.js`.

Recommended structure:

```text
worker/ai/
  registry.js
  gateway/
    index.js
    providers/
      anthropic.js
      openrouter.js
      openai-compatible.js
  orchestration/
    run-turn.js
    build-context.js
    route-model.js
    summarize-thread.js
  memory/
    load-memory.js
    write-memory.js
  artifacts/
    create-artifact.js
  tools/
    registry.js
    finance/
    knowledge/
    operations/
    ecommerce/
    growth/
  routes/
    send-message.js
    stream-message.js
    threads.js
    artifacts.js
```

## 16.3 Database

Migration order:

1. add `agent_profiles`
2. extend/replace `chats` into richer thread model
3. extend/replace `messages`
4. add `chat_turns`
5. add `chat_artifacts`
6. add `memory_items`
7. add `tool_executions`
8. add indexes and RLS

## 17. Delivery Phases

## Phase 0: Foundation alignment

Goal:

- freeze architecture
- define agent registry
- define schema
- define UI layout

Deliverables:

- this foundation doc
- agent taxonomy
- schema migration plan
- routing and gateway contract

## Phase 1: Real AIAGENTS home

Goal:

- replace dummy AI Agent home with 6 real cards

Deliverables:

- agent registry config
- dashboard AIAGENTS page
- temporary mascot assignments
- per-agent landing/open behavior

## Phase 2: Threaded agent workspace

Goal:

- real per-agent thread experience

Deliverables:

- left thread rail
- center chat
- empty right rail shell
- thread CRUD
- agent-bound threads
- modular frontend split from `Dashboard.jsx`

## Phase 3: Orchestrator + gateway abstraction

Goal:

- remove direct provider coupling

Deliverables:

- normalized send-message route
- provider adapter interface
- model alias routing
- turn-level usage logging
- better credit charging

## Phase 4: Streaming + artifacts

Goal:

- premium chat behavior

Deliverables:

- SSE streaming
- structured artifacts
- right canvas open/close states
- citations and source cards

## Phase 5: Memory + retrieval

Goal:

- persistent intelligence

Deliverables:

- thread summaries
- agent memory
- workspace memory
- knowledge ingestion
- retrieval-backed answers

## Phase 6: Tooling and business workflows

Goal:

- make the agents actually useful for business

Deliverables:

- finance tools
- operations tools
- ecommerce tools
- knowledge tools
- growth tools

## Phase 7: Optimization and scale

Goal:

- reliability and cost efficiency

Deliverables:

- prompt caching
- retry/fallback policies
- rate limiting per agent
- eval suite
- observability dashboard

## 18. Non-Negotiable Decisions

These are the decisions I strongly recommend we lock early:

1. One thread belongs to one agent only.
2. Shared platform does not mean shared raw transcript across all agents.
3. Workspace memory is shared; thread memory is isolated.
4. Use model aliases, never hardcode provider models into product logic.
5. The right rail is artifact-driven.
6. Streaming is part of MVP for the serious chat workspace, not a nice-to-have.
7. Move AI code out of `Dashboard.jsx` before the feature grows further.
8. Worker becomes the orchestration layer; Supabase remains source of truth.

## 19. Immediate Build Recommendation

If we start implementation now, the smartest first build sequence is:

1. Create `agent registry` and 6-card AIAGENTS home.
2. Extract chat UI from `Dashboard.jsx` into `src/features/ai`.
3. Add `agent_id` to thread model and bind thread-to-agent.
4. Add new Worker AI route structure with gateway abstraction.
5. Add streaming.
6. Add artifact schema and right rail shell.

This gives a visible product jump fast without locking us into the wrong backend.

## 20. Specific Risks

## Risk 1: over-sharing memory

If all agents share all history, responses become muddy and expensive.

Mitigation:

- isolate thread memory
- share only curated workspace memory

## Risk 2: giant prompt architecture

If separation lives only in prompts, the system becomes brittle.

Mitigation:

- use registry + tool policy + retrieval scoping

## Risk 3: `Dashboard.jsx` becomes unmaintainable

Mitigation:

- extract AI workspace immediately

## Risk 4: provider lock-in

Mitigation:

- internal gateway abstraction from the start

## Risk 5: cost explosion from raw history replay

Mitigation:

- summaries
- retrieval
- caching
- alias routing

## 21. Research Notes Used For This Plan

As of 2026-07-02, the following current docs informed this plan:

- OpenAI conversation state: [developers.openai.com/api/docs/guides/conversation-state](https://developers.openai.com/api/docs/guides/conversation-state)
- OpenAI tools: [developers.openai.com/api/docs/guides/tools](https://developers.openai.com/api/docs/guides/tools)
- OpenAI background mode: [developers.openai.com/api/docs/guides/background](https://developers.openai.com/api/docs/guides/background)
- OpenAI cost optimization: [developers.openai.com/api/docs/guides/cost-optimization](https://developers.openai.com/api/docs/guides/cost-optimization)
- OpenAI latency optimization: [developers.openai.com/api/docs/guides/latency-optimization](https://developers.openai.com/api/docs/guides/latency-optimization)
- Anthropic prompt caching: [platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- Anthropic tool use: [platform.claude.com/docs/en/agents-and-tools/tool-use/overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- Cloudflare AI Gateway: [developers.cloudflare.com/ai-gateway](https://developers.cloudflare.com/ai-gateway/)
- Cloudflare Durable Objects: [developers.cloudflare.com/durable-objects](https://developers.cloudflare.com/durable-objects/)
- Cloudflare Workers WebSockets: [developers.cloudflare.com/workers/runtime-apis/websockets](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- Supabase Realtime: [supabase.com/docs/guides/realtime](https://supabase.com/docs/guides/realtime)
- Supabase RLS: [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- OpenRouter provider routing: [openrouter.ai/docs/guides/routing/provider-selection](https://openrouter.ai/docs/guides/routing/provider-selection)

## 22. Final Recommendation

Do not treat `AIAGENTS` as "one chat page with 6 prompts."

Treat it as a modular AI workspace platform with:

- agent registry
- thread engine
- memory engine
- artifact engine
- gateway layer
- tool runtime

That is the shortest path to something that can actually feel like a serious business AI product instead of a dressed-up demo.
