import { QdrantVectorStore } from '@langchain/qdrant';
import { embeddings } from './embedding.js';

const qdrantConfig = (collectionName) => ({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  collectionName,
});

export const createVectorStore = async (collectionName, docs) => {
  return await QdrantVectorStore.fromDocuments(docs, embeddings, qdrantConfig(collectionName));
};

export const loadVectorStore = async (collectionName) => {
  return await QdrantVectorStore.fromExistingCollection(embeddings, qdrantConfig(collectionName));
};

export const deleteVectorStoreCollection = async (collectionName) => {
  if (!collectionName) return;
  try {
    const store = await loadVectorStore(collectionName);
    await store.client.deleteCollection(collectionName);
  } catch (err) {
    console.log(err.message);
  }
};
