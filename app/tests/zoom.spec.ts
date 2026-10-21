import { test, expect } from '@playwright/test';

test('wheel zoom stays relative to the fitted scene and resets at both viewport sizes', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 360, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of ['/observations', '/feature/S1', '/batches/B-01']) {
      await page.goto(path);
      const scene = page.locator('.scene');
      await expect(scene.locator('canvas')).toBeVisible();
      if (path !== '/observations') await page.getByRole('button', { name: 'Debug', exact: true }).click();
      const spread = async () => Number(await scene.locator('canvas').getAttribute('data-camera-zoom'));
      await expect.poll(spread).toBeGreaterThan(0);
      const initial = await spread();
      const wheel = async (delta: number, count = 1) => {
        await scene.scrollIntoViewIfNeeded();
        const bounds = await scene.boundingBox();
        if (!bounds) throw new Error('Scene is unavailable');
        await page.mouse.move(bounds.x + bounds.width * 0.08, bounds.y + bounds.height * 0.08);
        for (let step = 0; step < count; step++) await page.mouse.wheel(0, delta);
      };
      await wheel(-100);
      await expect.poll(spread).toBeGreaterThan(initial * 1.01);
      await wheel(100, 80);
      await page.waitForTimeout(150);
      expect(await spread()).toBeGreaterThanOrEqual(initial * 0.58);
      expect(await spread()).toBeLessThan(initial);
      await wheel(-100, 80);
      await page.waitForTimeout(150);
      expect(await spread()).toBeLessThanOrEqual(initial * 3.52);
      expect(await spread()).toBeGreaterThan(initial);
      await page.getByRole('button', { name: 'Reset view', exact: true }).click();
      await expect
        .poll(async () => Math.abs((await spread()) - initial) / initial)
        .toBeLessThan(0.02);
    }
  }
  expect(errors).toEqual([]);
});
