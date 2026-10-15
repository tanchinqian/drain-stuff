import { test, expect } from '@playwright/test';
test('record search, selection and saved columns recover from no results', async ({ page }) => {
  for (const route of ['trials', 'batches']) {
    await page.goto('/' + route);
    const search = page.getByRole('searchbox', { name: 'Search ' + route, exact: true });
    await search.fill('no-such-record');
    await expect(page.getByRole('status').filter({ hasText: 'No records match' })).toBeVisible();
    await search.fill('');
    await expect(
      page.getByRole('table', { name: route, exact: true }).locator('tbody tr').first(),
    ).toBeVisible();
  }
  await page.goto('/sensors');
  await page.locator('.table-filter summary').filter({ hasText: 'Columns' }).click();
  await page.getByRole('checkbox', { name: 'Updated', exact: true }).uncheck();
  await page.reload();
  await expect(page.getByRole('columnheader', { name: /Updated/ })).toHaveCount(0);
});
test('map selection is direct and short controls stay simple', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Pilot house', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await page.locator('.plan-svg [data-house-id="A01"]').click();
  await expect(page.getByRole('dialog')).toContainText('A01');
  await page.keyboard.press('Escape');
  await page.goto('/feature/S1');
  await expect(page.getByRole('combobox', { name: 'Playback speed', exact: true })).toBeVisible();
});
