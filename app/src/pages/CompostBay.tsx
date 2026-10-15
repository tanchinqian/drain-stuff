import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { QueryState } from '../components/QueryState';
import BatchWorkspace from '../components/BatchWorkspace';
export default function CompostBay() {
  const { bay = 'B-01' } = useParams();
  const query = useQuery({
    queryKey: ['compost-bay', bay],
    queryFn: async () => {
      const [batches, config, faults] = await Promise.all([
        api.batches(),
        api.config(),
        api.faults(),
      ]);
      const batch = batches.find((b) => b.id === bay || b.bay === bay);
      if (!batch) throw new Error('Choose an existing compost bay.');
      const [parts, sensors] = await Promise.all([
        api.batchParts(batch.id),
        api.sensors({ ownerId: batch.id }),
      ]);
      return { batch, batches, config, faults, parts, sensors };
    },
  });
  const d = query.data;
  return (
    <QueryState loading={query.isPending} error={query.error}>
      {d && (
        <>
          <div className="page-heading">
            <h1>{d.batch.bay}</h1>
            <Link className="button" to={'/batches?batch=' + d.batch.id}>
              Batch ledger
            </Link>
          </div>
          <div className="master-detail">
            <aside className="master-list" aria-label="Compost bays">
              {d.batches.map((b) => (
                <Link
                  className="button"
                  key={b.id}
                  to={'/batches/' + b.id}
                  aria-current={b.id === d.batch.id ? 'page' : undefined}
                >
                  {b.bay}
                  <small>{b.id}</small>
                </Link>
              ))}
            </aside>
            <div className="master-content">
              <BatchWorkspace
                key={d.batch.id}
                batch={d.batch}
                config={d.config}
                parts={d.parts}
                sensors={d.sensors}
                faults={d.faults}
              />
            </div>
          </div>
        </>
      )}
    </QueryState>
  );
}
