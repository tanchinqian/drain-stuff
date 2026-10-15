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
test('one combobox handles pilot-house search and short controls stay simple', async ({ page }) => {
  await page.goto('/');
  const combo = page.getByRole('combobox', { name: 'Pilot house', exact: true });
  await combo.fill('A01');
  await expect(page.getByRole('option', { name: 'A01 · Zone A', exact: true })).toBeVisible();
  await page.getByRole('option', { name: 'A01 · Zone A', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('A01');
  await page.keyboard.press('Escape');
  await combo.fill('no-such-house');
  await expect(page.getByRole('status').filter({ hasText: 'No results' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(combo).toHaveValue('Select a pilot house');
  await page.goto('/feature/S1');
  await expect(page.getByRole('combobox', { name: 'Playback speed', exact: true })).toBeVisible();
  await expect(
    page.getByRole('searchbox', { name: 'Search playback speed options', exact: true }),
  ).toHaveCount(0);
});
