import type { Execution, Item, TestCase } from "./domain";

export type CoverageEntry = {
  testCase: TestCase;
  state: "result" | "stale" | "pending" | "unplanned";
  execution?: Execution;
  item?: Item;
};
export type CoverageGroup = { reference: string; entries: CoverageEntry[] };

// Count each active case once. A result only covers the exact catalog revision.
export function caseCoverage(
  cases: TestCase[],
  items: Item[],
  executions: Execution[],
  campaign = "",
  search = "",
): CoverageGroup[] {
  const scopedItems = items.filter(
    (i) => !campaign || i.campaign_id === campaign,
  );
  const byId = new Map(scopedItems.map((i) => [i.id, i]));
  const byCase = new Map<string, Item[]>();
  for (const item of scopedItems) {
    const list = byCase.get(item.case_id) || [];
    list.push(item);
    byCase.set(item.case_id, list);
  }
  const latestByVersion = new Map<
    string,
    { item: Item; execution: Execution }
  >();
  const latestByCase = new Map<string, { item: Item; execution: Execution }>();
  for (const execution of executions
    .filter((e) => e.verdict && e.submitted_at)
    .sort(
      (a, b) =>
        Date.parse(b.submitted_at!) - Date.parse(a.submitted_at!) ||
        b.id.localeCompare(a.id),
    )) {
    const item = byId.get(execution.item_id);
    if (!item || !execution.verdict || !execution.submitted_at) continue;
    const key = `${item.case_id}:${item.case_version}`;
    if (!latestByVersion.has(key))
      latestByVersion.set(key, { item, execution });
    if (!latestByCase.has(item.case_id))
      latestByCase.set(item.case_id, { item, execution });
  }
  const groups = new Map<string, CoverageEntry[]>();
  const query = search.trim().toLocaleLowerCase("fr");
  for (const testCase of [...cases].sort((a, b) =>
    a.code.localeCompare(b.code),
  )) {
    if (testCase.archived) continue;
    const { body } = testCase;
    if (
      ![testCase.code, body.title, body.domain, body.roadmap, ...body.bricks]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(query)
    )
      continue;
    const result = latestByVersion.get(`${testCase.id}:${testCase.version}`);
    const older = latestByCase.get(testCase.id);
    const entry: CoverageEntry = result
      ? { testCase, state: "result", ...result }
      : older
        ? { testCase, state: "stale", ...older }
        : {
            testCase,
            state: byCase
              .get(testCase.id)
              ?.some((i) => i.case_version === testCase.version)
              ? "pending"
              : "unplanned",
          };
    const reference = body.roadmap.trim();
    const list = groups.get(reference) || [];
    list.push(entry);
    groups.set(reference, list);
  }
  return [...groups]
    .sort(([a], [b]) =>
      !a ? 1 : !b ? -1 : a.localeCompare(b, "fr", { numeric: true }),
    )
    .map(([reference, entries]) => ({ reference, entries }));
}
