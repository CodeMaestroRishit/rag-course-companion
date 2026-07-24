// Prompt for the `grade` node (Phase 4 / CRAG). Scores the generated
// response's groundedness and relevance, and - when the score is low -
// explains concretely what to fix, so the retry's `transform` step has
// something actionable to work with.

export const GRADE_SYSTEM_PROMPT = `You grade whether a generated response is well-grounded in the \
given source chunks and actually answers the question. Score from 0 (ungrounded, off-topic, or a \
fabricated claim) to 10 (fully grounded in the chunks, directly answers the question, cites sources). \
If the score is below 6, give one concrete sentence of feedback describing exactly what's wrong \
(e.g. "no chunk actually discusses X", "the response has no citation", "the chunks are about a \
different topic than the question") so the retrieval strategy can be adjusted on retry.`;

export function buildGradeUserPrompt(query, response, rankedDocs) {
  const sourcesBlock = rankedDocs.map((d) => `- (${d.lessonName}) ${d.text.slice(0, 200)}`).join("\n");
  return `Question: "${query}"\n\nGenerated response:\n"${response}"\n\nSource chunks it should be grounded in:\n${sourcesBlock}`;
}
