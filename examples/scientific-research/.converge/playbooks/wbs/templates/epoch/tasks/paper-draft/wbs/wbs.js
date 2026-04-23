/**
 * WBS: Paper Draft — Per-Section Spawner
 *
 * Spawns one task per paper section (8 sections) plus an assembly task.
 *
 *   001-abstract → 002-introduction → ... → 008-references → 999-assemble
 */

import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;
  const sectionsDir = join(artifactsDir, 'paper-draft', 'sections');
  if (!existsSync(sectionsDir)) mkdirSync(sectionsDir, { recursive: true });

  const sections = [
    { prefix: '001', id: 'abstract', title: 'Abstract', minWords: 150, skill: 'research-draft-section' },
    { prefix: '002', id: 'introduction', title: 'Introduction', minWords: 300, skill: 'research-draft-section' },
    { prefix: '003', id: 'literature-review', title: 'Literature Review', minWords: 500, skill: 'research-draft-section' },
    { prefix: '004', id: 'methodology', title: 'Methodology', minWords: 400, skill: 'research-draft-section' },
    { prefix: '005', id: 'results', title: 'Results', minWords: 400, skill: 'research-draft-section' },
    { prefix: '006', id: 'discussion', title: 'Discussion', minWords: 500, skill: 'research-draft-section' },
    { prefix: '007', id: 'conclusion', title: 'Conclusion', minWords: 200, skill: 'research-draft-section' },
    { prefix: '008', id: 'references', title: 'References', minWords: 100, skill: 'research-draft-section' },
  ];

  const sectionTaskIds = [];

  for (const section of sections) {
    const taskId = `${section.prefix}-${section.id}`;
    const outPath = join(sectionsDir, `${section.id}.md`);

    await ctx.spawn(
      { _type: 'raw-markdown', content: `---
id: "${taskId}"
title: "Draft: ${section.title}"
skill: ${section.skill}
checks:
  - id: section-${section.id}-exists
    cmd: "test -f ${outPath}"
    description: "${section.title} section exists"
  - id: section-${section.id}-length
    cmd: "node -e \\"const w=require('fs').readFileSync('${outPath}','utf-8').split(/\\\\s+/).length; if(w<${section.minWords})throw new Error('${section.title} has '+w+' words, need ${section.minWords}')\\""
    description: "${section.title} meets minimum ${section.minWords} words"
---

# Draft: ${section.title}

Write the **${section.title}** section of the research paper.

**Research question**: ${ctx.vars.question || ''}
**Minimum word count**: ${section.minWords}
**Output file**: \`${outPath}\`

## Inputs

Read these epoch artifacts for source material:
- \`${artifactsDir}/literature/sources.json\`
- \`${artifactsDir}/hypothesize/hypotheses.json\`
- \`${artifactsDir}/experiment/summary.json\`
- \`${artifactsDir}/statistical-analysis/statistics.json\`
- \`${artifactsDir}/statistical-analysis/meta-analysis.json\`
- \`${artifactsDir}/evidence-synthesis/evidence-grades.json\`
- \`${artifactsDir}/contradiction-resolution/contradictions.json\`

## Section-Specific Guidelines

${getSectionGuidelines(section.id)}

## Output

Write the section as markdown to \`${outPath}\`.
Use academic tone. Cite sources using [Author, Year] notation.
Minimum ${section.minWords} words.` },
      { id: taskId },
    );

    sectionTaskIds.push(taskId);
  }

  // Assembly task
  await ctx.spawn(
    { _type: 'raw-markdown', content: `---
id: "999-assemble"
title: "Assemble paper"
skill: research-assemble
checks:
  - id: paper-assembled
    cmd: "test -f ${artifactsDir}/paper-draft/paper-draft.md"
    description: "Assembled paper exists"
  - id: paper-length
    cmd: "node -e \\"const w=require('fs').readFileSync('${artifactsDir}/paper-draft/paper-draft.md','utf-8').split(/\\\\s+/).length; if(w<2000)throw new Error('Paper has '+w+' words, need 2000')\\""
    description: "Paper meets minimum 2000 words"
---

# Assemble Paper

Combine all sections into a coherent research paper.

## Process

1. Read all section files from \`${sectionsDir}/\`
2. Assemble in order: abstract, introduction, literature-review, methodology, results, discussion, conclusion, references
3. Ensure cross-section coherence (consistent terminology, no contradictions between sections)
4. Add paper title and author line
5. Verify all citations in the text appear in references

## Output

Write \`${artifactsDir}/paper-draft/paper-draft.md\` — the complete assembled paper.` },
    { id: '999-assemble', dependencies: sectionTaskIds },
  );
}

function getSectionGuidelines(sectionId) {
  const guidelines = {
    'abstract': `Summarize the entire paper in one paragraph:
- State the research question
- Briefly describe methodology
- Highlight key findings with effect sizes
- State the main conclusion
- Note limitations`,

    'introduction': `Set the context for the research:
- Present the research question and its significance
- Provide background on the topic
- State the gap in current knowledge
- Outline the approach taken
- Preview the paper structure`,

    'literature-review': `Synthesize existing knowledge:
- Organize by theme, not by source
- Compare and contrast findings across sources
- Identify consensus areas and areas of debate
- Highlight the specific gap this research addresses
- Use sources.json for structured citation data`,

    'methodology': `Describe the research approach:
- Explain the iterative epoch-based methodology
- Describe how hypotheses were formulated and tested
- Document the statistical methods used (effect sizes, CIs, meta-analysis)
- Explain the GRADE evidence assessment framework
- Describe the Bayesian updating process
- Acknowledge methodological limitations`,

    'results': `Present findings objectively:
- Report effect sizes with confidence intervals
- Present GRADE ratings for each major claim
- Include meta-analysis results if multiple epochs
- Use tables for quantitative summaries
- Report both supporting and contradicting evidence
- Note statistical significance and practical significance`,

    'discussion': `Interpret and contextualize findings:
- Discuss how results relate to existing literature
- Explain any contradictions and how they were resolved
- Discuss the Bayesian posterior probabilities
- Address limitations of the research
- Consider alternative explanations
- Discuss practical implications`,

    'conclusion': `Summarize and project forward:
- Restate the main findings
- Answer the research question directly
- State confidence level in the answer
- Suggest directions for future research
- Note any unresolved questions`,

    'references': `Compile all citations:
- List all sources cited in the paper
- Use consistent citation format
- Include all sources from sources.json that were referenced
- Verify every in-text citation appears here`,
  };
  return guidelines[sectionId] || '';
}
