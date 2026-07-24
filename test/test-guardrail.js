// Phase 5 acceptance test: the guardrail's citation/sensitive-content checks,
// exercised directly (no LLM calls, deterministic) against synthetic state
// covering both the "answer" and "clip" modes, and both the pass and fail
// side of each check.

import { checkGuardrail } from "../graph.js";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

const rankedDocs = [
  { id: "m1-02-x", lessonName: "React Native vs Expo", startTime: 60, endTime: 90, text: "..." },
];

console.log("=== answer mode ===");
check(
  "well-cited answer passes",
  checkGuardrail({
    mode: "answer",
    response: "Expo sits on top of React Native (React Native vs Expo, 1:05).",
    rankedDocs,
  }).ok === true
);
check(
  "answer missing a timestamp fails",
  checkGuardrail({ mode: "answer", response: "Expo sits on top of React Native.", rankedDocs }).ok === false
);
check(
  "answer missing a lesson-name mention fails",
  checkGuardrail({ mode: "answer", response: "Expo sits on top of React Native (1:05).", rankedDocs }).ok === false
);
check(
  "answer echoing an API-key-looking token fails even with a citation",
  checkGuardrail({
    mode: "answer",
    response: "Use key sk-abcdefghijklmnopqrstuvwx (React Native vs Expo, 1:05).",
    rankedDocs,
  }).ok === false
);

console.log("\n=== answer mode: PDF page citations ===");
const pdfDocs = [{ id: "doc-1", lessonName: "Employee Handbook", startTime: 4, endTime: 4, sourceType: "pdf", text: "..." }];
check(
  "page-cited answer passes",
  checkGuardrail({
    mode: "answer",
    response: "Remote work requires manager approval (Employee Handbook, p. 4).",
    rankedDocs: pdfDocs,
  }).ok === true
);
check(
  "page-cited answer without 'p.' prefix still fails (no recognizable locator)",
  checkGuardrail({ mode: "answer", response: "Remote work requires manager approval (Employee Handbook, 4).", rankedDocs: pdfDocs })
    .ok === false
);

console.log("\n=== clip mode ===");
const goodClip = JSON.stringify({ category: "insightful", startTime: 65, endTime: 80, pitch: "Nice analogy." });
check(
  "clip result within a ranked chunk's range passes",
  checkGuardrail({ mode: "clip", response: goodClip, rankedDocs }).ok === true
);
const badJsonClip = "{ not valid json";
check("clip result that isn't valid JSON fails", checkGuardrail({ mode: "clip", response: badJsonClip, rankedDocs }).ok === false);
const wrongShapeClip = JSON.stringify({ category: "insightful", pitch: "missing times" });
check(
  "clip result missing required fields fails",
  checkGuardrail({ mode: "clip", response: wrongShapeClip, rankedDocs }).ok === false
);
const hallucinatedTimeClip = JSON.stringify({ category: "insightful", startTime: 900, endTime: 920, pitch: "..." });
check(
  "clip result with timestamps outside every ranked chunk fails",
  checkGuardrail({ mode: "clip", response: hallucinatedTimeClip, rankedDocs }).ok === false
);

console.log("\n=== clip mode: PDF page tolerance (exact, no +-5 slack) ===");
const exactPageClip = JSON.stringify({ category: "insightful", startTime: 4, endTime: 4, pitch: "..." });
check(
  "clip exactly matching a PDF chunk's page passes",
  checkGuardrail({ mode: "clip", response: exactPageClip, rankedDocs: pdfDocs }).ok === true
);
const nearbyPageClip = JSON.stringify({ category: "insightful", startTime: 5, endTime: 5, pitch: "..." });
check(
  "clip on a nearby-but-wrong page fails (no seconds-style +-5 slack for PDFs)",
  checkGuardrail({ mode: "clip", response: nearbyPageClip, rankedDocs: pdfDocs }).ok === false
);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
