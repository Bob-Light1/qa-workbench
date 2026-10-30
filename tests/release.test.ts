import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeBackup, tableNames } from "../src/backup";
import * as reviews from "../scripts/p2-release.mjs";
import * as collaboration from "../scripts/collaboration-release.mjs";
import { decodeBackup } from "../src/backup";
const { digest, target } = reviews;

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
const now = Date.parse("2026-10-30T12:00:00Z");
async function fixture(release: typeof reviews, archiveVersion: 1 | 2) {
  const { baseline, migrations } = release;
  const directory = await mkdtemp(join(tmpdir(), "qa-release-"));
  directories.push(directory);
  const sources = await Promise.all(
    migrations.map((name: string) =>
      readFile(`supabase/migrations/${name}.sql`, "utf8"),
    ),
  );
  const projects = [];
  // Three projects prove inventory checks are independent of the original two.
  for (let i = 1; i <= 3; i++) {
    const id = `00000000-0000-4000-8000-00000000000${i}`;
    const tables = Object.fromEntries(
      tableNames.map((t) => [t, [] as Record<string, unknown>[]]),
    );
    tables.projects = [{ id }];
    tables.case_reviews = [
      { id: "opinion", case_version: 3, notes: "Historical opinion" },
    ];
    tables.attachments = [{ id: "capture", state: "ready", bytes: 3 }];
    const bytes = await encodeBackup(
      {
        format: "qa-workbench",
        version: archiveVersion,
        project_id: id,
        exported_at: new Date(now).toISOString(),
        tables,
      },
      { "files/capture": new Uint8Array([1, 2, 3]) },
    );
    await writeFile(`${directory}/${id}.zip`, bytes);
    projects.push({ id, sha256: digest(bytes) });
  }
  await writeFile(
    `${directory}/database.sql`,
    "private synthetic SQL snapshot",
  );
  const report = {
    target,
    started_at: new Date(now).toISOString(),
    versions: baseline,
    migrations: sources.map(digest),
    database_sha256: digest("private synthetic SQL snapshot"),
    projects,
  };
  const save = () =>
    writeFile(`${directory}/release.json`, JSON.stringify(report));
  await save();
  const live = { versions: baseline, projects };
  return { directory, report, live, sources, save };
}

describe.each([
  { name: "review", release: reviews, archiveVersion: 1 as const },
  { name: "collaboration", release: collaboration, archiveVersion: 2 as const },
])("$name release safeguards", ({ release, archiveVersion }) => {
  const { baseline, migrations, verifyReleaseBackup, migrationTransaction } =
    release;
  it("verifies fresh backups and evidence for every project, without a fixed count", async () => {
    const f = await fixture(release, archiveVersion);
    expect(
      (await verifyReleaseBackup(f.directory, f.live, f.sources, now)).projects,
    ).toHaveLength(3);
    const { bundle } = await decodeBackup(
      new Uint8Array(
        await readFile(`${f.directory}/${f.report.projects[0].id}.zip`),
      ),
    );
    expect(bundle.tables.case_reviews).toEqual([
      { id: "opinion", case_version: 3, notes: "Historical opinion" },
    ]);
    for (const projects of [
      f.live.projects.slice(1),
      [...f.live.projects, { id: "new-project" }],
    ])
      await expect(
        verifyReleaseBackup(
          f.directory,
          { ...f.live, projects },
          f.sources,
          now,
        ),
      ).rejects.toThrow("inventory");
    f.report.projects[1] = f.report.projects[0];
    await f.save();
    await expect(
      verifyReleaseBackup(f.directory, f.live, f.sources, now),
    ).rejects.toThrow("inventory");
  });
  it("refuses stale/future backups and another target", async () => {
    const f = await fixture(release, archiveVersion);
    for (const timestamp of [now - 3600000, now + 1, NaN]) {
      f.report.started_at = Number.isNaN(timestamp)
        ? "invalid"
        : new Date(timestamp).toISOString();
      await f.save();
      await expect(
        verifyReleaseBackup(f.directory, f.live, f.sources, now),
      ).rejects.toThrow("one hour");
    }
    f.report.started_at = new Date(now).toISOString();
    f.report.target = "https://other.supabase.co";
    await f.save();
    await expect(
      verifyReleaseBackup(f.directory, f.live, f.sources, now),
    ).rejects.toThrow("target QA");
  });
  it("detects changed migration state and source files before generating SQL", async () => {
    const f = await fixture(release, archiveVersion);
    await expect(
      verifyReleaseBackup(
        f.directory,
        { ...f.live, versions: [...baseline, "202610250001"] },
        f.sources,
        now,
      ),
    ).rejects.toThrow("migration history");
    await expect(
      verifyReleaseBackup(
        f.directory,
        f.live,
        f.sources.map((source: string, index: number) =>
          index === 0 ? "changed SQL" : source,
        ),
        now,
      ),
    ).rejects.toThrow("sources changed");
  });
  it("detects modified SQL snapshots and project archives", async () => {
    const f = await fixture(release, archiveVersion);
    await writeFile(`${f.directory}/database.sql`, "corrupted snapshot");
    await expect(
      verifyReleaseBackup(f.directory, f.live, f.sources, now),
    ).rejects.toThrow("snapshot checksum");
    await writeFile(
      `${f.directory}/database.sql`,
      "private synthetic SQL snapshot",
    );
    await writeFile(
      `${f.directory}/${f.report.projects[0].id}.zip`,
      "corrupted archive",
    );
    await expect(
      verifyReleaseBackup(f.directory, f.live, f.sources, now),
    ).rejects.toThrow("archive checksum");
  });
  it("produces one atomic transaction with a locked baseline recheck", async () => {
    const f = await fixture(release, archiveVersion);
    const sql = migrationTransaction(f.sources, f.report);
    expect(sql.startsWith("begin;\n")).toBe(true);
    expect(sql.endsWith("commit;\n")).toBe(true);
    expect(sql.indexOf("lock table")).toBeLessThan(
      sql.indexOf("UNEXPECTED_MIGRATION_HISTORY"),
    );
    expect(sql.indexOf("UNEXPECTED_MIGRATION_HISTORY")).toBeLessThan(
      sql.indexOf(f.sources[0]),
    );
    expect(
      sql.match(/insert into supabase_migrations.schema_migrations/g),
    ).toHaveLength(migrations.length);
    expect(sql).toContain("RELEASE_BACKUP_EXPIRED");
    expect(sql).toContain("RELEASE_PROJECT_INVENTORY_CHANGED");
    expect(() => migrationTransaction(f.sources)).toThrow("backup context");
    expect(() => migrationTransaction([])).toThrow("Missing migration");
  });
});

it("refuses a legacy archive that would silently omit review history in the collaboration release", async () => {
  const f = await fixture(collaboration, 2);
  const project = f.report.projects[0];
  const { bundle } = await decodeBackup(
    new Uint8Array(await readFile(`${f.directory}/${project.id}.zip`)),
  );
  delete bundle.tables.case_reviews;
  const bytes = await encodeBackup(
    { ...bundle, version: 1 },
    { "files/capture": new Uint8Array([1, 2, 3]) },
  );
  await writeFile(`${f.directory}/${project.id}.zip`, bytes);
  project.sha256 = digest(bytes);
  await f.save();
  await expect(
    collaboration.verifyReleaseBackup(f.directory, f.live, f.sources, now),
  ).rejects.toThrow("archive format");
});
