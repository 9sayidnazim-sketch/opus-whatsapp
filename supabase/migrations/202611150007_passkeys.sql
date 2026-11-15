-- Passkey (WebAuthn) credentials and single-use challenges for /api/webauthn.
-- Only the server, using the Supabase secret key, writes these tables. Signed-in
-- users can list and revoke their own passkeys; nobody else can read them.
--
-- Safe to run more than once: it creates what is missing and replaces the checks,
-- policies and grants, which also repairs the first version of this file (its id
-- check used a regex bound Postgres rejects, so every insert failed).

create table if not exists public.opus_passkeys (
  id text primary key,                 -- base64url credential ID
  owner_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null,            -- base64 COSE public key
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_type text,
  backed_up boolean not null default false,
  device_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- Postgres regex bounds stop at 255, so the id length is checked separately.
alter table public.opus_passkeys drop constraint if exists opus_passkeys_id_check;
alter table public.opus_passkeys add constraint opus_passkeys_id_check
  check (id ~ '^[A-Za-z0-9_-]+$' and char_length(id) between 16 and 1366);
alter table public.opus_passkeys drop constraint if exists opus_passkeys_counter_check;
alter table public.opus_passkeys add constraint opus_passkeys_counter_check check (counter >= 0);
alter table public.opus_passkeys drop constraint if exists opus_passkeys_device_name_check;
alter table public.opus_passkeys add constraint opus_passkeys_device_name_check
  check (char_length(device_name) <= 80);
create index if not exists opus_passkeys_owner on public.opus_passkeys(owner_id, created_at desc);

alter table public.opus_passkeys enable row level security;
drop policy if exists "Users read own passkeys" on public.opus_passkeys;
create policy "Users read own passkeys" on public.opus_passkeys for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists "Users revoke own passkeys" on public.opus_passkeys;
create policy "Users revoke own passkeys" on public.opus_passkeys for delete to authenticated
  using ((select auth.uid()) = owner_id);
-- No insert or update policy: enrolment and signature counters go through the
-- server, which has verified the WebAuthn ceremony and the caller's session.
revoke all on public.opus_passkeys from anon, authenticated;
grant select, delete on public.opus_passkeys to authenticated;
grant all on public.opus_passkeys to service_role;

create table if not exists public.opus_passkey_challenges (
  challenge text primary key,
  ceremony text not null,
  owner_id uuid references auth.users(id) on delete cascade,  -- null for sign-in before we know who
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.opus_passkey_challenges drop constraint if exists opus_passkey_challenges_challenge_check;
alter table public.opus_passkey_challenges add constraint opus_passkey_challenges_challenge_check
  check (char_length(challenge) between 16 and 128);
alter table public.opus_passkey_challenges drop constraint if exists opus_passkey_challenges_ceremony_check;
alter table public.opus_passkey_challenges add constraint opus_passkey_challenges_ceremony_check
  check (ceremony in ('registration', 'authentication'));
create index if not exists opus_passkey_challenges_expiry on public.opus_passkey_challenges(expires_at);

-- RLS with no policies: only the server role can issue or consume challenges.
alter table public.opus_passkey_challenges enable row level security;
revoke all on public.opus_passkey_challenges from anon, authenticated;
grant all on public.opus_passkey_challenges to service_role;

-- Make the tables visible to the Data API straight away.
notify pgrst, 'reload schema';
