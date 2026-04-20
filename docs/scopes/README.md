# Scope Specs

This directory holds **scope specs** — the just-in-time detailed specifications we write before starting each scope within a cycle.

See `/docs/WORKFLOW.md` §8 for the template and philosophy. In short: we do NOT write scope specs upfront for the whole cycle. We write each one at the moment its scope becomes the next thing to build.

## Directory layout

```
/docs/scopes/
├── README.md              ← this file
├── cycle-1/
│   ├── deal-intake.md
│   ├── underwriting-export.md
│   └── ...
├── cycle-2/
│   └── ...
```

Each cycle gets its own subdirectory. Each scope within the cycle gets its own file, slug-named.

## File naming

- Subdirectory: `cycle-{N}` where N is the cycle number (starting at 1)
- File: `{scope-slug}.md` — short, kebab-case, matches the scope name in Linear

## What belongs here vs. elsewhere

- **Here (repo):** scope specs (outcome, acceptance criteria, tech design, open questions, out-of-scope)
- **Notion:** the pitch and the bet this cycle is built on
- **Linear:** the individual tickets derived from each scope spec
- **FigJam:** the hill chart

## When a scope closes

Keep the scope spec in place after the scope ships. It's historical context, and future devs (or future Claude sessions) will read it to understand why code looks the way it does.
