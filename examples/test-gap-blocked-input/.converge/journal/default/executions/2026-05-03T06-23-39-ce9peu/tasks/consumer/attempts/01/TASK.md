# Task: consumer

Read INPUT_FILE.txt, append "-consumed" to its content, and write the result
to CONSUMED_OUTPUT.txt.

Do NOT create INPUT_FILE.txt yourself — the producer task creates it.

The `producer-retry-gate` check verifies that the producer was re-run by the
DependencyBackoffStrategy. If the producer only ran once, this check fails.