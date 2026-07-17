# Cortex AI

A multi-agent AI chat platform with a microservices backend. A LangGraph supervisor routes each user query to a specialized agent — chat, coding, web search, PDF generation, PPT generation, image generation, vision, or PDF-based RAG — instead of relying on a single general-purpose model for everything.

**Live demo:** [your-live-url.com](https://your-live-url.com)

---

## Features

- **Multi-agent orchestration** — a LangGraph supervisor graph inspects each prompt and routes it to the right specialized agent (chat / coding / search / pdf / ppt / image / vision / pdf-rag).
- **RAG over uploaded PDFs** — uploaded PDFs are chunked, embedded with Gemini embeddings, stored in a per-session Qdrant collection, and retrieved with similarity search to answer questions grounded in the document.
- **Multi-model backend** — different agents use different LLM providers (Gemini, Groq/Llama, DeepSeek via OpenRouter) chosen for the task at hand.
- **Web search agent** — live web search via Tavily for up-to-date answers.
- **Document generation** — agents that produce PDF and PPT files on request (via `pdfkit` / `pptxgenjs`).
- **Credit-based billing** — Razorpay-backed plans (Free / Starter / Pro) with per-action credit costs, enforced server-side.
- **Rate limiting** — Redis-backed, per-agent, per-user rate limits to prevent abuse of expensive model calls.
- **Auth** — Firebase-based authentication with JWT sessions, enforced at the API gateway.
- **File storage** — user uploads and generated files stored in AWS S3.

---

## Architecture

The backend is split into independently deployable services behind a single API gateway:

```
                        ┌─────────────┐
                        │   Frontend  │
                        │ React + Vite│
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │   Gateway   │  auth check, request proxying
                        └──────┬──────┘
           ┌───────────┬───────┼───────┬────────────┐
           │            │              │             │
      ┌────▼───┐   ┌────▼───┐    ┌─────▼────┐  ┌─────▼─────┐
      │  Auth  │   │  Chat  │    │  Agent   │  │  Billing  │
      │ service│   │ service│    │ service  │  │  service  │
      └────────┘   └────────┘    └────┬─────┘  └───────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │  LangGraph supervisor graph  │
                        │  chat · coding · search ·    │
                        │  pdf · ppt · image · vision · │
                        │  pdf-rag                      │
                        └──────────────┬──────────────┘
                                       │
                         Gemini · Groq/Llama · DeepSeek
                         Qdrant (vectors) · Tavily (search)
```

Each service has its own `Dockerfile`; `docker-compose.yml` runs shared infrastructure (Redis) alongside the services for local development.

---

## Tech Stack

**Frontend:** React.js, Vite, Redux Toolkit

**Backend:** Node.js, Express, Microservices architecture, API Gateway (`express-http-proxy`)

**AI / Agents:** LangGraph, LangChain, Google Gemini, Groq (Llama 3.3), DeepSeek (via OpenRouter), Qdrant (vector DB / RAG), Tavily (web search)

**Data / Infra:** MongoDB, Redis (rate limiting, caching), AWS S3 (file storage), Docker

**Auth / Billing:** Firebase Auth, JWT, Razorpay

---

## Services

| Service  | Responsibility                                                       |
|----------|-----------------------------------------------------------------------|
| `gateway`| Single entry point — auth middleware, request proxying to services   |
| `auth`   | User signup/login, Firebase-backed authentication                    |
| `chat`   | Conversation and message persistence                                 |
| `agent`  | LangGraph supervisor + specialized agents (chat, coding, search, pdf, ppt, image, vision, pdf-rag) |
| `billing`| Plans, credits, Razorpay payment handling                            |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Docker (for Redis, or run Redis locally)
- MongoDB instance
- API keys: Google (Gemini), Groq, OpenRouter, Tavily, Qdrant, Firebase service account, AWS (S3), Razorpay

### Setup

```bash
# clone the repo
git clone https://github.com/<your-username>/cortex-ai.git
cd cortex-ai

# start shared infra (Redis)
cd backend
docker-compose up -d

# install and run each service (repeat for gateway, auth, chat, agent, billing)
cd services/<service-name>
npm install
cp .env.example .env   # fill in your own values
npm run dev

# frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

Each service requires its own `.env` file — see `.env.example` in each service directory for the required variables. Never commit real `.env` files or `serviceAccount.json`; these are already covered in `.gitignore`.

---

## Roadmap

- [ ] Deploy backend services to AWS EC2
- [ ] Add CI/CD pipeline

---

## License

This project is for personal/portfolio use.
