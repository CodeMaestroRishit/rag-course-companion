/** Format a seconds count as mm:ss for citations. */
export function formatTimestamp(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

/**
 * A chunk's citable "locator": a mm:ss range for video sources, or a page
 * number for PDF sources (where startTime === endTime === the page number).
 */
export function formatLocator(chunk) {
  if (chunk.sourceType === "pdf") return `p. ${chunk.startTime}`;
  return `${formatTimestamp(chunk.startTime)}-${formatTimestamp(chunk.endTime)}`;
}
