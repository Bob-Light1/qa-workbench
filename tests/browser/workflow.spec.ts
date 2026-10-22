import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const accounts = JSON.parse(
  readFileSync(process.env.QA_BROWSER_ACCOUNTS || ".env.browser", "utf8"),
);
test("two accounts preserve failure, evidence and a later successful verification", async ({
  browser,
}) => {
  const campaignName = `Browser acceptance ${Date.now()}`;
  const issueTitle = `Browser synthetic issue ${Date.now()}`;
  const ownerContext = await browser.newContext(),
    testerContext = await browser.newContext();
  const owner = await ownerContext.newPage(),
    tester = await testerContext.newPage();
  const login = async (page: typeof owner, email: string) => {
    let releaseProjects!: () => void;
    let fetchedProjects!: () => void;
    const projectsGate = new Promise<void>((resolve) => {
      releaseProjects = resolve;
    });
    const fetched = new Promise<void>((resolve) => {
      fetchedProjects = resolve;
    });
    await page.route(
      /\/rest\/v1\/projects\?/,
      async (route) => {
        const response = await route.fetch();
        fetchedProjects();
        await projectsGate;
        await route.fulfill({ response });
      },
      { times: 1 },
    );
    await page.goto("/");
    await page.getByLabel("Adresse e-mail", { exact: true }).fill(email);
    await page
      .getByLabel("Mot de passe", { exact: true })
      .fill(accounts.password);
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await fetched;
    await expect(
      page.getByText("Chargement des projets…", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Votre espace est prêt à être configuré",
      }),
    ).toHaveCount(0);
    releaseProjects();
    await expect(
      page.getByRole("heading", { name: /La qualité se construit/ }),
    ).toBeVisible();
  };
  await login(owner, accounts.email);
  await owner
    .getByRole("button", { name: "Nouvelle campagne", exact: true })
    .click();
  await owner
    .getByLabel("Nom de la campagne", { exact: true })
    .fill(campaignName);
  for (const b of ["B1", "B2", "B3", "B4"])
    await owner
      .getByLabel(`${b} — version ou commit testé`, { exact: true })
      .fill("synthetic");
  await owner
    .getByRole("button", { name: "Créer la campagne", exact: true })
    .click();
  await expect(
    owner.getByRole("heading", { name: campaignName, exact: true }),
  ).toBeVisible();
  await owner.screenshot({
    path: "test-results/campaign-desktop.png",
    fullPage: true,
  });
  await login(tester, accounts.testerEmail);
  await tester.getByRole("button", { name: "Campagnes", exact: true }).click();
  await tester.getByRole("button", { name: new RegExp(campaignName) }).click();
  const row = tester.getByRole("row").filter({ hasText: "ERP-001" });
  await row.getByRole("button", { name: "Commencer", exact: true }).click();
  await tester
    .getByLabel("Résultat observé / notes", { exact: true })
    .fill("Browser observed mismatch on step 2.");
  await tester
    .getByRole("button", { name: "Enregistrer le brouillon", exact: true })
    .click();
  await expect(
    tester.getByText("Brouillon enregistré", { exact: true }),
  ).toBeVisible();
  await tester.reload();
  await tester.getByRole("button", { name: "Campagnes", exact: true }).click();
  await tester.getByRole("button", { name: new RegExp(campaignName) }).click();
  await tester
    .getByRole("row")
    .filter({ hasText: "ERP-001" })
    .getByRole("button", { name: "Commencer", exact: true })
    .click();
  await expect(
    tester.getByLabel("Résultat observé / notes", { exact: true }),
  ).toHaveValue("Browser observed mismatch on step 2.");
  await tester.getByLabel(/Ajouter une capture/).setInputFiles({
    name: "synthetic-browser.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    tester.getByRole("button", { name: "Ouvrir", exact: true }),
  ).toBeVisible();
  await tester.getByLabel("Verdict", { exact: true }).selectOption("failed");
  await tester
    .getByRole("button", { name: "Valider le résultat", exact: true })
    .click();
  await expect(
    tester.getByText("Créer un signalement à partir de ce résultat", {
      exact: true,
    }),
  ).toBeVisible();
  await tester.getByLabel("Titre", { exact: true }).fill(issueTitle);
  await tester
    .getByRole("button", { name: "Enregistrer le signalement", exact: true })
    .click();
  await expect(
    tester.getByRole("row").filter({ hasText: issueTitle }),
  ).toBeVisible();
  await tester.getByRole("button", { name: "Campagnes", exact: true }).click();
  await tester.getByRole("button", { name: new RegExp(campaignName) }).click();
  await tester
    .getByRole("row")
    .filter({ hasText: "ERP-001" })
    .getByRole("button", { name: "Revérifier", exact: true })
    .click();
  await tester
    .getByLabel("Résultat observé / notes", { exact: true })
    .fill("Browser fix verified.");
  let releaseResponse!: () => void;
  let storedResult!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  const stored = new Promise<void>((resolve) => {
    storedResult = resolve;
  });
  await tester.route(
    "**/rest/v1/rpc/save_execution",
    async (route) => {
      const response = await route.fetch();
      storedResult();
      await responseGate;
      await route.fulfill({ response });
    },
    { times: 1 },
  );
  await tester
    .getByRole("button", { name: "Valider le résultat", exact: true })
    .click();
  await stored;
  await tester.getByRole("button", { name: "Fermer", exact: true }).click();
  releaseResponse();
  const history = tester.getByRole("row").filter({ hasText: "ERP-001" });
  await expect(
    history.getByText("2 résultat(s)", { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByRole("button", { name: "Revérifier", exact: true }),
  ).toBeEnabled();
  await expect(tester.getByRole("dialog")).toHaveCount(0);
  await owner.getByRole("button", { name: "Actualiser", exact: true }).click();
  await owner.getByRole("button", { name: /Signalements/ }).click();
  await owner
    .getByRole("row")
    .filter({ hasText: issueTitle })
    .getByRole("button", { name: "Consulter" })
    .click();
  await owner.getByLabel("État", { exact: true }).selectOption("verified");
  await owner
    .getByLabel("Correction, commit ou décision", { exact: true })
    .fill("Browser correction commit browser123");
  await owner
    .getByLabel("Nouvelle vérification réussie", { exact: true })
    .selectOption({ index: 1 });
  await owner
    .getByRole("button", { name: "Enregistrer le suivi", exact: true })
    .click();
  await expect(
    owner
      .getByRole("row")
      .filter({ hasText: issueTitle })
      .getByText("Vérifié", { exact: true }),
  ).toBeVisible();
  await owner
    .getByRole("button", { name: "Vue d’ensemble", exact: true })
    .click();
  await owner.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await tester.setViewportSize({ width: 390, height: 844 });
  await tester
    .getByRole("button", { name: "Vue d’ensemble", exact: true })
    .click();
  await tester.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await expect(tester.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await expect(
    tester.getByRole("button", { name: "Équipe", exact: true }),
  ).toBeInViewport();
  await tester.getByRole("button", { name: "Équipe", exact: true }).click();
  await expect(
    tester.getByRole("button", { name: "Inviter un testeur", exact: true }),
  ).toHaveCount(0);
  await tester
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await expect(
    tester.getByRole("button", { name: "Se connecter", exact: true }),
  ).toBeVisible();
  await ownerContext.close();
  await testerContext.close();
});

test.describe("Individual access", () => {
  test("weak password preserves the one-use invitation and activation succeeds", async ({
    browser,
  }) => {
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await admin.goto("/");
    await admin
      .getByLabel("Adresse e-mail", { exact: true })
      .fill(accounts.email);
    await admin
      .getByLabel("Mot de passe", { exact: true })
      .fill(accounts.password);
    await admin
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await admin.getByRole("button", { name: "Équipe", exact: true }).click();
    await admin
      .getByRole("button", { name: "Inviter un testeur", exact: true })
      .click();
    await admin
      .getByLabel("Adresse e-mail", { exact: true })
      .fill(`activation-${Date.now()}@qa-workbench.test`);
    await admin
      .getByRole("button", { name: "Préparer l’accès", exact: true })
      .click();
    const link = await admin
      .getByLabel("Lien individuel", { exact: true })
      .inputValue();
    const invitedContext = await browser.newContext();
    const invited = await invitedContext.newPage();
    let verifications = 0;
    invited.on("request", (r) => {
      if (r.url().includes("/auth/v1/verify")) verifications++;
    });
    await invited.goto(link);
    await invited
      .getByLabel("Mot de passe", { exact: true })
      .fill("weak-password-123");
    await invited
      .getByRole("button", { name: "Activer mon accès", exact: true })
      .click();
    await expect(invited.getByRole("alert")).toContainText("majuscule");
    expect(verifications).toBe(0);
    await invited
      .getByLabel("Mot de passe", { exact: true })
      .fill(accounts.password);
    await invited
      .getByRole("button", { name: "Activer mon accès", exact: true })
      .click();
    await expect(
      invited.getByRole("heading", { name: /La qualité se construit/ }),
    ).toBeVisible();
    expect(verifications).toBe(1);
    const replayContext = await browser.newContext();
    const replay = await replayContext.newPage();
    await replay.goto(link);
    await replay
      .getByLabel("Mot de passe", { exact: true })
      .fill(accounts.password);
    await replay
      .getByRole("button", { name: "Activer mon accès", exact: true })
      .click();
    await expect(replay.getByRole("alert")).toContainText("expiré");
    await adminContext.close();
    await invitedContext.close();
    await replayContext.close();
  });
});
