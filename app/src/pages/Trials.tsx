import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { armName, dateOnly, overdue, testMean, formatValue } from '../utils';
import { QueryState } from '../components/QueryState';
import TrialComparison from '../components/TrialComparison';
import TrialTestForm from '../components/TrialTestForm';
import GuardrailForm from '../components/GuardrailForm';
import AllocationForm from '../components/AllocationForm';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import Chip from '../components/Chip';
import Term from '../components/Term';
export default function Trials() {
  const [params, setParams] = useSearchParams(),
    [drawer, setDrawer] = useState<'test' | 'checks' | null>(null);
  const query = useQuery({
    queryKey: ['trial-register'],
    queryFn: async () => {
      const [trials, batches, config, features] = await Promise.all([
        api.trials(),
        api.batches(),
        api.config(),
        api.features(),
      ]);
      return { trials, batches, config, features };
    },
  });
  const d = query.data,
    selected =
      d?.trials.find((t) => t.featureId === (params.get('feature') ?? 'S1')) ?? d?.trials[0];
  const state = (t: NonNullable<typeof selected>) =>
    !t.baselineDone ? 'Needs baseline' : overdue(t.nextRetestDue) ? 'Overdue' : 'On track';
  return (
    <QueryState loading={query.isPending} error={query.error}>
      <div className="page-heading">
        <h1>Trials</h1>
      </div>
      <p>
        A trial compares three ways of treating the soil at the same marked spots: untreated,
        loosened only, and loosened plus compost. Each treated site is re-tested to see how fast
        water soaks in.
      </p>
      {d && selected && (
        <>
          <TrialComparison trials={d.trials} config={d.config} />
          <div className="master-detail">
            <aside className="master-list" aria-label="Trial sites">
              {d.trials.map((t) => (
                <button
                  key={t.featureId}
                  aria-pressed={selected.featureId === t.featureId}
                  onClick={() => setParams({ feature: t.featureId })}
                >
                  <strong>
                    {t.featureId} ·{' '}
                    {d.features.find((f) => f.id === t.featureId)?.kind === 'tree_pit'
                      ? 'Tree pit'
                      : 'Swale'}
                  </strong>
                  <small>{armName[t.arm]}</small>
                  <Chip value={state(t)} />
                </button>
              ))}
            </aside>
            <div className="master-content stack">
              <section className="panel">
                <h2>Trial register</h2>
                <DataTable
                  id="trials"
                  rows={d.trials}
                  rowId={(t) => t.featureId}
                  onSelect={(t) => setParams({ feature: t.featureId })}
                  filters={[
                    { key: 'arm', label: 'Treatment', value: (t) => armName[t.arm] },
                    {
                      key: 'zone',
                      label: 'Zone',
                      value: (t) => d.features.find((f) => f.id === t.featureId)?.zone ?? '',
                    },
                    { key: 'status', label: 'Status', value: state },
                    { key: 'owner', label: 'Owner', value: (t) => t.owner?.name ?? 'Unassigned' },
                  ]}
                  columns={[
                    { key: 'id', label: 'Site', value: (t) => t.featureId },
                    {
                      key: 'type',
                      label: 'Type',
                      value: (t) =>
                        d.features.find((f) => f.id === t.featureId)?.kind === 'tree_pit'
                          ? 'Tree pit'
                          : 'Swale',
                    },
                    {
                      key: 'location',
                      label: 'Location',
                      value: (t) => 'Zone ' + d.features.find((f) => f.id === t.featureId)?.zone,
                    },
                    { key: 'arm', label: 'Treatment', value: (t) => armName[t.arm] },
                    {
                      key: 'last',
                      label: 'Last test',
                      value: (t) => t.tests.at(-1)?.t ?? 'No test',
                      render: (t) => (t.tests.length ? dateOnly(t.tests.at(-1)!.t) : 'No test'),
                    },
                    { key: 'next', label: 'Next re-test', value: (t) => dateOnly(t.nextRetestDue) },
                    {
                      key: 'state',
                      label: 'Status',
                      value: state,
                      render: (t) => <Chip value={state(t)} />,
                    },
                  ]}
                  actions={(t) => (
                    <button
                      onClick={() => {
                        setParams({ feature: t.featureId });
                        setDrawer('test');
                      }}
                    >
                      {!t.baselineDone ? 'Record baseline' : 'Log a re-test'}
                    </button>
                  )}
                />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>{selected.featureId} · Trial record</h2>
                  <Link className="button" to={'/feature/' + selected.featureId}>
                    Inspect feature
                  </Link>
                </div>
                <div className="summary-strip">
                  <div>
                    <small>Treatment</small>
                    {armName[selected.arm]}
                  </div>
                  <div>
                    <small>
                      <Term text="Baseline" />
                    </small>
                    {formatValue(testMean(selected.tests, 'baseline')?.value, 'mm/h')}
                  </div>
                  <div>
                    <small>
                      <Term text="Re-test" />
                    </small>
                    {formatValue(testMean(selected.tests, 'retest')?.value, 'mm/h')}
                  </div>
                  <div>
                    <small>
                      <Term text="Owner of record" />
                    </small>
                    {selected.owner?.name ?? 'Unassigned'}
                  </div>
                </div>
                <p>
                  Source: field test log {selected.featureId}
                  {selected.batchId ? ' and batch record ' + selected.batchId : ''}.
                </p>
                <div className="actions">
                  <button onClick={() => setDrawer('test')}>
                    {selected.baselineDone ? 'Log a re-test' : 'Record baseline'}
                  </button>
                  <button onClick={() => setDrawer('checks')}>Update safety checks</button>
                </div>
                <h3>Safety checks</h3>
                <ul className="check-results">
                  <li>
                    <Chip
                      value={
                        selected.guardrails.nutrientExport === 'pass'
                          ? 'Passed'
                          : selected.guardrails.nutrientExport === 'fail'
                            ? 'Failed'
                            : 'Needs nutrient sample'
                      }
                    />{' '}
                    Did water leaving the soil carry extra nutrients?{' '}
                    {selected.guardrails.outletSample &&
                      dateOnly(selected.guardrails.outletSample.t)}
                  </li>
                  <li>
                    <Chip
                      value={
                        selected.guardrails.noOpenDrainContact ? 'Passed' : 'Needs confirmation'
                      }
                    />{' '}
                    Compost has no contact with open drains.
                  </li>
                  <li>
                    <Chip
                      value={
                        selected.guardrails.postStormCheck === 'ok' ? 'Passed' : 'Needs storm check'
                      }
                    />{' '}
                    First heavy rain: washout, clogging, photo and result.
                  </li>
                </ul>
                {selected.history?.length ? (
                  <DataTable
                    id={'trial-check-history-' + selected.featureId}
                    rows={selected.history}
                    rowId={(r) => r.id}
                    columns={[
                      { key: 'action', label: 'Entry', value: (r) => r.action },
                      { key: 'date', label: 'Date', value: (r) => dateOnly(r.t) },
                      { key: 'who', label: 'Who', value: (r) => r.user },
                    ]}
                  />
                ) : (
                  <p className="small">No additional safety checks saved yet.</p>
                )}
              </section>
              <AllocationForm
                key={selected.featureId}
                trial={selected}
                batches={d.batches}
                config={d.config}
              />
            </div>
          </div>
          {drawer && (
            <Drawer
              title={
                drawer === 'test'
                  ? 'Log a test · ' + selected.featureId
                  : 'Safety checks · ' + selected.featureId
              }
              onClose={() => setDrawer(null)}
            >
              {drawer === 'test' ? (
                <TrialTestForm
                  key={selected.featureId + '-' + selected.baselineDone}
                  trial={selected}
                />
              ) : (
                <GuardrailForm key={selected.featureId} trial={selected} config={d.config} />
              )}
            </Drawer>
          )}
        </>
      )}
    </QueryState>
  );
}
