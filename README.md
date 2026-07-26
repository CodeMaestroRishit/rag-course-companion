<div align="center">

# 🔎 SeekPoint

**Find the exact moment.**

An AI-powered research assistant — ask questions grounded in your own
lessons, documents, and videos, and get answers with real, clickable
citations. A Notebook-style knowledge base with a built-in **Clip Finder**
for content creators who need the exact quotable moment, not the whole
recording.

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-orchestration-1a1a2e)](https://www.langchain.com/langgraph)
[![Chroma](https://img.shields.io/badge/ChromaDB-vector%20store-FF6F61)](https://www.trychroma.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com)

**[🚀 Live Demo](https://rag-course-companion-frontend-dqql.vercel.app)**

<br>

<!-- 📸 PLACEHOLDER: hero screenshot — Answers tab with the "Welcome to
     SeekPoint" state or a mid-conversation cited answer, Sources sidebar
     visible. This is the first thing a reviewer sees. -->
![SeekPoint hero screenshot](<img width="1730" height="1257" alt="hero" src="https://github.com/user-attachments/assets/a5806bad-9899-4e68-89c1-685726f56f3e" />
)

</div>

---

## ✨ Features

### 💬 Grounded Q&A with real citations
Ask a question and get an answer built **only** from your ingested
sources — never outside knowledge. Every factual sentence cites its exact
source and location, rendered as clickable pills:
- `(Lesson Name, 03:12)` for video/YouTube sources
- `(Doc Name, p. 4)` for PDF pages
- `(Doc Name, §3)` for plain-text/web-page sections

If the sources don't cover the question, the system says so instead of
guessing.

<!-- 📸 PLACEHOLDER: an answer with 2-3 citation pills visible under it -->
![Cited answer](docs/screenshots/answer-citations.png)

### 🧭 Click a citation, jump to the source
Expanding "Show sources" reveals the actual quoted passage behind each
citation. For YouTube-sourced answers, a **"Watch ↗"** link opens the video
at the *exact cited second* — no scrubbing required.

<!-- 📸 PLACEHOLDER: the "Show sources" panel open, including a YouTube
     "Watch ↗" link -->
![Source inspection panel](docs/screenshots/source-viewer.png)

### 🧠 A visible reasoning trace, including retries
Every query runs a real multi-step pipeline (see **Retrieval Flow** below),
and you can watch it happen step by step. Low-confidence answers trigger an
automatic self-grading retry loop (up to 3 attempts) with feedback from the
grading step — visible in the trace timeline, not hidden.

<!-- 📸 PLACEHOLDER: the trace panel open, showing colored step cards -->
![Reasoning trace](docs/screenshots/trace-panel.png)

### 🎬 Clip Finder for content creators
Every ingested chunk is automatically tagged funny / insightful /
controversial / emotional / informative, with a confidence score.
- **Browse** — filter everything already tagged, by category and confidence.
- **Search** — describe a moment in plain language ("something funny about
  job interviews") and get back the single best-matching clip with an exact
  timestamp to cut at.

<!-- 📸 PLACEHOLDER: Clips tab, Browse mode, category filters + clip cards -->
![Clip finder](docs/screenshots/clip-finder.png)

### 📚 Five source types, one pipeline
| Source | Chunking | Citation |
|---|---|---|
| VTT / SRT | ~30-60s on sentence boundaries | `mm:ss` |
| PDF | one chunk per page | `p. N` |
| Plain text (pasted) | ~800 chars, paragraph-aware | `§N` |
| Website URL | fetched + HTML-stripped, same as text | `§N` |
| YouTube link | existing captions only (no audio transcription) | `mm:ss` + a direct timestamp link |

<!-- 📸 PLACEHOLDER: the Add Source modal, one tab selected with a
     file/URL filled in -->
![Add a source](docs/screenshots/add-source.png)

### 🗂️ Source management
See every ingested source with its chunk count in a sidebar, and delete
anything you don't want anymore. Re-uploading a source with the same name
updates it in place rather than duplicating it.

### 🕘 Query history
Every question (from either tab) is logged locally with a timestamp.
Re-run any past query with one click, or filter history to clip searches
only, or to queries where the system actually retried.

---

## 🏗️ Architecture

