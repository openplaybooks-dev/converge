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
src/context/task-context.ts(9,3): error TS2305: Module '"./types.ts"' has no exported member 'EpicContext'.
src/executor/function-executor.ts(101,24): error TS2339: Property 'epic' does not exist on type 'TaskContext'.
src/executor/function-executor.ts(226,24): error TS2339: Property 'epic' does not exist on type 'TaskContext'.
src/executor/function-executor.ts(396,24): error TS2339: Property 'epic' does not exist on type 'TaskContext'.
src/functions/types.ts(15,3): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
src/gap/detector.ts(17,3): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
src/journal/re-eval.ts(9,3): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
src/journal/re-eval.ts(45,35): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/journal/re-eval.ts(81,23): error TS2339: Property 'epic' does not exist on type 'TaskContext'.
src/orchestrator/convergence.ts(8,31): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
src/orchestrator/convergence.ts(151,28): error TS2345: Argument of type '"epic:start"' is not assignable to parameter of type 'HookEvent'.
src/orchestrator/convergence.ts(181,13): error TS2353: Object literal may only specify known properties, and 'epicId' does not exist in type '{ gaps: Gap[]; iteration?: number | undefined; }'.
src/orchestrator/convergence.ts(228,13): error TS2353: Object literal may only specify known properties, and 'epicId' does not exist in type '{ iterations: number; gapsResolved: number; }'.
src/orchestrator/convergence.ts(232,34): error TS2345: Argument of type '"epic:complete"' is not assignable to parameter of type 'HookEvent'.
src/orchestrator/convergence.ts(271,15): error TS2353: Object literal may only specify known properties, and 'epicId' does not exist in type '{ reason: string; stallCount: number; gaps: Gap[]; }'.
src/orchestrator/convergence.ts(276,36): error TS2345: Argument of type '"epic:fail"' is not assignable to parameter of type 'HookEvent'.
src/orchestrator/convergence.ts(559,15): error TS2353: Object literal may only specify known properties, and 'epicId' does not exist in type '{ gapId: string; taskId: string; }'.
src/orchestrator/convergence.ts(678,37): error TS7006: Parameter 'level' implicitly has an 'any' type.
src/orchestrator/convergence.ts(679,44): error TS7006: Parameter 'level' implicitly has an 'any' type.
src/planning/dynamic-planner.ts(8,15): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
src/planning/dynamic-planner.ts(126,42): error TS7006: Parameter 'g' implicitly has an 'any' type.
src/repair/health-checks.ts(82,24): error TS2339: Property 'epic' does not exist on type 'TaskContext'.
src/repair/health-checks.ts(238,24): error TS2339: Property 'epic' does not exist on type 'TaskContext'.
src/sidecar/runner.ts(63,54): error TS2339: Property 'epic:complete' does not exist on type 'HookPayloads'.
src/sidecar/runner.ts(63,54): error TS2339: Property 'epic:start' does not exist on type 'HookPayloads'.
src/sidecar/types.ts(37,12): error TS2536: Type 'E' cannot be used to index type 'HookPayloads'.
src/yields/processor.ts(23,28): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
src/yields/types.ts(10,28): error TS2305: Module '"../context/types.ts"' has no exported member 'EpicContext'.
```
