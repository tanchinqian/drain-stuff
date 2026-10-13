import { test, expect } from '@playwright/test';
test('trial and batch record searches recover from no results', async ({ page }) => {
  for (const route of ['trials', 'batches']) {
    await page.goto('/' + route);
    const search = page.getByRole('searchbox', { name: 'Search ' + route, exact: true });
    await search.fill('no-such-record');
    await expect(page.getByRole('status').filter({ hasText: 'No matching ' + route })).toBeVisible();
    await search.fill('');
    await expect(page.getByRole('status').filter({ hasText: 'No matching ' + route })).toHaveCount(0);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `../.impeccable/review/search-${route}-${width}.png`, fullPage: true });
    }
  }
});
test('search narrows options without changing selection, and clears on selection', async ({
  page,
}) => {
  await page.goto('/sensors');
  const search = page.getByRole('searchbox', { name: 'Search part options', exact: true });
  const select = page.getByRole('combobox', { name: 'Part', exact: true });
  await search.fill('  FILTER  ');
  await expect(select).toHaveValue('');
  await expect(select.locator('option:not([hidden])')).toHaveCount(2);
  await select.selectOption({ label: 'Compost filter sock' });
  await expect(search).toHaveValue('');
  await search.fill('zzzz-not-found');
  await expect(page.getByRole('status').filter({ hasText: 'No matching options' })).toBeVisible();
  await expect(select).toHaveValue('sock');
  await page.getByRole('button', { name: 'Clear part search' }).click();
  await expect(search).toHaveValue('');
  await expect(select).toHaveValue('sock');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `../.impeccable/review/search-${width === 1440 ? 'desktop' : 'mobile'}.png`,
      fullPage: true,
    });
  }
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search house options' }).fill('1174511531');
  await expect(
    page
      .getByRole('combobox', { name: 'Select a house', exact: true })
      .locator('option:not([hidden])'),
  ).toHaveCount(1);
});
