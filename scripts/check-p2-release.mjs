import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
const args = process.argv.slice(2);
assert.ok(
  args.length === 0 || (args.length === 1 && args[0] === "--collaboration"),
  "Only --collaboration is supported.",
);
const collaboration = args[0] === "--collaboration";
const { baseline, migrations, migrationTransaction } = await import(
  collaboration ? "./collaboration-release.mjs" : "./p2-release.mjs"
);

// This command has no hosted option. Its only database is the owned local container.
const config = await readFile("supabase/config.toml", "utf8");
if (!/^project_id\s*=\s*"qa-workbench-validation"\s*$/m.test(config))
  throw new Error(
    "Release transaction acceptance requires the owned local stack.",
  );
function sql(input) {
  return spawnSync(
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
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input, encoding: "utf8", timeout: 60000, maxBuffer: 1024 * 1024 },
  );
}
function rows(input) {
  const result = sql(input);
  assert.equal(
    result.status,
    0,
    "Local SQL check failed; inspect owned validation stack.",
  );
  return result.stdout.trim();
}
const versions = [...baseline, ...migrations.map((m) => m.split("_")[0])];
// Later additive increments may be installed locally. Verify the entire tracked
// ledger, then remove their entries only inside the rolled-back old-release rehearsal.
const installedVersions = (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .map((name) => name.split("_")[0])
  .sort();
assert.deepEqual(
  JSON.parse(
    rows(
      "select json_agg(version order by version) from supabase_migrations.schema_migrations;",
    ),
  ),
  installedVersions,
);
const fingerprint = `select json_build_array(
  (select md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.case_reviews r),
  (select md5(coalesce(jsonb_agg(to_jsonb(i) order by id)::text,'[]')) from public.campaign_items i),
  (select md5(coalesce(jsonb_agg(to_jsonb(e) order by id)::text,'[]')) from public.executions e),
  (select md5(jsonb_agg(to_jsonb(m) order by version)::text) from supabase_migrations.schema_migrations m),
  (select md5(string_agg(pg_get_functiondef(p.oid),'' order by p.oid)) from pg_proc p
    where p.pronamespace='public'::regnamespace and p.proname in ('review_case','export_bundle','restore_bundle','assign_items')));`;
const before = rows(fingerprint);
const sources = await Promise.all(
  migrations.map((m) => readFile(`supabase/migrations/${m}.sql`, "utf8")),
);
const report = {
  started_at: new Date().toISOString(),
  projects: JSON.parse(
    rows("select json_agg(json_build_object('id',id)) from public.projects;"),
  ),
};
const transaction = migrationTransaction(sources, report);
const refused = sql(transaction.replace(/commit;\n$/, "rollback;\n"));
assert.notEqual(refused.status, 0);
assert.match(refused.stderr, /UNEXPECTED_MIGRATION_HISTORY/);
assert.equal(rows(fingerprint), before);
console.log(
  "PASS migration replay is refused before schema changes; state preserved.",
);

// Reconstruct only the selected historical baseline INSIDE a transaction that rolls back.
// Never send the generated COMMIT to the local acceptance database.
function atBaseline(transaction) {
  assert.ok(transaction.endsWith("commit;\n"));
  return transaction.slice(0, -"commit;\n".length).replace(
    "begin;\n",
    `begin;
${collaboration ? "drop function public.assign_items(uuid,jsonb,uuid);" : "drop table public.case_reviews cascade;"}
delete from supabase_migrations.schema_migrations where version not in (${baseline.map((v) => `'${v}'`).join(",")});
`,
  );
}
for (const [context, expected] of [
  [{ ...report, started_at: "2000-01-01T00:00:00Z" }, "RELEASE_BACKUP_EXPIRED"],
  [
    { ...report, started_at: new Date(Date.now() + 3600000).toISOString() },
    "RELEASE_BACKUP_EXPIRED",
  ],
  [
    { ...report, projects: [{ id: "00000000-0000-4000-8000-000000000000" }] },
    "RELEASE_PROJECT_INVENTORY_CHANGED",
  ],
]) {
  const denied = sql(
    atBaseline(migrationTransaction(sources, context)) + "rollback;\n",
  );
  assert.notEqual(denied.status, 0);
  assert.ok(denied.stderr.includes(expected));
  assert.equal(rows(fingerprint), before);
  console.log(`PASS ${expected} refuses SQL application; state preserved.`);
}
const rehearsal =
  atBaseline(transaction) +
  `
do $$ begin
  if array(select version::text from supabase_migrations.schema_migrations order by version)
     is distinct from array[${versions.map((v) => `'${v}'`).join(",")}]::text[] then
    raise exception 'INCOMPLETE_MIGRATION_LEDGER';
  end if;
  ${
    collaboration
      ? `
  if has_function_privilege('anon','public.assign_items(uuid,jsonb,uuid)','execute')
    or not has_function_privilege('authenticated','public.assign_items(uuid,jsonb,uuid)','execute')
    or not (select prosecdef from pg_proc where oid='public.assign_items(uuid,jsonb,uuid)'::regprocedure)
    or not (select proconfig @> array['search_path=""'] from pg_proc where oid='public.assign_items(uuid,jsonb,uuid)'::regprocedure) then
    raise exception 'BULK_ASSIGNMENT_ACCESS_MISMATCH';
  end if;
  `
      : ""
  }
  if not (select relrowsecurity from pg_class where oid='public.case_reviews'::regclass)
    or has_table_privilege('authenticated','public.case_reviews','insert')
    or has_table_privilege('anon','public.case_reviews','select')
    or not has_table_privilege('authenticated','public.case_reviews','select')
    or has_function_privilege('authenticated','public.restore_bundle(jsonb,uuid)','execute')
    or not has_function_privilege('service_role','public.restore_bundle(jsonb,uuid)','execute') then
    raise exception 'MIGRATION_ACCESS_MISMATCH';
  end if;
  if position('p_notes !~' in pg_get_functiondef('public.review_case(uuid,integer,uuid,text,text)'::regprocedure))=0 then
    raise exception 'MISSING_STRICT_REVIEW_NOTES';
  end if;
end $$;
rollback;
`;
rows(rehearsal);
assert.equal(rows(fingerprint), before);
console.log(
  `PASS ${migrations.length} migration(s) and ledger writes execute atomically; RLS/grants verified; rollback preserves local reviews, snapshots, results, functions and ledger.`,
);
