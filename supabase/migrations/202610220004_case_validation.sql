-- Keep API-authored case bodies compatible with the typed reader and editor.
create or replace function private.validate_case(b jsonb) returns void
language plpgsql set search_path='' as $$
declare field text;
begin
  if jsonb_typeof(b) is distinct from 'object' then raise exception 'INVALID_CASE'; end if;
  foreach field in array array['title','objective','prerequisites','domain','roadmap'] loop
    if jsonb_typeof(b->field) is distinct from 'string' then raise exception 'INVALID_CASE'; end if;
  end loop;
  if length(trim(b->>'title')) not between 1 and 200
    or length(trim(b->>'objective'))=0
    or jsonb_typeof(b->'steps') is distinct from 'array'
    or jsonb_typeof(b->'bricks') is distinct from 'array'
    or jsonb_typeof(b->'minutes') is distinct from 'number'
    or (b ? 'source' and jsonb_typeof(b->'source') is distinct from 'string')
    then raise exception 'INVALID_CASE'; end if;
  if jsonb_array_length(b->'steps') not between 1 and 50
    or (b->>'minutes')::numeric not between 1 and 120
    or (b->>'minutes')::numeric<>trunc((b->>'minutes')::numeric)
    or exists(select 1 from jsonb_array_elements(b->'bricks') v where jsonb_typeof(v)<>'string')
    then raise exception 'INVALID_CASE'; end if;
  if exists(select 1 from jsonb_array_elements(b->'steps') s
    where jsonb_typeof(s) is distinct from 'object'
      or jsonb_typeof(s->'action') is distinct from 'string'
      or jsonb_typeof(s->'expected') is distinct from 'string'
      or coalesce(length(trim(s->>'action')),0)=0
      or coalesce(length(trim(s->>'expected')),0)=0)
    then raise exception 'INVALID_STEPS'; end if;
end $$;
revoke all on function private.validate_case(jsonb) from public,anon,authenticated;
