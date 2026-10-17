import { useEffect, useState, type ReactNode } from 'react';
import { configuredBase, isMock } from '../api/client';

export default function ApiConnection({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    sessionStorage.removeItem('drain-operator');
    const changed = () => setOffline(!!configuredBase && isMock);
    window.addEventListener('api-source-change', changed);
    changed();
    return () => window.removeEventListener('api-source-change', changed);
  }, []);
  return (
    <>
      {offline && (
        <p className="panel" role="status">
          Connection unavailable. Local demo opened. Changes here stay on this device.
        </p>
      )}
      {children}
    </>
  );
}
