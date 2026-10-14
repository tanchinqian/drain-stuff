import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('shared physics playback, live geometry, CSV and responsive controls', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/feature/S1');
  const timeline = page.getByRole('slider', { name: 'Storm timeline', exact: true });
  await expect(timeline).toBeEnabled({ timeout: 45000 });
  await expect(page.locator('.cad-scene')).toHaveAttribute('data-model-kind', 'swale');
  await timeline.fill('25');
  await expect(page.locator('.cad-scene')).toHaveAttribute('data-frame-second', '1500');
  await page.getByRole('button', { name: 'Play storm', exact: true }).click();
  await page.getByRole('button', { name: 'Pause storm', exact: true }).click();
  await page.getByRole('button', { name: 'Reset storm', exact: true }).click();
  await expect(page.getByTestId('ponding')).toHaveText('0.0 mm');
  await page.locator('.storm-disclosure > summary').click();
  await page.getByRole('slider', { name: 'Rain intensity', exact: true }).fill('120');
  await page.getByRole('combobox', { name: 'Rain pattern', exact: true }).selectOption('uniform');
  await expect(timeline).toBeEnabled({ timeout: 45000 });
  await timeline.fill('25');
  expect(Number(await page.locator('.cad-scene').getAttribute('data-ponding-mm'))).toBeGreaterThan(
    0,
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export run CSV' }).click();
  expect((await download).suggestedFilename()).toBe('S1-model-run.csv');
  await page.getByRole('link', { name: /S2 .*Decompaction/ }).click();
  await expect(timeline).toHaveValue('25');
  await expect(page.locator('.cad-scene')).toHaveAttribute('data-frame-second', '1500');
  await page.getByLabel('2D section', { exact: true }).check();
  await expect(page.getByRole('img', { name: /S2 swale section/ })).toBeVisible();
  await page.getByLabel('2D section', { exact: true }).uncheck();
  await page.locator('.storm-disclosure > summary').click();
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({
      path: `../.impeccable/review/physics-${width === 1440 ? 'desktop' : 'mobile'}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test('feature-specific inlet and tree models and reduced motion', async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [id, kind, count] of [
    ['I1', 'inlet', 6],
    ['T1', 'tree_pit', 13],
    ['T2', 'tree_pit', 13],
  ] as const) {
    await page.goto('/feature/' + id);
    await expect(page.locator('.cad-scene')).toHaveAttribute('data-model-kind', kind);
    await expect(page.locator('.cad-scene')).toHaveAttribute('data-part-count', String(count));
    await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
      timeout: 45000,
    });
    await expect(page.getByRole('button', { name: 'Play storm', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Next minute', exact: true }).click();
    await expect(page.locator('.cad-scene')).toHaveAttribute('data-frame-second', '60');
    if (id === 'I1') {
      await page.locator('.storm-disclosure > summary').click();
      await page
        .getByRole('combobox', { name: 'Simulation scenario', exact: true })
        .selectOption('High tailwater');
      await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
        timeout: 45000,
      });
      await page.getByRole('slider', { name: 'Storm timeline', exact: true }).fill('25');
      await page.locator('.storm-disclosure > summary').click();
      await expect(page.locator('.dimension-label').filter({ hasText: '0.40 m' })).toHaveCount(1);
      await page.screenshot({
        path: '../.impeccable/review/physics-inlet-desktop.png',
        fullPage: true,
      });
      await page.getByLabel('2D section', { exact: true }).check();
      await expect(page.locator('.physics-section figcaption')).toContainText(
        '0.40 m chamber depth',
      );
      expect(
        Number(
          await page.locator('[data-section-ponding-mm]').getAttribute('data-section-ponding-mm'),
        ),
      ).toBeGreaterThan(0);
      for (const width of [1440, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `../.impeccable/review/physics-inlet-2d-${width === 1440 ? 'desktop' : 'mobile'}.png`,
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
});
