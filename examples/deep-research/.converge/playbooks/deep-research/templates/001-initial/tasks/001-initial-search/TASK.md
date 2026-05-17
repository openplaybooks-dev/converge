---
id: "{{taskId}}"
title: "Initial Search"
skill: research-layer-aggregate
vars:
  questionDir:
checks:
  - id: search-results-written
    cmd: "test -f {{questionDir}}/output/1-initial/search.md"
    description: "search.md exists"
---

# Initial Search

Read the research question and any extra context from `{{questionDir}}/question.md`.

Conduct broad initial research using your knowledge base. Produce a markdown file at `{{questionDir}}/output/1-initial/search.md` containing:

- **Research Question** (quoted from `question.md`)
- **Search Queries**: 6-10 distinct angles you would investigate
- **Topic Areas**: 4-6 major areas central to the question
- **Initial Sources**: 8-15 real, credible sources (academic papers, books, authoritative sites) with author and a one-sentence relevance note
- **Knowledge Gaps**: 3-5 things the question hinges on that need deeper investigation

Use the `Write` tool to create the artifact. Create parent directories as needed (`mkdir -p` via Bash). No placeholders — every entry must contain real, substantive content drawn from your actual knowledge.
