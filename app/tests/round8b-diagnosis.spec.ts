import {test,expect} from '@playwright/test';

for(const choice of ['accept','edit','reject'] as const) test('diagnosis auto retrieval, unique numbered steps and '+choice+' feedback',async({page})=>{
  await page.goto('/faults?fault=F-001');
  const panel=page.locator('.diagnosis-panel');
  await expect(panel.getByRole('button',{name:'Accept',exact:true})).toBeEnabled();
  const ids=await panel.locator('[data-step-id]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.stepId));
  expect(ids.length).toBeGreaterThan(0);expect(new Set(ids).size).toBe(ids.length);
  expect(await panel.locator('.diagnosis-steps').evaluate(el=>getComputedStyle(el).listStyleType)).toBe('decimal');
  await panel.getByRole('button',{name:choice[0].toUpperCase()+choice.slice(1),exact:true}).click();
  if(choice!=='accept') {
    const save=panel.getByRole('button',{name:choice==='edit'?'Save edited steps':'Record rejection',exact:true});
    await expect(save).toBeDisabled();await panel.getByLabel('Required review reason').fill('Independent review of this draft');await save.click();
  }
  await expect(panel).toContainText('Recorded in the audit log');
  await expect(panel.getByRole('button',{name:'Accept',exact:true})).toBeDisabled();
  await page.getByRole('dialog').locator('.record-history summary').click();
  await expect(page.getByRole('dialog').locator('.record-history')).toContainText('Diagnosis '+choice);
  await panel.locator(':scope > summary').click();await panel.locator(':scope > summary').click();
  await expect(panel).toContainText('Recorded in the audit log');
});

test('insufficient evidence gives an explicit amber state and no ranked steps',async({page})=>{
  await page.goto('/faults?fault=F-002');
  const panel=page.locator('.diagnosis-panel');
  await expect(panel).toContainText('Not enough information');
  await expect(panel.locator('.insufficient')).toHaveCount(2);
  await expect(panel.locator('.diagnosis-steps li')).toHaveCount(0);
});
