import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Waves } from 'lucide-react';
import Toast from './Toast';
import SimulationDriver from '../simulation/physics/SimulationDriver';
import DemoControls from './DemoControls';
export default function AppLayout() {
  const requested = new URLSearchParams(location.search).get('demo') === '1';
  const demo = requested;
  const [demoOpen, setDemoOpen] = useState(() => {
    try {
      return requested || sessionStorage.getItem('drain-demo-panel') === 'open';
    } catch {
      return requested;
    }
  });
  const [hidden, setHidden] = useState(() => {
    try {
      return !requested && sessionStorage.getItem('drain-demo-hidden') === '1';
    } catch {
      return false;
    }
  });
  const [demoUsed, setDemoUsed] = useState(() => {
    try {
      return sessionStorage.getItem('drain-demo-used') === '1';
    } catch {
      return false;
    }
  });
  const suffix = demo ? '?demo=1' : '';
  const setOpen = (open: boolean) => {
    setDemoOpen(open);
    try {
      sessionStorage.setItem('drain-demo-panel', open ? 'open' : 'closed');
    } catch {
      // Keep controls usable without session storage.
    }
  };
  useEffect(() => {
    const used = () => setDemoUsed(true);
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        if (!hidden) setOpen(!demoOpen);
        return;
      }
      if (!demoOpen || !/^[1-8]$/.test(event.key)) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,select,[contenteditable="true"]')) return;
      document.querySelector<HTMLButtonElement>(`[data-demo-action="${event.key}"]`)?.click();
    };
    window.addEventListener('drain-demo-used', used);
    document.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('drain-demo-used', used);
      document.removeEventListener('keydown', keydown);
    };
  }, [demoOpen, hidden]);
  const hideForRecording = () => {
    setHidden(true);
    setDemoOpen(false);
    try {
      sessionStorage.setItem('drain-demo-hidden', '1');
      sessionStorage.setItem('drain-demo-panel', 'closed');
    } catch {
      // Hiding still takes effect for this page lifetime.
    }
  };
  return (
    <>
      <SimulationDriver />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <Link className="brand" to={'/' + suffix}>
          <Waves size={24} aria-hidden="true" />
          Drain Trial Console
        </Link>
      </header>
      <nav className="navigation" aria-label="Console pages">
        {[
          ['/', 'Overview'],
          ['/faults', 'Faults'],
          ['/sensors', 'Sensors'],
          ['/materials', 'Materials and trial'],
        ].map(([to, label]) => (
          <NavLink end={to === '/'} key={to} to={to + suffix}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main id="main">
        <Suspense
          fallback={
            <p role="status" className="panel">
              Loading page -
            </p>
          }
        >
          <Outlet context={{ demo }} />
        </Suspense>
      </main>
      <footer>
        Local ponding and drain upkeep
        {demoUsed && <strong className="demo-scenario-label">Demo scenario (seeded)</strong>}
      </footer>
      {demoOpen && !hidden && <DemoControls onHide={hideForRecording} />}
      <Toast />
    </>
  );
}
