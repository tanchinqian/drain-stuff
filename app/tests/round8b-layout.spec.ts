import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const width of [390,1440,1920]) test('page sections and contained layouts at '+width,async({page})=>{
  await page.setViewportSize({width,height:1000});
  for(const path of ['/','/feature/S1','/feature/R1','/sensors','/faults','/materials']) {
    await page.goto(path);await expect(page.getByRole('heading',{level:1})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(path==='/'||path.startsWith('/feature/')) {
      const index=page.getByRole('navigation',{name:'Page sections'});
      await expect(index.getByRole('link',{name:'Replay',exact:true})).toBeVisible();
      await index.getByRole('link',{name:'Replay',exact:true}).click();
      await expect(index).toBeVisible();
      expect(await index.evaluate(el=>getComputedStyle(el).position)).toBe('sticky');
      await index.getByRole('button',{name:'Model details',exact:true}).click();
      await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
    }
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),path+' '+width).toEqual([]);
  }
});
