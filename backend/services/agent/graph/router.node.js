import { getModel } from '../utils/model.js';
import { conversationHasPdf } from '../utils/pdfRagSession.js';

const routeByKeywords = (prompt = '') => {
  const text = prompt.toLowerCase();

  // "binary search" is coding; other "search" intents are web search.
  if (
    /\b(latest|current|today|news|recent|look up|weather|price|exchange rate|scores|markets)\b/.test(text) ||
    (/\bsearch\b/.test(text) && !/\bbinary search\b/.test(text))
  ) {
    return 'search';
  }
  if (/\b(debug|code|coding|python|javascript|typescript|react|sql|api|dockerfile|function|unit test|binary search|memory leak)\b/.test(text)) {
    return 'coding';
  }
  if (/\b(powerpoint|slides|slide deck|presentation|pitch deck)\b/.test(text)) {
    return 'ppt';
  }
  if (/\b(generate|create|draw|illustration|logo|mockup)\b/.test(text) && /\b(image|picture|art|illustration|logo|mockup|landscape|city|fox)\b/.test(text)) {
    return 'image';
  }
  if (/\b(pdf|printable document)\b/.test(text) && /\b(generate|create|export|make|printable|template)\b/.test(text)) {
    return 'pdf';
  }
  if (/\b(explain|what is|help me understand|suggest|define|meaning|capital of)\b/.test(text)) {
    return 'chat';
  }

  return null;
};

export const routerNode = async (state) => {
  if (state.agent && state.agent !== 'auto') {
    return {
      ...state,

      agent: state.agent,
    };
  }

  if (state.file) {
    if (state.file.mimetype.startsWith('image/')) {
      return {
        ...state,

        agent: 'vision',
      };
    }
  }

  if (state.file) {
    if (state.file.mimetype === 'application/pdf') {
      return {
        ...state,

        agent: 'pdf_rag',
      };
    }
  }

  const keywordRoute = routeByKeywords(state.prompt);
  if (keywordRoute) {
    return {
      ...state,
      agent: keywordRoute,
    };
  }

  // Keep answering from a PDF already uploaded in this conversation (ChatGPT-like).
  if (await conversationHasPdf(state.conversationId)) {
    return {
      ...state,
      agent: 'pdf_rag',
    };
  }

  const llm = getModel('router');

  const result = await llm.invoke(`

You are an agent router.

Available agents:

- chat
- search
- coding
- pdf
- ppt
- image 
- vision
- pdf_rag

Rules:

chat:
General conversation,
explanations,
learning,
questions.

search:
Current events,
latest information,
news,
recent developments,
internet lookup.

coding:
Generate code,
debug code,
build projects,
architecture,
API design.

pdf:
Questions about generate PDFs
or document context.

ppt:
Questions about generate ppts
or ppt context.

vision:
Questions about an uploaded image.

pdf_rag:
Questions that require answering from an uploaded PDF.

Return exactly one of these agent identifiers, with no punctuation:

chat
search
coding
pdf
ppt
image
vision
pdf_rag

User Query:

${state.prompt}

 `);

  return {
    ...state,

    agent: ['chat', 'search', 'coding', 'pdf', 'ppt', 'image', 'vision', 'pdf_rag'].includes(
      String(result.content).trim().toLowerCase()
    )
      ? String(result.content).trim().toLowerCase()
      : 'chat',
  };
};
