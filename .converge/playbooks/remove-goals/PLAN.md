# PLAN — remove-goals

## Goal restatement

Physically remove the "goal" concept from the converge framework codebase so the team can develop the new dbt-inspired **task / seed / test** paradigms on a clean slate. The cli-redesign playbook only added a CLI redirect; this playbook deletes the underlying source (~2,300 lines), the schema fields (`goals`, `goalDefs`, `goal-defs`, `GoalDef`), the runtime lifecycle (`GoalManager`), the planner (`goal-planner.ts`), the CLI surface (`commands-goals.ts` and the `goals` dispatch case), the documentation pages and prose mentions, and the `GOAL.md` artifacts in three example workspaces.

## Decision

**CONTAINER.** Six lifecycle phases, each gating the next on `pnpm -r typecheck && pnpm -r test`. Order is outside-in for survey, inside-out for delete.

## Children (direct only)

| id | kind | scope | gating output |
|---|---|---|---|
| `01-survey-and-fence` | container | Inventory every `goal` reference, delete example GOAL.md sets (3 workspaces, 30 files), quarantine goal-specific test files. Establish a baseline-green starting point. | `REFS.md` exists; `find examples -name GOAL.md` is empty; `pnpm -r test` green. |
| `02-strip-callsites` | container (WBS) | One WBS leaf per source module (~22 files in core, cli, navigator). Each leaf removes goal references from its file while the symbols still exist (compiler-driven). | `pnpm -r typecheck` green after each leaf; no `goal` token (word-boundary) in callsite modules. |
| `03-delete-schema-and-parser` | container | Strip `GoalDef` interface, `goals` / `goalDefs` fields, alias arrays, serializers from `task-md-definition.ts`. Delete `parse-goal.ts`. Clean `validator.ts`, `task-definition.ts`. | Symbol-level negative test: `parseTaskMd('goals:\n  - x')` rejects unknown field; `parse-goal.ts` does not exist. |
| `04-delete-runtime-and-planner` | container | Delete `goal-manager.ts` (154 lines), `goal-planner.ts` (1,365 lines). Prune callsites in `runtime.ts`, `converge-runner.ts`, `dod-runner.ts`. | Module-level negative test: those two files do not exist; runtime imports are clean. |
| `05-delete-cli-surface` | container | Delete `commands-goals.ts`. Fully remove `goals` case from `main.ts` dispatch + `commands.ts` + `help.ts`. **No redirect** — falls through to "unknown command." | `converge goals` exits non-zero with unknown-command message. |
| `06-docs-and-cleanup` | container (WBS for prose-mention purge) | Delete `docs/reference/cli/goals.md` and `docs/guides/articulate-your-goal.md`. Prune entries from `_cli-commands.json`, `_sources.json`, `_ia.json`. WBS leaves purge prose mentions in remaining docs. | `grep -rn '\bgoal\b' docs/` returns only acknowledged historical references (cli-redesign migration table). |

Each non-trivial leaf inside these phases nests `01-red/TASK.md` (negative-existence test) and `02-green/TASK.md` (deletion). The per-layer planner (`converge plan <path>`) writes those when each phase is invoked.

## Sequencing rationale

1. **Survey before delete.** Phase 03+ irreversibly deletes files. Examples must be cleaned first or `converge plan` against examples breaks mid-run.
2. **Strip callsites before deletion.** Each file becomes goal-free incrementally while symbols still exist. Deleting `goal-manager.ts` first would red-line ~15 files at once and the per-leaf gate becomes meaningless.
3. **Schema before runtime.** `GoalDef` types are imported by runtime; deleting the type with consumers alive breaks typecheck.
4. **Runtime before CLI.** `commands-goals.ts` imports `GoalManager` and the planner.
5. **CLI before docs.** Docs reference CLI surface; removing surface first lets doc-purge be a pure text exercise.

## TDD discipline: inverted red-green

Three flavors of the failing test in `01-red/`:
- **Module-level**: `expect(fs.existsSync('packages/core/src/runtime/goal-manager.ts')).toBe(false)` for deletions.
- **Symbol-level**: `expect(Object.keys(taskMdDef)).not.toContain('goals')` for schema strips.
- **Behavioral**: `expect(() => parseTaskMd('goals:\n  - x\n')).toThrow(/unknown field/)` for parser strips.

`02-green/` performs the deletion until the test passes AND the module's own tests stay green. No `03-refactor/` — deletion is its own simplification. After phase 06, the negative tests can be consolidated into one `tests/no-goals.test.ts` as a tombstone preventing readmission.

## Open questions

- **`docs/guides/articulate-your-goal.md`** — rewrite as a "checks/tests" guide, or delete? Phase 06-02 decides; leaning delete.
- **Acknowledged historical mentions in `docs/design/cli-redesign.md`** — the migration table mentions `goals → build`. Leave as historical record (the design doc is a snapshot in time), or update? Leaning leave.
- **Tombstone test consolidation** — after phase 06, do the per-leaf negative tests get folded into one `tests/no-goals.test.ts`, or stay distributed? Decide at the end of phase 06; the playbook is agnostic.

## Coordination with cli-redesign

Standalone. The user sequences runs manually. If cli-redesign's Phase 06-migration ships first and adds a `goals → build` row to `migration-redirects.ts`, Phase 05-02 here removes that row as part of "no redirect; fall through to unknown command." If cli-redesign ships after, its 06-migration phase should simply not add the row.

## Spec of record

`docs/design/cli-redesign.md` is the design driving the new task/seed/test paradigms. The migration table at §10 line 570 says `converge goals` → "folded into `converge build`"; this playbook makes that real by deleting the goal concept entirely (the new `build` verb runs `checks:` declared on tasks — no separate goal mechanism is needed).
