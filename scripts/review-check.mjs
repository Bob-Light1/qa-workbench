import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { client, call } from "./client.mjs";
import { backup } from "./backup.mjs";
import { decodeBackup } from "../src/backup.ts";

const config = await readFile("supabase/config.toml", "utf8");
if (
  !/^project_id\s*=\s*"qa-workbench-validation"\s*$/m.test(config) ||
  !["http://127.0.0.1:55321", "http://localhost:55321"].includes(
    process.env.SUPABASE_URL,
  )
)
  throw new Error(
    "Review acceptance requires the owned local validation stack.",
  );
const admin = client(true),
  key = process.env.SUPABASE_PUBLISHABLE_KEY;
const password = crypto.randomUUID() + "aA1!",
  suffix = crypto.randomUUID();
const users = {};
let checks = 0;
function check(name, value) {
  assert.ok(value, name);
  checks++;
  console.log(`PASS ${name}`);
}
async function rejected(name, request, code) {
  const { error } = await request;
  check(name, Boolean(error) && (!code || error.message.includes(code)));
}
async function rows(db, table, project) {
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("project_id", project);
  if (error) throw error;
  return data;
}
for (const label of ["owner", "editor", "tester", "outsider"]) {
  const email = `review-${label}-${suffix}@qa-workbench.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const db = createClient(process.env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await db.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  users[label] = { id: data.user.id, email, db };
}
const project = crypto.randomUUID();
for (const result of [
  await admin.from("projects").insert({
    id: project,
    name: `Review acceptance ${suffix}`,
    created_by: users.owner.id,
  }),
  await admin.from("memberships").insert(
    ["owner", "editor", "tester"].map((label) => ({
      project_id: project,
      user_id: users[label].id,
      role: label === "owner" ? "admin" : label,
    })),
  ),
])
  if (result.error) throw result.error;
const owner = users.owner.db,
  editor = users.editor.db,
  tester = users.tester.db;
const body = {
  title: "Synthetic review instructions",
  objective: "Check review coordination",
  prerequisites: "Synthetic data only",
  steps: [{ action: "Open", expected: "Visible" }],
  minutes: 5,
  domain: "Workbench",
  bricks: ["QA"],
  roadmap: "P2-01",
};
let c = await call(editor, "save_case", {
  p_project: project,
  p_code: "REV-001",
  p_body: body,
});
const args = (previous = null, decision = "approved", notes = "Reviewed") => ({
  p_case: c.id,
  p_version: c.version,
  p_previous: previous,
  p_decision: decision,
  p_notes: notes,
});
const anonymous = createClient(process.env.SUPABASE_URL, key);
await rejected(
  "anonymous review reads denied",
  anonymous.from("case_reviews").select("*"),
);
await rejected(
  "anonymous review RPC denied",
  anonymous.rpc("review_case", args()),
);
await rejected(
  "tester review RPC denied",
  tester.rpc("review_case", args()),
  "FORBIDDEN",
);
await rejected(
  "outsider review RPC denied",
  users.outsider.db.rpc("review_case", args()),
  "FORBIDDEN",
);
await rejected(
  "review of unknown case denied",
  owner.rpc("review_case", { ...args(), p_case: crypto.randomUUID() }),
  "FORBIDDEN",
);
for (const notes of ["  ", "\n\t"])
  await rejected(
    "changes request needs a nonblank note",
    editor.rpc("review_case", args(null, "changes_requested", notes)),
    "REVIEW_NOTES_REQUIRED",
  );
for (const decision of [null, "invalid"])
  await rejected(
    "invalid decision denied",
    editor.rpc("review_case", args(null, decision)),
    "INVALID_REVIEW",
  );
await rejected(
  "oversize comment denied",
  editor.rpc("review_case", args(null, "approved", "x".repeat(4001))),
  "INVALID_REVIEW",
);
const first = await call(
  editor,
  "review_case",
  args(null, "changes_requested", "Clarify the expected result"),
);
check(
  "editor opinion binds revision and server actor",
  first.case_version === 1 &&
    first.author_id === users.editor.id &&
    first.review_number === 1,
);
await rejected(
  "direct review insert denied even for admin",
  owner
    .from("case_reviews")
    .insert({ ...first, id: crypto.randomUUID(), review_number: 2 }),
);
await rejected(
  "direct review update denied",
  editor
    .from("case_reviews")
    .update({ decision: "approved" })
    .eq("id", first.id),
);
await rejected(
  "direct review deletion denied",
  owner.from("case_reviews").delete().eq("id", first.id),
);
check(
  "tester reads review history",
  (await rows(tester, "case_reviews", project)).length === 1,
);
check(
  "outsider reads no review history",
  (await rows(users.outsider.db, "case_reviews", project)).length === 0,
);
await rejected(
  "stale prior review rejected",
  owner.rpc("review_case", args()),
  "VERSION_CONFLICT",
);
const concurrent = await Promise.all([
  owner.rpc("review_case", args(first.id)),
  editor.rpc("review_case", args(first.id)),
]);
check(
  "one concurrent opinion commits and one conflicts",
  concurrent.filter((r) => !r.error).length === 1 &&
    concurrent.filter((r) => r.error?.message.includes("VERSION_CONFLICT"))
      .length === 1,
);
let latest = concurrent.find((r) => !r.error).data;
const campaign = await call(owner, "start_campaign", {
  p_project: project,
  p_name: "Review snapshot",
  p_environment: "Local synthetic",
  p_builds: {},
  p_cases: [c.id],
});
const oldVersion = c.version;
c = await call(editor, "save_case", {
  p_project: project,
  p_code: c.code,
  p_id: c.id,
  p_version: c.version,
  p_body: { ...body, title: "Revised synthetic instructions" },
});
await rejected(
  "opinion on stale case version rejected",
  owner.rpc("review_case", { ...args(latest.id), p_version: oldVersion }),
  "VERSION_CONFLICT",
);
check(
  "revision preserves old reviews and frozen campaign",
  (await rows(owner, "case_reviews", project)).every(
    (r) => r.case_version === 1,
  ) && (await rows(owner, "campaign_items", project))[0].case_version === 1,
);
latest = await call(owner, "review_case", args(latest.id));
check(
  "admin approves current revision without rewriting history",
  latest.case_version === 2 &&
    latest.review_number === 3 &&
    (await rows(owner, "case_reviews", project)).length === 3,
);
await call(owner, "archive_case", {
  p_id: c.id,
  p_version: c.version,
  p_archived: true,
});
c = (await rows(owner, "test_cases", project))[0];
await rejected(
  "archived case review denied",
  editor.rpc("review_case", args(latest.id)),
  "CASE_ARCHIVED",
);
await call(owner, "archive_case", {
  p_id: c.id,
  p_version: c.version,
  p_archived: false,
});
c = (await rows(owner, "test_cases", project))[0];
check(
  "archive and restore advance revision without carrying approval",
  c.version === 4 && latest.case_version === 2,
);
await call(owner, "change_member", {
  p_project: project,
  p_user: users.editor.id,
  p_role: "editor",
  p_active: false,
});
await rejected(
  "withdrawn editor cannot review",
  editor.rpc("review_case", args(latest.id)),
  "FORBIDDEN",
);
check(
  "withdrawal removes fresh history access",
  (await rows(editor, "case_reviews", project)).length === 0,
);
await call(owner, "change_member", {
  p_project: project,
  p_user: users.editor.id,
  p_role: "editor",
  p_active: true,
});
await mkdir("backups", { recursive: true });
const tables = await backup(owner, project, "backups/review-acceptance.zip");
const { bundle } = await decodeBackup(
  new Uint8Array(await readFile("backups/review-acceptance.zip")),
);
check(
  "v2 export preserves exact review rows",
  bundle.version === 2 &&
    JSON.stringify(bundle.tables.case_reviews) ===
      JSON.stringify(tables.case_reviews) &&
    tables.case_reviews.length === 3,
);
await rejected(
  "tester cannot export review bundle",
  tester.rpc("export_bundle", { p_project: project }),
  "FORBIDDEN",
);
await rejected(
  "authenticated user cannot restore",
  owner.rpc("restore_bundle", { p_tables: tables, p_owner: users.owner.id }),
);
// Exercise the real restore RPC in an empty transactional target. ROLLBACK preserves
// every existing workspace, Auth identity and Storage object in the local stack.
// The exported fixture contains no files, so no object manipulation is required.
const sql = `\\set ON_ERROR_STOP on
begin;
create temp table acceptance_bundle as select '${JSON.stringify(tables).replaceAll("'", "''")}'::jsonb as body;
delete from public.attachments; delete from public.issue_events; delete from public.issues;
delete from public.executions; delete from public.campaign_items; delete from public.campaigns;
delete from public.case_reviews; delete from public.case_versions; delete from public.test_cases;
delete from public.memberships; delete from public.projects;
set local request.jwt.claim.role='service_role';
select public.restore_bundle((select body from acceptance_bundle),'${users.owner.id}');
do $$ begin
 if (select count(*) from public.case_reviews)<>3 or exists(
   (select to_jsonb(r) from public.case_reviews r) except
   (select value from jsonb_array_elements((select body->'case_reviews' from acceptance_bundle)))
 ) then raise exception 'REVIEW_RESTORE_MISMATCH'; end if;
end $$;
-- Legacy bundles remain restorable without a review table.
delete from public.case_reviews; delete from public.campaign_items; delete from public.campaigns;
delete from public.case_versions; delete from public.test_cases; delete from public.memberships; delete from public.projects;
select public.restore_bundle((select body-'case_reviews' from acceptance_bundle),'${users.owner.id}');
do $$ begin if exists(select 1 from public.case_reviews) then raise exception 'LEGACY_REVIEW_MISMATCH'; end if; end $$;
-- Preserve opinions accepted before whitespace validation was tightened.
delete from public.campaign_items; delete from public.campaigns;
delete from public.case_versions; delete from public.test_cases; delete from public.memberships; delete from public.projects;
update acceptance_bundle set body=jsonb_set(body,'{case_reviews}',(
 select jsonb_agg(case when r->>'decision'='changes_requested'
 then jsonb_set(r,'{notes}',to_jsonb(chr(10)||chr(9))) else r end)
 from jsonb_array_elements(body->'case_reviews') r));
select public.restore_bundle((select body from acceptance_bundle),'${users.owner.id}');
do $$ begin if not exists(select 1 from public.case_reviews where decision='changes_requested' and notes=chr(10)||chr(9))
 then raise exception 'HISTORICAL_NOTES_REWRITTEN'; end if; end $$;
rollback;`;
execFileSync(
  "docker",
  [
    "exec",
    "-i",
    "supabase_db_qa-workbench-validation",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
  ],
  { input: sql, stdio: ["pipe", "pipe", "pipe"] },
);
check(
  "real restore RPC preserves review history, earlier notes and legacy bundles in rolled-back empty target",
  (await rows(owner, "case_reviews", project)).length === 3,
);
await writeFile(
  ".env.review.browser",
  JSON.stringify({
    email: users.owner.email,
    testerEmail: users.tester.email,
    editorEmail: users.editor.email,
    password,
    project_id: project,
    case_id: c.id,
    campaign_id: campaign,
  }),
  { mode: 0o600 },
);
console.log(
  `Review acceptance: ${checks} checks passed. Private browser fixtures saved.`,
);
