import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Footer = createContext<HTMLElement | null>(null);
export function DrawerFooter({children}: {children: ReactNode}) {
  const target = useContext(Footer);
  return target ? createPortal(children, target) : <div className="actions">{children}</div>;
}
export function drawerSaved() { document.dispatchEvent(new Event('drawer-saved')); }

export default function Drawer({title, onClose, children, status, subtitle}: {
  title: string; onClose: () => void; children: ReactNode; docked?: boolean;
  status?: ReactNode; subtitle?: ReactNode;
}) {
  const id = useId(), panel = useRef<HTMLDialogElement>(null), closeRef = useRef(onClose),
    dirty = useRef(false), [footer, setFooter] = useState<HTMLElement | null>(null);
  closeRef.current = onClose;
  const confirmClose = () => !dirty.current || window.confirm('Discard your unsaved changes?');
  const requestClose = () => {
    if (!confirmClose()) return;
    dirty.current = false;
    if (history.state?.drawer === id) history.back();
    else closeRef.current();
  };
  useEffect(() => {
    const dialog = panel.current!, previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('button')?.focus();
    // Reuse the same entry during StrictMode and when another record replaces this one.
    if (history.state?.drawer) history.replaceState({...history.state, drawer: id}, '');
    else history.pushState({...history.state, drawer: id}, '');
    const back = () => {
      if (confirmClose()) { dirty.current = false; closeRef.current(); }
      else history.pushState({...history.state, drawer: id}, '');
    };
    const saved = () => { dirty.current = false; };
    window.addEventListener('popstate', back);
    document.addEventListener('drawer-saved', saved);
    return () => {
      window.removeEventListener('popstate', back);
      document.removeEventListener('drawer-saved', saved);
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [id]);
  return createPortal(<dialog ref={panel} className="detail-drawer" role="dialog" aria-modal="true"
    aria-labelledby={id + '-title'}
    onCancel={e => { e.preventDefault(); requestClose(); }}
    onClick={e => {
      const box = e.currentTarget.getBoundingClientRect();
      if (e.target === e.currentTarget && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) requestClose();
    }}
    onClickCapture={e => {
      if ((e.target as HTMLElement).closest('[role="option"]')) dirty.current = true;
      if (dirty.current && (e.target as HTMLElement).closest('a[href]') && !confirmClose()) { e.preventDefault(); e.stopPropagation(); }
    }}
    onInputCapture={() => { dirty.current = true; }}
    onChangeCapture={() => { dirty.current = true; }}
    onKeyDown={e => {
      if (e.key !== 'Tab') return;
      const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}>
    <header className="drawer-header">
      <div><h2 id={id + '-title'}>{title}</h2>{status}{subtitle}</div>
      <button onClick={requestClose} aria-label={'Close ' + title}><X size={20} aria-hidden="true" /></button>
    </header>
    <Footer.Provider value={footer}><div className="drawer-body">{children}</div></Footer.Provider>
    <footer className="drawer-footer" ref={setFooter} />
  </dialog>, document.body);
}
