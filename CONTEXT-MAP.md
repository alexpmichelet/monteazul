# Context Map

This monorepo has multiple bounded contexts. Each context owns its domain language in a per-package `CONTEXT.md`.

| Context         | Location                            | Scope                                  |
| --------------- | ----------------------------------- | -------------------------------------- |
| `backend`       | `packages/backend/CONTEXT.md`       | Convex backend — core product logic    |
| `transactional` | `packages/transactional/CONTEXT.md` | Transactional email templates and flow |

Support packages (no own context — they follow the vocabulary of the context using them):

- `packages/shared` — shared types and utilities
- `packages/test-utils` — testing helpers

Per-context `CONTEXT.md` files and `docs/adr/` directories are created lazily by `/grill-with-docs` as terms and decisions crystallise — absence is normal, not an error. System-wide decisions go in `docs/adr/` at the repo root.
