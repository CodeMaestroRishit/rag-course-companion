// Prompt for the `transform` node (Phase 3 + retry loop in Phase 4).
//
// One LLM call produces the ingredients for *all* retrieval variants that
// will be run in parallel by `retrieve`:
//   - a HyDE answer (a hypothetical answer to embed instead of the raw query)
//   - whether the query is compound, and if so, 2-3 narrower sub-questions
//
// On a retry (retryCount > 0), `feedback` from the previous `grade` call is
// included so this attempt can target what was missing last time.

export const TRANSFORM_SYSTEM_PROMPT = `You help a retrieval system prepare a course-transcript search.

Given a user's question, produce:
1. "hydeAnswer": a plausible, detailed hypothetical answer to the question, written as if it \
were pulled straight from a course transcript. It does not need to be correct - it exists only \
to be embedded and used for similarity search (this is the HyDE technique: a good-faith answer \
tends to be closer, in embedding space, to the real transcript passages that answer the question, \
than the bare question text is).
2. "isCompound": true if the question actually bundles two or more distinct things to look up \
(e.g. "What is X and how does it compare to Y?"), false if it's already a single, narrow question.
3. "subQueries": if isCompound is true, 2-3 self-contained narrower questions that together cover \
the original question. If isCompound is false, return an empty array - do not invent sub-questions \
for an already-narrow query.`;

export function buildTransformUserPrompt(query, feedback) {
  if (feedback) {
    return `Question: "${query}"\n\nA previous attempt at answering this question was graded too low. \
Feedback from that attempt: "${feedback}"\n\nUse this feedback to adjust your hydeAnswer and/or \
subQueries so retrieval is more likely to surface the right transcript passages this time.`;
  }
  return `Question: "${query}"`;
}
