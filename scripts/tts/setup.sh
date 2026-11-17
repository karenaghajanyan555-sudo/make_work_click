#!/usr/bin/env bash
# Narration engine setup: Kokoro-82M, fully local. Idempotent — safe to re-run.
#   bash scripts/tts/setup.sh            install from the lock + fetch pinned model files
#   bash scripts/tts/setup.sh --relock   re-resolve the lock (versions ≥ 14 days old), then install
# Needs uv (https://docs.astral.sh/uv/). Windows: run under WSL or Git Bash.
set -euo pipefail
cd "$(dirname "$0")/../.."

PY_VERSION=3.12.16                 # docs/DECISIONS.md D13
LOCK=scripts/tts/requirements.txt
VENV_PY=.venv/bin/python

command -v uv >/dev/null || { echo "✗ uv not found — install: https://docs.astral.sh/uv/getting-started/installation/"; exit 1; }

if [[ "${1:-}" == "--relock" ]]; then
  CUTOFF=$(date -u -d '14 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-14d +%Y-%m-%d)
  echo "→ re-locking with --exclude-newer $CUTOFF"
  uv pip compile scripts/tts/requirements.in --universal --python-version 3.12 \
    --exclude-newer "$CUTOFF" --index-strategy unsafe-best-match \
    --generate-hashes --emit-index-url \
    --custom-compile-command "bash scripts/tts/setup.sh --relock" -o "$LOCK"
fi

echo "→ Python $PY_VERSION (uv-managed)"
uv python install "$PY_VERSION"
if [[ ! -x "$VENV_PY" ]] || [[ "$("$VENV_PY" -c 'import platform; print(platform.python_version())')" != "$PY_VERSION" ]]; then
  rm -rf .venv
  uv venv .venv --python "$PY_VERSION"
fi

echo "→ packages from $LOCK (hash-checked)"
uv pip sync "$LOCK" --python "$VENV_PY" --index-strategy unsafe-best-match --require-hashes

echo "→ model files (pinned revision, sha256-checked)"
node scripts/tts/fetch-model.ts

echo "→ self-test"
"$VENV_PY" -I scripts/tts/narrate.py --selftest
echo "✓ narration engine ready"
