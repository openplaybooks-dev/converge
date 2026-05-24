---
id: 01-product-brief
title: Product Brief Document
description: Write the product brief with problem, solution, users, and value proposition
blocking: true
depends_on: []
inputs:
  - docs/idea.txt
outputs:
  - docs/product/PRODUCT_BRIEF.md
checks:
  - id: brief-exists
  - id: brief-has-sections
skills:
  - product-brief
---

# Product Brief Document

Write the PRODUCT_BRIEF.md based on `docs/idea.txt`.