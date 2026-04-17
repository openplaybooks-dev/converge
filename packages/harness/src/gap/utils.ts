/**
 * Gap Utilities
 *
 * Helper functions for working with gaps.
 */

import type { Gap, GapPriority, PrioritizationStrategy } from './types.ts';
import { v4 as uuidv4 } from 'uuid';

/* ------------------------------------------------------------------ */
/*  Gap Creation Helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Create a new gap with generated ID
 */
export function createGap(params: Omit<Gap, 'id' | 'detected' | 'resolved'>): Gap {
  return {
    id: uuidv4(),
    detected: new Date().toISOString(),
    resolved: false,
    ...params,
  };
}

/**
 * Mark a gap as resolved
 */
export function resolveGap(gap: Gap): Gap {
  return {
    ...gap,
    resolved: true,
    resolvedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Gap Filtering                                                     */
/* ------------------------------------------------------------------ */

/**
 * Filter gaps by type
 */
export function filterByType(gaps: Gap[], type: Gap['type']): Gap[] {
  return gaps.filter((g) => g.type === type);
}

/**
 * Filter gaps by level
 */
export function filterByLevel(gaps: Gap[], level: Gap['level']): Gap[] {
  return gaps.filter((g) => g.level === level);
}

/**
 * Filter gaps by severity
 */
export function filterBySeverity(gaps: Gap[], severity: Gap['severity']): Gap[] {
  return gaps.filter((g) => g.severity === severity);
}

/**
 * Filter unresolved gaps
 */
export function filterUnresolved(gaps: Gap[]): Gap[] {
  return gaps.filter((g) => !g.resolved);
}

/* ------------------------------------------------------------------ */
/*  Gap Prioritization                                                */
/* ------------------------------------------------------------------ */

/**
 * Prioritize gaps by severity
 */
export function prioritizeBySeverity(gaps: Gap[]): GapPriority[] {
  const severityScores: Record<string, number> = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
  };

  return gaps.map((gap) => ({
    gap,
    score: severityScores[gap.severity || 'medium'] || 50,
    reason: `Severity: ${gap.severity || 'medium'}`,
  }));
}

/**
 * Prioritize gaps by custom strategy
 */
export function prioritizeGaps(
  gaps: Gap[],
  strategy: PrioritizationStrategy = 'severity'
): GapPriority[] {
  switch (strategy) {
    case 'severity':
      return prioritizeBySeverity(gaps);

    case 'cost':
      // Cheaper gaps first (heuristic: structural < semantic < quality)
      const costScores: Record<string, number> = {
        structural: 90, // Easy to fix
        semantic: 50, // Medium difficulty
        quality: 30, // Can be deferred
        integration: 70,
      };
      return gaps
        .map((gap) => ({
          gap,
          score: costScores[gap.type] || 50,
          reason: `Cost estimate: ${gap.type}`,
        }))
        .sort((a, b) => b.score - a.score);

    case 'impact':
      // Higher impact first (heuristic: project > epic > task)
      const impactScores: Record<string, number> = {
        project: 100,
        epic: 75,
        task: 50,
      };
      return gaps
        .map((gap) => ({
          gap,
          score: impactScores[gap.level] || 50,
          reason: `Impact level: ${gap.level}`,
        }))
        .sort((a, b) => b.score - a.score);

    case 'dependencies':
      // Blocking gaps first (heuristic: gaps at higher levels block lower levels)
      return prioritizeGaps(gaps, 'impact');

    case 'custom':
      // Return as-is, user will provide custom scoring
      return gaps.map((gap) => ({
        gap,
        score: 50,
        reason: 'Custom prioritization',
      }));

    default:
      return prioritizeBySeverity(gaps);
  }
}

/**
 * Sort gaps by priority scores
 */
export function sortByPriority(priorities: GapPriority[]): GapPriority[] {
  return [...priorities].sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ */
/*  Gap Comparison                                                    */
/* ------------------------------------------------------------------ */

/**
 * Check if two gaps are equal (by ID)
 */
export function gapsEqual(a: Gap, b: Gap): boolean {
  return a.id === b.id;
}

/**
 * Find gaps that exist in A but not in B
 */
export function gapsDifference(a: Gap[], b: Gap[]): Gap[] {
  return a.filter((gapA) => !b.some((gapB) => gapsEqual(gapA, gapB)));
}

/**
 * Find gaps that exist in both A and B
 */
export function gapsIntersection(a: Gap[], b: Gap[]): Gap[] {
  return a.filter((gapA) => b.some((gapB) => gapsEqual(gapA, gapB)));
}

/* ------------------------------------------------------------------ */
/*  Gap Statistics                                                    */
/* ------------------------------------------------------------------ */

/**
 * Calculate gap statistics
 */
export function calculateGapStats(gaps: Gap[]): {
  total: number;
  byType: Record<string, number>;
  byLevel: Record<string, number>;
  bySeverity: Record<string, number>;
  resolved: number;
  unresolved: number;
} {
  const byType: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let resolved = 0;
  let unresolved = 0;

  for (const gap of gaps) {
    byType[gap.type] = (byType[gap.type] || 0) + 1;
    byLevel[gap.level] = (byLevel[gap.level] || 0) + 1;
    if (gap.severity) {
      bySeverity[gap.severity] = (bySeverity[gap.severity] || 0) + 1;
    }
    if (gap.resolved) {
      resolved++;
    } else {
      unresolved++;
    }
  }

  return {
    total: gaps.length,
    byType,
    byLevel,
    bySeverity,
    resolved,
    unresolved,
  };
}

/**
 * Format gap statistics as string
 */
export function formatGapStats(
  stats: ReturnType<typeof calculateGapStats>
): string {
  const lines: string[] = [
    `Gap Statistics`,
    `─────────────────`,
    ``,
    `Total: ${stats.total}`,
    `Resolved: ${stats.resolved}`,
    `Unresolved: ${stats.unresolved}`,
    ``,
    `By Type:`,
  ];

  for (const [type, count] of Object.entries(stats.byType)) {
    lines.push(`  ${type}: ${count}`);
  }

  lines.push(``);
  lines.push(`By Level:`);
  for (const [level, count] of Object.entries(stats.byLevel)) {
    lines.push(`  ${level}: ${count}`);
  }

  if (Object.keys(stats.bySeverity).length > 0) {
    lines.push(``);
    lines.push(`By Severity:`);
    for (const [severity, count] of Object.entries(stats.bySeverity)) {
      lines.push(`  ${severity}: ${count}`);
    }
  }

  return lines.join('\n');
}
