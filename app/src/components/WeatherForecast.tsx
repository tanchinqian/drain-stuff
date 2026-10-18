import {
  weatherCondition,
  type ForecastData,
  type ForecastPeriod,
  type ForecastImpact,
} from '../../../shared/src/forecast';

export const forecastPeriodLabel = (period: ForecastPeriod) => {
  const hour = Number(period.start.slice(11, 13));
  const label = (h: number) => `${h % 12 || 12}${h % 24 < 12 ? 'am' : 'pm'}`;
  return `${label(hour)}–${label(hour + 3)}`;
};
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(date + 'T12:00:00+08:00').toLocaleDateString('en-MY', {
    ...options,
    timeZone: 'Asia/Kuala_Lumpur',
  });
const number = (value: number | null | undefined, digits = 0) =>
  value == null ? '—' : value.toFixed(digits);
const average = (values: (number | null)[]) => {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
};
export const periodCondition = (period: ForecastPeriod) => {
  const codes = period.hours.map((h) => h.code).filter((v): v is number => v !== null);
  return weatherCondition(codes.length ? Math.max(...codes) : null);
};
export default function WeatherForecast({
  data,
  periods,
  selected,
  impacts,
  impactError,
  recordsError,
  loading,
  error,
  retry,
}: {
  data?: ForecastData;
  periods: ForecastPeriod[];
  selected?: ForecastPeriod;
  impacts?: ForecastImpact[];
  impactError?: string;
  recordsError: boolean;
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  if (loading)
    return (
      <section className="weather-forecast" aria-label="Weather forecast">
        <h3>Local weather forecast</h3>
        <p role="status">Loading the forecast for Bandar Bukit Raja…</p>
      </section>
    );
  if (!data || error || !selected)
    return (
      <section className="weather-forecast" aria-label="Weather forecast">
        <h3>Local weather forecast</h3>
        <p role="status">Forecast unavailable. Try again or use the storm simulator.</p>
        <button onClick={retry}>Retry forecast</button>
      </section>
    );
  const hours = selected.hours;
  const condition = periodCondition(selected);
  const rain = hours.every((h) => h.rainMm !== null)
    ? hours.reduce((sum, h) => sum + h.rainMm!, 0)
    : null;
  const probabilities = hours.map((h) => h.probability).filter((v): v is number => v !== null);
  const values = periods.map((p) =>
    p.hours.every((h) => h.rainMm !== null)
      ? p.hours.reduce((a, h) => a + h.rainMm!, 0)
      : null,
  );
  const valid = values.filter((v): v is number => v !== null);
  const max = valid.length ? Math.max(...valid, 1) : 1;
  const y = (value: number) => 90 - (value / max) * 65;
  const path = values
    .map((v, i) =>
      v === null ? '' : `${i && values[i - 1] !== null ? 'L' : 'M'}${i * 100 + 50},${y(v)}`,
    )
    .join(' ');
  return (
    <section className="weather-forecast" aria-labelledby="forecast-heading">
      <div className="panel-heading">
        <div>
          <h3 id="forecast-heading">Local weather forecast</h3>
          <p className="small">Bandar Bukit Raja, Selangor · All times MYT</p>
        </div>
        <span className="forecast-source">Forecast view</span>
      </div>
      <div className="forecast-current">
        <span className="forecast-icon" aria-hidden="true">
          {condition.icon}
        </span>
        <strong className="forecast-temperature">
          {number(average(hours.map((h) => h.temperature)))}
          <span>°C</span>
        </strong>
        <div className="forecast-facts">
          <span>Rain chance: {probabilities.length ? Math.max(...probabilities) + '%' : '—'}</span>
          <span>Humidity: {number(average(hours.map((h) => h.humidity)))}%</span>
          <span>Wind: {number(average(hours.map((h) => h.windKmh)), 1)} km/h</span>
        </div>
        <div className="forecast-condition">
          <strong>{condition.label}</strong>
          <span>
            {dateLabel(selected.start.slice(0, 10), {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}{' '}
            · {forecastPeriodLabel(selected)}
          </span>
          <span>{number(rain, 1)} mm expected in this period</span>
        </div>
      </div>
      <h4>Precipitation</h4>
      <p className="small">Total precipitation per period (mm)</p>
      <div className="forecast-chart" aria-label="Precipitation forecast for selected day">
        <svg viewBox="0 0 800 110" preserveAspectRatio="none" aria-hidden="true">
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
          {values.map((v, i) =>
            v === null ? null : (
              <text x={i * 100 + 50} y={y(v) - 10} textAnchor="middle" key={i}>
                {number(v, 1)}
              </text>
            ),
          )}
          {periods.map((period, index) => (
            <text x={index * 100 + 50} y="108" textAnchor="middle" key={period.key}>
              {forecastPeriodLabel(period).split('–')[0]}
            </text>
          ))}
        </svg>
      </div>
      <div className="forecast-impact" aria-live="polite">
        <h4>Estimated drainage impact · {forecastPeriodLabel(selected)}</h4>
        <p className="small">
          Choose a day and time period to update the map. Rainfall shading shows the period’s
          average rate; asset labels show estimated peak water during those three hours.
        </p>
        {recordsError || impactError ? (
          <p role="status">
            {impactError || 'Asset records unavailable; only forecast rainfall is shown.'}
          </p>
        ) : !impacts ? (
          <p role="status">Calculating drainage impact…</p>
        ) : (
          <div className="forecast-impact-assets">
            {impacts.map((impact) => (
              <div key={impact.asset}>
                <strong>{impact.asset}</strong>
                <span>{number(impact.peakMm)} mm peak water</span>
                <span>
                  {impact.overflowM3 > 0.00001
                    ? `${impact.overflowM3.toFixed(3)} m³ overflow`
                    : 'No modelled overflow'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="small forecast-attribution">
        Weather data:{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{' '}
        · Retrieved{' '}
        {new Date(data.fetchedAt).toLocaleString('en-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })}{' '}
        MYT ·{' '}
        <button className="text-action" onClick={retry}>
          Refresh forecast
        </button>
      </p>
    </section>
  );
}
