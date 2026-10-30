import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createReleaseTool } from "./release-tool.mjs";
export { target, digest } from "./release-tool.mjs";

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

export const { verifyReleaseBackup, migrationTransaction, main } =
  createReleaseTool({
    baseline,
    migrations,
    archiveVersion: 1,
    directoryPrefix: "pre-p2-release",
    command: "p2-release.mjs",
  });

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
