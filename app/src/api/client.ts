import { mockRequest } from './mock';
import type {
  Sensor,
  SensorReading,
  Part,
  FaultRule,
  AllocationInput,
  BatchChecks,
  BatchDetail,
  BatchReading,
  Config,
  Fault,
  FaultAction,
  Feature,
  FeatureDetail,
  Guardrails,
  House,
  Metric,
  Ok,
  RainPoint,
  Reading,
  TestInput,
  TrialDetail,
  Zone,
  ZoneRain,
} from './types';
export const CONTRACT_VERSION = '3.0.0';
const base = import.meta.env.VITE_API_BASE?.replace(/\/$/, '');
export let isMock = !base || import.meta.env.VITE_DATA_SOURCE === 'mock';
let selected: Promise<void> | undefined;
async function selectSource() {
  if (isMock) return;
  selected ??= fetch(base + '/config', {
    signal: AbortSignal.timeout(2500),
    credentials: 'include',
  })
    .then((response) => {
      if (response.status >= 500) throw new Error('Connection unavailable');
    })
    .catch(() => {
      isMock = true;
    });
  await selected;
}
export function showDataNotice() {
  return (
    import.meta.env.VITE_SHOW_DATA_NOTICE === 'true' ||
    (import.meta.env.VITE_SHOW_DATA_NOTICE !== 'false' && isMock)
  );
}
async function request<T>(path: string, body?: unknown): Promise<T> {
  await selectSource();
  if (isMock) return (await mockRequest(path, body === undefined ? 'GET' : 'POST', body)) as T;
  const response = await fetch(base + path, {
    credentials: 'include',
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : `Request failed (${response.status}). Your change was not saved. Try again.`,
    );
  }
  return (await response.json()) as T;
}
const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, value);
  });
  return '?' + search;
};
export const api = {
  sensors: (filters: { ownerId?: string; zone?: string; partId?: string; status?: string } = {}) =>
    request<Sensor[]>('/sensors' + query(filters)),
  sensor: (id: string) => request<Sensor>('/sensors/' + encodeURIComponent(id)),
  sensorReadings: (id: string) =>
    request<SensorReading[]>('/sensors/' + encodeURIComponent(id) + '/readings'),
  faultRule: (id: string) => request<FaultRule>('/fault-rules/' + encodeURIComponent(id)),
  faultStatus: (id: string, input: { status: Fault['status']; note?: string; user: string }) =>
    request<Fault>('/faults/' + encodeURIComponent(id) + '/status', input),
  reportFault: (input: {
    featureId: string;
    partId: string;
    type: Fault['type'];
    note: string;
    user: string;
    severity: 1 | 2 | 3;
  }) => request<Fault>('/faults', input),
  faultRules: () => request<FaultRule[]>('/fault-rules'),
  batchParts: (id: string) => request<Part[]>('/batch-parts/' + encodeURIComponent(id)),
  config: () => request<Config>('/config'),
  zones: () => request<Zone[]>('/zones'),
  houses: () => request<House[]>('/houses'),
  features: () => request<Feature[]>('/features'),
  feature: (id: string) => request<FeatureDetail>('/features/' + encodeURIComponent(id)),
  rainfall: (from: string, to: string) =>
    request<RainPoint[]>('/rainfall' + query({ from, to, step: '10m' })),
  zoneRain: (from: string, to: string) =>
    request<ZoneRain[]>('/rainfall/zones' + query({ from, to })),
  readings: (id: string, metric?: Metric, from?: string, to?: string) =>
    request<Reading[]>('/readings' + query({ featureId: id, metric, from, to })),
  faults: (from?: string, to?: string) => request<Fault[]>('/faults' + query({ from, to })),
  trials: () => request<TrialDetail[]>('/trials'),
  trial: (id: string) => request<TrialDetail>('/trials/' + id),
  batches: () => request<BatchDetail[]>('/batches'),
  batch: (id: string) => request<BatchDetail>('/batches/' + id),
  faultAction: (id: string, action: FaultAction) =>
    request<Ok>('/faults/' + id + '/actions', { action }),
  test: (id: string, test: TestInput) => request<Ok>('/trials/' + id + '/tests', test),
  guardrails: (id: string, checks: Guardrails) => request<Ok>('/trials/' + id + '/checks', checks),
  batchReading: (id: string, reading: Omit<BatchReading, 't' | 'synthetic'>) =>
    request<Ok>('/batches/' + id + '/readings', reading),
  batchChecks: (id: string, checks: BatchChecks) =>
    request<Ok>('/batches/' + id + '/checks', checks),
  allocate: (id: string, input: AllocationInput) =>
    request<Ok>('/batches/' + id + '/allocate', input),
  createDemoBatch: () => request<Ok>('/batches', {}),
};
