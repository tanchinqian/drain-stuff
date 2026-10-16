import { lazy } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import AppLayout from './components/AppLayout';
const Overview = lazy(() => import('./pages/StormBoard'));
const Observations = lazy(() => import('./pages/Overview'));
const FeatureDetail = lazy(() => import('./pages/FeatureDetail'));
const Faults = lazy(() => import('./pages/Faults'));
const Trials = lazy(() => import('./pages/Trials'));
const Batches = lazy(() => import('./pages/Batches'));
const About = lazy(() => import('./pages/About'));
const Sensors = lazy(() => import('./pages/Sensors'));
const CompostBay = lazy(() => import('./pages/CompostBay'));
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Overview />} />
        <Route path="observations" element={<Observations />} />
        <Route path="feature/:id" element={<FeatureDetail />} />
        <Route path="faults" element={<Faults />} />
        <Route path="trials" element={<Trials />} />
        <Route path="batches" element={<Batches />} />
        <Route path="batches/:bay" element={<CompostBay />} />
        <Route path="sensors" element={<Sensors />} />
        <Route path="about" element={<About />} />
        <Route
          path="*"
          element={
            <section className="panel">
              <h1>This page is not available</h1>
              <Link to="/">Open Overview</Link>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
