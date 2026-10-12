import type { ReactNode } from 'react';
export function QueryState({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: Error | null;
  children: ReactNode;
}) {
  if (loading)
    return (
      <p className="loading" role="status">
        Loading operator records…
      </p>
    );
  if (error)
    return (
      <section className="panel" role="alert">
        <h2>Records could not load</h2>
        <p>{error.message}</p>
        <button onClick={() => location.reload()}>Retry</button>
      </section>
    );
  return children;
}
