import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('Round 9C GPU surface solver preserves a still lake', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /THREE|shader|WebGL/i.test(m.text())) errors.push(m.text());
  });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/tests/gpuSurfaceHarness.ts';
    const { verifyGpuSurface } = await import(path);
    return verifyGpuSurface();
  });
  expect(result.finite).toBe(true);
  expect(result.nonnegative).toBe(true);
  expect(result.drift).toBeLessThan(0.00001);
  expect(result.motion).toBeLessThan(0.00001);
  expect(result.volumeError).toBeLessThan(0.001);
  expect(result.frontError).toBeLessThan(0.001);
  expect(result.frontPositive).toBe(true);
  expect(errors).toEqual([]);
});
for (const backend of ['gpu', 'worker'])
  test('Round 9C surface reconciliation ' + backend, async ({ page }) => {
    test.setTimeout(120000);
    if (backend === 'worker')
      await page.addInitScript(() => {
        const original = WebGL2RenderingContext.prototype.getExtension;
        WebGL2RenderingContext.prototype.getExtension = function (name: string) {
          return name === 'EXT_color_buffer_float' ? null : original.call(this, name);
        };
      });
    await page.goto('/feature/S1');
    const scene = page.locator('.cad-scene'),
      clock = page.getByRole('slider', { name: 'Storm timeline', exact: true });
    await expect(clock).toBeEnabled({ timeout: 60000 });
    for (const minute of [0, 18, 45, 165]) {
      await clock.fill(String(minute));
      await expect(scene).toHaveAttribute(
        'data-surface-backend',
        backend === 'gpu' ? 'WebGL2 float' : 'CPU worker',
      );
      await expect
        .poll(async () => Number(await scene.getAttribute('data-surface-bed-error')))
        .toBeLessThan(0.03);
      await expect
        .poll(async () => Number(await scene.getAttribute('data-surface-gutter-error')))
        .toBeLessThan(0.03);
      await expect
        .poll(async () => Number(await scene.getAttribute('data-surface-reference-error')))
        .toBeLessThan(0.001);
    }
  });
test('Round 9C perspective and orthographic stay bounded with a terrace row', async ({ page }) => {
  await page.goto('/feature/S1');
  const scene = page.locator('.cad-scene');
  await expect(scene).toHaveAttribute('data-camera-type', 'PerspectiveCamera', { timeout: 60000 });
  expect(Number(await scene.getAttribute('data-house-count'))).toBeGreaterThanOrEqual(3);
  const canvas = scene.locator('canvas');
  await canvas.hover();
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 400);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-camera-zoom')))
    .toBeGreaterThan(0.3);
  await page.getByRole('checkbox', { name: 'Orthographic view', exact: true }).check();
  await expect(scene).toHaveAttribute('data-camera-type', 'OrthographicCamera');
  await page.getByRole('checkbox', { name: 'Orthographic view', exact: true }).uncheck();
  await expect(scene).toHaveAttribute('data-camera-type', 'PerspectiveCamera');
});
for (const asset of ['S1', 'R1'])
  test('Round 9C roof and drain flow ' + asset, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && /THREE|shader|WebGL/i.test(m.text())) errors.push(m.text());
    });
    await page.goto('/feature/' + asset);
    const clock = page.getByRole('slider', { name: 'Storm timeline', exact: true });
    await expect(clock).toBeEnabled({ timeout: 60000 });
    await clock.fill('18');
    await page.getByRole('checkbox', { name: 'Roof runoff path', exact: true }).check();
    if (asset === 'R1')
      await expect(
        page.getByText('No roof connected in this scenario', { exact: false }),
      ).toBeVisible();
    else await expect(page.getByText(/m² roof · .* L\/min at each step/)).toBeVisible();
    await page
      .locator('.cad-scene')
      .screenshot({ path: `../docs/screens/round9c/${asset}-connected-flow.png` });
    expect(errors).toEqual([]);
  });
for (const asset of ['S1', 'R1'])
  test('Round 9C confirmed fault cues clear after verification ' + asset, async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/feature/' + asset);
    await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    await page.evaluate(async (asset) => {
      const path = '/src/api/mock/seed.ts',
        { generateMock } = await import(path),
        db = generateMock();
      db.faults = [];
      db.faults.push({
        id: 'F-001',
        featureId: asset,
        partId: 'inlet',
        type: 'blockage',
        ruleId: 'inlet_debris',
        sensorIds: [],
        sensorStatusesAtAlert: {},
        diagnosingInput: 'Leaves obstructing the grate',
        severity: 3,
        openedAt: new Date().toISOString(),
        status: 'open',
        zone: 'A',
        workOrder: { state: 'confirmed' },
      });
      localStorage.setItem('drain-trial-console-v1', JSON.stringify(db));
    }, asset);
    await page.reload();
    const scene = page.locator('.cad-scene');
    await expect(scene.locator('[data-fault-badge="F-001"]')).toBeVisible({ timeout: 60000 });
    await expect(scene.locator('[data-fault-badge="F-001"]')).toHaveAttribute(
      'data-confirmed',
      'true',
    );
    await expect
      .poll(async () => Number(await scene.getAttribute('data-fault-tint-count')))
      .toBeGreaterThan(0);
    await expect
      .poll(async () => Number(await scene.getAttribute('data-fault-obstruction-count')))
      .toBeGreaterThan(0);
    await expect.poll(() => scene.getAttribute('data-outline-parts')).toContain('inlet');
    await page.getByRole('button', { name: 'Show fault', exact: true }).click();
    await expect(scene).toHaveAttribute('data-camera-preset', 'fault');
    await expect(page.getByRole('region', { name: 'Selected fault explanation' })).toContainText(
      'road side',
    );
    await mkdir('../docs/screens/round9c', { recursive: true });
    await scene.screenshot({ path: `../docs/screens/round9c/${asset}-confirmed-fault.png` });
    await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('drain-trial-console-v1')!);
      db.faults.find((f: { id: string }) => f.id === 'F-001').workOrder.state = 'verified';
      localStorage.setItem('drain-trial-console-v1', JSON.stringify(db));
    });
    await page.reload();
    await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    await expect(scene.locator('[data-fault-badge="F-001"]')).toHaveCount(0);
    await expect.poll(() => scene.getAttribute('data-fault-tint-count')).toBe('0');
    await expect.poll(() => scene.getAttribute('data-fault-obstruction-count')).toBe('0');
    await expect.poll(() => scene.getAttribute('data-fault-outlines')).toBe('0');
  });
test('Round 9C opens in rain and allows a paused dry state', async ({ page }) => {
  await page.goto('/feature/S1');
  const timeline = page.getByRole('slider', { name: 'Storm timeline', exact: true }),
    scene = page.locator('.cad-scene');
  await expect(timeline).toBeEnabled({ timeout: 60000 });
  await expect(page.getByRole('button', { name: 'Pause storm', exact: true })).toBeVisible();
  await expect(scene.locator('.scene-rain-status')).toContainText('mm/h');
  expect(Number(await scene.getAttribute('data-rain-count'))).toBeGreaterThan(0);
  await expect(page.locator('[aria-label="Storm events"] button')).toHaveCount(4);
  await timeline.fill('90');
  await expect(scene.locator('.scene-rain-status')).toHaveText('Rain stopped');
  await expect(scene).toHaveAttribute('data-rain-count', '0');
  await expect(page.getByRole('button', { name: 'Play storm', exact: true })).toBeVisible();
});
for (const id of ['S1', 'R1'])
  test('Round 9C section scope and thirty axis changes ' + id, async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('/feature/' + id);
    const clock = page.getByRole('slider', { name: 'Storm timeline', exact: true });
    await expect(clock).toBeEnabled({ timeout: 60000 });
    await clock.fill('18');
    const scene = page.locator('.cad-scene'),
      cut = page.getByRole('slider', { name: 'Section cut position', exact: true });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && /THREE|shader|WebGL/i.test(m.text())) errors.push(m.text());
    });
    let seed = 913;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 30; i++) {
      const axis = (['X', 'Y', 'Z'] as const)[Math.floor(random() * 3)];
      await page
        .locator('[aria-label="Section axis"]')
        .getByRole('button', { name: axis, exact: true })
        .click();
      const min = Number(await cut.getAttribute('min')),
        max = Number(await cut.getAttribute('max'));
      await cut.fill(String(Number((min + (max - min) * (0.05 + random() * 0.9)).toFixed(2))));
      await expect.poll(() => scene.getAttribute('data-active-planes')).toBe('1');
      await expect(scene).toHaveAttribute('data-context-clipped', '0');
      expect(Number(await scene.getAttribute('data-assembly-clipped'))).toBeGreaterThan(5);
    }
    await page.getByRole('checkbox', { name: '2D section', exact: true }).check();
    for (const axis of ['X', 'Y', 'Z']) {
      await page
        .locator('[aria-label="Section axis"]')
        .getByRole('button', { name: axis, exact: true })
        .click();
      const min = Number(await cut.getAttribute('min')),
        max = Number(await cut.getAttribute('max'));
      for (let i = 0; i < 10; i++) {
        await cut.fill(String(Number((min + ((max - min) * (i + 0.5)) / 10).toFixed(2))));
        const svg = page.locator('.model-card > .physics-section svg');
        await expect(svg).toHaveAttribute('data-section-cut-axis', axis);
        expect(await svg.locator('path,rect,circle,ellipse').count()).toBeGreaterThan(4);
        if (axis === 'Z') await expect(svg.locator('[data-depth-plan]')).toBeVisible();
      }
    }
    await page.getByRole('checkbox', { name: '2D section', exact: true }).uncheck();
    await page.getByRole('button', { name: 'Reset cut', exact: true }).click();
    await expect.poll(() => scene.getAttribute('data-active-planes')).toBe('0');
    await mkdir('../docs/screens/round9c', { recursive: true });
    await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
    await scene.screenshot({ path: `../docs/screens/round9c/${id}-section-stage0a.png` });
    expect(errors).toEqual([]);
  });

test('Round 9C swale headwall has a clear pipe port', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const geometryPath = '/src/three/physicsGeometry.ts',
      configPath = '/src/simulation/physics/config.ts',
      threePath = '/node_modules/.vite/deps/three.js';
    const { createSwaleGeometry } = await import(geometryPath),
      { featureConfig } = await import(configPath),
      { Raycaster, Vector3 } = await import(threePath);
    const c = featureConfig('S1'),
      wall = createSwaleGeometry(c).outfall.getObjectByName('outfall-headwall');
    wall.updateWorldMatrix(true, false);
    const center = wall.position.clone();
    center.y -= 0.2;
    const ray = new Raycaster(new Vector3(center.x - 1, center.y, 0), new Vector3(1, 0, 0));
    const port = ray.intersectObject(wall, false).length;
    ray.ray.origin.y += 0.3;
    return { port, wall: ray.intersectObject(wall, false).length };
  });
  expect(result.port).toBe(0);
  expect(result.wall).toBeGreaterThan(0);
});
