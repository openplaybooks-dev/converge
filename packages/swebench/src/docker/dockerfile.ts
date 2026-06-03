/**
 * Dockerfile template generation for SWE-bench instances.
 * Each repo/version combo gets a tailored Dockerfile.
 */

import type { SWEBenchInstance } from "../dataset/types.ts";

/**
 * Known repo → install dependencies mapping.
 * Covers the repos in SWE-bench Lite.
 */
const REPO_INSTALL_CMDS: Record<string, string> = {
  "django/django": "pip install -e . && pip install pytest",
  "scikit-learn/scikit-learn": "pip install -e . && pip install pytest",
  "sympy/sympy": "pip install -e . && pip install pytest",
  "matplotlib/matplotlib": "pip install -e . && pip install pytest",
  "astropy/astropy": "pip install -e '.[test]' && pip install pytest",
  "pallets/flask": "pip install -e '.[dev]' && pip install pytest",
  "psf/requests": "pip install -e '.[dev]' && pip install pytest",
  "pydata/xarray": "pip install -e . && pip install pytest",
  "mwaskom/seaborn": "pip install -e '.[dev]' && pip install pytest",
  "sphinx-doc/sphinx": "pip install -e '.[test]' && pip install pytest",
  "pylint-dev/pylint": "pip install -e . && pip install pytest",
  "pytest-dev/pytest": "pip install -e . && pip install pytest",
};

/** Default install command for repos not in the known list */
const DEFAULT_INSTALL = "pip install -e . && pip install pytest";

/**
 * Generate a Dockerfile for a SWE-bench instance.
 * Installs the repo at the base_commit with the correct Python version.
 */
export function generateDockerfile(instance: SWEBenchInstance): string {
  const pythonVersion = instance.version || "3.9";
  const installCmd = REPO_INSTALL_CMDS[instance.repo] ?? DEFAULT_INSTALL;

  return `FROM python:${pythonVersion}-slim

# System deps for building native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \\
    git build-essential && \\
    rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Clone and checkout the repo at the base commit
RUN git clone https://github.com/${instance.repo}.git . && \\
    git checkout ${instance.base_commit}

# Install project dependencies
RUN ${installCmd}

# Keep container alive
CMD ["sleep", "infinity"]
`;
}

/**
 * Generate a deterministic image tag for caching.
 * Format: converge-swebench/{repo}:{base_commit_short}
 */
export function imageTag(instance: SWEBenchInstance): string {
  const repoSlug = instance.repo.replace("/", "-");
  const commitShort = instance.base_commit.slice(0, 12);
  return `converge-swebench/${repoSlug}:${commitShort}`;
}
