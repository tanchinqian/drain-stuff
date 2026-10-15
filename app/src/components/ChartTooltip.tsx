interface Props {
  active?: boolean;
  label?: string | number;
  payload?: {
    name?: string;
    dataKey?: string;
    value?: string | number;
    payload?: Record<string, unknown>;
  }[];
}
export default function ChartTooltip({ active, label, payload }: Props) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((p, i) => (
        <p key={i}>
          {p.name}: {p.value}
          {typeof (p.payload?.[(p.dataKey ?? '') + ' n'] ?? p.payload?.n) === 'number'
            ? ' · n = ' + (p.payload?.[(p.dataKey ?? '') + ' n'] ?? p.payload?.n)
            : ''}
        </p>
      ))}
    </div>
  );
}
