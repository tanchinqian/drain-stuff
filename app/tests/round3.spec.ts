import { test, expect } from '@playwright/test';
test('fault status saves, persists and has an audit trail', async ({ page }) => {
  await page.goto('/faults');
  await expect(page.getByRole('heading', { name: 'Faults', exact: true })).toBeVisible();
  const control = page.locator('select[aria-label^="Status for"]').first();
  await expect(control).toBeVisible();
  const label = await control.getAttribute('aria-label'),
    id = label!.replace('Status for ', '');
  const next = (await control.inputValue()) === 'closed' ? 'open' : 'closed';
  await control.selectOption(next);
  await expect(page.getByRole('status').filter({ hasText: 'Saved fault status' })).toBeVisible();
  await page.reload();
  await page.getByRole('searchbox', { name: 'Search faults', exact: true }).fill(id);
  await expect(page.getByRole('combobox', { name: label!, exact: true })).toHaveValue(next);
  await page.getByRole('button', { name: id, exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Audit trail');
  await expect(page.getByRole('dialog')).toContainText('Local operator');
});
test('sensor table uses row details, filters and wide layout', async ({ page }) => {
  await page.goto('/sensors');
  await expect(page.getByRole('heading', { name: 'Sensors', exact: true })).toBeVisible();
  const table = page.getByRole('table', { name: 'sensors', exact: true });
  await expect(table).toBeVisible();
  await expect(table).not.toContainText('Installed position');
  await table.locator('tbody tr').first().getByRole('button').first().click();
  await expect(page.getByRole('dialog')).toContainText('Installed position');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const main = await page.locator('main').boundingBox();
    expect(main!.width).toBeGreaterThan(width === 1440 ? 1300 : 1700);
  }
});
test('fixed pilot map, non-modal selection, range and zone scoping', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move houses', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(page.locator('.plan-svg [role=button][aria-label^="Mapped house"]')).toHaveCount(0);
  await page.locator('.plan-svg [data-house-id="A01"]').click();
  await expect(page.getByRole('dialog')).toContainText('A01');
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'false');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.plan-svg [data-house-id="A01"]').click();
  await page.locator('.plan-svg').click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rainfall · 7 days', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zone B', exact: true }).click();
  await expect(page.locator('.feature-jumps')).not.toContainText('S1');
  await expect(page.locator('.map-zones')).toContainText('Zone B');
});
