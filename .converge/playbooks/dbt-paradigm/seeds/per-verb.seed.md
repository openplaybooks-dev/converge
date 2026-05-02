---
name: per-verb
description: >
  Spawns one container task per CLI verb. Each container has a red/green
  pair instantiated from a template. Mirrors the old WBS per-verb pattern
  but uses the seed abstraction.
kind: nodejs
args:
  verbs:
    type: string
  template_root:
    type: string
  parent_base:
    type: string
---
// Seed: per-verb
// Spawns one container task per verb. Each container has a 01-red /
// 02-green pair instantiated from the template directory.
//
// This replaces the old WBS per-verb.seed.js pattern.

const VERBS = ctx.args.verbs.split(",").map((v: string) => v.trim());

for (const verb of VERBS) {
  ctx.spawn({
    id: verb,
    label: `Implement ${verb} command`,
  }, {
    id: `${verb}-red`,
    label: `Red — failing tests for ${verb}`,
  }, {
    id: `${verb}-green`,
    label: `Green — implement ${verb}`,
  });
}
