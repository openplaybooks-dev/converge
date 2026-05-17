# Recursive Subtopic Research Template

This template enables **unlimited depth** of research decomposition through recursion.

## How It Works

Each subtopic spawns 3 child tasks:

1. **Research Task** (`tasks/001-research/TASK.md`)
   - Conducts deep research on the subtopic
   - Generates findings, insights, and identifies knowledge gaps
   - Outputs: `research.json`

2. **Decomposition Task** (`tasks/002-decompose/TASK.md`)
   - Decides if the subtopic needs further breakdown
   - Identifies 2-5 sub-subtopics if decomposition is needed
   - Outputs: `decomposition.json`

3. **Sub-subtopics Spawner** (`tasks/003-sub-subtopics/TASK.md`, `seed: { mode: cli }`)
   - Reads the decomposition decision
   - If `shouldDecompose: true`, spawns each sub-subtopic
   - **KEY**: Uses the SAME parent template (this template) for recursion
   - Outputs: `sub-subtopics-spawned.json`

## Recursion Mechanism

The spawner emits a `converge spawn --batch <file.jsonl>` invocation. Each JSONL line targets the SAME `subtopic-task` template, e.g.:

```json
{"id":"ST-1-2","template":"subtopic-task","vars":{"subtopicId":"ST-1-2","subtopicName":"...","subtopicDescription":"...","epoch":"1","question":"...","domain":"...","maxEpochs":"10","confidenceThreshold":"0.85"}}
```

Because `template` resolves to `templates/subtopic-task/TASK.md`, each spawn re-enters the same parent template and the recursion continues until the AI sets `shouldDecompose: false`.

This creates a tree structure:
```
Subtopic A
├── Research A
├── Decompose A
└── Sub-subtopics A
    ├── Subtopic A-1
    │   ├── Research A-1
    │   ├── Decompose A-1
    │   └── Sub-subtopics A-1
    │       ├── Subtopic A-1-1
    │       │   └── ... (continues recursively)
    │       └── Subtopic A-1-2
    └── Subtopic A-2
        └── ... (continues recursively)
```

## Depth Control

Decomposition naturally stops when:
- The subtopic is narrow enough (AI decides `shouldDecompose: false`)
- Further breakdown would be too granular
- Research provides comprehensive coverage

## Example Flow

1. **Epoch 1**: "Greenhouse Gas Emissions" → spawns 3 tasks
2. **Research**: Identifies fossil fuels, agriculture, industry as key areas
3. **Decompose**: Decides to break down into sub-subtopics
4. **Spawn**: Creates "Fossil Fuel Emissions", "Agricultural Emissions", "Industrial Emissions"
5. **Each sub-subtopic** repeats steps 1-4 recursively
6. **"Fossil Fuel Emissions"** might decompose into "Coal", "Oil", "Natural Gas"
7. **"Coal"** might decompose into "Power Generation", "Steel Production", etc.
8. Process continues until topics are sufficiently narrow

## Benefits

- **Adaptive depth**: AI decides how deep to go based on complexity
- **No hardcoded limits**: Can go as deep as needed
- **Consistent structure**: Same template at every level
- **Parallel execution**: All subtopics at same level run in parallel
- **Quality control**: Each level has research + decomposition decision

## File Structure

```
subtopic-task/
├── TASK.md                    # Parent template (no seed; 3 children via tasks/)
├── tasks/
│   ├── 001-research/
│   │   └── TASK.md           # Conducts research
│   ├── 002-decompose/
│   │   └── TASK.md           # Decides decomposition
│   └── 003-sub-subtopics/
│       └── TASK.md           # CLI-seed spawner (recurses into subtopic-task)
└── README.md                  # This file
```

## Artifacts Generated

For each subtopic with ID `ST-1`:
```
artifacts/deep-research/epoch-1-002-subtopic-research/ST-1/
├── research.json              # Research findings
├── decomposition.json         # Decomposition decision
└── sub-subtopics-spawned.json # Spawn status
```

## Usage

This template is invoked by the main subtopic-research CLI spawner (`templates/002-research-x/tasks/002-subtopic-research/TASK.md`), which emits one `converge spawn` per subtopic with `template: subtopic-task`. The recursion happens automatically through the `sub-subtopics` child task, which spawns more `subtopic-task` instances when the AI decides decomposition is needed.
