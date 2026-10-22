import { readFile, writeFile, chmod } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { client, actor, call } from "./client.mjs";
import { backup, restore } from "./backup.mjs";
const [command, project, arg] = process.argv.slice(2);
try {
  if (command === "bootstrap") {
    const db = client(true);
    if (!process.env.QA_EMAIL || !process.env.QA_PASSWORD)
      throw new Error("QA_EMAIL and QA_PASSWORD are required.");
    const state = await db.from("projects").select("id").limit(1);
    if (state.error) throw state.error;
    if (state.data.length) throw new Error("ALREADY_INITIALIZED");
    const { data, error } = await db.auth.admin.createUser({
      email: process.env.QA_EMAIL,
      password: process.env.QA_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(
      JSON.stringify({
        project_id: await call(db, "bootstrap_workspace", {
          p_user: data.user.id,
          p_name: project || "ERP multi-campus",
        }),
      }),
    );
  } else if (command === "access-link") {
    if (!project || !process.env.QA_EMAIL || !process.env.APP_ORIGIN)
      throw new Error(
        "Usage: qa access-link PRIVATE_FILE. Configure QA_EMAIL, APP_ORIGIN and server credentials.",
      );
    const origin = new URL(process.env.APP_ORIGIN);
    if (
      origin.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(origin.hostname)
    )
      throw new Error("Access links require HTTPS outside local development.");
    const db = client(true);
    const profile = await db
      .from("profiles")
      .select("id")
      .eq("email", process.env.QA_EMAIL)
      .single();
    if (profile.error) throw profile.error;
    const account = await db.auth.admin.getUserById(profile.data.id);
    if (account.error) throw account.error;
    const type = account.data.user.email_confirmed_at ? "recovery" : "invite";
    const { data, error } = await db.auth.admin.generateLink({
      type,
      email: process.env.QA_EMAIL,
    });
    if (error) throw error;
    await writeFile(
      project,
      `${origin.origin}/?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${type}\n`,
      { mode: 0o600 },
    );
    await chmod(project, 0o600);
    console.log(
      "Individual access link written privately. Deliver only to its intended account owner.",
    );
  } else if (command === "restore") {
    if (arg !== "--confirm-empty")
      throw new Error(
        "Usage: qa restore backup.zip --confirm-empty. Set QA_EMAIL to the restored administrator.",
      );
    console.log(
      JSON.stringify(
        await restore(client(true), project, process.env.QA_EMAIL),
      ),
    );
  } else {
    const db = await actor();
    if (command === "projects") {
      const { data, error } = await db.from("projects").select("*");
      if (error) throw error;
      console.log(JSON.stringify(data, null, 2));
    } else if (command === "cases" || command === "failures") {
      const all = [];
      for (let offset = 0; ; offset += 500) {
        let q = db
          .from(command === "cases" ? "test_cases" : "executions")
          .select("*")
          .eq("project_id", project)
          .order("id")
          .range(offset, offset + 499);
        if (command === "failures") q = q.eq("verdict", "failed");
        const { data, error } = await q;
        if (error) throw error;
        all.push(...data);
        if (data.length < 500) break;
      }
      console.log(JSON.stringify(all, null, 2));
    } else if (command === "import") {
      const cases = JSON.parse(
        await readFile(arg || "data/erp-cases.json", "utf8"),
      );
      for (const c of cases) {
        const { data, error } = await db
          .from("test_cases")
          .select("id,version,body")
          .eq("project_id", project)
          .eq("code", c.code)
          .maybeSingle();
        if (error) throw error;
        if (data && isDeepStrictEqual(data.body, c.body)) continue;
        await call(db, "save_case", {
          p_project: project,
          p_code: c.code,
          p_body: c.body,
          p_id: data?.id || null,
          p_version: data?.version || null,
        });
      }
      console.log(`${cases.length} cases processed.`);
    } else if (command === "backup") {
      await backup(db, project, arg);
      console.log("Backup saved with private file permissions.");
    } else
      throw new Error(
        "Commands: bootstrap [name], projects, cases PROJECT, failures PROJECT, import PROJECT [file], backup PROJECT file.zip, restore file.zip --confirm-empty",
      );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
