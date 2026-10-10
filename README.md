# voice-games

Public demos of **voice-commanded games** — proof of concept for playing games
entirely by voice command, with characterful AI banter as audio feedback.

Live on GitHub Pages: <https://superinstance.github.io/voice-games/>

## The games

- **[sitka-skies-hp/](sitka-skies-hp/)** — *Sitka Skies* flight game, HP build.
  Fly by voice ("fly to Sitka", "turn left", "speed up") around Sitka, Alaska —
  Biorka Island, the channel, the landmarks. Hold 🎙 and talk.
- **[sitka-skies-proart/](sitka-skies-proart/)** — *Sitka Skies* flight game,
  ProArt build (same game, different tuning/target).
- **[color-squad/](color-squad/)** — *COLOR SQUAD*: a 4-unit voice-commanded RTS,
  Lemmings-meets-paintball capture-the-flag. "Red, move to center." The squad
  learns your voice — visible learning, tutor-unlocked verbs, Jev negation
  guards. See its [README](color-squad/README.md).

## Structure

Each game is self-contained: `index.html` plus a `banter/` folder with the
voice-banter audio (10 mp3s + `banter.json` manifest), all linked by relative
paths. No build step — open any folder in Chrome (mic permission required for
voice; a text box works as fallback).

Demo and hub links to be added later.
