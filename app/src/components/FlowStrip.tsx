import { usePhysics } from '../simulation/physics/view';
import { formatValue } from '../utils';
import Term from './Term';
export default function FlowStrip({ ownerId }: { ownerId: string }) {
  const { config, frame: f } = usePhysics(ownerId);
  if (!config || !f) return null;
  const v = config.values,
    level = f.network.find((n) => n.id === 'kerb flow')?.depth ?? 0;
  const stages =
    config.kind === 'inlet'
      ? [
          { name: 'Inlet', rate: f.flux.inlet, detail: formatValue(level * 1000, 'mm') },
          { name: 'Chamber', rate: f.flux.inlet, detail: formatValue(f.ponding * 1000, 'mm') },
          {
            name: 'Outlet',
            rate: f.flux.drain,
            detail: formatValue(Math.min(1, f.ponding / v.pipeDiameter.value) * 100, '%'),
          },
          { name: 'Bypass', rate: f.flux.overflow, detail: formatValue(f.ponding * 1000, 'mm') },
        ]
      : [
          { name: 'Inlet', rate: f.flux.inlet, detail: formatValue(level * 1000, 'mm') },
          { name: 'Forebay', rate: f.flux.inlet, detail: formatValue(level * 1000, 'mm') },
          ...(ownerId === 'S1'
            ? [
                {
                  name: 'Sock',
                  rate: f.flux.inlet,
                  detail: formatValue(v.sockOpen.value * 100, '%') + ' open',
                },
              ]
            : []),
          {
            name: 'Media',
            rate: f.flux.infiltration,
            detail: formatValue(f.moisture * 100, '%') + ' moisture',
          },
          {
            name: 'Gravel',
            rate: f.flux.transition,
            detail: formatValue(f.gravelHead * 1000, 'mm'),
          },
          {
            name: 'Pipe',
            rate: f.flux.drain,
            detail:
              formatValue(
                Math.min(
                  1,
                  Math.max(0, f.gravelHead - v.drainOffset.value) / v.pipeDiameter.value,
                ) * 100,
                '%',
              ) + ' fill',
          },
          {
            name: 'Outfall',
            rate: f.flux.drain,
            detail: formatValue(v.tailwater.value * 1000, 'mm') + ' tailwater',
          },
          { name: 'Overflow', rate: f.flux.overflow, detail: formatValue(f.ponding * 1000, 'mm') },
        ];
  return (
    <section className="flow-path" aria-label="Water path">
      <h3>Water path · current minute</h3>
      <ol className="flow-strip">
        {stages.map((s) => (
          <li key={s.name}>
            <strong>{s.name}</strong>
            <span>
              {formatValue(s.rate * 60000)} <Term text="L/min" />
            </span>
            <small>{s.detail}</small>
          </li>
        ))}
      </ol>
      <p className="small">
        Inlet, forebay and sock share the inlet path level. The soil stores water before it reaches
        the pipe.
      </p>
    </section>
  );
}
