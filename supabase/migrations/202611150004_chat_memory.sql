alter table opus_private.whatsapp_links add column chat_id text unique;
alter table opus_private.whatsapp_links add column pairing_until timestamptz;

create table public.opus_chat_memory (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  channel text not null check (channel in ('web','whatsapp')),
  question text not null check (char_length(question) between 1 and 2000),
  answer text not null check (char_length(answer) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index opus_chat_memory_owner on public.opus_chat_memory(owner_id,id desc);
alter table public.opus_chat_memory enable row level security;
create policy "Users read own assistant memory" on public.opus_chat_memory for select to authenticated
  using (owner_id=(select auth.uid()));
create policy "Users write own web memory" on public.opus_chat_memory for insert to authenticated
  with check (owner_id=(select auth.uid()) and channel='web');
revoke all on public.opus_chat_memory from anon;
grant select,insert on public.opus_chat_memory to authenticated;

create function public.opus_open_whatsapp()
returns text language plpgsql security definer set search_path='' as $$
declare owner uuid := auth.uid(); id text;
begin
  if owner is null then raise exception 'Sign-in required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('opus-chat-id',0));
  insert into opus_private.whatsapp_links(owner_id) values(owner) on conflict(owner_id) do nothing;
  select chat_id into id from opus_private.whatsapp_links where owner_id=owner for update;
  if id is null then
    loop
      id := (1000000000 + floor(random()*9000000000))::bigint::text;
      exit when not exists(select 1 from opus_private.whatsapp_links where chat_id=id);
    end loop;
  end if;
  update opus_private.whatsapp_links set chat_id=id,pairing_until=case when phone is null then now()+interval '10 minutes' end
    where owner_id=owner;
  return id;
end;
$$;
revoke all on function public.opus_open_whatsapp() from public;
grant execute on function public.opus_open_whatsapp() to authenticated;

create function public.opus_account_chat(secret text,sender text,event_id text,chat_code text,question text,answer text,expected_owner uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid; display_name text; history jsonb; attempts integer; rate_bucket text;
begin
  if not exists(select 1 from opus_private.whatsapp_config where secret_hash=encode(sha256(convert_to(secret,'UTF8')),'hex'))
    then raise exception 'Unauthorized'; end if;
  if sender !~ '^[0-9]{8,15}$' then raise exception 'Invalid sender'; end if;
  select owner_id into owner from opus_private.whatsapp_links where phone=sender;
  if question is not null and answer is not null then
    if owner is not null and owner=expected_owner then
      insert into public.opus_chat_memory(owner_id,channel,question,answer)
      values(owner,'whatsapp',left(question,2000),left(answer,2000));
      return jsonb_build_object('status','saved');
    end if;
    return jsonb_build_object('status','unlinked');
  end if;
  if chat_code is not null then
    insert into opus_private.whatsapp_events(id) values(event_id) on conflict do nothing;
    if not found then return jsonb_build_object('status','duplicate'); end if;
    if owner is not null then
      if exists(select 1 from opus_private.whatsapp_links where owner_id=owner and chat_id=chat_code)
        then return jsonb_build_object('status','linked'); end if;
      return jsonb_build_object('status','already_linked');
    end if;
    rate_bucket := 'wa:'||encode(sha256(convert_to(sender,'UTF8')),'hex');
    insert into opus_private.mpin_limits as l values(rate_bucket,1,now()) on conflict on constraint mpin_limits_pkey do update
      set count=case when l.window_start<now()-interval '15 minutes' then 1 else l.count+1 end,
      window_start=case when l.window_start<now()-interval '15 minutes' then now() else l.window_start end
      returning count into attempts;
    if attempts>5 then return jsonb_build_object('status','invalid_code'); end if;
    update opus_private.whatsapp_links set phone=sender,pairing_until=null,code=null,expires_at=null
      where chat_id=chat_code and phone is null and pairing_until>now();
    return jsonb_build_object('status',case when found then 'linked' else 'invalid_code' end);
  end if;
  if owner is null then return jsonb_build_object('status','unlinked'); end if;
  select raw_user_meta_data->>'full_name' into display_name from auth.users where id=owner;
  select coalesce(jsonb_agg(jsonb_build_object('question',m.question,'answer',m.answer) order by m.id),'[]') into history
    from (select id,question,answer from public.opus_chat_memory where owner_id=owner order by id desc limit 10) m;
  return jsonb_build_object('status','ready','name',display_name,'memory',history,'owner',owner);
end;
$$;
revoke all on function public.opus_account_chat(text,text,text,text,text,text,uuid) from public;
grant execute on function public.opus_account_chat(text,text,text,text,text,text,uuid) to anon;

create or replace function public.opus_whatsapp_link(unlink boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid := auth.uid();
begin
  if owner is null then raise exception 'Sign-in required'; end if;
  if unlink then
    update opus_private.whatsapp_links set phone=null,code=null,expires_at=null,pairing_until=null where owner_id=owner;
  end if;
  return jsonb_build_object('linked',exists(select 1 from opus_private.whatsapp_links where owner_id=owner and phone is not null));
end;
$$;
