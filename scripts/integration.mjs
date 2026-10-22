import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { client, call } from "./client.mjs";
import { backup, restore } from "./backup.mjs";

const api = process.env.SUPABASE_URL;
const localConfig = await readFile("supabase/config.toml", "utf8");
if (!/^project_id\s*=\s*"qa-workbench-validation"\s*$/m.test(localConfig))
  throw new Error("Integration tests require the dedicated validation stack.");
if (!api || !["http://127.0.0.1:55321", "http://localhost:55321"].includes(api))
  throw new Error(
    "Integration tests require the owned local QA stack at port 55321.",
  );
const admin = client(true),
  key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let count = 0;
function check(name, value) {
  assert.ok(value, name);
  count++;
  console.log(`PASS ${name}`);
}
async function rejects(name, promise, code) {
  try {
    await promise;
    assert.fail(`Expected rejection: ${name}`);
  } catch (e) {
    if (e.code === "ERR_ASSERTION") throw e;
    check(name, String(e.message).includes(code) || e.code === code);
  }
}
const { data: existing, error: initialError } = await admin
  .from("projects")
  .select("id");
if (initialError) throw initialError;
if (existing.length)
  throw new Error(
    "The integration stack must be empty. Explicitly reset this owned local test stack before rerunning.",
  );
const password = crypto.randomUUID() + "aA1!";
const publicSignup = await createClient(api, key).auth.signUp({
  email: "public-signup@qa-workbench.test",
  password,
});
check(
  "public signup is disabled while email login remains available",
  Boolean(publicSignup.error),
);
const users = {};
for (const label of ["owner", "editor", "tester", "second", "outsider"]) {
  const email = `${label}@qa-workbench.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const db = createClient(api, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await db.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  users[label] = {
    id: data.user.id,
    email,
    db,
    token: signed.data.session.access_token,
  };
}
const p = await call(admin, "bootstrap_workspace", {
  p_user: users.owner.id,
  p_name: "ERP multi-campus",
});
check("bootstrap creates a project", Boolean(p));
await rejects(
  "bootstrap cannot run twice",
  call(admin, "bootstrap_workspace", {
    p_user: users.owner.id,
    p_name: "again",
  }),
  "ALREADY_INITIALIZED",
);
const owner = users.owner.db,
  editor = users.editor.db,
  tester = users.tester.db,
  second = users.second.db,
  outsider = users.outsider.db;
for (const [label, role] of [
  ["editor", "editor"],
  ["tester", "tester"],
  ["second", "tester"],
])
  await call(owner, "change_member", {
    p_project: p,
    p_user: users[label].id,
    p_role: role,
    p_active: true,
  });
await rejects(
  "last administrator cannot remove itself",
  call(owner, "change_member", {
    p_project: p,
    p_user: users.owner.id,
    p_role: "tester",
    p_active: false,
  }),
  "LAST_ADMIN",
);
const other = await call(owner, "create_project", {
  p_name: "Private other project",
});
await call(owner, "change_member", {
  p_project: other,
  p_user: users.outsider.id,
  p_role: "admin",
  p_active: true,
});
await call(owner, "change_member", {
  p_project: other,
  p_user: users.owner.id,
  p_role: "admin",
  p_active: false,
});
check(
  "outsider cannot read another project",
  (await outsider.from("projects").select("*").eq("id", p)).data.length === 0,
);
check(
  "anonymous caller cannot read cases",
  Boolean((await createClient(api, key).from("test_cases").select("*")).error),
);
const seed = JSON.parse(await readFile("data/erp-cases.json", "utf8"));
const body = seed[0].body;
await rejects(
  "API rejects case bodies that would break the typed reader",
  call(editor, "save_case", {
    p_project: p,
    p_code: "INVALID-001",
    p_body: { ...body, bricks: null },
  }),
  "INVALID_CASE",
);
await rejects(
  "tester cannot create a case",
  call(tester, "save_case", { p_project: p, p_code: "NO-001", p_body: body }),
  "42501",
);
let c = await call(editor, "save_case", {
  p_project: p,
  p_code: "CHECK-001",
  p_body: body,
});
check("editor can create case v1", c.version === 1);
check(
  "direct case writes are forbidden",
  Boolean(
    (
      await tester
        .from("test_cases")
        .insert({ project_id: p, code: "BYPASS", body })
    ).error,
  ),
);
const race = await Promise.allSettled(
  [1, 2].map((n) =>
    call(editor, "save_case", {
      p_project: p,
      p_code: c.code,
      p_body: { ...body, title: `Concurrent ${n}` },
      p_id: c.id,
      p_version: 1,
    }),
  ),
);
check(
  "one concurrent case edit succeeds",
  race.filter((r) => r.status === "fulfilled").length === 1,
);
check(
  "one concurrent case edit conflicts",
  race.some(
    (r) =>
      r.status === "rejected" && r.reason.message.includes("VERSION_CONFLICT"),
  ),
);
c = race.find((r) => r.status === "fulfilled").value;
const campaign = await call(editor, "start_campaign", {
  p_project: p,
  p_name: "Acceptance campaign",
  p_environment: "Owned synthetic local ERP",
  p_builds: {
    B1: "fixture",
    B2: "fixture",
    B3: "not applicable",
    B4: "not applicable",
  },
  p_cases: [c.id],
});
const { data: item, error: itemError } = await owner
  .from("campaign_items")
  .select("*")
  .eq("campaign_id", campaign)
  .single();
if (itemError) throw itemError;
await call(editor, "save_case", {
  p_project: p,
  p_code: c.code,
  p_body: { ...body, title: "Later instructions" },
  p_id: c.id,
  p_version: c.version,
});
check(
  "campaign keeps exact original case version",
  item.case_version === 2 && item.snapshot.title === c.body.title,
);
await call(owner, "assign_item", {
  p_id: item.id,
  p_user: users.tester.id,
  p_version: 1,
});
await rejects(
  "another tester cannot execute an assigned case",
  call(second, "begin_execution", {
    p_item: item.id,
    p_id: crypto.randomUUID(),
  }),
  "ASSIGNED_TO_OTHER",
);
await call(owner, "assign_item", { p_id: item.id, p_user: null, p_version: 2 });
const [e1, e2] = await Promise.all([
  call(tester, "begin_execution", {
    p_item: item.id,
    p_id: crypto.randomUUID(),
  }),
  call(second, "begin_execution", {
    p_item: item.id,
    p_id: crypto.randomUUID(),
  }),
]);
check("two testers can work on an unassigned case", e1.id !== e2.id);
const repeated = await call(tester, "begin_execution", {
  p_item: item.id,
  p_id: crypto.randomUUID(),
});
check("draft resumes without duplication", repeated.id === e1.id);
await rejects(
  "another tester cannot change a draft",
  call(second, "save_execution", {
    p_id: e1.id,
    p_version: 1,
    p_notes: "stolen",
    p_minutes: 1,
    p_verdict: null,
  }),
  "42501",
);
const draft = await call(tester, "save_execution", {
  p_id: e1.id,
  p_version: 1,
  p_notes: "Draft after reload",
  p_minutes: 2,
  p_verdict: null,
});
check(
  "draft persists through a new client read",
  (await tester.from("executions").select("notes").eq("id", e1.id).single())
    .data.notes === "Draft after reload",
);
await rejects(
  "stale draft write is rejected",
  call(tester, "save_execution", {
    p_id: e1.id,
    p_version: 1,
    p_notes: "stale",
    p_minutes: 1,
    p_verdict: null,
  }),
  "VERSION_CONFLICT",
);
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
  "base64",
);
const a = await call(tester, "reserve_attachment", {
  p_execution: e1.id,
  p_id: crypto.randomUUID(),
  p_name: "synthetic.png",
  p_mime: "image/png",
  p_bytes: image.length,
});
await rejects(
  "missing object is never confirmed as uploaded",
  call(tester, "finish_attachment", { p_id: a.id }),
  "UPLOAD_NOT_FOUND",
);
await rejects(
  "pending evidence prevents finalization",
  call(tester, "save_execution", {
    p_id: e1.id,
    p_version: draft.version,
    p_notes: "Observed mismatch",
    p_minutes: 3,
    p_verdict: "failed",
  }),
  "UPLOAD_PENDING",
);
check(
  "outsider cannot upload evidence into another project",
  Boolean(
    (
      await outsider.storage
        .from("evidence")
        .upload(a.object_path, image, { contentType: "image/png" })
    ).error,
  ),
);
const uploaded = await tester.storage
  .from("evidence")
  .upload(a.object_path, image, { contentType: "image/png" });
if (uploaded.error) throw uploaded.error;
await call(tester, "finish_attachment", { p_id: a.id });
check(
  "project member can download ready evidence",
  Boolean((await second.storage.from("evidence").download(a.object_path)).data),
);
check(
  "outsider cannot download evidence",
  Boolean(
    (await outsider.storage.from("evidence").download(a.object_path)).error,
  ),
);
check(
  "anonymous cannot create a signed evidence URL",
  Boolean(
    (
      await createClient(api, key)
        .storage.from("evidence")
        .createSignedUrl(a.object_path, 60)
    ).error,
  ),
);
check(
  "oversized evidence reservation is refused",
  Boolean(
    (
      await tester.rpc("reserve_attachment", {
        p_execution: e1.id,
        p_id: crypto.randomUUID(),
        p_name: "too-big.png",
        p_mime: "image/png",
        p_bytes: 5242881,
      })
    ).error,
  ),
);
check(
  "SVG evidence reservation is refused",
  Boolean(
    (
      await tester.rpc("reserve_attachment", {
        p_execution: e1.id,
        p_id: crypto.randomUUID(),
        p_name: "unsafe.svg",
        p_mime: "image/svg+xml",
        p_bytes: 50,
      })
    ).error,
  ),
);
const resultArgs = {
  p_id: e1.id,
  p_version: draft.version,
  p_notes: "Observed mismatch: synthetic failure",
  p_minutes: 3,
  p_verdict: "failed",
};
const final = await call(tester, "save_execution", resultArgs);
const replay = await call(tester, "save_execution", resultArgs);
check(
  "final submission retry is idempotent",
  final.id === replay.id && final.version === replay.version,
);
await rejects(
  "final result cannot be rewritten",
  call(tester, "save_execution", {
    ...resultArgs,
    p_version: final.version,
    p_verdict: "passed",
  }),
  "RESULT_IMMUTABLE",
);
const issue = await call(tester, "report_issue", {
  p_execution: e1.id,
  p_kind: "defect",
  p_title: "Synthetic regression",
  p_actual: "Step 2 produced an unexpected outcome.",
});
await rejects(
  "tester cannot administer issue triage",
  call(tester, "update_issue", {
    p_id: issue,
    p_version: 1,
    p_status: "fixed",
    p_resolution: "fix",
  }),
  "42501",
);
await call(editor, "update_issue", {
  p_id: issue,
  p_version: 1,
  p_status: "fixed",
  p_resolution: "Synthetic correction commit abc123",
});
await rejects(
  "defect cannot close without a successful later check",
  call(editor, "update_issue", {
    p_id: issue,
    p_version: 2,
    p_status: "closed",
    p_resolution: "fixed",
  }),
  "PASSING_RETEST_REQUIRED",
);
await new Promise((r) => setTimeout(r, 30));
const retest = await call(tester, "begin_execution", {
  p_item: item.id,
  p_id: crypto.randomUUID(),
});
const passed = await call(tester, "save_execution", {
  p_id: retest.id,
  p_version: 1,
  p_notes: "Correction verified",
  p_minutes: 2,
  p_verdict: "passed",
});
await call(editor, "update_issue", {
  p_id: issue,
  p_version: 2,
  p_status: "verified",
  p_resolution: "Synthetic correction commit abc123",
  p_verification: passed.id,
});
check(
  "failure and successful retest are both retained",
  (
    await owner
      .from("executions")
      .select("id")
      .eq("item_id", item.id)
      .not("verdict", "is", null)
  ).data.length === 2,
);
check(
  "issue events retain triage and verification",
  (await owner.from("issue_events").select("id").eq("issue_id", issue)).data
    .length === 3,
);
await call(owner, "change_member", {
  p_project: p,
  p_user: users.second.id,
  p_role: "tester",
  p_active: false,
});
check(
  "removed member cannot read project rows",
  (await second.from("executions").select("id").eq("project_id", p)).data
    .length === 0,
);
check(
  "removed member cannot obtain a new evidence URL",
  Boolean(
    (await second.storage.from("evidence").createSignedUrl(a.object_path, 60))
      .error,
  ),
);
await call(owner, "change_member", {
  p_project: p,
  p_user: users.second.id,
  p_role: "tester",
  p_active: true,
});
await rejects(
  "tester cannot export complete project",
  call(tester, "export_bundle", { p_project: p }),
  "42501",
);
await rejects(
  "tester cannot restore any backup",
  call(tester, "restore_bundle", { p_tables: {}, p_owner: users.tester.id }),
  "42501",
);

// Exercise actual Auth one-use links and the authenticated server access function.
const inviteEmail = `invite-${crypto.randomUUID()}@qa-workbench.test`;
const invoke = await owner.functions.invoke("manage-access", {
  body: { action: "invite", project_id: p, email: inviteEmail, role: "tester" },
});
if (invoke.error || invoke.data?.error)
  throw invoke.error || new Error(invoke.data.error);
check(
  "access function returns an individual invitation link",
  Boolean(invoke.data.link),
);
const link = new URL(invoke.data.link),
  invited = createClient(api, key, { auth: { persistSession: false } });
const verified = await invited.auth.verifyOtp({
  token_hash: link.searchParams.get("token_hash"),
  type: "invite",
});
if (verified.error) throw verified.error;
check(
  "invitation activates the correct account",
  verified.data.user.email === inviteEmail,
);
check(
  "invitation cannot be used twice",
  Boolean(
    (
      await createClient(api, key).auth.verifyOtp({
        token_hash: link.searchParams.get("token_hash"),
        type: "invite",
      })
    ).error,
  ),
);
const badRecovery = await tester.functions.invoke("manage-access", {
  body: { action: "recovery", project_id: p, email: users.owner.email },
});
check("tester cannot reset an administrator", Boolean(badRecovery.error));
const recover = await owner.functions.invoke("manage-access", {
  body: { action: "recovery", project_id: p, email: users.tester.email },
});
if (recover.error) throw recover.error;
check("installation operator can prepare recovery", Boolean(recover.data.link));
const lost = new URL(recover.data.link);
check(
  "recovery link establishes a session",
  !(
    await createClient(api, key).auth.verifyOtp({
      token_hash: lost.searchParams.get("token_hash"),
      type: "recovery",
    })
  ).error,
);
const newInvite = await admin.auth.admin.generateLink({
  type: "invite",
  email: `expired-${crypto.randomUUID()}@qa-workbench.test`,
});
// Set the owned local Auth timestamp into the past instead of waiting an hour.
execFileSync(
  "docker",
  [
    "exec",
    "supabase_db_qa-workbench-validation",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-c",
    `update auth.users set confirmation_sent_at=now()-interval '2 hours' where id='${newInvite.data.user.id}'`,
  ],
  { stdio: "pipe" },
);
check(
  "expired invitation is refused",
  Boolean(
    (
      await createClient(api, key).auth.verifyOtp({
        token_hash: newInvite.data.properties.hashed_token,
        type: "invite",
      })
    ).error,
  ),
);

for (const c of seed)
  await call(owner, "save_case", {
    p_project: p,
    p_code: c.code,
    p_body: c.body,
  });
await mkdir("backups", { recursive: true });
const exported = await backup(owner, p, "backups/integration.zip");
check("backup includes evidence", exported.attachments.length === 1);
await rejects(
  "restore rejects a nonempty installation",
  restore(admin, "backups/integration.zip", users.owner.email),
  "RESTORE_REQUIRES_EMPTY_INSTALLATION",
);
console.log(
  "Resetting only the owned local qa-workbench-validation stack for the restore acceptance.",
);
execFileSync("npx", ["supabase", "db", "reset", "--local"], {
  stdio: "pipe",
  env: process.env,
});
const restored = await restore(
  admin,
  "backups/integration.zip",
  users.owner.email,
);
check(
  "empty-installation restore verifies row counts and bytes",
  restored.counts.executions === exported.executions.length &&
    restored.counts.attachments === 1,
);
const current = (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }))
  .data.users;
for (const email of [
  users.owner.email,
  users.tester.email,
  users.second.email,
]) {
  const u = current.find((u) => u.email === email);
  const { error } = await admin.auth.admin.updateUserById(u.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
}
await writeFile(
  ".env.browser",
  JSON.stringify({
    email: users.owner.email,
    testerEmail: users.tester.email,
    secondEmail: users.second.email,
    password,
    project_id: p,
    campaign_id: campaign,
  }),
  { mode: 0o600 },
);
console.log(
  `Integration acceptance: ${count} checks passed. Synthetic browser credentials saved privately.`,
);
