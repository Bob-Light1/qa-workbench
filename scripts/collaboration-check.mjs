import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { acceptanceTarget } from "./acceptance-target.mjs";
import { client, call } from "./client.mjs";

// No hosted mode: this new increment has not been authorized for production.
acceptanceTarget(
  process.env.SUPABASE_URL,
  false,
  await readFile("supabase/config.toml", "utf8"),
);
if (process.argv.length > 2)
  throw new Error("Collaboration acceptance has no command-line options.");
const service = client(true);
const password = crypto.randomUUID() + "aA1!";
const suffix = crypto.randomUUID();
const users = [];
const checks = [];
function check(name, value) {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
}
async function denied(name, request, code) {
  const { error } = await request;
  check(name, Boolean(error) && (!code || error.message.includes(code)));
}
async function rows(db, table, project) {
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("project_id", project)
    .order("id");
  if (error) throw error;
  return data;
}
for (let index = 0; index < 21; index++) {
  const email = `collaboration-${index}-${suffix}@qa-workbench.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const db = client();
  const login = await db.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  users.push({ id: data.user.id, email, db });
}
const [owner, editor, tester] = users;
const project = crypto.randomUUID();
for (const result of [
  await service.from("projects").insert({
    id: project,
    name: `Collaboration acceptance ${suffix}`,
    created_by: owner.id,
  }),
  await service.from("memberships").insert(
    users.slice(0, 20).map((u, i) => ({
      project_id: project,
      user_id: u.id,
      role: i === 0 ? "admin" : i === 1 ? "editor" : "tester",
    })),
  ),
])
  if (result.error) throw result.error;
const body = {
  title: "Synthetic collaboration instructions",
  objective: "Coordinate twenty identities",
  prerequisites: "Synthetic data only",
  steps: [{ action: "Open", expected: "Visible" }],
  minutes: 5,
  domain: "Workbench",
  bricks: ["QA"],
  roadmap: "P2-02",
};
const cases = [];
for (let i = 0; i < 3; i++)
  cases.push(
    await call(owner.db, "save_case", {
      p_project: project,
      p_code: `COL-${String(i + 1).padStart(3, "0")}`,
      p_body: body,
    }),
  );
const campaign = await call(owner.db, "start_campaign", {
  p_project: project,
  p_name: "Bulk collaboration",
  p_environment: "Owned local synthetic acceptance",
  p_builds: { QA: "P2-02" },
  p_cases: cases.map((c) => c.id),
});
const otherCampaign = await call(owner.db, "start_campaign", {
  p_project: project,
  p_name: "Other campaign",
  p_environment: "Synthetic",
  p_builds: {},
  p_cases: [cases[0].id],
});
const items = async () =>
  (await rows(owner.db, "campaign_items", project)).filter(
    (i) => i.campaign_id === campaign,
  );
const selection = (list) => list.map(({ id, version }) => ({ id, version }));
const batch = (list, user = tester.id) => ({
  p_campaign: campaign,
  p_items: selection(list),
  p_user: user,
});
const initial = await items();
const anonymous = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
);
await denied(
  "anonymous bulk RPC denied",
  anonymous.rpc("assign_items", batch(initial)),
);
await denied(
  "tester bulk RPC denied",
  tester.db.rpc("assign_items", batch(initial)),
  "FORBIDDEN",
);
await denied(
  "outsider bulk RPC denied",
  users[20].db.rpc("assign_items", batch(initial)),
  "FORBIDDEN",
);
await denied(
  "unknown campaign denied",
  owner.db.rpc("assign_items", {
    ...batch(initial),
    p_campaign: crypto.randomUUID(),
  }),
  "FORBIDDEN",
);
await denied(
  "direct assignment writes denied",
  owner.db
    .from("campaign_items")
    .update({ assignee_id: tester.id })
    .eq("id", initial[0].id),
);
for (const [label, value] of [
  ["null", null],
  ["object", {}],
  ["empty", []],
  ["oversize", Array(201).fill(selection(initial)[0])],
  ["duplicate", [selection(initial)[0], selection(initial)[0]]],
  ["null entry", [null]],
  ["missing ID", [{ version: 1 }]],
  ["invalid UUID", [{ id: "invalid", version: 1 }]],
  ["null version", [{ id: initial[0].id, version: null }]],
  ["string version", [{ id: initial[0].id, version: "1" }]],
  ["fraction version", [{ id: initial[0].id, version: 1.5 }]],
  ["negative version", [{ id: initial[0].id, version: -1 }]],
]) {
  await denied(
    `${label} selection denied`,
    owner.db.rpc("assign_items", { ...batch(initial), p_items: value }),
    "INVALID_SELECTION",
  );
}
await denied(
  "missing item denies whole batch",
  owner.db.rpc("assign_items", {
    ...batch(initial),
    p_items: [...selection(initial), { id: crypto.randomUUID(), version: 1 }],
  }),
  "INVALID_SELECTION",
);
const foreignItem = (await rows(owner.db, "campaign_items", project)).find(
  (i) => i.campaign_id === otherCampaign,
);
await denied(
  "mixed campaign denies whole batch",
  owner.db.rpc("assign_items", batch([initial[0], foreignItem])),
  "INVALID_SELECTION",
);
const foreignProject = await call(owner.db, "create_project", {
  p_name: "Isolated collaboration project",
});
const foreignCase = await call(owner.db, "save_case", {
  p_project: foreignProject,
  p_code: "FOREIGN-001",
  p_body: body,
});
const foreignCampaign = await call(owner.db, "start_campaign", {
  p_project: foreignProject,
  p_name: "Isolated",
  p_environment: "Synthetic",
  p_builds: {},
  p_cases: [foreignCase.id],
});
const foreignItems = await rows(owner.db, "campaign_items", foreignProject);
await denied(
  "mixed project denies whole batch",
  owner.db.rpc("assign_items", batch([initial[0], ...foreignItems])),
  "INVALID_SELECTION",
);
await denied(
  "nonmember target denied",
  owner.db.rpc("assign_items", batch(initial, users[20].id)),
  "INVALID_MEMBER",
);
await denied(
  "forged role argument denied",
  tester.db.rpc("assign_items", { ...batch(initial), p_role: "admin" }),
);
check(
  "denied batches leave every assignment and version untouched",
  JSON.stringify(await items()) === JSON.stringify(initial),
);
check(
  "editor atomically assigns all selected items",
  (await call(editor.db, "assign_items", batch(initial))) === 3,
);
let current = await items();
check(
  "all versions advance exactly once",
  current.every((i) => i.version === 2 && i.assignee_id === tester.id),
);
const draft = await call(tester.db, "begin_execution", {
  p_item: current[0].id,
  p_id: crypto.randomUUID(),
});
await denied(
  "other actor cannot execute assigned item",
  users[3].db.rpc("begin_execution", {
    p_item: current[0].id,
    p_id: crypto.randomUUID(),
  }),
  "ASSIGNED_TO_OTHER",
);
await call(owner.db, "assign_item", {
  p_id: current[1].id,
  p_user: owner.id,
  p_version: current[1].version,
});
const beforeStale = await items();
await denied(
  "one stale version refuses entire batch",
  editor.db.rpc("assign_items", batch(current, editor.id)),
  "VERSION_CONFLICT",
);
check(
  "stale batch cannot partially change fresh items",
  JSON.stringify(await items()) === JSON.stringify(beforeStale),
);
await call(owner.db, "assign_items", batch(beforeStale, editor.id));
await denied(
  "reassigned draft cannot submit",
  tester.db.rpc("save_execution", {
    p_id: draft.id,
    p_version: draft.version,
    p_notes: "Reassigned",
    p_minutes: 1,
    p_verdict: "passed",
  }),
  "CAMPAIGN_CLOSED_OR_REASSIGNED",
);
await call(owner.db, "assign_items", batch(await items(), null));
check(
  "bulk unassignment advances versions and frees every item",
  (await items()).every((i) => i.assignee_id === null),
);
const beforeRace = await items();
const races = await Promise.all(
  Array.from({ length: 20 }, (_, index) =>
    (index % 2 ? owner : editor).db.rpc(
      "assign_items",
      batch(
        index % 2 ? [...beforeRace].reverse() : beforeRace,
        index % 2 ? owner.id : editor.id,
      ),
    ),
  ),
);
check(
  "twenty overlapping batches yield one winner and nineteen version conflicts",
  races.filter((r) => !r.error).length === 1 &&
    races.filter((r) => r.error?.message.includes("VERSION_CONFLICT"))
      .length === 19,
);
current = await items();
check(
  "overlapping batches preserve one consistent target and one version increment",
  new Set(current.map((i) => i.assignee_id)).size === 1 &&
    current.every((i, n) => i.version === beforeRace[n].version + 1),
);
const mixedRace = await Promise.all([
  owner.db.rpc("assign_items", batch(current, tester.id)),
  editor.db.rpc("assign_item", {
    p_id: current[0].id,
    p_user: editor.id,
    p_version: current[0].version,
  }),
]);
check(
  "single assignment and overlapping batch cannot overwrite each other",
  mixedRace.filter((r) => !r.error).length === 1 &&
    mixedRace.some((r) => r.error?.message.includes("VERSION_CONFLICT")),
);
const afterMixed = await items();
check(
  "losing batch has no partial effects",
  mixedRace[0].error
    ? afterMixed
        .slice(1)
        .every(
          (i, n) =>
            i.version === current[n + 1].version &&
            i.assignee_id === current[n + 1].assignee_id,
        )
    : afterMixed.every((i) => i.assignee_id === tester.id),
);
await call(owner.db, "change_member", {
  p_project: project,
  p_user: tester.id,
  p_role: "tester",
  p_active: false,
});
await denied(
  "withdrawn target denied",
  owner.db.rpc("assign_items", batch(afterMixed)),
  "INVALID_MEMBER",
);
await call(owner.db, "change_member", {
  p_project: project,
  p_user: editor.id,
  p_role: "editor",
  p_active: false,
});
await denied(
  "withdrawn editor bulk write denied",
  editor.db.rpc("assign_items", batch(afterMixed, null)),
  "FORBIDDEN",
);
await call(owner.db, "change_member", {
  p_project: project,
  p_user: tester.id,
  p_role: "tester",
  p_active: true,
});
await call(owner.db, "change_member", {
  p_project: project,
  p_user: editor.id,
  p_role: "editor",
  p_active: true,
});
await call(owner.db, "assign_items", batch(await items(), null));
const shared = initial[2].id;
const twenty = users.slice(0, 20);
const drafts = await Promise.all(
  twenty.map((u) =>
    call(u.db, "begin_execution", {
      p_item: shared,
      p_id: crypto.randomUUID(),
    }),
  ),
);
check(
  "twenty identities concurrently begin distinct drafts on an unassigned item",
  new Set(drafts.map((e) => e.id)).size === 20 &&
    drafts.every((e, i) => e.author_id === twenty[i].id),
);
const failed = await Promise.all(
  twenty.map((u, i) =>
    call(u.db, "save_execution", {
      p_id: drafts[i].id,
      p_version: drafts[i].version,
      p_notes: `Synthetic failure ${i}`,
      p_minutes: 1,
      p_verdict: "failed",
    }),
  ),
);
check(
  "twenty concurrent failed submissions retain their actor and verdict",
  failed.every(
    (e, i) => e.verdict === "failed" && e.author_id === twenty[i].id,
  ),
);
await denied(
  "another actor cannot alter a result",
  owner.db.rpc("save_execution", {
    p_id: failed[2].id,
    p_version: failed[2].version,
    p_notes: "Overwrite",
    p_minutes: 1,
    p_verdict: "passed",
  }),
  "FORBIDDEN",
);
await denied(
  "author cannot rewrite submitted result",
  tester.db.rpc("save_execution", {
    p_id: failed[2].id,
    p_version: failed[2].version,
    p_notes: "Overwrite",
    p_minutes: 1,
    p_verdict: "passed",
  }),
  "RESULT_IMMUTABLE",
);
const retests = await Promise.all(
  twenty.map((u) =>
    call(u.db, "begin_execution", {
      p_item: shared,
      p_id: crypto.randomUUID(),
    }),
  ),
);
await Promise.all(
  twenty.map((u, i) =>
    call(u.db, "save_execution", {
      p_id: retests[i].id,
      p_version: retests[i].version,
      p_notes: `Synthetic retest ${i}`,
      p_minutes: 1,
      p_verdict: "passed",
    }),
  ),
);
const edits = await Promise.all(
  twenty.map((u, i) =>
    (i % 2 ? owner : editor).db.rpc("save_case", {
      p_project: project,
      p_id: cases[0].id,
      p_version: 1,
      p_code: cases[0].code,
      p_body: { ...body, title: `Concurrent revision ${i}` },
    }),
  ),
);
check(
  "twenty concurrent case edits yield one revision and nineteen conflicts",
  edits.filter((r) => !r.error).length === 1 &&
    edits.filter((r) => r.error?.message.includes("VERSION_CONFLICT"))
      .length === 19,
);
await call(owner.db, "set_campaign_status", {
  p_id: campaign,
  p_version: 1,
  p_status: "closed",
});
await call(editor.db, "assign_items", batch(await items(), tester.id));
check(
  "bulk assignment preserves closed campaign status",
  (await rows(owner.db, "campaigns", project)).find((c) => c.id === campaign)
    .status === "closed",
);
await denied(
  "organizing a closed campaign does not permit execution",
  tester.db.rpc("begin_execution", {
    p_item: shared,
    p_id: crypto.randomUUID(),
  }),
  "CAMPAIGN_CLOSED",
);
await call(owner.db, "set_campaign_status", {
  p_id: campaign,
  p_version: 2,
  p_status: "active",
});
const exported = await call(owner.db, "export_bundle", { p_project: project });
check(
  "bulk work and retests preserve all forty submitted results in export",
  exported.executions.filter((e) => e.verdict === "failed").length === 20 &&
    exported.executions.filter((e) => e.verdict === "passed").length === 20 &&
    failed.every((e) =>
      isDeepStrictEqual(
        exported.executions.find((x) => x.id === e.id),
        e,
      ),
    ),
);
check(
  "all original campaign snapshots remain unchanged",
  (await items()).every(
    (i, n) =>
      JSON.stringify(i.snapshot) === JSON.stringify(initial[n].snapshot) &&
      i.case_version === 1,
  ),
);
const reads = await Promise.all(
  twenty.map((u) => rows(u.db, "executions", project)),
);
check(
  "all twenty members read the complete shared result history",
  reads.every((list) => list.filter((e) => e.verdict).length === 40),
);
check(
  "outsider cannot read collaboration data",
  (await rows(users[20].db, "campaign_items", project)).length === 0,
);
await mkdir("backups", { recursive: true });
await writeFile(
  "backups/collaboration-acceptance.json",
  JSON.stringify(
    {
      checked_at: new Date().toISOString(),
      checks,
      identities: 20,
      submitted_results: 40,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
await writeFile(
  ".env.collaboration.browser",
  JSON.stringify({
    email: owner.email,
    editorEmail: editor.email,
    testerEmail: tester.email,
    password,
    project_id: project,
    campaign_id: campaign,
    other_campaign_id: otherCampaign,
    foreign_campaign_id: foreignCampaign,
    items: initial.map((i) => ({ id: i.id, code: i.snapshot.code })),
  }),
  { mode: 0o600 },
);
console.log(
  `Local collaboration acceptance: ${checks.length} checks passed. Private browser fixtures saved.`,
);
