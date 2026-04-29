---
id: gold-key-01-spec
title: Validate Ornate Golden Key With Gem Inset prop specification
description: Ornate golden key with gem inset
tags:
  - prop
  - spec
  - item
outputs:
  - assets/objects/gold-key/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/gold-key/SPEC.md
vars:
  obj_id: gold-key
  obj_name: Ornate Golden Key With Gem Inset
  obj_description: Ornate golden key with gem inset
  obj_category: item
  states: "[\"idle\"]"
---

# Validate Ornate Golden Key With Gem Inset Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: gold-key
- **Name**: Ornate Golden Key With Gem Inset
- **Category**: item
- **Description**: Ornate golden key with gem inset
- **States**: ["idle"]

## Task

Write `assets/objects/gold-key/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/gold-key/SPEC.md` exists and is non-empty.
