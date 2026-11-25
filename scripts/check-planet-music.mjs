import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = 'artifacts/planet-music';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const cases = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1200, height: 850 }, isMobile: mobile, hasTouch: mobile });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /Content Security Policy|THREE\.|media|decode/i.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(() => {
      localStorage.setItem('companion-planet-v1', JSON.stringify({ reduced: true, planetId: 'b612' }));
      const NativeAudio = window.Audio;
      window.musicPlayers = [];
      window.Audio = class extends NativeAudio {
        constructor(...args) { super(...args); window.musicPlayers.push(this); }
      };
    });
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3005');
    const status = () => page.evaluate(() => {
      const a = window.musicPlayers.at(-1);
      return { src: a.currentSrc || a.src, paused: a.paused, time: a.currentTime, ready: a.readyState, loop: a.loop, volume: a.volume, error: a.error?.code || null, count: window.musicPlayers.length };
    });
    await expect(page.getByRole('button', { name: '開啟環境音', exact: true })).toBeVisible();
    expect((await status()).paused).toBe(true);
    await page.getByRole('button', { name: '開啟環境音', exact: true }).click();
    for (const [id, name, file] of [['b612', '同頻星球', 'home'], ['rose', '玫瑰花園', 'rose'], ['forest', '微風森林', 'forest'], ['moon', '月光書原', 'moon']]) {
      if (id !== 'b612') {
        await page.getByRole('button', { name: `前往${name}`, exact: true }).press('Enter');
        await expect(page.locator('main')).toHaveAttribute('data-planet', id, { timeout: 60000 });
      }
      await expect.poll(async () => (await status()).src, { timeout: 60000 }).toMatch(new RegExp(`/${file}-[^/]+\\.mp3$`));
      await expect.poll(async () => (await status()).time, { timeout: 60000 }).toBeGreaterThan(0.15);
      const audio = await status();
      expect(audio.paused).toBe(false);
      expect(audio.loop).toBe(true);
      expect(audio.error).toBeNull();
      expect(audio.count).toBe(1);
      cases.push({ mobile, planet: id, ...audio });
    }
    await page.getByRole('button', { name: '關閉環境音', exact: true }).click();
    expect((await status()).paused).toBe(true);
    await page.getByRole('button', { name: '前往同頻星球', exact: true }).press('Enter');
    await expect(page.locator('main')).toHaveAttribute('data-planet', 'b612', { timeout: 60000 });
    expect((await status()).paused).toBe(true);
    await page.getByRole('button', { name: '開啟環境音', exact: true }).click();
    await expect.poll(async () => (await status()).time, { timeout: 60000 }).toBeGreaterThan(0.15);
    expect((await status()).src).toMatch(/\/home-[^/]+\.mp3$/);
    expect(errors).toEqual([]);
    cases.push({ mobile, muteAcrossTravel: true, resume: true, errors });
    await page.close();
    console.log('PASS', mobile ? 'phone' : 'desktop');
  }
} finally {
  await browser.close();
  await writeFile(`${output}/playback.json`, JSON.stringify({ cases }, null, 2));
}
