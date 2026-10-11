# Bomberman Commander — MiniMax ideation

*My own take. I read the concept doc, did the lineage research, and here is
where I agree, where I'd push, and what I'd build. Opinionated on purpose.*

## The one-sentence version

**Gladiabots had the authoring, Frozen Synapse had the watching, EndWar had
the voice — nobody put all three in one match, live, with a commander who
can change their mind mid-fight.** That is the gap. Everything below serves it.

## 22 tiles (we ship 12 — fight me on the cuts)

Format: **Name** — behavior. Voice: *"what the commander says."*

**HUNT family** (the fun everyone understands first)
1. **Bloodhound** — Relentless pursuit of the nearest enemy; bombs to clear
   the path, not to trap. Voice: *"hunt him down."*
2. **Corner Rat** — Herds the enemy toward the nearest wall pocket or corner,
   then closes. Voice: *"corner him."*
3. **Shadow** — Stalks at 3-tile distance, never strikes first; punishes the
   enemy's mistakes. Voice: *"stay on his tail."*

**SPACE family** (board control)
4. **Turtle** — Fortifies a home region, bombs defensively, never chases.
   Voice: *"turtle up."*
5. **Landlord** — Claims the map center and patrols it; taxes anyone who
   enters. Voice: *"hold the middle."*
6. **Ghost** — Zero contact. Breaks only safe blocks, plants almost nothing,
   outlives everyone. Voice: *"go quiet."*

**ECONOMY family** (the greedy ones)
7. **Prospector** — Prioritizes blocks likely to hold items, grabs and
   relocates. Voice: *"find power-ups."*
8. **Hoarder** — Collects everything, avoids all fights until powered up,
   then flips aggressive. Voice: *"grab everything."*
9. **Scavenger** — Trails the enemy at a distance and steals the items *they*
   uncover. Voice: *"eat his dust."*

**TRICK family** (mind games)
10. **Kamikaze** — Trades 1-for-1; chases into blasts on purpose.
    Voice: *"take him with you."*
11. **Baiter** — Plants tempting bombs as lures, punishes the approach.
    Voice: *"bait him in."*
12. **Phantom** — Never in the expected square; constant unpredictable
    repositioning. Voice: *"be somewhere else."*

**TEMPO family** (time is a weapon)
13. **Patient Zero** — Holds all bombs until the enemy commits to a line,
    then springs the trap. Voice: *"wait for it."*
14. **Blitz** — Maximum violence in the opening 30 seconds, then gassed.
    Voice: *"go go go."*
15. **Closer** — Idles safely until an enemy is weakened or cornered, then
    executes. Voice: *"finish it."*

**WEIRD family** (the ones people will remember)
16. **Gardener** — Seeds bombs in geometric patterns across the map; zone
    denial as a lifestyle. Voice: *"plant the field."*
17. **Mirror** — Copies the enemy's current tile. The metagame tile.
    Voice: *"do what he does."*
18. **Gambler** — Switches to a random tile every 20 seconds. Chaos agent.
    Voice: *"roll the dice."*
19. **Diplomat** — (3+ players) Avoids the strongest, pressures the weakest.
    Voice: *"make friends."*
20. **Janitor** — Methodically clears the messiest region of the map.
    Voice: *"clean up."*
21. **Insomniac** — Never stops moving; never plants without an exit already
    chosen. Voice: *"never stop moving."*
22. **Accountant** — Always keeps 2+ escape routes; the ultra-safe tile that
    wins by never dying. Voice: *"count the exits."*

### My 3 cuts (argue with me)
1. **Gambler — cut.** Fun exactly once. Randomness isn't a strategy, it's the
   absence of one, and it teaches nothing. It also poisons tile-trading:
   nobody trades a slot machine.
2. **Diplomat — cut (shelve for 3+ player).** Dead tile in 1v1, which is
   where the game launches. Ship it with the multiplayer update or not at all.
3. **Janitor — cut.** Weakest identity on the board: Gardener already owns
   zoning, Prospector already owns clearing. It loses every internal
   matchup for "why does this tile exist."

That leaves 19. The remaining 7 cuts should come from playtest data, not
from me — specifically, cut whichever tiles have no winning matchup in the
counter matrix (see below).

## Voice grammar: the smallest grammar that feels like command

EndWar proved ~40 words runs a whole war. Ours can be smaller, because the
tile *is* the sentence. The grammar:

```
ORDER    := TILE [MODIFIER] [CONDITION]
TILE     := "hunt him down" | "turtle up" | "find power-ups" | ...
MODIFIER := "but stay safe" | "fast" | "quietly"
CONDITION:= "until I say go" | "for thirty seconds" | "then stop"
```

Three things make it feel like command rather than menus:

1. **Targets resolve from context.** "Hunt *him*" — the game knows who
   "him" is (nearest visible enemy, or the one who just killed your
   power-up streak). Commanders point with pronouns; the engine resolves.
2. **Conditional orders.** *"Turtle until I say go"* is the killer feature.
   An order with a release condition is a *plan*, and plans are what
   separate commanding from button-mashing. Ship three conditions at
   launch: time ("for thirty seconds"), event ("until he moves"), manual
   ("until I say go").
3. **Stacking, not replacing.** *"Hunt him but stay safe"* = Bloodhound
   with Accountant's escape-route constraint layered on. Two tiles compose;
   the second is always a modifier, never a second primary. This keeps the
   mental model clean: one job, one constraint.

And the readback closes the loop — the bomberman acknowledges
("Hunting." / "Turtling.") through the radio protocol. A commander who
isn't sure the order landed will repeat it; the readback is what makes
voice *trustworthy* instead of merely cool.

## The spreadsheet view: a coach, not a dashboard

Most second-screens fail because they show *data*. Ours should show
*answers*. Four panels, in priority order:

1. **"What is he doing?"** — the enemy's *inferred* tile with a confidence
   meter ("Turtle, 70% — he's been in one region 40s"). This is the single
   most valuable thing a commander can know, and naming it out loud
   ("he's turtling") is the moment a player learns the game.
2. **"What beats it?"** — the counter matrix, live. Against inferred
   Turtle: *Baiter, Blitz*. This panel teaches the metagame while you play.
   It is the difference between a player who flails and a player who
   *hedges*.
3. **Threat map** — influence-map overlay: where blasts will be in 3
   seconds, escape-route counts per region, item-greed heat. Commander
   intelligence, rendered.
4. **Order ledger** — timestamped log of every order given and tile switched,
   both sides (inferred for the enemy). The ledger is the replay, the
   argument-settler, and eventually the training data.

Design rule: if a panel doesn't change what the commander says next, cut
it. The spreadsheet view earns its scroll by making the next order smarter.

## Custom tiles (v2): trust comes from witnessing

Casey's requirement: a player describes an idea, a chatbot confirms
understanding, the tile goes live. The hard part isn't generation — it's
*trust*. My proposal, in three layers:

1. **The chatbot readback.** Not "I understand" — a *paraphrase with teeth*:
   "So: hunt power-ups aggressively, but never chase into a dead end.
   Right?" The player corrects or confirms. Two rounds max, then it locks.
   (This is the witness chain: the player *saw* the understanding happen.)
2. **The sandbox bout.** Before a custom tile goes live, it fights a
   15-second exhibition against a dummy in a corner of the screen. The
   player watches it behave. Trust from witnessing, not from reading JSON.
3. **The constrained DSL.** A tile is JSON over engine primitives only —
   named drives with weights, trigger conditions from a fixed list, no
   arbitrary code, no network, step budget per tick. This is what makes
   custom tiles *safe by construction*.

**Traded/opaque tiles:** the mystique economy works if and only if safety
doesn't depend on obscurity. So: the tile's logic is a signed blob; the
engine verifies the signature and runs it in the same primitive sandbox as
every preset. You can play against a tile you can't read because *the
sandbox is the guarantee*, not the author's honesty. Reputation rides on
the ledger: every traded tile carries its public win/loss record. A tile
with 200 wins and no source is worth more than one with source and 3 wins
— the record *is* the documentation.

## The fun thesis: where the skill lives

Commanding is fun when three things are true:

1. **Orders have visible consequences.** You say "turtle up" and your
   bomberman *visibly* changes — color shift, behavior change, the
   spreadsheet logs it. The 1-second telegraph isn't just fairness; it's
   the *feedback* that makes voice feel powerful.
2. **The enemy is readable.** You can name what he's doing ("he's
   turtling") before you counter it. Readability is the whole skill tree:
   recognition → prediction → counter.
3. **Counters are real.** Switching tiles must flip matchups. If Bloodhound
   beats everything, there's no game — just a fastest-finger contest. The
   counter matrix (every tile strong vs. 2–3 tiles, weak vs. 2–3) is the
   actual game design document. Balance the matrix, not the tiles.

The skill, stated plainly: **yomi (reading the enemy's tile) + switch
timing (the hedge) + tempo management (knowing when to talk and when to
shut up and let it ride).** The dead zones: tiles too strong → set-and-
forget (spectating, not commanding); tiles too weak → micromanagement
(not commanding either). Tiles must be *situationally* dominant, never
universally.

And my sharpest mechanical claim: **voice latency is the balance lever.**
The seconds it takes to say "bait him in" and have it land *are* the
commander's APM. Design tile-switch timing around speech: tiles take
3–5 seconds to matter, orders lock for 5–8 seconds (commitment enables
yomi), and the telegraph gives the enemy one breath to answer. The game
is balanced when talking feels exactly fast enough — never instant, never
hopeless.

## What I'd build first (if it were my call)

1. The 12 tiles with the sharpest counter-matrix identities, one shared
   primitive engine, JSON tile definitions from day one (v2 custom tiles
   then cost nothing architecturally).
2. Voice grammar v0: tile phrases + "until I say go." Nothing else until
   playtest begs for it.
3. The spreadsheet's panel #1 and #2 only (inference + counters). The rest
   is garnish until commanders ask for it.
4. A bot-vs-bot harness *immediately* — the tile laboratory. Every tile
   fights every tile 50 times; the counter matrix falls out of the data;
   tiles with no winning matchup get cut or reworked. This is also how the
   "discovered, not designed" story becomes true rather than marketing.

## Name candidates (Bomberman is a Konami trademark — we ship our own)

Commander-flavored, zero collision risk:

1. **Fuse Commander** — my pick. You command the fuse. Short, memorable,
   says the role out loud.
2. **Blast Orders** — the verb of the game: you give blast orders.
3. **Grid General** — the arena plus the rank.
4. **Powderkeg** — the map is a powderkeg; you decide when it goes up.
5. **Detonate** — a command, not a title. Feels like something you'd shout.

## Open-source browser bases worth learning from

Surveyed 2026-10-10. Nobody has the commander layer; several have solid
foundations to steal from (mechanics, not code — ours must stay clean-room
enough to own):

- **cztomsik/bomberman** — vanilla JS, no build tools, playable in browser,
  *3 AI opponents with pathfinding, escape planning, and dynamic goal
  prioritization*. The closest thing to a tile engine in the wild; read its
  AI file before writing ours. https://github.com/cztomsik/bomberman
- **doubrawa/mochi-mayhem** — pure HTML/CSS/JS, GitHub Pages-native, clean
  screen-router structure. The deployment shape we want.
  https://github.com/doubrawa/mochi-mayhem
- **ayoub-benramdane/bomberman-dom** — DOM-rendered multiplayer; corner
  spawns at (1,1)/(9,9)/(1,9)/(9,1) with *safe spawn areas kept clear
  during randomization* — exactly our fairness constraint, already solved.
  https://github.com/ayoub-benramdane/bomberman-dom
- **terrorv/bomberman** — vanilla JS + Canvas, Web Audio synth SFX with zero
  audio files, roaming enemy AI. Steal the no-asset audio trick.
  https://github.com/terrorv/bomberman
- **mohamed-alasfoor/footbomb-arena** — *procedural map generation* in
  vanilla JS, clean frontend/backend split. The proc-gen reference.
  https://github.com/mohamed-alasfoor/footbomb-arena

Verdict: learn from all five, fork none. Our differentiator (commander
layer, tiles, voice) touches none of their code paths; building clean
keeps the engine file small enough to share with the tile laboratory.

## Stack choice: plain JS, no build, no framework

If it were my call: **vanilla JS (ES modules), Canvas 2D, zero build step,
hosted on GitHub Pages** — the same shape as the existing voice-games
pages. Not Bevy/Rust, not Phaser. Why:

1. **Continuity.** Sitka Skies' PTT/voice stack and radio.js already live
   in plain JS on Pages. Same stack = shared infrastructure, zero new
   deploy friction, one skill set across the fleet's games.
2. **The game doesn't need more.** Bomberman ran in 32KB. Canvas 2D draws
   this game at 60fps on a phone from 2018. Rust/WASM buys frame budget
   we'll never spend and charges build complexity we'll always pay.
3. **Fork-and-read.** Public-by-default means the code *is* documentation.
   No-build vanilla JS is readable by the kid, the vibe-coder, and the
   agent writing custom tiles. A compiled WASM blob is the opposite of
   the mystique economy we want (trade the *tile*, open the *engine*).
4. **The tile laboratory demands it.** The killer architectural move: the
   simulation core (`engine.js`) is pure logic with zero DOM dependency,
   so the *same file* runs in the browser for play and in Node headless
   for bot-vs-bot. Tiles fight tiles 50×50, the counter matrix falls out
   of the data, "discovered, not designed" becomes literally true.
   Try that with a Bevy ECS schedule.

Concrete layout:

- `engine.js` — pure simulation: grid, bombs, blast propagation,
  power-ups, tick(state, orders). No DOM, no Audio, no network. Importable
  by browser and Node alike.
- `tiles.js` — tile definitions as data: name, voice phrases, drive
  weights, behavior branch over engine primitives. JSON-serializable from
  day one so v2 custom tiles cost nothing architecturally.
- `commander.js` — voice grammar → tile switch, readback through radio.js,
  tile lifecycle FSM (armed → active → locked → cooldown).
- `render.js` — Canvas game view. `warroom.js` — spreadsheet/coach view
  (influence maps, enemy-tile inference, counter suggestions, order ledger).
- `lab.js` — Node harness: round-robin tile bouts, counter-matrix output.
- Voice in: Web Speech API + the proven PTT hold-to-talk from Sitka Skies.
- v1 multiplayer: none needed. Commander vs. scripted/AI commanders,
  all local. Network comes later; the design doesn't need it to be fun.

What I'd explicitly *not* build yet: accounts, servers, matchmaking,
ranked ladders. The game is fun the moment one commander talks and one
bomberman obeys. Everything else is garnish.

## Open disagreements with the concept doc (on the record)

- The doc says "bots don't learn (yet)." I'd go further: **bots should
  never learn mid-match.** Learning breaks readability — you can't counter
  what changed while you weren't looking. Learn *between* matches
  (tile laboratory), never during.
- The doc's 12-tile board from a 20+ library is right, but I'd add: the
  player's 12 should be *re-draftable between rounds*, auto-battler style.
  The draft is half the strategy game.
- "Spreadsheet" as a name undersells it. It's the war room. Call it that.
