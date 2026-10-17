import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
// Explicit hardware pass on Windows; portable captures remain in round7.spec.ts.
test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args: ['--use-angle=d3d11'],
  },
});
for (const [id, width] of [
  ['S1', 1440],
  ['S1', 720],
  ['S2', 720],
] as const)
  test(`Round 7 GPU ${id} ${width}`, async ({ page }) => {
    test.skip(process.platform !== 'win32', 'Direct3D11 hardware measurement requires Windows');
    test.setTimeout(90000);
    await mkdir('test-results/captures/round7', { recursive: true });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/feature/' + id);
    await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled({
      timeout: 60000,
    });
    await page.getByRole('button', { name: 'Jump to peak water', exact: true }).click();
    await page.getByRole('slider', { name: 'Storm timeline', exact: true }).fill('20');
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    await page.locator('.cad-scene').scrollIntoViewIfNeeded();
    const renderer = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
      const gl = canvas.getContext('webgl2')!,
        ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    });
    test.skip(/swiftshader|software|llvmpipe/i.test(renderer), 'Hardware GPU unavailable');
    await page.waitForTimeout(10000);
    const rafFps = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let count = 0;
          const start = performance.now();
          const frame = () => {
            count++;
            const elapsed = performance.now() - start;
            if (elapsed >= 4000) resolve((count * 1000) / elapsed);
            else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        }),
    );
    const metrics = {
      id,
      width,
      height: 1000,
      renderer,
      rafFps,
      renderFps: await page.locator('canvas').getAttribute('data-render-fps'),
      scene: await page.locator('.cad-scene').evaluate((el: HTMLElement) => ({ ...el.dataset })),
    };
    await page
      .locator('.cad-scene')
      .screenshot({ path: `test-results/captures/round7/${id}-${width}-gpu.png` });
    await writeFile(
      `test-results/captures/round7/${id}-${width}-gpu.json`,
      JSON.stringify(metrics, null, 2),
    );
    expect(Number(metrics.renderFps)).toBeGreaterThan(0);
    if (id === 'S2') {
      await page.getByRole('button', { name: 'Operator', exact: true }).click();
      await page.goto('/feature/S2?part=mulch');
      await expect(page.getByRole('slider', { name: 'Storm timeline', exact: true })).toBeEnabled();
      // A click on the visible model part picker activates inspection on narrow screens.
      await page.getByRole('button', { name: 'Troubleshoot', exact: true }).click();
      await expect
        .poll(async () => page.locator('.cad-scene').getAttribute('data-outline-clipped'))
        .toBe('true');
      await expect(page.locator('[data-scene-label="inlet"]')).toContainText('L/min');
      await page
        .locator('.cad-scene')
        .screenshot({ path: 'test-results/captures/round7/S2-720-troubleshoot.png' });
    }
    if (id === 'S1' && width === 1440) {
      await page.getByRole('button', { name: 'Operator', exact: true }).click();
      for (const [name, minute] of [
        ['zero', 0],
        ['mid-rise', 24],
        ['peak', 48],
        ['after-two-hours', 165],
      ] as const) {
        await page
          .getByRole('slider', { name: 'Storm timeline', exact: true })
          .fill(String(minute));
        for (const view of ['Cutaway', 'Assembled']) {
          await page.getByRole('button', { name: view, exact: true }).click();
          await page
            .locator('.cad-scene')
            .screenshot({ path: `test-results/captures/round7/S1-${name}-${view.toLowerCase()}.png` });
        }
      }
      await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
      await mkdir('node_modules/.cache/round7-video', { recursive: true });
      await page.evaluate(async () => {
        const url = performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .filter((s) => /\/simulation\/physics\/store\.ts(?:\?|$)/.test(s))
          .at(-1)!;
        const { useSimulation } = await import(url);
        useSimulation.setState({ second: 0, speed: 600, playing: true });
      });
      const timing: number[] = [];
      for (let i = 0; i < 36; i++) {
        timing.push(Date.now());
        await page
          .locator('.cad-scene')
          .screenshot({ path: `node_modules/.cache/round7-video/${i}.png` });
        await page.waitForTimeout(160);
      }
      await page.getByRole('button', { name: 'Pause storm', exact: true }).click();
      await writeFile('node_modules/.cache/round7-video/timing.json', JSON.stringify(timing));
    }
  });
