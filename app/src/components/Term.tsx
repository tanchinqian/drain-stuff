import { useId, useRef, useEffect } from 'react';
import { glossary } from '../glossary';
export default function Term({ text, helpOnly = false }: { text: string; helpOnly?: boolean }) {
  const id = useId(),
    popover = useRef<HTMLSpanElement>(null),
    key = Object.keys(glossary).find((k) => k.toLowerCase() === text.toLowerCase());
  useEffect(() => {
    popover.current?.setAttribute('popover', 'auto');
  }, [key]);
  return (
    <span className="term">
      {!helpOnly && text}
      {key && (
        <>
          <button
            className="term-trigger"
            type="button"
            aria-label={'Explain ' + text}
            onClick={() => popover.current?.togglePopover()}
          >
            ?
          </button>
          <span ref={popover} id={id} role="note" className="glossary-popover">
            <strong>{text}</strong>
            <br />
            {glossary[key]}
          </span>
        </>
      )}
    </span>
  );
}
