# Beautiful Graph Project Rules

## Repository
- The active repository is `C:\Vault\dev\beautiful_graph`; run source Git operations there, not at the vault root.
- The normal installed plugin directory is `C:\Vault\.obsidian\plugins\beautiful-graph`.

## Test Deployment
- After automated validation passes, deploy changes intended for user testing to the normal vault before requesting visual acceptance. Do not ask the user to verify source-only or build-only changes in Obsidian.
- Normal iterative test deployment is authorized by approval of the Beautiful Graph implementation task; it does not require a separate deployment prompt unless the user explicitly says not to deploy.
- Deploy the complete Community-compatible three-file artifact set together: `main.js`, `manifest.json`, and `styles.css`. The generated worker and Wasm payloads are embedded in `main.js`; never require separate installed `graph-worker.js` or `graph-sim.wasm` files.
- Verify every installed artifact against the development build by SHA-256 after copying. Report any mismatch as a blocker and do not request visual acceptance.
- Tell the user to reload the Beautiful Graph plugin or restart Obsidian after deployment.
- Test deployment does not authorize a Git commit, push, tag, release, publication, or marketplace submission; those remain separately gated.

## Commit Preparation and Approval
- After completing and validating a task, prepare a cohesive commit but do not create it automatically.
- Before proposing a commit, run `git status --short` and stage only current-task files when they can be isolated safely.
- Review the staged filenames and diff summary. Inspect the full staged diff when ownership is uncertain or a file contains concurrent changes.
- After presenting staged changes for review, rerun `git status --short` immediately before committing. If a previously staged task file now has unstaged edits, treat them as user review changes, inspect them, and include them when the user approves committing the reviewed work. Do not include newly modified or untracked paths that were not part of the reviewed task scope; treat them as unrelated concurrent work unless explicitly authorized.
- If task changes cannot be isolated safely, leave them unstaged and report the affected paths.
- Present the staged scope and exact proposed commit message. Run `git commit` only after the user explicitly approves that current staged diff and message; plan or implementation approval is not commit approval.
- Keep each commit cohesive. Use `[PREFIX] summary` with `[FEAT]`, `[FIX]`, `[REFACTOR]`, `[DOC]`, `[PERF]`, `[STYLE]`, `[TEST]`, `[BUILD]`, or `[CHORE]`; keep the summary concise.
- Treat push, backport, release, and publication as separate approvals. The agent performs approved Git actions; it does not prompt the user to type Git commands.
