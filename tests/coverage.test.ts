import { describe, expect, it } from "vitest";
import { caseCoverage } from "../src/coverage";
import type { Execution, Item, TestCase, Verdict } from "../src/domain";
import seed from "../data/erp-cases.json";
import extension from "../data/erp-cases-phase2.json";

const c = (id = "a", version = 1): TestCase => ({
  id,
  project_id: "project",
  code: `CASE-${id}`,
  body: { ...seed[0].body },
  version,
  archived: false,
});
const item = (id: string, testCase = c(), campaign = "campaign"): Item => ({
  id,
  campaign_id: campaign,
  case_id: testCase.id,
  case_version: testCase.version,
  snapshot: { ...testCase.body, code: testCase.code },
  assignee_id: null,
  version: 1,
});
const result = (
  id: string,
  item_id: string,
  verdict: Verdict | null,
  date = "2026-10-23T10:00:00Z",
): Execution => ({
  id,
  item_id,
  verdict,
  author_id: "actor",
  notes: "Synthetic observation",
  duration_minutes: 1,
  version: 1,
  submitted_at: verdict ? date : null,
  created_at: date,
});
const entries = (...args: Parameters<typeof caseCoverage>) =>
  caseCoverage(...args).flatMap((g) => g.entries);

describe("Roadmap coverage", () => {
  it("never promotes a passing old snapshot to coverage of revised instructions", () => {
    const row = entries(
      [c("a", 2)],
      [item("old")],
      [result("pass", "old", "passed")],
    )[0];
    expect(row.state).toBe("stale");
    expect(row.item?.case_version).toBe(1);
    expect(row.execution?.verdict).toBe("passed");
  });
  it("uses the latest submitted result of the current revision, ignoring newer drafts and old-revision retests", () => {
    const items = [item("current", c("a", 2)), item("old")];
    const executions = [
      result("fail", "current", "failed"),
      result("pass", "current", "passed", "2026-10-23T11:00:00+01:00"),
      result("draft", "current", null, "2026-10-25T12:00:00Z"),
      result("old-pass", "old", "passed", "2026-10-26T12:00:00Z"),
      result("latest-fail", "current", "failed", "2026-10-24T12:00:00Z"),
    ];
    expect(entries([c("a", 2)], items, executions)[0]).toMatchObject({
      state: "result",
      execution: { id: "latest-fail", verdict: "failed" },
    });
    expect(executions.map((e) => e.id)).toEqual([
      "fail",
      "pass",
      "draft",
      "old-pass",
      "latest-fail",
    ]);
  });
  it("scopes results to a campaign and counts a case once across repeated campaigns", () => {
    const items = [item("one", c(), "one"), item("two", c(), "two")];
    const executions = [
      result("fail", "one", "failed"),
      result("pass", "two", "passed", "2026-10-24T10:00:00Z"),
    ];
    expect(entries([c()], items, executions)).toHaveLength(1);
    expect(entries([c()], items, executions, "one")[0].execution?.verdict).toBe(
      "failed",
    );
    expect(entries([c()], items, executions, "two")[0].execution?.verdict).toBe(
      "passed",
    );
    expect(entries([c()], items, executions, "missing")[0].state).toBe(
      "unplanned",
    );
  });
  it("keeps pending, unplanned, blocked and skipped distinct and excludes archived cases", () => {
    const cases = [
      c("pending"),
      c("unplanned"),
      c("blocked"),
      c("skipped"),
      { ...c("archived"), archived: true },
    ];
    const items = [
      item("pending", cases[0]),
      item("blocked", cases[2]),
      item("skipped", cases[3]),
    ];
    const rows = entries(cases, items, [
      result("draft", "pending", null),
      result("blocked", "blocked", "blocked"),
      result("skip", "skipped", "skipped"),
    ]);
    expect(
      rows.map((r) => [r.testCase.id, r.state, r.execution?.verdict]),
    ).toEqual([
      ["blocked", "result", "blocked"],
      ["pending", "pending", undefined],
      ["skipped", "result", "skipped"],
      ["unplanned", "unplanned", undefined],
    ]);
    expect(
      entries([c("a", 2)], [item("old")], [result("draft", "old", null)])[0]
        .state,
    ).toBe("unplanned");
  });
  it("groups current references without rewriting historical snapshots and exposes missing references", () => {
    const revised = {
      ...c("a", 2),
      body: { ...c().body, roadmap: "Phase 1-B, ligne 2" },
    };
    const unlinked = { ...c("b"), body: { ...c().body, roadmap: " " } };
    const groups = caseCoverage(
      [revised, unlinked],
      [item("old")],
      [result("pass", "old", "passed")],
    );
    expect(groups.map((g) => g.reference)).toEqual(["Phase 1-B, ligne 2", ""]);
    expect(groups[0].entries[0].item?.snapshot.roadmap).toBe(
      seed[0].body.roadmap,
    );
    expect(entries([revised], [], [], "", "ligne 2")).toHaveLength(1);
    expect(entries([revised], [], [], "", "B2")).toHaveLength(1);
    expect(entries([revised], [], [], "", "unknown")).toHaveLength(0);
  });
  it("compares instants rather than timestamp strings with different UTC offsets", () => {
    const row = entries(
      [c()],
      [item("one")],
      [
        result("earlier", "one", "passed", "2026-10-23T12:00:00+02:00"),
        result("later", "one", "failed", "2026-10-23T10:30:00Z"),
      ],
    )[0];
    expect(row.execution?.id).toBe("later");
  });
});

describe("Incremental ERP catalog", () => {
  it("preserves the ten pilot IDs and adds three distinct roadmap-linked access checks", () => {
    expect(seed.map((v) => v.code)).toEqual(
      Array.from(
        { length: 10 },
        (_, i) => `ERP-${String(i + 1).padStart(3, "0")}`,
      ),
    );
    expect(extension.map((v) => v.code)).toEqual([
      "ERP-011",
      "ERP-012",
      "ERP-013",
    ]);
    expect(new Set([...seed, ...extension].map((v) => v.code)).size).toBe(13);
    for (const { body } of extension) {
      expect(body.roadmap).not.toBe("");
      expect(body.source).not.toBe("");
      expect(body.steps.every((s) => s.action && s.expected)).toBe(true);
    }
  });
});
