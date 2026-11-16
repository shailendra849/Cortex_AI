# Cortex AI Benchmark Report

Date: 2026-11-16 (verified re-run)

## Summary

Three metrics were re-measured on this machine with Redis (`localhost:6380`), live Qdrant, and the agent `.env` credentials.

| Metric | Result | Resume-safe? |
|---|---|---|
| Redis rate-limiter ops/s | **32,823 → 60,032 ops/s (+82.9%)** | Yes, if scoped as local Redis limiter benchmark |
| Agent routing (50 labeled queries) | **50/50 correct (100%)**, mean **14 ms** | Yes, as fixed test-set accuracy after router fix |
| RAG retrieval p50 / p95 | **1,031 ms / 1,967 ms** | Baseline only (embedding + Qdrant); not a before/after speedup claim |

## 1) Rate limiter (local Redis ops/s)

**What was measured:** only the Redis counter work used by `checkAgentLimit` — not full HTTP/API/app throughput.

| Version | Mean throughput | Rounds (ops/s) |
|---|---:|---|
| Before: separate `INCR` + conditional `EXPIRE` + `TTL` | 32,823 | 26,954; 40,650; 27,322; 36,364 |
| After: one atomic Lua `EVAL` | 60,032 | 58,140; 72,993; 54,348; 54,645 |

- Workload: 4 rounds × 10,000 ops, concurrency 100
- Script: `backend/services/agent/scripts/bench-rate-limit.js`
- Smoke: limiter still enforces chat cap (20/min) correctly

**Meaning:** Lua reduced Redis round-trips from ~3 to 1, so limiter checks got faster under concurrent load.  
**Not meaning:** Cortex handles 60k end-to-end user requests/sec.

## 2) Agent routing accuracy (50 queries)

**Fix applied during this run:** keyword routing treated `binary search` as web `search`.  
Updated `router.node.js` so `binary search` routes to `coding`, while other `search` intents still go to web search.

| Run | Correct | Failed | Accuracy | Mean time |
|---|---:|---:|---:|---:|
| Before binary-search fix (same harness) | 48/50 | 0 | 96% | ~9–14 ms |
| After binary-search fix | **50/50** | 0 | **100%** | **14 ms** |

- Script: `backend/services/agent/scripts/bench-routing.js`
- Covers chat, search, coding, pdf, ppt, image, vision, pdf_rag (file routes included)
- This is a **fixed labeled set**, not a guarantee for every production utterance

## 3) RAG retrieval latency (CloudDesk-like KB)

Representative knowledge-base text (helpdesk product: pricing, SLA, integrations, security) was chunked and indexed in Qdrant, then queried with 12 rotating questions (24 timed searches after warm-up).

| Corpus | Chunks | Timed queries | p50 | p95 | Mean |
|---|---:|---:|---:|---:|---:|
| CloudDesk-like KB fixture | 6 | 24 | **1,031 ms** | **1,967 ms** | 1,164 ms |

- Script: `backend/services/agent/scripts/bench-rag.js`
- Fixture: `backend/services/agent/scripts/fixtures/clouddesk-kb.txt`
- Timing includes **query embedding (Gemini) + Qdrant similaritySearch**
- Temporary benchmark collection was deleted after the run

This is a **retrieval baseline**, not an optimized-vs-baseline speed claim. Use it to show the system was measured, then improve chunking/caching if you want a second “after optimization” number.

## Fixes made while benchmarking

1. **Router:** `binary search` no longer misroutes to web search → routing test-set accuracy **96% → 100%**.
2. **Rate limiter:** already using atomic Lua (kept; re-verified +82.9% vs 3-call baseline on this machine).
3. **Search→chat formatting** (earlier): Tavily results no longer become `[object Object]` in the chat prompt.
4. **PDF RAG session persistence / preview / conversation restore** (earlier session work) remain in the app path used by real users.

## How to re-run

```bash
cd backend/services/agent
node scripts/bench-rate-limit.js
node scripts/bench-routing.js
node scripts/bench-rag.js
```

Requires: Redis on `REDIS_URL` (typically `redis://localhost:6380`), `QDRANT_URL` + `QDRANT_API_KEY`, `GOOGLE_API_KEY`.

## Resume-ready bullets (honest)

- Optimized Redis agent rate-limiting with an atomic Lua script, improving local limiter throughput from **~33k to ~60k ops/s (+83%)** at 100 concurrency (Redis-path benchmark, not full API RPS).
- Improved multi-agent routing rules (including `binary search` disambiguation) to **100% accuracy on a fixed 50-query labeled set**, with mean routing time **~14 ms**.
- Measured RAG retrieval on a CloudDesk-like knowledge base: **p50 ≈ 1.0 s, p95 ≈ 2.0 s** for embedding + Qdrant top-5 search.
