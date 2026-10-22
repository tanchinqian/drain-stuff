import SectionIndex from '../components/SectionIndex';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelection } from '../state';
import FaultChatbot from '../components/FaultChatbot';
import ChatReference from '../components/ChatReference';
import type { FaultChatSource } from '../../../shared/src/faultChat';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ModelDetails from '../components/ModelDetails';
import { formatValue } from '../utils';
import ModelWorkspace from '../components/ModelWorkspace';
import Status from '../components/Status';
import PhysicsPanel from '../components/PhysicsPanel';
import { usePhysics, useLiveSensors, modelFaults } from '../simulation/physics/view';
import { buildParts } from '../api/parts';
import type { Sensor } from '../api/types';
const emptySensors: Sensor[] = [];
import { QueryState } from '../components/QueryState';
import { armName, dateOnly, testMean, trialDue } from '../utils';
import { useSimulation } from '../simulation/physics/store';
export default function FeatureDetail() {
  const { id = 'S1' } = useParams();
  const navigate = useNavigate();
  const selectedPart = useSelection(state => state.partId);
  const [reference, setReference] = useState<FaultChatSource | null>(null);
  const [params, setParams] = useSearchParams();
  const jobId = params.get('stormRunId'), mode = params.get('mode') === 'cleared' ? 'cleared' : 'installed';
  const replay = useQuery({queryKey:['storm-job',jobId],enabled:!!jobId,queryFn:()=>api.stormResult(jobId!)});
  const row = replay.data?.result?.rows.find(r=>r.asset===id);
  useEffect(()=>{ if(row && jobId) useSimulation.getState().loadReplay(mode==='cleared'?row.ifCleared.config:row.asInstalled.config,jobId,mode); },[row,jobId,mode]);
  const result = useQuery({
    queryKey: ['feature-detail', id],
    queryFn: async () => {
      const [feature, faults, trials, sensors, config] = await Promise.all([
        api.feature(id),
        api.faults(),
        api.trials(),
        api.sensors({ ownerId: id }),
        api.config(),
      ]);
      return { feature, faults, sensors, config, trial: trials.find((t) => t.featureId === id) };
    },
  });
  const data = result.data;
  const physics = usePhysics(id);
  const liveSensors = useLiveSensors(data?.sensors ?? emptySensors);
  const liveFaults =
    data && physics.config
      ? modelFaults(physics.config, physics.frame, liveSensors, data.feature.zone)
      : [];
  const activeFaults = [...liveFaults, ...(data?.faults ?? [])];
  const liveParts = buildParts(id, liveSensors, activeFaults);
  const baseline = data?.trial && testMean(data.trial.tests, 'baseline'),
    after = data?.trial && testMean(data.trial.tests, 'retest');
  return (
    <QueryState loading={result.isPending} error={result.error}>
      {data && (
        <>
          <FaultChatbot key={id} assetId={id} partId={selectedPart}
            faultId={data.faults.find(fault => fault.featureId === id && fault.partId === selectedPart && fault.status !== 'closed' && !fault.id.startsWith('SIM-'))?.id}
            onSource={source => {
              if (source.kind === 'fault' || source.kind === 'rule') navigate(`/faults?${source.kind}=${encodeURIComponent(source.id)}`);
              else setReference(source);
            }} />
          {reference && <ChatReference source={reference} onClose={() => setReference(null)} />}
          <div className="page-heading">
            <div>
              <h1>
                {id} · {data.feature.name}
              </h1>
              <p className="sub">
                Zone {data.feature.zone} · Installed {dateOnly(data.feature.installedAt)}
              </p>
            </div>
            <Link className="button" to="/">
              Back to Overview
            </Link>
          </div>
          <SectionIndex items={[["Overview","#feature-summary"],["Replay","#feature-replay"],["Parts","#feature-parts"],["Sensors","#feature-sensors"]]}><ModelDetails ownerId={id}/></SectionIndex>
          <div className="summary-strip" id="feature-summary">
            <div>
              <small>Trial arm</small>
              {data.feature.arm ? armName[data.feature.arm] : 'No soil-treatment arm'}
            </div>
            <div>
              <small>Pilot dose</small>
              {data.trial?.doseLabel || 'No compost allocated'}
            </div>
            <div>
              <small>Next re-test</small>
              {data.trial ? dateOnly(trialDue(data.trial)) : 'No trial scheduled'}
            </div>
            <div>
              <small>Owner of record</small>
              {data.trial?.owner?.name || data.feature.ownerOfRecord}
            </div>
          </div>
          {data.trial?.batchId && (
            <section className="compost-applied panel">
              <h2>Compost applied</h2>
              <p>
                <Link to={'/batches?batch=' + data.trial.batchId}>{data.trial.batchId}</Link> ·{' '}
                {data.trial.doseLabel ?? 'Dose not recorded'} ·{' '}
                {data.config.pilotDoses.find((d) => d.label === data.trial?.doseLabel)?.lPerM2 ??
                  '—'}{' '}
                L/m² · Mixing depth{' '}
                {data.trial.amendedDepthM
                  ? formatValue(data.trial.amendedDepthM * 1000, 'mm')
                  : 'not recorded'}{' '}
                · {data.trial.appliedAt ? dateOnly(data.trial.appliedAt) : 'Date not recorded'}
              </p>
              <p className="small">Conductivity follows the test record or entered value.</p>
            </section>
          )}
          <p className="small">{physics.config?.dimensionRecord ? `Dimensions entered by operator: ${dateOnly(physics.config.dimensionRecord.at)}, ${physics.config.dimensionRecord.user}` : 'Typical design, not surveyed'}{id === 'R1' ? ' · Roadside kerb inlet and concrete drain; equivalent Manning capacity' : ''}</p>
          {jobId && <section className="panel replay-controls"><h2>Saved storm replay</h2>{row ? <><p>Replaying the original inputs for {id}. Changes since this run are excluded.</p><div className="segments">{[['installed','As installed'],['cleared','If cleared']].map(([value,title])=><button key={value} aria-pressed={mode===value} onClick={()=>{const next=new URLSearchParams(params);next.set('mode',value);setParams(next);}}>{title}</button>)}</div><p className="small">Overflow: {row.asInstalled.summary.overflowM3.toFixed(3)} → {row.ifCleared.summary.overflowM3.toFixed(3)} m³ · Relative ranking, not a prediction</p></>:<p role="status">{replay.error?.message ?? 'Loading saved scenario…'}</p>}</section>}
          <div id="drain-assembly" />
          <ModelWorkspace
            ownerId={id}
            key={id}
            physics={
              physics.config
                ? {
                    config: physics.config,
                    frame: physics.frame,
                    amendment:
                      data.trial?.amendedDepthM && data.trial.batchId
                        ? {
                            depth: data.trial.amendedDepthM,
                            dose: data.trial.doseLabel ?? '',
                            batch: data.trial.batchId,
                          }
                        : undefined,
                  }
                : undefined
            }
            parts={liveParts}
            sensors={liveSensors}
            config={data.config}
            faults={activeFaults}
          />
          <details className="storm-disclosure">
            <summary>Storm settings, charts and model parameters</summary>
            <PhysicsPanel ownerId={id} trial={data.trial} />
          </details>
          <p className="small">
            Live model alerts above are temporary scenario outputs.{' '}
            <Link style={{ textDecoration: 'underline' }} to="/faults">
              Open fault history
            </Link>
            .
          </p>
          {data.trial && (
            <section className="panel" style={{ marginTop: 18 }}>
              <h2>Trial record</h2>
              <p className="sub">
                {baseline?.value ?? 'No baseline'} → {after?.value ?? 'No re-test'} mm/h · Same
                marked points · n = {after?.n ?? baseline?.n ?? 0}
              </p>
              <p className="takeaway">
                Pilot, small sample, not proof.{' '}
                <Link to={'/trials?feature=' + id}>Open trial protocol and lineage</Link>
              </p>
              <Status status={data.trial.guardrails.drainDownFlag ? 'watch' : 'ok'} />
            </section>
          )}
        </>
      )}
    </QueryState>
  );
}
