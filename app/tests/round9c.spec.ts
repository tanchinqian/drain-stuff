import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
for (const id of ['S1', 'R1']) test('Round 9C section scope and thirty axis changes ' + id, async ({page}) => {
  test.setTimeout(180000);
  await page.goto('/feature/' + id);
  const clock = page.getByRole('slider', {name: 'Storm timeline', exact:true});
  await expect(clock).toBeEnabled({timeout:60000});
  await clock.fill('18');
  const scene = page.locator('.cad-scene'), cut = page.getByRole('slider', {name:'Section cut position', exact:true});
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  let seed = 913;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i=0; i<30; i++) {
    const axis = (['X','Y','Z'] as const)[Math.floor(random()*3)];
    await page.locator('[aria-label="Section axis"]').getByRole('button', {name:axis, exact:true}).click();
    const min=Number(await cut.getAttribute('min')), max=Number(await cut.getAttribute('max'));
    await cut.fill(String(Number((min+(max-min)*(0.05+random()*.9)).toFixed(2))));
    await expect.poll(() => scene.getAttribute('data-active-planes')).toBe('1');
    await expect(scene).toHaveAttribute('data-context-clipped', '0');
    expect(Number(await scene.getAttribute('data-assembly-clipped'))).toBeGreaterThan(5);
  }
  await page.getByRole('checkbox', {name:'2D section',exact:true}).check();
  for (const axis of ['X','Y','Z']) {
    await page.locator('[aria-label="Section axis"]').getByRole('button',{name:axis,exact:true}).click();
    const min=Number(await cut.getAttribute('min')),max=Number(await cut.getAttribute('max'));
    for(let i=0;i<10;i++) {
      await cut.fill(String(Number((min+(max-min)*(i+.5)/10).toFixed(2))));
      const svg=page.locator('.model-card > .physics-section svg');
      await expect(svg).toHaveAttribute('data-section-cut-axis',axis);
      expect(await svg.locator('path,rect,circle,ellipse').count()).toBeGreaterThan(4);
      if(axis==='Z') await expect(svg.locator('[data-depth-plan]')).toBeVisible();
    }
  }
  await page.getByRole('checkbox',{name:'2D section',exact:true}).uncheck();
  await page.getByRole('button',{name:'Reset cut',exact:true}).click();
  await expect.poll(()=>scene.getAttribute('data-active-planes')).toBe('0');
  await mkdir('../docs/screens/round9c',{recursive:true});
  await page.getByRole('button',{name:'Cutaway',exact:true}).click();
  await scene.screenshot({path:`../docs/screens/round9c/${id}-section-stage0a.png`});
  expect(errors).toEqual([]);
});
