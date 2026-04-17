---
id: no-stale-brands
weight: 10
---

# No Stale Brand References

The entire codebase must have zero references to legacy brand names: `harness` (as a product name), `crew`, `crewadd`, or `sheetsrun`.

Allowed exceptions:
- `auto-verify` directory (internal rename of the harness verification module)
- CHANGELOG entries documenting the rename
- `.converge/` playbook files that reference the rename process itself
- Third-party dependency names (e.g. `test-harness` in node_modules)

## Verification

```bash
# Must return zero results (excluding allowed exceptions)
grep -ri 'harness' --include='*.ts' --include='*.md' --include='*.json' --include='*.yml' packages/ docs/ README.md | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v 'auto-verify'
grep -ri 'crew\|crewadd\|sheetsrun' --include='*.ts' --include='*.md' --include='*.json' packages/ docs/ README.md | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/'
```
