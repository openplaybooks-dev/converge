---
description: Run rfc-shipping locally — branch, implement, test, and open a PR for one accepted RFC
---

You are running the `rfc-shipping` playbook to ship one RFC.

## What this playbook does

Picks one RFC with `status: accepted` (highest priority by default, or a specific one if the user passed an RFC number), creates an `rfc/NNNN-<slug>` branch, applies the Implementation steps from the RFC, runs the Test plan, flips the RFC to `status: implementing`, and opens a PR. Never auto-merges.

## How to run it

1. **Confirm cwd is the converge repo root** — `.converge/project.yaml` and `.converge/playbooks/rfc-shipping/` must exist. If not, stop and tell the user.

2. **Parse the argument.** The user passed: `$ARGUMENTS`

   - If empty: ship the highest-priority `accepted` RFC (the playbook picks).
   - If a number like `0024` or `24`: target that specific RFC. Confirm `docs/rfcs/<NNNN>-*.md` exists and has `status: accepted` before running. If not, stop and tell the user — don't fabricate.

3. **Source credentials.** The playbook routes through MiniMax via Anthropic-compat. Run:

   ```bash
   set -a; . .env; set +a
   ```

   If `.env` is missing, stop. Tell the user they need `MINIMAX_API_KEY` in `.env`. Also confirm `gh auth status` — `rfc-shipping` opens a real PR via `gh pr create`.

4. **Sanity check.** Before running, confirm:
   - the working tree is clean (`git status --short` is empty); shipping creates a branch and commits, conflicts with uncommitted work
   - you are on `main` (`git branch --show-current`); if not, ask before continuing

5. **Run the playbook in the background**:

   ```bash
   converge run --playbook=rfc-shipping --max-duration=2h
   ```

   If a specific RFC was requested, pass it: `--var rfc=<NNNN>`. Use the Bash tool with `run_in_background: true`. The runtime will notify you when it completes.

6. **While running**, the playbook writes progress under `.converge/journal/rfc-shipping/` and creates an `rfc/NNNN-<slug>` branch. Test runs land under `.converge/artifacts/rfc-shipping/epochs/NNN/test/`.

7. **On completion**:
   - **Success** — report the PR URL, the RFC's new status (`implementing`), and the test plan's verdict. Remind the user: the human approves outcome by merging the PR; `code-audit` will auto-post a review.
   - **Tests failed** — the RFC's status is flipped to `implementing-needs-human`. Report which test failed and where (`artifacts/rfc-shipping/epochs/NNN/test/test-result.json`). Do NOT amend the RFC or weaken the test plan. Hand off to `/converge-control` to retry or diagnose.
   - **No accepted RFC found** — say so plainly. Suggest `/converge-ideate` to draft a new one, or point the user at `docs/rfcs/` to flip a draft to accepted.
   - **Other failure** — hand off to `/converge-control`. Don't re-run blindly.

## What NOT to do

- Don't merge the PR. The supervisor merges.
- Don't edit the RFC's Implementation steps or Test plan to make tests pass. If the RFC is wrong, the human rejects the PR and the RFC goes back to `accepted` or `rejected` — that signal matters.
- Don't run shipping when the working tree is dirty. You'll lose work or poison the branch.
- Don't ship a `draft` RFC. Only `accepted` ones.
