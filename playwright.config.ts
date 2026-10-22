import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const executablePath =
  process.env.CHROME_PATH ||
  (existsSync("/opt/google/chrome/chrome")
    ? "/opt/google/chrome/chrome"
    : undefined);
export default defineConfig({
  testDir: "tests/browser",
  timeout: 120000,
  workers: 1,
  use: {
    actionTimeout: 20000,
    baseURL: process.env.QA_BROWSER_URL || "http://localhost:5178",
    headless: true,
    launchOptions: { executablePath, args: ["--no-sandbox"] },
    screenshot: "off",
  },
  webServer: process.env.QA_BROWSER_URL
    ? undefined
    : {
        command: "npm run dev -- --host localhost",
        url: "http://localhost:5178",
        reuseExistingServer: !process.env.CI,
      },
});
