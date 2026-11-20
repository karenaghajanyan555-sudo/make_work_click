# Commands

Every npm command with its arguments (moved from CLAUDE.md, 2026-11-18). `package.json` is the
source of truth for what exists; this file explains the arguments.

```bash
npm run setup                         # fresh clone: install, fetch Chrome, verify
npm run setup:voice                   # narration engine (Kokoro, uv + Python 3.12; optional)
npm run doctor [-- --render]          # environment check
npm run check                         # typecheck + unit tests
npm run studio                        # Remotion Studio (interactive preview)
npm run new-video -- <id> "Title"     # storyboard + creative record + placeholder spec (no default story)
npm run voice -- <id>                 # take (approved or cached draft) → timing lock
npm run make -- <id> [--force]        # voice → render → mix → deliver → QA, skipping what is unchanged
npm run build -- <id>                 # = make --no-qa
npm run render -- <id>                # picture master from cached scene segments
npm run render -- <id> --stills 0,60  # stills (add --debug for safe-zone overlay)
npm run mix -- <id>                   # final audio → public/generated/<id>/mix.wav + out/<id>/mix/
npm run deliver -- <id>               # master + mix → upload file
npm run qa -- <id> [--no-render]      # QA gate (builds first unless --no-render) → out/<id>/qa/
npm run diversity -- <id> [--stage render]  # creative diversity vs the last five (D46) → out/<id>/qa/diversity.md; --all for every record
npm run publish-pack -- <id>          # cover + post sheet → out/<id>/publish/ (posts nothing)
npm run verify-affiliate -- <id>      # affiliate videos, before publish-pack: claims, facts, link tests → verification.json
npm run voices -- <id>                # narrator audition → out/<id>/voices/
npm run approve-take -- <id> <label>  # freeze an audition take (or `draft`) → public/narration/<id>/take-NN/
npm run profile -- <label> -- <cmd>   # wall time + peak memory of any command (Linux)
npm run control [-- --port 4318]      # Production Control Center (dashboard + runner)
npm run produce -- idea add|list|discover|set …   # idea registry
npm run produce -- start <ideaId> [--run] [--review-script] [--fail-once <stage>]
npm run produce -- run [<jobId>] | status [<jobId>] | resume|retry|rerun|cancel <jobId>
npm run produce -- stage <jobId> <stage> [--force]  # one stage, upstream outputs kept
npm run produce -- approve|revise|reject <jobId> [--notes N] [--script]
npm run produce -- edit-line <jobId> <lineId> --text T [--caption C] [--pause S]
npm run produce -- batch <ideaId>… [--run] | publish <jobId> … | metrics <pubId> … | insights
npm run db -- backup [file] | list | check | restore <file>   # production database (restore: stop the Control Center first)
npm run test:e2e [-- --keep]          # full pipeline in a throwaway repo copy (~10 min, one real render)
```
