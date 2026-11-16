import redis from '../../../shared/redis/redis.js';

const keyFor = (conversationId) => `pdf-rag:${conversationId}`;
const TTL_SECONDS = 60 * 60 * 24 * 7;

export const getPdfRagSession = async (conversationId) => {
  if (!conversationId) return null;
  const raw = await redis.get(keyFor(conversationId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setPdfRagSession = async (conversationId, session) => {
  if (!conversationId) return;
  await redis.set(keyFor(conversationId), JSON.stringify(session), 'EX', TTL_SECONDS);
};

export const clearPdfRagSession = async (conversationId) => {
  if (!conversationId) return;
  await redis.del(keyFor(conversationId));
};

export const conversationHasPdf = async (conversationId) => {
  const session = await getPdfRagSession(conversationId);
  return Boolean(session?.collectionName);
};
