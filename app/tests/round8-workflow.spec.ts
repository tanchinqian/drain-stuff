import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { encodeUplink } from '../../shared/src/iot';
const simSecret = 'round8b-isolated-simulator-key';
const headers = {};
test.use({
  baseURL: process.env.ROUND8_APP_URL || 'http://127.0.0.1:5175',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args: ['--use-angle=d3d11'],
  },
});
async function post(page: Page, path: string, data: unknown) {
  const r = await page.request.post('/api/v1' + path, { headers, data });
  const body = await r.json();
  expect(r.ok(), JSON.stringify(body)).toBe(true);
  return body;
}
async function runBoard(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set the storm to compare' })).toBeVisible({
    timeout: 30000,
  });
  await page.getByLabel('Check ranking under ±25%').uncheck();
  await page.getByRole('button', { name: 'Run storm', exact: true }).click();
  await expect(page.locator('.triage-register .triage-row')).toHaveCount(5, { timeout: 150000 });
  await expect(page.getByRole('button', { name: 'Run storm', exact: true })).toBeEnabled({
    timeout: 150000,
  });
  return page.evaluate(
    () => JSON.parse(sessionStorage.getItem('drain-triage')!).state.jobId as string,
  );
}
test('Round 8 full workflow, real API, replay, devices and responsive accessibility', async ({
  page,
}) => {
  test.setTimeout(360000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('test-results/captures/round8', { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Set the storm to compare' })).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({ path: 'test-results/captures/round8/board-before.png', fullPage: true });
  let jobId = await runBoard(page);
  await expect(page.locator('.triage-row').filter({ hasText: 'S2' })).toContainText(
    'Capacity-limited: escalate to owner',
  );
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/captures/round8/desktop.png', fullPage: true });
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  await writeFile('test-results/captures/round8/axe-board.json', JSON.stringify(axe.violations, null, 2));
  expect(axe.violations).toEqual([]);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/captures/round8/desktop-1920.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/captures/round8/mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Clear only the isolated verification database's prior S1 fixture faults.
  const existing = await (await page.request.get('/api/v1/faults', { headers })).json();
  for (const f of existing.filter(
    (f: { featureId: string; type: string; status: string }) =>
      f.featureId === 'S1' && f.type === 'blockage' && f.status !== 'closed',
  )) {
    let current = f.workOrder?.state ?? 'detected';
    if (current === 'detected') {
      await post(page, '/faults/' + f.id + '/confirm', { note: 'Isolated setup' });
      current = 'confirmed';
    }
    if (current === 'confirmed') {
      await post(page, '/faults/' + f.id + '/assign', {
        note: 'Isolated setup',
        assignee: 'Fixture crew',
      });
      current = 'assigned';
    }
    if (current === 'assigned') {
      await post(page, '/faults/' + f.id + '/clear', { note: 'Isolated setup' });
      current = 'cleared';
    }
    if (current === 'cleared')
      await post(page, '/faults/' + f.id + '/verify', {
        note: 'Isolated reference',
        evidence: { type: 'sensor', sensorId: 'S1-INF-P1', value: 13, unit: 'mm/h' },
      });
    await post(page, '/faults/' + f.id + '/close', { note: 'Isolated setup complete' });
  }
  await post(page, '/faults', {
    featureId: 'S1',
    partId: 'inlet',
    type: 'blockage',
    severity: 2,
    note: 'Visible inlet debris recorded for isolated workflow check',
    user: 'Browser check',
  });
  const all = await (await page.request.get('/api/v1/faults', { headers })).json(),
    fault = all
      .filter(
        (f: { featureId: string; raisedBy: string }) =>
          f.featureId === 'S1' && f.raisedBy === 'manual',
      )
      .at(-1);
  jobId = await runBoard(page);
  const before = await (await page.request.get('/api/v1/storm-runs/' + jobId, { headers })).json();
  expect(
    before.result.rows.find((r: { asset: string }) => r.asset === 'S1').asInstalled.summary
      .overflowM3,
  ).toBe(0);
  await page.goto('/faults?fault=' + fault.id);
  const panel = page.getByRole('dialog');
  await panel
    .getByRole('textbox', { name: 'Required note' })
    .fill('Obstruction independently confirmed');
  await panel.getByRole('button', { name: 'Confirm fault', exact: true }).click();
  await expect(panel.locator('[aria-current=step]')).toHaveText('Confirmed');
  jobId = await runBoard(page);
  const after = await (await page.request.get('/api/v1/storm-runs/' + jobId, { headers })).json();
  expect(
    after.result.rows.find((r: { asset: string }) => r.asset === 'S1').asInstalled.summary
      .overflowM3,
  ).toBeGreaterThan(0.4);
  await page.goto('/faults?fault=' + fault.id);
  await panel.getByLabel('Crew or contractor').fill('North maintenance crew');
  await panel.getByRole('textbox', { name: 'Required note' }).fill('Clearance assigned');
  await panel.getByRole('button', { name: 'Assign crew', exact: true }).click();
  await expect(panel.locator('[aria-current=step]')).toHaveText('Assigned');
  await panel.getByRole('textbox', { name: 'Required note' }).fill('Cleared under local procedure');
  await panel.getByRole('button', { name: 'Record cleared', exact: true }).click();
  await expect(panel.locator('[aria-current=step]')).toHaveText('Cleared');
  await panel
    .getByRole('textbox', { name: 'Required note' })
    .fill('Compare original storm without this obstruction');
  await panel.getByRole('button', { name: 'Verify clearance', exact: true }).click();
  await expect(panel.locator('[aria-current=step]')).toHaveText('Verified', { timeout: 180000 });
  await expect(panel).toContainText('Verification re-run: overflow');
  await page.screenshot({ path: 'test-results/captures/round8/work-order-verified.png', fullPage: true });
  await panel
    .getByRole('textbox', { name: 'Required note' })
    .fill('Evidence reviewed and accepted');
  await panel.getByRole('button', { name: 'Close work order', exact: true }).click();
  await expect(panel.locator('[aria-current=step]')).toHaveText('Closed');
  const diag = page.locator('.diagnosis-panel');
  await expect(diag).toContainText('Matched from cases', { timeout: 30000 });
  await expect(diag).toContainText('Cited evidence');
  await diag.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(diag).toContainText('Recorded in the audit log');
  await page.screenshot({ path: 'test-results/captures/round8/diagnosis.png', fullPage: true });
  await expect(diag.getByRole('button',{name:'Accept',exact:true})).toBeDisabled();
  await page.goto('/faults?asset=S2&escalate=1');
  await page.getByRole('textbox', { name: 'Owner / recipient' }).fill('Township owner');
  await page
    .getByRole('textbox', { name: 'Evidence and required note' })
    .fill('Capacity remains insufficient after clearing');
  await page.getByRole('button', { name: 'Record escalation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Township owner · recorded' })).toBeVisible();
  await page.screenshot({ path: 'test-results/captures/round8/capacity-escalation.png', fullPage: true });
  const id = randomBytes(8).toString('hex');
  await page.goto('/sensors');
  await page.getByRole('button', { name: 'Register device', exact: true }).click();
  await page.getByRole('textbox', { name: 'Device EUI' }).fill(id);
  await page.getByRole('combobox', { name: 'Device asset' }).fill('R1');
  await page.getByRole('option', { name: 'R1', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Highest measured / overflow level (m)' })
    .fill('0.45');
  await page.getByRole('checkbox', { name: 'I recorded two tape-measure' }).check();
  await page.getByRole('button', { name: 'Record commissioning', exact: true }).click();
  await expect(page.locator('.device-form')).not.toBeVisible({ timeout: 15000 });
  const payload = Buffer.from(
    encodeUplink({
      flags: 1,
      offsetMinutes: 0,
      distanceMm: 500,
      temperatureC: 29,
      batteryMv: 3300,
      counter: 1,
    }),
  ).toString('base64');
  const r = await page.request.post('/api/v1/ingest/lorawan', {
    headers: { 'X-Ingest-Key': simSecret },
    data: {
      end_device_ids: { dev_eui: id },
      uplink_message: { frm_payload: payload },
      received_at: new Date().toISOString(),
    },
  });
  expect(r.ok()).toBe(true);
  const detected = await (await page.request.get('/api/v1/faults', { headers })).json();
  expect(
    detected
      .filter((f: { sensorIds: string[] }) => f.sensorIds.includes('DEV-' + id))
      .every((f: { workOrder: { state: string } }) => f.workOrder.state === 'detected'),
  ).toBe(true);
  await page.goto('/sensors?sensor=DEV-' + id);
  await expect(page.getByRole('dialog')).toContainText('Ultrasonic level', { timeout: 15000 });
  await expect(page.getByRole('dialog')).toContainText('50');
  await page.screenshot({ path: 'test-results/captures/round8/device-reading.png', fullPage: true });
  await page.goto('/feature/R1?stormRunId=' + jobId + '&part=inlet');
  await expect(page.locator('.cad-scene .scene-design-stamp')).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator('.cad-scene canvas')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(page.locator('.model-workspace')).toContainText('DEV-' + id);
  await expect(page.getByRole('button', { name: 'Play storm', exact: true })).toBeEnabled({
    timeout: 180000,
  });
  const timeline = page.getByRole('slider', { name: 'Storm timeline', exact: true });
  await timeline.focus();
  await timeline.press('Home');
  for (let minute = 0; minute < 20; minute++) await timeline.press('ArrowRight');
  await expect(page.locator('.physics-playback')).toHaveAttribute('data-model-minute', '20');
  await page.screenshot({ path: 'test-results/captures/round8/typical-roadside.png', fullPage: true });
  await page.getByRole('button', { name: 'If cleared', exact: true }).click();
  await expect(page.getByRole('button', { name: 'If cleared', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('checkbox', { name: '2D section', exact: true }).check();
  await expect(
    page.getByRole('img', { name: 'R1 inlet section; dimensions from model parameters' }),
  ).toBeVisible();
  await page.goto('/materials');
  await expect(
    page.getByRole('heading', { name: 'Materials and trial', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('No re-tests recorded yet', { exact: true })).toHaveCount(3);
  await page.screenshot({ path: 'test-results/captures/round8/materials.png', fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});
