{
  "timestamp": "2026-04-18T00:00:00.000Z",
  "staleReferences": 0,
  "scannedFiles": 625,
  "patterns": ["harness", "crew", "crewadd", "sheetsrun"],
  "exceptions": [
    { "file": "docs/converge-gtm.md", "reason": "CrewAI is a competitor name in comparison docs, not a stale brand reference" },
    { "file": "packages/core/docs/FRAMEWORK_EVALUATION_VS_SOA.md", "reason": "CrewAI is a competitor name in framework comparison docs, not a stale brand reference" }
  ],
  "remaining": [],
  "fixes": [
    { "file": "packages/core/package.json", "change": "Removed stale 'crew' script alias from scripts" }
  ]
}
