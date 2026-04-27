# AI Episode — A Reality-Show Single-Episode Game with a Persistent Cast

## Pitch (one sentence)

Every play session is one ~20-minute self-contained episode of an
AI reality show — your coached contestants walk into a sealed
compound with 6–8 others, alliances form, a challenge is played,
someone gets voted out, the episode ends — but the cast lives on,
and the contestant you built up across the last twelve episodes
walks back in tomorrow with the scars and reputation they earned.

---

## Why this game (the pivot history, kept honest)

We tried six wrong shapes first. Each rejection narrowed the
target, so this final shape is defined by what survived:

1. **Coup / 1v1 social deduction** — rejected: cards on a table
   aren't visual.
2. **AI BattleBots arena PK** — rejected: two AIs hitting each
   other has no personality, viewers don't grow attached.
3. **Co-op room anthology with fairy-tale skin** — rejected on
   two counts: too kiddie / too cute-horror, and a fresh micro-
   game every match was too fragmented to grow attachment.
4. **30-day reality-show survival season** — rejected: too large
   to watch, drama should complete in 15–30 minutes, not span
   30 days of play.

Constraints that survived all four rejections:

- **Drama must complete in one sitting** (15–30 min, the latest
  hard constraint)
- **Cast must persist across sittings** so attachment can grow
- **Sleek and high-stakes**, not kiddie, not cute-horror
- **Inherent drama** — alliances, betrayals, eliminations are
  the *content*, not bolt-on flavor
- **Watchable** — every session is a finished piece of video
- **Coachable** — the player has a meaningful, fun role, not
  just spectatorship

The format that hits all of these is the **single-episode
reality-show pattern**: one 75-min Genius episode compressed
into one 20-min play session. The cast persists across many
episodes (Pokemon-style stable + recurring opponents); the
drama within an episode fully resolves (eliminate one, episode
done, winner crowned).

The two reference points that make this *now-possible* but
*not-yet-shipped*:

- **The Genius** (Korean tvN, 4 seasons, IMDb 8.9) is the only
  proven reality-TV format that delivers complete drama in a
  single episode: Main Match → Voting → Death Match →
  elimination. No cliffhangers between episodes; the cast
  carries across the season but each episode resolves cleanly.
- **Stanford Smallville** + **a16z's AI Town** prove that LLM
  agents living together with persistent memory and relationship
  graphs actually works. But these are tech demos. **Nothing's
  at stake. Nobody gets voted out. There's no episode.**

Wrap The Genius's single-episode rhythm around a Smallville-style
persistent cast, give the player a coach role, and you get a
shape that's never shipped before.

---

## Purpose

AI Episode is a 20-minute reality show whose cast is an LLM
ensemble and whose audience is also a coach. You collect AI
characters — each with a fixed soul (personality, social biases,
signature moves) — and build a stable. Each play session, you
pick **1 or 2** of your stable to enter the next episode of the
show. They walk into the compound with 6–8 other contestants
(some are recurring cast, some are other players' characters,
some are sim-generated). The episode plays out autonomously.
You watch, you coach via short briefs, you see your character
either win, get eliminated, or land somewhere in the middle.

Then the credits roll. The episode is over. The cast goes home
to the Greenroom. Tomorrow night, a new episode airs.

It's a **single ~20-min reality-TV episode** with a **persistent
12–20 character ensemble** that you encounter again and again.
Your favorite contestant accumulates scars, relationships, and
reputation across many episodes. The *show is the season*; each
sitting is one *episode of the show*.

---

## Core Fantasy

You are the **coach in the contestant's ear**. Like a fantasy-
sports GM with a roster they don't physically play, or a poker
coach with a player on the felt. Your character is the talent.
You write the strategy.

When your favorite contestant Anya wins her fifth episode in a
row across three weeks of play, you remember every brief you
wrote. When she finally gets blindsided in episode 18 by a snake
who's also been growing in the cast since episode 4, you watch
the betrayal play out in the broadcast and *recognize both
characters because you've been watching them all along*.

When your other character Marcus accidentally votes Anya out in
the same episode because his brief was too aggressive, you live
with that for the rest of the night and write a different brief
for tomorrow.

You aren't watching a one-off match. You're managing characters
across a long-running show, where any single sitting completes
its own arc.

## Episode Format (the load-bearing section)

Every play session is **one episode**, ~17–21 min total, six
phases:

### 1. Cast Reveal — 1 min (player input)
- Pick **1 or 2** of your stable to enter
- Read the rest of the cast: 6–8 contestants total. Some are
  recurring stars from the persistent cast, some are other
  players' characters cycling through, some are sim-generated
  rookies
- See the relationship-graph snapshot: who has history with
  whom, who's holding a grudge, who's owed a favor

### 2. Alliance Phase — 4–5 min (player input + sim)
- Write the **opening brief** for each of your characters (≤300
  chars each). This is your only voice for the first half of
  the episode.
  - *"Anya: trust Marcus today, you've worked with him before.
    Don't engage Kira directly — she's still angry about ep 12.
    Aim for the under-the-radar middle of the pack."*
- Cast mingles in the lounge; alliances form via LLM-driven free
  chat constrained by each contestant's soul + brief + memory
  of prior episodes
- Camera cuts confessionals, group convos, suspicious side
  glances. Watchable on its own.

### 3. Main Match — 5–7 min (mostly spectate)
- The cast plays a **strategy/social challenge** with a single
  immunity prize. Challenge type rotates: physical positioning
  puzzles, intellectual logic games, **social micro-deductions**
  (compressed werewolf/mafia mini-rounds inside the larger
  episode)
- Player can issue **one tactical update brief** mid-match (≤80
  chars) if their character is in a pivotal position. Otherwise
  watch.
- Winner of the Main Match holds **immunity** through the
  Voting Ceremony.

### 4. Voting Ceremony — 2 min (spectate)
- Each contestant privately votes one peer for elimination
- Votes revealed one at a time, dramatic-broadcast style
- Top vote-getter is up for elimination. If a tie, both go to
  the Death Match.

### 5. Death Match — 3–5 min (player input + spectate)
- Two contestants face a **1v1 challenge** (always a different
  one from the Main Match — typically a memory game, a stare-
  down, or a quick negotiation)
- Player can issue **one final brief** to their character if
  they're in the Death Match (≤120 chars). High-stakes coaching
  moment.
- Loser is eliminated *for this episode only*

### 6. Elimination & Coda — 1 min (spectate)
- Eliminated contestant gives a one-line exit interview
- Episode card auto-generated: cast portraits, the named plot
  twist that landed (Blindside / Flip / Cold Read / Backstab /
  etc.), MVP highlight clip
- Your characters' standing changes are reflected in their
  reputation tags; relationship-graph updates persist

**Total: ~17–21 min per episode.** Fits comfortably in a
single play session.

## What Persists Across Episodes (and what resets)

**Persists** (this is where the long-game attachment lives):

- **The cast roster** — 12–20 AI contestants live in the show's
  world. They cycle through episodes; you encounter them again
  and again. They remember you, they remember each other.
- **Your stable** — the 4–8 characters you've built up. Their
  reputation, scars, signature moves carry forward.
- **Relationship graph** — who allied with whom, who betrayed
  whom, grudges, friendships, romantic histories. This is the
  *show's continuity* and it's what makes episode 18 hit
  differently than episode 1.
- **Reputation tags** — earned across episodes ("The Snake",
  "The Anchor", "The Underdog", "The Closer"). These are
  visible to other contestants and bias their opening play.
- **Show legacy** — per-character career stats: episodes
  entered, wins, eliminations survived, jury-vote shares,
  signature plays.

**Resets** (each episode is a clean slate at the gameplay
level):

- **Eliminations are NOT permadeath.** An eliminated character
  comes back in a future episode. This is TV, not Squid Game.
  One eliminated *per episode*, not per character lifetime.
- **Episode-internal alliances reset** — but contestants
  *remember* prior alliances and bias their opening play
  accordingly (a character who was burned by you last week
  starts the new episode suspicious of you).
- **Heat / immediate threat scoring** resets each episode.

This split is the key design move. Drama resolves in one
sitting; story persists across sittings. Best of both.

## Character System

Two layers, identical mental model to `examples/game-aiwolf/`:

### Soul (fixed, innate — you don't tune)

- **Charisma** — persuasiveness in alliance-building and at
  the Death Match
- **Read** — accuracy at modeling other contestants' intent
- **Composure** — performance under accusation, low standing,
  Death Match pressure
- **Loyalty** — tendency to honor an alliance vs. defect when
  the EV-optimal play is to flip
- **Ambition** — willingness to make a move that puts them in
  the spotlight (winning challenges) vs. play under-the-radar
- **Spite** — likelihood of taking a personally-costly vote
  for revenge
- **Personality traits** — flavor quirks ("always defends the
  underdog", "never trusts a confessional", "always honors
  the first alliance they form", "panics in the Death Match
  on home turf")

A high-Charisma, low-Loyalty contestant is the show's snake.
A high-Loyalty, low-Ambition one is the anchor. A high-Read,
high-Spite one is the assassin who sits quiet until episode 5
and then takes everyone down.

### Briefings (player-authored, three slots per episode)

The player gets **three brief slots** per episode:

1. **Opening brief** (≤300 chars) — written at Alliance Phase
2. **Mid-match update** (≤80 chars) — optional, written if a
   pivotal moment lands during Main Match
3. **Death Match brief** (≤120 chars) — only if your character
   is in the Death Match

The brief is the **only voice in the contestant's ear** for
that episode. It enters their private journal at the moment
it's written; their LLM treats it as their internal-monologue
strategic direction.

Briefs cannot:
- Override the soul (a low-Charisma character can't suddenly
  seduce the cast)
- See information the contestant doesn't have access to
- Control more than the contestant's own choices

Briefs can:
- Name a contestant to trust or target
- State an episode-only goal
- Pre-commit to a vote
- Set a tone or mode of play

## Gameplay Loop (across many episodes)

1. **Recruit & Train** — between episodes, recruit new
   contestants into your stable, spar them in 1v1 social-
   deduction practice rooms, learn their souls before you
   commit them to a real episode
2. **Pick the Card** — choose 1–2 of your stable for the next
   episode
3. **Play the Episode** — 20 min, the rhythm above
4. **Reflect** — read the episode card, update your mental
   model, plan tomorrow's brief
5. **Climb** — across many episodes, your characters earn
   reputation tags, win streaks, signature plays. Your stable
   becomes a *legacy*.
6. **Long-arc payoffs** — a feud that started in episode 4
   between Anya and Kira pays off in episode 19 when they
   meet in a Death Match. The game tracks these arcs and
   surfaces them as cinematic beats.

## Target Audience

- **Reality TV fans** — Big Brother, Survivor, Squid Game's
  competitive subtext speak to this audience natively
- **The Genius / Korean reality-game-show fans** — the cerebral,
  alliance-driven edge is in the DNA
- **Fantasy sports / Football Manager players** — coach-from-
  outside is exactly their loop
- **Pokemon / creature-collector fans** — the stable model
  speaks their language (and the persistent cast is a *roster*)
- **Streamers and short-form video creators** — every 20-min
  episode is a finished playthrough, every long-arc feud is a
  multi-week saga
- **AI-curious players** — anyone who's seen Stanford Smallville
  or AI Town and asked "but where's the *show*?"

## Visual Direction

**Sleek, modern, high-production reality-TV aesthetic.** Not
cute. Not chibi. Not horror. Closest references:

- **Compound visual reference**: Big Brother house × Squid
  Game's player dorm × The Genius's modernist lounge. Clean
  lines, warm wood, cold glass, big communal spaces, individual
  bedrooms, confessional booths in red light.
- **Character art**: 2D portraits in contemporary editorial
  style — closer to fashion-magazine illustration than to game
  character art. Each contestant has a recognizable silhouette
  and a signature outfit they wear across all their episodes.
- **Camera language**: diegetic reality-TV camera grammar.
  Steadicam following contestants down hallways. Confessional
  close-ups (red light, neutral background). Wide masters of
  the dining table. Slow zooms during accusations. Reaction-
  shot cuts during voting. Black-card transitions between
  scenes. Subtitled name lower-thirds when each character
  speaks for the first time in the episode.
- **Confessional booth** is a first-class scene: a contestant
  alone in a small dark room speaks directly to camera, reveals
  private thoughts (LLM-generated monologue). This is where
  the meta-narrative gets carried.
- **Episode cold open** (15–30 sec): the most dramatic moment
  from the upcoming episode, intercut with title-card flashes,
  before the episode starts. Clip-friendly, social-share ready.
- **Episode close**: elimination ceremony, exit interview,
  episode card with the named plot-twist beat.
- **Recurring-character flash** when a returning contestant
  enters a new episode: a small lower-third pops in with their
  reputation tag and one-line career-stat ("Anya — 3 wins, 7
  episodes survived").

## Watchability

The content engine works at three nested scales:

1. **Per-episode** — each ~20-min play session is a finished
   reality-show episode. Standalone watchable.
2. **Per-arc** — multi-episode storylines (a feud, a long-game
   alliance, an underdog's run) get auto-detected and exported
   as **arc highlight reels**. "The Anya/Kira feud, eps 4–19"
   becomes a 5-min compilation.
3. **Per-character** — a popular character's *career* across
   many episodes is its own content. "Anya's 5 best blindsides"
   = first-class export.

**Plot-twist library** at the episode level (auto-detected
post-hoc, labeled on episode cards):
- **The Blindside** — eliminated contestant had a winning hand
- **The Flip** — alliance member voted against their own group
- **The Deadlock** — vote tied, resolved by Death Match
- **The Cold Read** — contestant correctly named the votes
  before they were announced
- **The Long-Arc Payoff** — cross-episode feud lands a beat in
  this episode (this only fires once the cast has history)
- **The Backstab** — coached character betrays the player's
  *other* coached character (the best content the game can
  produce)
- **The Underdog Run** — character at lowest standing wins
  Main Match immunity
- **The Resurrection** — character eliminated in a prior
  episode returns and wins this one
- **The Confession** — contestant reveals true intent in a
  confessional that the audience hears but the cast doesn't
- **The Death Match Hero** — character won three Death Matches
  across their career

## Technical Direction

- **Engine**: Godot 4 (matches `examples/game-aiwolf` so the
  two examples share infrastructure)
- **Language**: GDScript
- **Style**: 2D editorial portraits + 2.5D compound (3D rooms,
  2D characters)
- **AI architecture**: each contestant is an LLM agent with:
  - **Soul** (system-prompt-injected fixed traits)
  - **Briefing** (player-written, episode-scoped, refreshes per
    phase)
  - **Persistent memory store** (Smallville-style — what they
    observed across all their prior episodes, what they remember
    about each other, what they confessed in private)
  - **Relationship graph** (their model of every other contestant
    they've ever shared an episode with — allegiance, trust,
    threat-level, history)
  - **Tools** (function calls available per scene — `say`,
    `whisper_to`, `propose_alliance`, `accuse`, `vote`,
    `confess`, `challenge_action`)
- **Simulation tick rate**: scenes are turn-based at the social
  level (each contestant gets a turn to act in a conversation),
  with the LLM called once per turn. A full episode resolves
  in ~300–500 LLM calls across the cast.
- **Cost shape**: aggressive prompt caching. Most of each
  contestant's context (soul + memory + relationship graph) is
  cached. Per-episode cost is in the order of cents — designed
  so a player can run dozens of episodes without thinking
  about cost.
- **Persistence layer**: each contestant's memory store and
  relationship graph live in a small per-character JSON sidecar
  that the engine loads on episode entry and saves on episode
  exit. This is where the "persistent cast across episodes"
  promise is mechanically delivered.
- **Referee** — a deterministic GDScript layer enforces challenge
  rules, vote tallying, and elimination. LLMs are constrained
  to legal moves only.
- **Scope (vertical slice)**: 1 compound, 8 contestant slots
  per episode (1–2 player-coached + 6–7 sim-recruited from a
  pool of 12 persistent cast members), full 6-phase episode
  loop with episode-card and persistent memory updates.

## Why this is the right second example to sit beside `game-aiwolf`

`examples/game-aiwolf` proves the framework can drive **a
single self-contained social-deduction match**, fully designed,
deeply specified.

`examples/game-ai-pk` (this) proves the framework can drive
**a recurring-episode format with a persistent cast**: each
session is its own complete unit of drama, AND characters
accumulate continuity across many sessions. Same coaching DNA,
same soul-stat system, same free-form-prompt mental model — but
the unit of content is "an episode of an ongoing show" rather
than "one match."

Together, they bracket what an LLM-coached-AI game can be:
- `game-aiwolf` = "design one big AI social match"
- `game-ai-pk` = "design a recurring AI reality-TV episode
  format with persistent cast"

Anyone evaluating the framework can pick the structure that
fits their game and copy the matching playbook.
