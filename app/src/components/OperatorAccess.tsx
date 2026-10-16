import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { configuredBase, operatorAccess, useLocalDemo, isMock } from '../api/client';
export default function OperatorAccess({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(() => isMock || !!operatorAccess());
  const [local, setLocal] = useState(''),
    [name, setName] = useState(''),
    [token, setToken] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const changed = (event: Event) => {
      if (isMock && configuredBase) {
        setLocal(
          event instanceof CustomEvent && event.detail === 'manual'
            ? 'Local demo opened.'
            : 'Connection unavailable. Local demo opened.',
        );
        setConnected(true);
      }
    };
    const authRequired = () => {
      sessionStorage.removeItem('drain-operator');
      setConnected(false);
      setError('Reconnect with the operator token. Your last change was not saved.');
    };
    window.addEventListener('api-auth-required', authRequired);
    window.addEventListener('api-source-change', changed);
    return () => {
      window.removeEventListener('api-source-change', changed);
      window.removeEventListener('api-auth-required', authRequired);
    };
  }, []);
  useEffect(() => {
    if (connected || !configuredBase || isMock) return;
    const controller = new AbortController();
    let mounted = true;
    const timer = setTimeout(() => controller.abort(), 2500);
    void fetch(configuredBase + '/config', { signal: controller.signal })
      .then((response) => {
        if (response.status >= 500 && mounted) useLocalDemo('unavailable');
      })
      .catch(() => {
        if (mounted) useLocalDemo('unavailable');
      })
      .finally(() => clearTimeout(timer));
    return () => {
      mounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [connected]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(configuredBase + '/config', {
        headers: { Authorization: 'Bearer ' + token.trim(), 'X-Operator-Name': name.trim() },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? 'The token was not accepted. Check .env.local.'
            : 'The server is not ready. Check the local server window.',
        );
      sessionStorage.setItem(
        'drain-operator',
        JSON.stringify({ name: name.trim(), token: token.trim() }),
      );
      setConnected(true);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? 'Cannot reach the server. Start npm run dev:all or open the local demo.'
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (connected)
    return (
      <>
        {local && (
          <p className="panel" role="status">
            {local} Changes here stay on this device.
          </p>
        )}
        {children}
      </>
    );
  return (
    <main
      className="panel"
      style={{ maxWidth: 520, margin: '12vh auto', padding: 24, minHeight: 0, display: 'block' }}
    >
      <h1>Connect to the maintenance console</h1>
      <p>
        Enter your name for the work log. The local operator token is in .env.local in the project
        folder.
      </p>
      <form onSubmit={(event) => void submit(event)} className="field">
        <label>
          Your name
          <input
            required
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Operator token
          <input
            required
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Connecting…' : 'Connect'}
        </button>
        <button type="button" onClick={() => useLocalDemo()}>
          Open local demo
        </button>
      </form>
    </main>
  );
}
