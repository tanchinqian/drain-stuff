import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
const output = '../docs/screens/round9c';
for (const asset of ['S1', 'R1'])
  test('Round 9C final frames and performance ' + asset, async ({ page, browserName }) => {
    test.setTimeout(180000);
    await mkdir(output, { recursive: true });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && /THREE|shader|WebGL/i.test(m.text())) errors.push(m.text());
    });
    await page.goto('/feature/' + asset);
    const clock = page.getByRole('slider', { name: 'Storm timeline', exact: true }),
      scene = page.locator('.cad-scene');
    await expect(clock).toBeEnabled({ timeout: 60000 });
    const times = await page.evaluate(async (asset) => {
      const path = '/src/simulation/physics/store.ts';
      const { useSimulation } = await import(path);
      const run = useSimulation.getState().runs[asset];
      return {
        start:
          run.frames.find((f: { rain: number; second: number }) => f.rain > 0 && f.second > 0)
            ?.second ?? 60,
        mid: run.config.values.duration.value * 0.4,
        peak: run.frames.reduce(
          (
            a: { ponding: number; flux: { inlet: number } },
            b: { ponding: number; flux: { inlet: number } },
          ) =>
            b.ponding > a.ponding || (b.ponding === a.ponding && b.flux.inlet > a.flux.inlet)
              ? b
              : a,
          run.frames[0],
        ).second,
        after: run.config.values.duration.value + 7200,
      };
    }, asset);
    const captures: unknown[] = [];
    for (const [name, second] of Object.entries(times)) {
      await clock.fill(String(Math.round(Number(second) / 60)));
      for (const view of ['Assembled', 'Cutaway']) {
        await page.getByRole('button', { name: view, exact: true }).click();
        await scene.scrollIntoViewIfNeeded();
        await page.waitForTimeout(800);
        await scene.screenshot({
          path: `${output}/${asset}-${name}-${view.toLowerCase()}-${browserName}.png`,
        });
        const data = await scene.evaluate((el: HTMLElement) => ({ ...el.dataset }));
        captures.push({ name, view, ...data });
        expect(Number(data.surfaceBedError)).toBeLessThan(0.03);
        expect(Number(data.surfaceReferenceError)).toBeLessThan(0.001);
      }
    }
    await clock.fill(String(Math.round(times.mid / 60)));
    await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
    await scene.scrollIntoViewIfNeeded();
    await page.waitForTimeout(6000);
    const samples = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1000);
      samples.push(
        await scene.evaluate((el: HTMLElement) => ({
          ...el.dataset,
          fps: el.querySelector('canvas')?.dataset.renderFps,
        })),
      );
    }
    const gpu = await scene.locator('canvas').evaluate((c) => {
      const gl = (c as HTMLCanvasElement).getContext('webgl2')!;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: info
          ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
        vendor: info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      };
    });
    const fps = samples.map((s) => Number(s.fps)).filter(Number.isFinite),
      mean = fps.reduce((a, b) => a + b, 0) / fps.length;
    await writeFile(
      `${output}/${asset}-${browserName}-metrics.json`,
      JSON.stringify({ gpu, meanFps: mean, samples, captures, errors }, null, 2),
    );
    expect(fps.length).toBeGreaterThan(0);
    expect(mean).toBeGreaterThanOrEqual(45);
    const axe = await new AxeBuilder({ page }).include('.model-workspace').analyze();
    expect(axe.violations).toEqual([]);
    expect(errors).toEqual([]);
  });

for (const asset of ['S1', 'R1'])
  test('Round 9C 25 second storm recording ' + asset, async ({ page, browserName }) => {
    test.skip(process.env.ROUND9C_RECORD !== '1');
    test.setTimeout(90000);
    await mkdir(output, { recursive: true });
    await page.goto('/feature/' + asset);
    const clock = page.getByRole('slider', { name: 'Storm timeline', exact: true }),
      scene = page.locator('.cad-scene');
    await expect(clock).toBeEnabled({ timeout: 60000 });
    await page.getByRole('button', { name: 'Debug', exact: true }).click();
    await page.getByRole('combobox', { name: 'Render quality', exact: true }).fill('Record');
    await page.getByRole('option', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Operator', exact: true }).click();
    await expect(scene).toHaveAttribute('data-quality', 'record');
    await clock.fill('1');
    await page.getByRole('button', { name: 'Cutaway', exact: true }).click();
    const speed = page.getByRole('combobox', { name: 'Playback speed', exact: true });
    await speed.fill('300x');
    await page.getByRole('option', { name: '300x', exact: true }).click();
    await scene.scrollIntoViewIfNeeded();
    await scene.locator('canvas').evaluate((canvas) => {
      const stream = (canvas as HTMLCanvasElement).captureStream(30),
        mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm;codecs=vp8';
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 }),
        chunks: Blob[] = [];
      const ready = new Promise<string>((resolve) => {
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.readAsDataURL(new Blob(chunks, { type: 'video/webm' }));
          stream.getTracks().forEach((t) => t.stop());
        };
      });
      (window as unknown as { round9cRecording: unknown }).round9cRecording = { recorder, ready };
      recorder.start();
    });
    await page.getByRole('button', { name: 'Play storm', exact: true }).click();
    const progression: { second: number; ponding: number; pipeFill: number; jet: boolean }[] = [];
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(1000);
      progression.push(
        await scene.evaluate((el: HTMLElement) => ({
          second: Number(el.dataset.frameSecond),
          ponding: Number(el.dataset.pondingMm),
          pipeFill: Number(el.dataset.renderedPipeFill),
          jet: el.dataset.jetVisible === 'true',
        })),
      );
    }
    const encoded = await page.evaluate(async () => {
      const r = (
        window as unknown as {
          round9cRecording: { recorder: MediaRecorder; ready: Promise<string> };
        }
      ).round9cRecording;
      r.recorder.stop();
      return await r.ready;
    });
    const bytes = Buffer.from(encoded, 'base64');
    expect(bytes.length).toBeGreaterThan(30000);
    await writeFile(`${output}/${asset}-storm-${browserName}.webm`, bytes);
    const preview = await page.evaluate(async (encoded) => {
      const video = document.createElement('video');
      video.muted = true;
      video.src = 'data:video/webm;base64,' + encoded;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Recording could not be decoded'));
      });
      if (!Number.isFinite(video.duration)) {
        const end = new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });
        video.currentTime = 1e10;
        await end;
      }
      video.currentTime = 12;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let min = 255,
        max = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        min = Math.min(min, pixels[i]);
        max = Math.max(max, pixels[i]);
      }
      return {
        png: canvas.toDataURL('image/png').split(',')[1],
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        contrast: max - min,
      };
    }, encoded);
    expect(preview.duration).toBeGreaterThanOrEqual(20);
    expect(preview.duration).toBeLessThanOrEqual(30);
    expect(preview.contrast).toBeGreaterThan(50);
    await writeFile(`${output}/${asset}-recording-frame.png`, Buffer.from(preview.png, 'base64'));
    const { png, ...videoInfo } = preview;
    await writeFile(
      `${output}/${asset}-recording.json`,
      JSON.stringify({ ...videoInfo, quality: 'Record', speed: 300, progression }, null, 2),
    );

    expect(Number(await scene.getAttribute('data-frame-second'))).toBeGreaterThan(6000);
    if (asset === 'S1') expect(Math.max(...progression.map((p) => p.ponding))).toBeGreaterThan(1);
    else expect(progression.some((p) => p.pipeFill > 0 && p.jet)).toBe(true);
  });
