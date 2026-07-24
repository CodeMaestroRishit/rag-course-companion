// Phase 1: Ingestion pipeline.
//
// Usage: node ingest.js [manifestPath]
// manifestPath defaults to data/lessons/manifest.json
//
// For each lesson listed in the manifest, this:
//   1. Parses the subtitle file into cues (subsrt-ts, auto-detects .srt/.vtt)
//   2. Merges consecutive cues into ~30-60s chunks on natural sentence breaks
//   3. Classifies each chunk with one LLM call (category/confidence/reason)
//   4. Embeds each chunk's text
//   5. Upserts everything into Chroma using a stable id, so re-running
//      ingestion on the same file updates rather than duplicates rows.

import fs from "node:fs/promises";
import path from "node:path";
import subsrt from "subsrt-ts";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  getOpenAI,
  getCollection,
  EMBEDDING_MODEL,
  CHAT_MODEL,
  CHUNK_MIN_SECONDS,
  CHUNK_MAX_SECONDS,
} from "./config.js";
import { CLASSIFY_SYSTEM_PROMPT, buildClassifyUserPrompt } from "./prompts/classify.js";

const CategorySchema = z.object({
  category: z.enum(["funny", "insightful", "controversial", "emotional", "informative", "none"]),
  categoryConfidence: z.number().min(0).max(10),
  categoryReason: z.string(),
});

// A cue ending in one of these (optionally followed by a quote/bracket) reads
// as a complete sentence, which is our preferred chunk-boundary signal.
const SENTENCE_END_RE = /[.!?]["')\]]?$/;

/** Parse a subtitle file into cleaned-up caption cues (seconds, non-empty text). */
export function parseSubtitleFile(fileContent) {
  const captions = subsrt.parse(fileContent);
  return captions
    .filter((c) => c.type === "caption" && c.text && c.text.trim().length > 0)
    .map((c) => ({
      startMs: c.start,
      endMs: c.end,
      text: c.text.trim().replace(/\s+/g, " "),
    }));
}

/**
 * Merge consecutive cues into chunks of roughly CHUNK_MIN-MAX seconds.
 * We only consider closing a chunk once it has reached the minimum length,
 * and prefer to close it on a sentence-ending cue; if it runs past the
 * maximum length before hitting one, we force a break anyway so a rambling,
 * punctuation-free stretch of transcript doesn't grow unbounded.
 */
export function mergeCuesIntoChunks(cues) {
  const chunks = [];
  let current = null;

  for (const cue of cues) {
    if (!current) {
      current = { startMs: cue.startMs, endMs: cue.endMs, texts: [cue.text] };
    } else {
      current.endMs = cue.endMs;
      current.texts.push(cue.text);
    }

    const durationSeconds = (current.endMs - current.startMs) / 1000;
    const atSentenceEnd = SENTENCE_END_RE.test(cue.text);

    if (
      (durationSeconds >= CHUNK_MIN_SECONDS && atSentenceEnd) ||
      durationSeconds >= CHUNK_MAX_SECONDS
    ) {
      chunks.push(finalizeChunk(current));
      current = null;
    }
  }
  if (current) chunks.push(finalizeChunk(current));
  return chunks;
}

function finalizeChunk(current) {
  return {
    startTime: current.startMs / 1000,
    endTime: current.endMs / 1000,
    text: current.texts.join(" ").replace(/\s+/g, " ").trim(),
  };
}

async function classifyChunk(text) {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.parse({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
      { role: "user", content: buildClassifyUserPrompt(text) },
    ],
    response_format: zodResponseFormat(CategorySchema, "chunk_category"),
  });
  return completion.choices[0].message.parsed;
}

async function embedTexts(texts) {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Shared core: classify + embed + upsert a list of already-chunked passages.
 * Every ingestion path (CLI manifest, VTT/SRT upload, PDF, YouTube) funnels
 * through this once it has produced `chunks` in the common
 * `{ startTime, endTime, text }` shape.
 *
 * `sourceId` is the stable id prefix (still stored under the `videoId` field
 * for schema continuity - it just means "which source produced this chunk"
 * regardless of source type). `sourceType` distinguishes how startTime/endTime
 * should be read: "video" -> seconds, "pdf" -> a page number (startTime ===
 * endTime for a page-sized chunk).
 */
export async function ingestChunks({ chunks, lessonName, sourceId, sourceType, collection }) {
  if (chunks.length === 0) return 0;

  // Classify sequentially to keep this simple and stay well under rate
  // limits; ingestion is a one-off batch job, not a latency-sensitive path.
  const classifications = [];
  for (const chunk of chunks) {
    classifications.push(await classifyChunk(chunk.text));
  }

  const embeddings = await embedTexts(chunks.map((c) => c.text));

  const ids = chunks.map((_, i) => `${sourceId}-${i}`);
  const metadatas = chunks.map((chunk, i) => ({
    id: ids[i],
    lessonName,
    videoId: sourceId,
    sourceType,
    startTime: chunk.startTime,
    endTime: chunk.endTime,
    category: classifications[i].category,
    categoryConfidence: classifications[i].categoryConfidence,
    categoryReason: classifications[i].categoryReason,
    text: chunk.text,
  }));

  await collection.upsert({
    ids,
    embeddings,
    metadatas,
    documents: chunks.map((c) => c.text),
  });

  return chunks.length;
}

/** Ingest a single lesson file (CLI/manifest path). Returns chunks upserted. */
export async function ingestFile({ filePath, lessonName, videoId }, collection) {
  const content = await fs.readFile(filePath, "utf-8");
  const cues = parseSubtitleFile(content);
  const chunks = mergeCuesIntoChunks(cues);

  if (chunks.length === 0) {
    console.warn(`  no chunks produced for ${filePath}, skipping`);
    return 0;
  }

  return ingestChunks({ chunks, lessonName, sourceId: videoId, sourceType: "video", collection });
}

async function loadManifest(manifestPath) {
  const raw = await fs.readFile(manifestPath, "utf-8");
  const entries = JSON.parse(raw);
  const baseDir = path.dirname(manifestPath);
  return entries.map((entry) => ({
    ...entry,
    filePath: path.resolve(baseDir, entry.filePath),
  }));
}

async function main() {
  const manifestPath = path.resolve(process.argv[2] || "data/lessons/manifest.json");
  console.log(`Loading manifest: ${manifestPath}`);
  const entries = await loadManifest(manifestPath);

  const collection = await getCollection();

  let total = 0;
  for (const entry of entries) {
    console.log(`Ingesting "${entry.lessonName}" (${entry.videoId}) from ${entry.filePath}`);
    const count = await ingestFile(entry, collection);
    console.log(`  upserted ${count} chunks`);
    total += count;
  }
  console.log(`Done. ${total} chunks upserted across ${entries.length} file(s).`);
}

// Only run when invoked directly (`node ingest.js`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
