import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Waves } from 'lucide-react';
import Toast from './Toast';
import SimulationDriver from '../simulation/physics/SimulationDriver';
export default function AppLayout() {
  const [demo] = useState(new URLSearchParams(location.search).get('demo') === '1');
  const suffix = demo ? '?demo=1' : '';
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
        <div className="inline">
          <Link className="button" to={'/about' + suffix}>
            Limits
          </Link>
        </div>
      </header>
      <nav className="navigation" aria-label="Console pages">
        {[
          ['/', 'Overview'],
          ['/trials', 'Trials'],
          ['/batches', 'Batches'],
          ['/sensors', 'Sensors'],
          ['/faults', 'Faults'],
          ['/about', 'About'],
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
      <footer>Local ponding and drain upkeep</footer>
      <Toast />
    </>
  );
}
