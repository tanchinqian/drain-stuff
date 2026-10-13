import { test, expect } from '@playwright/test';
import site from '../src/site/bandar-bukit-raja.json' with { type: 'json' };
import { mkdir } from 'node:fs/promises';

test('trial pins are clickable and radar clouds preserve map-house controls', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 360, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const id of ['S1', 'S2', 'S3']) {
      await page.goto('/');
      const pin = page
        .locator('.scene')
        .getByRole('button', { name: new RegExp('^Open ' + id + ' ') });
      await expect(pin).toBeVisible();
      const bounds = await pin.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      await pin.click();
      await expect(page).toHaveURL(new RegExp('/feature/' + id));
    }
    await page.goto('/');
    await page.getByLabel('Cloud opacity', { exact: true }).fill('75');
    await expect(page.locator('.neighbourhood-scene')).toHaveAttribute('data-cloud-opacity', '75');
    await page.getByRole('button', { name: 'Water after 6 h', exact: true }).click();
    await expect(page.locator('.neighbourhood-scene')).toHaveAttribute('data-cloud-opacity', '0');
    await page.getByRole('button', { name: 'Rainfall', exact: true }).click();
    const footprint = site.houses.find(
      (h) =>
        !Object.values(site.pilots).includes(h.id) && h.x > -15 && h.x < -10 && h.z > 8 && h.z < 12,
    )!;
    const housePoint = async () => {
      const scene = page.locator('.neighbourhood-scene');
      await scene.scrollIntoViewIfNeeded();
      const a = await scene.getByRole('button', { name: /^Open S1 / }).boundingBox();
      const b = await scene.getByRole('button', { name: /^Open S2 / }).boundingBox();
      const c = await scene.getByRole('button', { name: /^Open S3 / }).boundingBox();
      const u = (footprint.x + 22) / 32,
        v = (footprint.z + 11 - u) / 23;
      const bounds = await scene.boundingBox();
      const zoom = Math.min(bounds!.width / 73, bounds!.height / 50);
      return {
        x:
          a!.x +
          a!.width / 2 +
          u * (b!.x + b!.width / 2 - a!.x - a!.width / 2) +
          v * (c!.x + c!.width / 2 - a!.x - a!.width / 2),
        y:
          a!.y +
          a!.height / 2 +
          u * (b!.y + b!.height / 2 - a!.y - a!.height / 2) +
          v * (c!.y + c!.height / 2 - a!.y - a!.height / 2) +
          0.98 * zoom * 0.718,
      };
    };
    if (viewport.width === 1440) {
      const p = await housePoint();
      await page.mouse.click(p.x, p.y);
      await expect(page.getByRole('region', { name: 'Selected mapped house' })).toContainText(
        footprint.id,
      );
      await page.getByRole('button', { name: 'Move houses', exact: true }).click();
      const drag = await housePoint();
      await page.mouse.move(drag.x, drag.y);
      await page.mouse.down();
      await page.mouse.move(drag.x + 30, drag.y + 12, { steps: 8 });
      await page.mouse.up();
      await expect(
        page
          .getByRole('region', { name: 'Selected mapped house' })
          .getByLabel('House X position', { exact: true }),
      ).not.toHaveValue(String(Number((footprint.x * 20).toFixed(1))));
    }
    await page.getByLabel('Select a mapped house', { exact: true }).selectOption(footprint.id);
    const record = page.getByRole('region', { name: 'Selected mapped house' });
    await expect(record).toContainText('no pilot readings');
    await record.getByLabel('House X position', { exact: true }).fill('123');
    await expect(record.getByLabel('House X position', { exact: true })).toHaveValue('123');
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    await expect(record.getByLabel('House X position', { exact: true })).toHaveValue(
      String(Number((footprint.x * 20).toFixed(1))),
    );
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await expect(page.locator('.plan-svg [data-house-id]')).toHaveCount(589);
    await mkdir('../.impeccable/review', { recursive: true });
    if (viewport.width === 1440) {
      const pins = await page.locator('.plan-svg g[aria-label^="Open feature"]').all();
      const boxes = await Promise.all(pins.map((pin) => pin.boundingBox()));
      expect(boxes).toHaveLength(6);
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!,
            b = boxes[j]!;
          expect(
            a.x < b.x + b.width &&
              a.x + a.width > b.x &&
              a.y < b.y + b.height &&
              a.y + a.height > b.y,
          ).toBe(false);
        }
      const target = page.locator('.plan-svg [data-house-id="' + footprint.id + '"]');
      const before = await target.locator('polygon').getAttribute('points');
      await record.getByLabel('House X position', { exact: true }).fill('123');
      await expect(target.locator('polygon')).not.toHaveAttribute('points', before!);
      await page
        .locator('.plan-svg')
        .screenshot({ path: '../.impeccable/review/plan-desktop.png' });
    }
    await page.getByRole('link', { name: /S1 · Pilot swale/ }).click();
    await expect(page).toHaveURL(/\/feature\/S1/);
  }
  expect(errors).toEqual([]);
});
