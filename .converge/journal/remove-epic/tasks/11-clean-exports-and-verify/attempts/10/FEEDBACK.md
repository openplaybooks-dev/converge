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
src/functions/types.ts(607,9): error TS1005: ';' expected.
src/functions/types.ts(611,12): error TS1109: Expression expected.
src/functions/types.ts(614,4): error TS1005: ';' expected.
src/functions/types.ts(619,11): error TS1005: ';' expected.
src/functions/types.ts(624,11): error TS1005: ';' expected.
src/functions/types.ts(627,15): error TS1005: ',' expected.
src/functions/types.ts(627,24): error TS1005: ';' expected.
src/functions/types.ts(627,30): error TS1109: Expression expected.
src/functions/types.ts(630,18): error TS1005: ',' expected.
src/functions/types.ts(630,27): error TS1005: ';' expected.
src/functions/types.ts(630,33): error TS1109: Expression expected.
src/functions/types.ts(633,13): error TS1005: ';' expected.
src/functions/types.ts(633,22): error TS1011: An element access expression should take an argument.
src/functions/types.ts(634,1): error TS1128: Declaration or statement expected.
```
