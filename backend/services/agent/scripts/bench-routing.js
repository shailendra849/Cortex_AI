import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { routerNode } = await import('../graph/router.node.js');

const cases = [
  { prompt: 'hello how are you', expected: 'chat' },
  { prompt: 'explain what is redis caching', expected: 'chat' },
  { prompt: 'what is the meaning of RAG', expected: 'chat' },
  { prompt: 'help me understand microservices', expected: 'chat' },
  { prompt: 'suggest a study plan for system design', expected: 'chat' },
  { prompt: 'define rate limiting', expected: 'chat' },
  { prompt: 'capital of france', expected: 'chat' },
  { prompt: 'latest news about openai models', expected: 'search' },
  { prompt: 'current weather in mumbai today', expected: 'search' },
  { prompt: 'search for react developer jobs', expected: 'search' },
  { prompt: 'look up bitcoin price', expected: 'search' },
  { prompt: 'recent exchange rate usd inr', expected: 'search' },
  { prompt: 'today cricket scores', expected: 'search' },
  { prompt: 'markets latest update', expected: 'search' },
  { prompt: 'debug this python memory leak', expected: 'coding' },
  { prompt: 'write a javascript function for binary search', expected: 'coding' },
  { prompt: 'create a react component for login', expected: 'coding' },
  { prompt: 'typescript api route example', expected: 'coding' },
  { prompt: 'sql query to find duplicates', expected: 'coding' },
  { prompt: 'dockerfile for node express app', expected: 'coding' },
  { prompt: 'unit test for this coding function', expected: 'coding' },
  { prompt: 'generate a pdf report about sales', expected: 'pdf' },
  { prompt: 'create a printable pdf invoice template', expected: 'pdf' },
  { prompt: 'make a pdf export of this document', expected: 'pdf' },
  { prompt: 'create powerpoint slides for pitch deck', expected: 'ppt' },
  { prompt: 'generate a presentation about ai agents', expected: 'ppt' },
  { prompt: 'build a slide deck for product launch', expected: 'ppt' },
  { prompt: 'create an image of a fox in a city landscape', expected: 'image' },
  { prompt: 'generate a logo mockup illustration', expected: 'image' },
  { prompt: 'draw a picture of a mountain landscape', expected: 'image' },
  { prompt: 'what is in this image', expected: 'vision', file: { mimetype: 'image/png' } },
  { prompt: 'describe this photo', expected: 'vision', file: { mimetype: 'image/jpeg' } },
  { prompt: 'read this uploaded pdf and answer', expected: 'pdf_rag', file: { mimetype: 'application/pdf' } },
  { prompt: 'summarize the attached pdf', expected: 'pdf_rag', file: { mimetype: 'application/pdf' } },
  { prompt: 'find deadline in this pdf', expected: 'pdf_rag', file: { mimetype: 'application/pdf' } },
  { prompt: 'explain CAP theorem simply', expected: 'chat' },
  { prompt: 'help me understand docker networking', expected: 'chat' },
  { prompt: 'what is jwt authentication', expected: 'chat' },
  { prompt: 'search latest typescript release notes', expected: 'search' },
  { prompt: 'current news on kubernetes', expected: 'search' },
  { prompt: 'write python code to reverse a linked list', expected: 'coding' },
  { prompt: 'fix bug in this react hook', expected: 'coding' },
  { prompt: 'generate pdf certificate template', expected: 'pdf' },
  { prompt: 'create slides for quarterly business review', expected: 'ppt' },
  { prompt: 'create an art illustration of a robot', expected: 'image' },
  { prompt: 'analyze this screenshot image', expected: 'vision', file: { mimetype: 'image/webp' } },
  { prompt: 'questions from uploaded pdf only', expected: 'pdf_rag', file: { mimetype: 'application/pdf' } },
  { prompt: 'suggest books for backend engineers', expected: 'chat' },
  { prompt: 'look up nvidia stock price today', expected: 'search' },
  { prompt: 'implement binary search in typescript', expected: 'coding' },
];

if (cases.length !== 50) {
  throw new Error(`Expected 50 cases, got ${cases.length}`);
}

const timings = [];
let correct = 0;
let failed = 0;
const mismatches = [];

for (const testCase of cases) {
  const started = Date.now();
  try {
    const result = await routerNode({
      prompt: testCase.prompt,
      agent: 'auto',
      conversationId: null,
      file: testCase.file || null,
    });
    const ms = Date.now() - started;
    timings.push(ms);
    if (result.agent === testCase.expected) {
      correct += 1;
    } else {
      mismatches.push({
        prompt: testCase.prompt,
        expected: testCase.expected,
        got: result.agent,
        ms,
      });
    }
  } catch (error) {
    failed += 1;
    mismatches.push({
      prompt: testCase.prompt,
      expected: testCase.expected,
      got: 'ERROR',
      error: error.message,
    });
  }
}

timings.sort((a, b) => a - b);
const mean = timings.length
  ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length)
  : null;
const p50 = timings.length ? timings[Math.floor(timings.length * 0.5)] : null;
const p95 = timings.length ? timings[Math.min(timings.length - 1, Math.floor(timings.length * 0.95))] : null;

console.log(
  JSON.stringify(
    {
      total: cases.length,
      correct,
      failed,
      accuracyPct: Number(((correct / cases.length) * 100).toFixed(1)),
      meanMs: mean,
      p50Ms: p50,
      p95Ms: p95,
      mismatches,
    },
    null,
    2
  )
);

process.exit(failed ? 1 : 0);
