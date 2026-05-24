---
id: 02-personas
title: User Personas
description: Identify and document target user personas
blocking: true
depends_on:
  - 01-product-brief
inputs:
  - docs/product/PRODUCT_BRIEF.md
outputs:
  - docs/product/research/user-personas.md
checks:
  - id: personas-exists
    cmd: test -f docs/product/research/user-personas.md
skills:
  - persona-development
---

# User Personas

Write user-personas.md.