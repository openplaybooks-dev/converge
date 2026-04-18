# Task: 03-dx/002-example-playbooks

Create three example playbooks that demonstrate different Converge capabilities.

**Example 1: hello-world** (simplest possible)
- Single task that creates a file
- One check that verifies the file exists
- Demonstrates: basic playbook structure, task format, checks

**Example 2: data-pipeline** (sequential with dependencies)
- 3 tasks: fetch-data → transform → validate
- Each task depends on the previous
- Demonstrates: task dependencies, inputs/outputs, multiple checks

**Example 3: fullstack-app** (WBS with dynamic tasks)
- Uses WBS to spawn component tasks
- Has goals and quality checks
- Demonstrates: WBS scripting, goals, complex orchestration

**For each example, create**:
```
examples/<name>/
├── .converge/playbooks/default/
│   ├── playbook.yml
│   ├── tasks/
│   │   └── ... (TASK.md files)
│   └── goals/ (if applicable)
└── README.md (brief description, how to run)
```

**Pattern**: Follow the format from `packages/core/examples/continuous-app/`
for playbook.yml and TASK.md structure.