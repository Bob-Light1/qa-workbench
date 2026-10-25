-- Review decisions are immutable events bound to an exact case revision.
create table public.case_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  case_id uuid not null,
  case_version integer not null,
  review_number integer not null check(review_number > 0),
  decision text not null check(decision in ('approved','changes_requested')),
  notes text not null default '' check(length(notes) <= 4000),
  author_id uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique(case_id,review_number),
  foreign key(case_id,project_id) references public.test_cases(id,project_id),
  foreign key(case_id,case_version) references public.case_versions(case_id,version),
  check(decision <> 'changes_requested' or length(trim(notes)) > 0)
);
create index reviews_project on public.case_reviews(project_id);
alter table public.case_reviews enable row level security;
revoke all on public.case_reviews from public,anon,authenticated;
grant select on public.case_reviews to authenticated;
create policy member_read on public.case_reviews for select to authenticated using(private.has_role(project_id));

create function public.review_case(p_case uuid,p_version integer,p_previous uuid,p_decision text,p_notes text)
returns public.case_reviews language plpgsql security definer set search_path='' as $$
declare c public.test_cases; previous public.case_reviews; result public.case_reviews; begin
  select * into c from public.test_cases where id=p_case;
  perform private.require_role(c.project_id,array['admin','editor']);
  -- Serialize with edits, archival and other reviews, then recheck the revision.
  select * into c from public.test_cases where id=p_case for update;
  if c.version is distinct from p_version then raise exception 'VERSION_CONFLICT'; end if;
  if c.archived then raise exception 'CASE_ARCHIVED'; end if;
  select * into previous from public.case_reviews where case_id=p_case order by review_number desc limit 1;
  if previous.id is distinct from p_previous then raise exception 'VERSION_CONFLICT'; end if;
  if p_decision is null or p_decision not in ('approved','changes_requested')
    or p_notes is null or length(p_notes)>4000 then raise exception 'INVALID_REVIEW'; end if;
  if p_decision='changes_requested' and length(trim(p_notes))=0 then raise exception 'REVIEW_NOTES_REQUIRED'; end if;
  insert into public.case_reviews(project_id,case_id,case_version,review_number,decision,notes)
    values(c.project_id,c.id,c.version,coalesce(previous.review_number,0)+1,p_decision,trim(p_notes)) returning * into result;
  return result;
end $$;
revoke all on function public.review_case(uuid,integer,uuid,text,text) from public,anon;
grant execute on function public.review_case(uuid,integer,uuid,text,text) to authenticated;

create or replace function public.export_bundle(p_project uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 perform private.require_role(p_project,array['admin']);
 select jsonb_build_object(
 'projects',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.projects t where id=p_project),
 'memberships',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.memberships t where project_id=p_project),
 'profiles',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.profiles t where id in(select user_id from public.memberships where project_id=p_project)),
 'test_cases',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.test_cases t where project_id=p_project),
 'case_versions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.case_versions t where project_id=p_project),
 'case_reviews',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.case_reviews t where project_id=p_project),
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


create or replace function public.restore_bundle(p_tables jsonb,p_owner uuid) returns void language plpgsql security definer set search_path='' as $$
declare t text; begin
 if auth.role()<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(78214912);
 if exists(select 1 from public.projects) then raise exception 'RESTORE_REQUIRES_EMPTY_INSTALLATION'; end if;
 if jsonb_array_length(p_tables->'projects')<>1 then raise exception 'INVALID_BACKUP'; end if;
 -- All inserts are one transaction. Referenced users must have been provisioned first.
 foreach t in array array['projects','memberships','test_cases','case_versions','campaigns','campaign_items','executions'] loop
  execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I,$1)',t,t) using p_tables->t;
 end loop;
 insert into public.case_reviews select * from jsonb_populate_recordset(null::public.case_reviews,coalesce(p_tables->'case_reviews','[]'::jsonb));
 insert into public.issues select * from jsonb_populate_recordset(null::public.issues,p_tables->'issues');
 insert into public.issue_events select * from jsonb_populate_recordset(null::public.issue_events,p_tables->'issue_events');
 insert into public.attachments select * from jsonb_populate_recordset(null::public.attachments,p_tables->'attachments');
 if not exists(select 1 from public.memberships where user_id=p_owner and role='admin' and active) then raise exception 'RESTORE_OWNER_REQUIRED'; end if;
 insert into private.operators values(p_owner) on conflict do nothing;
end $$;
revoke all on function public.restore_bundle(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.restore_bundle(jsonb,uuid) to service_role;
