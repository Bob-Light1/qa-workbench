import { describe, it, expect } from "vitest";
import {
  validateImage,
  parseSteps,
  friendlyError,
  validateNewPassword,
} from "../src/domain";
import { encodeBackup, decodeBackup } from "../src/backup";
import { unzipSync, zipSync } from "fflate";
describe("Evidence validation", () => {
  it("rejects SVG and oversized screenshots", () => {
    expect(() => validateImage({ type: "image/svg+xml", size: 100 })).toThrow();
    expect(() => validateImage({ type: "image/png", size: 5242881 })).toThrow();
    expect(() => validateImage({ type: "image/png", size: 0 })).toThrow();
  });
  it("accepts an image at the documented size boundary", () =>
    expect(() =>
      validateImage({ type: "image/webp", size: 5242880 }),
    ).not.toThrow());
});
describe("Case authoring", () => {
  it("rejects weak activation passwords before a one-use link is consumed", () => {
    expect(() => validateNewPassword("A1!" + "a".repeat(70))).toThrow("72");
    expect(() => validateNewPassword("Aa1!" + "é".repeat(35))).toThrow("72");
    for (const value of [
      "shortA1!",
      "long-password-123",
      "LongPassword123",
      "LongPassword!!!",
      "LONGPASSWORD12!",
    ])
      expect(() => validateNewPassword(value)).toThrow();
    expect(() => validateNewPassword("LongPassword123!")).not.toThrow();
  });
  it("requires both the action and expected outcome", () => {
    expect(() => parseSteps("Open page")).toThrow();
    expect(() => parseSteps("Open => ")).toThrow();
    expect(parseSteps("Open page => Page appears")).toEqual([
      { action: "Open page", expected: "Page appears" },
    ]);
  });
  it("explains concurrent edits and failed uploads", () => {
    expect(friendlyError({ message: "VERSION_CONFLICT" })).toContain(
      "modifiée ailleurs",
    );
    expect(friendlyError(new Error("UPLOAD_PENDING"))).toContain("attente");
  });
});
describe("Portable backup", () => {
  const tables = Object.fromEntries(
    [
      "projects",
      "memberships",
      "profiles",
      "test_cases",
      "case_versions",
      "campaigns",
      "campaign_items",
      "executions",
      "issues",
      "issue_events",
      "attachments",
    ].map((k) => [k, [] as Record<string, unknown>[]]),
  );
  tables.projects = [{ id: "project-a" }];
  tables.attachments = [{ id: "capture-a", state: "ready", bytes: 3 }];
  const bundle = {
    format: "qa-workbench" as const,
    version: 1 as const,
    exported_at: "2026-10-22",
    project_id: "project-a",
    tables,
  };
  it("preserves data and evidence bytes", async () => {
    const bytes = await encodeBackup(bundle, {
      "files/capture-a": new Uint8Array([1, 2, 3]),
    });
    const read = await decodeBackup(bytes);
    expect(read.bundle.tables).toEqual(tables);
    expect([...read.files["files/capture-a"]]).toEqual([1, 2, 3]);
  });
  it("rejects corruption of an evidence file", async () => {
    const files = unzipSync(
      await encodeBackup(bundle, {
        "files/capture-a": new Uint8Array([1, 2, 3]),
      }),
    );
    files["files/capture-a"] = new Uint8Array([3, 2, 1]);
    await expect(decodeBackup(zipSync(files))).rejects.toThrow(
      "BACKUP_FILE_MISMATCH",
    );
  });
  it("rejects an unexpected archive path", async () => {
    const files = unzipSync(
      await encodeBackup(bundle, {
        "files/capture-a": new Uint8Array([1, 2, 3]),
      }),
    );
    files["../outside"] = new Uint8Array([1]);
    await expect(decodeBackup(zipSync(files))).rejects.toThrow(
      "UNEXPECTED_BACKUP_FILE",
    );
  });
});
