import { afterEach, expect, test, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
test('uses the reachable configured API for reads and audited writes', async () => {
  vi.stubEnv('VITE_API_BASE', 'https://drain.example/api');
  vi.stubEnv('VITE_DATA_SOURCE', 'api');
  const transport = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) => {
    void _url;
    void _options;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', transport);
  vi.resetModules();
  const { api, isMock } = await import('./client');
  await api.faultStatus('F-001', { status: 'closed', user: 'Operator' });
  expect(isMock).toBe(false);
  expect(transport.mock.calls).toHaveLength(2);
  expect(transport.mock.calls[1][0]).toBe('https://drain.example/api/faults/F-001/status');
});
test('a network failure during initial discovery selects the local adapter', async () => {
  vi.stubEnv('VITE_API_BASE', 'https://unreachable.example/api');
  vi.stubEnv('VITE_DATA_SOURCE', 'api');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('Network unavailable');
    }),
  );
  vi.resetModules();
  const client = await import('./client');
  const config = await client.api.config();
  expect(client.isMock).toBe(true);
  expect(config.contractVersion).toBe('4.0.0');
  expect(client.showDataNotice()).toBe(true);
});
test('an authenticated API write error is reported and never retried against the local adapter', async () => {
  vi.stubEnv('VITE_API_BASE', 'https://drain.example/api');
  vi.stubEnv('VITE_DATA_SOURCE', 'api');
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: 'VALIDATION', message: 'Add an operator name.' } }),
          { status: 422 },
        ),
      ),
  );
  vi.resetModules();
  const client = await import('./client');
  await expect(client.api.faultStatus('F-001', { status: 'closed', user: '' })).rejects.toThrow(
    'Add an operator name.',
  );
  expect(client.isMock).toBe(false);
});

test('read failure after discovery falls back, but a disconnected write is never replayed', async () => {
  vi.stubEnv('VITE_API_BASE', 'https://drain.example/api/v1');
  vi.stubEnv('VITE_DATA_SOURCE', 'api');
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockRejectedValueOnce(new TypeError('Disconnected')),
  );
  vi.resetModules();
  let client = await import('./client');
  expect((await client.api.config()).contractVersion).toBe('4.0.0');
  expect(client.isMock).toBe(true);
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockRejectedValueOnce(new TypeError('Disconnected')),
  );
  vi.resetModules();
  client = await import('./client');
  await expect(
    client.api.faultStatus('F-001', { status: 'inspected', user: 'Operator' }),
  ).rejects.toThrow('Your change was not saved');
  expect(client.isMock).toBe(false);
});
