/**
 * A short, stable id derived from human text - deterministic on purpose, so
 * re-uploading a source with the same name updates its existing chunks
 * (matching ingest.js's manifest behavior) instead of creating a duplicate.
 * Give sources with the same name distinct names if they're meant to coexist.
 */
export function slugify(text) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "source";
}
