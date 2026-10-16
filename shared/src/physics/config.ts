export type Source = "placeholder" | "typical-guidance" | "trial-record";
export interface Parameter {
  value: number;
  unit: string;
  source: Source;
  equation: string;
}
const p = (value: number, unit: string, equation: string): Parameter => ({
  value,
  unit,
  equation,
  source: "placeholder",
});
export const modelNotice =
  "Reduced-order model, placeholder parameters, not calibrated, not a design tool, not a forecast";
export const conductivityNotice =
  "Model output from entered conductivity, not a measured result";
export const parameters = {
  step: p(10, "s", "explicit finite-volume update"),
  peak: p(63 / 3.6e6, "m/s", "hyetograph peak"),
  duration: p(2700, "s", "hyetograph duration"),
  recovery: p(21600, "s", "post-rain simulation window"),
  idfA: p(90, "mm/h", "i=a T^b/(t+c)^d; t in minutes, T in years"),
  idfB: p(0.15, "1", "IDF"),
  idfC: p(5, "min", "IDF"),
  idfD: p(0.65, "1", "IDF"),
  returnPeriod: p(
    2,
    "year",
    "IDF shape only; peak normalized to entered intensity",
  ),
  roofArea: p(120, "m2", "C i A"),
  pavedArea: p(60, "m2", "C i A"),
  lawnArea: p(40, "m2", "C i A"),
  roofC: p(0.95, "1", "C i A"),
  pavedC: p(0.8, "1", "C i A"),
  lawnC: p(0.25, "1", "C i A"),
  roofDepression: p(0.0005, "m", "initial depression storage"),
  pavedDepression: p(0.001, "m", "initial depression storage"),
  lawnDepression: p(0.003, "m", "initial depression storage"),
  overlandTime: p(120, "s", "tc=to+td; verify against MSMA"),
  drainTime: p(120, "s", "tc=to+td; K=tc"),
  length: p(6, "m", "trapezoid stage storage"),
  width: p(3, "m", "trapezoid stage storage"),
  sideSlope: p(3, "m/m", "V=L(b h+z h^2)"),
  crest: p(0.25, "m", "overflow weir crest"),
  mediaDepth: p(0.6, "m", "media storage"),
  transitionDepth: p(0.1, "m", "transition storage"),
  gravelDepth: p(0.18, "m", "gravel storage"),
  porosity: p(0.45, "m3/m3", "media pore volume"),
  fieldCapacity: p(0.2, "m3/m3", "percolation threshold"),
  wilting: p(0.1, "m3/m3", "initial residual moisture"),
  gravelVoid: p(0.4, "m3/m3", "gravel pore volume"),
  transitionVoid: p(0.35, "m3/m3", "transition pore volume"),
  ks: p(22 / 3.6e6, "m/s", "Ks_eff=Ks(1-clog)"),
  nativeKs: p(2 / 3.6e6, "m/s", "native seepage"),
  suction: p(0.12, "m", "head-dependent infiltration"),
  hco: p(8, "1", "K(theta)=Ks exp(-HCO(phi-theta))"),
  et: p(2e-3 / 86400, "m/s", "ET demand"),
  liner: p(0, "0 or 1", "liner disables native seepage"),
  drainC: p(0.001, "m^(3-n)/s", "Q=C max(h-offset,0)^n"),
  drainN: p(0.5, "1", "underdrain exponent"),
  drainOffset: p(0.02, "m", "underdrain offset"),
  pipeDiameter: p(0.1, "m", "partial circular Manning"),
  pipeSlope: p(0.005, "m/m", "Manning"),
  manningN: p(0.013, "s/m^(1/3)", "Manning"),
  pipeLength: p(10, "m", "travel storage"),
  inletArea: p(0.035, "m2", "orifice"),
  inletPerimeter: p(0.8, "m", "weir"),
  inletOpen: p(1, "1", "blockage multiplier"),
  sockOpen: p(1, "1", "sock multiplier"),
  cw: p(1.7, "m^0.5/s", "Q=Cw L h^1.5"),
  co: p(0.62, "1", "Q=Co A sqrt(2g h)"),
  gravity: p(9.81, "m/s2", "orifice"),
  overflowLength: p(0.6, "m", "overflow weir"),
  nodeArea: p(2, "m2", "surface node storage"),
  outfallInvert: p(0, "m datum", "tailwater head"),
  tailwater: p(0, "m datum", "no reverse flow; downstream throttling"),
  sediment: p(0, "m", "forebay sediment"),
  clogPerVolume: p(0.0005, "1/m3", "cumulative treated volume"),
  sedimentClog: p(2, "1/m", "sediment clog contribution"),
  sensorNoise: p(0.001, "m", "seeded uniform measurement noise"),
  sensorBias: p(0, "m", "virtual sensor bias"),
  sensorDrift: p(0, "m/s", "virtual sensor drift"),
  mountHeight: p(1, "m", "ultrasonic distance=mount-level"),
  compostDx: p(0.15, "m", "2D finite differences"),
  compostDepth: p(1.2, "m", "8-cell cross section"),
  ambient: p(30, "degC", "thermal boundary"),
  initialTemperature: p(35, "degC", "initial condition"),
  initialMoisture: p(0.5, "kg/kg dry solids", "initial condition"),
  density: p(400, "kg/m3", "bulk dry density"),
  heatCapacity: p(2500, "J/(kg K)", "thermal storage"),
  thermalK: p(0.25, "W/(m K)", "conduction"),
  convection: p(5, "W/(m2 K)", "surface heat exchange"),
  heatRate: p(0.12, "W/kg", "k0 f(T) f(M) f(O2) VS"),
  tempMin: p(10, "degC", "cardinal lower temperature"),
  tempOptimum: p(45, "degC", "cardinal rising plateau"),
  tempPlateauEnd: p(55, "degC", "cardinal falling plateau"),
  tempMax: p(75, "degC", "cardinal upper temperature"),
  moistureOptimum: p(0.45, "kg/kg dry solids", "moisture reaction factor"),
  moisturePlateauEnd: p(0.6, "kg/kg dry solids", "moisture reaction factor"),
  moistureMax: p(0.85, "kg/kg dry solids", "moisture reaction factor"),
  oxygenWetThreshold: p(0.55, "kg/kg dry solids", "wet oxygen depletion"),
  oxygenWetMultiplier: p(5, "kg dry solids/kg", "wet oxygen depletion"),
  lowOxygenThreshold: p(0.2, "1", "low oxygen risk flag"),
  maturityTolerance: p(2, "K", "ambient and reheat comparison"),
  maturityWindow: p(86400, "s", "post-turn observation window"),

  vsDecay: p(2e-7, "1/s", "VS decay"),
  oxygenDecay: p(1e-5, "1/s", "oxygen depletion"),
  evaporation: p(1e-7, "kg/(m2 s K)", "surface evaporation"),
  latentHeat: p(2.26e6, "J/kg", "evaporation cooling"),
  holding: p(0.65, "kg/kg dry solids", "leachate drainage"),
  covered: p(1, "0 or 1", "rain interception"),
  sumpArea: p(0.25, "m2", "sump level"),
} satisfies Record<string, Parameter>;
export type ParameterKey = keyof typeof parameters;
export interface PhysicsConfig {
  id: string;
  kind: "swale" | "inlet" | "tree_pit";
  values: Record<ParameterKey, Parameter>;
  sampleCount: number;
}
export function featureConfig(id: string): PhysicsConfig {
  if (!["S1", "S2", "S3", "I1", "T1", "T2"].includes(id))
    throw new Error(`Unknown feature ${id}`);
  const config: PhysicsConfig = {
    id,
    kind: id[0] === "I" ? "inlet" : id[0] === "T" ? "tree_pit" : "swale",
    values: structuredClone(parameters),
    sampleCount: 0,
  };
  // Defaults are entered placeholders, never inferred from an arm or compost allocation.
  if (config.kind === "tree_pit")
    Object.assign(config.values, {
      length: p(2, "m", "tree cell storage"),
      width: p(2, "m", "tree cell storage"),
      roofArea: p(35, "m2", "C i A"),
      pavedArea: p(15, "m2", "C i A"),
      lawnArea: p(10, "m2", "C i A"),
    });
  if (config.kind === "inlet")
    Object.assign(config.values, {
      length: p(1, "m", "chamber storage"),
      width: p(1, "m", "chamber storage"),
      sideSlope: p(0, "m/m", "vertical chamber"),
      ks: p(0, "m/s", "impermeable chamber"),
      nativeKs: p(0, "m/s", "impermeable chamber"),
      crest: p(0.4, "m", "chamber bypass crest"),
    });
  return config;
}
export const scenarios = [
  "Normal",
  "Blocked inlet",
  "Clogged sock",
  "Silted underdrain",
  "High tailwater",
  "Sensor drift",
] as const;
export type Scenario = (typeof scenarios)[number];
export function withScenario(
  base: PhysicsConfig,
  scenario: Scenario,
): PhysicsConfig {
  const c = structuredClone(base),
    v = c.values;
  if (scenario === "Blocked inlet") v.inletOpen.value = 0.1;
  if (scenario === "Clogged sock") v.sockOpen.value = 0.1;
  if (scenario === "Silted underdrain") v.drainC.value *= 0.05;
  if (scenario === "High tailwater") v.tailwater.value = 0.8;
  if (scenario === "Sensor drift") {
    v.sensorBias.value = 0.05;
    v.sensorDrift.value = 1e-6;
  }
  return c;
}
export function validateConfig(c: PhysicsConfig) {
  for (const [name, p] of Object.entries(c.values))
    if (!Number.isFinite(p.value) || p.value < 0)
      throw new Error(`Invalid parameter: ${name}`);
  const v = c.values;
  for (const k of [
    "length",
    "width",
    "mediaDepth",
    "gravelDepth",
    "transitionDepth",
    "nodeArea",
    "pipeDiameter",
    "pipeLength",
    "manningN",
    "overlandTime",
    "drainTime",
    "step",
    "duration",
    "compostDx",
    "density",
    "heatCapacity",
    "sumpArea",
  ] as const)
    if (v[k].value <= 0) throw new Error(`${k} must be positive`);
  for (const k of [
    "roofC",
    "pavedC",
    "lawnC",
    "inletOpen",
    "sockOpen",
    "porosity",
    "gravelVoid",
    "transitionVoid",
    "liner",
    "covered",
  ] as const)
    if (v[k].value > 1) throw new Error(`${k} exceeds one`);
  if (!(
    v.wilting.value < v.fieldCapacity.value &&
    v.fieldCapacity.value < v.porosity.value
  ))
    throw new Error("Require wilting < field capacity < porosity");
  if (!(
    v.tempMin.value < v.tempOptimum.value &&
    v.tempOptimum.value <= v.tempPlateauEnd.value &&
    v.tempPlateauEnd.value < v.tempMax.value
  ))
    throw new Error("Cardinal temperature limits must be ordered");
  if (!(
    v.moistureOptimum.value > 0 &&
    v.moistureOptimum.value <= v.moisturePlateauEnd.value &&
    v.moisturePlateauEnd.value < v.moistureMax.value
  ))
    throw new Error("Moisture response limits must be ordered");
  for (const k of ["gravelVoid", "transitionVoid", "compostDepth"] as const)
    if (v[k].value <= 0) throw new Error(`${k} must be positive`);
  for (const k of ["liner", "covered"] as const)
    if (v[k].value !== 0 && v[k].value !== 1)
      throw new Error(`${k} must be zero or one`);
  if (v.duration.value + v.recovery.value > 7 * 86400)
    throw new Error("Run limited to seven days");
  if (v.step.value < 1)
    throw new Error("Requested time step must be at least one second");
}
