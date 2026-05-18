# Branding & Naming Analysis

> Research date: 2026-05-13. All namespace availability verified at time of writing.

## The Three Paths

| | **Path 1: Playbook** | **Path 2: Converge** | **Path 3: Converge's Playbook** |
|---|---|---|---|
| Platform/brand | Playbook | Converge | Converge |
| Product | Playbook | Converge | Playbook |
| Domain | **playbook.run** ✅ | converged.to ✅ | **playbook.run** ✅ |
| npm | `@playbook/core` ✅ | `@openplaybooks/converge-core` ✅ | `@openplaybooks/playbook` ✅ |
| CLI | `playbook` ✅ | `converge` ✅ | `converge` ✅ |
| GitHub org | `playbooks` ✅ | `converge` ✅ | `converge` ✅ |
| GitHub repo | `playbooks/playbook` | `converge/converge` | `converge/playbook` |
| Tagline | Run your playbook. | AI Agent Playbooks, Converged. | Converge's Playbook. |
| Viral "aha" | ⭐⭐⭐⭐⭐ Instant | ⭐⭐⭐⭐ Needs tagline | ⭐⭐⭐⭐⭐ Instant |
| Long-term ownable | ⭐⭐⭐ Generic | ⭐⭐⭐⭐⭐ Unique | ⭐⭐⭐⭐⭐ Unique |
| Namespace conflicts | ⭐⭐⭐⭐ Minor | ⭐⭐⭐⭐⭐ None | ⭐⭐⭐⭐⭐ None |
| Future products | `@playbook/studio` etc. | `@openplaybooks/studio` etc. | `@openplaybooks/studio` etc. |

---

## Path 1: Playbook (standalone brand)

```
Product:  Playbook
Domain:   playbook.run          ← "Playbook. Run." — a sentence AND a URL
npm:      @playbook/core        ← npm i -g @playbook/core
CLI:      playbook              ← playbook run, playbook init, playbook add
GitHub:   playbooks             ← github.com/playbooks/playbook
Tagline:  Run your playbook.
```

**Viral strength:** Maximum. "Playbook" + `playbook run` + `playbook.run` — everything is the same word. One concept, zero translation.

**Weakness:** Generic word. Hard to trademark, hard to SEO, hard to defend. GitHub org `playbook` is taken (use `playbooks` instead). `playbooks.xyz` competitor in adjacent space.

---

## Path 2: Converge (standalone brand)

```
Product:  Converge
Domain:   converged.to          ← Results achieved. Converged.
npm:      @openplaybooks/converge-core        ← npm i -g @openplaybooks/converge-core
CLI:      converge              ← converge run, converge init, converge add
GitHub:   converge              ← github.com/converge/converge
Tagline:  AI Agent Playbooks, Converged.
```

**Long-term strength:** Everything aligns — product, CLI, npm, GitHub all same word. Unique. Ownable. No competitors.

**Weakness:** Abstract name — doesn't explain itself in 2 seconds. Domain situation weaker — no clean `.dev`/`.io`/`.run` available.

---

## Path 3: Converge's Playbook (platform + product) 🥇

```
Platform:  Converge             ← the engine, the org, the CLI
Product:   Playbook             ← the thing you create, the domain, the package
Domain:    playbook.run         ← "Playbook. Run." — product domain
npm:       @openplaybooks/playbook   ← npm i -g @openplaybooks/playbook
CLI:       converge             ← converge run, converge init, converge add
GitHub:    converge             ← github.com/converge/playbook
Tagline:   Converge's Playbook. Autonomous AI agent playbooks.
```

### Why this is the best of both worlds

**Every asset plays its role:**

| Asset | Name | Role |
|---|---|---|
| GitHub org | `converge` | Owns everything. Unique, defensible. |
| npm scope | `@converge` | Namespace umbrella. Future products live here. |
| npm package | `@openplaybooks/playbook` | Tells the story: "Converge's Playbook" |
| CLI | `converge` | The engine's verb. `converge run` = run the playbook. |
| Domain | `playbook.run` | The product's home. A sentence that sells. |
| Product name | Playbook | The word people say. "I use Playbook." |
| Platform name | Converge | The engine that powers it. "Built on Converge." |

**This is a well-established pattern:**

| Platform | Product | npm | CLI |
|---|---|---|---|
| Vercel | Next.js | `next` | `vercel` |
| Anthropic | Claude Code | `@anthropic/claude-code` | `claude` |
| Google | Angular | `@angular/cli` | `ng` |
| **Converge** | **Playbook** | **`@openplaybooks/playbook`** | **`converge`** |

**For virality:**
- People discover "Playbook" → go to `playbook.run` → install `@openplaybooks/playbook` → run `converge run`
- Word of mouth: "Have you tried Playbook? Just go to playbook.run."
- The brand story: "Playbook, by Converge" — product is approachable, platform is credible.

**For long-term ownership:**
- `@converge` npm scope + `converge` GitHub org are the defensible moat
- Playbook is the product that goes viral, Converge is the platform that endures
- Future products (`@openplaybooks/studio`, `@openplaybooks/sdk`) live under the same umbrella
- No namespace conflicts. No competitor confusion. One unique platform, one viral product.

**The relationship:**
- **Playbook** = what you write (the noun)
- **Converge** = what runs it (the verb)
- "Write a playbook. Converge it."

### Concerns

- **Two names to learn.** "Playbook" + "Converge" = two concepts instead of one. Mitigated by the fact they work together naturally: "Converge runs your playbook."
- **`converge` CLI, not `playbook`.** People who hear "Playbook" might try `playbook run` first. Mitigated by install messaging: `npm i -g @openplaybooks/playbook` makes the CLI obvious.

---

## Namespace Conflict Map

| Namespace | Path 1 (Playbook) | Path 2 (Converge) | Path 3 (Converge+Playbook) |
|---|---|---|---|
| `playbook` CLI binary | ✅ Available | N/A | N/A (uses `converge`) |
| `converge` CLI binary | N/A | ✅ Available | ✅ Available |
| `playbook` npm unscoped | ⚠️ Taken, no bin | N/A | N/A |
| `converge` npm unscoped | N/A | ⚠️ Taken (2014 CRDT) | ⚠️ Same, but irrelevant with scope |
| `@playbook/core` npm | ✅ Available | N/A | N/A |
| `@openplaybooks/converge-core` npm | N/A | ✅ Available | N/A |
| `@openplaybooks/playbook` npm | N/A | N/A | ✅ Available |
| `playbook` GitHub org | ❌ Taken | N/A | N/A |
| `playbooks` GitHub org | ✅ Available | N/A | N/A |
| `converge` GitHub org | N/A | ✅ Available | ✅ Available |
| `playbook.run` domain | ✅ Available | N/A | ✅ Available |
| `converged.to` domain | N/A | ✅ Available | ✅ Available |

---

## Verdict

**Path 3 (Converge's Playbook) wins.** It captures the viral simplicity of "Playbook" (domain, product name, word-of-mouth) with the long-term defensibility of "Converge" (GitHub org, npm scope, CLI, unique brand). 

- **Viral:** `playbook.run` + "I use Playbook" = instant comprehension
- **Ownable:** `@converge` + `converge` GitHub org = no one can take your namespace
- **Scalable:** Future products (`@openplaybooks/studio`, etc.) all under one umbrella
- **Clean:** No namespace conflicts. No competitor confusion.

### What to register today

All of these are available as of 2026-05-13:

```
GitHub org:   converge              ← The umbrella
npm scope:    @converge             ← Publish @openplaybooks/playbook
Domain:       playbook.run          ← The product site
CLI binary:   converge              ← Already clean
```

### How it reads in practice

```
# Discovery
"Have you tried Playbook? Go to playbook.run."

# Install
npm install -g @openplaybooks/playbook

# Daily use
converge init --name my-project
converge add --from-example hello-world
converge run

# The mental model
"Write a playbook. Converge it."
```

### README title

```
# Converge Playbook
## Autonomous AI Agent Playbooks — Write a playbook. Converge it.
```

---

## Verification Checklist

- [ ] Register `converge` GitHub org (available as of 2026-05-13)
- [ ] Publish `@openplaybooks/playbook` to npm (claims the `@openplaybooks` scope for real)
- [ ] Buy `playbook.run` domain
- [ ] Buy `converged.to` domain (redirect to playbook.run)
- [ ] Rename repo: `openplaybooks-dev/converge` → `converge/playbook`
- [ ] Update package name: `@openplaybooks/converge-core` → `@openplaybooks/playbook`
- [ ] CLI binary stays `converge`
- [ ] Update README with new branding
- [ ] Build `playbook.run` landing page
