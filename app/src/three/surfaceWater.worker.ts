import { advanceSurface, reconcileSurface, rainImpulse, type SurfaceGrid } from './surfaceWater';
let grid: SurfaceGrid, state: Float32Array;
self.onmessage = ({ data }) => {
  if (data.kind === 'init') {
    grid = data.grid;
    state = new Float32Array(grid.nx * grid.nz * 4);
    return;
  }
  if (!grid) return;
  const started = performance.now();
  if (data.reset) state.fill(0);
  const source = data.source as Float32Array;
  let left = Math.min(0.1, data.seconds),
    steps = 0;
  while (left > 1e-6 && steps++ < 32) {
    const next = advanceSurface(grid, state, left, source);
    state = next.state;
    left -= next.dt;
  }
  for (const p of data.impulses) rainImpulse(grid, state, p.x, p.z, p.strength);
  const stats = reconcileSurface(grid, state, data.bedVolume, data.gutterVolume, data.depth),
    copy = state.slice();
  self.postMessage(
    { state: copy, stats, ms: performance.now() - started },
    { transfer: [copy.buffer] },
  );
};
