# PLAN: 02-generate — Strategy Fan-out

## Goal

Generate 100+ naming candidates by running 10 diverse strategies in parallel, then converge into a unified pool.

## Decision

**10 strategies, seed-spawned, parallel execution.** Each strategy uses a different creative lens. They share the same contract shape (inputs: identity.md + criteria.json; outputs: {strategy}-candidates.json) but differ in technique. A static catalog in the seed index.js defines all 10.

## Why seed and not static tasks

The 10 strategies have identical contract shapes — same inputs, same output schema, same checks. Only the technique varies. A seed template with a catalog of 10 entries eliminates 10 near-identical TASK.md files.

## Strategy Details

| Strategy ID | Name | Category | Technique | Web Search |
|---|---|---|---|---|
| `semantic-field` | Semantic Field Mining | semantic | Map word families around converge, diverge, orchestrate, autonomous, agent. Use thesaurus patterns: synonyms, hypernyms, hyponyms, related verbs/nouns. Build clusters and extract names. Also try antonyms (diverge → converge, scatter → gather) for contrast pairs. | No |
| `metaphor-domains` | Metaphor Domain Mining | metaphor | Mine 6 domains: (1) Weaving — loom, weft, warp, heddle, shuttle, bobbin. (2) Metalworking — anvil, smith, temper, quench, alloy. (3) Sailing — helm, rudder, keel, moor, anchor. (4) Music — cadence, motif, chord, tempo, refrain. (5) Gardening — graft, sow, cultivate, bloom, harvest. (6) Architecture — keystone, pillar, truss, arch, scaffold. Extract domain words that evoke "bringing together" or "making." | No |
| `latin-greek-roots` | Latin & Greek Roots | linguistic | Combine classical roots into modern coinages: con- (together), syn- (with), dia- (through), telos (purpose/goal), ergon (work), poiesis (making/creation), praxis (action/practice), techne (skill/craft), taxis (arrangement/order), logos (reason/discourse), nous (mind), sophia (wisdom). Try combinations: syntaxis, telergon, praxicon, technopoeia. Also try Latin: conficio (I accomplish), exequor (I execute), perago (I finish). | No |
| `npm-pattern-study` | npm CLI Pattern Study | branded | Search the web for: "most popular npm CLI developer tools 2025", "successful open source tool naming conventions", "best CLI tool names". Analyze the naming patterns found: short abstractions (vite, nx, bun), descriptive compounds (eslint, webpack, stylelint), coined/blended words (prettier, vitest, turborepo), real-word metaphors (drizzle, prisma, playwright). Generate 2-3 candidates per pattern type. | Yes |
| `competitive-ai` | Competitive AI Landscape | branded | Search the web for: "AI agent frameworks 2025 list", "AI orchestration tools comparison", "autonomous AI agent platforms". Map the naming landscape: CrewAI, AutoGen, LangChain, LangGraph, LlamaIndex, Haystack, Dify, Flowise, Prefect, Dagster, Temporal, Invoke, ComfyUI, n8n. Categorize: agent-names (CrewAI, AutoGen), chain-metaphors (LangChain), graph-metaphors (LangGraph, Flowise), tool-metaphors (Haystack, LlamaIndex), abstract (Dify, n8n, Prefect). Find unfilled niches and generate names for them. | Yes |
| `phonetic-aesthetics` | Phonetic Aesthetics | abstract | Focus ONLY on sound, ignoring meaning. Generate names using these phonetic patterns: (1) Monosyllabic punch — 4-5 chars, hard consonants (k, t, p, x): "klex", "tarn", "prox". (2) Flowing two-syllable — vowel-rich, smooth: "avelo", "imara", "eluno". (3) -a/-o/-i endings (tech brand pattern): "prisma", "deno", "verceli". (4) Consonant clusters that feel modern: "strv", "nxd". (5) Names that "feel good to say" — test each aloud. Rate "mouthfeel" for each candidate. | No |
| `brand-blending` | Startup Brand Blending | branded | Search for: "startup naming techniques and case studies", "how tech companies choose names", "brand naming linguistics". Then apply these techniques to roots from the framework: converge, diverge, agent, playbook, run, task, dag, check, flow. (1) Blending: Netlify = net + amplify. Try: convergify, taskel, dagrun. (2) Compounding: Supabase = super + base. Try: playbook-run, task-forge, dag-weave. (3) Affixation: -ify, -ly, -el, -io, -a. (4) Vowel-dropping: Flickr, Tumblr. Try: cnvrg, plybk, dgrn. (5) Anagram/play: Deno = anagram of Node. Try rearranging letters from converge/diverge. | Yes |
| `abstract-evocative` | Abstract Evocative Words | abstract | Generate short (4-7 char) real English words with positive/strong connotations that work as tech brand names regardless of literal meaning. Think: Stripe, Remix, Svelte, Prisma, Drizzle, Vite, Bun. Scan for words conveying: speed, precision, strength, elegance, clarity, completion. Also words about: light (lumen, beacon, spark, prism), structure (pillar, arch, keystone, truss), energy (pulse, surge, flux, current), edge/transition (verge, cusp, brink, crest), achievement (laurel, palms, crown, summit). Generate 2-3 per sub-theme. | No |
| `mythology-narrative` | Mythology & Narrative | mythological | Search for: "mythological names used in software companies", "tech brands named after mythology", "startups with mythological names". Then explore: (1) Guidance figures: Ariadne (thread through labyrinth — PERFECT for playbook-guided workflows), Merlin, Virgil, Athena, Thoth (Egyptian god of writing/knowledge). (2) Creation figures: Daedalus (craftsman/inventor), Hephaestus (forge/creation), Ptah (Egyptian creator). (3) Assembly/order: Atlas (holds it together), Argus (all-seeing/verification), Janus (gates/beginnings). (4) Completion: Prometheus (brings fire/tech). Generate modern-sounding derivatives and variations. | Yes |
| `science-nature` | Science & Nature Domains | scientific | Mine 4 domains for evocative names: (1) Biology: mycelium (underground network), synapse (connection), dendrite (branching), rhizome (root network), axon (signal). (2) Astronomy: syzygy (celestial alignment), pulsar (pulse), aurora (light), zenith (peak), nadir (low point → not this). (3) Geology: strata (layers), flint (spark), ridge (line), chert (stone), crystal (structure). (4) Mathematics: vector (direction), tensor (multi-dimension), lattice (structure), graph (network), node (connection), kernel (core). Generate 2-3 candidates per sub-domain. | No |

## Dependencies

All 10 strategy tasks depend on nothing except upstream research. They run in **full parallel**.

## Convergence

The 02-generate container converges by:
1. Reading all 10 `{strategy}-candidates.json` files
2. Case-insensitive deduplication
3. Merging into `all-candidates.json`
4. Validating: >= 80 candidates, no duplicates, all required fields present

## Test Points

- Each strategy produces 8-20 candidates (the SEED.md checks enforce this)
- Container convergence produces >= 80 unique candidates
- Every candidate has name + rationale + category + strategy_source
