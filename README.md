# FlowMind AI

**Workflow failure intelligence for teams that can't afford blind spots.**

FlowMind AI ingests execution telemetry from Zapier, Make, n8n, or any internal system, runs GPT-4o-powered root cause analysis over your failure history, surfaces predictive risk scores before incidents happen, and optionally attempts automated remediation — all through a GitHub-style monitoring dashboard.

---

## Contents

- [Why FlowMind](#why-flowmind)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Ingest API](#ingest-api)
- [AI Capabilities](#ai-capabilities)
- [Service Ports](#service-ports)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why FlowMind

Modern revenue pipelines run on automation. A failed Zap silently drops leads. A broken Make scenario lets invoices miss payment deadlines. A crashing n8n workflow stops customer onboarding cold.

The tools that run these workflows give you stack traces. FlowMind gives you answers.

| Without FlowMind | With FlowMind |
|---|---|
| "Webhook returned 500" | "Stripe rate limit hit during batch sync — 43 leads not captured" |
| Manual log archaeology | AI root cause in < 10 seconds |
| Alert fatigue from noise | Risk-ranked alerts with business impact estimates |
| Post-mortem after the fact | Predictive failure detection before SLA breach |
| Same errors recurring | RAG knowledge base surfaces past resolutions instantly |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FlowMind AI                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐ │
│  │  Next.js 14  │    │  Express API │    │  FastAPI AI   │ │
│  │  Dashboard   │◄──►│  + Prisma    │◄──►│  Service      │ │
│  │  (port 3000) │    │  (port 4000) │    │  (port 8000)  │ │
│  └──────────────┘    └──────┬───────┘    └──────┬────────┘ │
│                             │                   │          │
│                    ┌────────▼────────┐  ┌───────▼────────┐ │
│                    │   PostgreSQL 16 │  │   ChromaDB     │ │
│                    │   (port 5432)   │  │   Vector Store │ │
│                    └─────────────────┘  │   (port 8001)  │ │
│                    ┌─────────────────┐  └────────────────┘ │
│                    │   Redis 7       │                      │
│                    │   (port 6000)   │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. Automation platforms POST execution events to the ingest endpoints
2. The backend queues analysis jobs via Bull/Redis
3. The AI service runs LangChain agents with RAG over your failure history
4. Results are persisted to PostgreSQL and streamed to the dashboard via Socket.IO

```
flowmind-ai/
├── frontend/          # Next.js 14, TypeScript, Tailwind CSS, Recharts, Zustand
├── backend/           # Node.js, Express, Prisma ORM, Bull queues, Socket.IO
├── ai-service/        # Python, FastAPI, LangChain, OpenAI, ChromaDB
└── docker-compose.yml # Full local stack in a single command
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 App Router, TypeScript | Dashboard and AI Copilot UI |
| **Styling** | Tailwind CSS, GitHub Dark design tokens | GitHub-aligned UI system |
| **Charts** | Recharts | Execution volume, failure categories |
| **State** | Zustand + localStorage | Auth session persistence |
| **Backend** | Node.js 20, Express 4 | REST API, WebSocket server |
| **ORM** | Prisma 5 | Type-safe PostgreSQL access |
| **Database** | PostgreSQL 16 | Execution history, analytics |
| **Queue** | Bull (Redis-backed) | Async AI analysis jobs |
| **Cache / PubSub** | Redis 7 | Job queues, session cache |
| **Real-time** | Socket.IO | Live dashboard updates |
| **AI Framework** | LangChain + OpenAI GPT-4o | Root cause, prediction, chat |
| **Vector Store** | ChromaDB | Failure embedding similarity search |
| **Auth** | JWT + bcrypt | Stateless API authentication |
| **Container** | Docker, Docker Compose | Reproducible local environment |

---

## Getting Started

### Prerequisites

| Tool | Minimum version |
|---|---|
| Docker | 24+ |
| Docker Compose | v2 |
| Node.js | 20 LTS |
| Python | 3.11 |
| OpenAI API key | — |

### 1. Clone the repository

```bash
git clone https://github.com/manideep0921/flowmind-ai.git
cd flowmind-ai
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```env
OPENAI_API_KEY=sk-...
JWT_SECRET=<at-least-32-random-chars>
POSTGRES_PASSWORD=<strong-password>
```

Everything else has safe defaults for local development.

### 3. Start the full stack

```bash
docker-compose up -d
```

Docker Compose will:
- Pull and start PostgreSQL 16, Redis 7, and ChromaDB
- Build and start the Express backend (runs `prisma migrate deploy` on startup)
- Build and start the FastAPI AI service
- Build and start the Next.js frontend

Wait ~30 seconds for all health checks to pass. Monitor with:

```bash
docker-compose logs -f backend
```

### 4. Seed demo data (optional)

```bash
docker-compose exec backend npx ts-node prisma/seed.ts
```

This creates a demo organization, sample workflows, and synthetic execution history so the dashboard is populated immediately.

### 5. Open the app

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| REST API | http://localhost:4000 |
| API Docs (Swagger) | http://localhost:4000/api-docs |
| AI Service | http://localhost:8000 |

**Demo credentials** (after seeding):

```
Email:    demo@flowmind.ai
Password: demo1234
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | **Yes** | — | OpenAI API key for GPT-4o and embeddings |
| `JWT_SECRET` | **Yes** | `change-me` | HS256 signing secret — use 32+ random chars in production |
| `DATABASE_URL` | Yes | postgres://… | Full Prisma connection string |
| `POSTGRES_USER` | Yes | `flowmind` | PostgreSQL user |
| `POSTGRES_PASSWORD` | Yes | `flowmind_pass` | PostgreSQL password |
| `POSTGRES_DB` | Yes | `flowmind_db` | PostgreSQL database name |
| `REDIS_URL` | Yes | `redis://…:6379` | Redis connection string |
| `AI_SERVICE_URL` | Yes | `http://ai-service:8000` | Internal AI service address |
| `AI_SERVICE_API_KEY` | Yes | `internal-ai-…` | Shared secret between backend and AI service |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:4000/api/v1` | Backend URL visible to the browser |
| `NEXT_PUBLIC_WS_URL` | Yes | `http://localhost:4000` | WebSocket URL for real-time updates |
| `SLACK_WEBHOOK_URL` | No | — | Slack incoming webhook for alert notifications |
| `PAGERDUTY_API_KEY` | No | — | PagerDuty Events API v2 key |
| `CHROMA_HOST` | No | `chromadb` | ChromaDB host (service name inside Docker) |
| `CHROMA_PORT` | No | `8001` | ChromaDB port |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime |

See [`.env.example`](.env.example) for a complete annotated template.

---

## Ingest API

Execution data is sent to FlowMind via authenticated POST webhooks. Include your API key (generated in Settings) in the `x-api-key` header.

### Endpoint pattern

```
POST /api/v1/ingest/{source}
x-api-key: fm_...
Content-Type: application/json
```

Where `{source}` is one of: `zapier` · `make` · `n8n` · `internal` · `generic`

### Payload schema

```jsonc
{
  "workflowId":    "wf_abc123",          // required — your workflow identifier
  "workflowName":  "Lead Sync → CRM",   // optional — shown in the dashboard
  "status":        "FAILED",             // SUCCESS | FAILED | TIMEOUT | RUNNING
  "startedAt":     "2026-05-15T10:00:00Z",
  "finishedAt":    "2026-05-15T10:00:03Z",
  "durationMs":    3142,
  "errorMessage":  "429 Too Many Requests",
  "errorCode":     "RATE_LIMIT_EXCEEDED",
  "payload":       { ... },              // optional — request/response data
  "metadata":      { ... }              // optional — any extra context
}
```

### Source-specific examples

**Zapier** — add a "Webhooks by Zapier" step at the end of your Zap:
```
POST https://your-domain.com/api/v1/ingest/zapier
```

**Make** — use the HTTP module as the final module in your scenario:
```
POST https://your-domain.com/api/v1/ingest/make
```

**n8n** — add an HTTP Request node after your workflow logic:
```
POST https://your-domain.com/api/v1/ingest/n8n
```

**Internal / custom systems:**
```bash
curl -X POST https://your-domain.com/api/v1/ingest/generic \
  -H "x-api-key: fm_your_key" \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"checkout-flow","status":"FAILED","errorMessage":"Stripe timeout"}'
```

---

## AI Capabilities

### Root Cause Analysis

Triggered manually per execution or automatically for repeated failures. The AI service:

1. Retrieves the full execution payload and error trace
2. Performs semantic search over past similar failures in ChromaDB
3. Sends context to GPT-4o with a structured analysis prompt
4. Returns a structured response: root cause category, plain-English explanation, technical details, business impact estimate, and ranked fix suggestions

```
POST /api/v1/ai/analyze/:executionId
```

### Predictive Risk Scoring

Runs on demand or via scheduled cron. Analyzes a workflow's recent execution history to compute a risk score (0–1) and a predicted failure window.

```
POST /api/v1/ai/predict/:workflowId
```

### Auto-Heal Agent

A LangChain agent that attempts automated remediation — token refresh, intelligent retry with backoff, failover routing. Results are logged and surfaced in the dashboard.

```
POST /api/v1/ai/auto-heal/:executionId
```

### AI Copilot (RAG Chat)

Conversational interface backed by your workflow failure history. Answers questions like "what's been causing OAuth errors this week?" with citations to specific past executions.

```
POST /api/v1/ai/chat
```

---

## Service Ports

| Service | Host port | Internal port | Notes |
|---|---|---|---|
| Frontend | `3000` | `3000` | Next.js dev server |
| Backend API | `4000` | `4000` | Express + Socket.IO |
| AI Service | `8000` | `8000` | FastAPI |
| PostgreSQL | `5432` | `5432` | |
| Redis | `6000` | `6379` | Host port remapped to avoid conflicts |
| ChromaDB | `8001` | `8000` | |

---

## Roadmap

- [ ] Slack and PagerDuty alert delivery
- [ ] Kubernetes Helm chart with HPA
- [ ] Pipedream and Workato ingest adapters
- [ ] SOC 2 Type II compliant audit logging
- [ ] Multi-tenant billing with Stripe
- [ ] Custom alert rules (threshold, anomaly, scheduled digest)
- [ ] GitHub Actions integration for CI workflow monitoring

