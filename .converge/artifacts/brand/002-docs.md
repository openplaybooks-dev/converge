{
  "task": "01-brand/002-docs-rename",
  "status": "complete",
  "timestamp": "2026-04-18T00:00:00Z",
  "summary": "Replaced all stale brand references in Markdown documentation",
  "files_modified": [
    "packages/core/docs/execution-context.md",
    "packages/core/docs/AGENT_SEARCH_GUIDE.md",
    "packages/core/docs/checkpoint-cursor-system.md",
    "packages/core/docs/proposals/plugin-system.md",
    "packages/core/docs/FRAMEWORK_EVALUATION_VS_SOA.md",
    "packages/core/src/journal/STRUCTURE.md",
    "packages/core/src/plugins/builtins/git/PLUGIN.md",
    "packages/core/src/cli/skills/SKILL_README.md",
    "packages/agentfn/src/README.md",
    "packages/core/README.md",
    "docs/converge-gtm.md"
  ],
  "replacements": {
    "crew (product context)": "converge",
    "SheetsRun": "removed or replaced contextually",
    "sheetsrun": "removed or replaced contextually",
    "getCrewDir": "getConvergeDir",
    "readCrewJson": "readConvergeJson",
    "role-based crews": "role-based agents"
  },
  "exceptions_preserved": [
    "CrewAI (competitor product name — not renamed)",
    "CHANGELOG entries",
    ".converge/ playbook directories",
    "auto-verify references"
  ],
  "checks_passed": [
    "no-harness-in-md"
  ]
}
