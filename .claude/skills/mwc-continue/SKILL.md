---
name: mwc-continue
description: Resume MAKE WORK CLICK work in a fresh session from docs/SESSION-HANDOFF.md — check git, verify the handoff against the repo, load only the docs the next action needs. Use for "Continue MAKE WORK CLICK", "continue", "resume", "where were we", "what's next".
---

# Continue MAKE WORK CLICK

1. **Orient (one Bash call, nothing else):**
   ```bash
   git status -sb | head -1; git status --porcelain | wc -l; git log -1 --format='%h %cs %s'
   find docs content src scripts lab tests -type f -newer docs/SESSION-HANDOFF.md 2>/dev/null | head -20
   ```
2. **Read `docs/SESSION-HANDOFF.md`** (whole; it is short). Do not read `docs/STATUS.md` yet.
   **In progress (unfinished)** comes first: check its files in `git status`, then resume it
   before anything else.
3. **Verify before trusting it:**
   - Files listed by `find -newer` → work happened after the handoff. Read `docs/STATUS.md`
     § Next step only (`grep -n "^## \|^### " docs/STATUS.md | head -12`, then that range) and the
     newest log entry (the log is newest-on-top: the first `###` under `## Log`); reconcile. If the handoff is wrong, fix it now (replace the stale lines).
   - The paths named in "Exact next action" exist (`ls`). A claim you cannot verify stays labelled
     unverified; never fill gaps from memory.
4. **Load only what the next action needs:** the CLAUDE.md doc map row(s) for that area; skill
   `mwc-video` for planning or producing a video. Large docs: `grep -n "^## "` first, read the range.
5. **Report in ≤ 6 lines:** state · exact next action · what needs the owner. If the next action
   waits on the owner, ask that one question and stop. Otherwise start it.
6. **Before ending substantial work:** update the handoff (replace sections, keep ≤ 60 lines,
   verified facts only, no conversation copy) and add a short `docs/STATUS.md` log entry.
