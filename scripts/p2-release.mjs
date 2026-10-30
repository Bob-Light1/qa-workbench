import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { client } from "./client.mjs";
import { encodeBackup, decodeBackup } from "../src/backup.ts";

export const target = "https://xtgaepikylepriipuyps.supabase.co";
export const baseline = [
  "202610220001",
  "202610220002",
  "202610220003",
  "202610220004",
];
export const migrations = [
  "202610250001_case_reviews",
  "202610250002_review_notes",
  "202610250003_review_history_restore",
];
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ids = (projects) => projects.map((p) => p.id).sort();

export async function verifyReleaseBackup(
  directory,
  live,
  sources,
  now = Date.now(),
) {
  const report = JSON.parse(
    await readFile(`${directory}/release.json`, "utf8"),
  );
  const age = now - Date.parse(report.started_at);
  if (
    report.target !== target ||
    !Number.isFinite(age) ||
    age < 0 ||
    age >= 3600000
  )
    throw new Error(
      "Release backup must target QA and be less than one hour old.",
    );
  if (!same(report.versions, baseline) || !same(live.versions, baseline))
    throw new Error(
      "Unexpected migration history; inspect state before retrying.",
    );
  if (!same(report.migrations, sources.map(digest)))
    throw new Error("Migration sources changed after backup.");
  if (
    !Array.isArray(report.projects) ||
    !report.projects.length ||
    report.projects.some((p) => !uuid.test(p.id)) ||
    new Set(ids(report.projects)).size !== report.projects.length ||
    !same(ids(report.projects), ids(live.projects))
  )
    throw new Error(
      "Release backup does not cover the current project inventory.",
    );
  const dump = await readFile(`${directory}/database.sql`);
  if (!dump.length || digest(dump) !== report.database_sha256)
    throw new Error("Database snapshot checksum mismatch.");
  for (const project of report.projects) {
    const bytes = await readFile(`${directory}/${project.id}.zip`);
    if (digest(bytes) !== project.sha256)
      throw new Error("Project archive checksum mismatch.");
    const { bundle } = await decodeBackup(new Uint8Array(bytes));
    if (bundle.project_id !== project.id)
      throw new Error("Project archive identity mismatch.");
  }
  return report;
}

export function migrationTransaction(sources, report) {
  if (sources.length !== migrations.length || sources.some((s) => !s.trim()))
    throw new Error("Missing migration source.");
  if (
    !report ||
    !Number.isFinite(Date.parse(report.started_at)) ||
    !report.projects?.length ||
    report.projects.some((p) => !uuid.test(p.id))
  )
    throw new Error("Missing verified backup context.");
  const quote = (s) => `'${s.replaceAll("'", "''")}'`;
  // Recheck under a ledger lock in the SAME transaction as the schema changes.
  return `begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table supabase_migrations.schema_migrations in exclusive mode;
lock table public.projects in share mode;
do $$ begin
  if array(select version::text from supabase_migrations.schema_migrations order by version)
     is distinct from array[${baseline.map(quote).join(",")}]::text[] then
    raise exception 'UNEXPECTED_MIGRATION_HISTORY';
  end if;
  if current_timestamp < ${quote(report.started_at)}::timestamptz or
     current_timestamp >= ${quote(report.started_at)}::timestamptz + interval '1 hour' then
    raise exception 'RELEASE_BACKUP_EXPIRED';
  end if;
  if array(select id::text from public.projects order by id)
     is distinct from array[${ids(report.projects).map(quote).join(",")}]::text[] then
    raise exception 'RELEASE_PROJECT_INVENTORY_CHANGED';
  end if;
end $$;
${sources
  .map((source, i) => {
    const [version, ...name] = migrations[i].split("_");
    return `${source}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(version)},${quote(name.join("_"))},array[${quote(source)}]);`;
  })
  .join("\n")}
commit;
`;
}

function databaseEnvironment() {
  if (process.env.SUPABASE_URL !== target || !process.env.SUPABASE_DB_PASSWORD)
    throw new Error(
      "Configure the exact QA target and its private database password.",
    );
  return {
    ...process.env,
    PGHOST: "aws-1-eu-west-3.pooler.supabase.com",
    PGPORT: "5432",
    PGDATABASE: "postgres",
    PGUSER: "postgres.xtgaepikylepriipuyps",
    PGPASSWORD: process.env.SUPABASE_DB_PASSWORD,
    PGSSLMODE: "require",
    PGCONNECT_TIMEOUT: "10",
    PGOPTIONS: "-c default_transaction_read_only=on",
  };
}

function run(command, args, env, input) {
  const result = spawnSync(command, args, {
    env,
    input,
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 64 * 1024 * 1024,
  });
  // Provider output may contain account details; retain only a bounded safe error.
  if (result.status !== 0)
    throw new Error(
      `Read-only release command failed: ${command}; no migration executed.`,
    );
  return result.stdout.trim();
}

function query(env, sql) {
  return run("psql", ["-X", "-w", "-qAt", "-v", "ON_ERROR_STOP=1"], env, sql);
}

function inventory(env) {
  return JSON.parse(
    query(
      env,
      `select json_build_object(
    'versions',(select coalesce(json_agg(version order by version),'[]') from supabase_migrations.schema_migrations),
    'projects',(select coalesce(json_agg(json_build_object('id',p.id,'admin',
      (select user_id from public.memberships where project_id=p.id and role='admin' and active order by user_id limit 1))),'[]') from public.projects p));`,
    ),
  );
}

async function main() {
  const [action, suppliedDirectory, ...extra] = process.argv.slice(2);
  if (
    !["prepare", "plan"].includes(action) ||
    extra.length ||
    (action === "prepare" && suppliedDirectory) ||
    (action === "plan" &&
      !/^backups\/pre-p2-release-\d+$/.test(suppliedDirectory || ""))
  )
    throw new Error(
      "Usage: p2-release.mjs prepare | plan backups/pre-p2-release-TIMESTAMP. Both commands are read-only on production.",
    );
  const env = databaseEnvironment();
  const sources = await Promise.all(
    migrations.map((name) =>
      readFile(`supabase/migrations/${name}.sql`, "utf8"),
    ),
  );
  const live = inventory(env);
  if (!same(live.versions, baseline))
    throw new Error("Unexpected migration history; no migration executed.");
  if (action === "plan") {
    const report = await verifyReleaseBackup(suppliedDirectory, live, sources);
    await writeFile(
      `${suppliedDirectory}/apply.sql`,
      migrationTransaction(sources, report),
      { mode: 0o600 },
    );
    console.log(
      `Verified ${report.projects.length} project archives and database snapshot. Reviewable SQL: ${suppliedDirectory}/apply.sql. No migration executed.`,
    );
    return;
  }
  const started = new Date();
  const directory = `backups/pre-p2-release-${started.getTime()}`;
  await mkdir("backups", { mode: 0o700, recursive: true });
  await mkdir(directory, { mode: 0o700 });
  const connectionNames = [
    "PGHOST",
    "PGPORT",
    "PGDATABASE",
    "PGUSER",
    "PGPASSWORD",
    "PGSSLMODE",
    "PGCONNECT_TIMEOUT",
    "PGOPTIONS",
  ];
  const dump = run(
    "docker",
    [
      "exec",
      ...connectionNames.flatMap((key) => ["-e", key]),
      "supabase_db_qa-workbench-validation",
      "pg_dump",
      "--no-password",
      "--no-owner",
      "--no-privileges",
      "--schema=public",
      "--schema=private",
      "--schema=supabase_migrations",
    ],
    env,
  );
  await writeFile(`${directory}/database.sql`, dump, { mode: 0o600 });
  const service = client(true),
    projects = [];
  for (const project of live.projects) {
    if (!uuid.test(project.id) || !uuid.test(project.admin))
      throw new Error(
        "Every project needs an active administrator for export.",
      );
    const tables = JSON.parse(
      query(
        env,
        `begin isolation level repeatable read read only;
      set local request.jwt.claim.sub='${project.admin}';
      set local request.jwt.claim.role='authenticated';
      select public.export_bundle('${project.id}'); commit;`,
      ),
    );
    const files = {};
    for (const a of tables.attachments) {
      if (a.state !== "ready")
        throw new Error("Pending evidence prevents release backup.");
      const { data, error } = await service.storage
        .from("evidence")
        .download(a.object_path);
      if (error) throw new Error("Release evidence download failed.");
      files[`files/${a.id}`] = new Uint8Array(await data.arrayBuffer());
    }
    const bytes = await encodeBackup(
      {
        format: "qa-workbench",
        version: 1,
        project_id: project.id,
        exported_at: new Date().toISOString(),
        tables,
      },
      files,
    );
    await writeFile(`${directory}/${project.id}.zip`, bytes, { mode: 0o600 });
    projects.push({ id: project.id, sha256: digest(bytes) });
  }
  const report = {
    target,
    started_at: started.toISOString(),
    source_commit: run("git", ["rev-parse", "HEAD"], process.env),
    versions: live.versions,
    migrations: sources.map(digest),
    database_sha256: digest(dump),
    projects,
  };
  await writeFile(
    `${directory}/release.json`,
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  await verifyReleaseBackup(directory, inventory(env), sources);
  console.log(
    `Verified private release backup: ${directory}; ${projects.length} projects. No production changes.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
