/**
 * MissingWbsScriptStrategy
 *
 * Handles gaps where a WBS script (wbs.js) is missing.
 * This typically happens when a task was seeded from a template but the wbs.js
 * wasn't copied (bug in the seeder).
 *
 * Gap kind: 'wbs-script-error' with missing script
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import type { Gap } from "../../gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";

export class MissingWbsScriptStrategy implements FixStrategy {
  readonly name = "missing-wbs-script";

  canHandle(gap: Gap): boolean {
    // Handle wbs-script-error gaps where the script is actually missing
    if (gap.metadata?.gapKind !== "wbs-script-error") {
      return false;
    }
    const errorMessage = (gap.metadata?.errorMessage as string) ?? "";
    return (
      errorMessage.includes("WBS script not found") ||
      errorMessage.includes("wbs.js") && errorMessage.includes("not found")
    );
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir } = ctx;

    const scriptPath = gap.metadata?.scriptPath as string | undefined;
    const errorMessage = (gap.metadata?.errorMessage as string) ?? "";

    if (!scriptPath) {
      return { success: false, reason: "No scriptPath in gap metadata" };
    }

    // Extract the task directory from the error or scriptPath
    const taskDirMatch = errorMessage.match(/Task directory:\s*(.+)/);
    const taskDir = taskDirMatch?.[1] ?? dirname(scriptPath);

    if (!taskDir || !existsSync(taskDir)) {
      return {
        success: false,
        reason: `Task directory not found: ${taskDir}`,
      };
    }

    // Check for TASK.md to understand what WBS is needed
    const taskMdPath = join(taskDir, "TASK.md");
    if (!existsSync(taskMdPath)) {
      return {
        success: false,
        reason: `TASK.md not found in task directory: ${taskDir}`,
      };
    }

    console.log(`   [missing-wbs-script] Analyzing TASK.md: ${taskMdPath}`);

    let taskMdContent: string;
    try {
      taskMdContent = await readFile(taskMdPath, "utf-8");
    } catch (err: any) {
      return {
        success: false,
        reason: `Cannot read TASK.md: ${err.message}`,
      };
    }

    // Check if TASK.md has a wbs section
    if (!taskMdContent.includes("wbs:")) {
      return {
        success: false,
        reason: "TASK.md has no wbs section - no script needed",
      };
    }

    // Try to find a template that matches this task's pattern
    // Look for wbs.js in parent template directories
    const templateWbsPath = await this.findTemplateWbsJs(taskDir, projectDir);

    if (templateWbsPath) {
      console.log(`   [missing-wbs-script] Found template: ${templateWbsPath}`);
      
      try {
        const templateContent = await readFile(templateWbsPath, "utf-8");
        const destPath = join(taskDir, "wbs.js");
        
        // Ensure directory exists
        await mkdir(dirname(destPath), { recursive: true });
        
        // Write the wbs.js
        await writeFile(destPath, templateContent, "utf-8");
        
        console.log(`   [missing-wbs-script] Created: ${destPath}`);
        return {
          success: true,
          reason: "Copied wbs.js from template",
          retryMode: "full",
        };
      } catch (err: any) {
        return {
          success: false,
          reason: `Failed to copy template: ${err.message}`,
        };
      }
    }

    // No template found - generate a basic wbs.js based on TASK.md content
    console.log(`   [missing-wbs-script] No template found, generating basic wbs.js`);
    
    const generatedWbs = this.generateBasicWbsJs(taskMdContent);
    const destPath = join(taskDir, "wbs.js");
    
    try {
      await writeFile(destPath, generatedWbs, "utf-8");
      console.log(`   [missing-wbs-script] Created basic wbs.js: ${destPath}`);
      return {
        success: true,
        reason: "Generated basic wbs.js from TASK.md",
        retryMode: "full",
      };
    } catch (err: any) {
      return {
        success: false,
        reason: `Failed to write wbs.js: ${err.message}`,
      };
    }
  }

  /**
   * Try to find a matching template wbs.js by looking at:
   * 1. Parent task's template directory
   * 2. Common template patterns
   */
  private async findTemplateWbsJs(
    taskDir: string,
    projectDir: string,
  ): Promise<string | null> {
    // Check if task is in a tasks/ subdirectory (indicates it was seeded)
    // Pattern: .../tasks/XXX-screen/tasks/XXX-05-split/
    const tasksMatch = taskDir.match(/tasks[\/][^\/]+[\/]tasks[\/][^\/]+$/);
    
    if (tasksMatch) {
      // Look for wbs/templates in the grandparent directory
      const grandparentDir = taskDir.split(/tasks[\/][^\/]+[\/]tasks/)[0];
      const templatePatterns = [
        join(grandparentDir, "wbs", "templates", "screen", "tasks", "{{prefix}}-05-split", "wbs.js"),
        join(grandparentDir, "wbs", "templates", "screen", "tasks", "{{prefix}}-06-lift", "wbs.js"),
        join(grandparentDir, "wbs", "templates", "screen", "tasks", "{{prefix}}-01-spec", "wbs.js"),
        join(grandparentDir, "wbs", "templates", "screen", "tasks", "{{prefix}}-02-design", "wbs.js"),
        join(grandparentDir, "wbs", "templates", "screen", "tasks", "{{prefix}}-03-convert", "wbs.js"),
        join(grandparentDir, "wbs", "templates", "screen", "tasks", "{{prefix}}-04-analyze", "wbs.js"),
      ];

      // Extract prefix from task dir (e.g., "002-05-split" -> "002")
      const dirName = taskDir.split(/[\\/]/).pop() ?? "";
      const prefix = dirName.split("-")[0]; // e.g., "002"
      const taskType = dirName.includes("split") 
        ? "05-split" 
        : dirName.includes("lift") 
        ? "06-lift"
        : dirName.includes("spec")
        ? "01-spec"
        : dirName.includes("design")
        ? "02-design"
        : dirName.includes("convert")
        ? "03-convert"
        : dirName.includes("analyze")
        ? "04-analyze"
        : null;

      if (taskType) {
        const specificTemplate = join(
          grandparentDir, 
          "wbs", "templates", "screen", "tasks", 
          `{{prefix}}-${taskType}`, 
          "wbs.js"
        );
        
        // Try the actual path with prefix substituted
        const actualPath = specificTemplate.replace("{{prefix}}", prefix);
        if (existsSync(actualPath)) {
          return actualPath;
        }

        // Try the {{prefix}} literal path
        if (existsSync(specificTemplate)) {
          return specificTemplate;
        }
      }
    }

    // Look for sibling tasks that have wbs.js (pattern matching)
    const parentDir = dirname(taskDir);
    try {
      const { readdir } = await import("node:fs/promises");
      const entries = await readdir(parentDir, { withFileTypes: true });
      
      // Find sibling task directories
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const siblingDir = join(parentDir, entry.name);
        const siblingWbsPath = join(siblingDir, "wbs.js");
        
        if (existsSync(siblingWbsPath)) {
          // Check if this sibling task has similar TASK.md structure
          const siblingTaskMd = join(siblingDir, "TASK.md");
          const currentTaskMd = join(taskDir, "TASK.md");
          
          if (await this.hasSimilarStructure(siblingTaskMd, currentTaskMd)) {
            return siblingWbsPath;
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  /**
   * Check if two TASK.md files have similar structure (same wbs type, similar vars)
   */
  private async hasSimilarStructure(
    path1: string,
    path2: string,
  ): Promise<boolean> {
    try {
      const content1 = await readFile(path1, "utf-8");
      const content2 = await readFile(path2, "utf-8");

      // Compare wbs type
      const wbsMatch1 = content1.match(/wbs:\s*\n\s*type:\s*(\w+)/);
      const wbsMatch2 = content2.match(/wbs:\s*\n\s*type:\s*(\w+)/);

      if (wbsMatch1 && wbsMatch2) {
        return wbsMatch1[1] === wbsMatch2[1];
      }

      // Compare tags
      const tags1 = content1.match(/tags:\s*\n((?:\s+-\s+\S+\n?)+)/);
      const tags2 = content2.match(/tags:\s*\n((?:\s+-\s+\S+\n?)+)/);

      if (tags1 && tags2) {
        // Simple tag overlap check
        const tagList1 = tags1[1].match(/-\s+(\S+)/g) ?? [];
        const tagList2 = tags2[1].match(/-\s+(\S+)/g) ?? [];
        return tagList1.some((t) => tagList2.includes(t));
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generate a basic wbs.js based on TASK.md content
   */
  private generateBasicWbsJs(taskMdContent: string): string {
    // Extract vars from frontmatter
    const varsMatch = taskMdContent.match(/vars:\s*\n((?:\s+\w+:.+\n?)+)/);
    const hasWidgetsJson = taskMdContent.includes("widgets.jsonl");
    const isSplit = taskMdContent.includes("split");
    const isLift = taskMdContent.includes("lift");
    const isSpec = taskMdContent.includes("spec");
    const isDesign = taskMdContent.includes("design");
    const isConvert = taskMdContent.includes("convert");
    const isAnalyze = taskMdContent.includes("analyze");

    // For split/lift tasks with widgets.jsonl
    if ((isSplit || isLift) && hasWidgetsJson) {
      return `// Auto-generated WBS script for ${isSplit ? "split" : "lift"} task
import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const { localWidgetsDir, widgetsJsonPath, prefix } = ctx.vars;
  const filePath = join(ctx.projectDir, widgetsJsonPath);

  let lines;
  try {
    lines = readFileSync(filePath, 'utf-8').split('\\n').filter(l => l.trim());
  } catch (err) {
    ctx.log.warn('No widgets.jsonl found: ' + err.message);
    return;
  }

  if (lines.length === 0) {
    ctx.log.info('No widgets to ${isSplit ? "split" : "lift"}');
    return;
  }

  const widgets = lines.map(l => JSON.parse(l));
  const snakeName = (name) => name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

  for (let i = 0; i < widgets.length; i++) {
    const widget = widgets[i];
    const idx = String(i + 1).padStart(3, '0');
    const action = '${isSplit ? "split" : "lift"}';
    const id = prefix + '-' + action + '-' + widget.name;
    
    await ctx.spawn({
      id,
      title: '${isSplit ? "Split" : "Lift"}: ' + widget.name,
      template: '.converge/playbooks/default/tasks/03-build-screens/wbs/templates/screen/tasks/{{prefix}}-${isSplit ? '05-split' : '06-lift'}/tasks/subtask/TASK.md',
      vars: {
        ...ctx.vars,
        widgetName: widget.name,
        widgetSnakeName: snakeName(widget.name),
        widgetIndex: idx,
        widgetType: widget.type || 'stateless',
      }
    });
  }
  
  ctx.log.info('Spawned ' + widgets.length + ' widget ${isSplit ? "split" : "lift"} task(s)');
}
`;
    }

    // Default basic WBS script
    return `// Auto-generated WBS script
export async function run(ctx) {
  ctx.log.info('WBS script running for task: ' + ctx.vars?.title);
  
  // This is a placeholder - the task should have specific WBS logic
  // or use a template reference in TASK.md
}
`;
  }
}
