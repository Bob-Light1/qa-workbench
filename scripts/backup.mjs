import { readFile, writeFile } from "node:fs/promises";
import { encodeBackup, decodeBackup, tableNames } from "../src/backup.ts";
import { call } from "./client.mjs";
export async function backup(db, project, filename) {
  const tables = await call(db, "export_bundle", { p_project: project });
  const files = {};
  for (const a of tables.attachments) {
    if (a.state !== "ready")
      throw new Error("Finish or cancel pending uploads before backup.");
    const { data, error } = await db.storage
      .from("evidence")
      .download(a.object_path);
    if (error) throw error;
    files[`files/${a.id}`] = new Uint8Array(await data.arrayBuffer());
  }
  const bytes = await encodeBackup(
    {
      format: "qa-workbench",
      version: 2,
      project_id: project,
      exported_at: new Date().toISOString(),
      tables,
    },
    files,
  );
  await writeFile(filename, bytes, { mode: 0o600 });
  return tables;
}
export async function restore(admin, filename, ownerEmail) {
  const { bundle, files } = await decodeBackup(
    new Uint8Array(await readFile(filename)),
  );
  const { data: existing, error } = await admin
    .from("projects")
    .select("id")
    .limit(1);
  if (error) throw error;
  if (existing.length) throw new Error("RESTORE_REQUIRES_EMPTY_INSTALLATION");
  const map = new Map(),
    known = (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data
      .users;
  for (const profile of bundle.tables.profiles) {
    let user = known.find((u) => u.email === profile.email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: profile.email,
        password: crypto.randomUUID() + "aA1!",
        email_confirm: false,
      });
      if (error) throw error;
      user = data.user;
    }
    map.set(profile.id, user.id);
  }
  const owner = bundle.tables.profiles.find((p) => p.email === ownerEmail);
  if (!owner) throw new Error("OWNER_NOT_IN_BACKUP");
  for (const table of tableNames)
    for (const row of bundle.tables[table])
      for (const field of ["user_id", "author_id", "created_by", "assignee_id"])
        if (map.has(row[field])) row[field] = map.get(row[field]);
  // Upload before committing application rows. On failure, no application history is partially restored.
  for (const a of bundle.tables.attachments) {
    const content = files[`files/${a.id}`];
    const { error } = await admin.storage
      .from("evidence")
      .upload(a.object_path, content, {
        contentType: a.mime_type,
        upsert: true,
      });
    if (error) throw error;
  }
  await call(admin, "restore_bundle", {
    p_tables: bundle.tables,
    p_owner: map.get(owner.id),
  });
  const auth = admin;
  for (const table of tableNames.filter((t) => t !== "profiles")) {
    const { count, error } = await auth
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    if (count !== bundle.tables[table].length)
      throw new Error(`RESTORE_COUNT_MISMATCH:${table}`);
  }
  for (const a of bundle.tables.attachments) {
    const { data, error } = await admin.storage
      .from("evidence")
      .download(a.object_path);
    if (error) throw error;
    if (
      Buffer.compare(
        Buffer.from(await data.arrayBuffer()),
        Buffer.from(files[`files/${a.id}`]),
      )
    )
      throw new Error("RESTORE_FILE_MISMATCH");
  }
  return {
    project_id: bundle.project_id,
    counts: Object.fromEntries(
      tableNames.map((t) => [t, bundle.tables[t].length]),
    ),
  };
}
