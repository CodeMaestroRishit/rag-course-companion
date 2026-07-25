# RAG course companion

A Retrieval-Augmented Generation system over course video transcripts (`.srt`/`.vtt`),
with cited Q&A and a clip-finder for content creators. JavaScript/Node.js only,
`@langchain/langgraph` for orchestration, Chroma for vector storage, OpenAI for
embeddings/generation.

## Architecture

```
ingest.js   -> parses subtitles, chunks, classifies, embeds, upserts into Chroma
graph.js    -> transform -> retrieve -> merge -> rerank -> generate -> grade -> (retry?) -> guardrail
clips.js    -> browseClips (metadata filter, no LLM) + searchClips (graph.js in "clip" mode)
server.js   -> Express API wrapping graph.js and clips.js
```

`graph.js`'s pipeline is one LangGraph `StateGraph` used in two modes:
- **answer** mode (`runQuery`): the Q&A path, `generate` produces a cited factual answer.
- **clip** mode (`searchClips`): `generate` produces `{ category, startTime, endTime, pitch }` instead.

Every node appends a step to `state.trace`, including across retries, so the full
final trace shows exactly what the pipeline did.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy the template and fill in your OpenAI key:

```bash
cp .env.example .env
# then edit .env and set OPENAI_API_KEY=sk-...
```

`.env` is git-ignored. Variables used:

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | (required) | embeddings (`text-embedding-3-small`) + generation (`gpt-4o-mini`) |
| `CHROMA_HOST` | `localhost` | Chroma server host |
| `CHROMA_PORT` | `8000` | Chroma server port |
| `PORT` | `3000` | port `server.js` listens on |

### 3. Start Chroma locally

```bash
npx chromadb run --path ./chroma-data
```

Leave this running in its own terminal. Verify it's up:

```bash
curl http://localhost:8000/api/v2/heartbeat
```

### 4. Ingest lesson data

`ingest.js` reads a manifest JSON file listing subtitle files + lesson names:

```bash
node ingest.js data/lessons/manifest.json
# or just: npm run ingest   (defaults to data/lessons/manifest.json)
```

`data/lessons/manifest.json` currently points at the 3 real lessons in
`class-subtitle/module 1/`. To ingest more, add entries of the form:

```json
{ "filePath": "path/to/file.vtt", "lessonName": "Human-Readable Name", "videoId": "unique-stable-id" }
```

Re-running ingestion on the same files updates existing chunks (stable
`${videoId}-${chunkIndex}` ids) rather than duplicating them.

### 5. Start the API server

```bash
npm start
# RAG API listening on http://localhost:3000
```

## Example requests

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the difference between React Native and Expo?"}'

curl "http://localhost:3000/clips?category=insightful&minConfidence=6&limit=10"

curl -X POST http://localhost:3000/clips/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Find a funny moment about job interviews or confusing diagrams."}'
```

## Adding sources beyond the CLI manifest

Three more ingestion paths run synchronously over HTTP (same classify -> embed
-> upsert pipeline as `ingest.js`, just fed from an upload/URL instead of a
manifest entry) - these back the frontend's "Add Source" modal:

```bash
# VTT/SRT upload
curl -X POST http://localhost:3000/sources/vtt \
  -F "file=@lesson.vtt" -F "lessonName=My Lesson"

# PDF upload - each page becomes one chunk, cited by page number (no timestamps)
curl -X POST http://localhost:3000/sources/pdf \
  -F "file=@handbook.pdf" -F "lessonName=Employee Handbook"

# YouTube - only works if the video already has captions (auto or manual);
# no audio transcription/STT is performed
curl -X POST http://localhost:3000/sources/youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=...", "lessonName": "Optional name"}'
```

PDF chunks carry `sourceType: "pdf"` with `startTime`/`endTime` both set to
the page number; `graph.js` cites these as `(Doc Name, p. 4)` instead of a
`mm:ss` timestamp, and the guardrail/clip-matching logic checks for an exact
page match rather than the ±5-second slack used for video chunks.

## Running the test suite

Each phase has its own runnable acceptance-test script under `test/`, plus a
combined runner:

```bash
npm run test:ingest    # Phase 1: metadata shape, time ranges, dedup on re-ingest
npm run test:query     # Phase 2+3: real question -> cited answer, variants, dedup
npm run test:crag      # Phase 4: grade/retry routing logic + retry cap
npm run test:guardrail # Phase 5: citation + sensitive-content checks
npm run test:trace     # Phase 6: full trace shape/order/coverage
npm run test:clips     # Phase 7: browseClips filters + searchClips shape
npm run test:server    # Phase 8: spins up server.js, hits all 3 endpoints
npm run test:all       # all of the above, in order
```

`test:ingest`, `test:query`, `test:trace`, `test:clips`, and `test:server` make
real OpenAI + Chroma calls (Chroma must be running; `OPENAI_API_KEY` must be
set). `test:crag` and `test:guardrail` are pure unit tests with no network
calls.

## Deploying the backend (Render)

Vercel's serverless functions don't fit this backend: the CRAG retry loop can
take 30-160+ seconds per query (past Vercel's 10s/60s function timeouts), and
Chroma's local disk storage wouldn't survive between serverless invocations
anyway. Render runs a normal long-lived Node process instead, which fits.

1. Push this repo to GitHub/GitLab.
2. In the Render dashboard: **New +** -> **Blueprint**, point it at the repo.
   `render.yaml` at the repo root defines the service, currently on the
   **free** plan.
3. When prompted, enter `OPENAI_API_KEY`. Everything else (`CHROMA_HOST`,
   `CHROMA_PORT`, `CHROMA_DATA_PATH`) is already set in `render.yaml`.
4. `render-start.sh` runs Chroma as a background process bound to
   `127.0.0.1:8000` (Render only exposes the one port `server.js` binds to
   via `PORT` - Chroma's port is never reachable from the public internet),
   waits for its heartbeat, then starts `server.js`.
5. Once deployed, ingest content either by using the frontend's "Add Source"
   modal against the deployed URL (no local files needed), or by committing
   `class-subtitle/` + `data/lessons/manifest.json` and running
   `node ingest.js` once via Render's shell/a one-off job.

**Free-tier tradeoff:** free web services can't attach a persistent disk, so
Chroma's data lives on the container's ephemeral filesystem - wiped on every
redeploy or Render-initiated restart, *and* on spin-down after 15 minutes
idle. `.github/workflows/keep-alive.yml` pings the service every 10 minutes
to prevent the idle case (add a repo secret `RENDER_APP_URL` with your
deployed URL to enable it) - but it can't prevent a wipe from an actual
redeploy/restart. If you want ingested data to actually persist across those,
switch `plan: free` to `plan: starter` (or above) in `render.yaml` and add
back a `disk:` block (see the comments in that file).

The frontend lives in its own repo -
[rag-course-companion-frontend](https://github.com/CodeMaestroRishit/rag-course-companion-frontend)
- see its README for deploying to Vercel and pointing it at this backend's URL.

## Known limitations / TODOs

- **Prompts are functional but un-tuned.** `prompts/*.js` are simple, readable
  templates meant to be iterated on, not final copy.
- **Citation precision:** the QA `generate` prompt sometimes cites a timestamp
  range spanning two adjacent chunks about the same sub-topic (e.g. `9:49 and
  10:23`) rather than a single chunk's exact range. Still real, non-hallucinated
  content - just looser than "one citation, one chunk."
- **Rerank cost:** `rerank` sends up to 40 candidates' text to one LLM call per
  attempt. Fine for this dataset (57 chunks); a much larger corpus would want a
  cheaper first-pass rerank (e.g. a cross-encoder) before the LLM step.
- **Recursion limit:** LangGraph's default `recursionLimit` (25) is too low for
  a full 3-retry CRAG loop (needs ~28 node executions in the worst case).
  `graph.js` exports and passes an explicit `RECURSION_LIMIT`; if `MAX_RETRIES`
  is raised, bump this too.
- **`searchClips` return shape** adds `lessonName`/`videoId` on top of the
  `{category, startTime, endTime, pitch}` shape described in the spec - without
  them there's no way to know which video file to actually cut the clip from.
- **No auth/rate limiting** on `server.js` - intentional per this session's
  scope (frontend/API-consumer concerns are for later).
- **Single Chroma collection, single course.** No multi-tenancy / multi-course
  namespacing yet.
- **Ingested test data** is only `class-subtitle/module 1/` (3 lessons, 57
  chunks). The other 16 modules in `class-subtitle/` are present on disk but
  not yet ingested.
- **`/sources/*` ingestion is synchronous** - a large PDF or long video's
  captions can take a while (one classification LLM call per chunk), and the
  request just blocks until it's done. Fine on Render; would need a job queue
  (explicitly out of scope for this project) to feel good at real scale.
- **YouTube ingestion is captions-only.** Videos without existing (auto or
  manual) captions can't be ingested - there's no audio transcription step,
  by design (no STT in scope). Also relies on an unofficial scraping library
  (`youtube-transcript`), which can break if YouTube changes its internal API.
- **PDF chunking is one-page-per-chunk**, with no sub-chunking for very long
  pages and no OCR for scanned/image-only PDFs (`pdf-parse` only extracts
  embedded text).
- **Clip finder assumes video content conceptually** - "clip" search over a
  PDF chunk still works mechanically (categorize + pick a page), but the
  framing ("clip-worthy moment") is a stretch for a document.
