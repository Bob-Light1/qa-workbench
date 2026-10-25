import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { decodeBackup } from "../../src/backup";
const file = process.env.QA_BROWSER_ACCOUNTS || ".env.browser";
const accounts = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

test("case reviews preserve revision history, stale opinions and reader permissions", async ({
  browser,
}) => {
  test.skip(
    !accounts.editorEmail || !accounts.case_id,
    "Requires isolated review API fixtures.",
  );
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const [owner, editor, tester] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  const catalog = async (page: Page) => {
    await page
      .getByRole("button", { name: "Fiches de test", exact: true })
      .click();
    await page.getByLabel("Rechercher", { exact: true }).fill("REV-001");
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
    await catalog(page);
  };
  const row = (page: Page) =>
    page.getByRole("row").filter({ hasText: "REV-001" });
  const dialog = (page: Page) => page.getByRole("dialog");
  const close = async (page: Page) =>
    page.getByRole("button", { name: "Fermer", exact: true }).click();
  await login(owner, accounts.email);
  await login(editor, accounts.editorEmail);
  await row(owner).getByRole("button", { name: "Relire", exact: true }).click();
  await row(editor)
    .getByRole("button", { name: "Relire", exact: true })
    .click();
  await expect(dialog(owner)).toContainText("À relire après modification");
  await owner
    .getByLabel("Commentaire de revue")
    .fill("Current revision approved");
  await owner
    .getByRole("button", { name: "Enregistrer la revue", exact: true })
    .click();
  await expect(dialog(owner)).toHaveCount(0);
  await expect(
    row(owner).getByText("Approuvée", { exact: true }),
  ).toBeVisible();
  await editor
    .getByLabel("Commentaire de revue")
    .fill("Stale opinion must not replace approval");
  await editor
    .getByRole("button", { name: "Enregistrer la revue", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText("modifiée ailleurs");
  await expect(dialog(editor)).toBeVisible();
  await close(editor);
  await editor.reload();
  await catalog(editor);
  await row(editor)
    .getByRole("button", { name: "Relire", exact: true })
    .click();
  await editor.getByLabel("Avis de revue").selectOption("changes_requested");
  await editor
    .getByLabel("Commentaire de revue")
    .fill("Clarify synthetic expected outcome");
  await editor
    .getByRole("button", { name: "Enregistrer la revue", exact: true })
    .click();
  await expect(dialog(editor)).toHaveCount(0);
  await expect(
    row(editor).getByText("À corriger", { exact: true }),
  ).toBeVisible();
  await owner.reload();
  await catalog(owner);
  await row(owner)
    .getByRole("button", { name: "Modifier", exact: true })
    .click();
  await owner
    .getByLabel("Titre", { exact: true })
    .fill("Clarified synthetic review instructions");
  await owner
    .getByRole("button", { name: "Enregistrer la fiche", exact: true })
    .click();
  await expect(dialog(owner)).toHaveCount(0);
  await expect(row(owner)).toContainText("À relire après modification");
  await row(owner).getByRole("button", { name: "Relire", exact: true }).click();
  await expect(dialog(owner)).toContainText(
    "Clarify synthetic expected outcome",
  );
  await owner.route("**/rest/v1/rpc/review_case", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "Synthetic review failure" }),
    }),
  );
  await owner
    .getByRole("button", { name: "Enregistrer la revue", exact: true })
    .click();
  await expect(owner.getByRole("alert")).toContainText(
    "Synthetic review failure",
  );
  await expect(dialog(owner)).toBeVisible();
  await expect(row(owner)).toContainText("À relire après modification");
  await owner.unroute("**/rest/v1/rpc/review_case");
  await owner.getByLabel("Commentaire de revue").fill("Clarification verified");
  await owner
    .getByRole("button", { name: "Enregistrer la revue", exact: true })
    .click();
  await expect(dialog(owner)).toHaveCount(0);
  await expect(
    row(owner).getByText("Approuvée", { exact: true }),
  ).toBeVisible();
  await row(owner).getByRole("button", { name: "Relire", exact: true }).click();
  await expect(dialog(owner)).toContainText("v5 · Approuvée");
  await expect(dialog(owner)).toContainText(accounts.editorEmail);
  await expect(dialog(owner)).toContainText("v1 · À corriger");
  await owner.screenshot({
    path: "test-results/reviews-desktop.png",
    fullPage: true,
  });
  await close(owner);
  await owner.getByRole("button", { name: "Équipe", exact: true }).click();
  const [download] = await Promise.all([
    owner.waitForEvent("download"),
    owner
      .getByRole("button", {
        name: "Exporter le projet et les captures",
        exact: true,
      })
      .click(),
  ]);
  const archive = await download.path();
  const { bundle } = await decodeBackup(
    new Uint8Array(await readFile(archive!)),
  );
  expect(bundle.version).toBe(2);
  expect(bundle.tables.case_reviews).toHaveLength(6);
  expect(
    bundle.tables.case_reviews.some(
      (r) => r.case_version === 5 && r.notes === "Clarification verified",
    ),
  ).toBe(true);
  await login(tester, accounts.testerEmail);
  await expect(
    row(tester).getByText("Approuvée", { exact: true }),
  ).toBeVisible();
  await row(tester)
    .getByRole("button", { name: "Voir les revues", exact: true })
    .click();
  await expect(dialog(tester)).toContainText("Clarification verified");
  await expect(
    dialog(tester).getByRole("button", {
      name: "Enregistrer la revue",
      exact: true,
    }),
  ).toHaveCount(0);
  await tester.setViewportSize({ width: 390, height: 844 });
  expect(
    await tester.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await tester.screenshot({
    path: "test-results/reviews-mobile.png",
    fullPage: true,
  });
  await Promise.all(contexts.map((c) => c.close()));
});
