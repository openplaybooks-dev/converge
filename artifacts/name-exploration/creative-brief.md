# Creative Brief

## Product Truth

Converge is a build system for AI agents. Developers write playbooks as markdown files and folders. Converge compiles them into a DAG, dispatches AI agents, and loops until shell-check-verified outputs exist. It applies the rigor of a build system — fingerprint caching, deterministic ordering, shell-level verification — to the otherwise chaotic world of AI-assisted development. The core metaphor is divergence and convergence: break work into independent pieces, run them in parallel, assemble the whole.

## Strategic Positioning

Not another AI agent framework. Not a chat wrapper. Not a workflow engine. Converge sits at the intersection of build systems (dbt, Bazel, Nix) and AI coding agents (Claude Code, Codex). The positioning is: **the thing that makes AI agents production-grade** — repeatable, verifiable, cacheable, and team-shareable.

The competitive set is not LangChain, CrewAI, or AutoGPT. It's the mental model shift from "I prompted an AI and got something" to "I ran a playbook and the build passed."

## Audience and Buying Context

Primary: Senior engineers and technical leads who use AI coding agents daily and have hit the ceiling of what a single chat window can accomplish. They feel the pain of context loss, non-determinism, and the inability to share or repeat AI-assisted work.

Secondary: Platform teams evaluating how to bring AI-assisted development into CI/CD, code review, and team workflows without sacrificing verifiability.

Buying trigger: the moment an engineer realizes they just re-did the same AI conversation three times and got three different results. Or the moment a team lead realizes nobody else can reproduce what the AI helped them build.

## Emotional Territory

**Calm competence.** Not excitement, not magic, not "10x productivity." The feeling is: _I know exactly what ran, I know it passed, and I can prove it._ Think the emotional register of a passing test suite, a clean build log, a green CI pipeline — applied to AI-assisted work.

The name should evoke trust, order, and completion. It should feel inevitable after hearing the product promise.

Avoid: hype, speed-for-speed's-sake, AI magic, futurism, disruption theater.

## Naming Principles

1. **Terminal-first.** Must feel natural as a CLI command. 4–10 letters, 1–3 syllables, no ambiguity when spoken aloud.
2. **Metaphor over category.** Does not describe what the product is (agent, workflow, pipeline). Implies what the product achieves (convergence, completion, proof, binding).
3. **Durable, not trendy.** Should still feel right in 2035. No AI-era neologisms.
4. **Ownable.** Searchable, not a common dictionary word (or strong enough to own one), plausible domain/social/trademark path.
5. **Developer-native.** Feels at home in `package.json`, `npx`, npm scopes, GitHub orgs, and technical conversation.
6. **Calm, not loud.** Restrained confidence. Premium without pretension.

## Must Avoid

- Agent, AI, Lang, Chain, Crew, Flow, Graph, Task, Auto, Bot, Forge, Ops, Run, Check prefixes or suffixes
- Generic SaaS constructions: -ify, -ly, -hub, -stack, - io, -base, -kit
- Copilot-like assistant names
- Random Latin-sounding five-letter coinages with no metaphor
- Names that describe the category too literally
- Names longer than 15 letters
- Names that are hard to pronounce on first sight
- Names with ambiguous spelling after hearing them aloud
- Trend words that will age quickly
- Names that feel like a Jira plugin

## Naming Territories to Explore

1. **Proof and verification** — evidence, seals, attestations, manifests, receipts, certificates. Names that signal: _this ran, and here's the proof._
2. **Binding and joinery** — weaving, stitching, seams, edges, joints. Names that signal: _many pieces, carefully assembled into one coherent whole._
3. **Convergence and fixed points** — limits, closure, invariants, attractors, lattices. Names that signal: _independent work resolving into a single verified result._
4. **Navigation and bearings** — compass, bearing, chart, waypoint, course. Names that signal: _directed execution with clear checkpoints._
5. **Craft precision** — gauge, caliper, tolerance, true, fit, finish. Names that signal: _exacting standards, measurable quality._
6. **Ledgers and traces** — records, provenance, receipts, trails. Names that signal: _accountable execution history._
7. **Musical structure** — score, cadence, canon, measure, counterpoint. Names that signal: _coordinated independent parts resolving into harmony._

## What a Winning Name Feels Like

Someone hears it once in a standup and remembers it. They type it in a terminal and it feels right — short, crisp, no friction. They see it in a `package.json` and it looks like it belongs. After learning what the product does, the name feels inevitable: _of course that's what it's called._

It carries the emotional weight of a passing build, not the noise of a product launch. Calm. Confident. Done.