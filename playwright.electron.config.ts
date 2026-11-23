import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "electron.spec.ts",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  outputDir: "test-results-electron",
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/electron-results.json" }],
    ["html", { outputFolder: "playwright-report-electron", open: "never" }],
  ],
});
