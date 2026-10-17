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
  await expect(dialog.locator('.drawer-header')).toContainText('Zone B');
  await expect(dialog.locator('.drawer-header .status-chip')).toContainText('Detected');
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

test('saving diagnosis does not discard a separate unsaved work-order note',async({page})=>{
  await page.goto('/faults?fault=F-001');const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Required note',{exact:true}).fill('Keep this unsaved work note');
  await dialog.locator('.diagnosis-panel').getByRole('button',{name:'Accept',exact:true}).click();
  await expect(dialog.locator('.diagnosis-panel')).toContainText('Recorded in the audit log');
  await expect(dialog.getByRole('textbox',{name:'Required note',exact:true})).toHaveValue('Keep this unsaved work note');
  page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Required note',exact:true})).toHaveValue('Keep this unsaved work note');
  page.once('dialog',d=>d.accept());await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});

for(const dirty of [false,true]) test('second drawer replaces the first with dirty guard '+dirty,async({page})=>{
  await page.goto('/tests/drawer-fixture.html');await page.getByRole('button',{name:'Open first',exact:true}).click();
  if(dirty){await page.getByLabel('Draft note').fill('Keep this draft');page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Open second',exact:true}).click();await expect(page.getByRole('dialog',{name:'First record'})).toBeVisible();page.once('dialog',d=>d.accept());}
  await page.getByRole('button',{name:'Open second',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);await expect(page.getByRole('dialog')).toHaveAccessibleName('Second record');
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Open first',exact:true})).toBeFocused();
});
