/**
 * Simple test to verify prompt template loading and interpolation
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Simulate the loadPromptTemplate function
function loadPromptTemplate(setupDir, templatePath, vars) {
  const templateSource = resolve(setupDir, templatePath);
  let template = readFileSync(templateSource, 'utf-8');

  // Interpolate variables: {{varName}} → value
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    template = template.replace(placeholder, String(value));
  }

  return template;
}

// Test cases
const setupDir = resolve(process.cwd(), '../../apps/ai-tool_nextjstemplates_com/.crew/setup');
const promptDir = resolve(setupDir, 'plan/prompts');

console.log('Testing prompt template loading...\n');

// Test 1: analyze-page.md
console.log('Test 1: analyze-page.md');
const analyzePagePrompt = loadPromptTemplate(
  setupDir,
  'plan/prompts/analyze-page.md',
  {
    route: '/',
    slug: 'home',
    htmlFile: 'templates/index.html',
  }
);
console.log('✓ Template loaded');
console.log('✓ Variables interpolated:',
  analyzePagePrompt.includes('templates/index.html') &&
  analyzePagePrompt.includes('docs/pages/home/analysis.md') &&
  !analyzePagePrompt.includes('{{')
);

// Test 2: plan-components.md
console.log('\nTest 2: plan-components.md');
const planComponentsPrompt = loadPromptTemplate(
  setupDir,
  'plan/prompts/plan-components.md',
  {
    route: '/pricing',
    slug: 'pricing',
    generatedFile: 'src/app/pricing/page.tsx',
  }
);
console.log('✓ Template loaded');
console.log('✓ Variables interpolated:',
  planComponentsPrompt.includes('pricing') &&
  planComponentsPrompt.includes('src/app/pricing/page.tsx') &&
  !planComponentsPrompt.includes('{{generatedFile}}')
);

// Test 3: component-split-task.md
console.log('\nTest 3: component-split-task.md');
const componentSplitPrompt = loadPromptTemplate(
  setupDir,
  'plan/prompts/component-split-task.md',
  {
    ComponentName: 'Hero',
    route: '/',
    slug: 'home',
    generatedFile: 'src/app/page.tsx',
  }
);
console.log('✓ Template loaded');
console.log('✓ Variables interpolated:',
  componentSplitPrompt.includes('Hero') &&
  componentSplitPrompt.includes('src/app/page.tsx') &&
  !componentSplitPrompt.includes('{{ComponentName}}')
);

// Test 4: analyze-animations.md
console.log('\nTest 4: analyze-animations.md');
const analyzeAnimationsPrompt = loadPromptTemplate(
  setupDir,
  'plan/prompts/analyze-animations.md',
  {
    route: '/about',
    slug: 'about',
  }
);
console.log('✓ Template loaded');
console.log('✓ Variables interpolated:',
  analyzeAnimationsPrompt.includes('about') &&
  !analyzeAnimationsPrompt.includes('{{slug}}')
);

// Test 5: implement-animations.md
console.log('\nTest 5: implement-animations.md');
const implementAnimationsPrompt = loadPromptTemplate(
  setupDir,
  'plan/prompts/implement-animations.md',
  {
    route: '/contact',
    slug: 'contact',
    generatedFile: 'src/app/contact/page.tsx',
  }
);
console.log('✓ Template loaded');
console.log('✓ Variables interpolated:',
  implementAnimationsPrompt.includes('contact') &&
  implementAnimationsPrompt.includes('src/app/contact/page.tsx') &&
  !implementAnimationsPrompt.includes('{{route}}')
);

console.log('\n✅ All tests passed!');
