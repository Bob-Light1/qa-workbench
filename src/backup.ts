import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
export type Bundle = {
  format: "qa-workbench";
  version: 1;
  project_id: string;
  exported_at: string;
  tables: Record<string, Record<string, unknown>[]>;
  hashes?: Record<string, string>;
};
export const tableNames = [
  "projects",
  "memberships",
  "profiles",
  "test_cases",
  "case_versions",
  "campaigns",
  "campaign_items",
  "executions",
  "issues",
  "issue_events",
  "attachments",
];
async function hash(bytes: Uint8Array) {
  const buffer = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function encodeBackup(
  bundle: Bundle,
  files: Record<string, Uint8Array>,
) {
  const hashes: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files))
    hashes[name] = await hash(bytes);
  const document = strToU8(JSON.stringify({ ...bundle, hashes }, null, 2));
  return zipSync({
    ...files,
    "manifest.json": document,
    "manifest.sha256": strToU8(await hash(document)),
  });
}
export async function decodeBackup(bytes: Uint8Array) {
  const files = unzipSync(bytes),
    document = files["manifest.json"];
  if (
    !document ||
    !files["manifest.sha256"] ||
    (await hash(document)) !== strFromU8(files["manifest.sha256"])
  )
    throw new Error("BACKUP_CHECKSUM_MISMATCH");
  const bundle = JSON.parse(strFromU8(document)) as Bundle;
  if (
    bundle.format !== "qa-workbench" ||
    bundle.version !== 1 ||
    !bundle.tables ||
    tableNames.some((t) => !Array.isArray(bundle.tables[t])) ||
    bundle.tables.projects.length !== 1 ||
    bundle.tables.projects[0].id !== bundle.project_id
  )
    throw new Error("INVALID_BACKUP");
  const expected = new Set(["manifest.json", "manifest.sha256"]);
  for (const a of bundle.tables.attachments) {
    const name = `files/${a.id}`;
    expected.add(name);
    if (
      a.state !== "ready" ||
      !files[name] ||
      files[name].length !== a.bytes ||
      (await hash(files[name])) !== bundle.hashes?.[name]
    )
      throw new Error("BACKUP_FILE_MISMATCH");
  }
  if (Object.keys(files).some((name) => !expected.has(name)))
    throw new Error("UNEXPECTED_BACKUP_FILE");
  return { bundle, files };
}
