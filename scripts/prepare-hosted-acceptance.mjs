import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { client, call } from "./client.mjs";

// Provision synthetic acceptance identities in the dedicated initial deployment.
// Never reset hosted data. Refuse a different target or an already initialized app.
if (process.env.SUPABASE_URL !== "https://xtgaepikylepriipuyps.supabase.co")
  throw new Error(
    "This one-time acceptance setup is scoped to the approved QA project.",
  );
const service = client(true);
const state = await service.from("projects").select("id").limit(1);
if (state.error) throw state.error;
if (!process.env.QA_EMAIL) throw new Error("Owner email required.");
let ownerId, project;
if (state.data.length) {
  const owner = await service
    .from("profiles")
    .select("id")
    .eq("email", process.env.QA_EMAIL)
    .single();
  if (owner.error) throw owner.error;
  const current = await service.from("projects").select("*");
  if (
    current.error ||
    current.data.length !== 1 ||
    current.data[0].created_by !== owner.data.id ||
    current.data[0].name !== "ERP multi-campus"
  )
    throw new Error(
      "Existing installation is outside this partial setup; no changes performed.",
    );
  ownerId = owner.data.id;
  project = current.data[0].id;
} else {
  const owner = await service.auth.admin.createUser({
    email: process.env.QA_EMAIL,
    password: crypto.randomUUID() + "aA1!",
    email_confirm: true,
  });
  if (owner.error) throw owner.error;
  ownerId = owner.data.user.id;
  project = await call(service, "bootstrap_workspace", {
    p_user: ownerId,
    p_name: "ERP multi-campus",
  });
}
const actor = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const recovery = await service.auth.admin.generateLink({
  type: "recovery",
  email: process.env.QA_EMAIL,
});
if (recovery.error) throw recovery.error;
const login = await actor.auth.verifyOtp({
  token_hash: recovery.data.properties.hashed_token,
  type: "recovery",
});
if (login.error) throw login.error;
const seed = JSON.parse(await readFile("data/erp-cases.json", "utf8"));
for (const c of seed) {
  const existing = await actor
    .from("test_cases")
    .select("id")
    .eq("project_id", project)
    .eq("code", c.code)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data)
    await call(actor, "save_case", {
      p_project: project,
      p_code: c.code,
      p_body: c.body,
    });
}
const acceptance = await call(actor, "create_project", {
  p_name: "Validation technique — données synthétiques",
});
const password = crypto.randomUUID() + "aA1!";
const identities = {};
for (const [label, role] of [
  ["admin", "admin"],
  ["tester", "tester"],
]) {
  const email = `acceptance-${label}@qa-workbench.test`;
  const user = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (user.error) throw user.error;
  await call(actor, "change_member", {
    p_project: acceptance,
    p_user: user.data.user.id,
    p_role: role,
    p_active: true,
  });
  identities[label] = email;
}
for (const c of seed)
  await call(actor, "save_case", {
    p_project: acceptance,
    p_code: c.code,
    p_body: c.body,
  });
await writeFile(
  ".env.hosted.browser",
  JSON.stringify({
    email: identities.admin,
    testerEmail: identities.tester,
    password,
    project_id: acceptance,
  }),
  { mode: 0o600 },
);
const access = await service.auth.admin.generateLink({
  type: "recovery",
  email: process.env.QA_EMAIL,
});
if (access.error) throw access.error;
await writeFile(
  ".env.admin-access.local",
  `${process.env.APP_ORIGIN}/?token_hash=${encodeURIComponent(access.data.properties.hashed_token)}&type=recovery\n`,
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    project_id: project,
    acceptance_project_id: acceptance,
    cases: seed.length,
    owner_access: "Private activation file prepared.",
  }),
);
