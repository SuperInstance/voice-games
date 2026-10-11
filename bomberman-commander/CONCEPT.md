# Bomberman Commander — concept (Casey ramble, 2026-10-10)

CODENAME ONLY — "Bomberman" is a Hudson Soft/Konami trademark. The shipped
game needs its own name (ideation lanes are proposing candidates). The game:
you are not the bomberman. You are his commander.

## Core loop
- Fairly large Bomberman map, **procedurally generated every round** — random
  within parameters and constraints. Players start in corners with a fixed
  number of reachable blank spaces so openings are fair.
- You issue **strategy orders at a high abstraction**, not move-by-move:
  "work towards the other guy," "stay away," "go find power-ups." Your
  bomberman runs scripts underneath; orders shift which script/strategy is live.
- Bots don't learn (yet). They execute. The game is in the commanding.

## Strategy tiles
- ~12 preset tiles, shown as clickable buttons under the game AND as the
  voice grammar — one strategy set, two input modes (tap or push-to-talk).
- **Tiles are discovered, not designed:** our agents build strategies and play
  each other (tournament arena as laboratory); the winning building blocks get
  abstracted into the preset tiles.
- **Custom tiles:** player describes a new idea, a small chatbot talks back so
  the player sees it understood ("yeah, go"), and the tile becomes a live
  switchable slot. A few custom slots per player; veterans can drop presets
  entirely and run blank.

## Two views
- **Game view:** the map, the bombers, the action.
- **Spreadsheet view:** the live mechanics/network underneath — strategy
  state, tile activations, what's driving whom. Scroll down to it on phone
  (one view at a time = resource kindness), side-by-side on desktop.

## Design target
- Low-level enough that the commander must stay active; high-level enough
  that a set strategy plays out unattended until someone finds the counter.
- The counter dynamic IS the game: set strategy → opponent notices →
  counter → you hedge. Orders matter because counters exist.

## Lineage
- Nod to the original: the whole game once fit in 32KB on a Game Boy; bad
  guys got better as programmers scripted better behavior. We're doing the
  same arc, but the "programmer" is the commander, live, by voice.
- Reuses the Sitka Skies PTT/voice-command infrastructure.

## Release arc (Casey, 2026-10-10)
- **v1:** core loop working, playtested for fun, released. Board = 12 preset
  tiles picked from a larger library (agents may build 20+; player drafts 12).
- **v2 — the killer one:** half the board blank. 6 preset tiles + 6 custom
  slots the player makes on the fly (vibe-code + chatbot confirmation), saved
  as JSON files, loadable next session.
- **Tile trading:** strategies as tiles — opaque (play with it, can't see
  inside; compiled) or open source. Mystique economy: a well-worded strategy
  becomes a thing people trade.

## Framing
- This is the **autoplayer brought back to operator level through voice**:
  the lineage is opponent-scripting and autoplay bots, but the operator is a
  human commander talking. R&D lane covers that history (old and new
  scripting programs for opponents/auto-players).

## Replay theater (the lobby) (Casey, 2026-10-10)
- The loading/explainer page runs **live game replays, not videos**: tiles and
  algorithms fixed, agents no longer changing them — just great games playing
  out in the real engine.
- Watcher controls: speed up, watch a bunch, jump to a random game.
- At scale (hundreds/thousands of games): **greatest hits** curation. What
  makes a game "great" gets developed over time — chatbot ideation plus human
  feedback on real games.
- For now: functionality first. Prototype scope = attractor mode (auto-playing
  bot-vs-bot on the landing screen, speed toggle, new-game button).

## Open questions
- Fresh build or extension of the voice-games pages? (Probably a new page
  under superinstance.github.io/voice-games/.)
- What exactly renders in the spreadsheet view? Tile states, bot internals,
  network events?
- Which agents generate the first tile set, and in what harness?
- Vibe-coded custom tiles: sandbox model? (Tile = constrained script with a
  fixed interface, chat-confirmed before it goes live.)
- Round structure: 1v1 commander-vs-commander? vs scripted bots? both?
