/**
 * Cleanup Command
 *
 * Removes orphaned journal directories for tasks that no longer exist.
 */

import { Command } from "commander";
import { JournalCleanup } from "../checkpoint/cleanup.ts";

/**
 * Register cleanup command
 */
export function registerCleanupCommand(program: Command): void {
  program
    .command("cleanup")
    .description(
      "Remove orphaned journal directories for deleted/renamed tasks",
    )
    .option("-v, --verbose", "Show detailed cleanup information")
    .option("--dry-run", "Show what would be removed without actually removing")
    .action(async (options) => {
      const projectDir = process.cwd();

      console.log("🧹 Cleaning up orphaned journals...\n");

      const cleanup = new JournalCleanup(projectDir);

      if (options.dryRun) {
        console.log("🔍 Dry run mode - no files will be deleted\n");

        // TODO: Implement dry-run mode in JournalCleanup
        console.log("⚠️  Dry-run mode not yet implemented");
        return;
      }

      const result = await cleanup.run(options.verbose);

      if (result.removed === 0) {
        console.log("✓ No orphaned journals found - everything is clean!");
      } else {
        console.log(
          `\n✅ Cleanup complete - removed ${result.removed} orphaned journal(s)`,
        );
      }
    });
}
