# Commit Conventions

All commits follow Conventional Commits format:

```
<type>(scope): <short description> [MMC-N]

[optional body explaining WHY, not what]
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`.

Rules:

- Every subject ends with the Linear ticket ID in brackets.
- Subject stays under 72 characters.
- Body explains reasoning, not restatement of the diff.
- No vague messages — never `WIP`, `fix`, `update`, or similar on their own.

Example:

```
feat(auth): add magic link login flow [MMC-12]
```
