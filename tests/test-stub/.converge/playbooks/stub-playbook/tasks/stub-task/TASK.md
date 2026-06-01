---
id: stub-task
depends_on: []
outputs:
  - .converge/journal/stub-playbook/tasks/stub-task/wip/report.md
checks:
  - id: exists
    cmd: test -f .converge/journal/stub-playbook/tasks/stub-task/wip/report.md
stub:
  cmd: echo "# Fake Report" > .converge/journal/stub-playbook/tasks/stub-task/wip/report.md
  cleanup: rm -f .converge/journal/stub-playbook/tasks/stub-task/wip/report.md
---

# Stub Task
Generate a fake report.