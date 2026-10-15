import { useId } from 'react';
import { glossary } from '../glossary';
export default function Term({ text }: { text: string }) {
  const id = useId(),
    key = Object.keys(glossary).find((k) => k.toLowerCase() === text.toLowerCase());
  return (
    <span className="term">
      {text}
      {key && (
        <details className="term-help">
          <summary aria-label={'Explain ' + text} aria-controls={id}>
            ?
          </summary>
          <span id={id} role="note">
            {glossary[key]}
          </span>
        </details>
      )}
    </span>
  );
}
