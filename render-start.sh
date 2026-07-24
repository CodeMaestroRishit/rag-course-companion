#!/usr/bin/env bash
# Render start command: runs Chroma as an internal-only background process
# (bound to 127.0.0.1, never exposed to the public internet - Render only
# forwards inbound traffic to the one port the web service declares, which
# is server.js's), waits for it to come up, then starts the API server.
set -e

CHROMA_DATA_PATH="${CHROMA_DATA_PATH:-/data/chroma}"
mkdir -p "$CHROMA_DATA_PATH"

npx chromadb run --path "$CHROMA_DATA_PATH" --host 127.0.0.1 --port 8000 &

echo "Waiting for Chroma to come up..."
until curl -sf http://127.0.0.1:8000/api/v2/heartbeat > /dev/null 2>&1; do
  sleep 1
done
echo "Chroma is up."

node server.js
