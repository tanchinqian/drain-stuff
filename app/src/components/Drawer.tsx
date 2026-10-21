import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Footer = createContext<HTMLElement | null>(null);
const openPanels = new Set<HTMLDialogElement>();
let previousOverflow = '';
export function DrawerFooter({children}: {children: ReactNode}) {
  const target = useContext(Footer);
  return target ? createPortal(children, target) : <div className="actions">{children}</div>;
}
export function drawerSaved(scope?: HTMLElement | null) {
  const active = document.activeElement as HTMLButtonElement | null;
  document.dispatchEvent(new CustomEvent('drawer-saved', {detail: scope ?? active?.form ?? active?.closest('form')}));
}

export default function Drawer({title, onClose, children, status, subtitle}: {
  title: string; onClose: () => void; children: ReactNode; docked?: boolean;
  status?: ReactNode; subtitle?: ReactNode;
}) {
  const id = useId(), panel = useRef<HTMLDialogElement>(null), closeRef = useRef(onClose),
    dirty = useRef(new Set<HTMLElement>()), [footer, setFooter] = useState<HTMLElement | null>(null);
  closeRef.current = onClose;
  const confirmClose = () => !dirty.current.size || window.confirm('Discard your unsaved changes?');
  const requestClose = () => {
    if (!confirmClose()) return;
    dirty.current.clear();
    if (history.state?.drawer === id) history.back();
    else closeRef.current();
  };
  useEffect(() => {
    const dialog = panel.current!;
    if (!window.dispatchEvent(new CustomEvent('drawer-opening', {detail: id, cancelable: true}))) {
      closeRef.current();
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    if (!openPanels.size) previousOverflow = document.body.style.overflow;
    openPanels.add(dialog);
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('button')?.focus();
    // Reuse the same entry during StrictMode and when another record replaces this one.
    if (history.state?.drawer) history.replaceState({...history.state, drawer: id}, '');
    else history.pushState({...history.state, drawer: id}, '');
    const back = () => {
      if (confirmClose()) { dirty.current.clear(); closeRef.current(); }
      else history.pushState({...history.state, drawer: id}, '');
    };
    const saved = (event: Event) => {
      const scope = (event as CustomEvent<HTMLElement | null>).detail;
      if (scope) dirty.current.forEach(field => { if (scope.contains(field)) dirty.current.delete(field); });
    };
    const replace = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) return;
      if (!confirmClose()) { event.preventDefault(); return; }
      dirty.current.clear(); dialog.close(); closeRef.current();
    };
    window.addEventListener('popstate', back);
    document.addEventListener('drawer-saved', saved);
    window.addEventListener('drawer-opening', replace);
    return () => {
      window.removeEventListener('popstate', back);
      document.removeEventListener('drawer-saved', saved);
      window.removeEventListener('drawer-opening', replace);
      dialog.close();
      openPanels.delete(dialog);
      document.body.style.overflow = openPanels.size ? 'hidden' : previousOverflow;
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
      const option = (e.target as HTMLElement).closest('[role="option"]');
      const input = option?.closest('.combobox')?.querySelector('input');
      if (input) dirty.current.add(input);
      if (dirty.current.size && (e.target as HTMLElement).closest('a[href]') && !confirmClose()) { e.preventDefault(); e.stopPropagation(); }
    }}
    onInputCapture={e => { dirty.current.add(e.target as HTMLElement); }}
    onChangeCapture={e => { dirty.current.add(e.target as HTMLElement); }}
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
