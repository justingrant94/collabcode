# Git cheat sheet

## One-time setup (only when starting a brand-new project)

```sh
cd /path/to/your/project        # the actual project folder, not its parent
git init                        # creates .git/ here
echo ".DS_Store"      >> .gitignore
echo "node_modules"   >> .gitignore
echo ".env"           >> .gitignore
git add .
git commit -m "initial commit"
git branch -M main              # ensures branch is called 'main'
```

**Then on GitHub:** https://github.com/new → name the repo → **don't** tick README/.gitignore/license → Create.

**Wire it up + first push** (use the HTTPS URL — works without SSH keys):

```sh
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main         # -u sets upstream so future pushes need no args
```

If asked for a password, paste a **Personal Access Token** (https://github.com/settings/tokens → classic → `repo` scope). macOS Keychain remembers it.

---

## Day-to-day loop

```sh
git status                      # what's changed / staged
git add .                       # stage everything (or `git add path/to/file`)
git commit -m "short message"   # snapshot it locally
git push                        # send to GitHub
```

Pull anything that was pushed from elsewhere:
```sh
git pull
```

---

## Branching (when working on a feature without touching `main`)

```sh
git switch -c feature/output-stale       # create + move to a new branch
# ...edit, add, commit...
git push -u origin feature/output-stale  # first push of this branch
# open a PR on GitHub, merge it, then:
git switch main
git pull
git branch -d feature/output-stale       # delete the local branch
```

---

## "Help, what did I do" inspection

```sh
git log --oneline -20           # last 20 commits, one line each
git log --oneline --graph --all # visual branch graph
git diff                        # unstaged changes
git diff --staged               # staged-but-uncommitted changes
git show <commit-sha>           # what that commit changed
git blame path/to/file          # who/what last touched each line
```

---

## Undoing things (in increasing destructiveness)

| Goal | Command | Notes |
|---|---|---|
| Unstage a file (keep edits) | `git restore --staged file` | Reverses `git add` only |
| Discard edits to a file | `git restore file` | **Loses uncommitted changes** |
| Edit the last commit message | `git commit --amend` | Don't do this after pushing if others have pulled |
| Add forgotten files to last commit | `git add forgotten && git commit --amend --no-edit` | Same warning |
| Undo last commit, keep changes staged | `git reset --soft HEAD~1` | Safe — nothing lost |
| Undo last commit, keep changes unstaged | `git reset HEAD~1` | Safe |
| **Undo last commit, throw work away** | `git reset --hard HEAD~1` | **Destructive — confirm first** |
| Revert a pushed commit | `git revert <sha>` | Safe — makes a new "undo" commit |

---

## Fixing common errors (the ones you actually hit)

| Error | Fix |
|---|---|
| `fatal: not a git repository` | You're in a folder with no `.git/`. Either `cd` to the right one or `git init` here. |
| `fatal: No configured push destination` | `git remote add origin <url>` then `git push -u origin main`. |
| `fatal: The current branch main has no upstream branch` | `git push -u origin main` (only needed once per branch). |
| `Permission denied (publickey)` | You used the SSH URL but have no SSH key on GitHub. Switch to HTTPS: `git remote set-url origin https://github.com/<you>/<repo>.git`. |
| `Updates were rejected because the remote contains work that you do not have` | Someone pushed before you. `git pull --rebase` then `git push`. |
| Need to change the remote URL | `git remote set-url origin <new-url>` |
| Forgot to ignore a file you already committed | Add it to `.gitignore`, then `git rm --cached path/to/file && git commit -m "stop tracking <file>"`. |

---

## URL flavours — when to use which

- **HTTPS** (`https://github.com/...`) → easiest, uses browser/token + macOS Keychain. Recommended unless you specifically set up SSH keys.
- **SSH** (`git@github.com:...`) → no password prompts ever, but requires uploading a public key to https://github.com/settings/keys first. Generate one with:
  ```sh
  ssh-keygen -t ed25519 -C "you@example.com"
  pbcopy < ~/.ssh/id_ed25519.pub        # then paste at github.com/settings/keys
  ```

---

## Golden rules

1. **One repo = one project.** Don't `git init` at `~/project` if you have ten unrelated apps under it. `init` inside each one.
2. **Always `git status` before `git add .`** — make sure you're not accidentally staging `node_modules`, `.env`, or unrelated work.
3. **Never use `--force` / `reset --hard` on a branch others share** unless you know exactly who needs to be told.
4. **Commit messages: imperative mood, present tense.** *"add stale-output indicator"*, not *"added"* or *"adding"*.
5. **Pull before you push** if anyone else might have pushed (`git pull --rebase` keeps history linear).
