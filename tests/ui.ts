import type { Page } from "@playwright/test";
export async function setFocusDuration(page: Page, minutes: string, seconds = "0") {
  await page.getByRole("textbox", { name: "分鐘", exact: true }).fill(minutes);
  const secondsField = page.getByRole("textbox", { name: "秒鐘", exact: true });
  await secondsField.fill(seconds);
  await secondsField.press("Enter");
}
