// PDF source ingestion. PDFs have no timestamps, so each page becomes one
// chunk and the page number is stored in place of startTime/endTime
// (startTime === endTime === page number). `sourceType: "pdf"` on the chunk
// tells graph.js/guardrail to cite "p. N" instead of a mm:ss timestamp.

import { PDFParse } from "pdf-parse";
import { ingestChunks } from "./ingest.js";

/** Turn pdf-parse's per-page text into the common { startTime, endTime, text } chunk shape. */
export function chunkPdfPages(pages) {
  return pages
    .map((page) => ({
      startTime: page.num,
      endTime: page.num,
      text: page.text.replace(/\s+/g, " ").trim(),
    }))
    .filter((chunk) => chunk.text.length > 0);
}

/** Ingest a PDF from an in-memory buffer (e.g. a multer upload). */
export async function ingestPdfBuffer({ buffer, lessonName, docId, collection }) {
  const parser = new PDFParse({ data: buffer });
  let pages;
  try {
    ({ pages } = await parser.getText());
  } finally {
    await parser.destroy();
  }

  const chunks = chunkPdfPages(pages);
  const chunksIngested = await ingestChunks({ chunks, lessonName, sourceId: docId, sourceType: "pdf", collection });
  return { chunksIngested, sourceId: docId, pageCount: pages.length };
}
