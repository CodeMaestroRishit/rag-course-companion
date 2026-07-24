// Phase 8 acceptance test: start the real Express server as a child process,
// hit all three endpoints over HTTP, and confirm each responds with the
// expected shape. Shuts the server down when done either way.

import { spawn } from "node:child_process";

const PORT = 3999;
const BASE_URL = `http://localhost:${PORT}`;

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failures++;
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 400) return resolve(); // server is up and routing
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) return reject(new Error("server did not start in time"));
      setTimeout(attempt, 300);
    };
    attempt();
  });
}

async function main() {
  console.log("Starting server...");
  const server = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => process.stdout.write(`  [server] ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`  [server] ${d}`));

  try {
    await waitForServer(`${BASE_URL}/clips`, 10000);

    console.log("\n=== GET /clips ===");
    const clipsRes = await fetch(`${BASE_URL}/clips?limit=5`);
    const clips = await clipsRes.json();
    check("responds 200", clipsRes.status === 200);
    check("returns an array", Array.isArray(clips));
    check("respects limit=5", clips.length <= 5);

    console.log("\n=== GET /clips with category filter ===");
    const filteredRes = await fetch(`${BASE_URL}/clips?category=informative&limit=5`);
    const filtered = await filteredRes.json();
    check("all results match category filter", filtered.every((c) => c.category === "informative"));

    console.log("\n=== POST /query ===");
    const queryRes = await fetch(`${BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "What is Expo?" }),
    });
    const queryBody = await queryRes.json();
    check("responds 200", queryRes.status === 200);
    check("returns a response string", typeof queryBody.response === "string");
    check("returns a trace array", Array.isArray(queryBody.trace) && queryBody.trace.length > 0);

    console.log("\n=== POST /query with missing body ===");
    const badQueryRes = await fetch(`${BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    check("responds 400 for missing query", badQueryRes.status === 400);

    console.log("\n=== POST /clips/search ===");
    const searchRes = await fetch(`${BASE_URL}/clips/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Find a funny moment about interviews or diagrams." }),
    });
    const searchBody = await searchRes.json();
    check("responds 200", searchRes.status === 200);
    check("returns category/startTime/endTime/pitch",
      typeof searchBody.category === "string" &&
      typeof searchBody.startTime === "number" &&
      typeof searchBody.endTime === "number" &&
      typeof searchBody.pitch === "string"
    );

    console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  } finally {
    server.kill();
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
