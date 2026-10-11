# Opponent-scripting lineage — MiniMax R&D

*For Bomberman Commander. Question: where do "named strategies a commander
switches between" come from, historically? Answer: everywhere. The tile
system is not an invention; it is the latest abstraction layer in a
40-year stack.*

## The thesis in one paragraph

Every era of game AI added one layer between *intent* and *action*. Scripted
patterns said "do this sequence." FSMs said "be in this state." Behavior
trees said "run this branch." Utility AI said "want this most." GOAP said
"figure out how." **Tiles say "fight like this now" — and hand the choice
to a human commander, live, by voice.** The lineage matters because each
layer solved a readability problem the previous one created, and our tile
system inherits all of those solutions.

## Era by era

### 1980 — Pac-Man: the original tile system
Four ghosts, four names, four colors, four personalities: one chases, one
ambushes ahead of you, one flanks, one wanders. Each ghost is a *named,
readable strategy* — you can point at the screen and say what each one is
doing. That is a tile system with no commander. Everything we want tiles to
be — legible, nameable, counterable — was already true in a maze game with
4KB of ROM.

### 1983 — Bomberman: constraints breed readability
Hudson Soft's original was written as a tech demo for their BASIC compiler
and released July 1983 for Japanese home computers (NEC PC-8801, MSX,
Sharp/Fujitsu machines). Enemies were tiny scripted patterns on a grid —
wander, chase-when-aligned, speed up when you're close. The grid is the
unsung hero: discrete tiles make behavior *legible at a glance*. A ghost on
a grid telegraphs its next three moves; a ghost in 3D space telegraphs
nothing. Our map being a grid is not retro nostalgia — it is a readability
technology.

### 1990s — FSMs: the scripted-bad-guy era
Finite state machines — idle, patrol, alert, attack, flee — became the
default. Doom, Quake, every platformer boss. Cheap, debuggable, and exactly
what Casey remembers: "programmers scripting better and better bad guys."
The failure mode is the combinatorial explosion: N states need ~N²
transitions, and authors drown. Lesson for tiles: **keep the tile count
small and the transitions implicit** (the commander switches; the tile
never decides to switch itself).

### 2000 — Utility AI (The Sims): personality as arithmetic
Maxis scored every possible action against motives (hunger, fun, bladder…)
and picked the winner. No scripts — *preferences*. This is the direct
ancestor of a tile's internals: a tile is a set of weights over primitive
drives (aggression, greed, caution, spite). Custom tiles in v2 should be
authored as weight adjustments, not code branches — players already think
in "more aggressive, less greedy."

### 2004 — Behavior trees (Halo 2): the industry standard
Bungie's formulation (leaf actions, selector/sequence nodes, ticked
top-down) made complex NPC behavior modular and reusable. Most of Halo's
tree was *shared across enemy types* with small overrides — the same
economy we want: one engine, many tiles, each tile a small override on
shared primitives. BTs are also *inspectable*: you can watch which branch
is live. That inspectability is what the spreadsheet view is for.

### 2005 — GOAP (F.E.A.R., Jeff Orkin): planning over world state
Enemies planned action sequences toward goals with A*-over-world-states and
looked so smart players accused them of cheating. The famous corrective:
as AI got more capable, designers had to make it *pretend to be dumber* —
deliberate hesitation, missed shots — because ruthless isn't fun.
**This is the single most important lesson for our tiles: a tile that
plays perfectly is a tile nobody enjoys commanding.** Every tile needs a
built-in flaw the enemy commander can read and punish. Counterability is
not a bug in the AI; it is the game.

### 2008 — EndWar: voice as the command interface
Ubisoft's console RTS ran on ~40 spoken words through a walkie-talkie
push-to-talk: "unit one, attack hostile two." An on-screen popup showed
valid next words as you spoke. Two lessons: (1) 40 words is enough for a
whole war — our grammar can be tiny; (2) *show the grammar as you speak*
— the tile bar under the game is EndWar's popup window. We are rebuilding
EndWar's interface with the commander's vocabulary instead of the
lieutenant's.

### 2008 — Left 4 Dead: the AI Director
Not an opponent but a *pacer*: a system that watched player stress and
dealt zombies accordingly. Relevant because our tiles need a director too —
not for difficulty, for *drama*. A round where both commanders turtle for
three minutes is a failure of pacing, and a lightweight director (power-up
drops drift toward action, sudden-death shrink) fixes it without touching
any tile.

### 2011 — Frozen Synapse: orders, then watch
Mode 7's simultaneous-turn tactics: both players issue orders, then watch
them play out together. "If your strategy is set for a while you'd see it
play out until you might need to hedge" — that sentence *is* Frozen
Synapse. Proof that watching your own orders execute is fun, provided the
orders were *yours* and the outcome was uncertain.

### 2016–2019 — Gladiabots: the closest ancestor
GFX47's arena battler: program your squad's AI in a visual flowchart
(no code required), wind them up, watch them fight — async multiplayer
included. It proved players will happily *author* behavior and then
*spectate* it. Its miss, for us: authoring happens *before* the match,
never *during*. Our tiles move the authoring into the match itself, via
voice. Gladiabots is the pre-match version of our game.

### 2019 — Auto-battlers (Teamfight Tactics): command at scale
Draft a team, position it, then combat resolves automatically while you
watch eight boards at once. The skill is entirely in setup, scouting, and
adaptation between rounds. Proof that an audience exists for "I don't touch
the pieces while they fight" — and that the fun concentrates in *decisions
under uncertainty*, not execution.

### The anti-lesson — AlphaStar / OpenAI Five
Superhuman StarCraft and Dota bots proved execution ceilings are meaningless
now. Nobody wants to command a perfect player; they want to command a
*readable* one. Learned black-box policies are the enemy of counterplay:
you cannot punish what you cannot name. **Our tiles must stay authored,
not learned** — or at minimum, any learned tile must be distilled into a
nameable behavior first.

## What the old games got right about readable, counterable AI

1. **Name it and color it.** Pac-Man's ghosts work because Blinky/Pinky/Inky/
   Clyde are *characters*. A tile called "Turtle" that turns your bomberman
   green-ish and visibly bunkers is readable; a tile called
   "defensive-weight-0.7" is not.
2. **Telegraph before you strike.** Every good boss winds up. A tile switch
   should have a ~1s visible "about to" state — the enemy commander *sees*
   the Bloodhound coming and gets to answer. Surprise is for jump scares,
   not strategy games.
3. **Constrain the arena.** Grids, lanes, corners — discrete space makes
   intent legible. Our procedural maps must preserve readable structure
   (rooms, chokepoints), not just random noise.
4. **Commit.** A behavior you can read for 0.5 seconds isn't counterable.
   Tiles should lock for a minimum duration (say 5–8s) after switching —
   commitment is what makes yomi (reading the opponent) possible.
5. **Fake the weakness.** Per the F.E.A.R. lesson: tune every tile to
   ~human-competitive, never optimal. The tile's flaw is its most
   important feature.

## What fits the tile system (recommendations)

- **Tile = named behavior-tree branch + utility weights, JSON-serializable.**
  The engine owns ~30 primitives (move-to, bomb-at, flee-blast,
  seek-powerup, patrol-region…); a tile is data: which branch is live and
  how the drives are weighted. Voice maps to tile selection; the tile never
  selects itself.
- **Influence maps for the spreadsheet view**, not for the AI. Threat maps
  (where blasts will be in 3s), escape-route counts, item-greed maps — these
  are commander intelligence, and rendering them is what makes the second
  view worth scrolling to.
- **FSM for tile lifecycle only**: armed → active → locked → cooldown.
  Small, boring, correct.
- **Do NOT use at runtime:** GOAP/planning (unreadable chains), learned
  policies (un-nameable), utility AI *across* tiles (the commander is the
  utility function — that's the point of the game).

## Sources
- Bomberman history: https://en.wikipedia.org/wiki/Bomberman
- Behavior trees: https://en.wikipedia.org/wiki/Behavior_tree_(artificial_intelligence,_robotics_and_control)
- GOAP in F.E.A.R.: https://news.ycombinator.com/item?id=40173540
- Gladiabots: https://store.steampowered.com/app/871930
- EndWar voice commands: https://www.gamespot.com/articles/tom-clancys-endwar-hands-on/1100-6183903/
- Frozen Synapse: https://www.rockpapershotgun.com/preview-frozen-synapse
