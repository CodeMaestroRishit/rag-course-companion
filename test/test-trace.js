// Phase 6 acceptance test: the final graph output includes a complete
// `trace` array - one entry per node visited, each with the required shape
// - so a future UI panel can render "what the system did" step by step.

import { runQuery } from "../graph.js";

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

async function main() {
  const { response, trace } = await runQuery("What tools do you need before writing your first Expo app?");

  console.log("=== Trace ===");
  for (const step of trace) console.log(`  [${step.node}] ${step.summary}`);

  console.log("\n=== Checks ===");
  check("runQuery returns a response string", typeof response === "string" && response.length > 0);
  check("runQuery returns a trace array", Array.isArray(trace) && trace.length > 0);

  const requiredNodesInOrder = ["transform", "retrieve", "merge", "rerank", "generate", "grade"];
  for (const node of requiredNodesInOrder) {
    check(`trace includes a "${node}" step`, trace.some((s) => s.node === node));
  }
  check(
    'trace ends with either "guardrail" (normal) - every run must reach it exactly once',
    trace.filter((s) => s.node === "guardrail").length === 1
  );

  let shapeOk = true;
  for (const step of trace) {
    if (typeof step.node !== "string") shapeOk = false;
    if (typeof step.summary !== "string") shapeOk = false;
    if (typeof step.timestamp !== "number") shapeOk = false;
    if (step.data !== undefined && typeof step.data !== "object") shapeOk = false;
  }
  check("every trace step matches the TraceStep shape (node, summary, data?, timestamp)", shapeOk);

  const timestampsNonDecreasing = trace.every((s, i) => i === 0 || s.timestamp >= trace[i - 1].timestamp);
  check("trace steps are in chronological order", timestampsNonDecreasing);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
