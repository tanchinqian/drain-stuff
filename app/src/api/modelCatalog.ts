import type { BayPartId, DrainPartId, FaultRule, PartId } from './types';

export interface PartDefinition {
  partId: PartId;
  name: string;
  purpose: string;
  typicalFailure: string;
  optional?: boolean;
}
export const drainParts: (PartDefinition & { partId: DrainPartId })[] = [
  {
    partId: 'inlet',
    name: 'Kerb / pipe inlet',
    purpose: 'Brings runoff in and spreads flow',
    typicalFailure: 'Sediment, debris or scour',
  },
  {
    partId: 'energy',
    name: 'Rock energy dissipator',
    purpose: 'Limits erosion at the inlet',
    typicalFailure: 'Scour or displaced rock',
    optional: true,
  },
  {
    partId: 'pretreat',
    name: 'Pretreatment forebay',
    purpose: 'Catches coarse sediment before the media',
    typicalFailure: 'Sediment accumulation or bypass',
  },
  {
    partId: 'sock',
    name: 'Compost filter sock',
    purpose: 'Trial option for trapping fine sediment',
    typicalFailure: 'Clogging or washout',
    optional: true,
  },
  {
    partId: 'checkdam',
    name: 'Check dams',
    purpose: 'Slow flow on slopes',
    typicalFailure: 'Undercutting or overtopping',
    optional: true,
  },
  {
    partId: 'ponding',
    name: 'Ponding / detention zone',
    purpose: 'Temporary storage above the filter media',
    typicalFailure: 'Persistent standing water',
  },
  {
    partId: 'mulch',
    name: 'Mulch layer',
    purpose: 'Protects the surface and holds moisture',
    typicalFailure: 'Thinning or floating away',
  },
  {
    partId: 'planting',
    name: 'Planting',
    purpose: 'Maintains a porous surface',
    typicalFailure: 'Bare patches, weeds or dead planting',
  },
  {
    partId: 'media',
    name: 'Filter media',
    purpose: 'Main infiltration layer; amendment depends on trial arm',
    typicalFailure: 'Clogging, compaction or settlement',
  },
  {
    partId: 'transition',
    name: 'Transition / geotextile layer',
    purpose: 'Limits downward fines migration',
    typicalFailure: 'Fines migration; inferred by inspection',
  },
  {
    partId: 'drainage',
    name: 'Gravel drainage layer',
    purpose: 'Carries water to the underdrain',
    typicalFailure: 'Silting',
  },
  {
    partId: 'underdrain',
    name: 'Perforated underdrain',
    purpose: 'Collects filtered water',
    typicalFailure: 'Clogging, crushing or leaking joints',
  },
  {
    partId: 'cleanout',
    name: 'Cleanout / observation well',
    purpose: 'Inspection and flushing access',
    typicalFailure: 'Missing cap or silt',
  },
  {
    partId: 'liner',
    name: 'Impermeable liner',
    purpose: 'Optional isolation in sensitive soils',
    typicalFailure: 'Not applicable when not installed',
    optional: true,
  },
  {
    partId: 'overflow',
    name: 'Overflow riser / grate',
    purpose: 'Passes flows above storage capacity',
    typicalFailure: 'Blocked grate or repeated overflow',
  },
  {
    partId: 'outfall',
    name: 'Outlet to drain network',
    purpose: 'Discharges to the receiving drain',
    typicalFailure: 'Blockage or backwater',
  },
];
export const bayParts: (PartDefinition & { partId: BayPartId })[] = [
  {
    partId: 'intake',
    name: 'Intake: scale and checklist',
    purpose: 'Weigh inputs and record a human photo checklist',
    typicalFailure: 'Contamination or missing checks',
  },
  {
    partId: 'bay',
    name: 'Compost bay / pile',
    purpose: 'Active composting with two probe depths',
    typicalFailure: 'Not heating, wet pile, smell or pests',
  },
  {
    partId: 'bulking',
    name: 'Dry carbon store',
    purpose: 'Bulking material stock',
    typicalFailure: 'Stock unavailable; visual check',
  },
  {
    partId: 'cover',
    name: 'Rain cover',
    purpose: 'Limits rain entering the pile',
    typicalFailure: 'Missing or damaged cover',
  },
  {
    partId: 'base',
    name: 'Base and slope',
    purpose: 'Routes liquid toward the sump',
    typicalFailure: 'Puddles or blocked channel',
  },
  {
    partId: 'sump',
    name: 'Leachate sump',
    purpose: 'Contains collected leachate for inspection',
    typicalFailure: 'High level or leachate after rain',
  },
  {
    partId: 'curing',
    name: 'Curing area',
    purpose: 'Tracks the return to ambient temperature',
    typicalFailure: 'Reheating or incomplete maturity checks',
  },
  {
    partId: 'weather',
    name: 'Rain gauge',
    purpose: 'Reference rain input for cover and sump checks',
    typicalFailure: 'Missing or uncalibrated readings',
  },
];
export const partName = (id: PartId) =>
  [...drainParts, ...bayParts].find((p) => p.partId === id)?.name ?? id;
export const faultRules: Pick<
  FaultRule,
  'synthetic' | 'id' | 'label' | 'check' | 'diagnosingInput' | 'scope'
>[] = [
  [
    'inlet_debris',
    'Inlet sediment or debris',
    'Inspect sediment and debris at the inlet and forebay; check bypass.',
    'Inlet level + visual inspection',
    'drainage',
  ],
  [
    'surface_condition',
    'Surface sediment and bare soil',
    'Inspect surface sediment, erosion, weeds and sparse planting.',
    'Visual only; soil moisture is an indirect proxy',
    'drainage',
  ],
  [
    'persistent_ponding',
    'Standing water after rain',
    'Compare elapsed time after rain with the configured inspection period. Inspect trapped sediment and underdrain function.',
    'Ponding depth + observation well + manual elapsed-time record',
    'drainage',
  ],
  [
    'mulch_condition',
    'Thinned or displaced mulch',
    'Inspect mulch coverage and evidence of floating material.',
    'Visual only',
    'drainage',
  ],
  [
    'outlet_condition',
    'Outlet and underdrain obstruction',
    'Inspect blocked outlet, backwater, pipe joints and observation-well level.',
    'Outlet level / flow switch + observation well + visual inspection',
    'drainage',
  ],
  [
    'cleanout_condition',
    'Cleanout cap and joint check',
    'Inspect missing caps, silt and leaking pipe joints.',
    'Visual only; observation-well level supports the inspection',
    'drainage',
  ],
  [
    'infiltration_protocol',
    'Fixed-point infiltration re-test',
    'Use the same marked points, method and repeats. Moisture is not the trial outcome.',
    'Manual infiltration reference; soil sensors are indirect proxies',
    'drainage',
  ],
  [
    'not_heating',
    'Pile not heating',
    'Compare pile probe temperature with the configured not-heating prompt; confirm with the reference probe.',
    'Pile temperature probes + air reference',
    'compost',
  ],
  [
    'putrid_smell',
    'Putrid / rotten-egg smell',
    'Record the human smell and squeeze check; inspect wet material.',
    'Manual smell + squeeze reference',
    'compost',
  ],
  [
    'ammonia_smell',
    'Ammonia smell',
    'Record the human smell check and review the dry-carbon input.',
    'Manual smell reference; no ammonia gas sensor',
    'compost',
  ],
  [
    'too_wet',
    'Wet pile or puddles',
    'Use the squeeze test to confirm relative moisture; inspect puddles.',
    'Capacitive moisture proxy + manual squeeze + visual inspection',
    'compost',
  ],
  [
    'pests',
    'Pests around the bay',
    'Record a visual inspection of pests and cover condition.',
    'Visual only',
    'compost',
  ],
  [
    'leachate_after_rain',
    'Leachate after rain',
    'Check cover, base channel and sump following rain.',
    'Rain gauge + sump level + visual inspection',
    'compost',
  ],
  [
    'intake_check',
    'Intake contamination check',
    'Weigh intake and complete the human photo checklist. The photo is not an automated model.',
    'Scale reference + human photo checklist',
    'compost',
  ],
  [
    'maturity',
    'Ambient / no-reheat maturity gate',
    'Compare curing temperature to measured air temperature; require no reheat and human maturity checks.',
    'Curing temperature + air reference + human checklist',
    'compost',
  ],
  [
    'sensor_trust',
    'Sensor trust',
    'Investigate drift, suspect values or offline reporting before relying on an alert.',
    'Sensor calibration, drift and reporting status',
    'sensor',
  ],
].map(([id, label, check, diagnosingInput, scope]) => ({
  synthetic: true,
  id,
  label,
  check,
  diagnosingInput,
  scope: scope as FaultRule['scope'],
}));

export const legacyParts: Record<string, DrainPartId> = {
  amended: 'media',
  subsoil: 'transition',
  chamber: 'inlet',
};
export const partLink = (
  ownerId: string,
  partId: PartId,
  scope: 'drainage' | 'compost' | 'site',
) =>
  scope === 'compost'
    ? `/batches/${encodeURIComponent(ownerId)}?part=${partId}`
    : scope === 'site'
      ? '/?sensors=1'
      : `/feature/${encodeURIComponent(ownerId)}?part=${partId}`;
