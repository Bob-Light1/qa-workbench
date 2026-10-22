import { createClient } from "npm:@supabase/supabase-js@2";

// This function generates links; it never sends an invitation email.
Deno.serve(async (req: Request) => {
  const origin = Deno.env.get("APP_ORIGIN");
  const cors = {
    "Access-Control-Allow-Origin": origin || "http://localhost:5178",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  if (
    req.headers.get("origin") &&
    req.headers.get("origin") !== cors["Access-Control-Allow-Origin"]
  )
    return reply(403, { error: "Origine non autorisée." });
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")
    return reply(405, { error: "Méthode non autorisée." });
  try {
    if (!origin) throw new Error("APP_ORIGIN doit être configuré.");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const token = (req.headers.get("Authorization") || "").replace(
      /^Bearer /,
      "",
    );
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);
    if (authError || !user) return reply(401, { error: "Connexion requise." });
    const body = await req.json();
    const { data: membership } = await admin
      .from("memberships")
      .select("*")
      .eq("project_id", body.project_id)
      .eq("user_id", user.id)
      .eq("active", true)
      .single();
    if (membership?.role !== "admin")
      return reply(403, { error: "Droits administrateur requis." });
    if (
      !["invite", "recovery"].includes(body.action) ||
      typeof body.email !== "string" ||
      !body.email.includes("@")
    )
      return reply(400, { error: "Demande invalide." });
    const email = body.email.trim().toLowerCase();
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    let link: string | null = null;
    let target = existing?.id;
    const actor = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      },
    );
    if (body.action === "recovery") {
      if (!target) return reply(404, { error: "Compte introuvable." });
      const { data: operator } = await actor.rpc("is_operator");
      if (!operator && target !== user.id)
        return reply(403, {
          error:
            "Seul le responsable de l’installation peut réinitialiser un autre compte.",
        });
      const { data: m } = await admin
        .from("memberships")
        .select("user_id")
        .eq("project_id", body.project_id)
        .eq("user_id", target)
        .eq("active", true)
        .maybeSingle();
      if (!m) return reply(403, { error: "Compte non membre de ce projet." });
      const account = await admin.auth.admin.getUserById(target);
      if (account.error) throw account.error;
      const type = account.data.user.email_confirmed_at ? "recovery" : "invite";
      const { data, error } = await admin.auth.admin.generateLink({
        type,
        email,
      });
      if (error) throw error;
      link = `${origin}/?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${type}`;
    } else {
      if (!["admin", "editor", "tester"].includes(body.role))
        return reply(400, { error: "Rôle invalide." });
      if (!target) {
        const { data, error } = await admin.auth.admin.generateLink({
          type: "invite",
          email,
        });
        if (error) throw error;
        target = data.user.id;
        link = `${origin}/?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=invite`;
      }
      const { error } = await actor.rpc("change_member", {
        p_project: body.project_id,
        p_user: target,
        p_role: body.role,
        p_active: true,
      });
      if (error) throw error;
    }
    return reply(200, { link, user_id: target });
  } catch (error) {
    console.error("Access operation failed");
    return reply(400, {
      error:
        error instanceof Error
          ? error.message
          : "Impossible de préparer cet accès.",
    });
  }
});
