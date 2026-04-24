# Git Protocol

**Applies to:** All Cowork sessions working on the Hermes repo.

**Read this file before:** session startup git checks, any commit, merge, push, or branch operation.

---

## Commits

Follow Conventional Commits. Commit subject must end with the Linear ticket reference: `[MMC-N]`.

Full spec: `/docs/COMMITS.md`.

---

## Concurrent session detection (run at startup)

Multiple Cowork sessions may be active simultaneously. Git's index lock is single-writer — two sessions running Git commands against the same working tree at the same time will collide.

At session startup, after `git status`, check for an active lock:

```bash
ls .git/index.lock 2>/dev/null && echo "LOCK PRESENT" || echo "clear"
```

**If the lock is absent → proceed normally.** Work on `main` or whatever branch is checked out.

**If the lock is present → spin up a worktree** before doing anything else (see below). Do not delete the lock file — another session owns it.

---

## Spinning up a worktree

Name the branch after the session's primary ticket or task. Use the format `session/{ticket-or-slug}`.

```bash
# from the repo root
git worktree add ../hermes-session-{slug} -b session/{ticket-or-slug}

# then work from the new directory
cd ../hermes-session-{slug}
```

Examples:
- `git worktree add ../hermes-session-mmc42 -b session/mmc-42`
- `git worktree add ../hermes-session-research -b session/research`

All subsequent Git operations in this session happen inside `../hermes-session-{slug}`. The original working tree retains its lock and its session is unaffected.

---

## Session cleanup (worktree path only)

At the end of a session that used a worktree, before closing:

1. **Commit all work** in the worktree branch (following `/docs/COMMITS.md`).
2. **Switch back to the main working tree:**
   ```bash
   cd ../hermes
   ```
3. **Merge or squash the worktree branch into the current branch:**
   ```bash
   # squash merge (preferred — keeps history clean)
   git merge --squash session/{ticket-or-slug}
   git commit -m "feat: <summary of session work> [MMC-N]"

   # or a regular merge if the commit history is worth keeping
   git merge session/{ticket-or-slug}
   ```
4. **Remove the worktree and branch:**
   ```bash
   git worktree remove ../hermes-session-{slug}
   git branch -d session/{ticket-or-slug}
   ```

If the other session is still running when this session ends, skip steps 2–4. Leave a Notion note or Linear comment describing what's in the worktree branch so the next session can pick it up and merge it.

---

## Pushing, creating PRs, and merging

**The sandbox shell does not have GitHub credentials.** `git push` and `gh` commands will fail with "could not read Username" if run directly in bash.

**Always use `osascript` to run git/gh operations that require authentication.** The Mac shell sources `~/.zshenv`, which exports `GITHUB_TOKEN`, and `gh auth setup-git` is wired as the git credential helper — so push/PR/merge all work there.

### Push a branch

```applescript
do shell script "source ~/.zshenv && cd ~/Documents/projects/hermes && git push origin <branch-name> 2>&1"
```

### Create a PR

Write the PR body to a temp file first (avoids quoting hell), then pass it with `--body-file`:

```applescript
-- Step 1: write body
do shell script "cat > /tmp/pr-body.md << 'EOF'\n## Summary\n...\nEOF\necho done"

-- Step 2: create PR
do shell script "source ~/.zshenv && cd ~/Documents/projects/hermes && gh pr create --base main --head <branch> --title '<title>' --body-file /tmp/pr-body.md 2>&1"
```

### Merge a PR

```applescript
do shell script "source ~/.zshenv && cd ~/Documents/projects/hermes && gh pr merge <number> --squash --delete-branch 2>&1"
```

### Check auth / debug

```applescript
do shell script "source ~/.zshenv && echo TOKEN_LEN=${#GITHUB_TOKEN} && gh auth status 2>&1"
```

If `TOKEN_LEN` is 0, the token isn't loading. Check `~/.zshenv` exists and contains `export GITHUB_TOKEN=...`.

### ⚠️ GIT_INDEX_FILE + osascript mismatch — known footgun

The sandbox workaround for stale locks uses `GIT_INDEX_FILE=/tmp/hermes-index` to bypass `.git/index`. This writes objects to the repo but does **not** update the real `.git/index` on disk. If you then run a subsequent `git add` / `git commit` via `osascript` (which uses the real index), git will diff against the previous HEAD and generate a commit that **deletes** everything the sandbox staged.

**Rule:** once you use `GIT_INDEX_FILE` in the sandbox for a commit, do all follow-on commits for that branch via `osascript` using `git reset --mixed <good-sha>` first to re-sync the real index, then `git add` + `git commit` normally.

---

## Stale lock recovery

If the lock file is present but no other session is actually running (e.g., a previous session crashed), it is safe to delete it:

```bash
# confirm no git process is running first
ps aux | grep git

# if the list is empty (only the grep itself), delete the lock
rm .git/index.lock
```

Do not delete the lock without confirming. If a session is legitimately holding it, deletion will corrupt its index operation.

---

## Summary

| Situation | Action |
|---|---|
| No lock at startup | Work normally on the current branch |
| Lock present at startup | Spin up a worktree (`git worktree add`) |
| End of session with worktree | Squash-merge into main tree, remove worktree and branch |
| Lock present but no live session | Confirm with `ps aux`, then `rm .git/index.lock` |
| Push / create PR / merge | Use `osascript` → `do shell script "source ~/.zshenv && ..."` |
