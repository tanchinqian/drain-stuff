import { useState } from 'react';
import type { BatchDetail, Config, Fault, Part, Sensor } from '../api/types';
import ModelWorkspace from './ModelWorkspace';
import BatchReadingForm from './BatchReadingForm';
import BatchChecksForm from './BatchChecksForm';
import Chip from './Chip';
import Term from './Term';
import { formatValue, timeLabel, displayName } from '../utils';
export default function BatchWorkspace({
  batch,
  config,
  parts,
  sensors,
  faults,
}: {
  batch: BatchDetail;
  config: Config;
  parts: Part[];
  sensors: Sensor[];
  faults: Fault[];
}) {
  const tabs = ['Model', 'Readings', 'Checks'] as const,
    [tab, setTab] = useState<(typeof tabs)[number]>('Model');
  return (
    <>
      <div className="panel-heading">
        <h2>
          {batch.id} · {batch.bay}
        </h2>
        <Chip value={batch.status} />
      </div>
      <p>
        <Term text="Maturity gate" />:{' '}
        <Chip value={batch.maturityGate === 'passed' ? 'Passed' : 'Blocked'} />
      </p>
      {batch.gateReason && (
        <p>{batch.gateReason} Complete the missing check, then save the check log.</p>
      )}
      <div className="segments compost-tabs" role="tablist" aria-label="Compost bay sections">
        {tabs.map((value, i) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            id={'tab-' + value}
            aria-controls={'panel-' + value}
            onClick={() => setTab(value)}
            onKeyDown={(e) => {
              const next =
                e.key === 'ArrowRight'
                  ? (i + 1) % 3
                  : e.key === 'ArrowLeft'
                    ? (i + 2) % 3
                    : e.key === 'Home'
                      ? 0
                      : e.key === 'End'
                        ? 2
                        : null;
              if (next !== null) {
                e.preventDefault();
                setTab(tabs[next]);
                document.getElementById('tab-' + tabs[next])?.focus();
              }
            }}
          >
            {value}
          </button>
        ))}
      </div>
      <section
        id="panel-Model"
        role="tabpanel"
        aria-labelledby="tab-Model"
        hidden={tab !== 'Model'}
      >
        {tab === 'Model' && (
          <ModelWorkspace
            key={batch.id}
            ownerId={batch.id}
            parts={parts}
            sensors={sensors}
            config={config}
            faults={faults}
            kind="compost"
            summary={
              <section className="model-summary" aria-label="Latest bay summary">
                <h3>Latest bay reading</h3>
                <dl>
                  <div>
                    <dt>Temperature</dt>
                    <dd>{formatValue(batch.readings.at(-1)?.tempC, '°C')}</dd>
                  </div>
                  <div>
                    <dt>Moisture</dt>
                    <dd>{formatValue(batch.readings.at(-1)?.moisturePct, '%')}</dd>
                  </div>
                  <div>
                    <dt>Human checks</dt>
                    <dd>
                      {displayName(batch.checks.squeeze)} · {displayName(batch.checks.smell)}
                    </dd>
                  </div>
                </dl>
                <p className="small">
                  {batch.readings.at(-1) && timeLabel(batch.readings.at(-1)!.t)}
                </p>
              </section>
            }
          />
        )}
      </section>
      <section
        id="panel-Readings"
        role="tabpanel"
        aria-labelledby="tab-Readings"
        hidden={tab !== 'Readings'}
      >
        <BatchReadingForm key={'readings-' + batch.id} batch={batch} config={config} />
      </section>
      <section
        id="panel-Checks"
        role="tabpanel"
        aria-labelledby="tab-Checks"
        hidden={tab !== 'Checks'}
      >
        <BatchChecksForm key={'checks-' + batch.id} batch={batch} />
      </section>
    </>
  );
}
