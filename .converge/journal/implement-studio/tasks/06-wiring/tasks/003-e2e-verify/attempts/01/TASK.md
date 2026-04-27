# Task: 06-wiring/003-e2e-verify

Run the full E2E verification against this repo's existing data.

**Scenarios** (all must pass):

1. **Build & start**: `pnpm install && pnpm -r build && pnpm --filter @converge/studio dev` (or `node packages/cli/dist/index.js studio --dev`). Confirm the studio responds on `http://127.0.0.1:4000`.

2. **Playbook list**: `GET /api/playbooks` returns at least these names: `implement-feature`, `implement-studio`, `oss-standardize`, `remove-epic`, `self-improvement-loop`, `split-cli-monolith`. The `/playbooks` page renders them.

3. **Playbook detail (read)**: `/playbooks/oss-standardize` shows the description, run config, and tasks list matching `.converge/playbooks/oss-standardize/playbook.yml`.

4. **Task editor (read)**: `/playbooks/oss-standardize/tasks/01-brand` loads with `title: "Brand Consolidation"` in the frontmatter form and the prompt body matching the file.

5. **Task editor (write)**: append a single line to the prompt body, hit Save. Confirm:
   - `git diff .converge/playbooks/oss-standardize/tasks/01-brand/TASK.md` shows only the appended line (or accept frontmatter reformatting per the documented limitation).
   - Reset the change with `git checkout` after verifying.

6. **New playbook form**: create a `studio-test` playbook with mode `oneoff`. Confirm `.converge/playbooks/studio-test/playbook.yml` exists and parses with `node packages/cli/dist/index.js validate`.

7. **Live journal view**: open an existing session under `.converge/journal/oss-standardize/`. The gantt and event stream render and metadata panel shows iteration counts.

8. **Trigger run**: add a single no-op task to `studio-test` (`prompt: echo done`, single check that exits 0). Click Run from the playbook detail. Confirm:
   - SSE streams stdout containing `done`.
   - A new session dir appears under `.converge/journal/studio-test/sessions/`.
   - Session is correlated to the run handle within ~2 seconds.

9. **Watcher**: with the studio running, `echo "" >> .converge/playbooks/studio-test/playbook.yml`. The `/playbooks` list refreshes within ~150ms.

10. **View modes**:
    - On `/playbooks/oss-standardize`, switch the tasks panel between `tree`, `kanban`, `table` — each mode renders without errors and the localStorage key `studio.view.playbook-tasks` (or similar) persists the choice across reload.
    - On `/runs`, switch between `table` and `kanban`. Kanban groups by status (`running` / `completed` / `failed`).
    - On a live session view, switch between `gantt`, `tree`, `table`. Gantt shows attempt bars on the time axis; tree shows the task hierarchy with this session's per-task status.

**Write report** to `.converge/studio-state/e2e-verify.json`:

```json
{
  "timestamp": "<ISO>",
  "studioVersion": "0.1.0",
  "scenarios": [
    { "id": "build-and-start", "passed": true, "notes": "..." },
    { "id": "playbook-list", "passed": true },
    { "id": "playbook-detail-read", "passed": true },
    { "id": "task-editor-read", "passed": true },
    { "id": "task-editor-write", "passed": true },
    { "id": "new-playbook-form", "passed": true },
    { "id": "live-journal-view", "passed": true },
    { "id": "trigger-run", "passed": true },
    { "id": "watcher", "passed": true },
    { "id": "view-modes", "passed": true }
  ],
  "allPassed": true,
  "issues": []
}
```

If any scenario fails, set `allPassed: false`, document in `issues[]` with file path and exact failure, and either fix in the responsible phase task or open a tracked issue.

**Cleanup**: delete the temporary `studio-test` playbook and its journal directory after verification: `rm -rf .converge/playbooks/studio-test .converge/journal/studio-test`.