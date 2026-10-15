import { timeLabel } from '../utils';
export default function Timestamp({ value }: { value: string }) {
  const [relative, absolute] = timeLabel(value).split(' · ');
  return (
    <time className="record-time" dateTime={value}>
      <span>{relative}</span>
      <span>{absolute}</span>
    </time>
  );
}
