import Chip from './Chip';
import Term from './Term';
import { Link } from 'react-router-dom';
import type { Config, TrialDetail } from '../api/types';
import { armName, testMean } from '../utils';
export default function TrialComparison({
  trials,
  config,
}: {
  trials: TrialDetail[];
  config: Config;
}) {
  return (
    <section className="trial-comparison" aria-label="Three trial arms compared side by side">
      {(['control', 'decompaction', 'compost'] as const).map((arm) => {
        const trial = trials.find((t) => t.arm === arm),
          before = trial && testMean(trial.tests, 'baseline'),
          after = trial && testMean(trial.tests, 'retest');
        return (
          <article className="trial-arm" key={arm}>
            <span
              className="swatch"
              style={{ background: `var(--arm-${arm === 'decompaction' ? 'decompact' : arm})` }}
            />
            <span className="small">
              {trial?.featureId || 'No feature'} · n = {after?.n ?? 0}
            </span>
            <h2>{armName[arm]}</h2>
            <p className="measure">
              {before?.value.toFixed(1) ?? '—'} → {after?.value.toFixed(1) ?? '—'}{' '}
              <small>
                <Term text="mm/h" /> (water absorbed per hour)
              </small>
            </p>
            <div className="trial-trend">
              {(() => {
                const dates = Array.from(
                  new Set(trial?.tests.filter((t) => t.phase === 'retest').map((t) => t.t) ?? []),
                ).sort();
                const values = dates.map((date) => {
                  const rows = trial!.tests.filter((t) => t.t === date && t.phase === 'retest');
                  return rows.reduce((n, r) => n + r.value, 0) / rows.length;
                });
                return values.length ? (
                  <svg viewBox="0 0 250 45" role="img" aria-label={armName[arm] + ' re-test trend'}>
                    <polyline
                      points={values
                        .map(
                          (n, i) =>
                            `${10 + (i * 230) / Math.max(1, values.length - 1)},${40 - (n / Math.max(1, ...values)) * 33}`,
                        )
                        .join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  <p>No re-tests yet.</p>
                );
              })()}
            </div>
            <p className="small">Before / latest re-test</p>
            <p className="small">Same marked points · {trial?.doseLabel || 'No compost'}</p>
            <p className="takeaway">
              {(() => {
                const count =
                    trial?.tests.filter(
                      (t) => t.phase === 'retest' && t.metric === 'infiltration_mm_hr',
                    ).length ?? 0,
                  minimum = config.minTests ?? config.minimumN;
                return (
                  <>
                    <Chip
                      value={count < minimum ? 'More re-tests needed' : 'Re-test minimum met'}
                      tone={count < minimum ? 'watch' : 'ok'}
                    />
                    <span>
                      {count < minimum
                        ? `Needs at least ${minimum} re-tests to compare (${count} of ${minimum} so far).`
                        : `Minimum of ${minimum} re-tests met · ${count} logged.`}
                    </span>
                    <progress
                      max={minimum}
                      value={Math.min(count, minimum)}
                      aria-label={armName[arm] + ' re-test progress'}
                    />
                  </>
                );
              })()}
            </p>
            {trial && (
              <Link className="button" style={{ marginTop: 12 }} to={'/feature/' + trial.featureId}>
                Inspect {trial.featureId}
              </Link>
            )}
          </article>
        );
      })}
    </section>
  );
}
