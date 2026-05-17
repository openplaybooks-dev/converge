---
title: "Reference"
description: "Schema-level detail for every config file and CLI command"
sidebar:
  order: 0
---

# Reference

Schema-level detail for every config file and CLI command. Use this when you need to know exactly what a field does, not when you're learning.

## Config schemas

- **[`playbook.yml`](./playbook-yml.md)**: playbook identity, inputs, task entries, run limits, goals, hooks, and playbook-level checks.
- **[`TASK.md`](./task-md.md)**: task contract and execution hints: inputs, outputs, checks/tests, seed mode, vars, materialization, and task body.
- **[`project.yml`](./project-yml.md)**: project-level config: providers, defaults, hooks, runtime settings.
- **[`@converge/core` API](./core-api.md)**: the public TypeScript API for embedding converge in your own tooling.

## CLI

- **[CLI command index](./cli/)**: the full `converge` command catalog, including the common path and advanced/auxiliary commands.

## Adjacent docs

- **[Guides](../guides/)**: when you want a how-to instead of schema detail.
- **[Concepts](../concepts/)**: what the schema means in the current runtime.
