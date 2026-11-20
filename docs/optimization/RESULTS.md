# Context optimization — results (2026-11-18)

Baseline and method: `BASELINE.md`. **Measured** = API usage of a real run or transcript data.
**Estimate** = characters ÷ 4. **Judgement** = recommendation.

## Round 2 (2026-11-19, owner-approved): connectors off, TypeScript LSP, long-session handoff
Owner decisions: connectors off (project), LSP install (project); ast-grep deferred; Concise style,
Obsidian, Context7 not installed.

| Item | Verification | Result |
|---|---|---|
| `disableClaudeAiConnectors: true` in `.claude/settings.json` | Key + description present in the installed 2.1.325 build (`~/.local/share/claude/versions/2.1.325`, 30 occurrences); docs: any-source-true wins, a project can opt out | Connectors gone at startup (MCP instructions 0, deferred tools 540 chars). **Rollback:** delete that one line (a `false` elsewhere cannot override a `true`) |
| TypeScript LSP | Plugin `typescript-lsp@claude-plugins-official` 1.0.0 (Anthropic, Apache-2.0; runs `typescript-language-server --stdio`); server 6.0.3 (Apache-2.0, no runtime deps, node ≥ 22.22.2; we have 22.23.4; released 2026-11-02, ≥ 2 weeks), uses the workspace TypeScript 5.9.3 | Installed: `npm install -g typescript-language-server@6.0.3` (nvm prefix, on PATH) + `claude plugin install typescript-lsp@claude-plugins-official --scope project` (adds `enabledPlugins` to `.claude/settings.json`). **Works** (headless test): diagnostic after an edit (`TS2322` on a probe file in `out/`, removed after), definition (`treeHash` → `src/pipeline/cache.ts:33`), references (`RENDER_INPUTS`: 7 in 4 files incl. tests that `grep src scripts` missed), hover (full `planSegments` signature). The `LSP` tool is deferred: ≈ 0 startup cost. **Rollback:** `claude plugin uninstall typescript-lsp@claude-plugins-official --scope project`; `npm uninstall -g typescript-language-server` |
| Long-session handoff | Hook contract from code.claude.com/docs/en/hooks.md: input has `transcript_path`, no token counts; `additionalContext` for UserPromptSubmit/PostToolUse; PreCompact stdout = compaction instructions; subagent calls carry `agent_id` | `.claude/hooks/context-watch.mjs` on UserPromptSubmit + PostToolUse + PreCompact; skill `mwc-handoff`. Silent below 200k; one notice at 200k (soft) and 350k (hard) per session, re-armed after the context drops; env `MWC_CONTEXT_SOFT/HARD` override. Pipe tests 9/9 (hard, soft, repeat silent, small silent, subagent silent, PreCompact text, missing transcript, malformed input, re-arm); 37 ms on a 68 MB transcript. **Fired live in this VS Code session at 377k** (hard). A 1-tool headless run did not fire (cause not determined: transcript lag on the first call or headless hook behaviour) |

Startup, final settings (2 runs, measured): **38,290 · 38,293 tokens** vs the original **42,508**
(−4,216, −9.9 %). The original headless baseline ran before the connectors connected. With them
connected (measured +4,551 tokens), the original interactive startup was ≈ 47,060 (two measurements
added): ≈ −8,770 (−18.6 %) for a normal session. `npm run check` re-run 2026-11-19: typecheck + 160/160 tests pass. No render, voice or mix run;
cache inputs untouched (`out/lsp-probe/` was outside them and is deleted).

### Long-session workflow
1. Work normally; VS Code's prompt-box context indicator shows usage to you (native).
2. At 200k the hook tells Claude (and shows you one line): no new large subtask; hand off at the
   next natural break. At 350k: finish the current atomic step, run `mwc-handoff`, stop.
3. `mwc-handoff` writes **In progress (unfinished)** + next action into `docs/SESSION-HANDOFF.md`
   (verified facts, files edited, how to resume), adds the STATUS log entry, tells you to start
   fresh.
4. New session: `Continue MAKE WORK CLICK` → `mwc-continue` reads the handoff, resumes the
   unfinished item first.
5. If auto-compaction comes first, the PreCompact hook tells the summary what must survive, and the
   SessionStart(compact) hook re-points to the handoff.
Thresholds are judgement (startup ≈ 38k; past sessions peaked at 300k–660k per call); tune with the
env vars after a few sessions.

## Changes (repo-local, reversible; nothing installed, no commit)
| Change | Files |
|---|---|
| CLAUDE.md compacted: every hard rule kept as a line; procedures moved to their owners | `CLAUDE.md` (19,787 → 9,650 bytes, 275 → 128 lines) |
| Engine workflow steps → the video skill (loaded on demand) | `.claude/skills/mwc-video/SKILL.md` § Engine steps |
| Orchestrator rules → the orchestrator doc | `docs/ORCHESTRATOR.md` § Rules for changing the orchestrator |
| Full command reference → its own doc | `docs/COMMANDS.md` |
| Session handoff (≤ 60 lines, verified, replaced not appended) | `docs/SESSION-HANDOFF.md` |
| Resume procedure: git check → handoff → verify against the repo → load only what's needed | `.claude/skills/mwc-continue/SKILL.md` |
| SessionStart hook (startup/resume/clear/compact): 2–3 lines, ~70 tokens, 74 ms | `.claude/hooks/session-start.sh`, `.claude/settings.json` |
| Six built-in skills irrelevant here listed by name only (still invocable) | `.claude/settings.json` `skillOverrides`: dataviz, claude-api, plugin-authoring, keybindings-help, fewer-permission-prompts, init |
| Research subagent with a short evidence-labelled return format | `.claude/agents/mwc-researcher.md` |
| Context-efficiency + report-format rules | `CLAUDE.md` § Context efficiency, § Reports |
| Stale pointer fixed | `scripts/new-video.ts` comment (no code change) |

Revert: delete `.claude/settings.json`, `.claude/hooks/`, `.claude/agents/`, `.claude/skills/mwc-continue/`,
`docs/SESSION-HANDOFF.md`, `docs/COMMANDS.md`, `docs/optimization/`; the old CLAUDE.md text is in
`git show HEAD:CLAUDE.md` plus the uncommitted D46 edits (now inside the compact version).

## Measurements
| What | Before | After | Δ |
|---|---|---|---|
| Fresh-session startup, same conditions (no connector tools), 2 runs each — **measured** | 42,508 · 42,510 | 38,161 · 38,163 | **−4,347 tokens (−10.2 %)** |
| Instructions block (global + project CLAUDE.md + memory) — measured chars | 24,431 | 14,191 | −42 % (≈ −2,560 tokens, estimate) |
| Skill listing — measured chars | 8,275 | 5,236 | −37 % (≈ −760 tokens, estimate), incl. the new `mwc-continue` |
| Agent listing / hook output — measured chars | 2,879 / 0 | 3,329 / 748 | +1,198 chars (≈ +300 tokens) |
| claude.ai connectors when connected — **measured** (same config, on vs off) | — | +4,551 tokens per session | removable (approval item 1) |
| Resume reading: old start read `STATUS.md` whole — measured in 3 sessions | 6,189 · 7,055 · 8,883 tokens | handoff 2,833 chars + skill 1,695 chars + STATUS by range | ≈ −5,000 to −7,000 tokens per resume (estimate) |

## Tests
| Test | Result |
|---|---|
| Fresh-session recovery: `claude -p "Continue MAKE WORK CLICK"` (plan mode, read-only tools, connectors off) | **Pass.** Invoked `mwc-continue` first; 6 API calls, 31 s, context 41.2k → 49.3k; read the handoff, STATUS.md by range only; found the 4 files newer than the handoff and judged them unrelated; stated the right next action and asked the one owner question (v010 look-test approval). Cost $0.49. |
| Handoff accuracy | Pass: matched `docs/STATUS.md` § Next step (checked by the test run and by me). Fix applied: the skill now says the STATUS log is newest-on-top (the test run first used `tail`). |
| Skill discovery | Pass: `mwc-continue` appeared in the live skill list immediately and was chosen from the phrase alone. |
| Isolated research | Pass: one subagent used 180k tokens / 72 tool calls / 585 s in its own context; the main session received a ~6k-character report. |
| Targeted code navigation | Current method (`grep -n`, ranged reads) used throughout; LSP not installed (approval item 2). |
| Production tests | `npm run check`: typecheck + **160/160** tests pass. |
| Cache integrity | Render/mix cache keys (`RENDER_INPUTS`, `MIX_INPUTS`) exclude docs, `.claude/`, CLAUDE.md; only a comment in `scripts/new-video.ts` changed (not a cache input). No render, voice or mix run. |
| Dependency stability | `package.json` / lockfile untouched by this work; no installs. |

Not measured: `/context` inside the VS Code extension (interactive only); per-session savings over a
full working session (needs a few real sessions; compare the `lastTotal*` fields in
`~/.claude-mwc/.claude.json` or rerun `BASELINE.md`'s transcript method).

## Ranked tools (all need your approval)
| # | Tool | Verdict | Benefit | Command |
|---|---|---|---|---|
| 1 | Turn off claude.ai connectors in this project | **Recommend** | −4,551 tokens every session (measured); 0 connector calls in all 13 sessions (measured) | add `"disableClaudeAiConnectors": true` to `.claude/settings.json` (keep one, e.g. Claude Docs: use `deniedMcpServers` per server instead) |
| 2 | TypeScript LSP plugin (Anthropic, official marketplace) | **Recommend** | Type errors after each edit without running tsc; symbol lookup (definition/references) instead of grep + reading files. Overhead: one tool + diagnostic lines (size unverified) | `npm install -g typescript-language-server@6.0.3` then `claude plugin install typescript-lsp@claude-plugins-official --scope project` (in VS Code: the plugin UI). 6.0.3 = newest ≥ 2 weeks old (2026-11-02) |
| 3 | ast-grep CLI | Optional, later | Structural search/codemods via Bash, zero context cost; marginal next to the LSP at this repo size | `npm install --save-dev --save-exact @ast-grep/cli@0.51.1` (2026-11-02; run `npx ast-grep`, never `sg` on Linux) + a dependency-ledger line |
| 4 | Built-in "Concise" output style | Optional | Mostly duplicates your global CLAUDE.md style rules | `"outputStyle": "Concise"` in `.claude/settings.json` |
| 5 | Obsidian app (humans only) | Optional | Browse `docs/` as a vault; Claude never uses it; the repo stays the source | open `docs/` as a vault; add `.obsidian/` to `.gitignore` |
| 6 | Context7 MCP | Skip by default | Has Remotion 4.0.539 docs, but WebFetch of remotion.dev + `node_modules` types + Remotion's own skills cover it; queries go to a third party | `claude mcp add --scope project --transport http context7 https://mcp.context7.com/mcp` |

## Rejected (and why)
- **Ponytail** (junkit1688): 0 stars, 2 commits, no licence, created 2026-10-21; runs unsandboxed as a
  mod; duplicates CLAUDE.md rules and the native status line; blocking repeat reads can stop
  legitimate ones.
- **Caveman** (JuliusBrussee/caveman, Apache-2.0): its own test shows ~3 % fewer output tokens than
  "answer concisely" for ~1,160 input tokens of rules; 4 hooks; the CLI adds a proxy with telemetry on
  by default; `/caveman-compress` rewrites CLAUDE.md (conflicts with the repo as source of truth).
- **Serena** (GPL-3.0): needs uv + Python 3.13; duplicates the LSP plugin; adds its own memory
  system; suggests replacing the system prompt; had 3 RCE-class advisories (patched by 2.0.0).
- **Obsidian Local REST API / MCP**: Claude already reads the files directly; needs Obsidian running
  + an API key; 3 high advisories in 2026.
- `@path` imports in CLAUDE.md (imported files load in full: no saving); Stop hooks for handoff
  reminders (they force an extra model turn on every stop).

Sources (checked 2026-11-18 by the research subagent; LSP page re-checked by the main session):
code.claude.com/docs/en/{mcp, hooks, memory, skills, sub-agents, output-styles, commands, headless,
costs, plugins/code-intelligence}.md · github.com/{junkit1688/ponytail, JuliusBrussee/caveman,
oraios/serena, ast-grep/ast-grep, coddingtonbear/obsidian-local-rest-api} · npm registry dates.

## Habits that save the most (judgement, from the baseline data)
Context growth dominates usage (peaks 300k–660k per call): start a fresh session per task with
"Continue MAKE WORK CLICK" instead of one long session; keep heavy research in a subagent; open each
rendered frame once per change.
