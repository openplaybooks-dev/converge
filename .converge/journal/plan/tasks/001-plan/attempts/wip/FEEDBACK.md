# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **playbook-yml-exists**
- ❌ **has-tasks-dir**
- ❌ **has-task-files**

## ❌ playbook-yml-exists

**Command**: `test -f .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/playbook.yml`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/playbook.yml
```

## ❌ has-tasks-dir

**Command**: `test -d .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/tasks`
**Exit code**: 1
**Output**:
```
Command failed: test -d .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/tasks
```

## ❌ has-task-files

**Command**: `test $(find .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/tasks -name "TASK.md" 2>/dev/null | wc -l) -ge 2`
**Exit code**: 1
**Output**:
```
Command failed: test $(find .converge/playbooks/careate-a-new-playbook-to-implement-mission-contro/tasks -name "TASK.md" 2>/dev/null | wc -l) -ge 2
```
