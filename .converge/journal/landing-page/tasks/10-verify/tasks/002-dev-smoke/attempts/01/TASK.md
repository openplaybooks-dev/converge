# Task: 10-verify/002-dev-smoke

# Dev smoke

Spawn the dev server, hit the home page, kill the server, verify the
response. This catches a different class of bug than `build` —
specifically, runtime errors in SSR that don't surface in the static
build.

## Notes

- Uses port 4321 (Astro default). If something else is using that port, the dev server will fail and the check will catch it.
- `sleep 8` is deliberately generous — Astro cold-start can take 3-7s on slow filesystems.
- The check kills the dev server even on failure (`kill $DEV_PID 2>/dev/null`) so it doesn't leak between attempts.

## Banned

- Skipping the kill step. A leaked dev server holds port 4321 and breaks the next attempt.
- Using `--port 0` or random ports. Lighthouse + lychee + the deploy preview all assume 4321 in tooling defaults.