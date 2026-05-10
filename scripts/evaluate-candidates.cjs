#!/usr/bin/env node
// Score all npm-available candidates on 4 dimensions (1-5 scale)
// Output: artifacts/name-exploration/evaluated-candidates.json

const fs = require('fs');
const path = require('path');

const input = JSON.parse(fs.readFileSync('artifacts/name-exploration/validated-candidates.json', 'utf-8'));

const scores = {
  // metaphor-domains
  tenter:        { uniqueness: 4, memorability: 2, concept_fit: 3, professional_quality: 2, rationale: 'Highly distinctive but the word is obscure and easily confused with "tender." The cloth-stretching metaphor for verification is clever but forced — most users would need it explained. Awkward to say in a meeting.' },

  // latin-greek-roots
  contexo:       { uniqueness: 4, memorability: 3, concept_fit: 4, professional_quality: 3, rationale: 'Latin for "I weave together" maps cleanly to DAG orchestration. Pronounceable at 7 chars, but the Latin origin makes it unfamiliar to most developers. Carries scholarly gravitas without being overly pretentious.' },
  syntaxis:      { uniqueness: 4, memorability: 4, concept_fit: 4, professional_quality: 4, rationale: 'Familiar through "syntax" but distinctly its own word. The topological-ordering meaning fits the DAG execution model precisely. Sounds professional and technical without being obscure.' },
  exequor:       { uniqueness: 4, memorability: 2, concept_fit: 4, professional_quality: 3, rationale: 'Latin "I execute" directly names the core action, but the -quor ending is hard to spell and pronounce for English speakers. Strong meaning undermined by accessibility issues.' },
  telergon:      { uniqueness: 4, memorability: 2, concept_fit: 4, professional_quality: 3, rationale: 'The telos+ergon compound (purposeful work) captures goal-driven execution well, but the unusual Greek combination is hard to remember or spell. Feels more academic than practical.' },
  praxicon:      { uniqueness: 4, memorability: 3, concept_fit: 4, professional_quality: 4, rationale: '"Praxis" + "icon" suggests an executable symbol — a playbook as specification. The -icon suffix gives it a tool-like feel reminiscent of "lexicon." Professional but not instantly meaningful.' },
  diapraxis:     { uniqueness: 4, memorability: 2, concept_fit: 4, professional_quality: 3, rationale: 'The "dia" (through/across) prefix combined with "praxis" captures DAG traversal well, but at 9 characters with unfamiliar Greek roots, it is too long and hard to recall.' },
  conduco:       { uniqueness: 3, memorability: 3, concept_fit: 4, professional_quality: 3, rationale: 'Close to "conductor" and "conduit," reducing distinctiveness. The "bring together" meaning fits convergence well. Pronounceable but risks confusion with existing terms.' },
  synergon:      { uniqueness: 3, memorability: 3, concept_fit: 3, professional_quality: 3, rationale: '"Synergy" is overused in tech branding, making this feel generic despite the Greek root. The "working together" concept is broadly applicable but doesn\'t specifically evoke convergence or DAGs.' },
  perago:        { uniqueness: 4, memorability: 3, concept_fit: 4, professional_quality: 3, rationale: 'Latin "I complete" captures the deterministic loop — running until checks pass. Short at 6 chars and pronounceable. Lacks a clear tech connotation on first hearing.' },
  noergon:       { uniqueness: 4, memorability: 2, concept_fit: 4, professional_quality: 2, rationale: 'Nous+ergon (mind work) is conceptually apt for AI agent orchestration, but "noergon" is hard to pronounce and the "no-" prefix reads negatively in English. Awkward in professional contexts.' },
  telotech:      { uniqueness: 4, memorability: 3, concept_fit: 3, professional_quality: 4, rationale: 'Telos+tech sounds like a plausible tech company name. Purposeful technology fits the framework but at a generic level. The "tele-" prefix may cause confusion with telecommunications.' },
  colligo:       { uniqueness: 3, memorability: 3, concept_fit: 4, professional_quality: 3, rationale: 'Latin for "I gather" captures the converge phase. Familiar from "collect" but the -ligo ending feels informal. Pronounceable but not distinctive enough to stand out.' },
  compingo:      { uniqueness: 4, memorability: 2, concept_fit: 3, professional_quality: 2, rationale: 'Unusual Latin verb for joining/compacting. Hard to spell and pronounce, and the meaning connection is loose. Sounds like a typo of "comping" or "compingo" — awkward in conversation.' },
  taxilog:       { uniqueness: 4, memorability: 3, concept_fit: 4, professional_quality: 3, rationale: 'Taxis+logos (ordered reasoning) maps to playbooks as structured specifications. Feels like "taxonomy" + "logic" which is intuitive. Somewhat niche and academic in tone.' },
  diaergon:      { uniqueness: 4, memorability: 2, concept_fit: 3, professional_quality: 2, rationale: 'Dia+ergon (work through) is generic and hard to parse. The diphthong sequence is awkward in English. Neither memorable nor professional-sounding.' },

  // npm-pattern-study
  converger:     { uniqueness: 3, memorability: 4, concept_fit: 4, professional_quality: 4, rationale: 'Follows the proven -er tool pattern (compiler, bundler, linter). Intuitively means "the thing that converges." Self-describing and professional, though derived from a taken name.' },
  verifuse:      { uniqueness: 5, memorability: 3, concept_fit: 5, professional_quality: 4, rationale: 'The only coined name that captures BOTH defining features: verification (checks, not vibes) and fusion (convergence). Distinctive and modern. The blend may take a second hearing to parse, but once understood it sticks.' },
  checkrun:      { uniqueness: 3, memorability: 5, concept_fit: 5, professional_quality: 4, rationale: 'Instantly communicates the execution philosophy in two common words. Zero learning curve — "check, then run" is the framework\'s contract. Practical and honest, though less distinctive as a brand.' },
  converix:      { uniqueness: 4, memorability: 3, concept_fit: 3, professional_quality: 4, rationale: 'The -ix suffix signals modern CLI tooling and gives a clean binary feel. Retains the converge meaning but the suffix adds rhythm rather than semantic value. Feels like a real CLI command.' },
  playdag:       { uniqueness: 4, memorability: 3, concept_fit: 5, professional_quality: 3, rationale: 'Directly names the two core structures (playbook + DAG). Technical audience immediately understands. "Play" may sound less serious in enterprise contexts, and "dag" is a mild profanity in some English dialects.' },

  // competitive-ai
  braid:         { uniqueness: 5, memorability: 5, concept_fit: 5, professional_quality: 5, rationale: 'Exceptional fit: 5 characters, 1 syllable, universal English word. Braiding IS the diverge→converge pattern — separate strands woven into a unified whole. No AI tool occupies this naming territory. Works perfectly as CLI binary and npm scope.' },
  dowel:         { uniqueness: 5, memorability: 4, concept_fit: 4, professional_quality: 4, rationale: 'Clean, precise engineering word that no tech product uses. The dowel-as-handoff metaphor (aligning node outputs to inputs) is apt and elegant. Short, one syllable, and carries craftsman credibility.' },

  // phonetic-aesthetics
  drvn:          { uniqueness: 4, memorability: 1, concept_fit: 2, professional_quality: 1, rationale: 'Consonant-only name is unpronounceable and looks like a typo or license plate. "Driven" is too generic for the concept. Fails the meeting test completely — you cannot say this name aloud without spelling it.' },
  ivera:         { uniqueness: 4, memorability: 3, concept_fit: 4, professional_quality: 4, rationale: 'Derived from "verify" with the Latin "vera" (truth) root reinforcing correctness. Flowing, melodic pronunciation. Feels like a real brand name, though the derivation is not immediately obvious.' },
  cnvg:          { uniqueness: 4, memorability: 1, concept_fit: 2, professional_quality: 1, rationale: 'Consonant skeleton of "converge" — unpronounceable as a word. Works as a file extension or code, not as a tool name. Fails every "say it in a meeting" test.' },
  fluixa:        { uniqueness: 4, memorability: 3, concept_fit: 4, professional_quality: 3, rationale: 'Flux + -a gives a modern feel. The flow/DAG connection is strong, and the "x" adds distinction. The -a ending feels trendy rather than timeless.' },

  // brand-blending
  Vergen:        { uniqueness: 4, memorability: 3, concept_fit: 4, professional_quality: 4, rationale: 'Clever anagram of "converge" reading as "verge engine" — an engine driving completion. Capitalization-dependent, which is a minor weakness. Overall sounds like a legitimate product name.' },
  Dagflow:       { uniqueness: 3, memorability: 3, concept_fit: 5, professional_quality: 3, rationale: 'Directly descriptive of DAG + execution flow. Immediately meaningful to the target audience. More descriptive than brandable — works as a codename better than a product identity.' },
  Taskforge:     { uniqueness: 3, memorability: 4, concept_fit: 4, professional_quality: 4, rationale: 'Two familiar words forming a clear metaphor: tasks are forged (crafted under heat/pressure of checks). Industrial-strength connotation. Slightly generic due to prevalence of "forge" in tech naming.' },
  Convergix:     { uniqueness: 3, memorability: 3, concept_fit: 3, professional_quality: 3, rationale: 'Converge + -ix gives CLI tool rhythm but feels derivative — close to the existing "converix." At 9 characters it is on the long side. The suffix adds noise rather than meaning.' },
  Playweave:     { uniqueness: 4, memorability: 3, concept_fit: 5, professional_quality: 3, rationale: 'Beautiful metaphor: playbooks woven into a DAG. "Play" may undermine enterprise gravitas, but the weaving concept is precise and evocative. Works better for OSS than enterprise sales.' },
  Veriforge:     { uniqueness: 4, memorability: 3, concept_fit: 5, professional_quality: 4, rationale: '"Verify" + "forge" embodies the framework\'s signature: checks-forged reliability. Both words carry weight. At 9 chars it is longer than ideal but the compound is clean and meaningful.' },
  Runforge:      { uniqueness: 3, memorability: 4, concept_fit: 3, professional_quality: 4, rationale: 'Action-oriented and punchy — "run" is exactly what you do with a playbook. More generic than "veriforge" since it emphasizes execution over verification. Solid but less distinctive.' },
  Forgeflow:     { uniqueness: 3, memorability: 3, concept_fit: 4, professional_quality: 4, rationale: 'Balances the industrial (forge) with the dynamic (flow). Captures both the craftsmanship of task execution and the DAG traversal. Another forge compound — the family is getting crowded.' },
  Agenthelm:     { uniqueness: 3, memorability: 3, concept_fit: 3, professional_quality: 3, rationale: 'Descriptive compound: the helm steers agents. Adequate metaphor but "helm" is uncommon in modern tech naming and the compound feels constructed rather than natural. 9 characters is long for a CLI binary.' },
  Daggio:        { uniqueness: 4, memorability: 3, concept_fit: 3, professional_quality: 3, rationale: 'DAG + -io gives a modern startup feel. The -io suffix is familiar in dev tools but also overused. 6 characters is concise. More style than substance in the naming.' },
  Weavel:        { uniqueness: 4, memorability: 3, concept_fit: 4, professional_quality: 3, rationale: 'Weave + -el transforms a common word into a distinctive name. The weaving metaphor fits the DAG well. The -el suffix feels slightly contrived, as if "weave" needed to be different for its own sake.' },
  Convergify:    { uniqueness: 3, memorability: 2, concept_fit: 3, professional_quality: 2, rationale: 'At 10 characters, too long for a CLI tool. The -ify suffix pattern (Spotify, Shopify) feels consumer-facing, not developer-tool. Describes the action rather than naming the tool. Hard to type repeatedly.' },
  Coven:         { uniqueness: 5, memorability: 5, concept_fit: 4, professional_quality: 3, rationale: 'Brilliant extraction from "converge" forming a real English word meaning gathering/assembly. Exceptionally concise and memorable. The witchcraft connotation may be a liability in conservative enterprise settings.' },
  Helmflow:      { uniqueness: 3, memorability: 3, concept_fit: 3, professional_quality: 3, rationale: 'Steering + flow captures orchestration but "helm" has strong Kubernetes/DevOps associations (Helm charts) that could cause confusion. Adequate but not distinctive.' },

  // mythology-narrative
  ariad:         { uniqueness: 5, memorability: 4, concept_fit: 5, professional_quality: 4, rationale: 'Ariadne\'s thread through the labyrinth is the perfect metaphor: a playbook guides agents through complex DAG structures to a verified exit. 5 characters, pronounceable, classical without being pretentious. The myth maps directly to the user experience.' },
  dedal:         { uniqueness: 5, memorability: 3, concept_fit: 4, professional_quality: 4, rationale: 'Daedalus as master craftsman who built the labyrinth — the playbook author as architect of intricate DAG structures. Distinctive and carries engineering credibility. Less immediately familiar than Greek names like "Atlas."' },
  prometh:       { uniqueness: 4, memorability: 3, concept_fit: 3, professional_quality: 3, rationale: 'Truncated Prometheus — bringing fire/technology to developers. The mythological weight is appropriate but the truncated form feels informal. "Prometheus" is already used heavily in tech (monitoring), creating confusion risk.' },

  // science-nature
  mycelium:      { uniqueness: 5, memorability: 3, concept_fit: 5, professional_quality: 3, rationale: 'The underground fungal network that connects and distributes resources is a stunning metaphor for how the framework routes data and execution across agents. 8 characters is longer than ideal, and the mushroom association may not resonate in all professional contexts.' },
};

const weights = { uniqueness: 0.25, memorability: 0.25, 'concept-fit': 0.25, 'professional-quality': 0.25 };

const output = input.map(candidate => {
  if (candidate.available === true) {
    const nameKey = candidate.name;
    const s = scores[nameKey];
    if (!s) {
      console.error(`Missing scores for available candidate: ${nameKey}`);
      return { ...candidate, scored: false, scores: null };
    }
    const weighted = (
      s.uniqueness * 0.25 +
      s.memorability * 0.25 +
      s.concept_fit * 0.25 +
      s.professional_quality * 0.25
    );
    return {
      ...candidate,
      scored: true,
      scores: {
        uniqueness: s.uniqueness,
        memorability: s.memorability,
        'concept-fit': s.concept_fit,
        'professional-quality': s.professional_quality
      },
      weighted_total: Math.round(weighted * 100) / 100,
      score_rationale: s.rationale
    };
  } else {
    // unavailable or null — include but not scored
    return { ...candidate, scored: false, scores: null };
  }
});

// Sort: scored first by weighted_total desc, then unscored
const scored = output.filter(c => c.scored === true).sort((a, b) => b.weighted_total - a.weighted_total);
const unscored = output.filter(c => c.scored !== true);

const final = [...scored, ...unscored];

fs.mkdirSync('artifacts/name-exploration', { recursive: true });
fs.writeFileSync('artifacts/name-exploration/evaluated-candidates.json', JSON.stringify(final, null, 2));

console.log(`Wrote ${final.length} candidates (${scored.length} scored, ${unscored.length} unscored)`);
console.log('Top 10:');
scored.slice(0, 10).forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.name} (${c.weighted_total}) - ${c.scores['concept-fit']}cf ${c.scores.uniqueness}u ${c.scores.memorability}m ${c.scores['professional-quality']}pq`);
});

// Validate scores
const allScoresValid = scored.every(c => {
  const s = c.scores;
  return s.uniqueness >= 1 && s.uniqueness <= 5 &&
         s.memorability >= 1 && s.memorability <= 5 &&
         s['concept-fit'] >= 1 && s['concept-fit'] <= 5 &&
         s['professional-quality'] >= 1 && s['professional-quality'] <= 5;
});
console.log(`\nAll scores in range 1-5: ${allScoresValid}`);
console.log(`All available candidates scored: ${scored.length === 45}`);
