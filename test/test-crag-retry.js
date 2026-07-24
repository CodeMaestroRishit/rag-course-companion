// Phase 4 acceptance test: the CRAG grade/retry decision logic.
//
// This exercises `routeAfterGrade` and `retryNode` directly with synthetic
// state instead of relying on the real LLM to happen to produce a low score
// (unreliable to assert on). The actual wiring of these into a conditional
// self-loop was already proven generically against this LangGraph version
// (addConditionalEdges + addEdge back to an earlier node) before graph.js
// was written; this test proves the retry *decision* logic itself is right.

import { routeAfterGrade, retryNode, GRADE_PASS_THRESHOLD, MAX_RETRIES } from "../graph.js";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

console.log("=== Routing decisions ===");
check(
  `score below ${GRADE_PASS_THRESHOLD} with retries left -> "retry"`,
  routeAfterGrade({ score: GRADE_PASS_THRESHOLD - 1, retryCount: 0 }) === "retry"
);
check(
  `score at/above ${GRADE_PASS_THRESHOLD} -> "guardrail" (even with retries left)`,
  routeAfterGrade({ score: GRADE_PASS_THRESHOLD, retryCount: 0 }) === "guardrail"
);
check(
  `score below threshold but retryCount === MAX_RETRIES (${MAX_RETRIES}) -> "guardrail" (retries exhausted)`,
  routeAfterGrade({ score: 0, retryCount: MAX_RETRIES }) === "guardrail"
);
check(
  `score below threshold, retryCount === MAX_RETRIES - 1 -> still "retry" (last allowed attempt)`,
  routeAfterGrade({ score: 0, retryCount: MAX_RETRIES - 1 }) === "retry"
);

console.log("\n=== retryNode state update ===");
const state = { score: 3, feedback: "no chunk discusses X", retryCount: 1 };
const update = retryNode(state);
check("increments retryCount", update.retryCount === 2);
check("appends exactly one trace step", update.trace.length === 1);
check("trace step names the retry node", update.trace[0].node === "retry");
check("trace step mentions the retry count", update.trace[0].summary.includes("2/" + MAX_RETRIES));

console.log("\n=== Simulated full retry sequence (scoreHistory across attempts) ===");
// Simulate what the graph does across 3 low-scoring attempts followed by a
// pass, checking scoreHistory (which uses an append reducer in the real
// graph) accumulates one entry per grade call and retryCount caps at MAX_RETRIES.
let retryCount = 0;
const scoreHistory = [];
const scriptedScores = [2, 4, 5, 8]; // three failures, then a pass
for (const score of scriptedScores) {
  scoreHistory.push(score); // what the `grade` node's append-reducer would do
  const decision = routeAfterGrade({ score, retryCount });
  if (decision === "retry") {
    retryCount = retryNode({ score, feedback: "adjust", retryCount }).retryCount;
  } else {
    break;
  }
}
check("scoreHistory records every attempt", JSON.stringify(scoreHistory) === JSON.stringify(scriptedScores));
check(`retryCount stopped growing once a passing score was hit (retryCount=${retryCount})`, retryCount === 3);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
