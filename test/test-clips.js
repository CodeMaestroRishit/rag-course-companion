// Phase 7 acceptance test: browseClips (pure metadata filter, no LLM call)
// and searchClips (full graph in clip mode).

import { browseClips, searchClips } from "../clips.js";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

const VALID_CATEGORIES = ["funny", "insightful", "controversial", "emotional", "informative", "none"];

async function main() {
  console.log("=== browseClips: no filter ===");
  const all = await browseClips({ limit: 100 });
  check("returns results", all.length > 0);
  const sortedDesc = all.every((c, i) => i === 0 || c.categoryConfidence <= all[i - 1].categoryConfidence);
  check("sorted by categoryConfidence descending", sortedDesc);

  console.log("\n=== browseClips: category filter ===");
  const informative = await browseClips({ category: "informative", limit: 100 });
  check("all results match the requested category", informative.every((c) => c.category === "informative"));
  check("category filter narrows results vs no filter", informative.length <= all.length);

  console.log("\n=== browseClips: minConfidence filter ===");
  const highConfidence = await browseClips({ minConfidence: 7, limit: 100 });
  check("all results meet the minConfidence threshold", highConfidence.every((c) => c.categoryConfidence >= 7));

  console.log("\n=== browseClips: limit ===");
  const limited = await browseClips({ limit: 3 });
  check("respects limit", limited.length <= 3);

  console.log("\n=== searchClips: full graph in clip mode ===");
  const clip = await searchClips({ query: "Find a moment that gives a memorable analogy comparing two things." });
  console.log(JSON.stringify(clip, null, 2));

  check("category is a valid category", VALID_CATEGORIES.includes(clip.category));
  check("startTime < endTime", clip.startTime < clip.endTime);
  check("pitch is a non-empty one-liner", typeof clip.pitch === "string" && clip.pitch.length > 0);
  check("lessonName was resolved from a real ranked chunk", typeof clip.lessonName === "string" && clip.lessonName.length > 0);
  check("trace was included", Array.isArray(clip.trace) && clip.trace.some((s) => s.node === "guardrail"));

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
