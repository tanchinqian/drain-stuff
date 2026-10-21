import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test.use({
  baseURL: process.env.STAGE_A_APP_URL || 'http://127.0.0.1:5174',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args: ['--use-angle=d3d11'],
  },
});
test('Demo opens directly and uses the real API proxy', async ({ page }) => {
  test.setTimeout(60000);
  await mkdir('test-results/captures/round8', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/v1/faults', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    return response.status;
  });
  expect(status).toBe(422); // Validation reached through proxy; no test records are written.
  await page
    .getByRole('navigation', { name: 'Console pages' })
    .getByRole('link', { name: 'Sensors', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Sensors', exact: true })).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/captures/round8/stage-a-sensors.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('Stage A automatic discovery fallback opens the existing local app', async ({ page }) => {
  test.setTimeout(60000);
  await page.route('**/api/v1/config', (route) => route.abort());
  await page.goto('/');
  await expect(
    page.getByRole('status').filter({ hasText: 'Connection unavailable. Local demo opened.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
});
