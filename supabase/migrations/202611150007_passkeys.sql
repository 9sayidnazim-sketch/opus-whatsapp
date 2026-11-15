-- Passkey (WebAuthn) credentials and single-use challenges for /api/webauthn.
-- Only the server, using the Supabase secret key, writes these tables. Signed-in
-- users can list and revoke their own passkeys; nobody else can read them.

create table public.opus_passkeys (
  id text primary key check (id ~ '^[A-Za-z0-9_-]+$' and char_length(id) between 16 and 1366),  -- base64url credential ID
  owner_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null,                                     -- base64 COSE public key
  counter bigint not null default 0 check (counter >= 0),
  transports text[] not null default '{}',
  device_type text,
  backed_up boolean not null default false,
  device_name text check (char_length(device_name) <= 80),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index opus_passkeys_owner on public.opus_passkeys(owner_id, created_at desc);

alter table public.opus_passkeys enable row level security;
create policy "Users read own passkeys" on public.opus_passkeys for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Users revoke own passkeys" on public.opus_passkeys for delete to authenticated
  using ((select auth.uid()) = owner_id);
-- No insert or update policy: enrolment and signature counters go through the
-- server, which has verified the WebAuthn ceremony and the caller's session.
revoke all on public.opus_passkeys from anon, authenticated;
grant select, delete on public.opus_passkeys to authenticated;
grant all on public.opus_passkeys to service_role;

create table public.opus_passkey_challenges (
  challenge text primary key check (char_length(challenge) between 16 and 128),
  ceremony text not null check (ceremony in ('registration', 'authentication')),
  owner_id uuid references auth.users(id) on delete cascade,  -- null for sign-in before we know who
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index opus_passkey_challenges_expiry on public.opus_passkey_challenges(expires_at);

-- RLS with no policies: only the server role can issue or consume challenges.
alter table public.opus_passkey_challenges enable row level security;
revoke all on public.opus_passkey_challenges from anon, authenticated;
grant all on public.opus_passkey_challenges to service_role;

-- Make the new tables visible to the Data API straight away.
notify pgrst, 'reload schema';
