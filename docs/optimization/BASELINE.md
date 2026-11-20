# Context baseline (2026-11-18, before the optimization)

Claude Code 2.1.325, model Opus 5.5, config dir `~/.claude-mwc`. **Measured** = read from the API
usage of a real run or from session transcripts. **Estimate** = characters ÷ 4.

## Method
- Startup context: `claude -p "Reply with one line only: OK" --output-format json --max-turns 1`
  in the repo; startup = `input + cache_creation + cache_read` tokens of that single call.
- Components: the run's transcript (`~/.claude-mwc/projects/-home-karen-make-work-click/<id>.jsonl`)
  records each injected block (`attachment` entries) with its text, so sizes are exact characters.
- Past sessions: a read-only script over the 13 project transcripts (first-call context, peak
  context, sum of per-call context, tool output volume, repeated reads, images). Script:
  session scratchpad `analyze.mjs` (not kept in the repo).
- `/context` and `/cost` are interactive commands the agent cannot run; the transcript numbers are
  the same API usage figures.

## Startup context (measured)
| Run | Tokens | Notes |
|---|---|---|
| Baseline, headless | **42,508** / 42,510 (2 runs) | claude.ai connectors had not connected yet (deferred tools 528 chars, no MCP instructions) |
| Earlier headless runs (other sessions, 2026-11-18 14:46) | 41,554 · 46,140 | same prompt; conditions unknown |
| Interactive sessions, first call (VS Code) | 41,922 – 53,113 | includes the user's first prompt and IDE context |

Components of the baseline run (characters, measured):
| Block | Chars | ≈ tokens (estimate) |
|---|---|---|
| Instructions (global CLAUDE.md 2,285 + project CLAUDE.md 19,787 + MEMORY.md 1,820 + wrapper) | 24,431 | 6,100 |
| Skill listing | 8,275 | 2,070 |
| Agent listing | 2,879 | 720 |
| Deferred tool names (built-in only; connectors not yet loaded) | 528 | 130 |
| Claude Code system prompt + tool schemas | rest | ~33,000 (not controllable) |

## Usage during sessions (measured, 13 transcripts 2026-11-16 → 18)
- Peak context per call in working sessions: **299k – 659k tokens**. The sum of per-call context
  ("processed") per session: 20.9 M – 286 M tokens. Context growth, not startup, dominates.
- Session-start reads of the whole `docs/STATUS.md` (one call each): 6,189 · 7,055 · 8,883 tokens
  (+ 3,976 for lines 1–200). `STATUS.md` is now 48,579 chars; its § Next step alone is 7,069.
- Whole-doc dumps: BRAND.md 6.5k, STORY+QA 5.6k, ARCHITECTURE.md 4.5k (twice in one session),
  `docs/affiliate/systeme-io.md` 4.9k, `src/orchestrator/dashboard/app.js` 9.0k (twice).
- Repeated reads of the same file in one session (extra reads): 42, 16, 13, 5, 3, 2, 1. Images
  opened per session: 100, 34, 32, 17, 9, 7; the same PNG opened up to 6 times.
- Tool output volume per session is mostly Bash: 264k tokens (27.7 h session), 48k – 91k (others).
- `npm run check` output: 7 – 280 tokens per run (already concise; no change needed).

## Environment audit
- Project `.claude/`: one skill (`mwc-video`); no settings, hooks or agents. No `.mcp.json`; no
  user MCP servers. claude.ai connectors (Gmail, Calendar, Drive, Booking.com, Crypto.com, GoDaddy,
  Economic Index, SlidesGPT, Mermaid, Claude Docs + 9 needing auth) load into every session.
- No plugins installed. User settings: effort `xhigh` for Opus 5.5.
- Dependencies: 6 runtime + 3 dev, exact pins (unchanged by this work).
- Render/mix cache keys (`RENDER_INPUTS`, `MIX_INPUTS` in `src/pipeline/cache.ts`) contain no docs,
  `.claude/` or CLAUDE.md: instruction changes cannot invalidate a render.
