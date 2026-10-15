import { useState, type FormEvent } from 'react';
import type { BatchDetail, Config } from '../api/types';
import { api } from '../api/client';
import { useWrite } from '../hooks';
import { dateTime } from '../utils';
import DataTable from './DataTable';
import { formatValue } from '../utils';
import { evaluateRules } from '../api/mock/rules';
import PhotoSlot from './PhotoSlot';
export default function BatchReadingForm({
  batch,
  config,
}: {
  batch: BatchDetail;
  config: Config;
}) {
  const latest = batch.readings.at(-1),
    [temp, setTemp] = useState(String(latest?.tempC || 47)),
    [moisture, setMoisture] = useState(String(latest?.moisturePct || 48)),
    [photo, setPhoto] = useState<string>();
  const write = useWrite(
    () =>
      api.batchReading(batch.id, {
        tempC: Number(temp),
        moisturePct: Number(moisture),
        photoUrl: photo,
      }),
    'Saved reading to batch ' + batch.id,
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    write.mutate();
  }
  return (
    <section className="panel">
      <h2>Readings and human prompts</h2>
      <p className="sub">The system monitors conditions and prompts a human.</p>
      <form onSubmit={submit}>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <label className="field">
            Temperature, °C
            <input
              required
              type="number"
              min="0"
              max="100"
              step=".1"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
            />
          </label>
          <label className="field">
            Moisture, %
            <input
              required
              type="number"
              min="0"
              max="100"
              step=".1"
              aria-label="Moisture, %"
              aria-describedby={`moisture-help-${batch.id}`}
              value={moisture}
              onChange={(e) => setMoisture(e.target.value)}
            />
            <span className="field-note" id={`moisture-help-${batch.id}`}>
              What is this? A relative wetness proxy. Calibrate with the human squeeze check; this
              is not an absolute water-content measurement.
            </span>
          </label>
        </div>
        <PhotoSlot label="Reading photo, optional" value={photo} onChange={setPhoto} />
        <button type="submit" disabled={write.isPending}>
          Record reading
        </button>
        {write.error && (
          <p role="alert" className="error">
            {write.error.message}
          </p>
        )}
      </form>
      <div className="notice">
        Target temperature: {config.temperature.goodMin}–{config.temperature.goodMax} °C for{' '}
        {config.temperature.days}+ days; turn below {config.temperature.turnBelow} °C, cool above{' '}
        {config.temperature.coolAbove} °C. Moisture: {config.moisture.min}–{config.moisture.max}%.
      </div>
      {batch.rules.map((rule) => (
        <article
          key={rule.rule}
          style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}
        >
          <h3>{rule.action}</h3>
          <p className="small">{rule.why}</p>
        </article>
      ))}
      {!batch.rules.length && <p className="small">No action needed. Continue routine checks.</p>}
      <hr className="divider" />
      <h3>Reading history</h3>
      <DataTable
        id={'batch-readings-' + batch.id}
        rows={batch.readings.map((r, i) => ({
          ...r,
          id: String(i),
          prompts: r.prompts ?? evaluateRules(batch.readings.slice(0, i + 1), batch.checks, config),
        }))}
        rowId={(r) => r.id}
        columns={[
          { key: 'time', label: 'Time', value: (r) => dateTime(r.t) },
          { key: 'temperature', label: 'Temperature', value: (r) => formatValue(r.tempC, '°C') },
          { key: 'moisture', label: 'Moisture', value: (r) => formatValue(r.moisturePct, '%') },
          {
            key: 'prompt',
            label: 'Prompt at reading',
            value: (r) =>
              r.prompts.map((p) => p.action + ' — ' + p.why).join('; ') || 'No action needed',
          },
        ]}
      />
    </section>
  );
}
