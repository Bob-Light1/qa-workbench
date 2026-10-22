create function public.export_bundle(p_project uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 perform private.require_role(p_project,array['admin']);
 select jsonb_build_object(
 'projects',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.projects t where id=p_project),
 'memberships',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.memberships t where project_id=p_project),
 'profiles',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.profiles t where id in(select user_id from public.memberships where project_id=p_project)),
 'test_cases',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.test_cases t where project_id=p_project),
 'case_versions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.case_versions t where project_id=p_project),
 'campaigns',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.campaigns t where project_id=p_project),
 'campaign_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.campaign_items t where project_id=p_project),
 'executions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.executions t where project_id=p_project),
 'issues',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.issues t where project_id=p_project),
 'issue_events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.issue_events t where project_id=p_project),
 'attachments',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.attachments t where project_id=p_project)) into result;
 return result;
end $$;
revoke all on function public.export_bundle(uuid) from public,anon;
grant execute on function public.export_bundle(uuid) to authenticated;

create function public.restore_bundle(p_tables jsonb,p_owner uuid) returns void language plpgsql security definer set search_path='' as $$
declare t text; begin
 if auth.role()<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(78214912);
 if exists(select 1 from public.projects) then raise exception 'RESTORE_REQUIRES_EMPTY_INSTALLATION'; end if;
 if jsonb_array_length(p_tables->'projects')<>1 then raise exception 'INVALID_BACKUP'; end if;
 -- All inserts are one transaction. Referenced users must have been provisioned first.
 foreach t in array array['projects','memberships','test_cases','case_versions','campaigns','campaign_items','executions'] loop
  execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I,$1)',t,t) using p_tables->t;
 end loop;
 insert into public.issues select * from jsonb_populate_recordset(null::public.issues,p_tables->'issues');
 insert into public.issue_events select * from jsonb_populate_recordset(null::public.issue_events,p_tables->'issue_events');
 insert into public.attachments select * from jsonb_populate_recordset(null::public.attachments,p_tables->'attachments');
 if not exists(select 1 from public.memberships where user_id=p_owner and role='admin' and active) then raise exception 'RESTORE_OWNER_REQUIRED'; end if;
 insert into private.operators values(p_owner) on conflict do nothing;
end $$;
revoke all on function public.restore_bundle(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.restore_bundle(jsonb,uuid) to service_role;
