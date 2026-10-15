import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
const routes = [
  ['/', 'overview'],
  ['/trials', 'trials'],
  ['/batches', 'batches'],
  ['/batches/B-01', 'compost'],
  ['/sensors', 'sensors'],
  ['/faults', 'faults'],
  ['/feature/S1', 'feature'],
  ['/about', 'about'],
] as const;
test('all pages have aligned full-width shells and complete rows at desktop and mobile sizes', async ({
  page,
}) => {
  test.setTimeout(180000);
  await mkdir('../docs/screens/round4/after', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [route, name] of routes) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const width of [1440, 1920, 360]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      await page.evaluate(() => scrollTo(0, 0));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        name + ' overflow ' + width,
      ).toBe(true);
      const main = (await page.locator('main').boundingBox())!;
      expect(main.width).toBe(width - (width === 360 ? 24 : 48));
      expect(main.x).toBe(width === 360 ? 12 : 24);
      await expect(page.locator('.page-activity')).toHaveCount(0);
      const tableIssues = await page.locator('.data-table:visible').evaluateAll((nodes) =>
        nodes.flatMap((node) => {
          const box = node.querySelector('.table-wrap')!.getBoundingClientRect();
          return [...node.querySelectorAll('tr')]
            .filter((tr) => {
              const r = tr.getBoundingClientRect();
              return (
                r.top < box.top - 1 ||
                r.bottom > box.bottom + 1 ||
                (innerWidth > 1000 && (r.left < box.left - 1 || r.right > box.right + 1))
              );
            })
            .map((tr) => tr.textContent?.slice(0, 70));
        }),
      );
      expect(tableIssues, name + ' clipped rows ' + width).toEqual([]);
      const a11y = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        name + ' ' + width,
      ).toEqual([]);
      await page.screenshot({
        path: `../docs/screens/round4/after/${name}-${width}.png`,
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
});
test('table menus are exclusive, filters persist and density and pagination have consistent rows', async ({
  page,
}) => {
  await page.goto('/trials');
  const table = page.getByRole('table', { name: 'trials', exact: true });
  const menu = (name: string) =>
    page
      .locator('.table-filter')
      .filter({ has: page.locator('summary', { hasText: new RegExp('^' + name) }) });
  await menu('Treatment').locator('summary').click();
  await menu('Treatment')
    .getByRole('checkbox', { name: 'Soil loosened + compost', exact: true })
    .check();
  await menu('Zone').locator('summary').click();
  await expect(menu('Treatment')).not.toHaveAttribute('open', '');
  await menu('Zone').getByRole('checkbox', { name: 'A', exact: true }).check();
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await menu('Columns').locator('summary').click();
  await expect(page.locator('.table-filter[open]')).toHaveCount(1);
  await expect(menu('Zone')).not.toHaveAttribute('open', '');
  await menu('Columns').locator('summary').click();
  await expect(table.locator('tbody input[type=checkbox]')).toHaveCount(0);
  let row = (await table.locator('tbody tr').first().boundingBox())!;
  expect(row.height).toBe(40);
  await page.getByRole('button', { name: 'Compact rows', exact: true }).click();
  row = (await table.locator('tbody tr').first().boundingBox())!;
  expect(row.height).toBe(32);
  await page.goto('/sensors');
  const sensors = page.getByRole('table', { name: 'sensors', exact: true });
  await expect(sensors.locator('tbody tr')).toHaveCount(10);
  await page
    .getByRole('combobox', { name: 'Rows per page for sensors', exact: true })
    .selectOption('25');
  await expect(sensors.locator('tbody tr')).toHaveCount(25);
  await page.goto('/batches');
  const batches = page.getByRole('table', { name: 'batches', exact: true });
  await expect(batches.locator('tbody tr')).toHaveCount(3);
  expect((await batches.locator('tbody tr').first().boundingBox())!.height).toBe(40);
  await page.getByRole('button', { name: 'Compact rows', exact: true }).click();
  expect((await batches.locator('tbody tr').first().boundingBox())!.height).toBe(32);
});
test('sensor assets are grouped and the wide detail drawer sits beside the register', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/sensors');
  await expect(page.locator('.asset-group summary')).toHaveText(/Houses/);
  await expect(page.locator('.asset-group')).not.toHaveAttribute('open', '');
  await page.getByRole('searchbox', { name: 'Search sensor assets', exact: true }).fill('A01-D');
  await expect(page.locator('.asset-list')).toContainText('1 input');
  await expect(page.locator('.asset-list')).not.toContainText('1 inputs');
  await page.getByRole('searchbox', { name: 'Search sensor assets', exact: true }).fill('');
  const table = page.getByRole('table', { name: 'sensors', exact: true });
  await table.locator('tbody tr').first().locator('.row-open').click();
  const drawer = (await page.getByRole('dialog').boundingBox())!,
    register = (await page.locator('.sensor-workspace .master-content').boundingBox())!;
  expect(register.x + register.width).toBeLessThan(drawer.x);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('fault tabs, status lifecycle and record-specific history remain usable', async ({ page }) => {
  await page.goto('/faults');
  await expect(page.locator('select[aria-label^="Status for"]').first()).toBeVisible();
  const statuses = await page
    .locator('select[aria-label^="Status for"]')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLSelectElement).value));
  expect(new Set(statuses).size).toBeGreaterThan(1);
  await page.getByRole('tab', { name: 'Rules', exact: true }).click();
  await expect(page.getByRole('table', { name: 'fault rules', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'faults', exact: true })).not.toBeVisible();
  await page.getByRole('tab', { name: 'Faults', exact: true }).click();
  await page
    .getByRole('table', { name: 'faults', exact: true })
    .locator('tbody tr')
    .first()
    .getByRole('button')
    .first()
    .click();
  await page.getByLabel('Optional note', { exact: true }).fill('Inlet checked from the surface');
  await page.getByRole('button', { name: 'Mark inspected', exact: true }).click();
  await page.getByText('Audit trail (1)', { exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('moved to Inspected');
  await expect(page.getByRole('dialog')).toContainText('Inlet checked from the surface');
});
test('one clock and honest trial counts replace contradictory seed dates', async ({ page }) => {
  await page.goto('/trials');
  await expect(
    page
      .getByRole('table', { name: 'trials', exact: true })
      .locator('tbody tr')
      .filter({ has: page.getByRole('button', { name: 'T2', exact: true }) }),
  ).toContainText('Overdue');
  await expect(page.locator('.trial-comparison')).toContainText('3 marked points · 24 re-tests');
  await expect(page.locator('.trial-comparison')).not.toContainText('n =');
  await expect(page.locator('.trial-comparison .before-after')).toHaveCount(3);
  await expect(
    page.getByRole('heading', { name: 'Allocate mature compost', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Allocate mature compost', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const data = await page.evaluate(async () => {
    const m = await import('/src/api/mock/index.ts');
    return (await m.mockRequest('/config')) as { dataThrough: string };
  });
  expect(Math.abs(Date.now() - Date.parse(data.dataThrough))).toBeLessThan(300000);
});
