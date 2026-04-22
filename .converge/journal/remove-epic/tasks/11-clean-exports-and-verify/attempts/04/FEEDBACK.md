# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **no-epic-refs**
- ❌ **tsc-clean**

## ❌ no-epic-refs

**Command**: `test -z "$(grep -rn 'epicId\|EpicId\|epic_id\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition\|EpicBuilder\|EpicDeps\|epicConfig\|epicStatus\|epicDeps\|epicLog\|epicTasks\|extractEpicId\|extractEpicDir\|transitionEpic\|getEpicTasksDir\|getEpicsDir\|runEpicConvergence\|discoverEpicIds\|appendEpicLog' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -rn 'epicId\|EpicId\|epic_id\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition\|EpicBuilder\|EpicDeps\|epicConfig\|epicStatus\|epicDeps\|epicLog\|epicTasks\|extractEpicId\|extractEpicDir\|transitionEpic\|getEpicTasksDir\|getEpicsDir\|runEpicConvergence\|discoverEpicIds\|appendEpicLog' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"
```

## ❌ tsc-clean

**Command**: `cd packages/core && npx tsc --noEmit`
**Exit code**: 2
**Output**:
```
npm warn Unknown env config "node-linker". This will stop working in the next major version of npm.
src/gap/detector.ts(53,79): error TS2339: Property 'id' does not exist on type 'Readonly<{ version: 2; name: string; goals: string[]; variables: Record<string, unknown>; plugins: (string | [string, Record<string, unknown>] | { name: string; options?: Record<string, unknown> | undefined; })[]; ... 4 more ...; metadata?: { ...; } | undefined; }>'.
src/meta/sidecar.ts(131,7): error TS2353: Object literal may only specify known properties, and '"epic:complete"' does not exist in type 'SidecarHooks'.
src/meta/sidecar.ts(131,31): error TS7006: Parameter 'payload' implicitly has an 'any' type.
src/meta/sidecar.ts(131,40): error TS7006: Parameter 'ctx' implicitly has an 'any' type.
src/orchestrator/convergence.ts(8,31): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
src/orchestrator/convergence.ts(151,28): error TS2345: Argument of type '"epic:start"' is not assignable to parameter of type 'HookEvent'.
src/orchestrator/convergence.ts(181,13): error TS2353: Object literal may only specify known properties, and 'epicId' does not exist in type '{ gaps: Gap[]; iteration?: number | undefined; }'.
src/orchestrator/convergence.ts(228,13): error TS2353: Object literal may only specify known properties, and 'epicId' does not exist in type '{ iterations: number; gapsResolved: number; }'.
src/orchestrator/convergence.ts(232,34): error TS2345: Argument of type '"epic:complete"' is not assignable to parameter of type 'HookEvent'.
src/orchestrator/convergence.ts(271,15): error TS2353: Object literal may only specify known properties, and 'epicId' does not exist in type '{ reason: string; stallCount: number; gaps: Gap[]; }'.
src/orchestrator/convergence.ts(276,36): error TS2345: Argument of type '"epic:fail"' is not assignable to parameter of type 'HookEvent'.
src/orchestrator/convergence.ts(498,21): error TS2554: Expected 9 arguments, but got 5.
src/orchestrator/convergence.ts(559,15): error TS2353: Object literal may only specify known properties, and 'epicId' does not exist in type '{ gapId: string; taskId: string; }'.
src/orchestrator/convergence.ts(678,37): error TS7006: Parameter 'level' implicitly has an 'any' type.
src/orchestrator/convergence.ts(679,44): error TS7006: Parameter 'level' implicitly has an 'any' type.
src/planning/dynamic-planner.ts(8,15): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
src/planning/dynamic-planner.ts(126,42): error TS7006: Parameter 'g' implicitly has an 'any' type.
```
