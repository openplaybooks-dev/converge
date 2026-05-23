#!/usr/bin/env node
/**
 * Analyze code complexity across the Converge monorepo.
 *
 * Outputs complexity-report.json with per-file metrics:
 * - LoC (lines of code)
 * - Cyclomatic complexity (sum of all functions)
 * - Import depth (how many levels deep in dependency tree)
 * - Export count
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

/**
 * Calculate cyclomatic complexity for a TypeScript file.
 * Simple heuristic: count decision points (if, for, while, case, &&, ||, ?, catch)
 */
function calculateComplexity(content) {
  const decisionPoints = [
    /\bif\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /&&/g,
    /\|\|/g,
    /\?/g,
  ];

  let complexity = 1; // Base complexity
  for (const pattern of decisionPoints) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Count lines of code (excluding blank lines and comments)
 */
function countLoC(content) {
  const lines = content.split('\n');
  let loc = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip blank lines
    if (trimmed === '') continue;

    // Handle block comments
    if (trimmed.startsWith('/*')) {
      inBlockComment = true;
    }
    if (inBlockComment) {
      if (trimmed.endsWith('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // Skip single-line comments
    if (trimmed.startsWith('//')) continue;

    loc++;
  }

  return loc;
}

/**
 * Count import statements (rough proxy for import depth)
 */
function countImports(content) {
  const importMatches = content.match(/^import\s+/gm);
  return importMatches ? importMatches.length : 0;
}

/**
 * Count export statements
 */
function countExports(content) {
  const exportMatches = content.match(/^export\s+/gm);
  return exportMatches ? exportMatches.length : 0;
}

/**
 * Recursively find all TypeScript files in a directory
 */
function findTsFiles(dir, files = []) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, .converge
      if (entry === 'node_modules' || entry === 'dist' || entry === '.converge') {
        continue;
      }
      findTsFiles(fullPath, files);
    } else if (stat.isFile()) {
      const ext = extname(entry);
      // Include .ts and .tsx, exclude .test.ts and .spec.ts
      if ((ext === '.ts' || ext === '.tsx') &&
          !entry.endsWith('.test.ts') &&
          !entry.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = relative(ROOT, filePath);

  return {
    path: relativePath,
    loc: countLoC(content),
    complexity: calculateComplexity(content),
    imports: countImports(content),
    exports: countExports(content),
  };
}

/**
 * Main analysis
 */
function main() {
  console.log('🔍 Analyzing code complexity...');

  const packagesDir = join(ROOT, 'packages');
  const files = findTsFiles(packagesDir);

  console.log(`📊 Found ${files.length} TypeScript files`);

  const results = files.map(analyzeFile);

  // Calculate summary stats
  const totalLoc = results.reduce((sum, r) => sum + r.loc, 0);
  const totalComplexity = results.reduce((sum, r) => sum + r.complexity, 0);
  const avgComplexity = totalComplexity / results.length;

  // Find high-complexity files (top 10%)
  const sortedByComplexity = [...results].sort((a, b) => b.complexity - a.complexity);
  const highComplexityThreshold = sortedByComplexity[Math.floor(results.length * 0.1)]?.complexity || 0;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: results.length,
      totalLoc,
      totalComplexity,
      avgComplexity: Math.round(avgComplexity * 10) / 10,
      highComplexityThreshold,
    },
    files: results,
  };

  const outputPath = join(ROOT, 'complexity-report.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`✅ Complexity report written to ${relative(ROOT, outputPath)}`);
  console.log(`📈 Total LoC: ${totalLoc.toLocaleString()}`);
  console.log(`📈 Avg complexity: ${report.summary.avgComplexity}`);
  console.log(`📈 High complexity threshold (top 10%): ${highComplexityThreshold}`);
}

main();
