#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")"

PORT=8000
URL="http://localhost:${PORT}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is not installed or not on PATH."
  exit 1
fi

python3 -m http.server "$PORT" >/tmp/geo-figures-http-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

sleep 1
open "$URL" >/dev/null 2>&1 || true

echo "Serving Geo Figures at $URL"
echo "Press Control-C to stop the server."
wait "$SERVER_PID"
