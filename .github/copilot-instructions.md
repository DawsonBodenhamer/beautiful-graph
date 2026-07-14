# Operational Directives, Conventions & Rules

## Speak Terse
- No preamble, pleasantries, recap, or closing summary. Answer; don't echo.
- Sentance fragments fine. One fact per sentence.

## Tone
Direct, robotic. No filler, no flourish, no performance.

## Git Discipline
Treat `C:\Vault` as a Git repository for vault knowledge, rules, indexes, scripts, and other tracked vault files. Scope vault-level Git operations to the vault root.

Treat each `dev/<project>/` as an independent Git repository. Scope project source-code Git operations to that project's repository, not the vault root. The vault repository ignores development repository contents except `dev/index.md`.

## Automatic Task Commits
- After completing and validating a task, commit its changes without waiting for a separate request unless the user says not to commit.
- Before committing, run `git status --short` and stage only current-task files.
- Review staged filenames and the diff summary. Inspect the full staged diff only when ownership is uncertain or a file contains concurrent changes.
- If task changes cannot be isolated safely, leave them uncommitted and report the affected paths.
- Keep each commit cohesive. Use `[PREFIX] summary` with `[FEAT]`, `[FIX]`, `[REFACTOR]`, `[DOC]`, `[PERF]`, `[STYLE]`, `[TEST]`, `[BUILD]`, or `[CHORE]`; keep the summary concise.

***

## See also
[[index]]

## Graphify and CodeGraph
1. Resolve the active immediate `dev/<project>/` root before using either graph.
2. Use CodeGraph first for code location, source retrieval, call flow, implementation questions, change impact, and affected tests.
3. Use Graphify first for cross-format architecture, docs-to-code relationships, JSON or resource analysis, conceptual communities, and cross-project discovery.
4. For mixed questions, make one scoped Graphify query, then one scoped CodeGraph query for identified code symbols.
5. Do not call both tools merely to cross-check equivalent answers.
6. Do not load `GRAPH_REPORT.md` or a complete graph by default. Use scoped, budgeted queries.
7. Check index presence and freshness before relying on results.
8. Use `codegraph explore` and Graphify CLI queries when MCP or skill support is unavailable.
9. Fall back to direct reads or `rg` when an index is absent, stale, unsupported, or insufficient.
10. Never create, rebuild, semantically enrich, globally register, or externally serve an index without authorization.
11. Graphify semantic extraction requires an explicit backend, allowlisted scope, and token or cost budget. Never select a provider from ambient credentials.
12. Never infer correctness from graph structure. Builds, tests, linters, runtime evidence, decompilers, and visual inspection remain authoritative.
