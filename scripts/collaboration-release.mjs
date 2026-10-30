import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createReleaseTool } from "./release-tool.mjs";
export { target, digest } from "./release-tool.mjs";

export const baseline = [
  "202610220001",
  "202610220002",
  "202610220003",
  "202610220004",
  "202610250001",
  "202610250002",
  "202610250003",
];
export const migrations = ["202610300001_bulk_assignments"];
export const { verifyReleaseBackup, migrationTransaction, main } =
  createReleaseTool({
    baseline,
    migrations,
    archiveVersion: 2,
    directoryPrefix: "pre-collaboration-release",
    command: "collaboration-release.mjs",
  });

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
