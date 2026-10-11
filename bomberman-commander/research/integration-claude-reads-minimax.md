# Claude reads MiniMax — integration round (2026-10-10, via claude.ai)

Verdict: MiniMax is ahead on match structure (commitment, counter matrix, 1v1 launch, re-draft) and on fitting the existing stack. Claude is ahead on why the commander exists at all, on trust for traded tiles, and on measuring whether the game works. Claude verified MiniMax's five repos and name claims via web research before writing.

## 1. Nuggets Claude stole from MiniMax (15)

1. **Commitment** — orders lock 5–8s, lifecycle armed → active → locked → cooldown. "The biggest gap in my design": free switching makes a correct read worthless.
2. **Counter matrix as the design document** — every tile fights every tile; cut rule: tiles with no winning matchup go.
3. **Both dead zones** — tiles too weak → micromanagement (also not commanding). Claude's 4-orders/min kill criterion would pass a babysitting game.
4. **Modifier slot** — "one job, one constraint"; the second is always a modifier, never a second primary. Claude's TRADE was a modifier wrongly given a tile slot.
5. **Enemy-tile inference** — inferred tile with confidence meter; "naming it out loud is the moment a player learns the game."
6. **1v1 launch** — clean reads, meaningful matrix; also exposes mic crosstalk in 4-player same-room play.
7. **Re-drafting** — best-of-five adaptation layer, auto-battler style.
8. **Timed/held orders on any tile** — "turtle until I say go", "for thirty seconds".
9. **Pronouns** — "him" resolves to current target; people won't say colours.
10. **Tile ideas**: Scavenger, Blitz, Mirror, Gardener.
11. **Open engine** — "trade the tile, open the engine": the interpreter must be readable since trust lives there.
12. **Small trust mechanics** — per-tick step budget, signed blob, public win/loss record on every traded tile.
13. **Positioning line** — "Gladiabots had the authoring, Frozen Synapse had the watching, EndWar had the voice."
14. **Stack context** — Sitka Skies' PTT/voice stack already lives in plain JS on Pages; changed Claude's stack answer.
15. **Repo details** — bomberman-dom randomises blocks keeping corners clear; terrorv/bomberman synthesises SFX with Web Audio, ships no audio files.

## 2. Disagreements, on the record

- **Live "what beats it?" panel:** Claude holds — it automates the yomi; inference/counters belong in training mode and the round-end card, never live ranked.
- **"The sandbox is the guarantee":** sandbox guarantees safety, not honesty (nothing catches "secretly turtles on round 3"); sensor ban + forced rule coverage + platform bench stay as the mechanism. Live record added to the card.
- **Named drives with weights:** utility AI can't be read back in a sentence or show "rule 4 fired". Keeps rule lists; the modifier becomes a reflex-layer parameter.
- **Survival as a tile:** makes not-dying something you equip; every other tile then dies stupidly. Survival is the always-on floor, risk posture a spoken modifier.
- **Lock length:** 5–8s means dying inside an order you can't leave; start at 3s and sweep.
- **Self-switching/random tiles:** Hoarder is two tiles + a condition (the commander's job); Phantom/Gambler are randomness.
- **Tile naming:** stock tiles are the verb you shout; custom tiles get personality names + mandatory call phrase.
- **Spreadsheet:** strip pinned to board edge (keeps the name "spreadsheet" — the view literally is the tile's rows firing); full grid a swipe away.
- **Stack:** concedes Vite/Preact was over-tooled given the existing plain-JS voice stack. Holds: engine must be deterministic (replays, counterfactuals, hashes need it); 50 bouts/pairing is ±14pts noise; Web Speech on-device still experimental.
- **Repos:** MiniMax's cztomsik/bomberman overclaimed (multi-game playground); mochi-mayhem 1/8 done; no licences shown anywhere; Bomberland and Pommerman missing from its survey.
- **Names:** Sapper Says weakened by Sapper's Bad Dream (itch.io/Steam). **Fuse Commander conceded as the better working title.** Unit noun: sapper.

## 3. Design deltas Claude would steal (13)

1. **Commitment window:** 3s lock after an order lands, bot barks "Committed!". BELAY within 1.5s (mishear correction). NOW always works (trigger, not order). BOLT always works, carries its own 5s lock — panic has a price. Lock shown as a draining ring, visible to both sides. Prototype sweeps 0/3/5/8s.
2. **Posture modifier:** "careful" | "all in" as reflex-layer thresholds (careful: 2 exits before any bomb; default: 1; all in: self-preservation off when a kill is available). Absorbs TRADE, Kamikaze, Accountant, Insomniac.
3. **Counter-matrix lab:** every tile pair 1v1, 1,000 seeded bouts, mirrored spawns. Ships only with ≥2 matchups at 60%+ and ≥2 at 40%−; no tile averages above 58%. Runs beside the Mute baseline.
4. **1v1 first.** Prototype and lab are 1v1; four-player second.
5. **READ cell:** run candidate tiles on the enemy's last-20-tick observed state; show top match + %. Training/replay only; round-end card adds the counter.
6. **Grammar additions:** "until I say go" on any tile; "for ten/twenty/thirty seconds"; one enemy-event condition ("until he pushes"); "him" resolution with visible chip.
7. **Phrase aliases:** 2–3 phrases per tile in the recogniser's vocabulary.
8. **order_age sensor:** tiles may read seconds since activation, never match/round time. Enables Blitz without reopening the round-3 hole; bench fuzzes over it.
9. **Re-draft:** best-of-five, loser swaps 2, winner swaps 1; loadouts public.
10. **Card/DSL:** live match record + author signature on the card; per-tick step budget enforced at compile time; interpreter and bench open source, only tiles may be opaque.
11. **Stack:** no-build ES modules on existing hosting, reuse PTT code; MiniMax's file split; tiles as JSON; JSDoc types with CI check; test fails if engine touches Math.random/Date; synthesised SFX, no audio files.
12. **Kill criteria:** primary = share of orders that changed the outcome; add upper bound (winners >~12 orders/min or median dwell <4s → tiles too weak).
13. **Spawn invariant:** 1v1 mirror symmetry; generator proves via the reflex layer's own check that each bot can place a first bomb and survive it.

## 4. Reconciled shortlist: 14 stock tiles (matrix prunes to 12)

HUNT ("Hunt him down!"), CAGE ("Box him in!"), PRESS ("Stay on him!"), BLITZ ("Go go go!" — 20s tempo then 6s no-bombs), CHAIN ("Light it up!"), AMBUSH ("Wait for it…" + NOW), BAIT ("Bait him in!"), HOLD ("Hold the middle!" — merged GATE/CROWN/HOME), TURTLE ("Turtle up!"), BOLT ("Get out of there!"), DIG ("Dig!"), FETCH ("Get the boots!"), SCAVENGE ("Steal his stuff!"), FEINT ("Sell it!"). Postures (careful/all in) and meta words (NOW, BELAY, FREEZE) take no slots. Prototype six unchanged: DIG, HUNT, CAGE, TURTLE, AMBUSH, BOLT — now 1v1 with the 3s lock.
