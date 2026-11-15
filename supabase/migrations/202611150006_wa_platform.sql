-- WhatsApp AI Agent Platform: schema, row-level security, queue and memory functions.
-- Every table carries org_id and tenant_id. Tables are prefixed wa_ so they sit beside the Fuloozi ledger.
create extension if not exists vector with schema extensions;

create function public.wa_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_date := now(); return new; end;
$$;

create table public.wa_organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_email text,
  plan text not null default 'starter',
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

create table public.wa_tenant (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  timezone text not null default 'Asia/Dubai',
  default_language text not null default 'en',
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  plan text not null default 'starter',
  monthly_message_cap integer not null default 5000 check (monthly_message_cap >= 0),
  monthly_cost_cap_usd numeric not null default 50 check (monthly_cost_cap_usd >= 0),
  owner_phone text check (owner_phone ~ '^[0-9]{8,15}$'),
  default_group_allowed boolean not null default true,
  agent_provider text check (agent_provider in ('base44_superagent','openai','anthropic','custom_openai_compatible')),
  agent_id text,
  agent_settings jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

-- Console users. tenant_id null = organization-wide role; org_id null = platform_owner.
create table public.wa_member (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  org_id uuid references public.wa_organization on delete cascade,
  tenant_id uuid references public.wa_tenant on delete cascade,
  role text not null check (role in ('platform_owner','org_owner','tenant_admin','tenant_operator','viewer')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system',
  unique nulls not distinct (user_id, org_id, tenant_id)
);

create table public.wa_credential (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  kind text not null check (kind in ('whatsapp','agent','connector')),
  provider text not null,
  encrypted_payload text not null,
  last4 text not null,
  rotated_at timestamptz,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active','invalid','revoked')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);
create unique index wa_credential_active on public.wa_credential(tenant_id, kind, provider) where status = 'active';

create table public.wa_channel (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  provider text not null,
  provider_mode text not null check (provider_mode in ('meta_cloud','reseller')),
  phone_number_id text not null unique,
  waba_id text,
  display_phone_number text not null,
  webhook_verify_token text not null,
  api_base_url text,
  graph_version text not null default 'v24.0',
  status text not null default 'pending' check (status in ('pending','active','disabled','error')),
  capabilities jsonb not null default '{}'::jsonb,
  health jsonb not null default '{}'::jsonb,
  health_checked_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

create table public.wa_contact (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  phone text not null,
  name text,
  role text not null default 'member' check (role in ('owner','admin','member')),
  is_group_admin boolean not null default false,
  memory_enabled boolean not null default true,
  blocked boolean not null default false,
  timezone text,
  tags text[] not null default '{}',
  last_seen_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system',
  unique (tenant_id, phone)
);

create table public.wa_conversation (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  channel_id uuid not null references public.wa_channel on delete cascade,
  chat_type text not null check (chat_type in ('dm','group')),
  chat_id text not null,
  chat_name text,
  -- Groups start silent: heard and remembered, never answered until an admin allows it.
  listen_mode text not null default 'silent'
    check (listen_mode in ('silent','admin_only','mention_only','command_only','smart','disabled')),
  command_prefix text not null default '/hermes',
  allowlisted boolean not null default false,
  cooldown_seconds integer not null default 20 check (cooldown_seconds >= 0),
  hourly_cap integer not null default 30 check (hourly_cap >= 0),
  smart_threshold numeric not null default 0.6,
  memory_enabled boolean not null default true,
  retention_days integer not null default 90 check (retention_days > 0),
  summary_schedule text not null default 'nightly',
  escalation_contact text,
  mute_until timestamptz,
  status text not null default 'active' check (status in ('active','archived')),
  added_by text,
  added_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system',
  unique (channel_id, chat_id)
);

create table public.wa_conversation_member (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  conversation_id uuid not null references public.wa_conversation on delete cascade,
  contact_id uuid not null references public.wa_contact on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  admin_source text check (admin_source in ('registry','provider','command')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system',
  unique (conversation_id, contact_id)
);

create table public.wa_message (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  conversation_id uuid not null references public.wa_conversation on delete cascade,
  provider_message_id text not null unique,
  direction text not null check (direction in ('inbound','outbound')),
  sender_phone text,
  sender_name text,
  is_from_agent boolean not null default false,
  text text,
  media jsonb not null default '[]'::jsonb,
  reply_to text,
  processed boolean not null default false,
  policy_decision jsonb,
  reply_block_reason text,
  tokens_used integer not null default 0,
  cost_usd numeric not null default 0,
  "timestamp" timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);
create index wa_message_chat on public.wa_message(tenant_id, conversation_id, "timestamp" desc);
create index wa_message_block_reason on public.wa_message(tenant_id, reply_block_reason) where reply_block_reason is not null;

create table public.wa_memory (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  scope_type text not null check (scope_type in ('tenant','group','person')),
  scope_id uuid not null,
  kind text not null check (kind in ('fact','preference','instruction','decision','relationship','event')),
  topic text not null check (topic ~ '^[a-z0-9_]{1,80}$'),
  content text not null check (char_length(content) between 1 and 1000),
  evidence_level text not null check (evidence_level in ('user_stated','confirmed','inferred')),
  confidence numeric not null default 0.6 check (confidence between 0 and 1),
  source_message_id uuid references public.wa_message on delete set null,
  expires_at timestamptz,
  superseded_by uuid references public.wa_memory on delete set null,
  embedding extensions.vector(1536),
  search tsvector generated always as (to_tsvector('simple', topic || ' ' || content)) stored,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);
create index wa_memory_scope on public.wa_memory(tenant_id, scope_type, scope_id, topic);
-- One live row per topic and scope: a correction supersedes, it never duplicates.
create unique index wa_memory_live_topic on public.wa_memory(tenant_id, scope_type, scope_id, topic) where superseded_by is null;
create index wa_memory_search on public.wa_memory using gin(search);
create index wa_memory_embedding on public.wa_memory using hnsw (embedding extensions.vector_cosine_ops);

create table public.wa_summary (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  scope_type text not null check (scope_type in ('tenant','group','person')),
  scope_id uuid not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  summary text not null,
  open_items jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system',
  unique (tenant_id, scope_type, scope_id, window_start)
);

create table public.wa_knowledge (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  title text not null,
  content text not null,
  category text,
  source text,
  tags text[] not null default '{}',
  verified boolean not null default false,
  embedding extensions.vector(1536),
  search tsvector generated always as (to_tsvector('simple', title || ' ' || content)) stored,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);
create index wa_knowledge_search on public.wa_knowledge using gin(search);
create index wa_knowledge_embedding on public.wa_knowledge using hnsw (embedding extensions.vector_cosine_ops);

create table public.wa_task (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  title text not null,
  assigned_to_phone text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','in_progress','blocked','done','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  source text not null default 'manual' check (source in ('agent','manual','meeting')),
  evidence text,
  escalation_step integer not null default 0,
  completed_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

create table public.wa_reminder (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  task_id uuid references public.wa_task on delete cascade,
  channel_id uuid references public.wa_channel on delete cascade,
  conversation_id uuid references public.wa_conversation on delete cascade,
  schedule text not null,
  reminder_count integer not null default 0,
  last_reminded timestamptz,
  escalate_after interval,
  status text not null default 'active' check (status in ('active','paused','done')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

create table public.wa_policy_rule (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  conversation_id uuid references public.wa_conversation on delete cascade,
  name text not null,
  when_jq text not null,
  action text not null check (action in ('allow_reply','block_reply','escalate','create_task')),
  priority integer not null default 100,
  enabled boolean not null default true,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

create table public.wa_audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.wa_organization on delete set null,
  tenant_id uuid references public.wa_tenant on delete set null,
  actor_type text not null check (actor_type in ('user','api_key','system','whatsapp')),
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  ip text,
  created_date timestamptz not null default now()
);
create index wa_audit_tenant on public.wa_audit_log(tenant_id, created_date desc);

create table public.wa_webhook_event (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.wa_organization on delete cascade,
  tenant_id uuid references public.wa_tenant on delete cascade,
  provider text not null,
  provider_event_id text not null unique,
  signature_valid boolean not null,
  payload jsonb,
  processed boolean not null default false,
  error text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

create table public.wa_outbound (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  channel_id uuid not null references public.wa_channel on delete cascade,
  conversation_id uuid references public.wa_conversation on delete cascade,
  -- For replies this is the inbound provider_message_id, so one inbound message can never be answered twice.
  idempotency_key text not null unique,
  recipient text not null,
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued','sent','failed','blocked')),
  attempts integer not null default 0,
  provider_message_id text,
  provider_response jsonb,
  error_code text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

create table public.wa_api_key (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.wa_organization on delete cascade,
  tenant_id uuid not null references public.wa_tenant on delete cascade,
  name text not null,
  key_hash text not null unique,
  prefix text not null,
  scopes text[] not null default '{read,write}',
  rate_limit_per_min integer not null default 120,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by text not null default 'system'
);

create table public.wa_deletion_certificate (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  tenant_id uuid not null,
  requested_by text not null,
  counts jsonb not null,
  created_date timestamptz not null default now()
);

-- Durable work queue. Jobs survive restarts; a job left running by a dead worker is reclaimed.
create table public.wa_job (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.wa_organization on delete cascade,
  tenant_id uuid references public.wa_tenant on delete cascade,
  kind text not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index wa_job_ready on public.wa_job(run_at) where status in ('queued','running');

create table public.wa_rate (bucket text primary key, count integer not null, window_start timestamptz not null);
create table public.wa_platform_config (key text primary key, value text not null);

-- updated_date triggers
do $$
declare t text;
begin
  foreach t in array array['wa_organization','wa_tenant','wa_member','wa_credential','wa_channel','wa_contact',
    'wa_conversation','wa_conversation_member','wa_message','wa_memory','wa_summary','wa_knowledge','wa_task',
    'wa_reminder','wa_policy_rule','wa_webhook_event','wa_outbound','wa_api_key','wa_job'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.wa_touch()', t || '_touch', t);
  end loop;
end $$;

-- Row-level security -------------------------------------------------------------------------------------------
create function public.wa_role_in(t uuid, roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.wa_member m
    where m.user_id = (select auth.uid()) and m.role = any(roles)
      and (m.tenant_id = t
        or (m.tenant_id is null and m.org_id = (select org_id from public.wa_tenant where id = t))
        or (m.org_id is null and m.tenant_id is null and m.role = 'platform_owner'))
  );
$$;
revoke all on function public.wa_role_in(uuid, text[]) from public, anon;
grant execute on function public.wa_role_in(uuid, text[]) to authenticated, service_role;

do $$
declare t text;
begin
  -- RLS on every table. Tables with no policy are reachable by the server role only.
  foreach t in array array['wa_organization','wa_tenant','wa_member','wa_credential','wa_channel','wa_contact',
    'wa_conversation','wa_conversation_member','wa_message','wa_memory','wa_summary','wa_knowledge','wa_task',
    'wa_reminder','wa_policy_rule','wa_audit_log','wa_webhook_event','wa_outbound','wa_api_key',
    'wa_deletion_certificate','wa_job','wa_rate','wa_platform_config'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;

  -- Console users read their tenant's rows. platform_owner reads everything, writes nothing.
  foreach t in array array['wa_channel','wa_contact','wa_conversation','wa_conversation_member','wa_message',
    'wa_memory','wa_summary','wa_knowledge','wa_task','wa_reminder','wa_policy_rule','wa_audit_log','wa_outbound'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format($p$create policy "members read" on public.%I for select to authenticated
      using (public.wa_role_in(tenant_id, array['platform_owner','org_owner','tenant_admin','tenant_operator','viewer']))$p$, t);
  end loop;

  -- Policy, memory and member edits need tenant_admin or org_owner.
  foreach t in array array['wa_contact','wa_conversation','wa_conversation_member','wa_memory','wa_knowledge',
    'wa_policy_rule'] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format($p$create policy "admins write" on public.%I for all to authenticated
      using (public.wa_role_in(tenant_id, array['org_owner','tenant_admin']))
      with check (public.wa_role_in(tenant_id, array['org_owner','tenant_admin']))$p$, t);
  end loop;

  -- Operators may also work tasks and reminders.
  foreach t in array array['wa_task','wa_reminder'] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format($p$create policy "operators write" on public.%I for all to authenticated
      using (public.wa_role_in(tenant_id, array['org_owner','tenant_admin','tenant_operator']))
      with check (public.wa_role_in(tenant_id, array['org_owner','tenant_admin','tenant_operator']))$p$, t);
  end loop;
end $$;

grant select on public.wa_tenant, public.wa_organization, public.wa_member to authenticated;
create policy "members read" on public.wa_tenant for select to authenticated
  using (public.wa_role_in(id, array['platform_owner','org_owner','tenant_admin','tenant_operator','viewer']));
create policy "members read" on public.wa_organization for select to authenticated
  using (exists (select 1 from public.wa_member m where m.user_id = (select auth.uid())
    and (m.org_id = wa_organization.id or m.role = 'platform_owner')));
create policy "own memberships" on public.wa_member for select to authenticated
  using (user_id = (select auth.uid()));
-- wa_credential, wa_api_key, wa_job, wa_webhook_event, wa_rate, wa_platform_config and
-- wa_deletion_certificate have no policies: secrets never reach a browser session.

-- Queue --------------------------------------------------------------------------------------------------------
create function public.wa_claim_jobs(batch integer default 10) returns setof public.wa_job
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.wa_job j set status = 'running', locked_at = now(), attempts = j.attempts + 1
  where j.id in (
    select id from public.wa_job
    where run_at <= now() and attempts < max_attempts
      and (status = 'queued' or (status = 'running' and locked_at < now() - interval '2 minutes'))
    order by run_at
    limit greatest(1, least(batch, 50))
    for update skip locked)
  returning j.*;
end;
$$;

-- Fixed-window rate limiter. Returns true when the hit is allowed.
create function public.wa_rate_hit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare hits integer;
begin
  insert into public.wa_rate as r values (p_bucket, 1, now())
  on conflict (bucket) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into hits;
  return hits <= p_limit;
end;
$$;

-- Memory -------------------------------------------------------------------------------------------------------
-- Dedupe by topic: same tenant + scope + topic updates in place when unchanged, supersedes when corrected.
create function public.wa_remember(
  p_tenant uuid, p_scope_type text, p_scope_id uuid, p_kind text, p_topic text, p_content text,
  p_evidence text, p_confidence numeric, p_source uuid default null, p_expires timestamptz default null,
  p_created_by text default 'system', p_embedding extensions.vector default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare live public.wa_memory; fresh uuid; org uuid; had_live boolean;
begin
  select org_id into org from public.wa_tenant where id = p_tenant;
  if org is null then raise exception 'Unknown tenant'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant::text || p_scope_type || p_scope_id::text || p_topic, 0));
  select * into live from public.wa_memory
    where tenant_id = p_tenant and scope_type = p_scope_type and scope_id = p_scope_id
      and topic = p_topic and superseded_by is null;
  had_live := found;
  if had_live and live.content = p_content then
    update public.wa_memory set confidence = greatest(confidence, p_confidence),
      evidence_level = case when p_evidence = 'confirmed' then 'confirmed' else evidence_level end,
      expires_at = p_expires where id = live.id;
    return live.id;
  end if;
  fresh := gen_random_uuid();
  if had_live then
    -- Park the old row first so the live-topic unique index never sees two live rows.
    update public.wa_memory set superseded_by = id where id = live.id;
  end if;
  insert into public.wa_memory(id, org_id, tenant_id, scope_type, scope_id, kind, topic, content, evidence_level,
    confidence, source_message_id, expires_at, created_by, embedding)
  values (fresh, org, p_tenant, p_scope_type, p_scope_id, p_kind, p_topic, p_content, p_evidence,
    p_confidence, p_source, p_expires, p_created_by, p_embedding);
  if had_live then
    update public.wa_memory set superseded_by = fresh where id = live.id;
  end if;
  return fresh;
end;
$$;

-- Recall is scoped inside the query: tenant and chat scope are predicates, never a post-filter.
create function public.wa_recall(
  p_tenant uuid, p_scope_type text, p_scope_id uuid, p_query text default null,
  p_embedding extensions.vector default null, p_k integer default 8)
returns setof public.wa_memory language sql stable security definer set search_path = '' as $$
  select m.* from public.wa_memory m
  where m.tenant_id = p_tenant and m.scope_type = p_scope_type and m.scope_id = p_scope_id
    and m.superseded_by is null and (m.expires_at is null or m.expires_at > now())
  order by
    case when p_embedding is not null and m.embedding is not null
      then m.embedding operator(extensions.<=>) p_embedding end asc nulls last,
    case when p_query is not null and p_query <> ''
      then ts_rank(m.search, plainto_tsquery('simple', p_query)) end desc nulls last,
    m.updated_date desc
  limit greatest(1, least(coalesce(p_k, 8), 8));
$$;

-- Explicit forget: hard delete (the topic's superseded history included) with an audit record.
create function public.wa_forget(p_tenant uuid, p_scope_type text, p_scope_id uuid, p_topic text default null,
  p_id uuid default null, p_actor_type text default 'system', p_actor_id text default null, p_ip text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare removed integer; topic_name text := p_topic; org uuid;
begin
  if p_topic is null and p_id is null then raise exception 'topic or id required'; end if;
  if topic_name is null then
    select topic into topic_name from public.wa_memory
      where id = p_id and tenant_id = p_tenant and scope_type = p_scope_type and scope_id = p_scope_id;
    if topic_name is null then return 0; end if;
  end if;
  select org_id into org from public.wa_tenant where id = p_tenant;
  delete from public.wa_memory
    where tenant_id = p_tenant and scope_type = p_scope_type and scope_id = p_scope_id and topic = topic_name;
  get diagnostics removed = row_count;
  if removed > 0 then
    insert into public.wa_audit_log(org_id, tenant_id, actor_type, actor_id, action, target_type, target_id, before, ip)
    values (org, p_tenant, p_actor_type, p_actor_id, 'memory.forget', 'memory', topic_name,
      jsonb_build_object('scope_type', p_scope_type, 'scope_id', p_scope_id, 'rows', removed), p_ip);
  end if;
  return removed;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.wa_claim_jobs(integer)',
    'public.wa_rate_hit(text, integer, integer)',
    'public.wa_remember(uuid, text, uuid, text, text, text, text, numeric, uuid, timestamptz, text, extensions.vector)',
    'public.wa_recall(uuid, text, uuid, text, extensions.vector, integer)',
    'public.wa_forget(uuid, text, uuid, text, uuid, text, text, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
