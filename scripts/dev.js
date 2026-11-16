import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const billingEnvPath = path.join(root, 'backend/services/billing/.env');
const envFileBillingFlag = existsSync(billingEnvPath)
  ? readFileSync(billingEnvPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*ENABLE_BILLING\s*=\s*(.*?)\s*$/)?.[1])
      .find((value) => value !== undefined)
  : undefined;
const configuredBillingFlag = process.env.ENABLE_BILLING ?? envFileBillingFlag ?? 'false';
const enableBilling = configuredBillingFlag.replace(/^(["'])(.*)\1$/, '$2').toLowerCase();

if (!['true', 'false'].includes(enableBilling)) {
  throw new Error('ENABLE_BILLING must be set to "true" or "false" in the environment or billing service .env file.');
}

const services = [
  ['frontend', 'frontend'],
  ['gateway', 'backend/gateway'],
  ['auth', 'backend/services/auth'],
  ['chat', 'backend/services/chat'],
  ['agent', 'backend/services/agent'],
];

if (enableBilling === 'true') {
  services.push(['billing', 'backend/services/billing']);
}

const children = services.map(([name, directory]) => {
  const child = spawn(npm, ['run', 'dev'], {
    cwd: path.join(root, directory),
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  for (const stream of ['stdout', 'stderr']) {
    child[stream].on('data', (chunk) => {
      for (const line of chunk.toString().split(/(?<=\n)/)) {
        if (line) process[stream].write(`[${name}] ${line}`);
      }
    });
  }

  child.on('error', (error) => {
    console.error(`[${name}] ${error.message}`);
    stopAll(1);
  });

  child.on('exit', (code) => {
    if (code && code !== 0) stopAll(code);
  });

  return child;
});

function stopAll(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

console.log(`Started ${services.map(([name]) => name).join(', ')}. Press Ctrl+C to stop.`);
