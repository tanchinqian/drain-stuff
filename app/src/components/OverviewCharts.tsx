import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import type { Config, Fault, Feature, RainPoint } from '../api/types';
import { api } from '../api/client';
import ChartFrame from './ChartFrame';
import ChartTooltip from './ChartTooltip';
import Chip from './Chip';
import { armName, dateTime } from '../utils';
const colors = { control: '#7b4daf', decompaction: '#b07a12', compost: '#b03a78' };
export default function OverviewCharts({
  rainfall,
  features,
  faults,
  config,
  from,
  to,
  range,
  observationDate,
  sampleAt,
}: {
  rainfall: RainPoint[];
  features: Feature[];
  faults: Fault[];
  config: Config;
  from: string;
  to: string;
  range: string;
  observationDate: string;
  sampleAt: string;
}) {
  const measurements = useQuery({
    queryKey: ['overview-measurements', from, to, features.map((f) => f.id).join(',')],
    queryFn: () =>
      Promise.all(
        features.map(async (f) => ({
          feature: f,
          readings: await api.readings(f.id, undefined, from, to),
        })),
      ),
  });
  const down = features.map((f) => ({
    id: f.id,
    hours:
      measurements.data
        ?.find((d) => d.feature.id === f.id)
        ?.readings.filter((r) => r.metric === 'drain_down_h')
        .at(-1)?.value ?? null,
  }));
  const times = Array.from(
    new Set(
      measurements.data?.flatMap((d) =>
        d.readings.filter((r) => r.metric === 'infiltration_mm_hr').map((r) => r.t),
      ) ?? [],
    ),
  ).sort();
  const trends = times.map((t) =>
    Object.assign(
      { time: dateTime(t), t },
      ...(['control', 'decompaction', 'compost'] as const).map((arm) => {
        const rows =
          measurements.data
            ?.filter((d) => d.feature.arm === arm)
            .flatMap((d) =>
              d.readings.filter((r) => r.t === t && r.metric === 'infiltration_mm_hr'),
            ) ?? [];
        return {
          [arm]: rows.length ? rows.reduce((n, r) => n + r.value, 0) / rows.length : null,
          [arm + ' n']: rows.reduce((n, r) => n + (r.n ?? 0), 0),
        };
      }),
    ),
  );
  let cumulative = 0;
  const storm = rainfall.map((r) => ({
    ...r,
    time: dateTime(r.t),
    cumulative: (cumulative += r.mmPerHr / 6),
  }));
  const sediment =
    measurements.data?.flatMap((d) =>
      d.readings
        .filter((r) => r.metric === 'sediment_mm')
        .map((r) => ({ asset: d.feature.id, ...r })),
    ) ?? [];
  const faultCounts = (['open', 'inspected', 'closed'] as const).map((status) => ({
    status: status[0].toUpperCase() + status.slice(1),
    count: faults.filter((fault) => fault.status === status).length,
  }));
  return (
    <div className="charts-grid">
      <ChartFrame
        title={'Rainfall · ' + range + ' · ' + observationDate}
        subtitle="Selected zone samples; all-zone view uses their mean."
        headers={['Time', 'Rain mm/h', 'Cumulative mm']}
        rows={storm.map((r) => [dateTime(r.t), r.mmPerHr, Number(r.cumulative.toFixed(1))])}
        takeaway="Bars: rain rate in mm/h, left axis. Line: cumulative depth in mm, right axis."
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={storm}
            margin={{ top: 12, right: 14, left: 0, bottom: 15 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="#cfc7b4" />
            <XAxis
              dataKey="time"
              minTickGap={50}
              tickFormatter={(v) =>
                range === 'Last storm'
                  ? String(v).split(',').at(-1)!.trim()
                  : String(v).split(',')[0]
              }
            />
            <YAxis yAxisId="rate" width={40} />
            <YAxis yAxisId="depth" orientation="right" width={50} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <ReferenceLine
              yAxisId="rate"
              x={dateTime(sampleAt)}
              stroke="#2f2b26"
              strokeDasharray="3 3"
            />
            <Bar
              yAxisId="rate"
              dataKey="mmPerHr"
              name="Rain rate (mm/h)"
              fill="#b2663a"
              maxBarSize={20}
            />
            <Line
              yAxisId="depth"
              dataKey="cumulative"
              name="Cumulative depth (mm)"
              stroke="#2f2b26"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame
        title={'How long water stays after rain · ' + range}
        subtitle={`Hours for standing water to clear after the last storm. Target: clear within ${config.drainDownLimitH} h.`}
        headers={['Feature', 'Hours']}
        rows={down.map((d) => [d.id, d.hours])}
        legend={
          <div className="chart-legend">
            {down
              .filter((d) => d.hours !== null && d.hours > config.drainDownLimitH)
              .map((d) => (
                <span key={d.id}>
                  {d.id} <Chip value="Over target" tone="watch" />
                </span>
              ))}
          </div>
        }
        takeaway={
          down
            .filter((d) => d.hours === null)
            .map((d) => d.id)
            .join(', ') +
          (down.some((d) => d.hours === null) ? ': No reading.' : 'All features have a reading.')
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={down.filter((d) => d.hours !== null)}
            layout="vertical"
            margin={{ top: 15, right: 30, left: 0, bottom: 15 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} stroke="#cfc7b4" />
            <XAxis type="number" unit=" h" />
            <YAxis type="category" dataKey="id" width={40} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine x={config.drainDownLimitH} stroke="#5e564b" strokeDasharray="4 4" />
            <Bar dataKey="hours" name="Hours after rain" fill="#bc7a44" barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <details className="full-span">
        <summary>More charts</summary>
        <div className="charts-grid">
          <ChartFrame
            title={'Water absorption by treatment · ' + range}
            subtitle={
              trends.length === 1
                ? 'One sample per treatment in this range (mm/h). Select 8 weeks to see the recorded trend.'
                : 'How fast water soaks into the soil at the same marked spots (mm/h). Higher is better.'
            }
            headers={['Time', armName.control, armName.decompaction, armName.compost]}
            rows={trends.map((r) => [
              r.time,
              r.control ?? null,
              r.decompaction ?? null,
              r.compost ?? null,
            ])}
            takeaway="A small pilot needs repeated tests at the same marked points before comparing treatments."
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trends}
                margin={{ top: 15, right: 15, left: 0, bottom: 10 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="#cfc7b4" />
                <XAxis dataKey="time" minTickGap={60} />
                <YAxis width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                {(['control', 'decompaction', 'compost'] as const).map((arm) =>
                  trends.length === 1 ? (
                    <Bar
                      key={arm}
                      dataKey={arm}
                      name={armName[arm]}
                      fill={colors[arm]}
                      maxBarSize={64}
                      isAnimationActive={false}
                    />
                  ) : (
                    <Line
                      key={arm}
                      dataKey={arm}
                      name={armName[arm]}
                      stroke={colors[arm]}
                      strokeDasharray={arm === 'control' ? '5 4' : undefined}
                      dot={{ r: 3 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  ),
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFrame>
          <ChartFrame
            title={'Sediment depth · ' + range}
            subtitle="Depth recorded at each feature"
            headers={['Asset', 'Time', 'Sediment mm']}
            rows={sediment.map((r) => [r.asset, dateTime(r.t), r.value])}
            takeaway="Sediment readings come from the selected time range."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sediment.map((r) => ({ ...r, label: r.asset + ' ' + dateTime(r.t) }))}
                accessibilityLayer
              >
                <XAxis dataKey="label" minTickGap={40} />
                <YAxis width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Sediment (mm)" fill="#bc7a44" />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <ChartFrame
            title={'Recorded faults · ' + range}
            subtitle={`${faults.length} faults in this period and zone filter, grouped by current status.`}
            headers={['Status', 'Faults']}
            rows={faultCounts.map((row) => [row.status, row.count])}
            takeaway="Counts include only faults recorded in the selected period and zone."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={faultCounts}
                margin={{ top: 15, right: 15, left: 0, bottom: 10 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="#cfc7b4" />
                <XAxis dataKey="status" />
                <YAxis width={40} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="count"
                  name="Faults"
                  fill="#8e3a2e"
                  maxBarSize={64}
                  isAnimationActive={false}
                  label={{ position: 'top', fill: '#2f2b26' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      </details>
    </div>
  );
}
