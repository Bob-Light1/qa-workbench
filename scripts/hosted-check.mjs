import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
if (url !== "https://xtgaepikylepriipuyps.supabase.co")
  throw new Error("Unexpected hosted QA target.");
const accounts = JSON.parse(await readFile(".env.hosted.browser", "utf8"));
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const anon = createClient(url, key, { auth: { persistSession: false } });
let count = 0;
function check(label, value) {
  assert.ok(value, label);
  count++;
  console.log(`PASS ${label}`);
}
const signup = await anon.auth.signUp({
  email: `public-${crypto.randomUUID()}@qa-workbench.test`,
  password: crypto.randomUUID() + "aA1!",
});
check("hosted public signup is disabled", Boolean(signup.error));
check(
  "hosted anonymous table read is denied",
  Boolean((await anon.from("test_cases").select("id")).error),
);
const tester = createClient(url, key, { auth: { persistSession: false } });
const signed = await tester.auth.signInWithPassword({
  email: accounts.testerEmail,
  password: accounts.password,
});
if (signed.error) throw signed.error;
check("hosted email/password login works", Boolean(signed.data.session));
const projects = await tester.from("projects").select("id");
if (projects.error) throw projects.error;
check(
  "hosted tester sees only its acceptance project",
  projects.data.length === 1 && projects.data[0].id === accounts.project_id,
);
const unrelated = await tester
  .from("test_cases")
  .select("id")
  .neq("project_id", accounts.project_id);
if (unrelated.error) throw unrelated.error;
check(
  "hosted tester cannot read unrelated project cases",
  unrelated.data.length === 0,
);
const seed = JSON.parse(await readFile("data/erp-cases.json", "utf8"));
check(
  "hosted tester cannot author via RPC",
  Boolean(
    (
      await tester.rpc("save_case", {
        p_project: accounts.project_id,
        p_code: "FORBIDDEN-001",
        p_body: seed[0].body,
      })
    ).error,
  ),
);
check(
  "hosted direct writes are denied",
  Boolean(
    (
      await tester
        .from("test_cases")
        .insert({
          project_id: accounts.project_id,
          code: "FORBIDDEN-002",
          body: seed[0].body,
        })
    ).error,
  ),
);
const captures = await tester
  .from("attachments")
  .select("*")
  .eq("project_id", accounts.project_id)
  .eq("state", "ready");
if (captures.error) throw captures.error;
check("hosted acceptance retained private evidence", captures.data.length > 0);
const path = captures.data[0].object_path;
check(
  "hosted member can download evidence",
  Boolean((await tester.storage.from("evidence").download(path)).data),
);
check(
  "hosted anonymous evidence access is denied",
  Boolean((await anon.storage.from("evidence").download(path)).error),
);
check(
  "hosted tester cannot export whole project",
  Boolean(
    (await tester.rpc("export_bundle", { p_project: accounts.project_id }))
      .error,
  ),
);
console.log(`Hosted API acceptance: ${count} checks passed.`);
