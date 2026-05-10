#!/usr/bin/env node
// Reads validated-candidates.json, scores available candidates, writes evaluated-candidates.json

const fs = require('fs');
const path = require('path');

const validated = JSON.parse(
  fs.readFileSync('artifacts/name-exploration/validated-candidates.json', 'utf8')
);

// Scoring rubric per criteria.json:
//   uniqueness (0.25), memorability (0.25), concept-fit (0.25), professional-quality (0.25)
//
// Evaluations based on name, rationale, category, and real-world context.

const scores = {
  // --- metaphor-domains ---
  tenter: {
    uniqueness: 4, memorability: 3, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "Distinctive word but obscure — few know what a tenter is. One clear syllable but spelling may trip people. The stretching/verification metaphor is niche. Acceptable in OSS but obscure for enterprise."
  },
  // --- latin-greek-roots ---
  contexo: {
    uniqueness: 4, memorability: 3, 'concept-fit': 5, 'professional-quality': 3,
    rationale: "'I weave together' is a perfect DAG metaphor. Seven characters, pronounceable but non-obvious stress pattern. Latin gravitas helps enterprise but may feel academic to OSS devs."
  },
  syntaxis: {
    uniqueness: 4, memorability: 3, 'concept-fit': 5, 'professional-quality': 3,
    rationale: "'Together ordering' directly captures topological DAG execution. Familiar through 'syntax' but distinct. Eight characters, clear pronunciation. Slight risk of typo confusion with 'syntax'."
  },
  exequor: {
    uniqueness: 4, memorability: 2, 'concept-fit': 4, 'professional-quality': 2,
    rationale: "'I execute' captures autonomous execution well. The '-quor' ending is awkward for English speakers. Latin spelling feels obscure — hard to type and remember."
  },
  telergon: {
    uniqueness: 4, memorability: 3, 'concept-fit': 5, 'professional-quality': 3,
    rationale: "'Purpose work' embodies goal-driven execution. Pronounceable but 8 characters with an unusual 'tel-' prefix. Sounds technical, which helps in dev tools."
  },
  praxicon: {
    uniqueness: 4, memorability: 4, 'concept-fit': 3, 'professional-quality': 4,
    rationale: "Familiar rhythm from 'practice' + 'icon'. 'Action symbol' is a stretch for the converge concept. Clean phonetics and natural CLI feel. Works well in professional contexts."
  },
  diapraxis: {
    uniqueness: 4, memorability: 3, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "'Action through and across' loosely maps to DAG traversal. Nine characters is on the long side. The 'dia-' prefix suggests medical/diagnostic to some audiences."
  },
  conduco: {
    uniqueness: 3, memorability: 3, 'concept-fit': 4, 'professional-quality': 3,
    rationale: "'I bring together' fits the converge concept. Similar to 'conduit' and 'conductor' — recognizable but not highly distinctive. Pronounceable and professional enough."
  },
  synergon: {
    uniqueness: 2, memorability: 4, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "'Synergy' is a cliché in tech/business writing. The '-gon' ending helps distinguish it. Familiar root aids memorability. Lacks precision as a tool name."
  },
  perago: {
    uniqueness: 4, memorability: 3, 'concept-fit': 4, 'professional-quality': 3,
    rationale: "'I complete' captures the loop-until-checks-pass philosophy. Six characters, clear pronunciation. Latin verb form feels like a command — works as CLI binary."
  },
  noergon: {
    uniqueness: 4, memorability: 2, 'concept-fit': 3, 'professional-quality': 2,
    rationale: "'Mind work' is conceptually relevant but the 'noe-' prefix is awkward to pronounce and spell. Looks like a typo of 'no ergon'. Unlikely to pass the meeting test."
  },
  telotech: {
    uniqueness: 3, memorability: 4, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "'Purpose technology' is descriptive but generic. The '-tech' suffix is overused. Pronounceable and professional but lacks distinctiveness."
  },
  colligo: {
    uniqueness: 4, memorability: 3, 'concept-fit': 4, 'professional-quality': 3,
    rationale: "'I gather' captures the converge phase well. Root of 'collect' aids recognition. Seven characters, clear. Adequate but not exceptional."
  },
  compingo: {
    uniqueness: 4, memorability: 2, 'concept-fit': 3, 'professional-quality': 2,
    rationale: "'I join together' connects to DAG assembly. 'Pingo' sounds silly/childish in English — a serious problem for enterprise use. Hard to say in a meeting with a straight face."
  },
  taxilog: {
    uniqueness: 4, memorability: 4, 'concept-fit': 4, 'professional-quality': 4,
    rationale: "'Ordered reasoning' maps to the DAG's topological structure and playbook as logical spec. Familiar feel from taxonomy + logic. Clean, professional, pronounceable."
  },
  diaergon: {
    uniqueness: 4, memorability: 3, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "'Work through' loosely fits DAG execution. The 'dia-' prefix again suggests diagnostic. Two syllables help pronunciation but the word feels constructed."
  },
  // --- npm-pattern-study ---
  converger: {
    uniqueness: 2, memorability: 4, 'concept-fit': 5, 'professional-quality': 4,
    rationale: "Too close to the project name 'Converge' — confusing when used together. Self-describing and fits tool naming patterns (compiler, bundler, linter). Strong concept fit as 'thing that converges.'"
  },
  verifuse: {
    uniqueness: 5, memorability: 4, 'concept-fit': 5, 'professional-quality': 4,
    rationale: "Outstanding blend of the framework's two defining features: verification + fusion. Eight characters, two clear syllables, no pronunciation ambiguity. Excellent fit across all dimensions."
  },
  checkrun: {
    uniqueness: 4, memorability: 5, 'concept-fit': 4, 'professional-quality': 4,
    rationale: "Immediately understandable compound encoding the check-then-run philosophy. Eight characters, two familiar words. The name is a contract — honest and direct about what makes this tool different."
  },
  converix: {
    uniqueness: 4, memorability: 4, 'concept-fit': 4, 'professional-quality': 4,
    rationale: "Converge + -ix suffix fits CLI tool naming patterns. Retains the converge meaning with modern rhythm. Type 'converix run' and it feels like a first-class CLI citizen."
  },
  playdag: {
    uniqueness: 5, memorability: 4, 'concept-fit': 5, 'professional-quality': 3,
    rationale: "Directly names the two core structures: playbook + DAG. Crisp pronunciation. Technical enough for devs but 'playdag' may not resonate in enterprise sales decks."
  },
  // --- competitive-ai ---
  braid: {
    uniqueness: 5, memorability: 5, 'concept-fit': 5, 'professional-quality': 4,
    rationale: "Exceptional across the board. One syllable, real English word, completely unoccupied in AI. The braiding metaphor perfectly captures diverge→converge. Works naturally as both CLI binary and npm scope."
  },
  dowel: {
    uniqueness: 4, memorability: 4, 'concept-fit': 3, 'professional-quality': 4,
    rationale: "Clean, simple, precise word — no technology product uses it. The alignment/fit metaphor for DAG edges is clever but subtle. Craftsman feel works in OSS and enterprise."
  },
  // --- phonetic-aesthetics ---
  drvn: {
    uniqueness: 4, memorability: 2, 'concept-fit': 2, 'professional-quality': 2,
    rationale: "Consonant-cluster abbreviation is difficult to pronounce and feels try-hard. 'Driven' captures determination but not convergence specifically. Vowel-less names struggle in spoken conversation."
  },
  ivera: {
    uniqueness: 4, memorability: 4, 'concept-fit': 3, 'professional-quality': 4,
    rationale: "Flowing, melodic name built from 'verify'. The 'vera' root (Latin for true) reinforces trustworthiness. Subtle connection to verification — the framework's key differentiator."
  },
  cnvg: {
    uniqueness: 3, memorability: 1, 'concept-fit': 3, 'professional-quality': 1,
    rationale: "Unpronounceable consonant skeleton of 'converge'. Impossible to say in a meeting. Abbreviation pattern is common but the result is unusable in spoken contexts."
  },
  fluixa: {
    uniqueness: 4, memorability: 3, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "Built from 'flux' with a feminine -a ending. Two syllables but the spelling feels arbitrary. Flux/flow connection is relevant but not precise to the converge concept."
  },
  // --- brand-blending ---
  Vergen: {
    uniqueness: 5, memorability: 4, 'concept-fit': 4, 'professional-quality': 4,
    rationale: "Clever anagram: converge → Vergen. Reads as 'verge' + 'engine' — an engine that drives problems to the verge of completion. Capitalized form aids recognition. Strong brand potential."
  },
  Dagflow: {
    uniqueness: 4, memorability: 5, 'concept-fit': 5, 'professional-quality': 4,
    rationale: "Immediately meaningful to AI engineers: DAG + flow names the core concepts. Self-documenting name that requires no explanation. Slightly less elegant in enterprise slide decks."
  },
  Taskforge: {
    uniqueness: 3, memorability: 4, 'concept-fit': 4, 'professional-quality': 4,
    rationale: "Clear compound: tasks are forged through deterministic checks. The 'X-forge' pattern is somewhat common but the name is self-describing and professional."
  },
  Convergix: {
    uniqueness: 3, memorability: 3, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "Overly similar to 'converix' and the project name 'converge'. Nine characters, longer than needed. The convergence root is diluted by the -ix suffix."
  },
  Playweave: {
    uniqueness: 4, memorability: 4, 'concept-fit': 4, 'professional-quality': 4,
    rationale: "Playbook + weave elegantly describes the framework's core action. Self-describing, two familiar words. Nine characters but the compound is natural and pronounceable."
  },
  Veriforge: {
    uniqueness: 5, memorability: 4, 'concept-fit': 5, 'professional-quality': 4,
    rationale: "'Checks, not vibes' encoded in a name. Verify + forge perfectly captures the framework's signature principle. Nine characters, clear pronunciation, strong brand potential."
  },
  Runforge: {
    uniqueness: 3, memorability: 4, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "'Run' is generic among CLI tools. The forge metaphor is shared with several other candidates in this set, reducing distinctiveness. Functional but not inspired."
  },
  Forgeflow: {
    uniqueness: 3, memorability: 4, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "Forge + flow blends two overused concepts in this candidate set. Pronounceable and professional but lacks the precision of top candidates."
  },
  Agenthelm: {
    uniqueness: 3, memorability: 4, 'concept-fit': 3, 'professional-quality': 2,
    rationale: "Conflicts with Kubernetes Helm — a serious problem in the dev-tools space. Agent control metaphor is relevant but the name collision is disqualifying for searchability."
  },
  Daggio: {
    uniqueness: 5, memorability: 4, 'concept-fit': 3, 'professional-quality': 4,
    rationale: "DAG + -io creates a distinctive, startup-friendly name. Catchy and modern. Weak on the convergence concept but strong on the DAG foundation."
  },
  Weavel: {
    uniqueness: 4, memorability: 4, 'concept-fit': 4, 'professional-quality': 4,
    rationale: "Weave + -el transforms the metaphor into a brand. Six characters, clean pronunciation. The weaving metaphor supports the DAG orchestration concept well."
  },
  Convergify: {
    uniqueness: 2, memorability: 3, 'concept-fit': 3, 'professional-quality': 2,
    rationale: "Ten characters is long. The -ify suffix (Spotify, Shopify) feels consumer-oriented, not dev-tool. 'Make it converge' is playful but the name is derivative of the project name."
  },
  Coven: {
    uniqueness: 4, memorability: 5, 'concept-fit': 3, 'professional-quality': 3,
    rationale: "Clever letterplay within 'converge'. Five characters, real word, instantly memorable. But 'coven' connotes witches — a distraction in enterprise sales. The gathering metaphor is loose."
  },
  Helmflow: {
    uniqueness: 3, memorability: 4, 'concept-fit': 3, 'professional-quality': 2,
    rationale: "Like Agenthelm, conflicts with Kubernetes Helm. The flow metaphor adds little distinction. Functional name but the Helm collision is a serious issue."
  },
  // --- mythology-narrative ---
  ariad: {
    uniqueness: 5, memorability: 4, 'concept-fit': 5, 'professional-quality': 4,
    rationale: "Ariadne's thread = the playbook guiding through the DAG labyrinth. Perfect mythological fit. Five characters, pronounceable, distinctive. The reference enriches the narrative without being obscure."
  },
  dedal: {
    uniqueness: 4, memorability: 3, 'concept-fit': 4, 'professional-quality': 3,
    rationale: "Daedalus built the labyrinth — the playbook author as master craftsman. Five characters but may be misread. The mythological reference is somewhat obscure."
  },
  prometh: {
    uniqueness: 4, memorability: 3, 'concept-fit': 2, 'professional-quality': 2,
    rationale: "Truncated Prometheus — fire/knowledge bringer. The 'meth' substring is unfortunate. Connection to convergence is weak — more about bringing AI to developers generally."
  },
  // --- science-nature ---
  mycelium: {
    uniqueness: 4, memorability: 3, 'concept-fit': 5, 'professional-quality': 4,
    rationale: "Underground fungal network connecting and distributing resources — an excellent biological metaphor for the DAG. Eight characters, four syllables, some may stumble. Works as a tech name."
  }
};

// Build output
const result = validated.map(c => {
  if (c.available !== true) {
    return { ...c, scored: false, scores: null };
  }
  const name = c.name;
  const s = scores[name];
  if (!s) {
    // Fallback for any missing
    return {
      ...c,
      scored: true,
      scores: { uniqueness: 3, memorability: 3, 'concept-fit': 3, 'professional-quality': 3 },
      weighted_total: 3.0,
      score_rationale: 'No manual evaluation available — defaulting to 3.'
    };
  }
  const { uniqueness, memorability, 'concept-fit': conceptFit, 'professional-quality': professionalQuality, rationale } = s;
  const weighted_total = (uniqueness * 0.25 + memorability * 0.25 + conceptFit * 0.25 + professionalQuality * 0.25);
  return {
    ...c,
    scored: true,
    scores: { uniqueness, memorability, 'concept-fit': conceptFit, 'professional-quality': professionalQuality },
    weighted_total: Math.round(weighted_total * 100) / 100,
    score_rationale: rationale
  };
});

// Sort: scored first (by weighted_total desc), then unscored
const scored = result.filter(c => c.scored).sort((a, b) => b.weighted_total - a.weighted_total);
const unscored = result.filter(c => !c.scored);
const sorted = [...scored, ...unscored];

fs.writeFileSync(
  'artifacts/name-exploration/evaluated-candidates.json',
  JSON.stringify(sorted, null, 2) + '\n'
);

console.log(`Wrote ${sorted.length} candidates (${scored.length} scored, ${unscored.length} unscored)`);
console.log('Top 5:');
scored.slice(0, 5).forEach(c => {
  console.log(`  ${c.name}: ${c.weighted_total} — ${c.score_rationale}`);
});
