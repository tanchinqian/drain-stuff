import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { QueryState } from '../components/QueryState';
import ModelWorkspace from '../components/ModelWorkspace';
import BatchChecksForm from '../components/BatchChecksForm';
import BatchReadingForm from '../components/BatchReadingForm';
export default function CompostBay() {
  const { bay = 'B-01' } = useParams();
  const tabs = ['Model', 'Readings', 'Checks'] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>('Model');
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
          <div className="segments compost-tabs" role="tablist" aria-label="Compost bay sections">
            {tabs.map((value, index) => (
              <button
                key={value}
                role="tab"
                id={`tab-${value}`}
                aria-controls={`panel-${value}`}
                aria-selected={tab === value}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => setTab(value)}
                onKeyDown={(e) => {
                  const next =
                    e.key === 'ArrowRight'
                      ? (index + 1) % 3
                      : e.key === 'ArrowLeft'
                        ? (index + 2) % 3
                        : e.key === 'Home'
                          ? 0
                          : e.key === 'End'
                            ? 2
                            : null;
                  if (next !== null) {
                    e.preventDefault();
                    setTab(tabs[next]);
                    document.getElementById(`tab-${tabs[next]}`)?.focus();
                  }
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <section
            role="tabpanel"
            id="panel-Model"
            aria-labelledby="tab-Model"
            hidden={tab !== 'Model'}
          >
            {tab === 'Model' && (
              <ModelWorkspace
                key={data.batch.id}
                ownerId={data.batch.id}
                parts={data.parts}
                sensors={data.sensors}
                config={data.config}
                faults={data.faults}
                kind="compost"
              />
            )}
          </section>
          <section
            role="tabpanel"
            id="panel-Readings"
            aria-labelledby="tab-Readings"
            hidden={tab !== 'Readings'}
          >
            <BatchReadingForm
              key={`readings-${data.batch.id}`}
              batch={data.batch}
              config={data.config}
            />
          </section>
          <section
            role="tabpanel"
            id="panel-Checks"
            aria-labelledby="tab-Checks"
            hidden={tab !== 'Checks'}
          >
            <BatchChecksForm key={`checks-${data.batch.id}`} batch={data.batch} />
          </section>
        </>
      )}
    </QueryState>
  );
}
