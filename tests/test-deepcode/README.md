# test-deepcode

Smoke fixture for the HKUDS DeepCode backend provider.

The default test path only validates configuration resolution and playbook compilation. A real DeepCode run is opt-in because it requires DeepCode to be installed and configured locally.

Recommended local setup:

```bash
pip install deepcode-hku
curl -O https://raw.githubusercontent.com/HKUDS/DeepCode/main/deepcode_config.json.example
cp deepcode_config.json.example deepcode_config.json
```

Edit `deepcode_config.json` and add at least one provider key. Inline strings and `${ENV_VAR}` references are supported by DeepCode, for example:

```json
{
  "providers": {
    "openai": { "apiKey": "your_openai_api_key" },
    "anthropic": { "apiKey": "${ANTHROPIC_API_KEY}" },
    "gemini": { "apiKey": "" }
  }
}
```

Run the real smoke test from the fixture directory, or set `DEEPCODE_CONFIG_PATH` to the config file path:

```bash
DEEPCODE_CONFIG_PATH=/path/to/deepcode_config.json CONVERGE_REAL_DEEPCODE=1 pnpm vitest run tests/deepcode-backend.test.ts
```

If DeepCode is checked out locally instead of installed as `deepcode`, set `DEEPCODE_COMMAND` to the command prefix, for example:

```bash
DEEPCODE_COMMAND="python cli/main_cli.py" DEEPCODE_CONFIG_PATH=/path/to/deepcode_config.json CONVERGE_REAL_DEEPCODE=1 pnpm vitest run tests/deepcode-backend.test.ts
```
