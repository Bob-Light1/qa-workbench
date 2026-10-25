import { describe, it, expect } from "vitest";
import {
  latestCaseReview,
  caseReviewLabel,
  type CaseReview,
  type TestCase,
} from "../src/domain";

describe("Revision-bound review state", () => {
  const c = { id: "case", version: 2 } as TestCase;
  const old = {
    id: "old",
    case_id: "case",
    case_version: 1,
    review_number: 1,
    decision: "approved",
  } as CaseReview;
  const current = {
    ...old,
    id: "current",
    case_version: 2,
    review_number: 2,
    decision: "changes_requested",
  } as CaseReview;
  it("uses the ordered opinion for the exact revision and retains stale context", () => {
    expect(caseReviewLabel(c)).toBe("À relire");
    expect(caseReviewLabel(c, old)).toBe("À relire après modification");
    expect(
      latestCaseReview(
        [current, old, { ...current, case_id: "other", review_number: 99 }],
        c.id,
      ),
    ).toEqual(current);
    expect(caseReviewLabel(c, current)).toBe("À corriger");
    expect(caseReviewLabel({ ...c, version: 3 }, current)).toBe(
      "À relire après modification",
    );
  });
});
