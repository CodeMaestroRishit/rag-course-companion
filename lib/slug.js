/** A short, stable-ish id fragment derived from human text, plus a timestamp for uniqueness. */
export function slugify(text) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "source"}-${Date.now()}`;
}
