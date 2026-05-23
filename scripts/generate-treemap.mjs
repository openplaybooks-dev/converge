#!/usr/bin/env node
/**
 * Generate interactive D3.js treemap visualization of dead code and complexity.
 *
 * Reads:
 * - /tmp/knip-output.json (dead code detection)
 * - complexity-report.json (complexity metrics)
 *
 * Outputs:
 * - dead-code-report.html (self-contained interactive treemap)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

/**
 * Load and parse Knip output
 */
function loadKnipData() {
  try {
    const knipJson = readFileSync('/tmp/knip-output.json', 'utf-8');
    const data = JSON.parse(knipJson);

    // Build a set of files with dead code
    const deadFiles = new Set();
    const deadExports = new Map(); // file -> export names

    for (const issue of data.issues) {
      // Files that are completely unused
      if (issue.files && issue.files.length > 0) {
        for (const f of issue.files) {
          deadFiles.add(f.name);
        }
      }

      // Files with unused exports
      if (issue.exports && issue.exports.length > 0) {
        const file = issue.file;
        if (!deadExports.has(file)) {
          deadExports.set(file, []);
        }
        deadExports.get(file).push(...issue.exports.map(e => e.name));
      }
    }

    return { deadFiles, deadExports };
  } catch (err) {
    console.warn('⚠️  Could not load Knip data:', err.message);
    return { deadFiles: new Set(), deadExports: new Map() };
  }
}

/**
 * Load complexity report
 */
function loadComplexityData() {
  try {
    const complexityJson = readFileSync(join(ROOT, 'complexity-report.json'), 'utf-8');
    return JSON.parse(complexityJson);
  } catch (err) {
    console.error('❌ Could not load complexity report:', err.message);
    process.exit(1);
  }
}

/**
 * Build hierarchical tree structure for D3
 */
function buildTree(complexityData, deadFiles, deadExports) {
  const root = {
    name: 'converge',
    children: [],
  };

  // Group files by package
  const packages = new Map();

  for (const file of complexityData.files) {
    const parts = file.path.split('/');
    if (parts[0] !== 'packages') continue;

    const pkgName = parts[1];
    if (!packages.has(pkgName)) {
      packages.set(pkgName, []);
    }
    packages.get(pkgName).push(file);
  }

  // Build tree structure
  for (const [pkgName, files] of packages.entries()) {
    const pkgNode = {
      name: pkgName,
      children: [],
    };

    for (const file of files) {
      const isDead = deadFiles.has(file.path);
      const hasDeadExports = deadExports.has(file.path);

      pkgNode.children.push({
        name: file.path.split('/').pop(),
        path: file.path,
        value: file.loc,
        complexity: file.complexity,
        imports: file.imports,
        exports: file.exports,
        isDead,
        hasDeadExports,
        deadExportCount: hasDeadExports ? deadExports.get(file.path).length : 0,
      });
    }

    root.children.push(pkgNode);
  }

  return root;
}

/**
 * Generate HTML with embedded D3.js treemap
 */
function generateHtml(treeData, summary) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converge Dead Code Report</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #58a6ff;
    }
    .summary {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat {
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 12px;
      color: #8b949e;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 600;
    }
    .legend {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .legend-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .legend-items {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 3px;
    }
    #treemap {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      overflow: hidden;
    }
    .node {
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .node:hover {
      opacity: 0.8;
    }
    .node-label {
      font-size: 11px;
      fill: white;
      pointer-events: none;
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    }
    .tooltip {
      position: absolute;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      font-size: 12px;
      max-width: 300px;
      z-index: 1000;
    }
    .tooltip-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #58a6ff;
    }
    .tooltip-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .tooltip-label {
      color: #8b949e;
    }
    .dead-badge {
      display: inline-block;
      background: #da3633;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <h1>🔍 Converge Dead Code Report</h1>

  <div class="summary">
    <div class="stat">
      <div class="stat-label">Total Files</div>
      <div class="stat-value">${summary.totalFiles}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total LoC</div>
      <div class="stat-value">${summary.totalLoc.toLocaleString()}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Avg Complexity</div>
      <div class="stat-value">${summary.avgComplexity}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Dead Files</div>
      <div class="stat-value" style="color: #da3633">${summary.deadFiles}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Unused Exports</div>
      <div class="stat-value" style="color: #f85149">${summary.unusedExports}</div>
    </div>
  </div>

  <div class="legend">
    <div class="legend-title">Legend</div>
    <div class="legend-items">
      <div class="legend-item">
        <div class="legend-color" style="background: #238636"></div>
        <span>Low complexity (&lt;30)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #d29922"></div>
        <span>Medium complexity (30-80)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #da3633"></div>
        <span>High complexity (&gt;80)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #da3633; border: 3px solid #f85149"></div>
        <span>Dead file (unused)</span>
      </div>
    </div>
  </div>

  <div id="treemap"></div>
  <div class="tooltip" id="tooltip"></div>

  <script>
    const data = ${JSON.stringify(treeData)};

    const width = window.innerWidth - 40;
    const height = window.innerHeight - 400;

    const svg = d3.select('#treemap')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const tooltip = d3.select('#tooltip');

    // Color scale based on complexity
    const colorScale = d3.scaleLinear()
      .domain([0, 30, 80, 200])
      .range(['#238636', '#d29922', '#da3633', '#8b0000']);

    const treemap = d3.treemap()
      .size([width, height])
      .padding(1)
      .round(true);

    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    treemap(root);

    const nodes = svg.selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => \`translate(\${d.x0},\${d.y0})\`);

    nodes.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => colorScale(d.data.complexity || 0))
      .attr('stroke', d => d.data.isDead ? '#f85149' : '#30363d')
      .attr('stroke-width', d => d.data.isDead ? 3 : 1);

    nodes.append('text')
      .attr('class', 'node-label')
      .attr('x', 4)
      .attr('y', 14)
      .text(d => {
        const width = d.x1 - d.x0;
        if (width < 50) return '';
        return d.data.name.length > 20 ? d.data.name.slice(0, 17) + '...' : d.data.name;
      });

    nodes.on('mouseover', function(event, d) {
      const deadBadge = d.data.isDead ? '<span class="dead-badge">DEAD FILE</span>' : '';
      const exportsBadge = d.data.hasDeadExports ? \`<span class="dead-badge">\${d.data.deadExportCount} UNUSED EXPORTS</span>\` : '';

      tooltip
        .style('opacity', 1)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px')
        .html(\`
          <div class="tooltip-title">\${d.data.name}\${deadBadge}\${exportsBadge}</div>
          <div class="tooltip-row">
            <span class="tooltip-label">Path:</span>
            <span>\${d.data.path}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">LoC:</span>
            <span>\${d.data.value.toLocaleString()}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Complexity:</span>
            <span>\${d.data.complexity}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Imports:</span>
            <span>\${d.data.imports}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Exports:</span>
            <span>\${d.data.exports}</span>
          </div>
        \`);
    })
    .on('mouseout', function() {
      tooltip.style('opacity', 0);
    });
  </script>
</body>
</html>`;
}

/**
 * Main
 */
function main() {
  console.log('🎨 Generating treemap visualization...');

  const { deadFiles, deadExports } = loadKnipData();
  const complexityData = loadComplexityData();

  const treeData = buildTree(complexityData, deadFiles, deadExports);

  // Calculate summary stats
  const totalDeadFiles = deadFiles.size;
  const totalUnusedExports = Array.from(deadExports.values()).reduce((sum, arr) => sum + arr.length, 0);

  const summary = {
    ...complexityData.summary,
    deadFiles: totalDeadFiles,
    unusedExports: totalUnusedExports,
  };

  const html = generateHtml(treeData, summary);

  const outputPath = join(ROOT, 'dead-code-report.html');
  writeFileSync(outputPath, html);

  console.log(`✅ Treemap visualization written to dead-code-report.html`);
  console.log(`📊 Dead files: ${totalDeadFiles}`);
  console.log(`📊 Unused exports: ${totalUnusedExports}`);
  console.log(`\n💡 Open dead-code-report.html in your browser to explore the visualization`);
}

main();
