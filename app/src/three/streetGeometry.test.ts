import { expect, test } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { streetGeometry, streetExcavation } from './streetGeometry';
import { featureConfig } from '../simulation/physics/config';
import { drainDesign } from '../simulation/physics/design';
for(const id of ['S1','R1']) test('continuous street and closed excavation '+id,()=>{
  const config=featureConfig(id), d=drainDesign(config), g=streetGeometry(d,config.kind==='inlet');
  const material=new MeshBasicMaterial({side:DoubleSide}), meshes=[g.top,g.floor].map(x=>new Mesh(x,material));
  meshes.forEach(m=>m.updateMatrixWorld());
  // Ten orbital sample directions, with radial samples covering road, verge and pit.
  for(let orbit=0;orbit<10;orbit++) for(let radius=0;radius<15;radius+=.17) {
    const a=orbit*Math.PI/5, ray=new Raycaster(new Vector3(Math.cos(a)*radius,10,Math.sin(a)*radius),new Vector3(0,-1,0));
    expect(ray.intersectObjects(meshes).length).toBeGreaterThan(0);
  }
  const boundary=streetExcavation(d,config.kind==='inlet');
  expect(g.walls.getAttribute('position').count).toBe(boundary.length*6);
  Object.values(g).forEach(v=>{if(typeof v!=='number')v.dispose();});material.dispose();
});
