# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **no-epic-refs**

## ❌ no-epic-refs

**Command**: `test -z "$(grep -rn 'epicId\|EpicId\|epic_id\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition\|EpicBuilder\|EpicDeps\|epicConfig\|epicStatus\|epicDeps\|epicLog\|epicTasks\|EpicScanner\|EpicMetadata\|epicDir\|extractEpicId\|extractEpicDir\|ensureEpicCheckpoints\|updateEpicProgress\|EpicEvalAPI\|EpicPlanAPI' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -rn 'epicId\|EpicId\|epic_id\|EpicConfig\|EpicStatus\|EpicContext\|EpicManager\|EpicDefinition\|EpicBuilder\|EpicDeps\|epicConfig\|epicStatus\|epicDeps\|epicLog\|epicTasks\|EpicScanner\|EpicMetadata\|epicDir\|extractEpicId\|extractEpicDir\|ensureEpicCheckpoints\|updateEpicProgress\|EpicEvalAPI\|EpicPlanAPI' --include='*.ts' packages/core/src/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"
```
