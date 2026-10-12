import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Config, Fault, Feature, RainPoint } from '../api/types';
import { api } from '../api/client';
import { DEMO_NOW } from '../api/mock/seed';
import ChartFrame from './ChartFrame';
import ChartTooltip from './ChartTooltip';
import { dateTime } from '../utils';
const colors = { control: '#7B4DAF', decompaction: '#B07A12', compost: '#B03A78' };
export default function OverviewCharts({
  rainfall,
  features,
  faults,
  config,
}: {
  rainfall: RainPoint[];
  features: Feature[];
  faults: Fault[];
  config: Config;
}) {
  const measurements = useQuery({
    queryKey: ['overview-measurements'],
    queryFn: async () =>
      Promise.all(features.map(async (f) => ({ id: f.id, readings: await api.readings(f.id) }))),
  });
  const down = features.map((f) => ({
    id: f.id,
    hours:
      measurements.data
        ?.find((d) => d.id === f.id)
        ?.readings.find((r) => r.metric === 'drain_down_h')?.value ?? null,
  }));
  const trends = Array.from({ length: 8 }, (_, week) => ({
    week: 'Week ' + (week + 1),
    control: measurements.data
      ?.find((d) => d.id === 'S3')
      ?.readings.filter((r) => r.metric === 'infiltration_mm_hr')[week]?.value,
    decompaction: measurements.data
      ?.find((d) => d.id === 'S2')
      ?.readings.filter((r) => r.metric === 'infiltration_mm_hr')[week]?.value,
    compost: measurements.data
      ?.find((d) => d.id === 'S1')
      ?.readings.filter((r) => r.metric === 'infiltration_mm_hr')[week]?.value,
    n: 6,
  }));
  const storm = rainfall.map((r) => ({ ...r, time: dateTime(r.t).split(', ').at(-1) }));
  const incidents = Array.from({ length: 8 }, (_, i) => {
    const from = Date.parse(DEMO_NOW) - (8 - i) * 7 * 86400000,
      to = from + 7 * 86400000;
    const rows = faults.filter(
      (f) => Date.parse(f.openedAt) > from && Date.parse(f.openedAt) <= to,
    );
    return {
      week: 'Week ' + (i + 1),
      sediment: rows.filter((f) => f.type === 'sediment').length,
      blockage: rows.filter((f) => f.type === 'blockage').length,
    };
  });
  return (
    <div className="charts-grid">
      <ChartFrame
        title="Rain peaked at 63 mm/h"
        subtitle="Rainfall per 10 min and cumulative rain"
        headers={['Time', 'Rain mm/h', 'Cumulative mm']}
        rows={rainfall.map((r) => [dateTime(r.t), r.mmPerHr, r.cumulativeMm])}
        takeaway="Bars: rain rate (mm/h). Line: cumulative rain (mm), sharing one numeric axis. Reference is a placeholder, to confirm."
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={storm}
            margin={{ top: 20, right: 15, left: 0, bottom: 8 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="#CFC7B4" />
            <XAxis dataKey="time" minTickGap={35} />
            <YAxis width={38} domain={[0, 'auto']} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={config.heavyRainMmHr}
              stroke="#5E564B"
              strokeDasharray="4 4"
              label={{
                value: '50 mm/h · to confirm',
                position: 'insideTopRight',
                fill: '#5E564B',
                fontSize: 12,
              }}
            />
            <Bar dataKey="mmPerHr" name="Rain rate (mm/h)" fill="#B2663A" maxBarSize={20} />
            <Line
              dataKey="cumulativeMm"
              name="Cumulative rain (mm)"
              stroke="#2F2B26"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame
        title="S3 remains above the drain-down reference"
        subtitle="Drain-down by feature"
        headers={['Feature', 'Hours']}
        rows={down.map((d) => [d.id, d.hours])}
        takeaway={
          '6 h is a placeholder, to confirm. ' +
          down
            .filter((d) => d.hours === null)
            .map((d) => d.id)
            .join(', ') +
          ': no reading.'
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={down.filter((d) => d.hours !== null)}
            layout="vertical"
            margin={{ top: 15, right: 25, left: 0, bottom: 8 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} stroke="#CFC7B4" />
            <XAxis type="number" unit=" h" domain={[0, 8]} />
            <YAxis type="category" dataKey="id" width={36} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              x={config.drainDownLimitH}
              stroke="#5E564B"
              strokeDasharray="4 4"
              label={{ value: '6 h · to confirm', position: 'top', fill: '#5E564B', fontSize: 12 }}
            />
            <Bar dataKey="hours" name="Drain-down (h)" fill="#BC7A44" barSize={15} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame
        title="The three arms show different trajectories"
        subtitle="Infiltration at fixed points over eight weeks"
        headers={['Week', 'Control mm/h', 'Decompaction mm/h', 'Compost mm/h', 'n per point']}
        rows={trends.map((t) => [
          t.week,
          t.control ?? null,
          t.decompaction ?? null,
          t.compost ?? null,
          t.n,
        ])}
        takeaway="Pilot, small sample, not proof. n = 6 per weekly measurement; same marked points."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trends}
            margin={{ top: 15, right: 15, left: 0, bottom: 8 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="#CFC7B4" />
            <XAxis dataKey="week" minTickGap={22} />
            <YAxis width={38} unit="" domain={[0, 30]} />
            <Tooltip content={<ChartTooltip />} />
            {(['control', 'decompaction', 'compost'] as const).map((arm) => (
              <Line
                key={arm}
                dataKey={arm}
                name={arm === 'compost' ? 'Compost (mm/h)' : arm + ' (mm/h)'}
                stroke={colors[arm]}
                strokeWidth={1.5}
                strokeDasharray={arm === 'control' ? '5 4' : undefined}
                dot={{ r: 3, fill: arm === 'control' ? '#F2EEE4' : colors[arm] }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame
        title="Sediment and blockage need follow-up"
        subtitle="Recorded fault events by week"
        headers={['Week', 'Sediment events', 'Blockage events']}
        rows={incidents.map((t) => [t.week, t.sediment, t.blockage])}
        takeaway="Stacked bars show event counts, not sediment depth. Inspect the fault log for the individual records."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={incidents}
            margin={{ top: 15, right: 15, left: 0, bottom: 8 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="#CFC7B4" />
            <XAxis dataKey="week" minTickGap={22} />
            <YAxis width={28} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="sediment"
              name="Sediment events"
              stackId="events"
              fill="#BC7A44"
              maxBarSize={22}
            />
            <Bar
              dataKey="blockage"
              name="Blockage events"
              stackId="events"
              fill="#8E3A2E"
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <div className="chart-legend full-span">
        {Object.entries(colors).map(([arm, color]) => (
          <span key={arm}>
            <i className="swatch" style={{ background: color }} />
            {arm === 'compost' ? 'Decompaction + compost' : arm[0].toUpperCase() + arm.slice(1)}
          </span>
        ))}
        <span>Infiltration in mm/h · synthetic</span>
      </div>
      <section className="panel full-span">
        <h2>Fault types on record</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Open or inspected</th>
              <th>Closed</th>
            </tr>
          </thead>
          <tbody>
            {['sediment', 'blockage', 'sensor_offline', 'standing_water'].map((type) => (
              <tr key={type}>
                <td>{type.replaceAll('_', ' ')}</td>
                <td>{faults.filter((f) => f.type === type && f.status !== 'closed').length}</td>
                <td>{faults.filter((f) => f.type === type && f.status === 'closed').length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
