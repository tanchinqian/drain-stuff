import { useParams, Link } from 'react-router-dom';
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
export default function FeatureDetail() {
  const { id = 'S1' } = useParams();
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
          <div className="page-heading">
            <div>
              <h1>
                {id} · {data.feature.name}
              </h1>
              <p className="sub">
                Zone {data.feature.zone} · Installed {dateOnly(data.feature.installedAt)}
              </p>
            </div>
            <ModelDetails ownerId={id} />
            <Link className="button" to="/">
              Back to Overview
            </Link>
          </div>
          <div className="summary-strip">
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
