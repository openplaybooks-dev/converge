/**
 * Harness Refiner
 *
 * Implements the refinement loop for improving harness validation.
 * When issues are found, uses LLM to refine the harness code.
 */

import type {
  RefinementRequest,
  RefinementResult,
} from './types.ts';

/* ------------------------------------------------------------------ */
/*  Harness Refiner                                                   */
/* ------------------------------------------------------------------ */

export class HarnessRefiner {
  /**
   * Refine harness code based on execution issues
   */
  async refine(request: RefinementRequest): Promise<RefinementResult> {
    console.log(`[HarnessRefiner] Refining harness (iteration ${request.iteration})`);

    // Build refinement prompt
    const prompt = this.buildRefinementPrompt(request);

    // In real impl, would call LLM to generate improved harness
    // For now, return mock refinement
    const refinedCode = this.generateRefinedCode(request);

    return {
      code: refinedCode,
      success: true,
      rationale: `Refined harness to address ${request.issues.length} issues`,
      needsMoreRefinement: request.iteration < request.maxRefinements,
    };
  }

  /**
   * Build prompt for LLM to refine harness
   */
  private buildRefinementPrompt(request: RefinementRequest): string {
    let prompt = `Refine this validation harness to fix the following issues:\n\n`;

    prompt += `Current Harness Code:\n\`\`\`javascript\n${request.currentCode}\n\`\`\`\n\n`;

    prompt += `Issues Found:\n`;
    for (const issue of request.issues) {
      prompt += `- [${issue.severity}] ${issue.message}`;
      if (issue.file) {
        prompt += ` (${issue.file}`;
        if (issue.line) {
          prompt += `:${issue.line}`;
        }
        prompt += ')';
      }
      prompt += '\n';
    }

    prompt += `\nTask Result:\n`;
    prompt += `- Success: ${request.taskResult.success}\n`;
    if (request.taskResult.message) {
      prompt += `- Message: ${request.taskResult.message}\n`;
    }
    if (request.taskResult.filesModified) {
      prompt += `- Files Modified: ${request.taskResult.filesModified.join(', ')}\n`;
    }

    prompt += `\nRefine the harness to be more accurate and reduce false positives.\n`;
    prompt += `Iteration: ${request.iteration}/${request.maxRefinements}\n`;

    return prompt;
  }

  /**
   * Generate refined harness code (mock implementation)
   */
  private generateRefinedCode(request: RefinementRequest): string {
    // In real impl, LLM would generate improved code
    // For now, just add comments about refinement
    return `${request.currentCode}

// Refinement iteration ${request.iteration}
// Addressed issues: ${request.issues.map((i) => i.message).join(', ')}
`;
  }
}

/**
 * Create a new harness refiner
 */
export function createHarnessRefiner(): HarnessRefiner {
  return new HarnessRefiner();
}
