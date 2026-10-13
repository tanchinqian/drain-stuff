import type { Status as StatusType } from '../api/types';
export const statusShape = {
  ok: 'square',
  watch: 'circle',
  fault: 'triangle',
  offline: 'diamond',
} as const;
export const statusText = {
  ok: 'OK',
  watch: 'Watch',
  fault: 'Fault',
  offline: 'Sensor suspect / offline',
} as const;
export default function Status({ status }: { status: StatusType }) {
  return (
    <span className="status">
      <span className={'status-mark ' + status} aria-hidden="true" />
      {statusText[status]}
    </span>
  );
}
