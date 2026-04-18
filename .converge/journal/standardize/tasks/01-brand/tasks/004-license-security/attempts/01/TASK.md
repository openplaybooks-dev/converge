# Task: 01-brand/004-license-security

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