# Phases Reference

Existing codebase discovery commands. Read when planning a playbook for a repo that already has code.

---

## Run before gathering requirements

```bash
# What runtime and framework
ls package.json pyproject.toml go.mod Cargo.toml 2>/dev/null
cat package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' | head -20

# Directory structure
find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | sort

# Recent state
git log --oneline -10 && git status --short

# Existing converge setup
ls -la .converge/ 2>/dev/null
```

Capture: runtime, framework dependencies, project shape, existing converge artifacts.