---
id: 004-license-security
title: Update license and security files
dependencies:
  - 003-config-rename
outputs:
  - .converge/standardize-state/brand/004-license.json
checks:
  - id: no-harness-in-legal
    description: No harness references in legal files
    cmd: "test -z \"$(grep -i 'harness' SECURITY.md LICENSE 2>/dev/null | grep -v '.converge/')\""
---

Update SECURITY.md and LICENSE files to use Converge branding.

**Scope**: Root `SECURITY.md`, `LICENSE`, any `LICENSE` files in packages

**Replacements**:
- Project name references: harness → Converge
- Repository URLs
- Contact information if it references old project name
- Copyright holder name if applicable

**Process**:
1. Read SECURITY.md — update project name and any CLI references
2. Read LICENSE — update if it mentions harness by name
3. Check for per-package LICENSE files
4. Write manifest to `.converge/standardize-state/brand/004-license.json`
