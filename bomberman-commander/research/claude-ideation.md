# Claude ideation — Bomberman Commander (2026-10-10, via claude.ai)

## Five weak parts and fixes

1. **Nothing makes the commander necessary.** A competent bot that switches scripts on request makes you a spectator with a remote. Fix: the bot sees about 5 tiles and you see the whole map — you are the eyes and the brain, the bot is the hands.
2. **The spreadsheet below the fold is dead on arrival.** Nobody scrolls away from a game where the fuse is three seconds.
3. **A "fairly large" map with corner starts on a phone** means 60 seconds of nobody interacting, on a board you can't see whole. The board must fit one screen.
4. **Opaque tiles are fine, but opaque behaviour is not.** A compiled tile must still report which rule fired, in words, on the spreadsheet.
5. **Custom tiles can eat the game.** Someone will vibe-code a tile called WIN that plays the whole match. Cap a tile at a handful of rules reading local sensors only, and forbid tiles from switching tiles.

## Job 1 — Lineage

- **Scripted patterns (late 70s–early 90s):** authored motion, no decisions — sine-wave Medusa heads, lockstep Space Invaders; 90s fighters added scripted read-and-react. Tile fit: dumb muscle inside a tile, never the tile; patterns must be relative on procedural maps. What they got right: zero ambiguity.
- **Finite state machines:** Doom's idle/see/chase/attack/pain/die; Half-Life's soldiers add grenade and retreat. "This is your game. The tile bar is an FSM whose transition function is a human voice."
- **Behaviour trees:** Halo's Elites; tames FSM spaghetti. Use as a tile's implementation language, never spanning two tiles — a full tree's root selector competes with the commander's voice.
- **Utility AI:** The Sims, Killzone. Fights at the top (a weight can "disobey" your order), fits at the bottom (which exit to seal first).
- **Influence maps:** StarCraft, Company of Heroes, F.E.A.R. "Perfect, as the shared sensor layer." Essential Bomberman maps: seconds-until-tile-on-fire, safe exits, visible power-ups. Every tile reads the same maps; tiles differ in what they do with them. Also what makes the spreadsheet honest.
- **GOAP/HTN:** F.E.A.R.'s soldiers. "Tile = goal, planner finds the means" is seductive but unpredictable — the tile's identity dissolves. One legitimate use: one-step "which safe tile" reflex search.
- **Monte Carlo/search:** fits only as the reflex layer ("if I place this bomb, do I survive?"). Never a tile — "think harder" is not a command.
- **Reinforcement learning:** OpenAI Five, AlphaStar, Gran Turismo Sophy; in Pommerman the strongest agents were search and handcrafted heuristics. "Fights hardest. A policy is one undivided blob with no named strategies" — the exact opposite of tiles, and it would make the spreadsheet a lie.
- **Director AI:** Left 4 Dead's Director, Alien: Isolation's two AIs. "This is your game with the human as director" — the best argument for the asymmetry fix: commander sees all, bot senses locally, tiles are the shared language.
- **LLM-era:** the useful pattern is the LLM as author, not actor (Voyager 2023: GPT-4 writes Minecraft skills as code, keeps what works). Vibe-coded tiles = Voyager's skill library; the chatbot confirmation = self-verification. Keep the LLM at author time, never in the hot loop.
- **Two unlisted ancestors:** Final Fantasy XII's Gambits (priority if/then lists players author — "the closest thing your tile system has to a shipped ancestor"; players loved authoring, hated debugging, so the bench and clips matter more than the authoring UI) and EndWar's 2008 voice command (tiny vocabulary, verb-target pairs, showed what it heard — "your whole voice design in one precedent").

**Stack layers:** Layer 0 reflex (blast-time map + survival search, always on, never a tile, commander never switches it off except TRADE) → Layer 1 tile (Gambit-style list of at most 8 rules reading shared sensors) → Layer 2 you.

**What Pac-Man got right:** one-sentence targeting rules per ghost; emergent coordination; tells on state change (scatter/chase reversal); a clock giving rhythm; exploitable limits. Modern AI loses this: utility = score soup, planners = unpredictable correctness, RL = no tells and no sentences.

## Job 2 — Design take

### Tiles (25; narrow and hard-counterable, not general behaviours)

Aggro: HUNT ("Get blue!" — bomb escape routes, not their tile), CAGE ("Box him in!" — seal pocket exits), PRESS ("Stay on him!"), CHAIN ("Light it up!"), TRADE ("Take him with you!" — reflex off, mutual kill), VULTURE ("Clean up!"), AMBUSH ("Wait for him!"), KICK ("Kick it at him!").
Defence: TURTLE ("Turtle up!"), BOLT ("Get out of there!" — max distance, no bombs), SHADOW ("Shadow red!"), BAIT ("Lure him in!" — retreat along a mined route), FREEZE ("Hold!").
Economy/position: DIG ("Dig!"), FETCH ("Get the boots!"), STARVE ("Starve him!" — deny enemy power-ups), TUNNEL ("Dig to blue!"), CROWN ("Take the middle!"), HOME ("Come home!"), FLANK ("Go around!"), GATE ("Hold the gap!"), SHRINK ("Get inside!").
Dirty tricks: TRUCE ("Leave green alone!" — the sleeper; creates diplomacy), FEINT ("Sell it!" — show another tile's tell for 3s), DUMP ("Everything!").

Opinions: TRUCE is the sleeper; FEINT only works if tells are public; call phrases must be phonetically far apart ("hunt"/"hold" is a recognition bug); players draft 12 from the pool pre-match — the loadout is the deck AND the voice vocabulary, so the recogniser only loads 12 phrases.

### Voice grammar

Smallest grammar that feels like command: verb, target, one "then". No live conditionals (too slow, too error-prone).
`order := meta | ["then"] verb [target] [until]` — targets: colour, "the leader", direction, zone. Standing orders belong in pre-match setup, not live voice. The armed order + spoken trigger ("Wait for him at the gap, on my mark." … "NOW.") is the purest commanding and the goosebumps moment.

Push-to-talk, no contest: release = end-of-utterance (no endpoint-detection lag); always-listening dies with four people shouting; holding a button feels like a radio — theatre is part of the game. No confirmation dialog — the acknowledgement IS the bot obeying (tile lights, parsed text shows). Mishears: no-op beats wrong-op ("Say again?", keep current order); never guess between two tiles; every order doable by tap (tap is ground truth, voice is the fast path, and taps train the recogniser). Vocabulary is ~12 phrases + ~15 target words: on-device keyword spotting, <100ms, no server cost.

### The spreadsheet

Not a dashboard — the tile's rule list, running live: which rule is firing, sensor readings, what the bot does next. One row per bot, yours pinned top. Key columns: AIR (safe tiles reachable before nearest fuse — the most important cell), INTENT (next two seconds in words), ORDER AGE (stale orders kill), RULE (which row is firing), WHO'S ON WHOM (4×4 target matrix), TRADE (kit verdict per enemy), ENEMY TILE HISTORY (last five stances — "Blue always turtles after losing a trade"), BLOCKS LEFT per quadrant, CAUSE OF DEATH ("Died 14s into HUNT. AIR hit 0 when blue bombed G4. Order was 14s stale."). Layout: 4-cell strip per bot (stance, AIR, INTENT, ORDER AGE) pinned to the board edge, always visible; full grid a swipe away; on phone the strip IS the spreadsheet. Fog of war: show enemy kit and stance, hide their INTENT and RULE.

### Custom tiles and trust

A tile is data, not code: JSON rule list run by your interpreter, reading only provided sensors. Trusting what you made: the chatbot's readback must be generated by translating the compiled JSON back to words (a real check, not paraphrase); every rule gets a 4-second bench clip of it firing; plain-language promises become fuzz-tested properties ("never bombs without an exit" — green across thousands of sims, count shown). Trusting what you bought: remove the sensor (can't read round number → can't "turtle on round 3"); capability manifest on the card like app permissions; no dark rules (coverage-guided fuzzing must fire every rule or it can't ship); the platform writes the behaviour card from sims, never the author's claims; hash the content (ID = hash of rules); trace opaque tiles live ("rule 4 fired", text hidden). Stopping tiles eating the game: 8-rule cap, local sensors only, no tile may switch tiles.

### Fun thesis

Commanding is fun when you know something your bot doesn't, your words change the board within a second, and you can watch the enemy commander realise what you just did. Skill = reading (enemy tile from behaviour, habits from history), leading (orders land late, fuses are 3s — call where the fight will be), relay (you are your bot's long-range vision), drafting (which 12, against whom), composure (speaking clearly while panicking is a real physical skill, and it's funny).

**Biggest risk: silence is optimal.** If the winning play is pick-a-tile-and-shut-up, the game is dead. Instrument from day one: orders/min, order changes in last 10s, correlation with wins. Kill criteria: best Mute wins ≥25%, winners' median <4 orders/min, or <30% of orders change anything — if any trips, fix the tiles before building anything else. Second risk: blame — every death traceable to your order or the enemy's, never "my bot did something dumb" (hence CAUSE OF DEATH).

Prototype with one bot; test two-bot squads second ("you two split up" needs two bodies). Next step: one-screen playable with reflex layer, six stock tiles, tap bar — no voice yet; voice is a fast path onto a game that works by tap.

## Names, bases, stack, prototype (follow-up)

- **Name pick: Sapper Says** ("Simon Says" tells you the unit obeys your voice; your bot is a sapper). Also: On My Mark, Blastcaller, Boom Mic, Marching Ordnance. Quick web check: Sapper Says and Blastcaller have no game by the name; On My Mark clear (On Your Mark exists on Steam); Boom Mic collides with a headset and a Content Warning item.
- **Open-source bases:** thin pickings; write your own sim. Study CoderOneHQ/bomberland (MIT, TypeScript engine + forward-model sim — closest architectural match), borrow Pommerman's ruleset (Apache 2.0, Team Radio mode = 2-word command precedent). Also surveyed: html5-bombergirl, DmytroVasin/bomber (Phaser lobby boilerplate), p2p-bomberman (WebRTC), fishfolk/bomby (Bevy, early), dynadungeons (Godot), Bombermaaan (GPL — read, don't copy).
- **Stack: TypeScript, no engine.** Deterministic sim package (fixed tick, integer state, seeded RNG — runs live, headless in a Web Worker for the bench, and server-side); Canvas 2D board; DOM for the rest (the spreadsheet is an HTML table; Preact + Signals); tiles as schema-validated JSON (never eval); orders-only lockstep netcode (replay = seed + order log); voice via Web Speech API for prototype, WASM keyword spotter (sherpa-onnx) to ship. Not Bevy/Rust (megabyte download, spreadsheet in a canvas UI toolkit), not Godot (heavy canvas island, awkward mic plumbing), not Phaser/WebGL (engine loop fights the fixed-tick headless sim).
- **Prototype spec:** six tiles (DIG, HUNT, CAGE, TURTLE, AMBUSH, BOLT) + meta words NOW and BELAY; 15×13 board always fully visible; 90s rounds, board shrinks from 60s; sight-radius rings, stance colours, switch tells; tile bar with armed-pulse; big PTT button; strip (stance, AIR, INTENT, ORDER AGE); round-end card (cause of death, orders/min, order timeline). First playtest: two humans + two scripted house commanders, best of five — proving active commanding beats passive and players can tell why they died.
