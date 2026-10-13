import { test, expect } from '@playwright/test';

import AxeBuilder from '@axe-core/playwright';

import { mkdir } from 'node:fs/promises';

test('operator flow: selectable parts, explode and guarded baseline', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Overview' }),
  ).toBeVisible();

  await expect(page.locator('.scene canvas')).toBeVisible();

  await page.goto('/feature/S1');

  await expect(page.locator('.part-list')).toBeVisible();

  await page.locator('.part-list').getByRole('button', { name: 'Gravel drainage layer' }).click();

  await expect(page.getByRole('region', { name: 'Selected part readings' })).toContainText(
    'Gravel drainage layer',
  );

  await page.getByLabel('Explode assembly').fill('80');

  await expect(page.locator('.cad-scene')).toHaveAttribute('data-explode', '80');

  await page.getByRole('button', { name: 'Cross-section', exact: true }).click();

  await page.getByLabel('Section axis', { exact: true }).selectOption('Z');

  await page.locator('.part-list').getByRole('button', { name: 'Compost filter sock' }).click();

  await expect(page.getByRole('region', { name: 'Selected part readings' })).toContainText(
    'Draft. Check',
  );

  await page.goto('/trials?feature=T1');

  await expect(page.getByRole('button', { name: 'Allocate to T1' })).toBeDisabled();

  await page
    .getByRole('combobox', { name: 'Soil texture', exact: true })
    .selectOption({ index: 1 });

  for (const id of ['T1-P1', 'T1-P2', 'T1-P3']) {
    await page.getByRole('combobox', { name: 'Marked point', exact: true }).selectOption(id);

    await page.getByRole('button', { name: 'Record baseline point' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Test recorded' })).toBeVisible();
  }

  await expect(page.getByLabel('Test phase', { exact: true })).toHaveValue('Re-test');

  await page.getByLabel('Compost is not placed in contact with an open drain').check();

  await page.getByRole('button', { name: 'Save guardrail checks' }).click();

  await expect(page.getByRole('button', { name: 'Allocate to T1' })).toBeEnabled();

  await page.getByRole('button', { name: 'Allocate to T1' }).click();

  await expect(
    page.getByRole('status').filter({ hasText: 'Mature batch allocated' }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test('desktop and mobile captures plus accessibility', async ({ page }) => {
  test.setTimeout(120000);

  await mkdir('../docs/screens', { recursive: true });

  for (const [path, name] of [
    ['/', 'overview'],

    ['/feature/S1', 'detail'],

    ['/batches/B-01', 'compost'],

    ['/sensors', 'sensors'],

    ['/faults', 'faults'],
  ] as const) {
    await page.goto(path);

    if (name !== 'sensors' && name !== 'faults')
      await expect(page.locator('.scene canvas')).toBeVisible();
    else await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.evaluate(() => document.fonts.ready);

    await page.waitForTimeout(300);

    await page.screenshot({
      path: '../docs/screens/' + name + '-desktop.png',
      fullPage: name !== 'sensors' && name !== 'faults',
    });

    const accessibility = await new AxeBuilder({ page })

      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])

      .analyze();

    expect(
      accessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);

    await page.setViewportSize({ width: 360, height: 900 });

    await page.waitForTimeout(100);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.screenshot({
      path: '../docs/screens/' + name + '-mobile.png',
      fullPage: name !== 'sensors' && name !== 'faults',
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
  }
});

test('every registered sensor has a row and a site marker; filters and model parts work', async ({
  page,
}) => {
  await page.goto('/sensors');

  await expect(page.locator('tbody [data-sensor-row]').first()).toBeVisible();

  const ids = await page
    .locator('tbody [data-sensor-row]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-sensor-row')));

  expect(new Set(ids).size).toBe(ids.length);

  await page.getByRole('combobox', { name: 'Trust status', exact: true }).selectOption('suspect');

  await expect(page.locator('tbody [data-sensor-row]')).toHaveCount(1);

  await expect(page.locator('tbody')).toContainText('S3-MOIST-30');

  await page.getByRole('combobox', { name: 'Trust status', exact: true }).selectOption('offline');

  await expect(page.locator('tbody')).toContainText('Unavailable — offline');

  await page.goto('/?sensors=1');

  await expect(page.locator('[data-sensor-marker]').first()).toBeAttached();

  const marked = await page
    .locator('[data-sensor-marker]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-sensor-marker')));

  expect(marked.sort()).toEqual(ids.sort());

  await page.goto('/feature/S1');

  await expect(page.locator('.part-list button')).toHaveCount(16);

  await page
    .locator('.part-list')
    .getByRole('button', { name: 'Impermeable liner', exact: false })
    .click();

  await expect(page.getByRole('region', { name: 'Selected part readings' })).toContainText(
    'Not installed',
  );

  await page.goto('/batches/B-01');

  await expect(page.locator('.part-list button')).toHaveCount(8);

  await page
    .locator('.part-list')
    .getByRole('button', { name: 'Compost bay / pile', exact: true })
    .click();

  await expect(page.getByRole('region', { name: 'Selected part readings' })).toContainText(
    'B-01-MANUAL',
  );

  await page.getByRole('combobox', { name: 'Smell log', exact: true }).selectOption('putrid');

  await page.getByRole('button', { name: 'Save batch checks', exact: true }).click();

  await page.goto('/faults?rule=putrid_smell');

  await expect(page.locator('tbody')).toContainText('B-01-MANUAL');

  await page.goto('/faults?rule=sensor_trust');

  await expect(page.locator('tbody')).toContainText('This alert may be a sensor fault.');
});
