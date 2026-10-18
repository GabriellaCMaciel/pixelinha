#!/usr/bin/env bash
# Starts the API and the front-end. Safe to run again: a server that is
# already running is left alone. Logs go to /tmp/pixelinha-*.log.
set -uo pipefail
cd "$(dirname "$0")/.."

running() {
  (echo > "/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}

if running 8000; then
  echo "API already running on port 8000"
else
  (cd backend && nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 \
    > /tmp/pixelinha-api.log 2>&1 &)
  echo "API starting on port 8000"
fi

if running 5173; then
  echo "Front-end already running on port 5173"
else
  (cd frontend && nohup npm run dev -- --host 0.0.0.0 --port 5173 --strictPort \
    > /tmp/pixelinha-web.log 2>&1 &)
  echo "Front-end starting on port 5173"
fi
