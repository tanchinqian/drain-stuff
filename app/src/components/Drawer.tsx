import { useEffect, useRef, type ReactNode } from 'react';
export default function Drawer({
  title,
  onClose,
  children,
  docked = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  docked?: boolean;
}) {
  const panel = useRef<HTMLElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('keydown', close);
      previous?.focus();
    };
  }, []);
  return (
    <aside
      ref={panel}
      className={'detail-drawer' + (docked ? ' docked' : '')}
      role="dialog"
      aria-modal="false"
      aria-label={title}
    >
      <div className="panel-heading">
        <h2>{title}</h2>
        <button onClick={onClose} aria-label={'Close ' + title}>
          Close
        </button>
      </div>
      {children}
    </aside>
  );
}
