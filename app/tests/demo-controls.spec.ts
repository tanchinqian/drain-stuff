import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('demo controls stay hidden normally, open on request, and hide for recording until a demo reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Demo controls' })).toHaveCount(0);
  await page.goto('/?demo=1');
  const panel = page.getByRole('region', { name: 'Demo controls' });
  await expect(panel).toBeVisible();
  const axe = await new AxeBuilder({ page }).include('.demo-controls').analyze();
  expect(axe.violations).toEqual([]);
  await panel.getByRole('button', { name: 'Hide for recording' }).click();
  await expect(panel).toHaveCount(0);
  await page.keyboard.press('Control+Shift+D');
  await expect(panel).toHaveCount(0);
  await page.goto('/?demo=1');
  await expect(page.getByRole('region', { name: 'Demo controls' })).toBeVisible();
});

test('diagnosis button uses cached deterministic matching without a diagnosis request', async ({ page }) => {
  let diagnosisRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/ai/diagnose')) diagnosisRequests += 1;
  });
  await page.goto('/?demo=1');
  await page.locator('[data-demo-action="4"]').click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByText('Suggested diagnosis')).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Accept' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Edit' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Reject' })).toBeVisible();
  expect(diagnosisRequests).toBe(0);
});

test('demo 3D button opens S1 in the requested cutaway and camera state', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.locator('[data-demo-action="3"]').click();
  const model = page.locator('[data-demo-replay="true"]');
  await expect(model).toBeVisible({ timeout: 30000 });
  await expect(model.getByRole('button', { name: 'Cutaway', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(model.getByLabel('Camera preset')).toHaveValue('Drain');
});

test('demo lifecycle records the demo actor and opens its audit trail', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.getByRole('region', { name: 'Demo controls' })).toBeVisible();
  await page.keyboard.press('5');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Advanced F-001 to assign. Demo entry recorded.')).toBeVisible();
  await page.keyboard.press('6');
  const audit = page.getByRole('dialog').locator('.record-history');
  await expect(audit).toHaveAttribute('open', '');
  await expect(audit.getByText('Demo operator')).toBeVisible();
});

test('reset and buttons 2–7 replay the seeded walkthrough twice', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?demo=1');

  for (let take = 0; take < 2; take += 1) {
    await page.locator('[data-demo-action="1"]').click();
    await expect(page.getByText('Seeded browser demo state restored.')).toBeVisible();

    await page.locator('[data-demo-action="2"]').click();
    await expect(page.locator('[data-demo-asset="S1"][data-demo-fixable="true"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('[data-demo-asset="S2"][data-demo-capacity-limited="true"]')).toBeVisible();

    await page.locator('[data-demo-action="3"]').click();
    const model = page.locator('[data-demo-replay="true"]');
    await expect(model).toBeVisible({ timeout: 30_000 });
    await expect(model.getByRole('button', { name: 'Cutaway', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await page.locator('[data-demo-action="4"]').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Suggested diagnosis')).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Accept' })).toBeEnabled();
    await expect(drawer.getByRole('button', { name: 'Edit' })).toBeEnabled();
    await expect(drawer.getByRole('button', { name: 'Reject' })).toBeEnabled();

    for (const next of ['assign', 'clear', 'verify', 'close']) {
      await page.keyboard.press('5');
      await expect(page.getByText(`Advanced F-001 to ${next}. Demo entry recorded.`)).toBeVisible({ timeout: 15_000 });
    }

    await page.keyboard.press('6');
    const audit = page.getByRole('dialog').locator('.record-history');
    await expect(audit).toHaveAttribute('open', '');
    await expect(audit.getByText('Demo operator').first()).toBeVisible();

    await page.keyboard.press('7');
    await expect(page).toHaveURL(/\/$|\/?demo=1$/);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  }
});

test('demo panel remains usable at recording widths', async ({ page }) => {
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/?demo=1');
    await expect(page.getByRole('region', { name: 'Demo controls' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Heavy storm, run/ })).toBeVisible();
    const sections = page.getByRole('navigation', { name: 'Page sections' });
    await expect(sections.getByRole('link', { name: 'Storm setup' })).toBeVisible();
    await expect(sections.getByRole('link', { name: 'Overview' })).toHaveCount(0);
  }
});

test('chatbot demo opens the seeded S1 assistant without sending a message', async ({ page }) => {
  let chatRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/fault-chat')) chatRequests += 1;
  });
  await page.goto('/?demo=1');
  await page.locator('[data-demo-action="8"]').click();
  const assistant = page.getByRole('dialog', { name: 'Fault assistant' });
  await expect(assistant).toBeVisible();
  await expect(assistant.getByText('Selected fault: F-001 / Part: inlet')).toBeVisible();
  await expect(assistant.getByText(/Local Ollama|Could not connect|Connecting to local Ollama/)).toBeVisible();
  await expect(assistant.getByRole('button', { name: /What sensor and fault issues are recorded for S1/ })).toBeVisible();
  expect(chatRequests).toBe(0);
});
