import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { QueryState } from '../components/QueryState';
import BatchWorkspace from '../components/BatchWorkspace';
import DataTable from '../components/DataTable';
import Chip from '../components/Chip';
import { dateOnly } from '../utils';
export default function Batches() {
  const [params, setParams] = useSearchParams();
  const query = useQuery({
    queryKey: ['batch-ledger'],
    queryFn: async () => {
      const [batches, config, trials, faults] = await Promise.all([
        api.batches(),
        api.config(),
        api.trials(),
        api.faults(),
      ]);
      return { batches, config, trials, faults };
    },
  });
  const d = query.data,
    selected = d?.batches.find((b) => b.id === params.get('batch')) ?? d?.batches[0];
  const model = useQuery({
    queryKey: ['batch-model', selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const [parts, sensors] = await Promise.all([
        api.batchParts(selected!.id),
        api.sensors({ ownerId: selected!.id }),
      ]);
      return { parts, sensors };
    },
  });
  return (
    <QueryState loading={query.isPending} error={query.error}>
      <div className="page-heading">
        <h1>Batches</h1>
        <Link className="button" to="/trials">
          Trial allocation
        </Link>
      </div>
      {d && selected && (
        <div className="master-detail">
          <aside className="master-list" aria-label="Batch and bay list">
            {d.batches.map((b) => (
              <button
                key={b.id}
                aria-pressed={selected.id === b.id}
                onClick={() => setParams({ batch: b.id })}
              >
                <strong>
                  {b.id} · {b.bay}
                </strong>
                <small>
                  <Chip value={b.status} />
                </small>
                <small>
                  <Chip value={b.maturityGate === 'passed' ? 'Mature' : 'Checks needed'} />
                </small>
              </button>
            ))}
          </aside>
          <div className="master-content stack">
            {model.data ? (
              <BatchWorkspace
                batch={selected}
                config={d.config}
                parts={model.data.parts}
                sensors={model.data.sensors}
                faults={d.faults}
              />
            ) : (
              <p role="status">Loading bay model...</p>
            )}
            <section className="panel">
              <h2>Batch ledger</h2>
              <DataTable
                id="batches"
                rows={d.batches}
                rowId={(b) => b.id}
                onSelect={(b) => setParams({ batch: b.id })}
                filters={[
                  { key: 'status', label: 'Status', value: (b) => b.status },
                  { key: 'bay', label: 'Bay', value: (b) => b.bay },
                  { key: 'maturity', label: 'Maturity', value: (b) => b.maturityGate },
                  { key: 'date', label: 'Start date', value: (b) => b.startedAt.slice(0, 10) },
                ]}
                columns={[
                  { key: 'id', label: 'Batch', value: (b) => b.id },
                  { key: 'bay', label: 'Bay', value: (b) => b.bay },
                  {
                    key: 'input',
                    label: 'Inputs',
                    value: (b) =>
                      b.inputs
                        .map(
                          (i) =>
                            (i.kind === 'food_bokashi' ? 'Food/bokashi' : 'Trimmings') +
                            ' ' +
                            i.kg +
                            ' kg',
                        )
                        .join(' · '),
                  },
                  { key: 'date', label: 'Started', value: (b) => dateOnly(b.startedAt) },
                  {
                    key: 'status',
                    label: 'Status',
                    value: (b) => b.status,
                    render: (b) => <Chip value={b.status} />,
                  },
                  {
                    key: 'maturity',
                    label: 'Maturity gate',
                    value: (b) => b.maturityGate,
                    render: (b) => (
                      <Chip value={b.maturityGate === 'passed' ? 'Passed' : 'Blocked'} />
                    ),
                  },
                  {
                    key: 'allocated',
                    label: 'Allocated feature',
                    value: (b) =>
                      d.trials
                        .filter((t) => t.batchId === b.id)
                        .map((t) => t.featureId)
                        .join(', ') || 'Not allocated',
                  },
                ]}
                actions={(b) => (
                  <Link className="button" to={'/batches/' + b.id}>
                    Open bay
                  </Link>
                )}
              />
            </section>
          </div>
        </div>
      )}
    </QueryState>
  );
}
