import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "design.spec.ts",
  outputDir: "test-results-design",
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/layout/design-results.json" }],
  ],
  projects: [
    { name: "wide", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { viewport: { width: 1024, height: 768 } } },
    {
      name: "phone",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
