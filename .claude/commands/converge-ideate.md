---
description: Run rfc-ideation locally — survey sources, draft one RFC under docs/rfcs/
---

You are running the `rfc-ideation` playbook to draft one RFC.

## What this playbook does

Surveys four sources (open GitHub issues, `docs/ideas/*.md`, `backlog.jsonl`, code-discovered findings), picks one candidate via weighted round-robin, drafts a full RFC under `docs/rfcs/NNNN-<slug>.md` with `status: draft`, and verifies every `file:line` citation against HEAD.

## How to run it

1. **Confirm cwd is the converge repo root** — `.converge/project.yaml` and `.converge/playbooks/rfc-ideation/` must exist. If not, stop and tell the user.

2. **Source credentials.** The playbook routes through MiniMax via Anthropic-compat. The repo's `.env` is gitignored — ask the user to confirm it exists before running, or that they've already sourced it. Run:

   ```bash
   set -a; . .env; set +a
   ```

   If `.env` is missing, stop. Tell the user they need `MINIMAX_API_KEY` (or another Anthropic-compat key) in `.env`.

3. **Run the playbook in the background** so you can monitor:

   ```bash
   converge run --playbook=rfc-ideation --max-duration=15m
   ```

   Use the Bash tool with `run_in_background: true`. The runtime will notify you when it completes.

4. **While running**, the playbook will write progress under `.converge/journal/rfc-ideation/` and (on success) a new file under `docs/rfcs/NNNN-*.md`.

5. **On completion**:
   - **Success** — report the new RFC path, the candidate source it picked (from `.converge/artifacts/rfc-ideation/epochs/NNN/pick/`), and a one-sentence summary of the draft. Suggest the user read it and flip `status: draft → accepted` to greenlight implementation.
   - **No-op** — if no candidate surfaced (empty backlog, all sources drained), say so plainly. Don't retry.
   - **Failure** — hand off to `/converge-control` to diagnose. Do NOT re-run blindly. If the failure is `HTTP 401` / `Invalid API key`, the cause is conflicting `ANTHROPIC_*` env vars from a previous setup — re-source `.env` cleanly.

## Useful arguments

The user passed: `$ARGUMENTS`

If non-empty, pass them through to the converge command. Examples a user might supply: `--select=draft` to re-run only the draft stage, `--max-duration=30m` for a longer run.

## What NOT to do

- Don't edit the playbook prompts (`.converge/playbooks/rfc-ideation/tasks/*/TASK.md`) to make the run pass. If a check fails, the run is the source of truth.
- Don't auto-flip the new RFC's `status:` — that's the supervisor's decision.
- Don't fabricate a draft yourself if the playbook fails. The whole point is that the agent runs the playbook.
