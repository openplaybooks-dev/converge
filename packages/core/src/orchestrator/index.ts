/**
 * Orchestrator Module V2
 *
 * Exports the convergence-based orchestration system.
 */

// Convergence Loop
export {
  ConvergenceOrchestrator,
  createConvergenceOrchestrator,
  DEFAULT_CONVERGENCE_CONFIG,
} from "./convergence.ts";

export type { ConvergenceConfig, ConvergenceResult } from "./convergence.ts";

// Project Orchestration
export {
  ProjectOrchestratorV2,
  createProjectOrchestratorV2,
} from "./project-orchestrator.ts";

export type { ProjectOrchestrationResult } from "./project-orchestrator.ts";
