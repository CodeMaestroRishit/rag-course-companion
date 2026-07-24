// Phase 2 + 3 acceptance test: ask a real question end-to-end through the
// full graph (transform -> retrieve -> merge -> rerank -> generate -> grade
// -> guardrail) and confirm:
//   - the response cites a real lesson name
//   - the response cites a mm:ss timestamp
//   - that timestamp actually falls within (or spans adjacent) chunks that
//     were really retrieved for this query
//   - transform produced more than one retrieval variant (HyDE at minimum)
//   - merge deduplicated candidates down from the raw per-variant count

import { runQuery, buildGraph, RECURSION_LIMIT } from "../graph.js";
import { getCollection } from "../config.js";
import { formatTimestamp } from "../lib/time.js";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

const QUESTION = "What is the difference between React Native and Expo, and what companies use React Native?";

async function main() {
  console.log(`Question: "${QUESTION}"\n`);
  const graph = buildGraph({ mode: "answer" });
  const result = await graph.invoke({ query: QUESTION, mode: "answer" }, { recursionLimit: RECURSION_LIMIT });

  console.log("=== Response ===");
  console.log(result.response);

  console.log("\n=== Trace ===");
  for (const step of result.trace) console.log(`  [${step.node}] ${step.summary}`);

  console.log("\n=== Checks ===");
  const transformStep = result.trace.find((s) => s.node === "transform");
  check("transform produced more than 1 retrieval variant (HyDE/sub-query in play)", transformStep.data.variants.length > 1);

  const retrieveStep = result.trace.find((s) => s.node === "retrieve");
  const mergeStep = result.trace.find((s) => s.node === "merge");
  const rawCount = retrieveStep.summary.match(/Retrieved (\d+)/)[1] * 1;
  check("merge deduplicated down from the raw candidate count", mergeStep.data.uniqueCount <= rawCount);

  const rankedIds = result.trace.find((s) => s.node === "rerank").data.kept.map((k) => k.id);
  check("rerank kept at most 5 chunks", rankedIds.length <= 5 && rankedIds.length > 0);

  // Pull the actual ranked chunks back from Chroma and check the response's
  // citations are real: a mentioned lesson name whose real timestamp range
  // covers (or closely brackets) whatever timestamp got cited.
  const collection = await getCollection();
  const rankedChunks = (await collection.get({ ids: rankedIds, include: ["metadatas"] })).metadatas;

  const timestampMatches = [...result.response.matchAll(/(\d{1,2}):(\d{2})/g)];
  check("response contains at least one mm:ss timestamp", timestampMatches.length > 0);

  const lessonNames = [...new Set(rankedChunks.map((c) => c.lessonName))];
  const citesRealLesson = lessonNames.some((name) => result.response.includes(name));
  check(`response cites a real lesson name (one of: ${lessonNames.join(", ")})`, citesRealLesson);

  let allTimestampsPlausible = timestampMatches.length > 0;
  for (const m of timestampMatches) {
    const seconds = Number(m[1]) * 60 + Number(m[2]);
    const withinAnyRankedChunk = rankedChunks.some((c) => seconds >= c.startTime - 1 && seconds <= c.endTime + 1);
    if (!withinAnyRankedChunk) allTimestampsPlausible = false;
  }
  check("every cited timestamp falls within a chunk that was actually retrieved", allTimestampsPlausible);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
