import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('shared drawer closes outside, traps focus, restores focus and blocks page scroll', async ({page}) => {
  await page.goto('/faults');
  const opener=page.getByRole('button',{name:'F-001',exact:true});
  await opener.click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('aria-modal','true');
  await expect(dialog.getByRole('button',{name:/^Close F-001/})).toBeFocused();
  const top=await page.evaluate(()=>scrollY);
  await page.mouse.move(20,200); await page.mouse.wheel(0,600);
  expect(await page.evaluate(()=>scrollY)).toBe(top);
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
  await dialog.getByRole('button',{name:/^Close F-001/}).press('Shift+Tab');
  expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.mouse.click(10,200);
  await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  await opener.click(); await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
});

test('mobile Back and dirty-text dismissal use the same drawer guard',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/faults');
  await page.getByRole('button',{name:'Report a fault',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Description',{exact:true}).fill('Keep this inspection draft');
  page.once('dialog',d=>d.dismiss()); await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  page.once('dialog',d=>d.accept()); await page.goBack();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
});

test('fault layout shows status, note helper, six lifecycle stages and sticky next action',async({page})=>{
  await page.goto('/faults?fault=F-002');
  const dialog=page.getByRole('dialog');
  await expect(dialog.locator('.workflow-steps li')).toHaveCount(6);
  await expect(dialog).toContainText('Add a note to confirm.');
  const action=dialog.locator('.drawer-footer').getByRole('button',{name:'Confirm fault',exact:true});
  await expect(action).toBeDisabled();
  await dialog.getByLabel('Required note',{exact:true}).fill('Independent inspection complete');
  await expect(action).toBeEnabled(); await action.click();
  await expect(dialog.locator('[aria-current=step]')).toContainText('Confirmed');
  await expect(dialog.locator('.workflow-steps .complete')).toHaveCount(1);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});
