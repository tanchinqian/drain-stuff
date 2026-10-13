import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { armName, dateOnly, exportCsv, overdue } from '../utils';
import { QueryState } from '../components/QueryState';
import TrialComparison from '../components/TrialComparison';
import TrialTestForm from '../components/TrialTestForm';
import GuardrailForm from '../components/GuardrailForm';
import AllocationForm from '../components/AllocationForm';
export default function Trials() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['trial-register'],
    queryFn: async () => {
      const [trials, batches, config] = await Promise.all([
        api.trials(),
        api.batches(),
        api.config(),
      ]);
      return { trials, batches, config };
    },
  });
  const data = query.data,
    selected =
      data?.trials.find((t) => t.featureId === (params.get('feature') || 'S1')) || data?.trials[0];
  const rows =
    data?.trials.filter((t) =>
      [t.featureId, armName[t.arm], t.soilTexture, t.owner?.name, t.batchId, t.doseLabel]
        .join(' ')
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    ) ?? [];
  return (
    <QueryState loading={query.isPending} error={query.error}>
      <div className="page-heading">
        <div>
          <h1>One trial. Three arms.</h1>
          <p className="sub">Measured difference · synthetic · Pilot, small sample, not proof</p>
        </div>
        <button
          onClick={() =>
            data &&
            exportCsv(
              'trial-register',
              ['Feature', 'Arm', 'Soil', 'Baseline', 'n', 'Dose', 'Batch', 'Next re-test'],
              data.trials.map((t) => [
                t.featureId,
                t.arm,
                t.soilTexture,
                t.baselineDone ? 'Complete' : 'Missing',
                t.n,
                t.doseLabel || 'None',
                t.batchId || 'None',
                t.nextRetestDue,
              ]),
            )
          }
        >
          Export register
        </button>
      </div>
      {data && selected && (
        <>
          <TrialComparison trials={data.trials} config={data.config} />
          <section className="panel">
            <h2>Trial register</h2>
            <label className="field register-search">
              Search trials
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Feature, arm, soil, owner or batch"
              />
            </label>
            {!rows.length && <p role="status">No matching trials. Clear search to see all.</p>}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Feature / arm</th>
                    <th>Soil / baseline</th>
                    <th>Owner of record</th>
                    <th>Lineage</th>
                    <th>Next re-test</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.featureId}>
                      <td>
                        <button
                          aria-pressed={selected.featureId === t.featureId}
                          onClick={() => setParams({ feature: t.featureId })}
                        >
                          {t.featureId}
                        </button>
                        <p className="small">{armName[t.arm]}</p>
                      </td>
                      <td>
                        {t.soilTexture}
                        <p className={t.baselineDone ? 'small' : 'error'}>
                          {t.baselineDone
                            ? 'Baseline complete'
                            : 'Baseline missing — allocation blocked'}
                        </p>
                      </td>
                      <td>
                        {t.owner ? (
                          <>
                            {t.owner.name}
                            <p className="small">
                              {t.owner.role} · handover {dateOnly(t.owner.since)}
                            </p>
                          </>
                        ) : (
                          <span className="error">No owner recorded</span>
                        )}
                      </td>
                      <td>
                        {t.batchId ? (
                          <Link to={'/batches?batch=' + t.batchId}>{t.batchId}</Link>
                        ) : (
                          'No compost'
                        )}
                        <p className="small">{t.doseLabel}</p>
                      </td>
                      <td>
                        {dateOnly(t.nextRetestDue)}
                        {overdue(t.nextRetestDue) && <p className="error">Overdue</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="page-heading" style={{ marginTop: 26 }}>
            <h2>{selected.featureId} · Trial record</h2>
            <Link to={'/feature/' + selected.featureId} className="button">
              Inspect feature
            </Link>
          </div>
          {selected.appliedAt && (
            <div className="summary-strip">
              <div>
                <small>Batch applied</small>
                <Link to={'/batches?batch=' + selected.batchId}>{selected.batchId}</Link>
              </div>
              <div>
                <small>Applied date</small>
                {dateOnly(selected.appliedAt)}
              </div>
              <div>
                <small>Applied by</small>
                {selected.appliedBy}
              </div>
              <div>
                <small>Owner of record</small>
                {selected.owner?.name || 'No owner recorded'}
              </div>
            </div>
          )}
          <div className="trial-layout">
            <div className="stack">
              <TrialTestForm
                key={selected.featureId + '-' + selected.baselineDone}
                trial={selected}
              />
              <AllocationForm
                key={selected.featureId}
                trial={selected}
                batches={data.batches}
                config={data.config}
              />
            </div>
            <GuardrailForm key={selected.featureId} trial={selected} config={data.config} />
          </div>
        </>
      )}
    </QueryState>
  );
}
