import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
// Read owned local credentials without logging them. Never use this against a hosted project.
const text = execFileSync("npx", ["supabase", "status", "-o", "env"], {
  encoding: "utf8",
});
const values = Object.fromEntries(
  text
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
if (!values.API_URL?.includes("127.0.0.1:55321"))
  throw new Error("Expected the owned local QA Workbench stack.");
const content = `VITE_SUPABASE_URL=${values.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${values.ANON_KEY}\nSUPABASE_URL=${values.API_URL}\nSUPABASE_PUBLISHABLE_KEY=${values.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${values.SERVICE_ROLE_KEY}\nAPP_ORIGIN=http://localhost:5178\n`;
writeFileSync(".env.local", content, { mode: 0o600 });
writeFileSync(".env.functions.local", "APP_ORIGIN=http://localhost:5178\n", {
  mode: 0o600,
});
console.log("Local-only environment files written (credentials hidden).");
