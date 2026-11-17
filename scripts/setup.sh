#!/usr/bin/env bash
# One-shot setup for a fresh clone. Safe to re-run.
#   npm run setup
# Installs exactly the locked dependencies, fetches Remotion's pinned headless
# Chrome (~100 MB, once, into node_modules/.remotion), then verifies with a render.
set -euo pipefail
cd "$(dirname "$0")/.."

need_major=22; need_minor=18
ver="$(node -p 'process.versions.node' 2>/dev/null || echo 0.0.0)"
major="${ver%%.*}"; rest="${ver#*.}"; minor="${rest%%.*}"
if [ "$major" -lt "$need_major" ] || { [ "$major" -eq "$need_major" ] && [ "$minor" -lt "$need_minor" ]; }; then
  echo "Node >= ${need_major}.${need_minor} required (found ${ver}). See .nvmrc." >&2
  exit 1
fi

echo "→ npm ci (locked dependencies)"
npm ci --no-fund --no-audit

echo "→ Remotion headless Chrome"
npx --no-install remotion browser ensure

echo "→ doctor"
node scripts/doctor.ts --render
