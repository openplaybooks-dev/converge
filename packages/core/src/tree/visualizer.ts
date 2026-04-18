/**
 * Tree Visualizer
 *
 * ASCII tree visualization of project structure with status indicators.
 * Shows epics, tasks, subtasks with completion status.
 */

import type { Unit } from "../unit/index.ts";
import type { Cursor } from "../storage/types.ts";
import { existsSync } from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/**
 * Node status for visualization
 */
export type NodeStatus = "pending" | "active" | "completed" | "failed";

/**
 * Tree node for visualization
 */
export interface TreeNode {
  id: string;
  title?: string;
  status: NodeStatus;
  path: string;
  depth: number;
  children: TreeNode[];
  isCursor?: boolean; // Mark current cursor position
}

/**
 * Visualization options
 */
export interface VisualizationOptions {
  /** Show file paths */
  showPaths?: boolean;

  /** Show descriptions */
  showDescriptions?: boolean;

  /** Show only incomplete nodes */
  showOnlyIncomplete?: boolean;

  /** Maximum depth to show */
  maxDepth?: number;

  /** Current cursor position */
  cursor?: Cursor;

  /** Completed unit IDs */
  completedUnits?: Set<string>;

  /** Color output */
  useColors?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Tree Visualizer                                                   */
/* ------------------------------------------------------------------ */

/**
 * Tree visualizer for project structure
 */
export class TreeVisualizer {
  private options: Omit<Required<VisualizationOptions>, "cursor"> & {
    cursor?: Cursor;
  };

  constructor(options: VisualizationOptions = {}) {
    this.options = {
      showPaths: options.showPaths ?? false,
      showDescriptions: options.showDescriptions ?? false,
      showOnlyIncomplete: options.showOnlyIncomplete ?? false,
      maxDepth: options.maxDepth ?? Infinity,
      cursor: options.cursor ?? undefined,
      completedUnits: options.completedUnits ?? new Set(),
      useColors: options.useColors ?? true,
    };
  }

  /**
   * Visualize tree starting from root unit
   */
  async visualize(rootUnit: Unit): Promise<string> {
    const tree = await this.buildTree(rootUnit, 0);
    return this.renderTree(tree);
  }

  /**
   * Build tree structure from unit hierarchy
   */
  private async buildTree(unit: Unit, depth: number): Promise<TreeNode> {
    const node: TreeNode = {
      id: unit.id,
      title: unit.title,
      status: this.getUnitStatus(unit),
      path: unit.path,
      depth,
      children: [],
      isCursor: this.isCursorPosition(unit),
    };

    // Stop at max depth
    if (depth >= this.options.maxDepth) {
      return node;
    }

    // Discover and build children
    if (!unit.children) {
      unit.children = await (unit as any).discoverChildren([], true);
    }

    if (unit.children) {
      for (const child of unit.children) {
        const childNode = await this.buildTree(child, depth + 1);

        // Filter if showing only incomplete
        if (
          this.options.showOnlyIncomplete &&
          childNode.status === "completed"
        ) {
          continue;
        }

        node.children.push(childNode);
      }
    }

    return node;
  }

  /**
   * Render tree as ASCII art
   */
  private renderTree(root: TreeNode): string {
    const lines: string[] = [];

    lines.push(""); // Empty line at start
    lines.push(this.renderHeader());
    lines.push("");

    this.renderNode(root, "", true, lines);

    lines.push("");
    lines.push(this.renderLegend());
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Render tree header
   */
  private renderHeader(): string {
    return this.color("🌳 Project Tree", "bold");
  }

  /**
   * Render legend
   */
  private renderLegend(): string {
    const legend = [
      this.color("Legend:", "bold"),
      `  ${this.statusIcon("pending")} Pending`,
      `  ${this.statusIcon("active")} Active`,
      `  ${this.statusIcon("completed")} Completed`,
      `  ${this.statusIcon("failed")} Failed`,
      `  ${this.color("→", "cyan")} Current cursor position`,
    ];

    return legend.join("\n");
  }

  /**
   * Render a single node
   */
  private renderNode(
    node: TreeNode,
    prefix: string,
    isLast: boolean,
    lines: string[],
  ): void {
    // Build node line
    const connector = isLast ? "└─ " : "├─ ";
    const statusIcon = this.statusIcon(node.status);
    const cursorMark = node.isCursor ? this.color(" → ", "cyan") : "   ";
    const title = node.title || node.id;
    const titleColor =
      node.status === "completed"
        ? "green"
        : node.status === "failed"
          ? "red"
          : "white";

    let line = `${prefix}${connector}${statusIcon} ${this.color(title, titleColor)}${cursorMark}`;

    // Add path if enabled
    if (this.options.showPaths) {
      line += this.color(` (${this.abbreviatePath(node.path)})`, "dim");
    }

    lines.push(line);

    // Add description if enabled
    if (this.options.showDescriptions && (node as any).description) {
      const descPrefix = isLast ? "    " : "│   ";
      lines.push(
        `${prefix}${descPrefix}${this.color((node as any).description, "dim")}`,
      );
    }

    // Render children
    if (node.children.length > 0) {
      const childPrefix = prefix + (isLast ? "    " : "│   ");

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childIsLast = i === node.children.length - 1;
        this.renderNode(child, childPrefix, childIsLast, lines);
      }
    }
  }

  /**
   * Get unit status
   */
  private getUnitStatus(unit: Unit): NodeStatus {
    // Check if completed
    if (this.options.completedUnits.has(unit.id)) {
      return "completed";
    }

    // Check if current cursor
    if (this.isCursorPosition(unit)) {
      return "active";
    }

    // Check if outputs exist (heuristic for completion)
    if (unit.outputs && unit.outputs.length > 0) {
      const projectDir = (unit as any).getProjectRoot();
      const allOutputsExist = unit.outputs.every((output) => {
        const outputPath = path.join(projectDir, output);
        return existsSync(outputPath);
      });

      if (allOutputsExist) {
        return "completed";
      }
    }

    return "pending";
  }

  /**
   * Check if unit is at cursor position
   */
  private isCursorPosition(unit: Unit): boolean {
    if (!this.options.cursor) return false;

    const cursorId = this.options.cursor.path[this.options.cursor.depth];
    return unit.id === cursorId;
  }

  /**
   * Get status icon
   */
  private statusIcon(status: NodeStatus): string {
    switch (status) {
      case "pending":
        return this.color("○", "gray");
      case "active":
        return this.color("◐", "yellow");
      case "completed":
        return this.color("●", "green");
      case "failed":
        return this.color("✗", "red");
    }
  }

  /**
   * Abbreviate path for display
   */
  private abbreviatePath(fullPath: string): string {
    // Show only relative path from .converge/
    const convergeIndex = fullPath.indexOf(".converge/");
    if (convergeIndex !== -1) {
      return fullPath.slice(convergeIndex);
    }
    return fullPath;
  }

  /**
   * Apply color to text
   */
  private color(text: string, color: string): string {
    if (!this.options.useColors) return text;

    const colors: Record<string, string> = {
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      cyan: "\x1b[36m",
      gray: "\x1b[90m",
      white: "\x1b[37m",
      reset: "\x1b[0m",
    };

    const colorCode = colors[color] || "";
    return `${colorCode}${text}${colors.reset}`;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Quick tree visualization for CLI
 */
export async function visualizeTree(
  rootUnit: Unit,
  options?: VisualizationOptions,
): Promise<void> {
  const visualizer = new TreeVisualizer(options);
  const output = await visualizer.visualize(rootUnit);
  console.log(output);
}

/**
 * Visualize tree with cursor position
 */
export async function visualizeTreeWithCursor(
  rootUnit: Unit,
  cursor: Cursor,
  completedUnits: Set<string>,
): Promise<void> {
  const visualizer = new TreeVisualizer({
    cursor,
    completedUnits,
    showPaths: false,
    useColors: true,
  });
  const output = await visualizer.visualize(rootUnit);
  console.log(output);
}
