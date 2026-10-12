import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { QueryState } from '../components/QueryState';
import ModelWorkspace from '../components/ModelWorkspace';
import BatchChecksForm from '../components/BatchChecksForm';
import BatchReadingForm from '../components/BatchReadingForm';
export default function CompostBay() {
  const { bay = 'B-01' } = useParams();
  const result = useQuery({
    queryKey: ['compost-bay', bay],
    queryFn: async () => {
      const [batches, config, faults] = await Promise.all([
        api.batches(),
        api.config(),
        api.faults(),
      ]);
      const batch = batches.find((b) => b.id === bay || b.bay === bay);
      if (!batch) throw new Error('Compost bay not found. Open the batch ledger and choose a bay.');
      const [parts, sensors] = await Promise.all([
        api.batchParts(batch.id),
        api.sensors({ ownerId: batch.id }),
      ]);
      return { batch, config, faults, parts, sensors };
    },
  });
  const data = result.data;
  return (
    <QueryState loading={result.isPending} error={result.error}>
      {data && (
        <>
          <div className="page-heading">
            <div>
              <h1>
                {data.batch.bay} · {data.batch.id}
              </h1>
              <p className="sub">Compost bay schematic · Synthetic inputs and readings</p>
            </div>
            <Link className="button" to={`/batches?batch=${data.batch.id}`}>
              Back to batch ledger
            </Link>
          </div>
          <div className="summary-strip">
            <div>
              <small>Batch status</small>
              {data.batch.status}
            </div>
            <div>
              <small>Maturity gate</small>
              {data.batch.maturityGate}
            </div>
            <div>
              <small>Sensor / human inputs</small>
              {data.sensors.length}
            </div>
          </div>
          <ModelWorkspace
            key={data.batch.id}
            ownerId={data.batch.id}
            parts={data.parts}
            sensors={data.sensors}
            config={data.config}
            faults={data.faults}
            kind="compost"
          />
          <div className="trial-layout" style={{ marginTop: 24 }}>
            <BatchReadingForm
              key={`readings-${data.batch.id}`}
              batch={data.batch}
              config={data.config}
            />
            <BatchChecksForm key={`checks-${data.batch.id}`} batch={data.batch} />
          </div>
        </>
      )}
    </QueryState>
  );
}
