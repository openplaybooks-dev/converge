/**
 * Docker image cache — avoids rebuilding images for the same (repo, commit).
 * Images are tagged deterministically so Docker's built-in layer cache handles the rest.
 */

import { DockerContainer } from "./container.ts";
import { generateDockerfile, imageTag } from "./dockerfile.ts";
import type { SWEBenchInstance } from "../dataset/types.ts";

export class ImageCache {
  /** Set of tags we've already verified exist in this process */
  private verified = new Set<string>();

  /**
   * Ensure a Docker image exists for the given instance.
   * Builds it if not already cached. Returns the image tag.
   */
  async ensure(instance: SWEBenchInstance): Promise<string> {
    const tag = imageTag(instance);

    // Skip if we already verified this run
    if (this.verified.has(tag)) return tag;

    // Check if Docker already has the image
    if (await DockerContainer.imageExists(tag)) {
      this.verified.add(tag);
      return tag;
    }

    // Build the image
    const dockerfile = generateDockerfile(instance);
    const container = new DockerContainer({ image: "scratch" });
    await container.build(dockerfile, tag);

    this.verified.add(tag);
    return tag;
  }

  /** Clear the in-process verification cache (does not delete Docker images) */
  reset(): void {
    this.verified.clear();
  }
}
