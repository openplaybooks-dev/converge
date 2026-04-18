/**
 * WBS: Scientific Method Pipeline
 *
 * Spawns the 5-phase scientific method pipeline:
 *   001-literature-review → 002-hypothesize → 003-experiment → 004-analyze → 005-synthesize
 *
 * The experiment phase (003) is itself a WBS parent that spawns
 * per-hypothesis test tasks dynamically.
 */

export async function run(ctx) {
  // Phase 1: Literature Review
  await ctx.spawn({
    id: '001-literature-review',
    title: 'Literature Review',
    skill: 'research-survey',
    outputs: ['literature-review.md', 'known-findings.json'],
    checks: [
      {
        id: 'literature-review-exists',
        cmd: 'test -f literature-review.md',
        description: 'Literature review document exists',
      },
      {
        id: 'known-findings-valid',
        cmd: "node -e \"const f=JSON.parse(require('fs').readFileSync('known-findings.json','utf-8')); if(!f.findings||!Array.isArray(f.findings))throw new Error('missing findings array')\"",
        description: 'known-findings.json is valid with findings array',
      },
    ],
    body: `Survey existing knowledge relevant to the research question.

**Inputs**: The research question from playbook inputs.

**Process**:
1. Identify key terms and concepts
2. Search for existing research, papers, documentation, prior work
3. Summarize findings with source citations
4. Identify gaps in existing knowledge and conflicting findings

**Outputs**:
- \`literature-review.md\` — narrative summary
- \`known-findings.json\` — structured findings:
  \`\`\`json
  {
    "question": "...",
    "findings": [
      { "finding": "...", "source": "...", "confidence": "high|medium|low" }
    ],
    "gaps": ["..."],
    "conflicts": ["..."]
  }
  \`\`\``,
  });

  // Phase 2: Hypothesis Formulation
  await ctx.spawn({
    id: '002-hypothesize',
    title: 'Hypothesis Formulation',
    skill: 'research-hypothesize',
    dependencies: ['001-literature-review'],
    outputs: ['hypotheses.json'],
    checks: [
      {
        id: 'hypotheses-valid',
        cmd: "node -e \"const h=JSON.parse(require('fs').readFileSync('hypotheses.json','utf-8')); if(!h.hypotheses||h.hypotheses.length===0)throw new Error('no hypotheses'); h.hypotheses.forEach((x,i)=>{if(!x.id||!x.statement||!x.testPlan)throw new Error('hypothesis '+(i+1)+' missing required fields')})\"",
        description: 'hypotheses.json has at least 1 testable hypothesis with required fields',
      },
    ],
    body: `Formulate testable hypotheses from the literature review.

**Inputs**: \`literature-review.md\`, \`known-findings.json\`

**Process**:
1. Read literature review and known findings
2. Identify knowledge gaps and open questions
3. Formulate specific, testable hypotheses
4. Define a test plan for each
5. Assess complexity (simple = direct test, complex = needs sub-research)

**Output**: \`hypotheses.json\`:
\`\`\`json
{
  "hypotheses": [
    {
      "id": "H1",
      "statement": "...",
      "testable": true,
      "testPlan": "How to test this",
      "complexity": "simple|complex",
      "rationale": "Why this is worth testing"
    }
  ]
}
\`\`\``,
  });

  // Phase 3: Experiment (WBS parent — spawns per-hypothesis tests)
  await ctx.spawn({
    id: '003-experiment',
    title: 'Experiment Execution',
    dependencies: ['002-hypothesize'],
    outputs: ['experiment-results/'],
    wbs: {
      type: 'nodejs',
      path: './experiment-wbs.js',
    },
    body: `Test each hypothesis from \`hypotheses.json\`.

This task dynamically spawns one test task per hypothesis.
For "simple" hypotheses, spawns a direct experiment task.
For "complex" hypotheses, spawns a nested research pipeline.

Results are written to \`experiment-results/{hypothesis-id}.json\`.
A consolidation task merges all results.`,
  });

  // Phase 4: Analysis
  await ctx.spawn({
    id: '004-analyze',
    title: 'Data Analysis',
    skill: 'research-analyze',
    dependencies: ['003-experiment'],
    outputs: ['analysis.md', 'evidence.json'],
    checks: [
      {
        id: 'analysis-exists',
        cmd: 'test -f analysis.md',
        description: 'Analysis document exists',
      },
      {
        id: 'evidence-valid',
        cmd: "node -e \"const e=JSON.parse(require('fs').readFileSync('evidence.json','utf-8')); if(!e.claims||!Array.isArray(e.claims))throw new Error('missing claims'); if(!e.hypotheses||!Array.isArray(e.hypotheses))throw new Error('missing hypotheses')\"",
        description: 'evidence.json is valid with claims and hypotheses arrays',
      },
    ],
    body: `Cross-reference experiment results with literature review.

**Inputs**: \`experiment-results/*.json\`, \`known-findings.json\`

**Process**:
1. Read all experiment results
2. Cross-reference with literature review findings
3. Identify patterns, contradictions, remaining gaps
4. Build the structured evidence index

**Outputs**:
- \`analysis.md\` — narrative analysis
- \`evidence.json\` — structured evidence index:
  \`\`\`json
  {
    "question": "...",
    "status": "complete|partial|dead-end",
    "claims": [{ "claim": "...", "confidence": "...", "sources": [...] }],
    "contradictions": [{ "claim1": "...", "claim2": "...", "resolved": false }],
    "hypotheses": [{ "id": "H1", "tested": true, "result": "supported|refuted|inconclusive" }]
  }
  \`\`\``,
  });

  // Phase 5: Synthesis
  await ctx.spawn({
    id: '005-synthesize',
    title: 'Synthesis',
    skill: 'research-synthesize',
    dependencies: ['004-analyze'],
    outputs: ['synthesis.md'],
    checks: [
      {
        id: 'synthesis-exists',
        cmd: 'test -f synthesis.md',
        description: 'Synthesis document exists',
      },
      {
        id: 'synthesis-addresses-question',
        cmd: 'test -s synthesis.md',
        description: 'Synthesis document is non-empty',
      },
    ],
    body: `Produce the final answer to the research question.

**Inputs**: \`evidence.json\`, \`analysis.md\`

**Process**:
1. Read evidence index and analysis
2. Construct coherent answer to the research question
3. Cite evidence for each major claim
4. Acknowledge limitations and inconclusive areas
5. Provide confidence assessment and suggestions for further research

**Output**: \`synthesis.md\` — final research document with:
- Clear answer to the research question
- Evidence chain for each claim
- Confidence level (high/medium/low)
- Limitations and caveats
- Suggestions for further research`,
  });
}
