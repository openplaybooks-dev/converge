# meshy-generate backends

Each subdirectory is a self-contained backend implementing the `meshy-generate` contract.

## Switching backends

```bash
echo meshy > ACTIVE   # use the real Meshy API (requires MESHY_API_KEY)
echo stub  > ACTIVE   # offline placeholder (copies vendor/stub-cube.glb)
```

## Contract recap

```js
export async function generate(input) {
  // input: { mode, asset_slug, output_path, prompt?, image_url?, ai_model?, ... }
  // returns: { output_path, task_id, model, cost_credits }
}
```

## Shipped backends

### stub (default)

Copies `vendor/stub-cube.glb` to the requested output path. Always succeeds, costs nothing. Use for:

- Pipeline smoke tests
- CI runs without Meshy credentials
- Validating the playbook structure before committing to a paid run

### meshy

Real Meshy API integration.

**Requires**:
- `MESHY_API_KEY` environment variable.
- Meshy Pro tier or higher (free tier has no API access as of April 2026).

**Pricing** (Meshy-6 lowpoly):
- preview: 5 credits per asset, ~30s
- refine: 10 credits per asset, ~2 min
- Pro plan: 1000 credits/month for $20 — covers ~6 full MVP runs.

**Rate limits**:
- Pro: 20 req/s, 10 concurrent across the queue (text-to-3d + image-to-3d + retexture share).
- The playbook throttles to ≤8 in flight to leave headroom for retries on 429.

**Failures**:
- `429 NoMoreConcurrentTasks` — backoff 30s + retry.
- `429 RateLimitExceeded` — backoff 5s + retry.
- `FAILED` task status — surface the error message; Converge's retry loop kicks in.
