import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { RecursiveCharacterTextSplitter } = await import('@langchain/textsplitters');
const {
  createVectorStore,
  deleteVectorStoreCollection,
} = await import('../utils/vectorStore.js');

const fixturePath = path.join(__dirname, 'fixtures/clouddesk-kb.txt');
const text = fs.readFileSync(fixturePath, 'utf8');

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 80,
});

const docs = await splitter.createDocuments([text]);
const collectionName = `bench-rag-${Date.now()}`;

console.log(`Indexing ${docs.length} chunks into ${collectionName}...`);
const store = await createVectorStore(collectionName, docs);

const questions = [
  'What is CloudDesk?',
  'How much is the Growth plan?',
  'What is the Scale plan first response SLA?',
  'Which integrations does CloudDesk support?',
  'What encryption does CloudDesk use?',
  'What is the refund approval rule for Copilot?',
  'What is the support email address?',
  'Does annual billing give a discount?',
  'What channels are in the omnichannel inbox?',
  'What is the on-call escalation number for Scale?',
  'Can admins enforce SSO?',
  'Where is the status page?',
];

for (let i = 0; i < 3; i++) {
  await store.similaritySearch(questions[i % questions.length], 5);
}

const timings = [];
const samples = [];

for (let i = 0; i < 24; i++) {
  const q = questions[i % questions.length];
  const started = Date.now();
  const hits = await store.similaritySearch(q, 5);
  const ms = Date.now() - started;
  timings.push(ms);
  if (i < 5) {
    samples.push({
      question: q,
      ms,
      topSnippet: hits[0]?.pageContent?.slice(0, 120) || null,
    });
  }
}

timings.sort((a, b) => a - b);
const pct = (p) => timings[Math.min(timings.length - 1, Math.floor(timings.length * p))];
const mean = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);

const summary = {
  collection: collectionName,
  chunks: docs.length,
  timedQueries: timings.length,
  p50Ms: pct(0.5),
  p95Ms: pct(0.95),
  meanMs: mean,
  samples,
  note: 'Includes query embedding + Qdrant similaritySearch on CloudDesk-like KB chunks.',
};

console.log(JSON.stringify(summary, null, 2));

await deleteVectorStoreCollection(collectionName);
process.exit(0);
