import { createClient } from "@supabase/supabase-js";
export function client(service = false) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = service
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      "Configure SUPABASE_URL and the appropriate server or publishable key.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function actor() {
  const db = client();
  if (process.env.QA_ACCESS_TOKEN) {
    const { error } = await db.auth.setSession({
      access_token: process.env.QA_ACCESS_TOKEN,
      refresh_token: process.env.QA_REFRESH_TOKEN || "",
    });
    if (error) throw error;
  } else {
    if (!process.env.QA_EMAIL || !process.env.QA_PASSWORD)
      throw new Error(
        "Provide QA_EMAIL and QA_PASSWORD through the environment.",
      );
    const { error } = await db.auth.signInWithPassword({
      email: process.env.QA_EMAIL,
      password: process.env.QA_PASSWORD,
    });
    if (error) throw error;
  }
  return db;
}
export async function call(db, name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}
