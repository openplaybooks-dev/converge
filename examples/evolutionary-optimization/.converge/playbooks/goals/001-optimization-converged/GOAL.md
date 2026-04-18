---
id: optimization-converged
weight: 10
metric:
  script: dod.js
  target: 0
  direction: min
---

# Training Configuration Converged

The evolutionary optimization has found an LLM training configuration
meeting the fitness threshold, with a complete architecture/hyperparameter/data
specification and a final training recipe report.

## Verification

The dod.js script checks:
1. At least one generation has been evaluated
2. Best configuration fitness meets the threshold
3. Best configuration has complete specification (architecture + hyperparameters + data strategy)
4. Training recipe report has been generated
