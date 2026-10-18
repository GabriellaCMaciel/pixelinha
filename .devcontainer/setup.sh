#!/usr/bin/env bash
# Runs once when the Codespace is created: installs both projects.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Installing the API (Python)"
python -m venv backend/.venv
backend/.venv/bin/pip install --quiet --upgrade pip
backend/.venv/bin/pip install --quiet -r backend/requirements-dev.txt

echo "==> Installing the front-end (Node)"
(cd frontend && npm ci --no-audit --no-fund)

echo "==> Done"
