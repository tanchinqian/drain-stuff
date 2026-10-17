import { test, expect } from '@playwright/test';
test('five operational feature pins and fixed pilot-house selection work in plan and 3D', async ({ page }) => {
  test.setTimeout(90000);
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const id of ['S1', 'S2', 'S3', 'I1', 'R1']) {
      await page.goto('/observations');
      await page.evaluate(() => document.fonts.ready);
      const pin = page
        .locator('.scene')
        .getByRole('button', { name: new RegExp('^Open ' + id + ' ') });
      await pin.scrollIntoViewIfNeeded();
      await pin.click();
      await expect(page).toHaveURL(new RegExp('/feature/' + id));
    }
    await page.goto('/observations');
    await page.getByLabel('Rainfall layer opacity', { exact: true }).fill('75');
    await expect(page.locator('.neighbourhood-scene')).toHaveAttribute('data-cloud-opacity', '75');
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await expect(page.locator('.plan-svg [role=button][data-house-id]')).toHaveCount(24);
    await expect(page.locator('.plan-svg [aria-label^="Open feature"]')).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Move houses', exact: true })).toHaveCount(0);
  }
});
