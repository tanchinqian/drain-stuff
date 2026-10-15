import { CheckCircle2, AlertTriangle, Circle, OctagonAlert } from 'lucide-react';
import { displayName } from '../utils';
export default function Chip({ value, tone }: { value: string; tone?: 'ok' | 'watch' | 'fault' }) {
  const kind =
    tone ??
    (/blocked|overdue|fault|high|fail/i.test(value)
      ? 'fault'
      : /missing|watch|suspect|offline|medium|needs/i.test(value)
        ? 'watch'
        : 'ok');
  const Icon =
    kind === 'fault'
      ? OctagonAlert
      : kind === 'watch'
        ? AlertTriangle
        : /closed|pass|ok|on track/i.test(value)
          ? CheckCircle2
          : Circle;
  return (
    <span className={'status-chip ' + kind}>
      <Icon size={14} aria-hidden="true" />
      {displayName(value)}
    </span>
  );
}
