import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const accounts = JSON.parse(
  readFileSync(process.env.QA_BROWSER_ACCOUNTS || ".env.browser", "utf8"),
);

test("roadmap coverage preserves revision boundaries, filters and reader permissions", async ({
  browser,
}) => {
  test.skip(
    !accounts.current_campaign_id,
    "Requires the isolated local coverage API fixtures.",
  );
  const ownerContext = await browser.newContext();
  const testerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const tester = await testerContext.newPage();
  const login = async (page: typeof owner, email: string) => {
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
      .getByRole("button", { name: "Fiches de test", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Couverture roadmap", exact: true })
      .click();
  };
  const coverage = (page: typeof owner) =>
    page.getByRole("region", { name: "Couverture roadmap", exact: true });
  const row = (page: typeof owner) =>
    coverage(page).getByRole("row").filter({ hasText: "COV-001" });
  await login(owner, accounts.email);
  await expect(
    row(owner).getByText("À réexécuter", { exact: true }),
  ).toBeVisible();
  await expect(row(owner)).toContainText("Ancien résultat : Réussi · v1");
  await expect(row(owner)).toContainText("coverage-old");
  await expect(row(owner)).toContainText(
    "Référence exécutée : Coverage acceptance — previous",
  );
  await expect(
    coverage(owner).getByText("COV-ARCHIVED", { exact: false }),
  ).toHaveCount(0);
  await expect(
    coverage(owner).getByText("ERP-013", { exact: false }),
  ).toBeVisible();
  await expect(
    coverage(owner).getByRole("region", {
      name: "Sans référence roadmap",
      exact: true,
    }),
  ).toBeVisible();
  await owner
    .getByLabel("Campagne de référence")
    .selectOption(accounts.current_campaign_id);
  await expect(
    row(owner).getByText("À exécuter", { exact: true }),
  ).toBeVisible();
  await expect(row(owner)).not.toContainText("Réussi");
  await owner
    .getByLabel("Campagne de référence")
    .selectOption(accounts.pending_campaign_id);
  await expect(
    row(owner).getByText("Hors campagne", { exact: true }),
  ).toBeVisible();
  await owner.getByLabel("Campagne de référence").selectOption("");
  await owner
    .getByLabel("Rechercher", { exact: true })
    .fill("Coverage acceptance — current");
  await expect(
    coverage(owner)
      .getByRole("row")
      .filter({ has: owner.locator("td") }),
  ).toHaveCount(1);
  await owner.screenshot({
    path: "test-results/coverage-desktop.png",
    fullPage: true,
  });
  await owner
    .getByLabel("Rechercher", { exact: true })
    .fill("no-such-roadmap-reference");
  await expect(
    coverage(owner).getByText(
      "Aucune fiche active ne correspond à cette recherche.",
    ),
  ).toBeVisible();
  await owner.getByLabel("Rechercher", { exact: true }).fill("COV-001");
  await row(owner).getByRole("button").click();
  await owner
    .getByLabel("Titre", { exact: true })
    .fill("Coverage third revision");
  await owner
    .getByRole("button", { name: "Enregistrer la fiche", exact: true })
    .click();
  await expect(owner.getByRole("dialog")).toHaveCount(0);
  await expect(row(owner)).toContainText("v3");
  await expect(row(owner)).toContainText("À réexécuter");
  await owner.reload();
  await owner
    .getByRole("button", { name: "Fiches de test", exact: true })
    .click();
  await owner
    .getByRole("button", { name: "Couverture roadmap", exact: true })
    .click();
  await owner.getByLabel("Rechercher", { exact: true }).fill("COV-001");
  await expect(row(owner)).toContainText("v3");
  await expect(row(owner)).toContainText("Ancien résultat : Réussi · v1");

  await login(tester, accounts.testerEmail);
  await tester.getByLabel("Rechercher", { exact: true }).fill("COV-001");
  await row(tester).getByRole("button").click();
  await expect(tester.getByLabel("Titre", { exact: true })).toBeDisabled();
  await expect(
    tester.getByRole("button", { name: "Enregistrer la fiche", exact: true }),
  ).toHaveCount(0);
  await tester.getByRole("button", { name: "Fermer", exact: true }).click();
  await tester.setViewportSize({ width: 390, height: 844 });
  await expect(
    tester.getByRole("button", { name: "Couverture roadmap", exact: true }),
  ).toBeVisible();
  await expect(tester.getByLabel("Campagne de référence")).toBeVisible();
  await expect(
    tester.getByRole("button", { name: "Se déconnecter", exact: true }),
  ).toBeVisible();
  expect(
    await tester.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await tester.screenshot({
    path: "test-results/coverage-mobile.png",
    fullPage: true,
  });
  await ownerContext.close();
  await testerContext.close();
});
