import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, isMock } from '../api/client';
import { resetMock } from '../api/mock';
import { useBoard } from '../triage';
import { featureIds, useSimulation } from '../simulation/physics/store';
import { featureConfig } from '../simulation/physics/config';

export default function DemoControls({ onHide }: { onHide: () => void }) {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem('drain-demo-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const markUsed = () => {
    try {
      sessionStorage.setItem('drain-demo-used', '1');
    } catch {
      // The in-memory label still works when session storage is unavailable.
    }
    window.dispatchEvent(new Event('drain-demo-used'));
  };

  async function advanceWorkOrder() {
    if (busy) return;
    setBusy(true);
    markUsed();
    try {
      const fault = (await api.faults()).find((item) => item.id === 'F-001');
      if (!fault) throw new Error('Seeded fault F-001 is unavailable. Reset the demo first.');
      const state = fault.workOrder?.state ?? (fault.status === 'closed' ? 'closed' : 'detected');
      const jobId = useBoard.getState().jobId;
      const steps = {
        detected: { action: 'confirm' as const, note: 'Demo: seeded inlet finding confirmed for the walkthrough.' },
        confirmed: { action: 'assign' as const, note: 'Demo: assigned the seeded inlet finding to the demo crew.', assignee: 'Demo crew' },
        assigned: { action: 'clear' as const, note: 'Demo: illustrative clearance step; no field maintenance was performed.' },
        cleared: { action: 'verify' as const, note: 'Demo: verification uses the saved illustrative storm run.' },
        verified: { action: 'close' as const, note: 'Demo: seeded walkthrough lifecycle completed; not an operational record.' },
      } as const;
      if (state === 'closed') {
        setStatus('The demo work order is already closed. Reset the demo to replay it.');
        return;
      }
      const step = steps[state as keyof typeof steps];
      if (!step) throw new Error(`Cannot advance the seeded work order from ${state}.`);
      const evidence = step.action === 'verify'
        ? jobId
          ? { type: 'storm-rerun', stormRunId: jobId }
          : undefined
        : undefined;
      if (step.action === 'verify' && !evidence)
        throw new Error('Run the Heavy storm first so the demo can verify against its saved run.');
      await api.faultLifecycle(fault.id, step.action, {
        note: step.note,
        actor: 'Demo operator',
        ...('assignee' in step ? { assignee: step.assignee } : {}),
        ...(evidence ? { evidence } : {}),
      });
      await cache.invalidateQueries();
      setStatus(`Advanced F-001 to ${step.action}. Demo entry recorded.`);
      navigate('/faults?fault=F-001&demo=1');
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: number) {
    markUsed();
    setStatus('');
    if (action === 1) {
      if (!isMock) {
        setStatus('The local database reset requires stopping the API and running npm run demo:reset. No public reset endpoint is exposed.');
        return;
      }
      resetMock();
      cache.clear();
      useBoard.getState().setJob(null);
      useBoard.getState().select('S1');
      const configs = Object.fromEntries(featureIds.map((id) => [id, featureConfig(id)]));
      useSimulation.setState({
        configs,
        runs: {},
        replay: null,
        manualKs: {},
        second: 0,
        playing: false,
        busy: true,
        error: null,
        revision: useSimulation.getState().revision + 1,
      });
      setStatus('Seeded browser demo state restored.');
      navigate('/?demo=1');
      return;
    }
    if (action === 2) {
      navigate('/?demo=1&demoAction=heavy');
      return;
    }
    if (action === 3) {
      const jobId = useBoard.getState().jobId;
      const replay = jobId ? `&stormRunId=${encodeURIComponent(jobId)}` : '';
      navigate(`/feature/S1?demo=1&part=inlet&showFault=1&demoReplay=1&demoCamera=drain${replay}`);
      return;
    }
    if (action === 4) {
      navigate('/faults?demo=1&fault=F-001&demoDiagnosis=1');
      return;
    }
    if (action === 5) {
      await advanceWorkOrder();
      return;
    }
    if (action === 6) {
      navigate('/faults?demo=1&fault=F-001&demoAudit=1');
      return;
    }
    if (action === 7) {
      navigate('/?demo=1');
      return;
    }
    navigate('/feature/S1?demo=1&part=inlet&showFault=1&demoChat=1');
  }

  return (
    <section className="demo-controls" aria-label="Demo controls" data-demo-overlay="true">
      <header>
        <strong>Demo controls</strong>
        <span className="small">Seeded walkthrough · 1–8</span>
        <button
          aria-expanded={!collapsed}
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            try { sessionStorage.setItem('drain-demo-collapsed', next ? '1' : '0'); } catch { /* Session memory is enough. */ }
          }}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        <button onClick={onHide}>Hide for recording</button>
      </header>
      {!collapsed && <div className="demo-control-actions">
        {[
          'Reset demo',
          'Heavy storm, run',
          'Open fixable row in 3D',
          'Open the fault and diagnosis',
          'Advance work order',
          'Go to audit trail',
          'Back to board',
          'Show chatbot',
        ].map((label, index) => (
          <button
            key={label}
            data-demo-action={index + 1}
            disabled={busy}
            onClick={() => void runAction(index + 1)}
          >
            <kbd>{index + 1}</kbd> {label}
          </button>
        ))}
      </div>}
      {!collapsed && <p role="status" aria-live="polite">{status}</p>}
    </section>
  );
}
