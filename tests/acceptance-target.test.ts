import { describe, it, expect } from "vitest";
import { acceptanceTarget } from "../scripts/acceptance-target.mjs";
import { spawnSync } from "node:child_process";

const local = 'project_id = "qa-workbench-validation"';
const hosted = "https://xtgaepikylepriipuyps.supabase.co";
describe("Additive acceptance target guard", () => {
  it("allows only the named loopback stack without an explicit hosted flag", () => {
    expect(
      acceptanceTarget("http://127.0.0.1:55321", false, local).hosted,
    ).toBe(false);
    for (const [url, config] of [
      [hosted, local],
      ["http://127.0.0.1:54321", local],
      ["http://127.0.0.1:55321", 'project_id = "erp"'],
    ])
      expect(() => acceptanceTarget(url, false, config)).toThrow(
        "No fixtures created",
      );
  });
  it("requires an exact hosted URL and keeps hosted browser fixtures separate", () => {
    expect(acceptanceTarget(hosted, true, local)).toEqual({
      hosted: true,
      suffix: ".hosted",
      label: "Hosted",
    });
    for (const url of [
      "http://127.0.0.1:55321",
      "https://other.supabase.co",
      `${hosted}.example`,
      `${hosted}/`,
    ])
      expect(() => acceptanceTarget(url, true, local)).toThrow(
        "No fixtures created",
      );
  });
  it("refuses unsafe collaboration CLI targets and options before provisioning accounts", () => {
    for (const [args, url, message] of [
      [[], hosted, "No fixtures created"],
      [["--hosted"], "http://127.0.0.1:55321", "No fixtures created"],
      [["--hosted"], "https://other.supabase.co", "No fixtures created"],
      [["--hostedd"], hosted, "Usage:"],
      [["--hosted", "--hosted"], hosted, "Usage:"],
    ] as const) {
      const result = spawnSync(
        process.execPath,
        ["scripts/collaboration-check.mjs", ...args],
        {
          env: { ...process.env, SUPABASE_URL: url },
          encoding: "utf8",
          timeout: 10000,
        },
      );
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(message);
      expect(result.stdout).not.toContain("PASS");
    }
  });
});
