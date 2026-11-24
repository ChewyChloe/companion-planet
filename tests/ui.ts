import type { Page } from "@playwright/test";
export async function openTimerSettings(page: Page) {
  if (!(await page.getByLabel("專注時長", { exact: true }).isVisible()))
    await page.getByRole("button", { name: "計時設定" }).click();
}
