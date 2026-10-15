import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('attention order and operator controls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  const faults = await page.locator('.attention-faults').boundingBox();
  const map = await page.locator('.overview-map').boundingBox();
  expect(map!.y).toBeLessThan(faults!.y);
  await expect(page.getByRole('combobox', { name: 'Pilot house', exact: true })).toHaveCount(0);
  await expect(page.locator('.zone-filter button')).toHaveCount(5);
  await page.goto('/feature/S1');
  await expect(page.locator('.cad-scene')).toBeVisible();
  expect(await page.locator('.storm-disclosure').getAttribute('open')).toBeNull();
  const model = await page.locator('.cad-scene').boundingBox();
  const storm = await page.locator('.storm-disclosure').boundingBox();
  expect(model!.y).toBeLessThan(storm!.y);
  await expect(page.getByRole('button', { name: 'Move part', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Part shift X', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Sensors', { exact: true })).not.toBeChecked();
  await expect(page.locator('.detail-readings')).not.toContainText('Local position:');
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(page.getByLabel('Part shift X', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Y', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Y', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('fault highlight has matching list treatment and provenance', async ({ page }) => {
  await page.goto('/feature/S1');
  await page.locator('.storm-disclosure > summary').click();
  await page
    .getByRole('combobox', { name: 'Simulation scenario', exact: true })
    .selectOption('Clogged sock');
  await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
    timeout: 45000,
  });
  await page.getByRole('slider', { name: 'Storm timeline', exact: true }).fill('25');
  await page.locator('.part-list').getByRole('button', { name: 'Compost filter sock' }).click();
  await expect(page.locator('[data-part-highlight="fault"]').first()).toBeVisible();
  await expect(page.locator('.part-list .part-status-fault')).toContainText('Compost filter sock');
  await expect(page.getByRole('heading', { name: 'Why is this highlighted?' })).toBeVisible();
  await expect(page.locator('.detail-readings')).toContainText('S1-INLET');
  await page.goto('/feature/S3?part=media');
  await expect(page.locator('[data-part-highlight="offline"]').first()).toBeVisible();
});

test('compost tabs preserve unsaved form entries and support keyboard switching', async ({
  page,
}) => {
  await page.goto('/batches/B-01');
  await page.getByRole('tab', { name: 'Readings', exact: true }).click();
  await page.getByLabel('Moisture, %', { exact: true }).fill('51');
  await page.getByRole('tab', { name: 'Checks', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save batch checks', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Checks', exact: true }).press('ArrowLeft');
  await expect(page.getByLabel('Moisture, %', { exact: true })).toHaveValue('51');
  await page.getByRole('tab', { name: 'Readings', exact: true }).press('Home');
  await expect(page.locator('.cad-scene')).toBeVisible();
});

test('approved rainfall palette and compost form accessibility are retained', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.heat-legend i')).toHaveCount(8);
  const swatches = await page
    .locator('.heat-legend i')
    .evaluateAll((nodes) => nodes.slice(-7).map((n) => getComputedStyle(n).backgroundColor));
  expect(swatches).toEqual([
    'rgb(97, 204, 233)',
    'rgb(68, 191, 101)',
    'rgb(185, 223, 56)',
    'rgb(243, 212, 49)',
    'rgb(242, 139, 39)',
    'rgb(222, 69, 46)',
    'rgb(170, 64, 182)',
  ]);
  await page.goto('/batches/B-01');
  for (const tab of ['Readings', 'Checks']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const a11y = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(a11y.violations.map((v) => v.id)).toEqual([]);
      await page.screenshot({
        path: `../docs/screens/round4/after/compost-${tab.toLowerCase()}-${width === 1440 ? 'desktop' : 'mobile'}.png`,
        fullPage: true,
      });
    }
  }
  await page.getByLabel('Drop-off photo', { exact: true }).setInputFiles({
    name: 'inspection.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jYzYAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByText('inspection.png', { exact: true })).toBeVisible();
  await page.getByLabel('Drop-off photo', { exact: true }).setInputFiles({
    name: 'wrong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Not an image'),
  });
  await expect(page.getByRole('alert')).toContainText('Choose a PNG, JPEG or WebP image');
});
