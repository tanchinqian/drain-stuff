import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const pass = process.env.ROUND9_PASS ?? 'pass1';
const output = '../docs/screens/round9/' + pass;
for (const id of ['S1', 'R1'])
  test('Round 9 scenes, engine agreement, camera matrix and GPU ' + id, async ({ page }) => {
    test.setTimeout(300000);
    await mkdir(output, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && /shader|WebGL|THREE/i.test(m.text())) errors.push(m.text());
    });
    await page.goto('/feature/' + id);
    const timeline = page.getByRole('slider', { name: 'Storm timeline', exact: true }),
      scene = page.locator('.cad-scene');
    await expect(timeline).toBeEnabled({ timeout: 60000 });
    const state = await page.evaluate(async (id) => {
      const url = performance
        .getEntriesByType('resource')
        .map((r) => r.name)
        .filter((s) => /\/simulation\/physics\/store\.ts(?:\?|$)/.test(s))
        .at(-1)!;
      const { useSimulation } = await import(url),
        run = useSimulation.getState().runs[id];
      const peak = run.frames.reduce(
        (a, b) =>
          b.ponding > a.ponding || (b.ponding === a.ponding && b.flux.inlet > a.flux.inlet) ? b : a,
        run.frames[0],
      );
      return {
        peak: peak.second,
        peakRain: run.frames.reduce((a, b) => (b.rain > a.rain ? b : a), run.frames[0]).second,
        duration: run.config.values.duration.value,
        frames: run.frames.map((f) => ({
          second: f.second,
          rain: f.rain,
          ponding: f.ponding,
          fill: f.pipeFill,
          velocity: f.pipeVelocity,
          flux: f.flux,
          residual: f.balanceResidual,
          cumulative: f.cumulative,
          storage: f.storage,
        })),
      };
    }, id);
    const metrics: unknown[] = [];
    for (const [label, second] of [
      ['zero', 0],
      ['mid-rise', Math.floor(state.peak / 120) * 60],
      ['peak', state.peak],
      ['after-two-hours', state.duration + 7200],
    ] as const) {
      await timeline.fill(String(Math.round(second / 60)));
      const f = state.frames.find((f) => f.second === Math.round(second / 60) * 60)!;
      for (const preset of ['Overview', 'Drain', 'Inlet']) {
        const select = page.getByRole('combobox', { name: 'Camera preset', exact: true });
        await select.fill(preset);
        await page.getByRole('option', { name: preset, exact: true }).click();
        for (const view of ['Cutaway', 'Assembled']) {
          await page.getByRole('button', { name: view, exact: true }).click();
          await scene.scrollIntoViewIfNeeded();
          await page.waitForTimeout(550);
          await expect(scene).toHaveAttribute('data-frame-second', String(f.second));
          await expect
            .poll(async () =>
              Math.abs(Number(await scene.getAttribute('data-water-surface-height')) - f.ponding),
            )
            .toBeLessThanOrEqual(0.001);
          await expect
            .poll(async () =>
              Math.abs(Number(await scene.getAttribute('data-rendered-pipe-fill')) - f.fill),
            )
            .toBeLessThanOrEqual(0.01);
          await expect
            .poll(async () => scene.getAttribute('data-jet-visible'))
            .toBe(String(f.flux.outfall > 0));
          await expect
            .poll(async () => scene.getAttribute('data-spill-visible'))
            .toBe(String(f.flux.overflow > 0));
          if (!f.rain) {
            await expect(scene).toHaveAttribute('data-rain-count', '0');
            await expect.poll(async () => scene.getAttribute('data-mist-visible')).toBe('false');
          }
          await expect(scene.locator('.scene-design-stamp')).toHaveText(
            'Typical design, not surveyed',
          );
          await scene.screenshot({
            path: `${output}/${id}-${label}-${preset.toLowerCase()}-${view.toLowerCase()}.png`,
          });
        }
      }
      for (const [name, q] of [
        [id === 'R1' ? 'Outlet' : 'Outfall', f.flux.outfall],
        [id === 'R1' ? 'Bypass' : 'Overflow', f.flux.overflow],
        ['Inlet', f.flux.inlet],
      ] as const) {
        expect(
          Number(await page.locator(`[data-flow-stage="${name}"]`).getAttribute('data-rate')),
        ).toBeCloseTo(q * 60000, 8);
      }
      expect(
        Number(await page.locator('[data-ledger-residual]').getAttribute('data-ledger-residual')),
      ).toBeCloseTo(f.residual, 10);
      const flows = JSON.parse((await scene.getAttribute('data-flow-elements')) ?? '{}');
      if (f.flux.inlet === 0) expect(flows['gutter-flow']).toBeUndefined();
      metrics.push({
        label,
        frame: f,
        scene: await scene.evaluate((el: HTMLElement) => ({ ...el.dataset })),
      });
    }
    await page.getByRole('button', { name: 'Return to default', exact: true }).click();
    await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
    await timeline.fill(String(Math.round(state.peakRain / 60)));
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    await scene.scrollIntoViewIfNeeded();
    const gpu = await scene.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
      const gl = canvas.getContext('webgl2')!,
        ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        webgl2: gl instanceof WebGL2RenderingContext,
      };
    });
    const performance: unknown[] = [];
    for (const quality of ['Adaptive', 'Record']) {
      const picker = page.getByRole('combobox', { name: 'Render quality', exact: true });
      await picker.fill(quality);
      await page.getByRole('option', { name: quality, exact: true }).click();
      await page.waitForTimeout(12500);
      const data = await scene.evaluate((el: HTMLElement) => ({
        ...el.dataset,
        renderFps: el.querySelector('canvas')?.dataset.renderFps,
      }));
      performance.push({ preset: quality, ...gpu, ...data });
      if (!/swiftshader|software|llvmpipe/i.test(gpu.renderer) && quality === 'Adaptive') {
        expect(Number(data.renderFps)).toBeGreaterThanOrEqual(45);
        expect(Number(data.drawCalls)).toBeLessThanOrEqual(460);
      }
    }
    await writeFile(
      `${output}/${id}-metrics.json`,
      JSON.stringify({ gpu, performance, metrics, errors }, null, 2),
    );
    expect(errors).toEqual([]);
  });
for (const width of [390, 1440, 1920])
  test('Round 9 cut controls and accessibility ' + width, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/feature/S1');
    await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    const cut = page.getByRole('slider', { name: 'Section cut position', exact: true }),
      scene = page.locator('.cad-scene');
    await expect(cut).toBeVisible();
    await cut.fill('0.24');
    await expect(scene).toHaveAttribute('data-cut-position', '0.24');
    const readout = page.locator('.cut-readouts');
    expect(Number(await readout.getAttribute('data-cut-water-depth'))).toBeCloseTo(
      Number(await scene.getAttribute('data-ponding-mm')) / 1000,
      8,
    );
    expect(Number(await readout.getAttribute('data-cut-pipe-fill'))).toBeCloseTo(
      Number(await scene.getAttribute('data-pipe-fill')),
      8,
    );
    await expect
      .poll(async () => Number(await scene.getAttribute('data-plane-position')))
      .toBeCloseTo(0.24, 8);
    const zoom = await scene.locator('canvas').getAttribute('data-camera-zoom');
    await cut.focus();
    await page.keyboard.press('ArrowRight');
    await expect(cut).toHaveValue('0.25');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(cut).toHaveValue('0.35');
    await page.keyboard.press('Home');
    expect(Number(await cut.inputValue())).toBe(Number(await cut.getAttribute('min')));
    await page.keyboard.press('End');
    expect(Number(await cut.inputValue())).toBe(Number(await cut.getAttribute('max')));
    await expect(scene.locator('canvas')).toHaveAttribute('data-camera-zoom', zoom!);
    await cut.fill('0.24');
    if (width === 1440) {
      await cut.focus();
      await scene.scrollIntoViewIfNeeded();
      const drag = JSON.parse((await scene.getAttribute('data-cut-plane-screen')) ?? 'null'),
        box = await scene.locator('canvas').boundingBox();
      expect(drag).toBeTruthy();
      expect(box).toBeTruthy();
      const length = Math.hypot(drag.dx, drag.dy);
      await page.mouse.move(box!.x + drag.x, box!.y + drag.y);
      await page.mouse.down();
      await page.mouse.move(
        box!.x + drag.x + (drag.dx / length) * 25,
        box!.y + drag.y + (drag.dy / length) * 25,
        { steps: 8 },
      );
      await page.mouse.up();
      await expect
        .poll(async () => Math.abs(Number(await cut.inputValue()) - 0.24))
        .toBeGreaterThan(0.01);
      await cut.fill('0.24');
    }
    await page.getByRole('checkbox', { name: '2D section', exact: true }).check();
    await expect(
      page.locator('.model-card > .physics-section [data-section-cut-position]'),
    ).toHaveAttribute('data-section-cut-position', '0.24');
    expect(
      await page
        .locator('[data-section-cut-position]')
        .evaluateAll((nodes) =>
          nodes.every((n) => n.getAttribute('data-section-cut-position') === '0.24'),
        ),
    ).toBe(true);
    await page
      .locator('[aria-label="Section axis"]')
      .getByRole('button', { name: 'Z', exact: true })
      .click();
    await cut.fill('-0.2');
    await expect(
      page.locator('.model-card > .physics-section [data-section-cut-axis]'),
    ).toHaveAttribute('data-section-cut-axis', 'Z');
    await page.reload();
    await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    await expect(cut).toHaveValue('-0.2');
    await expect(page.locator('.cad-scene')).toHaveAttribute('data-cut-axis', 'Z');
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
      [],
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
test('Round 9 I1 sediment has no invented minimum and uses the entered depth', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/feature/I1');
  await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
    timeout: 60000,
  });
  const geometry = await page.evaluate(async () => {
    const { createInletGeometry } = await import('/src/three/physicsGeometry.ts'),
      { featureConfig } = await import('/src/simulation/physics/config.ts');
    const c = featureConfig('I1');
    c.values.sediment.value = 0;
    const empty = createInletGeometry(c).pretreat!.children.length;
    c.values.sediment.value = 0.08;
    const g = createInletGeometry(c),
      m = g.pretreat!.getObjectByName('chamber-sediment');
    m.geometry.computeBoundingBox();
    return { empty, height: m.geometry.boundingBox.max.y - m.geometry.boundingBox.min.y };
  });
  expect(geometry.empty).toBe(0);
  expect(geometry.height).toBeCloseTo(0.08, 6);
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .map((r) => r.name)
      .filter((s) => /\/simulation\/physics\/store\.ts(?:\?|$)/.test(s))
      .at(-1)!;
    const { useSimulation } = await import(url);
    useSimulation.getState().parameter('I1', 'sediment', 0.08);
  });
  await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
    timeout: 60000,
  });
  await page.locator('.cad-scene').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-scene-label="sediment"]')).toContainText('Sediment 80 mm');
  await mkdir(output, { recursive: true });
  await page.locator('.cad-scene').screenshot({ path: output + '/I1-entered-sediment.png' });
});
for (const id of ['S1', 'R1'])
  test('Round 9 Record storm frames ' + id, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/feature/' + id);
    await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    await page.getByRole('combobox', { name: 'Render quality', exact: true }).fill('Record');
    await page.getByRole('option', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Operator', exact: true }).click();
    const scene = page.locator('.cad-scene');
    await scene.scrollIntoViewIfNeeded();
    const dir = `test-results/round9-video/${id}`;
    await mkdir(dir, { recursive: true });
    await page.evaluate(async () => {
      const url = performance
        .getEntriesByType('resource')
        .map((r) => r.name)
        .filter((s) => /\/simulation\/physics\/store\.ts(?:\?|$)/.test(s))
        .at(-1)!;
      const { useSimulation } = await import(url);
      useSimulation.setState({ second: 0, speed: 600, playing: true });
    });
    const frames: { time: number; second: string | null }[] = [];
    for (let i = 0; i < 24; i++) {
      await scene.screenshot({ path: `${dir}/${String(i).padStart(3, '0')}.png` });
      frames.push({ time: Date.now(), second: await scene.getAttribute('data-frame-second') });
      await page.waitForTimeout(100);
    }
    await page.getByRole('button', { name: 'Pause storm', exact: true }).click();
    await writeFile(`${dir}/timing.json`, JSON.stringify(frames, null, 2));
    expect(Number(frames.at(-1)!.second)).toBeGreaterThan(Number(frames[0].second));
  });
