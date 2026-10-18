import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Fault, FaultRule, Feature } from '../api/types';
import { displayName, exportCsv, faultOrder } from '../utils';
import { partName } from '../api/modelCatalog';
import NeighbourhoodScene from '../three/NeighbourhoodScene';
import PlanMap from './PlanMap';
import FaultRecordCard from './FaultRecordCard';
import SearchableSelect from './SearchableSelect';

const Scene = memo(NeighbourhoodScene);
const Plan = memo(PlanMap);
const sceneCallouts: Record<string, [number, number]> = {
  S1: [-24, -14], S2: [10, -16], S3: [-26, 14], I1: [32, -2],
  T1: [-2, 20], T2: [14, 22], R1: [33, 18],
};
const planCallouts: Record<string, [number, number]> = {
  S1: [-24, -12], S2: [10, -13], S3: [-24, 12], I1: [29, -4],
  T1: [-2, 15], T2: [12, 15], R1: [29, 15],
};
export default function FaultMapRegister({
  faults,
  rules,
  features,
  asset,
  onAsset,
  onSelect,
  onRule,
  ruleFilter,
}: {
  faults: Fault[];
  rules: FaultRule[];
  features: Feature[];
  asset: string;
  onAsset: (id: string) => void;
  onSelect: (fault: Fault) => void;
  onRule: (id: string) => void;
  ruleFilter: string | null;
}) {
  const [view, setView] = useState<'3d' | 'plan'>('3d');
  const [search, setSearch] = useState(''),
    [zone, setZone] = useState(''),
    [kind, setKind] = useState(''),
    [status, setStatus] = useState(''),
    [sort, setSort] = useState('priority');
  const context = useQuery({
    queryKey: ['fault-map-context'],
    queryFn: async () => {
      const [houses, zones, sensors] = await Promise.all([
        api.houses(),
        api.zones(),
        api.sensors(),
      ]);
      return { houses, zones, sensors };
    },
  });
  const selectHouse = useCallback((id: string) => {
    const house = context.data?.houses.find(item => item.id === id);
    onAsset(house?.drainId ?? id);
  }, [context.data, onAsset]);
  const selectedMapAsset = context.data?.houses.find(house => house.drainId === asset)?.id ?? asset;
  const ruleLabel = (fault: Fault) =>
    rules.find((rule) => rule.id === fault.ruleId)?.label ??
    (fault.ruleId === 'MANUAL' ? 'Manual report' : fault.ruleId);
  const filtered = faults.filter(
    (fault) =>
      (!ruleFilter || fault.ruleId === ruleFilter) &&
      (!zone || fault.zone === zone) &&
      (!kind || fault.type === kind) &&
      (!status || fault.status === status) &&
      [
        fault.id,
        displayName(fault.type),
        fault.featureId,
        partName(fault.partId),
        fault.zone,
        fault.severity === 3 ? 'High' : fault.severity === 2 ? 'Medium' : 'Low',
        fault.openedAt,
        fault.status,
        fault.workOrder?.state ?? 'detected',
        ruleLabel(fault),
        fault.ruleId,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const rows = filtered
    .filter((fault) => !asset || fault.featureId === asset)
    .sort((a, b) =>
      sort === 'newest'
        ? b.openedAt.localeCompare(a.openedAt)
        : sort === 'oldest'
          ? a.openedAt.localeCompare(b.openedAt)
          : sort === 'id'
            ? a.id.localeCompare(b.id, undefined, { numeric: true })
            : faultOrder(a, b),
    );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        features.map((feature) => [
          feature.id,
          faults.filter(
            (fault) =>
              fault.featureId === feature.id &&
              fault.status !== 'closed' &&
              fault.workOrder?.state !== 'closed',
          ).length,
        ]),
      ),
    [features, faults],
  );
  const hasFilter = !!(search || zone || kind || status || ruleFilter);
  const showRecords = !!asset || hasFilter;
  const selectedFeature = features.find((feature) => feature.id === asset);
  const detailsUrl = selectedFeature
    ? '/feature/' + asset
    : asset.startsWith('B-')
      ? '/batches/' + asset
      : undefined;
  return (
    <>
      <div className="fault-map-toolbar">
        <label className="field">
          Search faults
          <input
            type="search"
            aria-label="Search faults"
            placeholder="ID, asset, part or rule"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="field">
          Zone
          <select
            aria-label="Fault zone"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
          >
            <option value="">All zones</option>
            {[...new Set(faults.map((f) => f.zone))].sort().map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Fault class
          <SearchableSelect
            label="Fault class"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="">All classes</option>
            {[...new Set(faults.map((f) => f.type))].sort().map((value) => (
              <option key={value} value={value}>
                {displayName(value)}
              </option>
            ))}
          </SearchableSelect>
        </label>
        <label className="field">
          Status
          <select
            aria-label="Fault status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {['open', 'inspected', 'closed'].map((value) => (
              <option key={value} value={value}>
                {displayName(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Order
          <select
            aria-label="Fault order"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="priority">Priority</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="id">Fault ID</option>
          </select>
        </label>
        <button
          onClick={() =>
            exportCsv(
              'faults',
              [
                'ID',
                'Title',
                'Asset',
                'Part',
                'Severity',
                'Opened',
                'Status',
                'Work order',
                'Rule',
                'Rule ID',
                'Zone',
              ],
              rows.map((fault) => [
                fault.id,
                displayName(fault.type),
                fault.featureId,
                partName(fault.partId),
                fault.severity,
                fault.openedAt,
                fault.status,
                fault.workOrder?.state ?? 'detected',
                ruleLabel(fault),
                fault.ruleId,
                fault.zone,
              ]),
            )
          }
        >
          Export CSV
        </button>
      </div>
      <div className="fault-map-layout">
        <section className="fault-map-model" aria-labelledby="fault-map-heading">
          <div className="panel-heading">
            <div>
              <h2 id="fault-map-heading">Asset locations</h2>
              <p className="small">
                Select a drainage asset or pilot house to reveal its fault IDs. Markers show
                open-fault counts.
              </p>
            </div>
            <div className="segments" aria-label="Fault map view">
              {(['3d', 'plan'] as const).map((value) => (
                <button key={value} aria-pressed={view === value} onClick={() => setView(value)}>
                  {value === '3d' ? '3D' : 'Plan'}
                </button>
              ))}
            </div>
          </div>
          {context.isPending ? (
            <p role="status">Loading asset map…</p>
          ) : context.error ? (
            <p role="alert">The map could not load. Select an asset to view its fault records.</p>
          ) : (
            context.data &&
            (view === '3d' ? (
              <Scene
                {...context.data}
                features={features}
                rain={[]}
                layer="rain"
                cloudOpacity={0}
                showSensors={false}
                reset={0}
                faultCounts={counts}
                assetCallouts={sceneCallouts}
                selectedAsset={selectedMapAsset}
                onSelectAsset={onAsset}
                onSelectHouse={selectHouse}
              />
            ) : (
              <Plan
                {...context.data}
                features={features}
                rain={[]}
                layer="rain"
                cloudOpacity={0}
                showSensors={false}
                faultCounts={counts}
                assetCallouts={planCallouts}
                selectedAsset={selectedMapAsset}
                onSelectAsset={onAsset}
                onSelectHouse={selectHouse}
                showHouseList={false}
              />
            ))
          )}
        </section>
        <section className="fault-map-records" aria-labelledby="fault-map-records-heading">
          <div className="panel-heading">
            <div>
              <h2 id="fault-map-records-heading">
                {asset ? `${asset} faults` : hasFilter ? 'Matching faults' : 'Fault records'}
              </h2>
              {selectedFeature && <p className="small">{selectedFeature.name}</p>}
            </div>
            {asset && <button onClick={() => onAsset('')}>Clear selection</button>}
          </div>
          {!showRecords ? (
            <p className="empty-note">
              Select an asset to see its fault IDs, or search and filter across all faults.
            </p>
          ) : (
            <>
              <p className="small" role="status">
                {rows.length} {rows.length === 1 ? 'fault' : 'faults'}
                {asset ? ` for ${asset}` : ''}
                {hasFilter ? ' matching filters' : ''}.
              </p>
              {!rows.length && (
                <p className="empty-note">
                  {hasFilter
                    ? 'No faults match these filters.'
                    : 'No open faults. No recorded faults for this asset.'}
                </p>
              )}
              {!!rows.length &&
                rows.every(
                  (fault) => fault.status === 'closed' || fault.workOrder?.state === 'closed',
                ) && <p className="small">No open faults.</p>}
              <div className="fault-map-cards">
                {rows.map((fault) => (
                  <FaultRecordCard
                    key={fault.id}
                    fault={fault}
                    rule={rules.find((rule) => rule.id === fault.ruleId)}
                    onSelect={onSelect}
                    onRule={onRule}
                  />
                ))}
              </div>
            </>
          )}
          {detailsUrl && (
            <Link className="button" to={detailsUrl}>
              View {asset} asset details
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
