import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test.use({
  baseURL: process.env.ROUND8_APP_URL || 'http://127.0.0.1:5175',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args: ['--use-angle=d3d11'],
  },
});
test('storm board calculates five assets and selects their map marker', async ({ page }) => {
  test.setTimeout(180000);
  await mkdir('test-results/captures/round8', { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set the storm to compare' })).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Run storm', exact: true }).click();
  await expect(page.locator('.triage-row')).toHaveCount(5, { timeout: 150000 });
  await expect(page.locator('.triage-row').filter({ hasText: 'S2' })).toContainText(
    'Capacity-limited: escalate to owner',
  );
  await expect(page.locator('.triage-rows')).not.toContainText('T1');
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await page.locator('.triage-asset').filter({ hasText: 'R1' }).click();
  await expect(page.locator('.triage-row.selected')).toContainText('R1');
  await page.screenshot({ path: 'test-results/captures/round8/board-storm.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
