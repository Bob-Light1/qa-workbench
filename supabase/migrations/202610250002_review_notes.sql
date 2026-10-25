-- Preserve earlier opinions while enforcing meaningful future correction notes.
-- NOT VALID avoids rewriting history produced before the stricter check.
alter table public.case_reviews add constraint case_review_meaningful_notes
  check(decision <> 'changes_requested' or notes ~ '[^[:space:]]') not valid;

create or replace function public.review_case(p_case uuid,p_version integer,p_previous uuid,p_decision text,p_notes text)
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
  if p_decision='changes_requested' and p_notes !~ '[^[:space:]]' then raise exception 'REVIEW_NOTES_REQUIRED'; end if;
  insert into public.case_reviews(project_id,case_id,case_version,review_number,decision,notes)
    values(c.project_id,c.id,c.version,coalesce(previous.review_number,0)+1,p_decision,trim(p_notes)) returning * into result;
  return result;
end $$;
