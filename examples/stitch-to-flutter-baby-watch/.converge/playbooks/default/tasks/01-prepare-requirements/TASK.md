---
id: 01-prepare-requirements
title: Prepare Requirements
description: Validate app idea, generate PRD, generate UX specification, extract screen definitions, and link screens to reference HTML
blocking: true
outputs:
  - PRD.md
  - .stitch/UX.md
  - .stitch/screens.json
  - .stitch/SITE.md
  - .stitch/references/ANALYSIS.md
checks:
  - id: ux-spec-exists
    cmd: test -f .stitch/UX.md
    description: UX specification exists
  - id: screens-json-exists
    cmd: test -f .stitch/screens.json
    description: Screen definitions exist
  - id: references-analysis-exists
    cmd: test -f .stitch/references/ANALYSIS.md
    description: References analysis exists
  - id: screens-json-html-reference
    cmd: python3 -c "import json,sys; d=json.load(open('.stitch/screens.json')); sys.exit(0 if isinstance(d,list) and all(isinstance(x,dict) and 'htmlReference' in x and isinstance(x.get('htmlReference'),str) for x in d) else 1)"
    description: Every screen in screens.json has string htmlReference
---
# Prepare Requirements

This epic gathers requirements and produces the foundational UX artifacts:
1. Validate app idea
2. Generate PRD
3. Generate UX overview
4. Breakdown UX to screens
5. Analyze design references
6. Enrich screens.json with htmlReference paths from analysis
