import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  createVectorStore,
  deleteVectorStoreCollection,
  loadVectorStore,
} from '../utils/vectorStore.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getModel } from '../utils/model.js';
import {
  getPdfRagSession,
  setPdfRagSession,
} from '../utils/pdfRagSession.js';

const isVaguePdfPrompt = (prompt = '') => {
  const text = prompt.trim().toLowerCase();
  if (!text || text.length < 8) return true;

  return /^(hi|hello|hey|ok|okay|thanks|thank you)[\s!.]*$/.test(text)
    || /\b(this is (the )?(file|pdf)|i (have )?attached|here is (the )?(file|pdf)|uploaded (the )?(file|pdf)|file attached|pdf attached)\b/.test(text)
    || /^(ok+|okay+)?\s*(this|here|attached|file|pdf)\b/.test(text);
};

const buildCollectionName = (conversationId) =>
  `pdf-${String(conversationId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || Date.now()}`;

export const pdfRagAgent = async (state) => {
  let tempPath = state.file?.path;

  try {
    if (!state.file && !state.conversationId) {
      return {
        ...state,
        response: 'Please upload a PDF so I can read it and help you.',
      };
    }

    let session = await getPdfRagSession(state.conversationId);
    let vectorStore;
    let fileName = session?.fileName || 'uploaded.pdf';

    if (state.file) {
      const buffer = fs.readFileSync(state.file.path);
      const pdf = new PDFParse({ data: buffer });
      const result = await pdf.getText();
      const text = result.text?.trim();

      if (!text) {
        return {
          ...state,
          response: "I couldn't extract text from this PDF. It may be scanned or image-only.",
        };
      }

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const docs = await splitter.createDocuments([text]);

      if (session?.collectionName) {
        await deleteVectorStoreCollection(session.collectionName);
      }

      const collectionName = buildCollectionName(state.conversationId);
      vectorStore = await createVectorStore(collectionName, docs);
      fileName = state.file.originalname || fileName;

      session = {
        collectionName,
        fileName,
        updatedAt: Date.now(),
      };
      await setPdfRagSession(state.conversationId, session);
    } else if (session?.collectionName) {
      vectorStore = await loadVectorStore(session.collectionName);
    } else {
      return {
        ...state,
        response: 'Please upload a PDF first, then ask me about it.',
      };
    }

    const vague = isVaguePdfPrompt(state.prompt);
    const searchQuery = vague
      ? 'overview summary introduction product main topics key points'
      : state.prompt;

    const relevantDocs = await vectorStore.similaritySearch(searchQuery, 5);
    const context = relevantDocs.map((doc) => doc.pageContent).join('\n\n');
    const llm = getModel('pdf-rag');

    const systemPrompt = vague
      ? `You are CortexAI PDF Assistant.

The user just shared a PDF (${fileName}) but did not ask a specific question yet.

Using ONLY the PDF context below:
1. Give a short friendly acknowledgment that you read the PDF.
2. Share a concise summary of what the PDF is about (5-8 bullet points or short paragraphs).
3. Mention 2-4 useful things you can already tell from the PDF.
4. End by asking if they want anything specific from the PDF (e.g. details, quotes, how-tos).

Rules:
- Answer ONLY from the uploaded PDF.
- Never invent facts.
- Use Markdown.
- Do not say you cannot help just because the question is vague — summarize first.`
      : `You are CortexAI PDF Assistant for "${fileName}".

Rules:
- Answer ONLY from the uploaded PDF context.
- Never make up information.
- If the answer is not present, reply: "I couldn't find this information in the uploaded PDF."
- Use Markdown formatting.
- Be specific and cite details from the document when possible.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Context:\n\n${context}\n\nUser message:\n\n${state.prompt || '(PDF uploaded)'}`),
    ];

    const response = await llm.invoke(messages);

    return {
      ...state,
      response: response.content,
    };
  } finally {
    if (tempPath) {
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {
        console.log(err.message);
      }
    }
  }
};
