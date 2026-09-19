drop function if exists public.accept_store_invite(text);

create or replace function public.accept_store_invite(
  p_token text,
  p_user_id uuid,
  p_user_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.store_invitations%rowtype;
  v_email text := lower(trim(coalesce(p_user_email, '')));
begin
  if p_user_id is null then raise exception 'Authentication required'; end if;
  if length(coalesce(p_token, '')) < 40 or length(p_token) > 160 then raise exception 'Invalid invitation'; end if;
  if v_email = '' then raise exception 'Authenticated email is required'; end if;

  if not exists (select 1 from auth.users where id=p_user_id and lower(coalesce(email,''))=v_email) then
    raise exception 'Authenticated identity is invalid';
  end if;

  select * into v_invite
  from public.store_invitations
  where token_hash=encode(digest(p_token,'sha256'),'hex')
    and accepted_at is null
    and expires_at>now()
  limit 1
  for update;

  if not found then raise exception 'Invitation is invalid or expired'; end if;
  if v_email <> lower(v_invite.email) then raise exception 'This invitation belongs to a different email address'; end if;

  insert into public.store_members(store_id,user_id,role,permissions)
  values(v_invite.store_id,p_user_id,v_invite.role,v_invite.permissions)
  on conflict(store_id,user_id) do update set role=excluded.role, permissions=excluded.permissions;

  update public.store_invitations set accepted_at=now() where id=v_invite.id;
  insert into public.notifications(store_id,user_id,type,title,body,data)
  values(v_invite.store_id,v_invite.created_by,'team.invite.accepted','Team invitation accepted','An invited team member joined the store.',jsonb_build_object('store_id',v_invite.store_id,'role',v_invite.role));

  return jsonb_build_object('store_id',v_invite.store_id,'role',v_invite.role);
end;
$$;

revoke all on function public.accept_store_invite(text, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_store_invite(text, uuid, text) to service_role;

create index if not exists store_invites_created_by_idx on public.store_invitations(created_by, created_at desc);