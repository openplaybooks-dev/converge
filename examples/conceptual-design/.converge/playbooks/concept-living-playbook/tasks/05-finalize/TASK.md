---
id: 05-finalize
title: Copy concept to output directory
depends_on:
  - 04-enhance
inputs:
  - concepts/.workspace/concept.html
  - concepts/.workspace/mockup.html
  - concepts/.workspace/chosen-design-system.txt
checks:
  - id: concept-copied
    cmd: >-
      bash -c '
        ds=$(cat concepts/.workspace/chosen-design-system.txt);
        test -s "concepts/${ds}/concept.html"
      '
    description: concept.html in final output directory
---

# Finalize

1. Read design system name from `concepts/.workspace/chosen-design-system.txt`.
2. Copy `concepts/.workspace/concept.html` to `concepts/{name}/concept.html`.
3. Copy `concepts/.workspace/mockup.html` to `concepts/{name}/mockup.html`.
4. Copy `concepts/.workspace/design-system.md` to `concepts/{name}/design-system.md`.
5. Copy `concepts/.workspace/design-spec.md` to `concepts/{name}/design-spec.md`.
