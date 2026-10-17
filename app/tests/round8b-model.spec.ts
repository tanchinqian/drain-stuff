import {test,expect} from '@playwright/test';
for(const width of [390,1440,1920]) test('R1 fit, close-up and stage flow at '+width,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/feature/R1');
  const scene=page.locator('.cad-scene');
  await expect(page.getByRole('slider',{name:'Storm timeline',exact:true})).toBeEnabled({timeout:60000});
  await scene.scrollIntoViewIfNeeded();
  await expect.poll(async()=>Number(await scene.getAttribute('data-projected-width'))).toBeGreaterThanOrEqual(.7);
  await expect(page.locator('.view-controls')).not.toHaveAttribute('open','');
  await expect(page.locator('.scene-performance')).toHaveCount(0);
  await expect(page.locator('.quality-status')).toHaveCount(0);
  await expect(page.locator('.flow-legend')).toContainText('Bypass');
  const initial=Number(await scene.locator('canvas').getAttribute('data-camera-zoom'));
  await page.getByRole('button',{name:'Inspect inlet close-up',exact:true}).click();
  await expect.poll(async()=>Number(await scene.locator('canvas').getAttribute('data-camera-zoom'))).toBeGreaterThan(initial);
  await page.getByRole('button',{name:'Fit channel',exact:true}).click();
  if(width===390) {await page.getByRole('combobox',{name:'Model part',exact:true}).fill('Chamber water');await page.getByRole('option',{name:/Chamber water/}).click();}
  else await page.locator('.part-list').getByRole('button',{name:'Chamber water',exact:true}).click();
  await expect(page.locator('[data-scene-label=ponding]')).toContainText('L/min');
});
