import { createClient } from "@supabase/supabase-js";
import { encodeBackup } from "./backup";
import type { Attachment } from "./domain";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export const db = createClient(
  import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:55321",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "not-configured",
);
export async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data as T;
}
export async function rows<T>(table: string, project?: string): Promise<T[]> {
  const all: T[] = [];
  for (let start = 0; ; start += 500) {
    let q = db
      .from(table)
      .select("*")
      .range(start, start + 499);
    if (project) q = q.eq("project_id", project);
    const { data, error } = await q.order(
      table === "profiles" ? "id" : table === "memberships" ? "user_id" : "id",
    );
    if (error) throw error;
    all.push(...(data as T[]));
    if (data.length < 500) return all;
  }
}
export async function uploadCapture(
  execution: string,
  file: File,
): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid =
    file.type === "image/png"
      ? bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71
      : file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
          new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (!valid)
    throw new Error(
      "Le contenu du fichier ne correspond pas au format de l’image.",
    );
  const a = await rpc<Attachment>("reserve_attachment", {
    p_execution: execution,
    p_id: crypto.randomUUID(),
    p_name: file.name,
    p_mime: file.type,
    p_bytes: file.size,
  });
  const { error } = await db.storage
    .from("evidence")
    .upload(a.object_path, file, { contentType: file.type, upsert: false });
  if (error)
    throw new Error(
      `L’envoi a échoué. Annulez la pièce jointe en attente avant de recommencer. ${error.message}`,
    );
  await rpc("finish_attachment", { p_id: a.id });
}
export async function openCapture(a: Attachment) {
  const { data, error } = await db.storage
    .from("evidence")
    .createSignedUrl(a.object_path, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
export const backupTables = [
  "projects",
  "memberships",
  "profiles",
  "test_cases",
  "case_versions",
  "case_reviews",
  "campaigns",
  "campaign_items",
  "executions",
  "issues",
  "issue_events",
  "attachments",
];
export async function exportProject(project: string) {
  const tables = await rpc<Record<string, unknown[]>>("export_bundle", {
    p_project: project,
  });
  const files: Record<string, Uint8Array> = {};
  for (const a of tables.attachments as Attachment[]) {
    if (a.state !== "ready")
      throw new Error(
        "Terminez ou annulez les captures en attente avant l’export.",
      );
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
      exported_at: new Date().toISOString(),
      project_id: project,
      tables: tables as Record<string, Record<string, unknown>[]>,
    },
    files,
  );
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qa-workbench-${project}-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
