import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const directory = mkdtempSync(join(tmpdir(), 'drain-round8b-'));
const child = spawn(process.execPath, ['server/dist/index.js'], {
  cwd: root, stdio: 'inherit', env: {...process.env,
    DB_PATH: join(directory, 'test.sqlite'), PORT: '8091', HOST: '127.0.0.1', SEED_DEMO: '1',
    CORS_ORIGIN: 'http://127.0.0.1:5192', LORAWAN_SIM_SECRET: 'round8b-isolated-simulator-key', LLM_PROVIDER: 'none', LLM_API_KEY: '', LLM_MODEL: '',
  },
});
process.on('SIGTERM', () => child.kill());
process.on('SIGINT', () => child.kill());
child.on('exit', code => process.exit(code ?? 0));
