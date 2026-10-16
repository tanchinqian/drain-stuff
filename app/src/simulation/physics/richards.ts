import type { PhysicsConfig } from './config';
import { drainDesign } from './design';

export interface SoilTexture {
  alpha: number;
  n: number;
  residual: number;
  saturated: number;
  ks: number;
}
// Carsel & Parrish texture means; placeholders, not site measurements. alpha is m^-1.
export const textures = {
  sandyLoam: { alpha: 7.5, n: 1.89, residual: 0.065, saturated: 0.41, ks: 1.228e-5 },
  sand: { alpha: 14.5, n: 2.68, residual: 0.045, saturated: 0.43, ks: 8.25e-5 },
  loam: { alpha: 3.6, n: 1.56, residual: 0.078, saturated: 0.43, ks: 2.889e-6 },
} satisfies Record<string, SoilTexture>;

export function hydraulic(h: number, p: SoilTexture) {
  const m = 1 - 1 / p.n,
    a = Math.max(0, -h * p.alpha),
    an = a ** p.n;
  const s = h >= 0 ? 1 : (1 + an) ** -m;
  const theta = p.residual + (p.saturated - p.residual) * s;
  const capacity =
    h >= 0
      ? 1e-7
      : Math.max(
          1e-9,
          (p.saturated - p.residual) * m * p.n * p.alpha * a ** (p.n - 1) * (1 + an) ** (-m - 1),
        );
  const k = p.ks * Math.sqrt(s) * (1 - (1 - s ** (1 / m)) ** m) ** 2;
  return { theta, capacity, k, s };
}
export interface MoistureField {
  surfaceWetness?: Float32Array;
  wetBandHeight?: number;
  nx: number;
  nz: number;
  width: number;
  depth: number;
  dx: number;
  dz: number;
  theta: Float32Array;
  saturation: Float32Array;
}
export interface SoilStep {
  infiltration: number;
  drain: number;
  bottom: number;
  et: number;
  residual: number;
}

/** Cell-centred mixed-form Richards FV; modified Picard with diagonal mass, no fitted front. */
export class RichardsGrid {
  readonly nx: number;
  readonly nz: number;
  readonly dx: number;
  readonly dz: number;
  readonly width: number;
  readonly depth: number;
  readonly volume: number;
  readonly h: Float64Array;
  readonly theta: Float64Array;
  readonly soils: SoilTexture[];
  readonly initial: Float64Array;
  private k: Float64Array;
  private cap: Float64Array;
  private old: Float64Array;
  private oldH: Float64Array;
  private candidate: Float64Array;
  private diagonal: Float64Array;
  private rhs: Float64Array;
  private right: Float64Array;
  private down: Float64Array;
  private top: Float64Array;
  private bottom: Float64Array;
  private symmetricColumn?: RichardsGrid;
  constructor(
    readonly config: PhysicsConfig,
    nx = 48,
    nz = 32,
    uniform?: SoilTexture,
  ) {
    const d = drainDesign(config),
      v = config.values;
    this.nx = nx;
    this.nz = nz;
    this.width = d.bedWidth;
    this.depth = d.soilDepth + d.nativeDepth;
    this.dx = this.width / nx;
    this.dz = this.depth / nz;
    this.volume = this.dx * this.dz * d.length;
    const size = nx * nz;
    this.h = new Float64Array(size).fill(-3);
    this.theta = new Float64Array(size);
    this.initial = new Float64Array(size);
    this.soils = [];
    for (let z = 0; z < nz; z++)
      for (let x = 0; x < nx; x++) {
        const depth = (z + 0.5) * this.dz;
        const p =
          uniform ??
          (depth < d.mediaDepth
            ? { ...textures.sandyLoam, saturated: v.porosity.value, ks: v.ks.value }
            : depth < d.mediaDepth + d.transitionDepth
              ? { ...textures.sand, saturated: v.transitionVoid.value }
              : depth < d.soilDepth
                ? { ...textures.sand, saturated: v.gravelVoid.value, ks: 0.001 }
                : { ...textures.loam, ks: v.nativeKs.value });
        const i = z * nx + x;
        this.soils.push(p);
        this.theta[i] = hydraulic(this.h[i], p).theta;
      }
    this.initial.set(this.theta);
    this.k = new Float64Array(size);
    this.cap = new Float64Array(size);
    this.old = new Float64Array(size);
    this.oldH = new Float64Array(size);
    this.candidate = new Float64Array(size);
    this.diagonal = new Float64Array(size);
    this.rhs = new Float64Array(size);
    this.right = new Float64Array(size);
    this.down = new Float64Array(size);
    this.top = new Float64Array(nx);
    this.bottom = new Float64Array(nx);
    if (nx > 1) this.symmetricColumn = new RichardsGrid(config, 1, nz, uniform);
  }
  get storage() {
    let water = 0;
    for (let i = 0; i < this.theta.length; i++)
      water += (this.theta[i] - this.initial[i]) * this.volume;
    return water;
  }
  frame(): MoistureField {
    return {
      nx: this.nx,
      nz: this.nz,
      width: this.width,
      depth: this.depth,
      dx: this.dx,
      dz: this.dz,
      theta: Float32Array.from(this.theta),
      saturation: Float32Array.from(this.theta, (t, i) =>
        Math.max(
          0,
          Math.min(
            1,
            (t - this.soils[i].residual) / (this.soils[i].saturated - this.soils[i].residual),
          ),
        ),
      ),
    };
  }
  layerStorage() {
    const d = drainDesign(this.config),
      values = { media: 0, transition: 0, gravel: 0, native: 0 };
    for (let i = 0; i < this.theta.length; i++) {
      const z = (Math.floor(i / this.nx) + 0.5) * this.dz;
      const layer =
        z < d.mediaDepth
          ? 'media'
          : z < d.mediaDepth + d.transitionDepth
            ? 'transition'
            : z < d.soilDepth
              ? 'gravel'
              : 'native';
      values[layer] += (this.theta[i] - this.initial[i]) * this.volume;
    }
    return values;
  }
  meanAt(depth: number) {
    const z = Math.min(this.nz - 1, Math.max(0, Math.floor(depth / this.dz)));
    let sum = 0;
    for (let x = 0; x < this.nx; x++) sum += this.theta[z * this.nx + x];
    return sum / this.nx;
  }
  fluxAt(depth: number) {
    const z = Math.min(this.nz - 2, Math.max(0, Math.floor(depth / this.dz) - 1));
    let q = 0;
    for (let x = 0; x < this.nx; x++) {
      const i = z * this.nx + x;
      q +=
        ((this.k[i] + this.k[i + this.nx]) / 2) *
        (1 - (this.h[i + this.nx] - this.h[i]) / this.dz) *
        this.dx *
        this.config.values.length.value;
    }
    return q;
  }
  gravelHead() {
    const d = drainDesign(this.config);
    const z = Math.min(
      this.nz - 1,
      Math.floor((d.mediaDepth + d.transitionDepth + d.gravelDepth / 2) / this.dz),
    );
    let head = 0;
    for (let x = 0; x < this.nx; x++)
      head += Math.max(0, this.h[z * this.nx + x] + d.gravelDepth / 2);
    return head / this.nx;
  }
  step(
    dt: number,
    head: number,
    available: number,
    requestedDrain: number,
    etRate = 0,
    ksMultiplier = 1,
  ): SoilStep {
    const { nx, nz, dx, dz, volume } = this,
      size = nx * nz;
    // Uniform transverse boundaries preserve symmetry exactly; solve that invariant subspace.
    // An asymmetric field uses the complete 2D stencil below instead.
    const column = this.symmetricColumn;
    if (column && this.h.every((h, i) => Math.abs(h - this.h[Math.floor(i / nx) * nx]) < 1e-12)) {
      for (let z = 0; z < nz; z++) {
        column.h[z] = this.h[z * nx];
        column.theta[z] = this.theta[z * nx];
      }
      const result = column.step(dt, head, available, requestedDrain, etRate, ksMultiplier);
      for (let i = 0; i < size; i++) {
        const z = Math.floor(i / nx);
        this.h[i] = column.h[z];
        this.theta[i] = column.theta[z];
        this.k[i] = column.k[z];
      }
      return result;
    }
    this.old.set(this.theta);
    this.oldH.set(this.h);
    const before = this.storage,
      face = dx * this.config.values.length.value;
    const drainRow = Math.min(
      nz - 1,
      Math.floor(
        (drainDesign(this.config).soilDepth - drainDesign(this.config).gravelDepth / 2) / dz,
      ),
    );
    const drains = new Float64Array(size);
    const evaporation = new Float64Array(nx);
    for (let x = 0; x < nx; x++) {
      const i = drainRow * nx + x;
      drains[i] = Math.min(
        requestedDrain / nx / volume,
        (Math.max(0, this.theta[i] - this.soils[i].residual) / dt) * 0.2,
      );
      evaporation[x] = Math.min(
        etRate / (this.width * this.config.values.length.value * dz),
        (Math.max(0, this.theta[x] - this.initial[x]) / dt) * 0.2,
      );
    }
    const topSupply = available / dt / (this.width * this.config.values.length.value);
    let converged = false;
    let lastDelta = 0,
      lastPressure = 0;
    for (let iteration = 0; iteration < 60; iteration++) {
      for (let i = 0; i < size; i++) {
        const p = hydraulic(this.h[i], this.soils[i]);
        this.theta[i] = p.theta;
        this.cap[i] = p.capacity;
        this.k[i] =
          p.k * (Math.floor(i / nx) * dz < this.config.values.mediaDepth.value ? ksMultiplier : 1);
      }
      for (let z = 0; z < nz; z++)
        for (let x = 0; x < nx; x++) {
          const i = z * nx + x;
          this.right[i] = x < nx - 1 ? (this.k[i] + this.k[i + 1]) / (2 * dx * dx) : 0;
          this.down[i] = z < nz - 1 ? (this.k[i] + this.k[i + nx]) / (2 * dz * dz) : 0;
        }
      for (let x = 0; x < nx; x++) {
        const boundaryK = (this.k[x] + this.soils[x].ks * ksMultiplier) / 2;
        this.top[x] = Math.max(
          0,
          Math.min(topSupply, boundaryK * (1 + (head - this.h[x]) / (dz / 2))),
        );
        const i = (nz - 1) * nx + x;
        this.bottom[x] = this.config.values.liner.value ? 0 : this.k[i];
      }
      for (let z = 0; z < nz; z++)
        for (let x = 0; x < nx; x++) {
          const i = z * nx + x,
            left = x ? this.right[i - 1] : 0,
            right = this.right[i],
            up = z ? this.down[i - nx] : 0,
            down = this.down[i];
          this.diagonal[i] = this.cap[i] / dt + left + right + up + down;
          this.rhs[i] =
            (this.cap[i] / dt) * this.h[i] -
            (this.theta[i] - this.old[i]) / dt +
            (z ? up * dz : this.top[x] / dz) -
            (z < nz - 1 ? down * dz : this.bottom[x] / dz) -
            drains[i] -
            (z === 0 ? evaporation[x] : 0);
          if (z === 0 && this.top[x] < topSupply && this.top[x] > 0) {
            const coefficient = (this.k[x] + this.soils[x].ks * ksMultiplier) / (dz * dz);
            this.diagonal[i] += coefficient;
            this.rhs[i] += coefficient * this.h[i];
          }
        }
      this.candidate.set(this.h);
      const upper = new Float64Array(nz),
        solution = new Float64Array(nz);
      for (let sweep = 0; sweep < (nx === 1 ? 1 : 4); sweep++)
        for (let x = 0; x < nx; x++) {
          for (let z = 0; z < nz; z++) {
            const i = z * nx + x,
              a = z ? -this.down[i - nx] : 0,
              cc = z < nz - 1 ? -this.down[i] : 0;
            const rhs =
              this.rhs[i] +
              (x ? this.right[i - 1] * this.candidate[i - 1] : 0) +
              (x < nx - 1 ? this.right[i] * this.candidate[i + 1] : 0);
            const diagonal = this.diagonal[i] - (z ? a * upper[z - 1] : 0);
            upper[z] = cc / diagonal;
            solution[z] = (rhs - (z ? a * solution[z - 1] : 0)) / diagonal;
          }
          for (let z = nz - 1; z >= 0; z--)
            this.candidate[z * nx + x] =
              solution[z] - (z < nz - 1 ? upper[z] * this.candidate[(z + 1) * nx + x] : 0);
        }
      let delta = 0,
        pressureDelta = 0;
      for (let i = 0; i < size; i++) {
        const next = Math.max(this.h[i] - 1, Math.min(this.h[i] + 1, this.candidate[i]));
        pressureDelta = Math.max(pressureDelta, Math.abs(next - this.h[i]));
        delta = Math.max(delta, Math.abs(hydraulic(next, this.soils[i]).theta - this.theta[i]));
        this.h[i] = next;
      }
      lastDelta = delta;
      lastPressure = pressureDelta;
      if (delta < 1e-9 && pressureDelta < 1e-5) {
        converged = true;
        break;
      }
    }
    if (!converged) {
      this.h.set(this.oldH);
      this.theta.set(this.old);
      if (dt < 0.02)
        throw new Error(
          `Richards iteration did not converge: dt=${dt}, surface=${head}, supply=${available}, top h=${this.h[0]}, delta=${lastDelta}, pressure=${lastPressure}`,
        );
      const a = this.step(dt / 2, head, available, requestedDrain, etRate, ksMultiplier);
      const b = this.step(
        dt / 2,
        head,
        Math.max(0, available - a.infiltration),
        requestedDrain,
        etRate,
        ksMultiplier,
      );
      return {
        infiltration: a.infiltration + b.infiltration,
        drain: a.drain + b.drain,
        bottom: a.bottom + b.bottom,
        et: a.et + b.et,
        residual: a.residual + b.residual,
      };
    }
    for (let i = 0; i < size; i++) this.theta[i] = hydraulic(this.h[i], this.soils[i]).theta;
    const infiltration = this.top.reduce((a, b) => a + b, 0) * face * dt;
    const bottom = this.bottom.reduce((a, b) => a + b, 0) * face * dt;
    const drain = drains.reduce((a, b) => a + b, 0) * volume * dt;
    // Storage-based ET closes only the explicitly requested top-cell sink, never the nonlinear residual.
    let et = 0;
    for (let x = 0; x < nx; x++) et += evaporation[x] * volume * dt;
    const residual = this.storage - before - infiltration + drain + bottom + et;
    return { infiltration, drain, bottom, et, residual };
  }
}
