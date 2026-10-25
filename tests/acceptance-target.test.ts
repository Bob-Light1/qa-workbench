import { describe, it, expect } from "vitest";
import { acceptanceTarget } from "../scripts/acceptance-target.mjs";

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
});
