import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { client, call } from "./client.mjs";
import { caseCoverage } from "../src/coverage.ts";
import { acceptanceTarget } from "./acceptance-target.mjs";

// Add isolated synthetic fixtures; never reset or change an existing workspace.
const config = await readFile("supabase/config.toml", "utf8");
const target = acceptanceTarget(
  process.env.SUPABASE_URL,
  process.argv.includes("--hosted"),
  config,
);
const admin = client(true);
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const password = crypto.randomUUID() + "aA1!";
const suffix = crypto.randomUUID();
const users = {};
let checks = 0;
function check(name, value) {
  assert.ok(value, name);
  console.log(`PASS ${name}`);
  checks++;
}
async function read(db, table, project) {
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("project_id", project);
  if (error) throw error;
  return data;
}
for (const label of ["owner", "tester", "second", "outsider"]) {
  const email = `coverage-${label}-${suffix}@qa-workbench.test`;
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
// Server credentials are limited to fixture provisioning. Behavior uses user JWTs below.
const provision = await admin.from("projects").insert({
  id: project,
  name: `Coverage acceptance ${suffix}`,
  created_by: users.owner.id,
});
if (provision.error) throw provision.error;
const memberships = await admin.from("memberships").insert(
  ["owner", "tester", "second"].map((label) => ({
    project_id: project,
    user_id: users[label].id,
    role: label === "owner" ? "admin" : "tester",
  })),
);
if (memberships.error) throw memberships.error;
const owner = users.owner.db,
  tester = users.tester.db;
for (const file of ["data/erp-cases.json", "data/erp-cases-phase2.json"]) {
  execFileSync(process.execPath, ["scripts/qa.mjs", "import", project, file], {
    env: { ...process.env, QA_EMAIL: users.owner.email, QA_PASSWORD: password },
    stdio: "pipe",
  });
}
const imported = await read(owner, "test_cases", project);
check(
  "both catalogs import through the ordinary user CLI and save_case RPC",
  imported.length === 13,
);
const initialRevisions = await read(owner, "case_versions", project);
execFileSync(
  process.execPath,
  ["scripts/qa.mjs", "import", project, "data/erp-cases-phase2.json"],
  {
    env: { ...process.env, QA_EMAIL: users.owner.email, QA_PASSWORD: password },
    stdio: "pipe",
  },
);
check(
  "reimport preserves stable IDs and does not create duplicate revisions",
  (await read(owner, "case_versions", project)).length ===
    initialRevisions.length,
);
check(
  "tester reads all newly imported cases through RLS",
  (await read(tester, "test_cases", project)).length === 13,
);
check(
  "outsider cannot read roadmap-linked cases",
  (await read(users.outsider.db, "test_cases", project)).length === 0,
);
const anonymous = createClient(process.env.SUPABASE_URL, key);
check(
  "anonymous catalog access is refused",
  Boolean((await anonymous.from("test_cases").select("id")).error),
);
const body = {
  ...imported[0].body,
  title: "Coverage synthetic instructions",
  roadmap: "Coverage acceptance — previous",
};
check(
  "tester cannot change roadmap metadata via RPC",
  Boolean(
    (
      await tester.rpc("save_case", {
        p_project: project,
        p_code: "DENIED",
        p_body: body,
      })
    ).error,
  ),
);
check(
  "direct case updates remain denied",
  Boolean(
    (await tester.from("test_cases").update({ body }).eq("id", imported[0].id))
      .error,
  ),
);
let c = await call(owner, "save_case", {
  p_project: project,
  p_code: "COV-001",
  p_body: body,
});
const oldCampaign = await call(owner, "start_campaign", {
  p_project: project,
  p_name: "Coverage previous revision",
  p_environment: "Synthetic local ERP",
  p_builds: { B1: "coverage-old", B2: "coverage-old" },
  p_cases: [c.id],
});
const oldItem = (await read(owner, "campaign_items", project)).find(
  (i) => i.campaign_id === oldCampaign,
);
const draft = await call(tester, "begin_execution", {
  p_item: oldItem.id,
  p_id: crypto.randomUUID(),
});
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
  "base64",
);
const attachment = await call(tester, "reserve_attachment", {
  p_execution: draft.id,
  p_id: crypto.randomUUID(),
  p_name: "coverage-synthetic.png",
  p_mime: "image/png",
  p_bytes: image.length,
});
const upload = await tester.storage
  .from("evidence")
  .upload(attachment.object_path, image, {
    contentType: "image/png",
    upsert: false,
  });
if (upload.error) throw upload.error;
await call(tester, "finish_attachment", { p_id: attachment.id });
check(
  "confirmed synthetic evidence is available for browser archive acceptance",
  (await read(tester, "attachments", project)).some(
    (a) => a.id === attachment.id && a.state === "ready",
  ),
);
await call(tester, "save_execution", {
  p_id: draft.id,
  p_version: draft.version,
  p_notes: "Synthetic passing old revision",
  p_minutes: 1,
  p_verdict: "passed",
});
c = await call(owner, "save_case", {
  p_project: project,
  p_id: c.id,
  p_code: c.code,
  p_version: c.version,
  p_body: {
    ...body,
    title: "Coverage revised instructions",
    roadmap: "Coverage acceptance — current",
  },
});
const currentCampaign = await call(owner, "start_campaign", {
  p_project: project,
  p_name: "Coverage current revision",
  p_environment: "Synthetic local ERP",
  p_builds: { B1: "coverage-current", B2: "coverage-current" },
  p_cases: [c.id],
});
const currentItem = (await read(owner, "campaign_items", project)).find(
  (i) => i.campaign_id === currentCampaign,
);
await call(tester, "begin_execution", {
  p_item: currentItem.id,
  p_id: crypto.randomUUID(),
});
check(
  "current campaign freezes revision two while old campaign retains revision one",
  currentItem.case_version === 2 &&
    oldItem.case_version === 1 &&
    oldItem.snapshot.roadmap === body.roadmap,
);
const pending = await call(owner, "save_case", {
  p_project: project,
  p_code: "COV-PENDING",
  p_body: { ...body, roadmap: "" },
});
const pendingCampaign = await call(owner, "start_campaign", {
  p_project: project,
  p_name: "Coverage pending result",
  p_environment: "Synthetic local ERP",
  p_builds: {},
  p_cases: [pending.id],
});
const archived = await call(owner, "save_case", {
  p_project: project,
  p_code: "COV-ARCHIVED",
  p_body: body,
});
await call(owner, "archive_case", {
  p_id: archived.id,
  p_version: archived.version,
  p_archived: true,
});
check(
  "archiving retains the case and revision history",
  (await read(owner, "test_cases", project)).find((x) => x.id === archived.id)
    .archived,
);
const coverageCases = await read(tester, "test_cases", project);
const coverageItems = await read(tester, "campaign_items", project);
const coverageExecutions = await read(tester, "executions", project);
const coverageEntry = (campaign = "") =>
  caseCoverage(coverageCases, coverageItems, coverageExecutions, campaign)
    .flatMap((group) => group.entries)
    .find((entry) => entry.testCase.id === c.id);
check(
  "real API rows keep the previous passing revision stale in all-campaign coverage",
  coverageEntry()?.state === "stale" &&
    coverageEntry()?.item.case_version === 1 &&
    coverageEntry()?.execution.verdict === "passed",
);
check(
  "real API rows ignore the current draft and isolate campaign results",
  coverageEntry(currentCampaign)?.state === "pending" &&
    coverageEntry(pendingCampaign)?.state === "unplanned",
);
await call(owner, "change_member", {
  p_project: project,
  p_user: users.second.id,
  p_role: "tester",
  p_active: false,
});
check(
  "withdrawn member cannot read coverage source rows",
  (await read(users.second.db, "campaign_items", project)).length === 0,
);
await call(owner, "change_member", {
  p_project: project,
  p_user: users.second.id,
  p_role: "tester",
  p_active: true,
});
await writeFile(
  `.env.coverage${target.suffix}.browser`,
  JSON.stringify({
    email: users.owner.email,
    testerEmail: users.tester.email,
    secondEmail: users.second.email,
    password,
    project_id: project,
    campaign_id: oldCampaign,
    current_campaign_id: currentCampaign,
    pending_campaign_id: pendingCampaign,
    coverage_case_id: c.id,
  }),
  { mode: 0o600 },
);
console.log(
  `${target.label} coverage API acceptance: ${checks} checks passed. Isolated browser fixtures saved privately; existing workspaces preserved.`,
);
