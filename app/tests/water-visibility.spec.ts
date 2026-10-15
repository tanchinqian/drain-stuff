import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('rain, wetting and peak water are understandable without opening settings', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/feature/S1');
  const timeline = page.getByRole('slider', { name: 'Storm timeline', exact: true });
  await expect(timeline).toBeEnabled({ timeout: 45000 });
  await page.getByRole('button', { name: 'Play storm', exact: true }).click();
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause storm', exact: true }).click();
  await timeline.fill('2');
  await expect(page.locator('.water-story')).toContainText(/soaking|travelling|pooling/);
  await page.screenshot({
    path: '../docs/screens/round4/after/water-early-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Jump to peak water', exact: true }).click();
  expect(Number(await timeline.inputValue())).toBeGreaterThan(2);
  expect(Number(await page.locator('.cad-scene').getAttribute('data-ponding-mm'))).toBeGreaterThan(
    0,
  );
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({
      path: `../docs/screens/round4/after/water-peak-${width === 1440 ? 'desktop' : 'mobile'}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Play storm', exact: true })).toHaveCount(0);
  await expect(page.locator('.physics-playback')).toContainText('Reduced motion');
  await page.getByRole('button', { name: 'Reset storm', exact: true }).click();
  await expect(page.locator('.water-story')).toContainText('Ready to start');
  expect(errors).toEqual([]);
});
