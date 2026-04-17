/**
 * Converge Synthesizer
 *
 * Generates executable validation code using LLM.
 * The converge is synthesized once, then executed deterministically.
 */

import type {
  ConvergeSynthesisRequest,
  SynthesizedVerification,
  ConvergeMetadata,
} from './types.ts';
import type { AutoConvergeConfig } from '../functions/types.ts';

/* ------------------------------------------------------------------ */
/*  Converge Synthesizer                                               */
/* ------------------------------------------------------------------ */

export class ConvergeSynthesizer {
  /**
   * Synthesize verification code from task context
   */
  async synthesize(request: ConvergeSynthesisRequest): Promise<SynthesizedVerification> {
    console.log(`[ConvergeSynthesizer] Synthesizing verification for task: ${request.taskContext.id}`);

    // Build synthesis prompt
    const prompt = this.buildSynthesisPrompt(request);

    // In real impl, would call LLM (Claude) to generate verification code
    // For now, generate a template verification
    const code = this.generateTemplateVerification(request);

    // Validate generated code
    const validation = this.validateVerificationCode(code);

    // Create metadata
    const metadata: ConvergeMetadata = {
      id: `verify-${request.taskContext.id}`,
      synthesizedAt: new Date().toISOString(),
      source: request.config.from || 'description',
      config: request.config,
      refinementCount: 0,
      cacheKey: request.config.cacheKey,
    };

    return {
      code,
      metadata,
      validation,
    };
  }

  /**
   * Build prompt for LLM to synthesize verification
   */
  private buildSynthesisPrompt(request: ConvergeSynthesisRequest): string {
    const { taskContext, config } = request;

    let prompt = `Generate a validation suite for this task:\n\n`;

    prompt += `Task: ${taskContext.title}\n`;

    if (taskContext.description) {
      prompt += `Description: ${taskContext.description}\n`;
    }

    if (config.from === 'task-prompt' && taskContext.prompt) {
      prompt += `Prompt: ${taskContext.prompt}\n`;
    }

    if (config.from === 'inputs' && taskContext.inputs) {
      prompt += `Inputs: ${taskContext.inputs.join(', ')}\n`;
    }

    if (config.from === 'outputs' && taskContext.outputs) {
      prompt += `Outputs: ${taskContext.outputs.join(', ')}\n`;
    }

    if (config.prompt) {
      prompt += `\nValidation Requirements:\n${config.prompt}\n`;
    }

    prompt += `\nGenerate JavaScript validation code that:\n`;
    prompt += `1. Has access to: file.read(), file.exists(), file.glob(), shell.run()\n`;
    prompt += `2. Reports issues via: issues.push({ message, severity, file?, line? })\n`;
    prompt += `3. Returns Promise<ConvergeIssue[]>\n`;
    prompt += `4. Uses no imports or requires\n`;
    prompt += `5. Validation strictness: ${config.strictness || 0.8}\n`;

    return prompt;
  }

  /**
   * Generate a template verification (placeholder for LLM generation)
   */
  private generateTemplateVerification(request: ConvergeSynthesisRequest): string {
    const { taskContext } = request;

    return `/**
 * Auto-generated validation suite for: ${taskContext.title}
 */

async function validate(file, shell, issues) {
  // Validate outputs exist
  ${this.generateOutputValidation(taskContext.outputs)}

  // Validate inputs were used
  ${this.generateInputValidation(taskContext.inputs)}

  return issues;
}
`;
  }

  /**
   * Generate output validation code
   */
  private generateOutputValidation(outputs?: string[]): string {
    if (!outputs || outputs.length === 0) {
      return '// No outputs to validate';
    }

    return outputs
      .map(
        (output) => `
  if (!(await file.exists('${output}'))) {
    issues.push({
      message: 'Required output missing: ${output}',
      severity: 'error',
      file: '${output}',
    });
  }`
      )
      .join('\n');
  }

  /**
   * Generate input validation code
   */
  private generateInputValidation(inputs?: string[]): string {
    if (!inputs || inputs.length === 0) {
      return '// No inputs to validate';
    }

    return `// Validate inputs exist
  ${inputs.map((input) => `// Check: ${input}`).join('\n  ')}`;
  }

  /**
   * Validate verification code for security and correctness
   */
  private validateVerificationCode(code: string): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Check for forbidden patterns
    if (code.includes('require(')) {
      errors.push('Verification code cannot use require()');
    }

    if (code.includes('import ')) {
      errors.push('Verification code cannot use import');
    }

    if (code.includes('eval(')) {
      errors.push('Verification code cannot use eval()');
    }

    if (code.includes('Function(')) {
      errors.push('Verification code cannot use Function constructor');
    }

    // Ensure validate function exists
    if (!code.includes('function validate') && !code.includes('validate =')) {
      errors.push('Verification code must define a validate function');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * Create a new converge synthesizer
 */
export function createConvergeSynthesizer(): ConvergeSynthesizer {
  return new ConvergeSynthesizer();
}
