create table opus_private.mpin_accounts (
  username text primary key,
  owner_id uuid unique not null references auth.users on delete cascade,
  failures integer not null default 0,
  blocked_until timestamptz
);
create table opus_private.mpin_config (secret_hash text primary key);
create table opus_private.mpin_limits (bucket text primary key, count integer not null, window_start timestamptz not null);
create function public.opus_mpin(secret text, operation text, handle text, credential text, bucket text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; base text; candidate text; suffix integer := 1; mailbox text; account opus_private.mpin_accounts; attempts integer;
begin
  if not exists(select 1 from opus_private.mpin_config where secret_hash=encode(sha256(convert_to(secret,'UTF8')),'hex')) then raise exception 'Unauthorized'; end if;
  if credential !~ '^[0-9a-f]{64}$' or length(handle) not between 1 and 60 or length(bucket)>80 then raise exception 'Invalid input'; end if;
  insert into opus_private.mpin_limits as l values(bucket,1,now()) on conflict on constraint mpin_limits_pkey do update
    set count=case when l.window_start < now()-interval '15 minutes' then 1 else l.count+1 end,
    window_start=case when l.window_start < now()-interval '15 minutes' then now() else l.window_start end returning count into attempts;
  if attempts>20 then return '{"status":"limited"}'; end if;
  if operation='create' then
    base := left(regexp_replace(lower(handle),'[^a-z0-9]','','g'),18);
    if length(base)<2 then base := 'opus'; end if;
    perform pg_advisory_xact_lock(hashtextextended('opus-mpin-create',0));
    candidate := base;
    while exists(select 1 from opus_private.mpin_accounts where username=candidate) loop
      suffix := suffix+1;
      candidate := base || suffix;
    end loop;
    uid := gen_random_uuid();
    mailbox := uid::text || '@opus-account.invalid';
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,confirmation_token,recovery_token,email_change,email_change_token_new)
      values ('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',mailbox,extensions.crypt(credential,extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name',handle,'username',candidate),'','','','');
    insert into auth.identities(id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
      values(gen_random_uuid(),uid::text,uid,jsonb_build_object('sub',uid,'email',mailbox),'email',now(),now(),now());
    insert into opus_private.mpin_accounts(username,owner_id) values(candidate,uid);
    return jsonb_build_object('status','ok','username',candidate,'email',mailbox);
  end if;
  if operation <> 'login' then raise exception 'Invalid operation'; end if;
  select * into account from opus_private.mpin_accounts where username=handle for update;
  if not found then return '{"status":"invalid"}'; end if;
  if account.blocked_until>now() then return '{"status":"limited"}'; end if;
  select u.email into mailbox from auth.users u where u.id=account.owner_id and u.encrypted_password=extensions.crypt(credential,u.encrypted_password);
  if mailbox is null then
    attempts := case when account.blocked_until is not null then 1 else account.failures+1 end;
    update opus_private.mpin_accounts set failures=attempts, blocked_until=case when attempts>=5 then now()+interval '30 minutes' end where owner_id=account.owner_id;
    return '{"status":"invalid"}';
  end if;
  update opus_private.mpin_accounts set failures=0,blocked_until=null where owner_id=account.owner_id;
  return jsonb_build_object('status','ok','username',handle,'email',mailbox);
end;
$$;
revoke all on function public.opus_mpin(text,text,text,text,text) from public;
grant execute on function public.opus_mpin(text,text,text,text,text) to anon;
