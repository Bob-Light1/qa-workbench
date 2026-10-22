-- Application writes go through bounded RPCs. History is append-only.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public;

create table public.projects (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 160),
  created_by uuid not null default auth.uid(), created_at timestamptz not null default now(), archived boolean not null default false
);
create table public.memberships (
  project_id uuid not null references public.projects(id), user_id uuid not null references auth.users(id),
  role text not null check(role in ('admin','editor','tester')), active boolean not null default true,
  primary key(project_id,user_id)
);
create table public.profiles (id uuid primary key references auth.users(id), email text not null);
create function private.on_user_created() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id,email) values(new.id,new.email) on conflict(id) do update set email=excluded.email; return new; end $$;
create trigger create_profile after insert or update of email on auth.users for each row execute function private.on_user_created();

create function private.has_role(p uuid, roles text[] default array['admin','editor','tester']) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships m where m.project_id=p and m.user_id=auth.uid() and m.active and m.role=any(roles))
$$;
grant usage on schema private to authenticated;
grant execute on function private.has_role(uuid,text[]) to authenticated;

create table public.test_cases (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  code text not null, version integer not null default 1 check(version>0), body jsonb not null,
  archived boolean not null default false, updated_at timestamptz not null default now(),
  unique(project_id,code), unique(id,project_id)
);
create table public.case_versions (
  case_id uuid not null references public.test_cases(id), project_id uuid not null references public.projects(id),
  version integer not null, body jsonb not null, author_id uuid not null, created_at timestamptz not null default now(),
  primary key(case_id,version), foreign key(case_id,project_id) references public.test_cases(id,project_id)
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  name text not null check(length(name) between 1 and 160), environment text not null check(length(environment)>0),
  builds jsonb not null default '{}' check(jsonb_typeof(builds)='object'), status text not null default 'active' check(status in ('active','closed','archived')),
  version integer not null default 1, created_at timestamptz not null default now(), unique(id,project_id)
);
create table public.campaign_items (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  campaign_id uuid not null, case_id uuid not null, case_version integer not null,
  snapshot jsonb not null, assignee_id uuid, version integer not null default 1,
  unique(campaign_id,case_id), unique(id,project_id),
  foreign key(campaign_id,project_id) references public.campaigns(id,project_id),
  foreign key(case_id,case_version) references public.case_versions(case_id,version)
);
create table public.executions (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), item_id uuid not null,
  author_id uuid not null default auth.uid(), verdict text check(verdict in ('passed','failed','blocked','skipped')),
  notes text not null default '', duration_minutes integer not null default 0 check(duration_minutes between 0 and 1440),
  version integer not null default 1, created_at timestamptz not null default now(), submitted_at timestamptz,
  unique(id,project_id), foreign key(item_id,project_id) references public.campaign_items(id,project_id),
  check((verdict is null)=(submitted_at is null))
);
create unique index one_draft_per_author on public.executions(item_id,author_id) where verdict is null;
create table public.issues (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), execution_id uuid not null,
  kind text not null check(kind in ('defect','suggestion','case_error','environment')),
  title text not null check(length(title) between 1 and 200), actual text not null check(length(actual)>0),
  status text not null default 'open' check(status in ('open','in_progress','fixed','verified','closed')),
  resolution text not null default '', verification_execution_id uuid references public.executions(id),
  author_id uuid not null default auth.uid(), version integer not null default 1, created_at timestamptz not null default now(),
  foreign key(execution_id,project_id) references public.executions(id,project_id)
);
create table public.issue_events (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), issue_id uuid not null references public.issues(id),
  author_id uuid not null default auth.uid(), body jsonb not null, created_at timestamptz not null default now()
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id), execution_id uuid not null,
  object_path text not null unique, filename text not null check(length(filename) between 1 and 200),
  mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp')),
  bytes integer not null check(bytes between 1 and 5242880), state text not null default 'pending' check(state in ('pending','ready')),
  author_id uuid not null default auth.uid(), created_at timestamptz not null default now(),
  foreign key(execution_id,project_id) references public.executions(id,project_id)
);
create index memberships_user on public.memberships(user_id);
create index cases_project on public.test_cases(project_id);
create index versions_project on public.case_versions(project_id);
create index campaigns_project on public.campaigns(project_id);
create index items_project on public.campaign_items(project_id);
create index executions_project on public.executions(project_id);
create index executions_item on public.executions(item_id,created_at);
create index issues_project on public.issues(project_id);
create index events_project on public.issue_events(project_id);
create index attachments_project on public.attachments(project_id);

do $$ declare t text; begin
  foreach t in array array['projects','memberships','test_cases','case_versions','campaigns','campaign_items','executions','issues','issue_events','attachments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    if t='projects' then
      execute 'create policy project_read on public.projects for select to authenticated using(private.has_role(id))';
    else
      execute format('create policy member_read on public.%I for select to authenticated using(private.has_role(project_id))',t);
    end if;
  end loop;
end $$;
alter table public.profiles enable row level security;
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
create policy shared_profiles on public.profiles for select to authenticated using(
  id=auth.uid() or exists(select 1 from public.memberships m where m.user_id=profiles.id and private.has_role(m.project_id))
);

create function private.require_role(p uuid, roles text[]) returns void language plpgsql security definer set search_path='' as $$
begin if not private.has_role(p,roles) then raise exception 'FORBIDDEN' using errcode='42501'; end if; end $$;
create function private.validate_case(b jsonb) returns void language plpgsql set search_path='' as $$
begin
  if jsonb_typeof(b)<>'object' or coalesce(length(trim(b->>'title')),0) not between 1 and 200
    or coalesce(length(trim(b->>'objective')),0)=0 or jsonb_typeof(b->'steps') is distinct from 'array'
    or jsonb_array_length(b->'steps') not between 1 and 50
    or coalesce((b->>'minutes')::integer,0) not between 1 and 120 then raise exception 'INVALID_CASE'; end if;
  if exists(select 1 from jsonb_array_elements(b->'steps') s where coalesce(length(trim(s->>'action')),0)=0 or coalesce(length(trim(s->>'expected')),0)=0) then raise exception 'INVALID_STEPS'; end if;
end $$;

create function public.create_project(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare p uuid; begin
  -- Bootstrap is performed with the server-only CLI. Existing project administrators can create more projects.
  if not exists(select 1 from public.memberships where user_id=auth.uid() and active and role='admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.projects(name) values(trim(p_name)) returning id into p;
  insert into public.memberships values(p,auth.uid(),'admin',true); return p;
end $$;

create function public.save_case(p_project uuid,p_code text,p_body jsonb,p_id uuid default null,p_version integer default null) returns public.test_cases
language plpgsql security definer set search_path='' as $$
declare c public.test_cases; begin
  perform private.require_role(p_project,array['admin','editor']); perform private.validate_case(p_body);
  if p_id is null then
    if p_code !~ '^[A-Z][A-Z0-9_-]{1,39}$' then raise exception 'INVALID_CODE'; end if;
    insert into public.test_cases(project_id,code,body) values(p_project,p_code,p_body) returning * into c;
  else
    update public.test_cases set body=p_body,version=version+1,updated_at=now()
      where id=p_id and project_id=p_project and version=p_version and not archived returning * into c;
    if not found then raise exception 'VERSION_CONFLICT'; end if;
  end if;
  insert into public.case_versions values(c.id,c.project_id,c.version,c.body,auth.uid(),now()); return c;
end $$;

create function public.archive_case(p_id uuid,p_version integer,p_archived boolean) returns void language plpgsql security definer set search_path='' as $$
declare p uuid; begin
 select project_id into p from public.test_cases where id=p_id; perform private.require_role(p,array['admin','editor']);
 update public.test_cases set archived=p_archived,version=version+1,updated_at=now() where id=p_id and version=p_version;
 if not found then raise exception 'VERSION_CONFLICT'; end if;
 insert into public.case_versions select id,project_id,version,body,auth.uid(),now() from public.test_cases where id=p_id;
end $$;

create function public.start_campaign(p_project uuid,p_name text,p_environment text,p_builds jsonb,p_cases uuid[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare c uuid; n integer; begin
 perform private.require_role(p_project,array['admin','editor']);
 if coalesce(cardinality(p_cases),0) not between 1 and 200 then raise exception 'INVALID_SELECTION'; end if;
 insert into public.campaigns(project_id,name,environment,builds) values(p_project,trim(p_name),trim(p_environment),p_builds) returning id into c;
 insert into public.campaign_items(project_id,campaign_id,case_id,case_version,snapshot)
 select p_project,c,id,version,body || jsonb_build_object('code',code) from public.test_cases where id=any(p_cases) and project_id=p_project and not archived;
 get diagnostics n=row_count;
 if n<>cardinality(p_cases) then raise exception 'INVALID_SELECTION'; end if;
 return c;
end $$;

create function public.assign_item(p_id uuid,p_user uuid,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare p uuid; begin
 select project_id into p from public.campaign_items where id=p_id; perform private.require_role(p,array['admin','editor']);
 if p_user is not null and not exists(select 1 from public.memberships where project_id=p and user_id=p_user and active) then raise exception 'INVALID_MEMBER'; end if;
 update public.campaign_items set assignee_id=p_user,version=version+1 where id=p_id and version=p_version;
 if not found then raise exception 'VERSION_CONFLICT'; end if;
end $$;

create function public.set_campaign_status(p_id uuid,p_version integer,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare p uuid; begin
 select project_id into p from public.campaigns where id=p_id; perform private.require_role(p,array['admin','editor']);
 update public.campaigns set status=p_status,version=version+1 where id=p_id and version=p_version;
 if not found then raise exception 'VERSION_CONFLICT'; end if;
end $$;

create function public.begin_execution(p_item uuid,p_id uuid) returns public.executions language plpgsql security definer set search_path='' as $$
declare i public.campaign_items; e public.executions; begin
 select * into i from public.campaign_items where id=p_item for update;
 perform private.require_role(i.project_id,array['admin','editor','tester']);
 if i.assignee_id is not null and i.assignee_id<>auth.uid() then raise exception 'ASSIGNED_TO_OTHER'; end if;
 if not exists(select 1 from public.campaigns where id=i.campaign_id and status='active') then raise exception 'CAMPAIGN_CLOSED'; end if;
 select * into e from public.executions where id=p_id and item_id=p_item and author_id=auth.uid();
 if found then return e; end if;
 select * into e from public.executions where item_id=p_item and author_id=auth.uid() and verdict is null;
 if found then return e; end if;
 insert into public.executions(id,project_id,item_id) values(p_id,i.project_id,p_item) returning * into e; return e;
end $$;

create function public.save_execution(p_id uuid,p_version integer,p_notes text,p_minutes integer,p_verdict text default null) returns public.executions
language plpgsql security definer set search_path='' as $$
declare e public.executions; begin
 select * into e from public.executions where id=p_id for update;
 perform private.require_role(e.project_id,array['admin','editor','tester']);
 if e.author_id<>auth.uid() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 -- Idempotent replay of the same finalized submission succeeds without another result.
 if e.verdict is not null then
   if e.verdict is not distinct from p_verdict and e.notes=p_notes and e.duration_minutes=p_minutes then return e; end if;
   raise exception 'RESULT_IMMUTABLE';
 end if;
 if e.version is distinct from p_version then raise exception 'VERSION_CONFLICT'; end if;
 if not exists(select 1 from public.campaign_items i join public.campaigns c on c.id=i.campaign_id where i.id=e.item_id and c.status='active' and (i.assignee_id is null or i.assignee_id=auth.uid())) then raise exception 'CAMPAIGN_CLOSED_OR_REASSIGNED'; end if;
 if p_verdict in ('failed','blocked','skipped') and length(trim(p_notes))=0 then raise exception 'NOTES_REQUIRED'; end if;
 if p_verdict is not null and exists(select 1 from public.attachments where execution_id=p_id and state='pending') then raise exception 'UPLOAD_PENDING'; end if;
 update public.executions set notes=p_notes,duration_minutes=p_minutes,verdict=p_verdict,
 submitted_at=case when p_verdict is null then null else now() end,version=version+1 where id=p_id returning * into e; return e;
end $$;

create function public.report_issue(p_execution uuid,p_kind text,p_title text,p_actual text) returns uuid language plpgsql security definer set search_path='' as $$
declare e public.executions; i uuid; begin
 select * into e from public.executions where id=p_execution; perform private.require_role(e.project_id,array['admin','editor','tester']);
 if e.verdict is null then raise exception 'SUBMIT_RESULT_FIRST'; end if;
 insert into public.issues(project_id,execution_id,kind,title,actual) values(e.project_id,p_execution,p_kind,trim(p_title),trim(p_actual)) returning id into i;
 insert into public.issue_events(project_id,issue_id,body) values(e.project_id,i,jsonb_build_object('status','open','actual',p_actual)); return i;
end $$;

create function public.update_issue(p_id uuid,p_version integer,p_status text,p_resolution text,p_verification uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare i public.issues; begin
 select * into i from public.issues where id=p_id for update; perform private.require_role(i.project_id,array['admin','editor']);
 if i.version is distinct from p_version then raise exception 'VERSION_CONFLICT'; end if;
 if p_status in ('fixed','verified','closed') and length(trim(p_resolution))=0 then raise exception 'RESOLUTION_REQUIRED'; end if;
 if i.kind='defect' and p_status in ('verified','closed') and not exists(
   select 1 from public.executions newer join public.executions original on original.id=i.execution_id
   where newer.id=p_verification and newer.project_id=i.project_id and newer.item_id=original.item_id and newer.verdict='passed' and newer.submitted_at>original.submitted_at
 ) then raise exception 'PASSING_RETEST_REQUIRED'; end if;
 update public.issues set status=p_status,resolution=p_resolution,verification_execution_id=p_verification,version=version+1 where id=p_id;
 insert into public.issue_events(project_id,issue_id,body) values(i.project_id,p_id,jsonb_build_object('status',p_status,'resolution',p_resolution,'verification',p_verification));
end $$;

create function public.reserve_attachment(p_execution uuid,p_id uuid,p_name text,p_mime text,p_bytes integer) returns public.attachments
language plpgsql security definer set search_path='' as $$
declare e public.executions; a public.attachments; begin
 select * into e from public.executions where id=p_execution for update; perform private.require_role(e.project_id,array['admin','editor','tester']);
 if e.author_id<>auth.uid() or e.verdict is not null then raise exception 'RESULT_IMMUTABLE'; end if;
 insert into public.attachments(id,project_id,execution_id,object_path,filename,mime_type,bytes)
 values(p_id,e.project_id,e.id,e.project_id::text||'/'||e.id::text||'/'||p_id::text,p_name,p_mime,p_bytes) returning * into a; return a;
end $$;
create function public.finish_attachment(p_id uuid,p_cancel boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare a public.attachments; begin
 select * into a from public.attachments where id=p_id for update; perform private.require_role(a.project_id,array['admin','editor','tester']);
 if a.author_id<>auth.uid() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_cancel then
   if a.state<>'pending' then raise exception 'ATTACHMENT_IMMUTABLE'; end if;
   delete from public.attachments where id=p_id; return;
 end if;
 if not exists(select 1 from storage.objects where bucket_id='evidence' and name=a.object_path and (metadata->>'size')::bigint=a.bytes and metadata->>'mimetype'=a.mime_type) then raise exception 'UPLOAD_NOT_FOUND'; end if;
 update public.attachments set state='ready' where id=p_id;
end $$;

create function public.change_member(p_project uuid,p_user uuid,p_role text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role(p_project,array['admin']);
 -- Serialize changes so simultaneous removals cannot eliminate every administrator.
 perform 1 from public.projects where id=p_project for update;
 if exists(select 1 from public.memberships where project_id=p_project and user_id=p_user and role='admin' and active)
   and (not p_active or p_role<>'admin') and (select count(*) from public.memberships where project_id=p_project and role='admin' and active)<2 then raise exception 'LAST_ADMIN'; end if;
 insert into public.memberships values(p_project,p_user,p_role,p_active) on conflict(project_id,user_id) do update set role=excluded.role,active=excluded.active;
end $$;

-- Every RPC is authenticated; helper functions stay uncallable through the public API.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.has_role(uuid,text[]) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('evidence','evidence',false,5242880,array['image/png','image/jpeg','image/webp']);
create policy evidence_read on storage.objects for select to authenticated using(bucket_id='evidence' and exists(
 select 1 from public.attachments a where a.object_path=name and a.state='ready' and private.has_role(a.project_id)
));
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='evidence' and exists(
 select 1 from public.attachments a join public.executions e on e.id=a.execution_id where a.object_path=name and a.state='pending' and a.author_id=auth.uid() and e.verdict is null and private.has_role(a.project_id)
));
