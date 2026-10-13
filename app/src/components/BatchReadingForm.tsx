import { useState, type FormEvent } from 'react';
import type { BatchDetail, Config } from '../api/types';
import { api } from '../api/client';
import { useWrite } from '../hooks';
import { dateTime } from '../utils';
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
    'Synthetic batch reading recorded.',
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
            <span className="field-note" id={`moisture-help-${batch.id}`}>What is this? A relative wetness proxy. Calibrate with the human squeeze check; this is not an absolute water-content measurement.</span>
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
        Illustrative thresholds (placeholders, to confirm for tropical conditions). Temperature: {config.temperature.goodMin}
        –{config.temperature.goodMax} °C for {config.temperature.days}+ days; turn below{' '}
        {config.temperature.turnBelow} °C, cool above {config.temperature.coolAbove} °C. Moisture:{' '}
        {config.moisture.min}–{config.moisture.max}%.
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
      {!batch.rules.length && (
        <p className="small">
          No prompt triggered by the recorded readings. A human still checks the batch.
        </p>
      )}
      <hr className="divider" />
      <h3>Reading history · synthetic</h3>
      <p className="small">All moisture values below are relative wetness proxies; compare with the human squeeze check.</p>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>°C</th>
            <th>Moisture</th>
          </tr>
        </thead>
        <tbody>
          {batch.readings.slice(-8).map((r, i) => (
            <tr key={i}>
              <td>{dateTime(r.t)}</td>
              <td>{r.tempC}</td>
              <td><span title="Relative wetness proxy; calibrate with the human squeeze check">{r.moisturePct}%</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
