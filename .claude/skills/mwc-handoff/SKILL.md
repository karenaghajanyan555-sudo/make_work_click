---
name: mwc-handoff
description: Checkpoint MAKE WORK CLICK work into docs/SESSION-HANDOFF.md so a fresh session can continue without losing unfinished work. Use when the context-watch notice says so, at the end of substantial work, or when the owner says "handoff", "wrap up", "save state", "new session".
---

# Handoff to a fresh session

1. **Reach a safe point.** Finish the current atomic step, or revert only your own half-done
   edit (never another session's files). If code changed: `npm run check` (tail). Start nothing new.
2. **Collect facts (one Bash call):** `git status --porcelain | wc -l; git diff --stat | tail -1`
   and the files this session edited. Only what you verified; no conversation copy.
3. **Rewrite `docs/SESSION-HANDOFF.md`** (replace sections, ≤ 60 lines):
   - `Updated:` today + one-phrase session label.
   - **In progress (unfinished)** — the task; done so far; what remains, in order; files edited
     and whether verified (tests/QA run or not); the exact command or edit to resume with; open
     questions. Write "none" when nothing is unfinished.
   - Objective and state, decisions binding the next steps (with D-numbers or owner quotes),
     pending/blockers, exact next action, relevant files, constraints: update what changed.
4. **Record:** decisions → `docs/DECISIONS.md`; a short log entry at the top of `docs/STATUS.md`
   § Log for substantial work. Then save the handoff last (the SessionStart hook flags a
   STATUS.md newer than the handoff).
5. **Tell the owner (≤ 4 lines):** what is saved, the unfinished item, the next action, and:
   start a fresh session and type `Continue MAKE WORK CLICK`. Then stop.
