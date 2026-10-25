import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

// A running container is insufficient: the function must load its dependencies,
// answer the browser's preflight and reject a request without an Auth session.
export async function waitForAccess({
  url,
  origin,
  timeoutMs = 90000,
  pollMs = 1000,
  requestTimeoutMs = 3000,
  request = fetch,
}) {
  const endpoint = new URL("/functions/v1/manage-access", url);
  if (!origin || !["http:", "https:"].includes(endpoint.protocol))
    throw new Error(
      "Configure SUPABASE_URL and APP_ORIGIN before checking access.",
    );
  const deadline = performance.now() + timeoutMs;
  let last = "no response";
  while (performance.now() < deadline) {
    try {
      let ready = true;
      for (const [method, expected] of [
        ["OPTIONS", 204],
        ["POST", 401],
      ]) {
        const remaining = deadline - performance.now();
        if (remaining <= 0) throw new Error("deadline reached");
        const response = await request(endpoint, {
          method,
          headers: { Origin: origin, "Content-Type": "application/json" },
          ...(method === "POST" ? { body: "{}" } : {}),
          signal: AbortSignal.timeout(
            Math.max(1, Math.ceil(Math.min(requestTimeoutMs, remaining))),
          ),
          redirect: "error",
        });
        last = `${method} HTTP ${response.status}`;
        const cors = response.headers.get("Access-Control-Allow-Origin");
        await response.body?.cancel();
        // The local Supabase gateway replaces the function's origin with '*'.
        // Both permit the app's bearer-token requests (no browser cookies).
        const allowsOrigin = cors === origin || cors === "*";
        if (response.status !== expected || !allowsOrigin) {
          if (!allowsOrigin) last += " (unexpected CORS origin)";
          ready = false;
          break;
        }
      }
      if (ready && performance.now() < deadline) return;
    } catch {
      // Do not print bodies, URLs or provider errors that may contain secrets.
      last = "request failed or timed out";
    }
    const remaining = deadline - performance.now();
    if (remaining > 0) await delay(Math.min(pollMs, remaining));
  }
  throw new Error(
    `Access function unavailable after ${timeoutMs} ms: ${last}. Check the owned function runtime; do not reset the database.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await waitForAccess({
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      origin: process.env.APP_ORIGIN,
    });
    console.log(
      "Access function ready: browser preflight 204 and anonymous POST 401.",
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
