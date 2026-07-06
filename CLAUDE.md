# CLAUDE.md

## Verify

pnpm typecheck && pnpm lint && pnpm test

## Prerequisites

- `packages/backend/.env.local` must exist with `CONVEX_DEPLOYMENT` set (run `npx convex dev` to generate it). Schema changes require this for codegen and typecheck to pass.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`alexpmichelet/monteazul`), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels are used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` at the root points to per-package `CONTEXT.md` files. See `docs/agents/domain.md`.
