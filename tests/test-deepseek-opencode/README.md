# test-deepseek-opencode

Real-provider smoke fixture for a two-provider playbook:

- `deepseek` routes through the `claude` provider with DeepSeek's Anthropic-compatible endpoint and environment variables.
- `openfn` routes through Opencode/openfn at `http://localhost:4096` using the `deepseek/deepseek-chat` model.

Prerequisites for a real run:

1. `DEEPSEEK_API_KEY` is set in the environment or in the repository `.env`.
2. `claude` CLI is installed and runnable.
3. An Opencode server is running locally on port `4096`.
4. The repo has been built (`pnpm build`) so `packages/cli/dist/index.js` exists.

Compile:

```sh
node ../../packages/cli/dist/index.js compile --dir=.converge/playbooks/default
```

Run:

```sh
node ../../packages/cli/dist/index.js run --dir=.
```
