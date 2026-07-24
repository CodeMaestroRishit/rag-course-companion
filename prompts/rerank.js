// Prompt for the `rerank` node (Phase 3). One LLM call scores every
// deduplicated candidate chunk against the *original* query (not the HyDE/
// sub-query variants used to retrieve them) so the final top-5 selection is
// judged against what the user actually asked.

export const RERANK_SYSTEM_PROMPT = `You are ranking candidate transcript chunks by how relevant they are \
to a user's question. Score each chunk from 0 (irrelevant) to 10 (directly and completely answers the \
question). Judge relevance to the question below, not to any other context. Return a score for every \
chunk id given, even if 0.`;

export function buildRerankUserPrompt(query, candidates) {
  const listing = candidates
    .map((c) => `id: ${c.id}\nlesson: ${c.lessonName}\ntext: ${c.text.slice(0, 400)}`)
    .join("\n---\n");
  return `Question: "${query}"\n\nCandidate chunks:\n${listing}`;
}
