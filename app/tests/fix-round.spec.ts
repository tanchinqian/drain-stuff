import { test, expect } from '@playwright/test';
test('attention order and operator controls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  const faults = await page.locator('.attention-faults').boundingBox();
  const map = await page.locator('.overview-map').boundingBox();
  expect(faults!.y).toBeLessThan(map!.y);
  await expect(page.getByRole('combobox', { name: 'Select a house', exact: true })).toHaveCount(1);
  await expect(page.locator('.map-zones button')).toHaveCount(4);
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
  await expect(page.getByRole('button', { name: 'Y', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('fault highlight has matching list treatment and provenance', async ({ page }) => {
 await page.goto('/feature/S1');
 await expect(page.locator('[data-part-highlight="fault"]').first()).toBeVisible();
 await expect(page.locator('.part-list .part-status-fault')).toContainText('Compost filter sock');
 await expect(page.getByRole('heading', {name: 'Why is this highlighted?'})).toBeVisible();
 await expect(page.locator('.detail-readings')).toContainText('S1-INLET');
 await page.goto('/feature/S3?part=media');
 await expect(page.locator('[data-part-highlight="offline"]').first()).toBeVisible();
});

test('compost tabs preserve unsaved form entries and support keyboard switching', async ({ page }) => {
 await page.goto('/batches/B-01');
 await page.getByRole('tab', {name: 'Readings', exact: true}).click();
 await page.getByLabel('Moisture, %', {exact: true}).fill('51');
 await page.getByRole('tab', {name: 'Checks', exact: true}).click();
 await expect(page.getByRole('button', {name: 'Save batch checks', exact: true})).toBeVisible();
 await page.getByRole('tab', {name: 'Checks', exact: true}).press('ArrowLeft');
 await expect(page.getByLabel('Moisture, %', {exact: true})).toHaveValue('51');
 await page.getByRole('tab', {name: 'Readings', exact: true}).press('Home');
 await expect(page.locator('.cad-scene')).toBeVisible();
});
