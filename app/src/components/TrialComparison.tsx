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
              <small>mm/h</small>
            </p>
            <p className="small">Before / latest re-test · synthetic</p>
            <p className="small">Same marked points · {trial?.doseLabel || 'No compost'}</p>
            <p className="takeaway">
              {(after?.n ?? 0) < config.minimumN
                ? 'Not enough data yet'
                : 'Minimum sample count recorded. Measured difference only.'}
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
