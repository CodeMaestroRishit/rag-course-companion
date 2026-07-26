<div align="center">

# 🔎 SeekPoint

**Find the exact moment.**

Ask questions about your course lessons and get cited, timestamped answers.
Surface funny, insightful, or controversial clips in seconds. Built for
creators and learners who don't have time to scrub through hours of video.

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-orchestration-1a1a2e)](https://www.langchain.com/langgraph)
[![Chroma](https://img.shields.io/badge/ChromaDB-vector%20store-FF6F61)](https://www.trychroma.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com)

**[🚀 Live Demo](https://rag-course-companion-frontend-dqql.vercel.app)**

<br>

![SeekPoint — Welcome screen](docs/screenshots/hero.png)

</div>

---

## ✨ Features

### 💬 Cited Q&A, not just a chatbot
Ask a question in plain language and get an answer grounded **only** in your
ingested lessons — every claim cites the lesson name and an exact timestamp
(or page number, for PDFs), rendered as clickable pills. If the lessons don't
cover it, it says so instead of guessing.

![Answer with citation pills](docs/screenshots/answer-citations.png)

### 🧠 A reasoning trace you can actually see
Every query runs through a real pipeline — query transform (HyDE + sub-query
splitting) → parallel retrieval → dedup/merge → LLM rerank → generate →
self-grade → guardrail — and you can watch every step happen. Low-confidence
answers trigger an automatic retry loop with feedback from the grading step,
visible right in the trace timeline.

![Reasoning trace panel open beside a cited answer](docs/screenshots/trace-panel.png)

### 🎬 Clip Finder for content creators
**Browse** every source pre-scanned and tagged as funny, insightful,
controversial, emotional, or informative, filterable by category and
confidence score. **Search** in plain language ("find something funny about
job interviews") and get back one best-match clip with an exact
timestamp/page, ready to cut into a short or highlight reel.

![Clip Finder in Browse mode with category filters](docs/screenshots/clip-finder.png)

### 📚 Ingest from anywhere
Upload `.vtt`/`.srt` subtitle files, PDFs (cited by page number instead of
timestamp), plain text, or a web page URL — or just paste a YouTube link
(pulls existing captions, no transcription needed). Every source type flows
through the same classify → embed → upsert pipeline, so Q&A and Clip Finder
work identically no matter where the content came from.

### 🗂️ Manage what's ingested
See every source with its chunk count in a sidebar, and delete anything you
don't want anymore — no digging through a database required.

### 🕘 History that remembers
Every question (from either tab) is logged locally with a timestamp.
Re-run any past query with one click, or filter history down to clip
searches only, or queries where the system actually retried.

---

## 🏗️ How it works

                   ┌─────────────────────┐
                   │   React Frontend     │
                   │  (Vite + Tailwind)   │
                   └──────────┬───────────┘
                              │ REST
                   ┌──────────▼───────────┐
                   │    Express API        │
                   │      server.js        │
                   └──────────┬───────────┘
                              │
                   ┌──────────▼───────────┐
                   │   LangGraph Pipeline   │
                   │                        │
                   │  transform  (HyDE +    │
                   │   sub-query split)     │
                   │       │                │
                   │  parallel retrieve     │
                   │       │                │
                   │  merge / dedupe        │
                   │       │                │
                   │  LLM rerank            │
                   │       │                │
                   │  generate (cited)      │
                   │       │                │
                   │  self-grade (CRAG) ───┐│
                   │       │      retry ≤3 ┘│
                   │  guardrail             │
                   └──────────┬─────────────┘
                              │
                   ┌──────────▼───────────┐
                   │   ChromaDB (vectors)  │
                   └───────────────────────┘

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, lucide-react |
| Backend API | Node.js, Express |
| Orchestration | LangGraph (`@langchain/langgraph`) |
| LLM | OpenAI `gpt-4o-mini` (chat), `text-embedding-3-small` (embeddings) |
| Vector store | ChromaDB |
| Deployment | Vercel (frontend), Render (backend + Chroma, as two services) |

### Retrieval flow, step by step
1. **Transform** — rewrites the raw query into a hypothetical answer (HyDE)
   and splits it into sub-queries for broader recall.
2. **Retrieve** — runs each sub-query against Chroma in parallel.
3. **Merge** — combines and deduplicates chunks across sub-queries.
4. **Rerank** — an LLM call scores chunks for relevance to the original
   question.
5. **Generate** — answers using only the top-ranked chunks, citing every
   factual sentence.
6. **Grade** — a CRAG-style self-grade scores the answer's groundedness;
   below threshold, it loops back to retrieve with feedback (up to 3 times).
7. **Guardrail** — final check that every citation refers to a real,
   ingested source before the answer reaches the user.

---

## ⚙️ Environment Variables

### Backend
| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for chat + embeddings |
| `CHROMA_HOST` | Chroma server hostname |
| `CHROMA_PORT` | Chroma server port (`443` when connecting over public HTTPS) |
| `CHROMA_SSL` | `true` when Chroma is reachable only over HTTPS |
| `PORT` | Port the Express API listens on |

### Frontend
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the deployed backend API |

---



##⚠️ Known Limitations
1)Backend runs on Render's free tier — the first request after ~15 minutes of inactivity can take 30-60s to spin up (a GitHub Actions keep-alive pinger reduces this, but doesn't eliminate cold starts entirely).
2)Chroma runs on ephemeral disk on the free tier, so ingested sources can be wiped by a redeploy or restart — re-upload if /sources comes back empty.
3)No authentication — the live demo link is meant for evaluation, not for sharing an API key's usage broadly.
Plain-text and web-page sources cite by section number (§N) rather than a page or timestamp, since neither concept applies to raw text.
