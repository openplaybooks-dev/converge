# Checks: 03-build-screens/012-invite-accept/012-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-exists
**Description**: design.html exists for invite-accept
**Command**: `test -f .stitch/designs/invite-accept/design.html`

## meta-exists
**Description**: META.md exists for invite-accept
**Command**: `test -f .stitch/designs/invite-accept/META.md`

## uses-glossary
**Description**: HTML uses Flutter HTML Glossary vocabulary
**Command**: `grep -q 'class="scaffold"' .stitch/designs/invite-accept/design.html`

## has-data-attributes
**Description**: HTML uses data-* attributes for Flutter conversion
**Command**: `grep -q 'data-color=' .stitch/designs/invite-accept/design.html`