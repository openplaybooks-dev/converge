/**
 * SWE-bench instance interface matching the HuggingFace dataset schema.
 * See: https://huggingface.co/datasets/princeton-nlp/SWE-bench_Lite
 */
export interface SWEBenchInstance {
  /** Unique identifier, e.g. "django__django-16379" */
  instance_id: string;
  /** GitHub repo in "owner/repo" format, e.g. "django/django" */
  repo: string;
  /** Base commit SHA to check out before applying the patch */
  base_commit: string;
  /** The bug report / problem statement given to the agent */
  problem_statement: string;
  /** Hints text (optional additional context) */
  hints_text: string;
  /** Git diff of the gold patch (reference solution) */
  patch: string;
  /** Git diff of the test patch (tests that validate the fix) */
  test_patch: string;
  /** Comma-separated list of tests that should go from FAIL to PASS */
  FAIL_TO_PASS: string;
  /** Comma-separated list of tests that should remain PASS */
  PASS_TO_PASS: string;
  /** Python version required, e.g. "3.9" */
  version: string;
  /** Environment setup metadata (JSON string) */
  environment_setup_commit: string;
  /** Creation timestamp */
  created_at: string;
}
