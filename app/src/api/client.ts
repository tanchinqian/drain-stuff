import { mockRequest } from './mock';
import type {
  Sensor,
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
const base = import.meta.env.VITE_API_BASE?.replace(/\/$/, '');
export const isMock = !base;
async function request<T>(path: string, body?: unknown): Promise<T> {
  if (!base) return (await mockRequest(path, body === undefined ? 'GET' : 'POST', body)) as T;
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`API request failed (${response.status}). Check the connection and try again.`);
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
  readings: (id: string, metric?: Metric) =>
    request<Reading[]>('/readings' + query({ featureId: id, metric })),
  faults: () => request<Fault[]>('/faults'),
  trials: () => request<TrialDetail[]>('/trials'),
  trial: (id: string) => request<TrialDetail>('/trials/' + id),
  batches: () => request<BatchDetail[]>('/batches'),
  batch: (id: string) => request<BatchDetail>('/batches/' + id),
  faultAction: (id: string, action: FaultAction) =>
    request<Ok>('/faults/' + id + '/actions', { action }),
  test: (id: string, test: TestInput) => request<Ok>('/trials/' + id + '/tests', test),
  guardrails: (id: string, checks: Guardrails) =>
    request<Ok>('/trials/' + id + '/guardrails', checks),
  batchReading: (id: string, reading: Omit<BatchReading, 't' | 'synthetic'>) =>
    request<Ok>('/batches/' + id + '/readings', reading),
  batchChecks: (id: string, checks: BatchChecks) =>
    request<Ok>('/batches/' + id + '/checks', checks),
  allocate: (id: string, input: AllocationInput) =>
    request<Ok>('/batches/' + id + '/allocate', input),
  createDemoBatch: () => request<Ok>('/batches', {}),
};
