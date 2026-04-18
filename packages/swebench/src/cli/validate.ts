/**
 * Standalone validation script — called by check commands to verify
 * that an instance's patch resolves the issue.
 *
 * Usage: tsx validate.ts <instance-id> <container-name>
 *
 * Exits 0 if patch resolves the issue, 1 otherwise.
 */

import { DockerContainer } from "../docker/container.ts";
import { loadDataset } from "../dataset/loader.ts";
import { filterInstances } from "../dataset/filter.ts";
import { validatePatch } from "../executor/patch-validator.ts";

async function main(): Promise<void> {
  const [instanceId, containerName] = process.argv.slice(2);

  if (!instanceId || !containerName) {
    console.error("Usage: validate.ts <instance-id> <container-name>");
    process.exit(1);
  }

  // Load the specific instance
  const dataset = await loadDataset();
  const [instance] = filterInstances(dataset, { instanceIds: [instanceId] });

  if (!instance) {
    console.error(`Instance not found: ${instanceId}`);
    process.exit(1);
  }

  // Connect to the existing container
  const container = new DockerContainer({
    image: "unused", // not starting a new container
    name: containerName,
  });

  const result = await validatePatch(container, instance);

  if (result.resolved) {
    console.log(`PASS: ${instanceId} resolved`);
    process.exit(0);
  } else {
    console.log(`FAIL: ${instanceId} not resolved`);
    console.log(`  FAIL_TO_PASS: ${result.failToPass.filter((t) => t.passed).length}/${result.failToPass.length}`);
    console.log(`  PASS_TO_PASS: ${result.passToPass.filter((t) => t.passed).length}/${result.passToPass.length}`);
    process.exit(1);
  }
}

main();
