# Environment & Configuration

Pre-flight checks the AI babysitter runs **before** `converge run` starts executing tasks. Problems here cause the first task to fail immediately — before any real work happens.

## E.1 Foreign playbook hijacks `converge run`

**Symptom:** Run completes the intended playbook, then starts running tasks from a different playbook. The other playbook fails because it expects setup that hasn't happened.

**Root cause:** `.converge/playbooks/` contains more than one playbook. A bare `converge run` may pick a different one than intended.

**Fix:**

```bash
# Always scope with --playbook=<name>
converge run --playbook=default
converge list --playbook=default
```

If the other playbook is genuinely unwanted, remove it (after confirming with the user):

```bash
rm -rf .converge/playbooks/<unwanted>
```

**Verification:** `converge run` only starts nodes from the intended playbook.

---

## E.2 Secondary playbook fails after main one finishes

**Symptom:** The primary playbook completes, then a secondary playbook starts and fails immediately on setup issues.

**Root cause:** Same as E.1 — multiple playbooks present, auto-discovery picks the wrong one.

**Fix:** Same as E.1 — use the explicit playbook path on every command.

**Verification:** Primary playbook completes cleanly. No secondary playbook nodes appear.

---

## E.3 HTTP 401 / Invalid API key on the first task

**Symptom:**

```
NODE_FAIL <first-task-id>
  Invalid API key
  HTTP 401
```

The very first task fails with an auth error. The spawned agent CLI (`claude`, `codex`) never reaches the model — it dies on the auth handshake. After three retries the run halts on a repeat-failure detector.

**Root cause:** The spawned agent CLI inherits the shell's `ANTHROPIC_*` / `OPENAI_*` / `CLAUDE_*` env vars. When those vars are set from a previous setup (a proxy, an old MiniMax / DeepSeek session, a nested Claude Code host, or stale credentials), they **override** the `env:` block declared in `.converge/project.yaml` for the chosen provider. The agent authenticates against the wrong endpoint with the wrong credential and gets a clean 401.

The playbook is fine. The execution environment is misconfigured.

**Fix:**

1. **Inspect the loose env vars:**
   ```bash
   env | grep -E 'ANTHROPIC_|OPENAI_|CLAUDE_CODE_'
   ```

2. **Inspect what the project.yaml expects:**
   ```bash
   grep -A20 '^ai:' .converge/project.yaml
   ```

3. **Reconcile.** Three correct paths, pick one and make the shell match:

   - **Claude OAuth path** — keep `claude login` credentials at `~/.claude/.credentials.json`; **unset** all `ANTHROPIC_*` shell vars so they don't override:
     ```bash
     unset ANTHROPIC_BASE_URL ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
     ```

   - **Direct Anthropic API key** — export `ANTHROPIC_API_KEY=sk-ant-…`; unset the proxy-only vars:
     ```bash
     export ANTHROPIC_API_KEY=sk-ant-...
     unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
     ```

   - **Proxy routing (MiniMax / DeepSeek / OpenRouter)** — the canonical fix is to re-scaffold so the routing lives in `project.yaml`:
     ```bash
     converge init --force --backend=claude --provider=minimax   # or =deepseek
     export MINIMAX_API_KEY=...   # or DEEPSEEK_API_KEY, per provider
     unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
     ```

4. **Re-run the playbook:**
   ```bash
   converge run --playbook=<name> --resume
   ```

**Verification:** The first task should complete (or fail differently) within the first 30 seconds. If you still see HTTP 401, the shell still has stray overrides — re-run step 1 and unset whatever's there.

**Why this isn't a playbook bug:** The same `.converge/project.yaml` works in a clean shell. The conflict is purely about shell-env precedence over `project.yaml`'s `env:` block when the agent CLI is spawned. Don't patch the playbook to compensate.

---

## E.4 Missing or malformed project.yaml

**Symptom:** `converge run` exits immediately with a config load error.

**Fix:**

```bash
converge doctor --playbook=<name>
# Look for configErrors in the report
```

Common issues:
- Literal `${ENV_VAR}` placeholder in a comment (YAML tries to interpolate)
- Missing required `ai.providers` block
- Syntax errors in YAML

**Verification:** `converge doctor --playbook=<name>` reports 0 config errors.
