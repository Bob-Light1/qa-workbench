import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { decodeBackup } from "../../src/backup";
const accounts = JSON.parse(
  readFileSync(process.env.QA_BROWSER_ACCOUNTS || ".env.browser", "utf8"),
);
test("administrator downloads a complete portable project archive", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Adresse e-mail", { exact: true }).fill(accounts.email);
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill(accounts.password);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /La qualité se construit/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Équipe", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", {
        name: "Exporter le projet et les captures",
        exact: true,
      })
      .click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^qa-workbench-.*\.zip$/);
  const filename = await download.path();
  expect(filename).not.toBeNull();
  const { bundle, files } = await decodeBackup(
    new Uint8Array(await readFile(filename!)),
  );
  expect(bundle.project_id).toBe(accounts.project_id);
  expect(bundle.tables.test_cases.length).toBeGreaterThanOrEqual(10);
  expect(bundle.tables.attachments.length).toBeGreaterThan(0);
  expect(Object.keys(files).filter((n) => n.startsWith("files/")).length).toBe(
    bundle.tables.attachments.length,
  );
});
