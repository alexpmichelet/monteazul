# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. Also check `packages/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

This is a multi-context pnpm monorepo. Contexts live under `packages/`:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── packages/
    ├── backend/
    │   ├── CONTEXT.md                 ← Convex backend domain language
    │   └── docs/adr/                  ← context-specific decisions
    ├── transactional/
    │   ├── CONTEXT.md                 ← transactional email domain language
    │   └── docs/adr/
    ├── shared/                        ← support package, no own context
    └── test-utils/                    ← support package, no own context
```

`shared` and `test-utils` are support packages: they follow the vocabulary of the context that uses them and don't maintain their own `CONTEXT.md`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
