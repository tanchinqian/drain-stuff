import { usePhysics } from '../simulation/physics/view';
import { formatValue } from '../utils';
import { stageTotals } from '../three/sceneMetrics';
import Term from './Term';
export default function FlowStrip({
  ownerId,
  compact = false,
}: {
  ownerId: string;
  compact?: boolean;
}) {
  const { config, frame: f, run } = usePhysics(ownerId);
  if (!config || !f) return null;
  const inlet = config.kind === 'inlet',
    totals = stageTotals(run, f);
  const stages = inlet
    ? [
        { name: 'Inlet', q: f.flux.inlet, total: totals.inlet, approx: true },
        { name: 'Chamber', q: f.flux.inlet, total: totals.pond, stored: true },
        { name: 'Outlet', q: f.flux.outfall, total: totals.outfall },
        { name: 'Bypass', q: f.flux.overflow, total: totals.overflow },
      ]
    : [
        { name: 'Inlet', q: f.flux.inlet, total: totals.inlet, approx: true },
        {
          name: 'Pond',
          q: f.flux.inlet + f.rain * config.values.length.value * config.values.width.value,
          total: totals.pond,
          stored: true,
        },
        { name: 'Soil', q: f.flux.infiltration, total: totals.soil },
        { name: 'Underdrain', q: f.flux.drain, total: totals.underdrain },
        { name: 'Outfall', q: f.flux.outfall, total: totals.outfall },
        { name: 'Overflow', q: f.flux.overflow, total: totals.overflow },
      ];
  return (
    <section className={compact ? 'flow-legend' : 'flow-path'} aria-label="Water path">
      <h3>
        Water path · current minute <Term text="L/min" helpOnly />
      </h3>
      {!inlet&&f.flux.drain<=0&&<p className="small">No underdrain flow yet: soil still absorbing</p>}
      {f.pipeFill>=.999&&<p className="small">Pipe full: pressurised flow, no free surface</p>}
      <ol className="flow-strip" tabIndex={0} aria-label="Current stage flows and volumes">
        {stages.map((s) => (
          <li key={s.name} data-flow-stage={s.name} data-rate={s.q * 60000} data-litres={s.total}>
            <strong>{s.name}</strong>
            <span>{formatValue(s.q * 60000)} L/min</span>
            <small>
              {s.approx ? '~ ' : ''}
              {formatValue(s.total)} L {s.stored ? 'stored' : 'to now'}
            </small>
          </li>
        ))}
      </ol>
      <p className="small" data-ledger-residual={f.balanceResidual}>
        Catchment ledger: {formatValue(f.cumulative.input * 1000)} L input ={' '}
        {formatValue(f.storage * 1000)} L stored +{' '}
        {formatValue(
          (f.cumulative.outlet + f.cumulative.overflow + f.cumulative.seepage + f.cumulative.et) *
            1000,
        )}{' '}
        L discharged/lost. Residual {(f.balanceResidual * 1000).toExponential(1)} L.
      </p>
      <p className="small">
        Inlet total is integrated from saved frame samples (~); other totals use the engine ledger.
        Storage includes upstream routing and soil. Internal stages transfer the same water and are
        not added together.
      </p>
    </section>
  );
}
