/**
 * @converge/navigator
 *
 * AI-driven dynamic graph navigator for autonomous systems.
 * Exports core types, graph implementation, and convergence loop.
 */

export { NavigatorGraph } from "./graph.js";
export { PredicateRegistry } from "./predicates.js";
export { converge } from "./navigator.js";
export type { ConvergeOptions, ConvergeResult } from "./navigator.js";
export type {
  BaseSnapshot,
  Graph,
  GraphNode,
  GraphEdge,
  NodeStatus,
  NodeOrigin,
  WalkResult,
  ActionHandler,
  GoalCondition,
  PredicateFn,
  PersistenceAdapter,
  ErrorRecoveryStrategy,
  ActionError,
  NavigatorMetrics,
  NavigatorEvent,
} from "./types.js";
