---
id: evolve-report
title: LLM Training Recipe Report
---

# LLM Training Recipe Report

Produce the final report with the winning LLM training configuration.

## Process

1. Read `best-candidate.json` for the winning configuration
2. Read `evolution-state.json` for generation count
3. Read `scored/gen-*.json` files to reconstruct fitness progression
4. Read `selection.json` for runner-up configurations
5. Compile comprehensive training recipe

## Outputs

- `optimization-report.md` with:
  - **Training goal** (restated from inputs)
  - **Winning configuration**:
    - Full architecture spec (layers, dims, attention type, FFN, positional encoding)
    - Complete hyperparameter settings (optimizer, LR, schedule, batch size, warmup)
    - Data strategy (corpus mix, total tokens, filtering, dedup, curriculum)
  - **Fitness progression**: score trajectory across generations
  - **Why this configuration won**: analysis grounded in scaling laws and training best practices
  - **Key trade-offs**: what the winning approach sacrifices (e.g. inference speed for training quality)
  - **Runner-up configurations**: alternative approaches worth considering
  - **Implementation notes**: practical guidance for executing the training run (hardware requirements estimate, expected training duration, checkpointing strategy)

## Quality Criteria

- Configuration is complete and directly actionable (could be turned into a training script)
- Fitness curve shows generation-over-generation data
- Trade-offs are honest (not just praise for the winner)
- Report is self-contained — readable without other files
