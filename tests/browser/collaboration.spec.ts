import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
const file = process.env.QA_BROWSER_ACCOUNTS || ".env.browser";
const accounts = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

test("bulk assignments reject stale and failed requests, persist together and respect reader roles", async ({
  browser,
}) => {
  test.skip(
    !accounts.items || !accounts.editorEmail,
    "Requires isolated collaboration API fixtures.",
  );
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const [owner, editor, tester] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  const campaigns = async (page: Page) => {
    await page.getByRole("button", { name: "Campagnes", exact: true }).click();
    await page.getByRole("button", { name: /^Bulk collaboration/ }).click();
  };
  const login = async (page: Page, email: string) => {
    await page.goto("/");
    await page.getByLabel("Adresse e-mail", { exact: true }).fill(email);
    await page
      .getByLabel("Mot de passe", { exact: true })
      .fill(accounts.password);
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: /La qualité se construit/ }),
    ).toBeVisible();
    await page
      .getByLabel("Projet", { exact: true })
      .selectOption(accounts.project_id);
    await campaigns(page);
  };
  const [first, second] = accounts.items;
  const assignment = (page: Page, code: string) =>
    page.getByLabel(`Affectation ${code}`, { exact: true });
  const toolbar = (page: Page) =>
    page.getByRole("region", { name: "Affectation en lot" });
  const apply = (page: Page) =>
    page.getByRole("button", { name: "Appliquer l’affectation", exact: true });
  const refresh = async (page: Page) => {
    await page.getByRole("button", { name: "Actualiser", exact: true }).click();
    await expect(assignment(page, first.code)).toBeVisible();
  };
  await login(owner, accounts.email);
  await login(editor, accounts.editorEmail);
  await expect(apply(owner)).toBeDisabled();
  await owner.getByLabel(`Sélectionner ${first.code}`, { exact: true }).check();
  await owner
    .getByLabel(`Sélectionner ${second.code}`, { exact: true })
    .check();
  await owner
    .getByLabel("Affecter la sélection à", { exact: true })
    .selectOption({ label: accounts.editorEmail });
  const saved = editor.waitForResponse(
    (response) =>
      response.url().endsWith("/rpc/assign_item") &&
      response.request().method() === "POST",
  );
  await assignment(editor, first.code).selectOption({ label: accounts.email });
  expect((await saved).ok()).toBe(true);
  await expect(
    assignment(editor, first.code).locator("option:checked"),
  ).toHaveText(accounts.email);
  // Wait for the actual assignment response and reloaded value before submitting
  // the stale batch from the other browser context.
  await expect(
    editor.getByRole("button", { name: "Actualiser", exact: true }),
  ).toBeEnabled();
  await apply(owner).click();
  await expect(owner.getByRole("alert")).toContainText("modifiée ailleurs");
  await expect(toolbar(owner)).toContainText("2 scénario(s) sélectionné(s)");
  await expect(
    owner.getByText("2 scénario(s) affecté(s).", { exact: true }),
  ).toHaveCount(0);
  await refresh(owner);
  await expect(toolbar(owner)).toContainText("0 scénario(s) sélectionné(s)");
  await expect(
    assignment(owner, first.code).locator("option:checked"),
  ).toHaveText(accounts.email);
  await expect(
    assignment(owner, second.code).locator("option:checked"),
  ).toHaveText(accounts.testerEmail);
  await owner.getByLabel(`Sélectionner ${first.code}`, { exact: true }).check();
  await owner
    .getByLabel(`Sélectionner ${second.code}`, { exact: true })
    .check();
  await owner
    .getByLabel("Affecter la sélection à", { exact: true })
    .selectOption({ label: accounts.editorEmail });
  await owner.route("**/rest/v1/rpc/assign_items", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "Synthetic bulk failure" }),
    }),
  );
  await apply(owner).click();
  await expect(owner.getByRole("alert")).toContainText(
    "Synthetic bulk failure",
  );
  await expect(toolbar(owner)).toContainText("2 scénario(s) sélectionné(s)");
  await expect(
    assignment(owner, first.code).locator("option:checked"),
  ).toHaveText(accounts.email);
  await expect(
    owner.getByText("2 scénario(s) affecté(s).", { exact: true }),
  ).toHaveCount(0);
  await owner.unroute("**/rest/v1/rpc/assign_items");
  await apply(owner).click();
  await expect(owner.getByRole("status")).toContainText(
    "2 scénario(s) affecté(s).",
  );
  await expect(toolbar(owner)).toContainText("0 scénario(s) sélectionné(s)");
  await refresh(editor);
  for (const item of [first, second])
    await expect(
      assignment(editor, item.code).locator("option:checked"),
    ).toHaveText(accounts.editorEmail);
  await owner
    .getByRole("button", { name: "Tout sélectionner", exact: true })
    .click();
  await owner
    .getByLabel("Affecter la sélection à", { exact: true })
    .selectOption("");
  await apply(owner).click();
  await expect(owner.getByRole("status")).toContainText(
    "3 scénario(s) affecté(s).",
  );
  for (const item of accounts.items)
    await expect(assignment(owner, item.code)).toHaveValue("");
  await expect(
    owner.getByText("40 résultat(s)", { exact: true }),
  ).toBeVisible();
  await owner
    .getByRole("button", { name: "Tout sélectionner", exact: true })
    .click();
  await owner.getByRole("button", { name: /^Other campaign/ }).click();
  await expect(toolbar(owner)).toContainText("0 scénario(s) sélectionné(s)");
  await owner.getByRole("button", { name: /^Bulk collaboration/ }).click();
  await expect(toolbar(owner)).toContainText("0 scénario(s) sélectionné(s)");
  await owner
    .getByRole("button", { name: "Tout sélectionner", exact: true })
    .click();
  await owner.screenshot({
    path: "test-results/collaboration-desktop.png",
    fullPage: true,
  });
  await owner.setViewportSize({ width: 390, height: 844 });
  expect(
    await owner.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await owner.screenshot({
    path: "test-results/collaboration-mobile.png",
    fullPage: true,
  });
  await login(tester, accounts.testerEmail);
  await expect(toolbar(tester)).toHaveCount(0);
  await expect(tester.getByRole("checkbox")).toHaveCount(0);
  await expect(
    tester.getByLabel(`Affectation ${first.code}`, { exact: true }),
  ).toHaveCount(0);
  await expect(
    tester.getByText("40 résultat(s)", { exact: true }),
  ).toBeVisible();
  await Promise.all(contexts.map((c) => c.close()));
});
