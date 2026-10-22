const origin = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!origin?.startsWith("https://") || !key)
  throw new Error(
    "Deployment requires a hosted Supabase URL and its publishable key in the environment.",
  );
let role;
try {
  role = JSON.parse(
    Buffer.from(key.split(".")[1], "base64url").toString(),
  ).role;
} catch {}
if (key.startsWith("sb_secret_") || role === "service_role")
  throw new Error("A server secret must never be included in the frontend.");
console.log("Frontend deployment configuration validated.");
