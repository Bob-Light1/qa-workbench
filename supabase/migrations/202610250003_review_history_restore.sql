-- New opinions use the stricter review_case RPC. Server-only restoration must
-- still accept earlier opinions verbatim, including previously accepted whitespace.
-- Client grants already prohibit direct insert/update/delete of review history.
alter table public.case_reviews drop constraint case_review_meaningful_notes;
