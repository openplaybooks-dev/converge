# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ❌ **no-epic-refs**
- ✅ **tsc-clean**

## ❌ no-epic-refs

**Command**: `test -z "$(grep -rn 'epicId\|EpicId\|epic_id\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition\|EpicBuilder\|EpicDeps\|epicConfig\|epicStatus\|epicDeps\|epicLog\|epicTasks\|extractEpicId\|extractEpicDir\|transitionEpic\|getEpicTasksDir\|getEpicsDir\|runEpicConvergence\|discoverEpicIds\|appendEpicLog' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -rn 'epicId\|EpicId\|epic_id\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition\|EpicBuilder\|EpicDeps\|epicConfig\|epicStatus\|epicDeps\|epicLog\|epicTasks\|extractEpicId\|extractEpicDir\|transitionEpic\|getEpicTasksDir\|getEpicsDir\|runEpicConvergence\|discoverEpicIds\|appendEpicLog' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"
```
