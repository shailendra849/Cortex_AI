import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Redis from 'ioredis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const ROUNDS = 4;
const OPS = 10_000;
const CONCURRENCY = 100;

const LUA = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], 60)
  end
  return { count, redis.call('TTL', KEYS[1]) }
`;

async function oldSequence(key) {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  await redis.ttl(key);
}

async function newSequence(key) {
  await redis.eval(LUA, 1, key);
}

async function runRound(label, fn) {
  const key = `bench:${label}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  const started = Date.now();
  let i = 0;

  async function worker() {
    while (i < OPS) {
      const n = i++;
      if (n >= OPS) return;
      await fn(`${key}:${n % 50}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const ms = Date.now() - started;
  const opsPerSec = Math.round((OPS / ms) * 1000);
  await redis.del(...Array.from({ length: 50 }, (_, idx) => `${key}:${idx}`));
  return { ms, opsPerSec };
}

async function mean(label, fn) {
  const rounds = [];
  for (let r = 0; r < ROUNDS; r++) {
    const result = await runRound(`${label}-${r}`, fn);
    rounds.push(result.opsPerSec);
    console.log(`${label} round ${r + 1}: ${result.opsPerSec} ops/s (${result.ms} ms)`);
  }
  const avg = Math.round(rounds.reduce((a, b) => a + b, 0) / rounds.length);
  return { avg, rounds };
}

const before = await mean('before-3calls', oldSequence);
const after = await mean('after-lua', newSequence);
const pct = (((after.avg - before.avg) / before.avg) * 100).toFixed(1);

console.log(
  JSON.stringify(
    {
      beforeAvgOpsPerSec: before.avg,
      afterAvgOpsPerSec: after.avg,
      improvementPct: Number(pct),
      beforeRounds: before.rounds,
      afterRounds: after.rounds,
      concurrency: CONCURRENCY,
      opsPerRound: OPS,
    },
    null,
    2
  )
);

await redis.quit();
