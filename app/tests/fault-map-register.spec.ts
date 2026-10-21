import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ baseURL: process.env.STAGE_A_APP_URL || 'http://127.0.0.1:5192' });

test('view selector offers the original table and 3D models with every registered asset available', async ({ page }) => {
  await page.goto('/faults');
  const selector = page.locator('.fault-register-view');
  await expect(selector.getByRole('button', { name: 'All assets', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#register-faults table')).toBeVisible();
  await expect(page.locator('#register-faults thead')).toContainText('ID');
  await expect(page.locator('#register-faults thead')).toContainText('Severity');
  await expect(page.locator('#register-faults thead')).toContainText('Rule');
  const assets = page.getByRole('complementary', { name: 'Fault assets', exact: true });
  await expect(assets.getByRole('button', { name: /^B-03 / })).toBeVisible();
  await expect(assets.getByText('Houses (24)', { exact: true })).toBeVisible();
  await assets.getByRole('button', { name: /^S1 / }).click();
  await expect(page.locator('#register-faults tbody')).toContainText('F-001');
  await selector.getByRole('button', { name: '3D models', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'S1 faults', exact: true })).toBeVisible();
  await expect(page.locator('#register-faults table')).toHaveCount(0);
  await selector.getByRole('button', { name: 'All assets', exact: true }).click();
  await expect(page.locator('#register-faults tbody')).toContainText('F-001');
});

test('3D models view shows mapped groups and preserves all record details', async ({ page }) => {
  await page.goto('/faults');
  await page.getByRole('button', { name: '3D models', exact: true }).click();
  await expect(page.locator('#register-faults table')).toHaveCount(0);
  await expect(page.locator('.fault-map-model [data-asset-id]')).toHaveCount(7);
  await expect(page.locator('.fault-record-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'View S1 faults', exact: true }).click();
  const card = page.locator('.fault-record-card[data-fault-id="F-001"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Inlet blocked');
  await expect(card).toContainText('High');
  await expect(card.locator('dt')).toHaveText(['Asset', 'Part', 'Zone', 'Opened', 'Status', 'Work order', 'Rule']);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await card.getByRole('button', { name: 'View F-001 details', exact: true }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('heading', { name: /F-001/ })).toBeVisible();
  await expect(drawer.locator('.fault-detail-metadata dt')).toHaveText(['Fault ID', 'Title', 'Asset', 'Part', 'Severity', 'Opened', 'Status', 'Zone', 'Rule']);
  await expect(drawer.getByRole('heading', { name: 'Work order', exact: true })).toBeVisible();
  await expect(drawer.getByText('Suggested diagnosis', { exact: false }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(card).toBeVisible();
  await expect(page.getByRole('button', { name: '3D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'View T1 faults', exact: true }).click();
  await expect(page.locator('.fault-map-records')).toContainText('No open faults.');
  await expect(page.getByRole('link', { name: 'View T1 asset details', exact: true })).toBeVisible();
});

test('batch and house records, search, CSV export and rule details remain accessible', async ({ page }) => {
  await page.goto('/faults');
  await page.getByRole('button', { name: '3D models', exact: true }).click();
  await page.getByRole('button', { name: /^B-01 / }).click();
  await expect(page.locator('.fault-record-card')).toHaveCount(2);
  await expect(page.locator('.fault-record-card[data-fault-id="F-009"]')).toContainText('Compost bay / pile');
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search faults', exact: true });
  await search.fill('F-003');
  await expect(page.locator('.fault-record-card')).toHaveCount(1);
  await expect(page.locator('.fault-record-card')).toContainText('A04-D');
  await search.fill('');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloadPromise;
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('"ID","Title","Asset","Part","Severity","Opened","Status"');
  expect(csv).toContain('F-003');
  expect(csv).toContain('F-009');
  await page.getByRole('button', { name: 'View S1 faults', exact: true }).click();
  await page.locator('.fault-record-rule').getByRole('button').click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Faults raised by this rule', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Rules', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fault rules and diagnosing inputs', exact: true })).toBeVisible();
});

test('mobile map markers, keyboard Plan selection and fault deep links work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/faults');
  await page.getByRole('button', { name: '3D models', exact: true }).click();
  for (const id of ['S1', 'S2', 'S3', 'I1', 'T1', 'T2', 'R1']) {
    await page.getByRole('button', { name: `View ${id} faults`, exact: true }).click();
    await expect(page.getByRole('heading', { name: `${id} faults`, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  const marker = page.getByRole('button', { name: 'View S1 faults', exact: true });
  await marker.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.fault-record-card[data-fault-id="F-001"]')).toBeVisible();
  await page.getByRole('button', { name: 'House A04', exact: true }).click();
  await expect(page.locator('.fault-record-card[data-fault-id="F-003"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.goto('/faults?fault=F-001');
  await expect(page.getByRole('dialog').getByRole('heading', { name: /F-001/ })).toBeVisible();
});
