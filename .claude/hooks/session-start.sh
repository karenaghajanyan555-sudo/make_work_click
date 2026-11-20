#!/usr/bin/env bash
# SessionStart hook (startup/resume/clear/compact): a 2–3 line orientation for Claude.
# Read-only, no network, ~60 tokens. Configured in .claude/settings.json.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" 2>/dev/null || exit 0
h=docs/SESSION-HANDOFF.md
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
head=$(git log -1 --format='%h %cs' 2>/dev/null)
echo "MAKE WORK CLICK: branch ${branch:-?} @ ${head:-?}, ${dirty} uncommitted paths (other sessions' work: don't revert)."
if [ -f "$h" ]; then
  updated=$(grep -m1 -o 'Updated: [0-9-]*' "$h" | cut -d' ' -f2)
  echo "Resume: skill mwc-continue reads $h (updated ${updated:-?}); load other docs only as the task needs."
  if [ docs/STATUS.md -nt "$h" ]; then
    echo "Note: docs/STATUS.md changed after the handoff; verify the handoff before acting on it."
  fi
fi
exit 0
