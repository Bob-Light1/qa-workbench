-- One campaign, one target member, all requested versions or no changes.
create function public.assign_items(p_campaign uuid, p_items jsonb, p_user uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare
  p uuid;
  n integer;
  i public.campaign_items;
begin
  select project_id into p from public.campaigns where id=p_campaign;
  -- Membership updates take this same project lock exclusively. Recheck the
  -- caller and target after acquiring it, so withdrawal cannot race this batch.
  perform 1 from public.projects where id=p for share;
  perform private.require_role(p,array['admin','editor']);
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'INVALID_SELECTION';
  end if;
  n := jsonb_array_length(p_items);
  if n not between 1 and 200 then raise exception 'INVALID_SELECTION'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) v where
    jsonb_typeof(v) is distinct from 'object'
    or jsonb_typeof(v->'id') is distinct from 'string'
    or (v->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(v->'version') is distinct from 'number'
    or (v->>'version') !~ '^[1-9][0-9]{0,8}$'
  ) then raise exception 'INVALID_SELECTION'; end if;
  if (select count(distinct (v->>'id')::uuid) from jsonb_array_elements(p_items) v)<>n then
    raise exception 'INVALID_SELECTION';
  end if;
  if p_user is not null and not exists(select 1 from public.memberships
    where project_id=p and user_id=p_user and active) then
    raise exception 'INVALID_MEMBER';
  end if;
  if (select count(*) from public.campaign_items where campaign_id=p_campaign
    and id in (select (v->>'id')::uuid from jsonb_array_elements(p_items) v))<>n then
    raise exception 'INVALID_SELECTION';
  end if;
  -- Stable lock order prevents overlapping batches from deadlocking. Single
  -- assignments take the same item locks through UPDATE.
  for i in select * from public.campaign_items where campaign_id=p_campaign
    and id in (select (v->>'id')::uuid from jsonb_array_elements(p_items) v)
    order by id for update
  loop
    if i.version<>(select (v->>'version')::integer from jsonb_array_elements(p_items) v
      where (v->>'id')::uuid=i.id) then raise exception 'VERSION_CONFLICT'; end if;
  end loop;
  update public.campaign_items set assignee_id=p_user,version=version+1
    where campaign_id=p_campaign
    and id in (select (v->>'id')::uuid from jsonb_array_elements(p_items) v);
  return n;
end $$;

revoke all on function public.assign_items(uuid,jsonb,uuid) from public,anon;
grant execute on function public.assign_items(uuid,jsonb,uuid) to authenticated;
