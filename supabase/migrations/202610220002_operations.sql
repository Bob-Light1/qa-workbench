create table private.operators(user_id uuid primary key references auth.users(id));
create function public.is_operator() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.operators where user_id=auth.uid())
$$;
revoke all on function public.is_operator() from public,anon;
grant execute on function public.is_operator() to authenticated;

create function public.bootstrap_workspace(p_user uuid,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare p uuid; begin
 if auth.role()<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(78214912);
 if exists(select 1 from public.projects) then raise exception 'ALREADY_INITIALIZED'; end if;
 insert into public.projects(name,created_by) values(p_name,p_user) returning id into p;
 insert into public.memberships values(p,p_user,'admin',true);
 insert into private.operators values(p_user);
 return p;
end $$;
revoke all on function public.bootstrap_workspace(uuid,text) from public,anon,authenticated;
grant execute on function public.bootstrap_workspace(uuid,text) to service_role;
