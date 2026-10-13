import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ModelWorkspace from '../components/ModelWorkspace';
import Status from '../components/Status';
import StormPreview from '../components/StormPreview';
import { QueryState } from '../components/QueryState';
import { armName, dateOnly, testMean } from '../utils';
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
                Zone {data.feature.zone} · Installed {dateOnly(data.feature.installedAt)} ·
                synthetic
              </p>
            </div>
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
              {data.trial ? dateOnly(data.trial.nextRetestDue) : 'No trial scheduled'}
            </div>
            <div>
              <small>Owner of record</small>
              {data.trial?.owner?.name || data.feature.ownerOfRecord}
            </div>
          </div>
          {id === 'S1' && <StormPreview />}
          <div id="drain-assembly" />
          <ModelWorkspace
            ownerId={id}
            parts={data.feature.parts}
            sensors={data.sensors}
            config={data.config}
            faults={data.faults}
          />
          {data.trial && (
            <section className="panel" style={{ marginTop: 18 }}>
              <h2>Keep the comparison traceable</h2>
              <p className="sub">
                {baseline?.value ?? 'No baseline'} → {after?.value ?? 'No re-test'} mm/h · Same
                marked points · n = {after?.n ?? baseline?.n ?? 0} · synthetic
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
