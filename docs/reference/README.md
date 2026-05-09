---
title: "Reference"
description: "Schema-level detail for every config file and CLI command"
sidebar:
  order: 0
---

# Reference

Schema-level detail for every config file and CLI command. Use this when you need to know exactly what a field does, not when you're learning.

## Config schemas

- **[`playbook.yml`](./playbook-yml.md)**: the top-level playbook definition: inputs, run config, declared checks, task list.
- **[`TASK.md`](./task-md.md)**: per-task frontmatter: inputs, outputs, checks, Seed, executor, prompt.
- **[`project.yml`](./project-yml.md)**: project-level config: providers, defaults, hooks, runtime settings.
- **[`@converge/core` API](./core-api.md)**: the public TypeScript API for embedding converge in your own tooling.

## CLI

- **[CLI command index](./cli/)**: every `converge` subcommand with its flags and behavior.

## Adjacent docs

- **[Guides](../guides/)**: when you want a how-to instead of schema detail.
- **[Concepts](../concepts/)**: what the schema *means* (deterministic checks, dynamic Seed, etc.).
