# Secret Rotation Checklist

> **WARNING**: The keys listed below are compromised (committed to git history
> of a public repository). They must be rotated BEFORE the repository is
> made public or immediately if already public. Anyone with access to the
> git history can use these keys.

## minimax (8 keys)

**Rotation URL**: https://platform.minimax.io/user-center/basic-information/interface-key

| Key Prefix (masked) | File | Pattern |
|---|---|---|
| <REDACTED_MINIMAX_TOKEN>... | .converge/project.yaml:14 | minimax-key |
| <REDACTED_MINIMAX_TOKEN>... | examples/deep-research/.converge/project.yml:20 | minimax-key |
| <REDACTED_MINIMAX_TOKEN>... | examples/game-assets-video/.converge/project.yml:42 | minimax-key |
| <REDACTED_MINIMAX_TOKEN>... | examples/social-sim/.converge/project.yaml:13 | minimax-key |
| <REDACTED_MINIMAX_TOKEN>... | examples/stitch-to-flutter-baby-watch-v2/.converge/project.yml:21 | minimax-key |
| <REDACTED_MINIMAX_TOKEN>... | examples/stitch-to-flutter-baby-watch/.converge/project.yml:21 | minimax-key |
| <REDACTED_MINIMAX_TOKEN>... | examples/unity-mono-remix/.converge/project.yml:20 | minimax-key |
| <REDACTED_MINIMAX_TOKEN>... | examples/unity-remix/.converge/project.yml:18 | minimax-key |

**Steps**:
1. (a) Log in to https://platform.minimax.io/user-center/basic-information/interface-key
2. (b) Create a new API key
3. (c) Update each file listed above — replace the old `minimax-key` value with the new key
4. (d) Verify services using minimax still work
5. (e) Delete the old key from the minimax dashboard

---

## deepseek (7 keys)

**Rotation URL**: https://platform.deepseek.com/api_keys

| Key Prefix (masked) | File | Pattern |
|---|---|---|
| sk-80057fb9a... | .converge/project.yaml:23 | deepseek-key |
| sk-80057fb9a... | examples/financial-deep-research/.converge/project.yml:15 | deepseek-key |
| sk-80057fb9a... | examples/game-assets-video/.converge/project.yml:51 | deepseek-key |
| sk-722f63e34... | examples/unity-mono-remix/.converge/project.yml:36 | deepseek-key |
| sk-722f63e34... | examples/unity-mono-remix/.converge/project.yml:37 | deepseek-key |
| sk-722f63e34... | examples/unity-remix/.converge/project.yml:34 | deepseek-key |
| sk-722f63e34... | examples/unity-remix/.converge/project.yml:35 | deepseek-key |

**Steps**:
1. (a) Log in to https://platform.deepseek.com/api_keys
2. (b) Create a new API key
3. (c) Update each file listed above — replace the old `deepseek-key` value with the new key
4. (d) Verify services using deepseek still work
5. (e) Delete the old key from the deepseek dashboard

---

## kimi (17 keys)

**Rotation URL**: https://platform.moonshot.cn/console/api-keys

| Key Prefix (masked) | File | Pattern |
|---|---|---|
| sk-80057fb9a... | .converge/project.yaml:23 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/.converge/config/providers.yml:54 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/.converge/playbooks/kimi-compat/playbook.yml:24 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/PROVIDER_GUIDE.md:33 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/PROVIDER_GUIDE.md:270 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/README.md:83 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/README.md:128 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/README.md:151 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/src/acp-custom-api.ts:18 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/src/claude-with-kimi-example.ts:13 | kimi-key |
| sk-e8Ti33rX2... | examples/acp-demo/src/claude-with-kimi.ts:21 | kimi-key |
| sk-80057fb9a... | examples/financial-deep-research/.converge/project.yml:15 | kimi-key |
| sk-80057fb9a... | examples/game-assets-video/.converge/project.yml:51 | kimi-key |
| sk-722f63e34... | examples/unity-mono-remix/.converge/project.yml:36 | kimi-key |
| sk-722f63e34... | examples/unity-mono-remix/.converge/project.yml:37 | kimi-key |
| sk-722f63e34... | examples/unity-remix/.converge/project.yml:34 | kimi-key |
| sk-722f63e34... | examples/unity-remix/.converge/project.yml:35 | kimi-key |

**Steps**:
1. (a) Log in to https://platform.moonshot.cn/console/api-keys
2. (b) Create a new API key
3. (c) Update each file listed above — replace the old `kimi-key` value with the new key
4. (d) Verify services using kimi still work
5. (e) Delete the old key from the kimi dashboard

---

## grok (3 keys)

**Rotation URL**: https://console.x.ai/

| Key Prefix (masked) | File | Pattern |
|---|---|---|
| xai--invokin... | apps/landing/.astro/data-store.json:1 | grok-key |
| xai--invokin... | apps/landing/.astro/data-store.json:1 | grok-key |
| xai--invokin... | apps/landing/.astro/data-store.json:1 | grok-key |

**Steps**:
1. (a) Log in to https://console.x.ai/
2. (b) Create a new API key
3. (c) Update each file listed above — replace the old `grok-key` value with the new key
4. (d) Verify services using grok still work
5. (e) Delete the old key from the xAI dashboard

---

## anthropic-api (4 keys)

**Rotation URL**: https://console.anthropic.com/settings/keys

| Key Prefix (masked) | File | Pattern |
|---|---|---|
| sk-api-DJxvt... | examples/baby-app/.converge/project.yml:21 | anthropic-api-key |
| sk-api-DJxvt... | examples/converge-design/.converge/project.yml:12 | anthropic-api-key |
| sk-api-DJxvt... | examples/flutter-app/.converge/project.yml:21 | anthropic-api-key |
| sk-api-DJxvt... | examples/stitch-to-flutter/.converge/project.yml:21 | anthropic-api-key |

**Steps**:
1. (a) Log in to https://console.anthropic.com/settings/keys
2. (b) Create a new API key
3. (c) Update each file listed above — replace the old `anthropic-api-key` value with the new key
4. (d) Verify services using anthropic still work
5. (e) Delete the old key from the Anthropic console

---

## openai-api (1 key)

**Rotation URL**: https://platform.openai.com/api-keys

| Key Prefix (masked) | File | Pattern |
|---|---|---|
| sk-proj-2c9C... | examples/game-assets/.env:2 | openai-api-key |

**Steps**:
1. (a) Log in to https://platform.openai.com/api-keys
2. (b) Create a new API key
3. (c) Update each file listed above — replace the old `openai-api-key` value with the new key
4. (d) Verify services using openai still work
5. (e) Delete the old key from the OpenAI dashboard

---

## gemini (1 key)

**Rotation URL**: https://console.cloud.google.com/apis/credentials

| Key Prefix (masked) | File | Pattern |
|---|---|---|
| <REDACTED_GEMINI_KEY>... | examples/game-assets/.env:1 | gemini-key |

**Steps**:
1. (a) Log in to https://console.cloud.google.com/apis/credentials
2. (b) Create a new API key
3. (c) Update each file listed above — replace the old `gemini-key` value with the new key
4. (d) Verify services using gemini still work
5. (e) Delete the old key from the Google Cloud console

---

## After Rotation

Once all keys have been rotated above, run **Phase 3 (purge)** to strip the old compromised keys from the git history of this repository.
