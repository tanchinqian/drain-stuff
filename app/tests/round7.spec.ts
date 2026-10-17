import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
if (process.env.ROUND7_HARDWARE_GPU === '1')
  test.use({
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ['--use-angle=d3d11'],
    },
  });
for (const id of ['S1', 'I1', 'S3', 'T1'])
  test('Round 7 visibility ' + id, async ({ page }) => {
    test.setTimeout(150000);
    await mkdir('test-results/captures/round7', { recursive: true });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && /shader|WebGL|THREE/i.test(m.text())) errors.push(m.text());
    });
    await page.setViewportSize({ width: id === 'T1' || id === 'S3' ? 720 : 1440, height: 1000 });
    await page.goto('/feature/' + id);
    const timeline = page.getByRole('slider', { name: 'Storm timeline', exact: true });
    await expect(timeline).toBeEnabled({ timeout: 60000 });
    const state = await page.evaluate(async (id) => {
      const { frontDepth } = await import('/src/three/visibility.ts');
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
        duration: run.config.values.duration.value,
        width: run.config.values.width.value,
        frames: run.frames.map((f) => ({
          front: frontDepth(f.soil, run.config.values.mediaDepth.value),
          second: f.second,
          rain: f.rain,
          inlet: f.flux.inlet,
          outfall: f.flux.outfall,
          overflow: f.flux.overflow,
          sample100mm: f.soil
            ? f.soil.saturation[
                Math.min(f.soil.nz - 1, Math.floor(0.1 / f.soil.dz)) * f.soil.nx +
                  Math.floor(f.soil.nx / 2)
              ]
            : null,
        })),
      };
    }, id);
    await page.locator('.cad-scene').scrollIntoViewIfNeeded();
    await expect
      .poll(async () => page.locator('.cad-scene').getAttribute('data-fault-outlines'))
      .toBe('0');
    const projectedWidth = Number(
      await page.locator('.cad-scene').getAttribute('data-projected-width'),
    );
    expect(projectedWidth).toBeGreaterThanOrEqual(0.6);
    const captures = id === 'S1' || id === 'I1';
    const metrics: unknown[] = [];
    for (const [name, second] of [
      ['zero', 0],
      ['mid-rise', Math.floor(state.peak / 120) * 60],
      ['peak', state.peak],
      ['after-two-hours', state.duration + 7200],
    ] as const) {
      await timeline.fill(String(Math.round(second / 60)));
      const f = state.frames.find((f) => f.second === Math.round(second / 60) * 60)!;
      await expect(page.locator('.cad-scene')).toHaveAttribute(
        'data-frame-second',
        String(f.second),
      );
      await expect
        .poll(async () => page.locator('.cad-scene').getAttribute('data-jet-visible'))
        .toBe(String(f.outfall > 0));
      await expect
        .poll(async () => page.locator('.cad-scene').getAttribute('data-spill-visible'))
        .toBe(String(f.overflow > 0));
      if (!f.rain) await expect(page.locator('.cad-scene')).toHaveAttribute('data-rain-count', '0');
      const rects = await page.locator('[data-scene-label] rect').evaluateAll((items) =>
        items.map((item) => {
          const r = item.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
      expect(rects.length).toBeLessThanOrEqual(3);
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i],
            b = rects[j];
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true);
        }
      metrics.push({
        name,
        frame: f,
        scene: await page.locator('.cad-scene').evaluate((el: HTMLElement) => ({ ...el.dataset })),
      });
      if (captures) {
        await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
        await page
          .locator('.cad-scene')
          .screenshot({ path: `test-results/captures/round7/${id}-${name}-cutaway.png` });
        await page.getByRole('button', { name: 'Assembled', exact: true }).click();
        await page
          .locator('.cad-scene')
          .screenshot({ path: `test-results/captures/round7/${id}-${name}-assembled.png` });
        await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
      }
    }
    if (id !== 'I1') {
      const end = state.frames.find((f) => f.second >= state.duration)!;
      expect(end.sample100mm!).toBeGreaterThan(state.frames[0].sample100mm!);
    }
    if (id === 'S1') {
      await timeline.fill(String(Math.round(state.peak / 60)));
      await page.locator('.storm-disclosure > summary').click();
      await page.getByRole('combobox', {name:'Simulation scenario',exact:true}).fill('Clogged sock');
      await page.getByRole('option', {name:'Clogged sock',exact:true}).click();
      await expect(timeline).toBeEnabled({timeout:60000});
      await timeline.fill('25');
      await page
        .locator('.part-list')
        .getByRole('button', { name: 'Compost filter sock', exact: true })
        .click();
      await expect
        .poll(async () => page.locator('.cad-scene').getAttribute('data-fault-outlines'))
        .toBe('1');
    }
    await page.getByRole('button', { name: 'Jump to peak water', exact: true }).click();
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    await expect(page.locator('.scene-performance')).toBeVisible();
    await expect
      .poll(async () => Number(await page.locator('canvas').getAttribute('data-render-fps')))
      .toBeGreaterThan(0);
    const hardware = await page.locator('canvas').evaluate((el: HTMLCanvasElement) => {
      const gl = el.getContext('webgl2')!,
        ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        fps: el.dataset.renderFps,
        userAgent: navigator.userAgent,
      };
    });
    const duringRain = state.frames.filter((f) => f.second <= state.duration);
    const frontRecedes = duringRain.some(
      (f, i) => i > 0 && f.front + 0.001 < duringRain[i - 1].front,
    );
    expect(frontRecedes).toBe(false);
    await writeFile(
      `test-results/captures/round7/${id}-metrics.json`,
      JSON.stringify(
        { projectedWidth, hardware, frontNonDecreasingDuringRain: !frontRecedes, metrics, errors },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  });
