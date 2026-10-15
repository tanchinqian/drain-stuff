export type ZoneId = 'A' | 'B' | 'C' | 'D';
export type Arm = 'control' | 'decompaction' | 'compost';
export type Status = 'ok' | 'watch' | 'fault' | 'offline';
export type DrainPartId =
  | 'inlet'
  | 'energy'
  | 'pretreat'
  | 'sock'
  | 'checkdam'
  | 'ponding'
  | 'mulch'
  | 'planting'
  | 'media'
  | 'transition'
  | 'drainage'
  | 'underdrain'
  | 'cleanout'
  | 'liner'
  | 'overflow'
  | 'outfall';
export type BayPartId =
  'intake' | 'bay' | 'bulking' | 'cover' | 'base' | 'sump' | 'curing' | 'weather';
export type PartId = DrainPartId | BayPartId;
export type SensorStatus = 'ok' | 'suspect' | 'offline';
export interface Sensor extends Synthetic {
  sensorId: string;
  type: string;
  ownerId: string;
  scope: 'drainage' | 'compost' | 'site';
  zone: ZoneId;
  partId: PartId;
  linkedPartIds: PartId[];
  location: { x: number; y: number; z: number };
  siteLocation: { x: number; y: number; z: number };
  metric: string;
  unit: string;
  role: 'proxy' | 'reference';
  proxyFor: string;
  mountHeightM?: number;
  lastValue: number | null;
  lastText?: string;
  lastAt: string;
  calibratedAt: string;
  drift: 'none' | 'possible' | 'confirmed';
  status: SensorStatus;
  usedByRules: string[];
}
export interface FaultRule extends Synthetic {
  id: string;
  label: string;
  check: string;
  diagnosingInput: string;
  scope: 'drainage' | 'compost' | 'sensor';
  title: string;
  triggerCondition: string;
  diagnosingInputs: string[];
  appliesTo: PartId[];
  sensorTypes: string[];
  thresholdKeys: string[];
  severity: 1 | 2 | 3;
  steps: string[];
  source: string;
  version: string;
}
export type Metric = 'infiltration_mm_hr' | 'drain_down_h' | 'sediment_mm' | 'water_level_cm';
export interface Synthetic {
  synthetic?: true;
}
export interface Zone extends Synthetic {
  id: ZoneId;
  name: string;
  peakMmPerHr: number;
  housesHoldingWater6h: number;
  housesTotal: number;
}
export interface House extends Synthetic {
  id: string;
  zone: ZoneId;
  x: number;
  y: number;
  drainId: string;
  holdsWater6h: boolean;
  ownerOfRecord: string;
  lastReadingAt: string;
  nearestFeature: string;
}
export interface Feature extends Synthetic {
  id: string;
  name: string;
  kind: 'swale' | 'tree_pit' | 'inlet';
  arm: Arm | null;
  doseLabel?: string;
  zone: ZoneId;
  x: number;
  y: number;
  status: Status;
}
export interface Reading extends Synthetic {
  t: string;
  metric: Metric;
  value: number;
  unit: string;
  sensorId: string;
  n?: number;
}
export interface SensorReading extends Omit<Reading, 'metric'> {
  metric: string;
}
export interface Part extends Synthetic {
  partId: PartId;
  name: string;
  status: Status;
  installed: boolean;
  purpose: string;
  typicalFailure: string;
  sensorIds: string[];
  readings: Reading[];
  issue?: string;
  steps?: string[];
}
export interface FeatureDetail extends Feature {
  parts: Part[];
  ownerOfRecord: string;
  installedAt: string;
}
export interface RainPoint extends Synthetic {
  t: string;
  mmPerHr: number;
  cumulativeMm: number;
}
export interface ZoneRain extends Synthetic {
  zone: ZoneId;
  peakMmPerHr: number;
  totalMm: number;
  t?: string;
  mmPerHr?: number;
}
export interface AuditEntry {
  id: string;
  t: string;
  user: string;
  action: string;
  note?: string;
}
export interface Fault extends Synthetic {
  ruleKey?: string;
  history?: AuditEntry[];
  raisedBy?: 'rule' | 'manual';
  id: string;
  featureId: string;
  partId: PartId;
  type:
    | 'blockage'
    | 'sediment'
    | 'sensor_offline'
    | 'sensor_suspect'
    | 'standing_water'
    | 'scour'
    | 'mulch_loss'
    | 'sparse_planting'
    | 'joint_leak'
    | 'missing_cap'
    | 'not_heating'
    | 'putrid_smell'
    | 'ammonia_smell'
    | 'too_wet'
    | 'pests'
    | 'leachate';
  ruleId: string;
  sensorIds: string[];
  sensorStatusesAtAlert: Record<string, SensorStatus>;
  diagnosingInput: string;
  severity: 1 | 2 | 3;
  openedAt: string;
  status: 'open' | 'inspected' | 'closed';
  zone: ZoneId;
}
export interface TestResult extends Synthetic {
  t: string;
  phase: 'baseline' | 'retest';
  metric: Metric;
  value: number;
  unit: string;
  pointId: string;
  n: number;
}
export interface Guardrails {
  nutrientExport: 'not_tested' | 'pass' | 'fail';
  outletSample?: { t: string; value: number; unit: string };
  noOpenDrainContact: boolean;
  postStormCheck: 'pending' | 'ok' | 'issue';
  washoutChecked: boolean;
  cloggingChecked: boolean;
  postStormPhoto?: string;
  drainDownFlag: boolean;
}
export interface Trial extends Synthetic {
  featureId: string;
  arm: Arm;
  doseLabel?: string;
  doseCapOk: boolean;
  owner: { name: string; role: string; since: string } | null;
  soilTexture: string;
  baselineDone: boolean;
  method: string;
  markedPoints: number;
  repeatsPerPoint: number;
  n: number;
  nextRetestDue: string;
  batchId?: string;
  appliedAt?: string;
  appliedBy?: string;
  amendedDepthM?: number;
  history?: AuditEntry[];
}
export interface TrialDetail extends Trial {
  tests: TestResult[];
  guardrails: Guardrails;
}
export interface Batch extends Synthetic {
  id: string;
  bay: string;
  inputs: { kind: 'food_bokashi' | 'trimmings'; kg: number }[];
  startedAt: string;
  status: 'active' | 'curing' | 'matured' | 'released' | 'rejected';
  maturityGate: 'blocked' | 'passed';
  gateReason?: string;
}
export interface BatchReading extends Synthetic {
  prompts?: RuleOutput[];
  t: string;
  tempC: number;
  moisturePct: number;
  photoUrl?: string;
}
export interface RuleOutput extends Synthetic {
  rule: string;
  action: string;
  why: string;
  severity: 1 | 2 | 3;
}
export interface BatchChecks {
  ambientTempC: number;
  ambientReached: boolean;
  didNotReheat: boolean;
  manualMaturity: boolean;
  intakeChecked: boolean;
  plasticsFound: boolean;
  glassFound: boolean;
  bayCovered: boolean;
  sumpChecked: boolean;
  rainExpected: boolean;
  squeeze: 'wet' | 'ok' | 'dry';
  smell: 'normal' | 'putrid' | 'ammonia' | 'sour';
  sumpLevelCm: number;
  puddles: boolean;
  pests: boolean;
  photoUrl?: string;
}
export interface BatchDetail extends Batch {
  readings: BatchReading[];
  rules: RuleOutput[];
  checks: BatchChecks;
  checkHistory?: (AuditEntry & { checks: BatchChecks })[];
}
export interface Config extends Synthetic {
  contractVersion: string;
  dataThrough?: string;
  placeholderLabel: string;
  doseCapLPerM2: number;
  pilotDoses: { label: string; lPerM2: number }[];
  drainDownLimitH: number;
  minimumN: number;
  minTests?: number;
  heavyRainMmHr: number;
  temperature: {
    goodMin: number;
    goodMax: number;
    days: number;
    turnBelow: number;
    coolAbove: number;
    ambientToleranceC: number;
  };
  moisture: { min: number; max: number };
  schematic: {
    label: string;
    lengthM: number;
    widthM: number;
    mediaDepthM: number;
    transitionDepthM: number;
    drainageDepthM: number;
    mulchDepthM: number;
    pondingDepthM: number;
    pipeDiameterM: number;
  };
  inspection: { standingWaterH: number; compostNotHeatingC: number; sumpWatchCm: number };
}
export interface TestInput {
  phase: TestResult['phase'];
  metric: Metric;
  value: number;
  pointId: string;
  n: number;
  soilTexture?: string;
}
export interface AllocationInput {
  featureId: string;
  doseLabel: string;
  lPerM2: number;
  amendedDepthM?: number;
  appliedBy: string;
}
export type FaultAction = 'inspected' | 'cleaned' | 'work_order';
export interface Ok extends Synthetic {
  ok: true;
}
