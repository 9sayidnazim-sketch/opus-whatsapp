create table public.opus_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('Transaction','Budget','Goal','FamilyMember','NotificationSettings','Conversation')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);
create index opus_records_owner_kind on public.opus_records(owner_id, kind, created_at desc);
alter table public.opus_records enable row level security;
create policy "Users own their records" on public.opus_records for all to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
revoke all on public.opus_records from anon;
grant select, insert, update, delete on public.opus_records to authenticated;
