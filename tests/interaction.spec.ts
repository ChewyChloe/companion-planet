import { test, expect } from "@playwright/test";
import { companions } from "../src/companions";
// Nine real model loads plus a reload and capture on software WebGL.
test.describe.configure({ timeout: 180000 });
test("all nine residents switch real 3D geometry and persist through reload", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-model-ready", "sculpt-v1");
  for (const c of companions) {
    await page.getByRole("button", { name: "更換角色", exact: true }).click();
    await page.getByRole("button", { name: c.name, exact: true }).click();
    await expect(canvas).toHaveAttribute("data-companion", c.id);
    await expect(page.getByRole("button", { name: "打個招呼" })).toContainText(
      c.name,
    );
  }
  await page.reload();
  await expect(canvas).toHaveAttribute("data-companion", "puff");
  await page.getByRole("button", { name: "更換角色", exact: true }).click();
  await page.screenshot({
    path: `artifacts/interaction/selection-${info.project.name}.png`,
  });
  expect(errors).toEqual([]);
});
test("grabbing moves the creature without orbiting; release stays put and taps respond", async ({
  page,
}, info) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/);
  const box = (await canvas.boundingBox())!;
  const coord = (await canvas.getAttribute("data-screen"))!
    .split(",")
    .map(Number);
  const start = {
    x: box.x + box.width * coord[0],
    y: box.y + box.height * coord[1],
  };
  const camera = await canvas.getAttribute("data-camera");
  const before = await canvas.getAttribute("data-position");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 35, start.y + 25, { steps: 8 });
  await expect(canvas).toHaveAttribute("data-held", "true");
  await page.screenshot({
    path: `artifacts/interaction/held-${info.project.name}.png`,
  });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-held", "false");
  await expect(canvas).not.toHaveAttribute("data-position", before!);
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  await expect(canvas).toHaveAttribute("data-reaction", "none");
  const dropped = await canvas.getAttribute("data-position");
  await page.waitForTimeout(1200);
  expect(await canvas.getAttribute("data-position")).toBe(dropped);
  await page.getByRole("button", { name: "打個招呼" }).click();
  await expect(canvas).toHaveAttribute(
    "data-reaction",
    /idle|happy|stretch|listen/,
  );
});

test("a tapped character can speak, quiet mode suppresses bubbles, and the mini entry stays hidden", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.99;
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/);
  const box = (await canvas.boundingBox())!;
  const p = (await canvas.getAttribute("data-screen"))!.split(",").map(Number);
  await page.mouse.click(box.x + p[0] * box.width, box.y + p[1] * box.height);
  await expect(page.getByRole("note")).toBeVisible();
  await page.getByRole("button", { name: "更換角色", exact: true }).click();
  await expect(page.getByRole("button", { name: /蕨蕨子/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /花苞寶/ })).toBeDisabled();
  await page.getByRole("button", { name: "關閉角色選擇" }).click();
  await page.getByRole("button", { name: "安靜陪我", exact: true }).click();
  await page.getByRole("button", { name: "打個招呼" }).click();
  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "體驗迷你陪伴" })).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-companion", "nebula");
  await expect(page.getByRole("button", { name: "返回星球" })).toHaveCount(0);
});
