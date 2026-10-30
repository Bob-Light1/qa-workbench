import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeBackup, tableNames } from "../src/backup";
import {
  baseline,
  digest,
  migrationTransaction,
  migrations,
  target,
  verifyReleaseBackup,
} from "../scripts/p2-release.mjs";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
const now = Date.parse("2026-10-30T12:00:00Z");
async function fixture() {
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
    tables.attachments = [{ id: "capture", state: "ready", bytes: 3 }];
    const bytes = await encodeBackup(
      {
        format: "qa-workbench",
        version: 1,
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

describe("P2 release safeguards", () => {
  it("verifies fresh backups and evidence for every project, without a fixed count", async () => {
    const f = await fixture();
    expect(
      (await verifyReleaseBackup(f.directory, f.live, f.sources, now)).projects,
    ).toHaveLength(3);
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
    const f = await fixture();
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
    const f = await fixture();
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
        [...f.sources.slice(0, 2), "changed SQL"],
        now,
      ),
    ).rejects.toThrow("sources changed");
  });
  it("detects modified SQL snapshots and project archives", async () => {
    const f = await fixture();
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
    const f = await fixture();
    const sql = migrationTransaction(f.sources, f.report);
    expect(sql.startsWith("begin;\n")).toBe(true);
    expect(sql.endsWith("commit;\n")).toBe(true);
    expect(sql.indexOf("lock table")).toBeLessThan(
      sql.indexOf("UNEXPECTED_MIGRATION_HISTORY"),
    );
    expect(sql.indexOf("UNEXPECTED_MIGRATION_HISTORY")).toBeLessThan(
      sql.indexOf("create table public.case_reviews"),
    );
    expect(
      sql.match(/insert into supabase_migrations.schema_migrations/g),
    ).toHaveLength(3);
    expect(sql).toContain("RELEASE_BACKUP_EXPIRED");
    expect(sql).toContain("RELEASE_PROJECT_INVENTORY_CHANGED");
    expect(() => migrationTransaction(f.sources)).toThrow("backup context");
    expect(() => migrationTransaction([])).toThrow("Missing migration");
  });
});
