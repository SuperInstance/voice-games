# COLOR SQUAD — voice-commanded 4-unit RTS

A Lemmings-Paintball-inspired capture-the-flag: 4 units per side, color-hat addressing
(Red/Blue/Green/Yellow), procedurally generated maps, voice orders, and the quilt
learning your voice — visible.

**Play:** open `index.html` in Chrome. Hold 🎙, say "Red, move to center".
Text box works as fallback (no mic needed).

## Commands

- `red | blue | green | yellow | all` + verb
- **Level 1 (unlocked):** `move to` north/south/east/west/center/our flag/their flag, `stop`
- **Taught by the tutor:** `attack` (after 3 moves) → `defend` (after 2 attacks) → `patrol` (after 2 defends)
- **Chains:** "red move to center then red attack" queues both orders
- **Guards (Jev):** "don't stop" is REFUSED (negation), locked verbs refused, unknown verbs refused

## The game

- 8 units, health bars, respawn in 8s
- Two flags; carry the enemy flag home to score. First to 3 wins
- Enemy AI: runners grab your flag, guards defend theirs, escorts protect carriers
- 🔄 new map → procedural terrain (seeded, obstacles dodge the bases)
- 8 quilt cells alongside: Ear → Router → Jev Gate → Prism → Decompose → Act → Memory → Sleep

## The visible learning

- Each verb pattern: 3 clean runs → local reflex, no LLM call
- Counters: LLM calls vs local reflexes, % learned
- 🌙 sleep cycle distills everything (and unlocks all verbs at once)
- Tutor teaches commands one at a time as the squad earns them

## Verified

- JS syntax-checked (`node --check`)
- 15/15 headless logic tests: parsing, negation guard, verb locks, unlock ladder,
  "then"-chaining, order queuing, combat damage, kill/respawn, flag pickup, capture
- 60s simulated match: 0 runtime errors
- All 24 `getElementById` targets resolve

## Playtest debt (from the Sitka Skies playtest, applies here too)

- Negation → Jev ✓ (handled)
- Substring false positives ("goddard"→"go") → EmbeddingGemma
- Compound commands → Taiga ("then" chains partially cover this)
- Vocabulary gaps → EmbeddingGemma (military phrasing like "proceed" not in the verb list)
