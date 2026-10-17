import { choose } from './controls';
import { test, expect } from '@playwright/test';
test('fault confirmation persists with a record-specific audit trail', async ({page}) => {
  await page.goto('/faults?fault=F-002');
  const drawer=page.getByRole('dialog');
  await drawer.getByLabel('Required note', {exact:true}).fill('Inlet independently checked');
  await drawer.getByRole('button', {name:'Confirm fault',exact:true}).click();
  await expect(drawer.locator('[aria-current=step]')).toHaveText('Confirmed');
  await page.reload();
  await expect(drawer.locator('[aria-current=step]')).toHaveText('Confirmed');
  await drawer.locator('.record-history summary').click();
  await expect(drawer).toContainText('Inlet independently checked');
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
test('fixed pilot map, selection, range and zone scoping', async ({ page }) => {
  await page.goto('/observations');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move houses', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(page.locator('.plan-svg [role=button][aria-label^="Mapped house"]')).toHaveCount(0);
  await page.locator('.plan-svg [data-house-id="A01"]').click();
  await expect(page.getByRole('dialog')).toContainText('A01');
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.plan-svg [data-house-id="A01"]').click();
  await page.mouse.click(10, 200);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Rainfall · 7 days/ })).toBeVisible();
  await page.getByRole('button', { name: 'Zone B', exact: true }).click();
  await expect(page.locator('.map-zones')).not.toContainText('Zone A');
  await expect(page.locator('.map-zones')).toContainText('Zone B');
});
test('trial test drawer saves repeats and updates its record', async ({ page }) => {
  await page.goto('/trials?feature=T1');
  await page
    .locator('.master-content .actions')
    .getByRole('button', { name: 'Record baseline', exact: true })
    .click();
  const drawer = page.getByRole('dialog');
  await choose(drawer.getByRole('combobox', { name: 'Soil texture', exact: true }), 'Clay loam');
  await drawer.getByLabel('Measured value', { exact: true }).fill('15');
  await drawer.getByLabel('Repeats at this point', { exact: true }).fill('3');
  await drawer.getByRole('button', { name: 'Record baseline point', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved to trial record T1' }),
  ).toBeVisible();
  await expect(drawer.getByRole('table')).toContainText('15');
});
test('compost prompts follow readings and human checks have buttons and history', async ({
  page,
}) => {
  await page.goto('/batches/B-01');
  await page.getByRole('tab', { name: 'Readings', exact: true }).click();
  await page.getByLabel('Temperature, °C', { exact: true }).fill('80');
  await page.getByLabel('Moisture, %', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Record reading', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Turn or spread to cool', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Add water while turning', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Checks', exact: true }).click();
  await page.getByRole('button', { name: 'Sour', exact: true }).click();
  await page.getByRole('button', { name: 'Save batch checks', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved to batch B-01 check log' }),
  ).toBeVisible();
  await page.locator('.record-history summary').click();
  await expect(page.locator('.record-history')).toContainText('Sour');
});
test('feature water path, model drawer and recorded compost are visible', async ({ page }) => {
  await page.goto('/feature/S1');
  await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
    timeout: 45000,
  });
  await expect(page.getByRole('heading', { name: 'Compost applied', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Water path', exact: true })).toContainText(
    'Outlet',
  );
  await page.getByRole('button', { name: 'Jump to peak water', exact: true }).click();
  await page.getByRole('button', { name: 'Model details', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Rainfall');
  await page.getByRole('dialog').getByText('Soil', { exact: true }).click();
  await expect(
    page.getByRole('dialog').getByLabel('Infiltration rate', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('operational pages omit environment labels and keep mobile content contained', async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const path of [
    '/',
    '/trials',
    '/batches',
    '/batches/B-01',
    '/faults',
    '/sensors',
    '/feature/S1',
    '/feature/I1',
    '/feature/T1',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/synthetic|demo data|seeded|placeholder/i);
    await page.setViewportSize({ width: 360, height: 1000 });
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
  }
});

test('standing-water guidance and help popovers stay readable', async ({ page }) => {
  await page.goto('/feature/A04-D?part=outfall');
  await page.locator('.detail-readings').getByText('Inspection steps', { exact: true }).click();
  await expect(page.locator('.detail-readings')).not.toContainText(
    /synthetic|placeholder|seeded|demo data|to confirm/i,
  );
  await page.screenshot({
    path: 'test-results/captures/round4/after/standing-water-review-1440.png',
    fullPage: true,
  });
  await page.goto('/feature/S1');
  await expect(page.locator('.glossary-popover:visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explain L/min', exact: true }).first().click();
  await expect(page.locator('.glossary-popover:visible')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.glossary-popover:visible')).toHaveCount(0);
  await page.screenshot({
    path: 'test-results/captures/round4/after/glossary-review-1440.png',
    fullPage: true,
  });
});
