#!/usr/bin/env python3
"""Stub: generates a fake SITEMAP.md for --stub mode."""
import os

project_dir = os.environ.get('CONVERGE_PROJECT_DIR', '.')
output_path = os.path.join(project_dir, 'docs/product/SITEMAP.md')
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, 'w') as f:
    f.write("""# Sitemap

## Pages
- `/` — Home/Dashboard
- `/ideas` — Ideas list
- `/ideas/new` — New idea
- `/ideas/:id` — Idea detail
- `/research` — Research hub
- `/epics` — Epic board
- `/design` — Design system
- `/prototype` — Interactive prototype
""")