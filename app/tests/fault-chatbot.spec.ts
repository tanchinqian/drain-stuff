import { test, expect } from '@playwright/test';

test.use({ baseURL: process.env.STAGE_A_APP_URL || 'http://127.0.0.1:5192' });
const answer = {
  answer: 'F-001 records an inlet obstruction finding. A sensor reading alone does not prove the cause; review the recorded inspection.',
  sources: [{ id: 'F-001', kind: 'fault', label: 'F-001 · S1 · blockage' }], model: 'llama3.2:latest',
  contextAt: '2026-10-19T00:00:00+08:00', context: { faults: 11, sensors: 219, detailedSensors: 32, assetId: 'S1' },
};
test('Feature chatbot carries diagnosis context and follow-ups, with case references and fault navigation', async ({ page }) => {
  const requests: { messages: { role: string; content: string }[]; assetId: string; faultId: string; partId: string; diagnosisId?: string }[] = [];
  await page.route('**/api/v1/ai/fault-chat/status', route => route.fulfill({ json: { available: true, model: 'llama3.2:latest' } }));
  await page.route('**/api/v1/ai/fault-chat', async route => { requests.push(route.request().postDataJSON()); await route.fulfill({ json: answer }); });
  await page.goto('/feature/S1?part=inlet');
  await expect(page.getByLabel('Selected part AI diagnosis').getByRole('button', {name: 'Refresh', exact: true})).toBeEnabled();
  await page.getByRole('button', { name: 'Ask a follow-up', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Fault assistant', exact: true });
  await expect(chat).toContainText('Selected fault: F-001');
  const question = chat.getByRole('textbox', { name: 'Question about faults and sensors', exact: true });
  await question.fill('Why was F-001 raised?');
  await chat.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(chat.locator('.fault-chat-message.assistant')).toHaveCount(1);
  expect(requests[0].assetId).toBe('S1');
  expect(requests[0].faultId).toBe('F-001');
  expect(requests[0].partId).toBe('inlet');
  expect(requests[0].diagnosisId).toBeTruthy();
  expect(requests[0].messages).toEqual([{ role: 'user', content: 'Why was F-001 raised?' }]);
  await question.fill('Which check should I review?');
  await question.press('Enter');
  await expect(chat.locator('.fault-chat-message.assistant')).toHaveCount(2);
  expect(requests[1].messages.map(message => message.role)).toEqual(['user', 'assistant', 'user']);
  await page.unroute('**/api/v1/ai/fault-chat');
  await page.route('**/api/v1/ai/fault-chat', route => route.fulfill({json: {...answer, sources: [{id: 'CASE-INLET-1', kind: 'case', label: 'CASE-INLET-1'}]}}));
  await question.fill('Show me a similar case');
  await question.press('Enter');
  await chat.getByRole('button', {name: 'CASE-INLET-1', exact: true}).click();
  const reference = page.getByRole('dialog', {name: 'CASE-INLET-1', exact: true});
  await expect(reference).toContainText('no verified field repair outcome');
  await expect(reference).toContainText('Worked example only');
  await expect(reference.getByRole('link', {name: 'Open original source'})).toBeVisible();
  await page.keyboard.press('Escape');
  await chat.locator('.fault-chat-sources').first().getByRole('button', { name: 'F-001', exact: true }).click();
  await expect(page).toHaveURL(/faults\?fault=F-001/);
  await expect(page.getByRole('dialog', { name: /F-001/ })).toBeVisible();
  await expect(page.getByRole('button', {name: 'Open fault assistant', exact: true})).toHaveCount(0);
});

test('unavailable Ollama and failed answers are explicit and a retry does not duplicate conversation messages', async ({ page }) => {
  await page.route('**/api/v1/ai/fault-chat/status', route => route.fulfill({ json: { available: false, model: 'test', message: 'Ollama is not reachable.' } }));
  await page.goto('/feature');
  await page.getByRole('button', { name: 'Open fault assistant', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Fault assistant', exact: true });
  await expect(chat).toContainText('Ollama is not reachable.');
  await expect(chat.getByRole('button', { name: 'Send question', exact: true })).toBeDisabled();
  await page.unroute('**/api/v1/ai/fault-chat/status');
  await page.route('**/api/v1/ai/fault-chat/status', route => route.fulfill({ json: { available: true, model: 'test' } }));
  await chat.getByRole('button', { name: 'Retry connection', exact: true }).click();
  await expect(chat).toContainText('Local Ollama is ready');
  let attempt = 0;
  await page.route('**/api/v1/ai/fault-chat', async route => {
    attempt++;
    if (attempt === 1) await route.fulfill({ status: 503, json: { error: { message: 'Ollama could not answer this question. Try again.' } } });
    else { expect(route.request().postDataJSON().messages).toHaveLength(1); await route.fulfill({ json: answer }); }
  });
  const question = chat.getByRole('textbox', { name: 'Question about faults and sensors', exact: true });
  await question.fill('Explain F-001');
  await chat.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(chat.getByRole('alert')).toContainText('Try again');
  await expect(question).toHaveValue('Explain F-001');
  await chat.getByRole('button', { name: 'Send question', exact: true }).click();
  await expect(chat.locator('.fault-chat-message.assistant')).toHaveCount(1);
});

test('About is removed and the corner chat fits the mobile viewport', async ({ page }) => {
  await page.route('**/api/v1/ai/fault-chat/status', route => route.fulfill({ json: { available: true, model: 'test' } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('navigation', { name: 'Console pages' }).getByRole('link', { name: 'About', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Limits', exact: true })).toHaveCount(0);
  await page.goto('/feature');
  await page.getByRole('button', { name: 'Open fault assistant', exact: true }).click();
  const box = await page.getByRole('dialog', { name: 'Fault assistant', exact: true }).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
