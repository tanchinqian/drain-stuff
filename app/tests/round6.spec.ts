import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

for (const featureId of ['S1', 'S3', 'I1', 'T1'])
  test('Round 6 ' + featureId + ' agreement and captures', async ({ page }) => {
    test.setTimeout(900000);
    page.setDefaultTimeout(30000);
    await mkdir('test-results/captures/round6', { recursive: true });
    const errors: string[] = [],
      metrics: unknown[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /shader|WebGL|THREE/i.test(message.text())) {
        errors.push(message.text());
        console.log(message.text());
      }
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/feature/' + featureId);
    const timeline = page.getByRole('slider', { name: 'Storm timeline', exact: true });
    await expect(timeline).toBeEnabled({ timeout: 60000 });
    for (const id of [featureId]) {
      await page.goto('/feature/' + id);
      await expect(timeline).toBeEnabled({ timeout: 60000 });
      const run = await page.evaluate(async (id) => {
        const url = performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .filter((url) => /\/simulation\/physics\/store\.ts(?:\?|$)/.test(url)).at(-1)!;
        const { useSimulation } = await import(url);
        const run = useSimulation.getState().runs[id];
        const peak = run.frames.reduce(
          (a, b) =>
            b.ponding > a.ponding || (b.ponding === a.ponding && b.flux.inlet > a.flux.inlet)
              ? b
              : a,
          run.frames[0],
        );
        return {
          frames: run.frames.map((f) => ({ second: f.second, rain: f.rain, flux: { overflow: f.flux.overflow } })),
          computeMs: run.computeMs,
          peak: peak.second,
          duration: run.config.values.duration.value,
          maxLedgerError: Math.max(...run.frames.map((f) => f.relativeError)),
          soilBytes: run.frames.reduce(
            (sum, f) =>
              sum + (f.soil?.theta.byteLength ?? 0) + (f.soil?.saturation.byteLength ?? 0),
            0,
          ),
        };
      }, id);
      const { frames: sampledFrames, ...summary } = run;
      metrics.push({ id, ...summary });
      for (const [label, second] of [
        ['zero', 0],
        ['mid-rise', Math.floor(run.peak / 120) * 60],
        ['peak', run.peak],
        ['after-two-hours', run.duration + 7200],
      ] as const) {
        await timeline.fill(String(Math.round(second / 60)));
        for (const view of ['Assembled', 'Cutaway']) {
          await page.getByRole('button', { name: view, exact: true }).click();
          await page.locator('.cad-scene').scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          const scene = page.locator('.cad-scene');
          await expect(scene).toHaveAttribute('data-frame-second', String(second));
          const ponding = Number(await scene.getAttribute('data-ponding-mm')) / 1000;
          const rendered = Number(await scene.getAttribute('data-water-surface-height'));
          expect(Math.abs(rendered - ponding)).toBeLessThanOrEqual(0.001);
          expect(
            Math.abs(
              Number(await scene.getAttribute('data-pipe-fill')) -
                Number(await scene.getAttribute('data-rendered-pipe-fill')),
            ),
          ).toBeLessThanOrEqual(0.01);
          const frame = sampledFrames.filter((f) => f.second <= second).at(-1)!;
          if (frame.rain === 0) expect(Number(await scene.getAttribute('data-rain-count'))).toBe(0);
          expect(await scene.getAttribute('data-overflow-visible')).toBe(
            String(frame.flux.overflow > 0),
          );
          await page.screenshot({
            clip: (await scene.boundingBox())!,
            path: `test-results/captures/round6/${id}-${label}-${view === 'Assembled' ? '3d' : 'section'}.png`,
          });
        }
      }
      await page.getByRole('button', { name: 'Jump to peak water', exact: true }).click();
      await page.getByRole('checkbox', { name: '2D section', exact: true }).check();
      await page
        .locator('.model-card > .physics-section')
        .screenshot({ path: `test-results/captures/round6/${id}-peak-2d.png` });
      await page.getByRole('checkbox', { name: '2D section', exact: true }).uncheck();
      if (id === 'I1') {
        await page.getByRole('button', { name: 'Debug', exact: true }).click();
        for (const [axis, cut] of [['X', '1'], ['Y', '0.1']] as const) {
          await page.locator('[aria-label="Section axis"]').getByRole('button', { name: axis, exact: true }).click();
          await page.getByRole('slider', { name: 'Section cut position', exact: true }).fill(cut);
          await page.locator('.cad-scene').scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await page.screenshot({ clip: (await page.locator('.cad-scene').boundingBox())!, path: `test-results/captures/round6/I1-peak-section-${axis}.png` });
        }
      }
      await writeFile(
        'test-results/captures/round6/' + featureId + '-metrics.json',
        JSON.stringify({ metrics, errors }, null, 2),
      );
    }
    if (featureId === 'S1') {
      await expect(timeline).toBeEnabled({ timeout: 60000 });
      await page.getByRole('button', { name: 'Jump to peak water', exact: true }).click();
      await page.locator('.cad-scene').scrollIntoViewIfNeeded();
      const fps = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let count = 0;
            const start = performance.now();
            setTimeout(() => resolve((count * 1000) / (performance.now() - start)), 5000);
            const frame = () => {
              count++;
              if (performance.now() - start >= 4000)
                resolve((count * 1000) / (performance.now() - start));
              else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
          }),
      );
      metrics.push({
        headlessRafFps1440: fps,
        renderFps: await page.evaluate(
          () => document.querySelector<HTMLElement>('[data-render-fps]')?.dataset.renderFps ?? null,
        ),
        quality: await page.locator('.cad-scene').getAttribute('data-quality'),
      });
      await page.getByRole('button', {name:'Debug',exact:true}).click();
      await page.getByRole('checkbox', { name: 'Low quality', exact: true }).check();
      await expect(page.locator('.cad-scene')).toHaveAttribute('data-quality', 'low');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.getByRole('button', { name: 'Play storm', exact: true })).toHaveCount(0);
      await page.getByRole('link', { name: 'Storm settings', exact: true }).click();
      await page.getByRole('slider', { name: 'Tailwater level', exact: true }).fill('0.5');
      await expect(timeline).toBeEnabled({ timeout: 60000 });
      await expect(page.locator('.physics-playback')).toContainText(
        'Tailwater 0.50 m: outfall submerged',
      );
    }
    await writeFile(
      'test-results/captures/round6/' + featureId + '-metrics.json',
      JSON.stringify({ metrics, errors }, null, 2),
    );
    expect(errors).toEqual([]);
  });
