import { test, expect } from '@playwright/test';
test('S1 storm controls, water response and responsive preview', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/feature/S1');
  await expect(page.getByRole('heading', { name: 'Try a storm at S1' })).toBeVisible();
  await page.getByRole('slider', { name: 'Storm timeline', exact: true }).fill('180');
  const clear = Number((await page.getByTestId('ponding').innerText()).replace(' mm', ''));
  await page.getByRole('slider', { name: 'Outlet blockage', exact: true }).fill('100');
  await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toHaveValue('0');
  await page.getByRole('slider', { name: 'Storm timeline', exact: true }).fill('180');
  expect(
    Number((await page.getByTestId('ponding').innerText()).replace(' mm', '')),
  ).toBeGreaterThan(clear);
  await page.getByRole('button', { name: 'Play storm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause storm', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause storm', exact: true }).click();
  await page.getByRole('button', { name: 'Reset storm', exact: true }).click();
  await expect(page.getByTestId('ponding')).toHaveText('0 mm');
  await page.getByRole('slider', { name: 'Storm timeline', exact: true }).fill('45');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `../.impeccable/review/storm-${width === 1440 ? 'desktop' : 'mobile'}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('link', { name: 'Inspect drainage parts' }).click();
  await expect(page).toHaveURL(/#drain-assembly/);
  expect(errors).toEqual([]);
});

