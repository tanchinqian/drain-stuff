import SectionIndex from '../components/SectionIndex';
import ModelDetails from '../components/ModelDetails';
import { sensorLabel } from '../utils';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { confirmed } from '../../../shared/src/physics/faults';
import { useBoard } from '../triage';
import { warningTitle, warningScenario } from '../../../shared/src/warnings';
import { assets, stormPresets, type TriageRow } from '../../../shared/src/contract';
import SearchableSelect from '../components/SearchableSelect';
import PlanMap from '../components/PlanMap';
import NeighbourhoodScene from '../three/NeighbourhoodScene';
import { QueryState } from '../components/QueryState';
import { useSelection } from '../state';
import { radarStops, type RainPlayback } from '../site/weather';
import type { ZoneRain } from '../api/types';
import { hyetograph } from '../simulation/physics/rainfall';
import { useSimulation } from '../simulation/physics/store';
import StormMapPlayback from '../components/StormMapPlayback';
const label = 'Relative ranking, not a prediction';
const emptyRows: TriageRow[] = [];
const MapScene = memo(NeighbourhoodScene);
const MapPlan = memo(PlanMap);
const modeNames: Record<string, string> = {
  installed: 'As installed', cleared: 'If cleared', capacity: 'Capacity limit',
};
const parameterNames: Record<string, string> = {
  ks: 'soil conductivity', drainC: 'outlet capacity', peak: 'rainfall peak',
};
export default function StormBoard() {
  const requestedJob = useRef<string | null>(null);
  const mapRef = useRef<HTMLElement>(null);
  const revealMap = useCallback(() => {
    mapRef.current?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);
  const { jobId, setJob, selected, select } = useBoard();
  const [preset, setPreset] = useState('heavy'),
    [peak, setPeak] = useState(63),
    [duration, setDuration] = useState(45),
    [preview, setPreview] = useState(false),
    [robustness, setRobustness] = useState(true),
    [view, setView] = useState('3d'),
    [layer, setLayer] = useState<'rain' | 'water'>('rain'),
    [cloudOpacity, setCloudOpacity] = useState(55),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [override, setOverride] = useState<TriageRow | null>(null),
    [position, setPosition] = useState(1),
    [reason, setReason] = useState('');
  const navigate = useNavigate(),
    cache = useQueryClient();
  const data = useQuery({
    queryKey: ['board-assets'],
    refetchInterval: 30000,
    queryFn: async () => {
      const [features, houses, zones, sensors] = await Promise.all([
        api.features(),
        api.houses(),
        api.zones(),
        api.sensors(),
      ]);
      return {
        features: features.filter((f) => assets.includes(f.id as (typeof assets)[number])),
        houses,
        zones,
        sensors,
      };
    },
  });
  const faults = useQuery({ queryKey: ['board-faults'], queryFn: () => api.faults() });
  const job = useQuery({
    queryKey: ['storm-job-status', jobId],
    enabled: !!jobId,
    queryFn: () => api.stormStatus(jobId!),
    refetchInterval: (q) =>
      ['queued', 'running'].includes(q.state.data?.status ?? '') ? 500 : false,
  });
  const triage = useQuery({
    queryKey: ['triage', jobId, job.data?.status],
    enabled: job.data?.status === 'completed',
    queryFn: () => api.triage(jobId!),
  });
  const hints = useQuery({ queryKey: ['diagnosis-hints'], queryFn: api.diagnosisHints });
  const warnings = useQuery({
    queryKey: ['weather-warning'],
    queryFn: api.warnings,
    staleTime: 300000,
    retry: false,
  });
  const rows = triage.data?.rows ?? emptyRows;
  const rainPlayback = useMemo<RainPlayback | undefined>(() => {
    const config = rows[0]?.asInstalled.config;
    return config ? { points: hyetograph(config, 'alternating-block'), peakMmHr: config.values.peak.value * 3.6e6 } : undefined;
  }, [rows]);
  useEffect(() => {
    if (!jobId || !rows.length) return;
    useSimulation.getState().loadBoardReplay(rows, jobId);
    if (requestedJob.current === jobId) {
      requestedJob.current = null;
      setLayer('rain');
      revealMap();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
        useSimulation.setState({ playing: true });
    }
  }, [rows, jobId, revealMap]);
  const watchStorm = () => {
    setLayer('rain');
    useSimulation.setState({ second: 0, playing: !matchMedia('(prefers-reduced-motion: reduce)').matches });
    revealMap();
  };
  const scenarioPeak = preset === 'custom' ? peak : stormPresets[preset as keyof typeof stormPresets].peakMmHr;
  const mapPeak = rainPlayback?.peakMmHr ?? scenarioPeak;
  const rain = useMemo<ZoneRain[]>(() => mapPeak > 0
    ? (data.data?.zones ?? []).map((zone) => ({
        synthetic: true, zone: zone.id, peakMmPerHr: mapPeak, totalMm: 0,
      }))
    : [], [data.data?.zones, mapPeak]);
  const ranks = useMemo(() => Object.fromEntries(rows.map((r) => [r.asset, r.rank])), [rows]);
  const choose = useCallback((id: string) => {
    select(id);
    useSelection.getState().selectHouse(null);
  }, [select]);
  async function run() {
    useSimulation.setState({ playing: false });
    setPending(true);
    setError('');
    try {
      const next = await api.stormRun({
        ...(preset === 'custom'
          ? { custom: { peakMmHr: peak, durationMinutes: duration } }
          : { preset: preset as keyof typeof stormPresets }),
        assets: [...assets],
        options: { robustness, previewUnconfirmed: preview, recoveryMinutes: 360 },
      });
      cache.setQueryData(['storm-job-status', next.id], { ...next, result: null });
      requestedJob.current = next.id;
      setJob(next.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  const working = pending || (!job.isError && !triage.isError && (
    (!!jobId && job.isPending) ||
    ['queued', 'running'].includes(job.data?.status ?? '') ||
    (job.data?.status === 'completed' && triage.isPending)
  ));
  const progress = pending ? null : job.data?.progress;
  const progressMax = progress?.total ?? 1;
  const progressValue = !pending && job.data?.status === 'completed'
    ? progressMax : progress?.completed;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Overview</h1>
          <p className="sub">Storm triage · Bandar Bukit Raja Phase 1</p>
        </div>
        <Link className="button" to="/observations">
          Observation history
        </Link>
      </div>
      <SectionIndex items={[["Overview","#storm-heading"],["Replay","#board-replay"],["Parts",'/feature/'+selected+'#feature-parts'],["Sensors","/sensors"]]}><ModelDetails ownerId={selected}/></SectionIndex>
      <section className="panel storm-inputs" aria-labelledby="storm-heading">
        <div>
          <h2 id="storm-heading">Set the storm to compare</h2>
          <p>
            Entered scenarios help prioritise upkeep before a storm. These rainfall values are not a
            forecast.
          </p>
          <p className="small">Run storm calculates new results, then plays the rainfall. Watch storm replays the saved run without recalculating.</p>
        </div>
        {warnings.data?.available && !!warnings.data.warnings?.length && (
          <details>
            <summary>Official weather warnings available</summary>
            <p>Warnings can guide your scenario choice; they do not supply numeric rainfall.</p>
            {warnings.data.warnings.map((warning, i) => (
              <p key={i}>{warningTitle(warning)}</p>
            ))}
            {warningScenario(warnings.data.warnings) ? (
              <button onClick={() => setPreset(warningScenario(warnings.data!.warnings!)!)}>
                Use {warningScenario(warnings.data.warnings)} scenario
              </button>
            ) : (
              <p className="small">
                No recognised warning level was supplied. Choose your rainfall scenario below.
              </p>
            )}
          </details>
        )}
        <div className="storm-form">
          <label className="field">
            Rainfall scenario
            <SearchableSelect
              label="Rainfall scenario"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              {Object.entries(stormPresets).map(([id, p]) => (
                <option key={id} value={id}>
                  {id[0].toUpperCase() + id.slice(1)} · {p.peakMmHr} mm/h × {p.durationMinutes} min
                </option>
              ))}
              <option value="custom">Custom rainfall</option>
            </SearchableSelect>
          </label>
          {preset === 'custom' && (
            <>
              <label className="field">
                Peak rainfall (mm/h)
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={peak}
                  onChange={(e) => setPeak(Number(e.target.value))}
                />
              </label>
              <label className="field">
                Rain duration (minutes)
                <input
                  type="number"
                  min="1"
                  max="180"
                  step="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </label>
            </>
          )}
          <button className="primary" disabled={working} onClick={run}>
            {working ? 'Calculating…' : 'Run storm'}
          </button>
          {rainPlayback && !working && <button onClick={watchStorm}>Watch storm</button>}
        </div>
        <div className="actions">
          <label>
            <input
              type="checkbox"
              checked={preview}
              onChange={(e) => setPreview(e.target.checked)}
            />{' '}
            Preview unconfirmed faults
          </label>
          <label>
            <input
              type="checkbox"
              checked={robustness}
              onChange={(e) => setRobustness(e.target.checked)}
            />{' '}
            Check ranking under ±25%
          </label>
        </div>
        {(error || job.error || triage.error || job.data?.error) && (
          <p role="alert">
            {error || job.error?.message || triage.error?.message || job.data?.error}
          </p>
        )}
        <p role="status">
          {working
            ? pending
              ? 'Starting the storm calculation…'
              : job.data?.status === 'completed'
                ? 'Calculations complete. Preparing the ranking…'
                : progress
                  ? `${progress.completed} of ${progress.total} comparisons complete · ${progress.asset} · ${progress.phase === 'sensitivity' ? `Checking ${parameterNames[progress.parameter!] ?? progress.parameter} at ${Math.round(progress.multiplier! * 100)}%` : modeNames[progress.mode]}`
                  : job.data?.status === 'queued'
                    ? 'Queued behind the current storm calculation…'
                    : 'Starting asset comparisons…'
            : rows.length
              ? `${rows.length} assets compared. ${triage.data?.robustness.evaluated ? (triage.data.robustness.stable ? 'Ranking stable under ±25%.' : 'Order changes under ±25%.') : 'Sensitivity check not run.'}`
              : 'Choose a scenario and run the storm to see the ranking.'}
        </p>
        {working && (
          <div
            className={'storm-progress' + (progressValue === undefined ? ' is-indeterminate' : '')}
            role="progressbar"
            aria-label="Storm calculation progress"
            aria-valuemin={0}
            aria-valuemax={progressMax}
            aria-valuenow={progressValue}
          >
            <span aria-hidden="true" style={{ transform: `scaleX(${(progressValue ?? 0) / progressMax})` }} />
          </div>
        )}
        {job.data && (
          <p className="small">
            Saved run:{' '}
            {job.data.input.custom
              ? `${job.data.input.custom.peakMmHr} mm/h × ${job.data.input.custom.durationMinutes} min`
              : `${job.data.input.preset} preset`}{' '}
            ·{' '}
            {job.data.input.options.previewUnconfirmed
              ? 'Unconfirmed faults included for preview'
              : 'Confirmed faults only'}{' '}
            · {label}
          </p>
        )}
      </section>
      <QueryState loading={data.isPending} error={data.error}>
        <div className="triage-layout">
          <section className="panel triage-register">
            <h2>Upkeep priority</h2>
            <p className="sub">{label}. Capacity-limited assets need owner review.</p>
            <p className="small comparison-legend"><span><i className="legend-installed"/>As installed</span><span><i className="legend-cleared"/>If cleared</span><span><i className="legend-capacity"/>Capacity limit</span></p>
            {!!rows.length && rows.some(row => (faults.data ?? []).filter(f=>f.featureId===row.asset&&confirmed(f)).map(f=>f.id).sort().join()!==[...row.faultIds].sort().join()) && <p className="notice">Fault confirmations have changed since this saved run. Run the storm again to update the comparison.</p>}
            {!rows.length && (
              <p className="empty-note">
                Run the storm to compare As installed, If cleared and Capacity limit for S1, S2, S3, I1
                and the typical roadside inlet R1.
              </p>
            )}
            <div className="triage-rows">
              {rows.map((row) => {
                const related =
                  faults.data?.filter((f) => f.featureId === row.asset && f.status !== 'closed') ??
                  [];
                const max = Math.max(
                  0.001,
                  ...[row.asInstalled, row.ifCleared, row.capacityLimit].map(
                    (m) => m.summary.overflowM3,
                  ),
                );
                return (
                  <article
                    className={'triage-row' + (selected === row.asset ? ' selected' : '')}
                    key={row.asset}
                  >
                    <div className="panel-heading">
                      <button
                        className="triage-asset"
                        aria-pressed={selected === row.asset}
                        onClick={() => choose(row.asset)}
                      >
                        <span className="rank-number">{row.rank}</span>
                        <span className="triage-asset-title">
                          <strong>{row.asset}</strong> ·{' '}
                          {data.data?.features.find((f) => f.id === row.asset)?.name}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setOverride(row);
                          setPosition(row.rank);
                          setReason('');
                        }}
                      >
                        Change priority
                      </button>
                    </div>
                    <p className={row.capacityLimited ? 'capacity-note' : 'small'}>
                      {row.capacityLimited
                        ? 'Capacity-limited: escalate to owner'
                        : row.asInstalled.summary.overflowM3 > 1e-8
                          ? 'Upkeep opportunity — compare clearing'
                          : 'No overflow in this scenario'}
                    </p>
                    <p className="comparison-difference">{row.capacityLimited ? 'Escalate: still overflows when cleared' : row.asInstalled.summary.overflowM3-row.ifCleared.summary.overflowM3 > 1e-8 ? `Clearing the fault removes ${(row.asInstalled.summary.overflowM3-row.ifCleared.summary.overflowM3).toFixed(3)} m³ of overflow` : 'No overflow to remove in this scenario'}</p>
                    {row.capacityLimited && Math.abs(row.asInstalled.summary.overflowM3-row.ifCleared.summary.overflowM3)<1e-8 && <p className="small">No difference: capacity-limited</p>}
                    <div
                      className="mode-comparison"
                      aria-label={row.asset + ' overflow comparison'}
                    >
                      {[
                        ['As installed', row.asInstalled],
                        ['If cleared', row.ifCleared],
                        ['Capacity limit', row.capacityLimit],
                      ].map(([name, raw]) => {
                        const m = raw as TriageRow['asInstalled'];
                        return (
                          <div className={"mode-line mode-"+String(name).toLowerCase().replaceAll(" ","-")} key={String(name)}>
                            <span>{String(name)}</span>
                            <span className="mode-track">
                              <span style={{ width: `${(m.summary.overflowM3 / max) * 100}%` }} />
                            </span>
                            <strong>{m.summary.overflowM3.toFixed(3)} m³</strong>
                          </div>
                        );
                      })}
                    </div>
                    <p className="small">
                      Peak ponding {(row.asInstalled.summary.peakPondingM * 1000).toFixed(0)} mm ·
                      Above limit {row.asInstalled.summary.hoursAboveLimit.toFixed(2)} h · {label}
                    </p>
                    <p className="small">
                      Diagnosis hint:{' '}
                      {hints.data?.[row.asset] ?? 'Review the fault for cited evidence'}
                    </p>
                    <div className="fault-chips">
                      {related.length ? (
                        related.map((f) => (
                          <Link className="button" key={f.id} to={'/faults?fault=' + f.id}>
                            {f.id} · {f.workOrder?.state ?? 'detected'}
                            {f.workOrder?.assignee ? ' · ' + f.workOrder.assignee : ''}
                            {(f.workOrder?.state ?? 'detected') === 'detected'
                              ? ' · Unconfirmed'
                              : ''}
                          </Link>
                        ))
                      ) : (
                        <span>No open faults</span>
                      )}
                    </div>
                    <p className="small">
                      {data.data?.sensors
                        .filter((s) => s.ownerId === row.asset && s.deviceId)
                        .map((s) => sensorLabel(s) + ' · ' + s.status)
                        .join(' / ')}
                    </p>
                    <div className="actions">
                      <button
                        onClick={() => {
                          choose(row.asset);
                          navigate(
                            `/feature/${row.asset}?stormRunId=${jobId}&mode=installed&part=${related.find((f) => ['confirmed', 'assigned'].includes(f.workOrder?.state ?? ''))?.partId ?? 'inlet'}`,
                          );
                        }}
                      >
                        Replay in 3D
                      </button>
                      <Link
                        className="button"
                        to={
                          row.capacityLimited
                            ? '/faults?asset=' + row.asset + '&escalate=1'
                            : '/faults?asset=' + row.asset
                        }
                      >
                        {row.capacityLimited ? 'Escalate to owner' : 'Review work orders'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
            {triage.data?.robustness.evaluated && (
              <details>
                <summary>Sensitivity orders</summary>
                <p className="small">{label}</p>
                <ul>
                  {triage.data.robustness.orders.map((o) => (
                    <li key={o.parameter + o.multiplier}>
                      {o.parameter === 'ks'
                        ? 'Conductivity'
                        : o.parameter === 'peak'
                          ? 'Rainfall peak'
                          : 'Outlet capacity'}{' '}
                      × {o.multiplier}: {o.assets.join(' → ')}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
          <section id="board-replay" className="panel triage-map" ref={mapRef}>
            <div className="panel-heading">
              <div>
                <h2>Asset locations</h2>
                <p className="small">
                  Illustrative asset placement on mapped housing. Typical designs, not surveyed.
                </p>
              </div>
              <div className="segments">
                {['3d', 'plan'].map((v) => (
                  <button aria-pressed={view === v} key={v} onClick={() => setView(v)}>
                    {v === '3d' ? '3D' : 'Plan'}
                  </button>
                ))}
              </div>
            </div>
            <div className="scene-toolbar">
              <button
                aria-pressed={layer === 'rain'}
                onClick={() => setLayer(layer === 'rain' ? 'water' : 'rain')}
              >
                Rainfall
              </button>
              <label className="cloud-control">
                Rainfall layer opacity
                <input
                  aria-label="Rainfall layer opacity"
                  type="range" min="0" max="75" step="5"
                  value={cloudOpacity}
                  disabled={layer !== 'rain'}
                  onChange={(e) => setCloudOpacity(Number(e.target.value))}
                />
                <output>{cloudOpacity}%</output>
              </label>
            </div>
            {!rainPlayback && (
              <p className="small rainfall-instant">
                Rainfall preview · {scenarioPeak} mm/h across all zones. Run a storm to play its timeline. Not live radar.
              </p>
            )}
            {data.data &&
              (view === 'plan' ? (
                <MapPlan
                  showHouseList={false}
                  {...data.data}
                  rain={rain}
                  layer={layer}
                  showSensors={false}
                  cloudOpacity={cloudOpacity}
                  rainPlayback={rainPlayback}
                  ranks={ranks}
                  selectedAsset={selected}
                  onSelectAsset={choose}
                />
              ) : (
                <MapScene
                  {...data.data}
                  rain={rain}
                  layer={layer}
                  showSensors={false}
                  cloudOpacity={cloudOpacity}
                  rainPlayback={rainPlayback}
                  reset={0}
                  ranks={ranks}
                  selectedAsset={selected}
                  onSelectAsset={choose}
                />
              ))}
            {rainPlayback && <StormMapPlayback playback={rainPlayback} />}
            {layer === 'rain' && (
              <div className="heat-legend" aria-label="Rainfall intensity legend">
                {radarStops.map((stop) => (
                  <span key={stop.value}>
                    <i style={{ background: stop.color }} />{stop.label}
                  </span>
                ))}
              </div>
            )}
            <p className="small">Numbered outlines match the priority list · {label}</p>
            <Link
              className="button"
              to={'/feature/' + selected + (jobId ? '?stormRunId=' + jobId : '')}
            >
              Inspect {selected}
            </Link>
          </section>
        </div>
      </QueryState>
      {override && (
        <section className="panel" aria-labelledby="override-heading">
          <h2 id="override-heading">Override priority for {override.asset}</h2>
          <label className="field">
            Position
            <SearchableSelect
              label="Priority position"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
            >
              {rows.map((_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </SearchableSelect>
          </label>
          <label className="field">
            Required reason
            <textarea value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="actions">
            <button
              disabled={pending || !reason.trim()}
              onClick={async () => {
                setPending(true);
                try {
                  await api.triageOverride({
                    stormRunId: jobId!,
                    asset: override.asset,
                    position,
                    reason,
                  });
                  await cache.invalidateQueries({ queryKey: ['triage'] });
                  setOverride(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              Save logged override
            </button>
            <button onClick={() => setOverride(null)}>Cancel</button>
          </div>
        </section>
      )}
    </>
  );
}
