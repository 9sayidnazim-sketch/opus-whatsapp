create schema opus_private;
create table opus_private.whatsapp_config (secret_hash text primary key);
create table opus_private.whatsapp_links (
  owner_id uuid primary key references auth.users on delete cascade,
  phone text unique,
  code uuid unique,
  expires_at timestamptz
);
create table opus_private.whatsapp_events (id text primary key, received_at timestamptz not null default now());

create function public.opus_whatsapp_link(unlink boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); link opus_private.whatsapp_links;
begin
  if owner is null then raise exception 'Sign-in required'; end if;
  if unlink then
    delete from opus_private.whatsapp_links where owner_id = owner;
    return jsonb_build_object('linked', false);
  end if;
  insert into opus_private.whatsapp_links(owner_id, code, expires_at)
    values (owner, gen_random_uuid(), now() + interval '10 minutes')
    on conflict (owner_id) do update set code = excluded.code, expires_at = excluded.expires_at
    returning * into link;
  return jsonb_build_object('linked',link.phone is not null,'code',link.code);
end;
$$;
revoke all on function public.opus_whatsapp_link(boolean) from public;
grant execute on function public.opus_whatsapp_link(boolean) to authenticated;

create function public.opus_whatsapp_event(secret text, event_id text, sender text, action text, details jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid; label text; amount numeric;
begin
  if not exists (select 1 from opus_private.whatsapp_config
    where secret_hash = encode(sha256(convert_to(secret,'UTF8')),'hex'))
    then raise exception 'Unauthorized'; end if;
  if sender !~ '^[0-9]{8,15}$' or char_length(event_id) not between 8 and 255
    then raise exception 'Invalid event'; end if;
  insert into opus_private.whatsapp_events(id) values (event_id) on conflict do nothing;
  if not found then return jsonb_build_object('status','duplicate'); end if;
  if action = 'link' then
    if exists(select 1 from opus_private.whatsapp_links where phone=sender) then
      return jsonb_build_object('status','already_linked');
    end if;
    update opus_private.whatsapp_links set phone=sender, code=null, expires_at=null
      where code::text=details->>'code' and expires_at>now() and phone is null;
    return jsonb_build_object('status',case when found then 'linked' else 'invalid_code' end);
  end if;
  select owner_id into owner from opus_private.whatsapp_links where phone=sender;
  if owner is null then return jsonb_build_object('status','unlinked'); end if;
  if action in ('expense','income') then
    label := trim(details->>'label');
    amount := (details->>'amount')::numeric;
    if label is null or char_length(label) not between 1 and 120 or amount is null or amount <= 0 or amount > 100000000
      then return jsonb_build_object('status','invalid_transaction'); end if;
    insert into public.opus_records(owner_id,kind,data) values (owner,'Transaction',
      jsonb_build_object('type',case when action='expense' then 'despesa' else 'receita' end,
        'amount',amount,'description',label,'category',case when action='expense' then 'outros_gastos' else 'outras_receitas' end,
        'date',(now() at time zone 'Asia/Dubai')::date,'payment_status','pago'));
    return jsonb_build_object('status','recorded');
  end if;
  return jsonb_build_object('status','ready');
end;
$$;
revoke all on function public.opus_whatsapp_event(text,text,text,text,jsonb) from public;
grant execute on function public.opus_whatsapp_event(text,text,text,text,jsonb) to anon;
