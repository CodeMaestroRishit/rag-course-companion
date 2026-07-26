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

**[🚀 Live Demo](https://rag-course-companion-frontend-dqql.vercel.ap)**

<br>

<!-- 📸 SCREENSHOT: full-app hero shot — Answers tab, mid-conversation, with
     the Sources sidebar and a cited answer visible. This is the first thing
     visitors see, make it count. -->
![SeekPoint hero screenshot](docs/screenshots/hero.png)

</div>

---

## ✨ Features

### 💬 Cited Q&A, not just a chatbot
Ask a question in plain language and get an answer grounded **only** in your
ingested lessons — every claim cites the lesson name and an exact timestamp
(or page number, for PDFs), rendered as clickable pills. If the lessons don't
cover it, it says so instead of guessing.

<!-- 📸 SCREENSHOT: a question + answer with citation pills visible -->
![Answers with citations](docs/screenshots/answers-citations.png)

### 🧠 A reasoning trace you can actually see
Every query runs through a real pipeline — query transform (HyDE + sub-query
splitting) → parallel retrieval → dedup → LLM rerank → generate → self-grade
→ guardrail — and you can watch every step. Low-confidence answers trigger an
automatic retry loop with feedback from the grading step, visible in the
trace timeline.

<!-- 📸 SCREENSHOT: the trace panel open, showing colored step cards,
     ideally with a retry sequence visible -->
![Reasoning trace panel](docs/screenshots/trace-panel.png)

### 🎬 Clip Finder for content creators
**Browse** every lesson pre-tagged as funny, insightful, controversial,
emotional, or informative, filterable by confidence score. **Search** in
plain language ("find something funny about job interviews") and get back
one best-match clip with an exact timestamp, ready to cut.

<!-- 📸 SCREENSHOT: Clips tab in Browse mode, category filters + clip cards -->
![Clip finder](docs/screenshots/clip-finder.png)

### 📚 Ingest from anywhere
Upload `.vtt`/`.srt` subtitle files, PDFs (cited by page number instead of
timestamp), or paste a YouTube link (pulls existing captions — no
transcription needed). Everything runs through the same classify → embed →
upsert pipeline.

<!-- 📸 SCREENSHOT: the Add Source modal with a file selected -->
![Add a source](docs/screenshots/add-source.png)

### 🗂️ Manage what's ingested
See every source with its chunk count in a sidebar, and delete anything you
don't want anymore — no digging through a database required.

### 🕘 History that remembers
Every question (from either tab) is logged locally with a timestamp.
Re-run any past query with one click, or filter history down to clip
searches only, or queries where the system actually retried.

---

## 🏗️ How it works

