import { choose } from './controls';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
test('baseline, safety checks and compost allocation remain guarded', async ({ page }) => {
  await page.goto('/trials?feature=T1');
  await page.getByRole('button', { name: 'Allocate mature compost', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Allocate to T1', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page
    .locator('.master-content .actions')
    .getByRole('button', { name: 'Record baseline', exact: true })
    .click();
  const drawer = page.getByRole('dialog');
  await choose(drawer.getByRole('combobox', { name: 'Soil texture', exact: true }), 'Clay loam');
  for (const point of ['T1-P1', 'T1-P2', 'T1-P3']) {
    await choose(drawer.getByRole('combobox', { name: 'Marked point', exact: true }), point);
    await drawer.getByRole('button', { name: 'Record baseline point', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Saved to trial record T1' }),
    ).toBeVisible();
  }
  await expect(drawer.getByLabel('Test phase', { exact: true })).toHaveValue('Re-test');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Update safety checks', exact: true }).click();
  await page.getByLabel('Compost is not placed in contact with an open drain').check();
  await page.getByRole('button', { name: 'Save safety checks', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved safety checks' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Allocate mature compost', exact: true }).click();
  await choose(page.getByRole('combobox', { name: 'Batch', exact: true }), 'B-03');
  await expect(page.getByRole('button', { name: 'Allocate to T1', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Allocate to T1', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved compost allocation' }),
  ).toBeVisible();
});
test('all pages meet axe, width and mobile containment and have review captures', async ({
  page,
}) => {
  test.setTimeout(180000);
  await mkdir('test-results/captures', { recursive: true });
  await mkdir('test-results/captures/round4/after/round3', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [path, name] of [
    ['/', 'overview'],
    ['/trials', 'trials'],
    ['/batches', 'batches'],
    ['/batches/B-01', 'compost'],
    ['/sensors', 'sensors'],
    ['/faults', 'faults'],
    ['/feature/S1', 'detail'],
    ['/about', 'about'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const width of [1440, 1920, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        name + ' ' + width,
      ).toBe(true);
      if (width > 1000)
        expect((await page.locator('main').boundingBox())!.width).toBeGreaterThan(
          width === 1440 ? 1300 : 1700,
        );
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        name + ' ' + width,
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/captures/round4/after/${name}-${width}.png`,
        fullPage: true,
      });
      if (width !== 1920)
        await page.screenshot({
          path: `test-results/captures/round4/after/${name}-${width === 1440 ? 'desktop' : 'mobile'}.png`,
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});
test('sensor pagination, trust filters and feature-specific parts remain available', async ({
  page,
}) => {
  await page.goto('/sensors');
  const table = page.getByRole('table', { name: 'sensors', exact: true });
  await expect(table.locator('tbody tr')).toHaveCount(10);
  await page
    .locator('.table-filter')
    .filter({ has: page.locator('summary', { hasText: /^Status$/ }) })
    .locator('summary')
    .click();
  await page.getByRole('checkbox', { name: 'Needs checking', exact: true }).check();
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table).toContainText('S3-MOIST-30');
  for (const [id, count] of [
    ['S1', 16],
    ['I1', 6],
    ['T1', 13],
  ] as const) {
    await page.goto('/feature/' + id);
    await expect(page.locator('.part-list button')).toHaveCount(count);
  }
  await page.goto('/batches/B-01');
  await expect(page.locator('.part-list button')).toHaveCount(8);
});
