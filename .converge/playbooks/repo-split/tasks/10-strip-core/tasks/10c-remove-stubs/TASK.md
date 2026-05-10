---
description: Remove stubs — game-ai-pk (only has idea.md) and context-chain-demo.ts (dev tool)
inputs:
  - examples/game-ai-pk/
  - examples/context-chain-demo.ts
outputs:
  - examples/ (stubs removed)
checks:
  - id: game-ai-pk-gone
    cmd: test ! -d examples/game-ai-pk
  - id: context-chain-demo-gone
    cmd: test ! -f examples/context-chain-demo.ts
skills: []
references: []
vars: {}
depends_on: []
---

Remove stubs:
- `examples/game-ai-pk/` — only contains `idea.md`, no actual code or playbook
- `examples/context-chain-demo.ts` — dev tool for testing Unit context chains, not user-facing

```bash
rm -rf examples/game-ai-pk
rm -f examples/context-chain-demo.ts
```
