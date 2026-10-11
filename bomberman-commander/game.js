/* Bomberman Commander v1 — core loop prototype.
   Single-file game: procedural map, utility-AI strategy tiles, PTT voice,
   replay-theater attractor mode, live spreadsheet view. No build step.
   The sim core (RNG/map/Bot/Game) is DOM-free so it can run headless in node.

   DETERMINISM CONTRACT (integration round): the sim uses ONLY this.rng()
   (mulberry32, seeded per round). update(dt) with a fixed dt sequence is
   fully deterministic — no Math.random, Date, or wall-clock reads anywhere
   in this file. This is what makes replays (seed + order log) and the
   counter-matrix lab possible later. render() derives its pulse from
   this.time, never from the clock.
*/
'use strict';

/* ============================== utils ============================== */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const key = (x, y) => x + ',' + y;

/* ============================== tiles ============================== */
/* A tile = a utility-AI parameter set. Switching tiles re-weights the bot's
   brain: {enemy, power, safety, aggro, demolish, terr}.
   v1 prototype shortlist (integration round, 2026-10-10): the six tiles the
   commander playtests. The engine is data-driven — the full 12-tile board
   slots into this same array later. */
const TILES = [
  { id: 'dig', name: 'Dig', icon: '⛏️',
    phrases: ['dig', 'dig through', 'break blocks', 'excavate', 'find power-ups', 'prospect'],
    desc: 'Crack blocks, grab power-ups',
    w: { enemy: 0.1, power: 1.3, safety: 0.7, aggro: 0.3, demolish: 1.4, terr: 0.3 } },
  { id: 'hunt', name: 'Hunt', icon: '🎯',
    phrases: ['hunt', 'hunt him down', 'get him', 'chase him', 'attack him'],
    desc: 'Run the enemy down',
    w: { enemy: 1.0, power: 0.2, safety: 0.6, aggro: 1.0, demolish: 0.4, terr: 0.8 } },
  { id: 'cage', name: 'Cage', icon: '🪤',
    phrases: ['cage', 'box him in', 'corner him', 'cut him off', 'trap him'],
    desc: 'Cut off his exits',
    w: { enemy: 0.9, power: 0.2, safety: 0.8, aggro: 0.7, demolish: 0.5, terr: 1.2 } },
  { id: 'turtle', name: 'Turtle', icon: '🐢',
    phrases: ['turtle', 'turtle up', 'hold position', 'stay put', 'defend'],
    desc: 'Fortify and outlast',
    w: { enemy: -0.3, power: 0.3, safety: 1.5, aggro: 0.3, demolish: 0.2, terr: -0.9 } },
  { id: 'ambush', name: 'Ambush', icon: '🕸️',
    phrases: ['ambush', 'wait for it', 'lie in wait', 'set a trap', 'lurk'],
    desc: 'Lie in wait — NOW springs it',
    hold: true, // sit tight when the enemy is near; NOW (forceBomb) strikes
    w: { enemy: 0.3, power: 0.2, safety: 1.2, aggro: 0.2, demolish: 0.3, terr: 0.5 } },
  { id: 'bolt', name: 'Bolt', icon: '🏃',
    phrases: ['bolt', 'get out of there', 'run', 'retreat', 'fall back'],
    desc: 'Panic button — always works, 5s lock',
    w: { enemy: -1.0, power: 0.3, safety: 1.6, aggro: 0.0, demolish: 0.1, terr: -0.5 } },
];
const TILE_BY_ID = Object.fromEntries(TILES.map(t => [t.id, t]));
/* Prototype shortlist order for the tile bar (integration: 14→12 later). */
const PROTO_IDS = ['dig', 'hunt', 'cage', 'turtle', 'ambush', 'bolt'];

/* Fixed brains for scripted opponents (theater: "algorithms fixed").
   1v1 tuning: aggressive enough to punish passivity, not so hot that the
   commander dies before their second order. */
const AI_TILES = {
  rusher:  { name: 'Rusher AI',  w: { enemy: 0.5, power: 0.6, safety: 0.7, aggro: 0.8, demolish: 0.5, terr: 0.5 } },
  hoarder: { name: 'Hoarder AI', w: { enemy: 0.1, power: 1.3, safety: 0.7, aggro: 0.4, demolish: 0.9, terr: 0.3 } },
  moper:   { name: 'Moper AI',   w: { enemy: -0.2, power: 0.3, safety: 1.4, aggro: 0.3, demolish: 0.2, terr: -0.8 } },
  steadyai:{ name: 'Steady AI',  w: { enemy: 0.4, power: 0.5, safety: 0.7, aggro: 0.6, demolish: 0.5, terr: 0.2 } },
};

/* ============================== map ============================== */
const COLS = 15, ROWS = 13, TS = 30;
const C_EMPTY = 0, C_HARD = 1, C_SOFT = 2;
const SOFT_DENSITY = 0.68;
const MIN_OPEN = 12; // flood-fill fairness: reachable empties per corner

function genMap(seed) {
  const W = COLS, H = ROWS;
  const corners = [{ x: 1, y: 1 }, { x: W - 2, y: 1 }, { x: 1, y: H - 2 }, { x: W - 2, y: H - 2 }];
  for (let attempt = 0; attempt < 80; attempt++) {
    const s = (seed + attempt * 1013) >>> 0;
    const rng = mulberry32(s);
    const grid = [];
    for (let y = 0; y < H; y++) {
      grid[y] = [];
      for (let x = 0; x < W; x++) {
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) grid[y][x] = C_HARD;
        else if (x % 2 === 0 && y % 2 === 0) grid[y][x] = C_HARD;
        else grid[y][x] = C_EMPTY;
      }
    }
    const isElbow = (x, y) => corners.some(c =>
      (x === c.x && y === c.y) ||
      (x === c.x + (c.x < W / 2 ? 1 : -1) && y === c.y) ||
      (x === c.x && y === c.y + (c.y < H / 2 ? 1 : -1)));
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++)
        if (grid[y][x] === C_EMPTY && !isElbow(x, y) && rng() < SOFT_DENSITY)
          grid[y][x] = C_SOFT;
    // carve guaranteed highways so all four corners stay mutually reachable
    // (rows y=1,y=11 and column x=7 are pillar-free: pillars need even x AND even y)
    const carve = (x, y) => { if (grid[y][x] !== C_HARD) grid[y][x] = C_EMPTY; };
    for (let x = 1; x < W - 1; x++) { carve(x, 1); carve(x, H - 2); }
    for (let y = 1; y < H - 1; y++) carve(7, y);
    // fairness: flood fill from each corner over non-hard, non-soft
    const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y][x] !== C_HARD && grid[y][x] !== C_SOFT;
    const flood = (sx, sy) => {
      const seen = new Set(); const q = [[sx, sy]];
      while (q.length) {
        const [cx, cy] = q.pop(); const k = key(cx, cy);
        if (seen.has(k) || !walk(cx, cy)) continue;
        seen.add(k);
        q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      return seen;
    };
    const counts = corners.map(c => flood(c.x, c.y).size);
    if (counts.some(c => c < MIN_OPEN)) continue;
    const home = flood(corners[0].x, corners[0].y);
    if (!corners.every(c => home.has(key(c.x, c.y)))) continue; // all corners mutually reachable
    return { grid, seed: s, corners, W, H };
  }
  // last-resort fallback (shouldn't happen): open map
  const grid = [];
  for (let y = 0; y < H; y++) { grid[y] = []; for (let x = 0; x < W; x++) grid[y][x] = (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? C_HARD : C_EMPTY; }
  return { grid, seed: seed >>> 0, corners, W, H };
}

/* ============================== bot ============================== */
let BOT_SEQ = 0;
class Bot {
  constructor(name, color, tx, ty, tileW, tileName, isPlayer) {
    this.id = BOT_SEQ++;
    this.name = name; this.color = color;
    this.tx = tx; this.ty = ty;             // current tile (ints)
    this.px = tx + 0.5; this.py = ty + 0.5; // continuous pos (tile units)
    this.dx = 0; this.dy = 0;               // current direction
    this.nx = tx; this.ny = ty;             // target tile while moving
    this.moving = false;
    this.speed = 3.2; this.blast = 2; this.maxBombs = 1; this.bombsOut = 0;
    this.alive = true;
    this.tileW = tileW; this.tileName = tileName;
    this.isPlayer = !!isPlayer;
    this.spawnX = tx; this.spawnY = ty;
    this.loot = 0; this.kills = 0;
    this.lastOrder = null; // {tile, via, t}
    this.bombTimer = 0;
    this.fleePath = null; // committed escape route after placing a bomb
    this.homeTile = tileName;
    // commitment window (integration): orders lock briefly after landing
    this.tileId = null;
    this.lockUntil = 0;   // sim-time when the current order unlocks
    this.lockDur = 3;     // lock length of the current order (bolt: 5)
    this.lockOrderT = -99;// sim-time the current order landed (belay window)
    this.prevTileId = null;
    this.forceBomb = false; // NOW trigger: drop a bomb on the next tick
  }
}

/* ============================== game ============================== */
const FUSE = 2.5, EXPL_TTL = 0.55;
const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

class Game {
  constructor(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas || null;
    this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    this.rng = mulberry32(1);
    this.mode = 'theater'; // 'theater' | 'commander'
    this.speed = 1;
    this.time = 0;
    this.over = false; this.winner = null;
    this.bots = []; this.bombs = []; this.explosions = [];
    this.powerups = new Map(); // "x,y" -> 'blast'|'bomb'|'speed'
    this.lastKillT = 0;
    this.map = null;
    this.onEvent = opts.onEvent || (() => {});
    this.headless = !!opts.headless;
  }

  newRound(seed, mode) {
    this.mode = mode || this.mode;
    this.map = genMap(seed >>> 0);
    this.rng = mulberry32(this.map.seed ^ 0x9e3779b9);
    this.time = 0; this.over = false; this.winner = null;
    this.bombs = []; this.explosions = []; this.powerups = new Map();
    this.lastKillT = 0;
    /* 1v1 first (integration round): commander + one scripted opponent.
       Spawns use corners[0]=(1,1) and corners[3]=(13,11) — mirror-symmetric
       under 180-degree rotation. Four-player comes later. */
    const defs = this.mode === 'commander'
      ? [
          { name: 'You', color: '#4cc9f0', ai: null, tile: TILE_BY_ID.dig, player: true },
          { name: 'Rusher', color: '#ef476f', ai: AI_TILES.rusher },
        ]
      : [
          { name: 'Blue', color: '#4cc9f0', ai: AI_TILES.steadyai },
          { name: 'Rusher', color: '#ef476f', ai: AI_TILES.rusher },
        ];
    const cornerIdx = [0, 3];
    this.bots = defs.map((d, i) => {
      const c = this.map.corners[cornerIdx[i]];
      const tw = d.ai ? d.ai.w : d.tile.w;
      const tn = d.ai ? d.ai.name : d.tile.name;
      const b = new Bot(d.name, d.color, c.x, c.y, tw, tn, d.player);
      b.tileId = d.ai ? null : d.tile.id;
      b.bombTimer = 3.5 + this.rng() * 3.5; // stagger opening bombs; no sync wave
      return b;
    });
    this.onEvent('round', { seed: this.map.seed, mode: this.mode });
  }

  /* ---------- helpers ---------- */
  inBounds(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
  cell(x, y) { return this.inBounds(x, y) ? this.map.grid[y][x] : C_HARD; }
  bombAt(x, y) { return this.bombs.some(b => b.x === x && b.y === y); }
  botAt(x, y, except) {
    return this.bots.some(b => b.alive && b !== except && b.tx === x && b.ty === y);
  }
  walkable(x, y, except) {
    return this.inBounds(x, y) && this.cell(x, y) === C_EMPTY &&
      !this.bombAt(x, y) && !this.botAt(x, y, except);
  }
  blastCells(bx, by, blast) {
    const cells = [{ x: bx, y: by }];
    for (const d of DIRS) {
      for (let i = 1; i <= blast; i++) {
        const x = bx + d.x * i, y = by + d.y * i;
        const c = this.cell(x, y);
        if (c === C_HARD) break;
        cells.push({ x, y, soft: c === C_SOFT });
        if (c === C_SOFT) break;
      }
    }
    return cells;
  }
  /* danger of standing on (x,y): 0 safe .. 1 exploding now.
     forBot: a bot never walks back into its OWN armed bomb's blast —
     the escape plan it committed to at placement time depends on it. */
  dangerAt(x, y, forBot, ahead) {
    ahead = ahead || 0;
    for (const e of this.explosions)
      if (e.cells.some(c => c.x === x && c.y === y)) return 1;
    let d = 0;
    for (const b of this.bombs) {
      const cells = this.blastCells(b.x, b.y, b.blast);
      if (cells.some(c => c.x === x && c.y === y)) {
        if (forBot && b.owner === forBot) return 1;
        const f = (b.fuse - ahead) / FUSE;
        d = Math.max(d, f <= 0 ? 1.2 : 1 - f);
      }
    }
    return d;
  }
  nearestEnemy(bot) {
    let best = null, bd = 1e9;
    for (const o of this.bots) {
      if (o === bot || !o.alive) continue;
      const d = Math.hypot(o.px - bot.px, o.py - bot.py);
      if (d < bd) { bd = d; best = o; }
    }
    return { bot: best, dist: bd };
  }
  /* Effective weights: endgame pressure — in 1v1 (always ≤2 alive), if no
     kill for 30s everyone gets hungrier; after 90s it's sudden death (safety
     off) so rounds always resolve instead of dodging to the stalemate draw. */
  suddenDeath() {
    const alive = this.bots.reduce((n, b) => n + (b.alive ? 1 : 0), 0);
    return alive <= 2 && this.time - this.lastKillT > 90;
  }
  effW(bot) {
    const alive = this.bots.reduce((n, b) => n + (b.alive ? 1 : 0), 0);
    if (alive <= 2) {
      const t = this.time - this.lastKillT;
      if (this.suddenDeath()) {
        const w = bot.tileW;
        return { enemy: w.enemy + 1.0, power: w.power, safety: 0,
                 aggro: w.aggro + 2.0, demolish: w.demolish, terr: w.terr };
      }
      if (t > 30) {
        // ramps 0→2 over the next 30s: everyone gets hungry, then fearless
        const k = Math.min(2, (t - 30) / 15);
        const w = bot.tileW;
        return { enemy: w.enemy + 0.3 * k, power: w.power,
                 safety: Math.max(0, w.safety - 0.35 * k),
                 aggro: w.aggro + 0.5 * k, demolish: w.demolish, terr: w.terr };
      }
    }
    return bot.tileW;
  }
  /* ---------- utility AI: pick a direction ---------- */
  decide(bot) {
    // fleeing a just-placed bomb: follow the committed escape route
    if (bot.fleePath && bot.fleePath.length) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const next = bot.fleePath[0];
        const dx = next.x - bot.tx, dy = next.y - bot.ty;
        const okStep = (Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0);
        // never step into live fire, even on the committed route
        const onFire = this.explosions.some(e => e.cells.some(c => c.x === next.x && c.y === next.y));
        if (okStep && !onFire && this.walkable(next.x, next.y, bot)) {
          bot.fleePath.shift();
          bot.dx = dx; bot.dy = dy;
          bot.nx = next.x; bot.ny = next.y;
          bot.moving = true;
          return;
        }
        // route broken (e.g. someone else bombed the corridor): recompute once
        const liveBomb = this.bombs.find(b => b.owner === bot && !b.dead);
        bot.fleePath = liveBomb ? this.findEscapePath(bot) : null;
        if (!bot.fleePath || !bot.fleePath.length) break;
      }
      bot.fleePath = null; // truly stuck — utility decides (likely doomed, honestly)
    }
    const w = this.effW(bot);
    const maxD = Math.hypot(COLS, ROWS);
    let best = null, bestScore = -1e9;
    const options = [{ x: 0, y: 0 }].concat(DIRS);
    for (const d of options) {
      const tx = bot.tx + d.x, ty = bot.ty + d.y;
      let score;
      if (d.x === 0 && d.y === 0) {
        score = this.scoreTile(bot, bot.tx, bot.ty, w, maxD, true);
      } else {
        if (!this.walkable(tx, ty, bot)) continue;
        score = this.scoreTile(bot, tx, ty, w, maxD, false);
      }
      score += (this.rng() - 0.5) * 0.06;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best && (best.x !== 0 || best.y !== 0)) {
      bot.dx = best.x; bot.dy = best.y;
      bot.nx = bot.tx + best.x; bot.ny = bot.ty + best.y;
      bot.moving = true;
    } else {
      bot.dx = 0; bot.dy = 0; bot.moving = false;
    }
  }
  scoreTile(bot, tx, ty, w, maxD, isStay) {
    // danger is evaluated 0.4s ahead (time to reach the tile) so bots don't
    // stroll into a blast that's harmless now but lethal on arrival.
    const danger = this.dangerAt(tx, ty, bot, 0.4);
    if (danger >= 1) return -1e9;
    // strategy terms are per-tile-step so they beat noise but yield to real danger.
    // NOTE: seek terms measure from the CANDIDATE tile (tx,ty), not the bot's
    // current position — otherwise they add a constant to every option and the
    // bot can't actually steer toward/away from anything.
    let s = -danger * w.safety * 4;
    const ne = this.nearestEnemy(bot);
    if (ne.bot) {
      const d = Math.hypot(ne.bot.px - (tx + 0.5), ne.bot.py - (ty + 0.5));
      // attention horizon: full focus within 6 tiles, fading beyond.
      // Far enemies steer weakly; the bot plays the map until contact looms.
      // Sudden death disables the horizon — hunt to the end.
      let focus = clamp(1.5 - d / 8, 0.25, 1);
      if (this.suddenDeath()) focus = 1;
      s += -d * 0.25 * w.enemy * focus;
    }
    if (this.powerups.size) {
      let pd = 1e9;
      for (const k of this.powerups.keys()) {
        const [x, y] = k.split(',').map(Number);
        const d = Math.hypot(x - tx, y - ty);
        if (d < pd) pd = d;
      }
      s += -pd * 0.25 * w.power;
    }
    const home = Math.hypot(tx - bot.spawnX, ty - bot.spawnY);
    s += home * 0.15 * w.terr;
    if (isStay) {
      s -= 0.05; // mild preference for motion
      const td = TILE_BY_ID[bot.tileId];
      // AMBUSH: sit tight and let him walk into it
      if (td && td.hold && ne.bot && ne.dist < 7) s += 1.2;
    }
    return s;
  }  /* ---------- bomb logic ---------- */
  enemyInBlast(bot) {
    const cells = this.blastCells(bot.tx, bot.ty, bot.blast);
    return this.bots.some(o => o !== bot && o.alive &&
      cells.some(c => c.x === o.tx && c.y === o.ty));
  }
  adjacentSoft(bot) {
    let n = 0;
    for (const d of DIRS) if (this.cell(bot.tx + d.x, bot.ty + d.y) === C_SOFT) n++;
    return n;
  }
  /* BFS escape route: path of tiles from the bot to safety outside the new
     bomb's blast, or null. Blast cells are traversable (the fire isn't there
     yet) — they just can't be the endpoint. */
  findEscapePath(bot, sx, sy) {
    // start from the tile the bot is actually heading to (it may be mid-move
    // when the bomb is placed); defaults to its current tile
    sx = sx === undefined ? bot.tx : sx;
    sy = sy === undefined ? bot.ty : sy;
    const blast = this.blastCells(bot.tx, bot.ty, bot.blast);
    const blastSet = new Set(blast.map(c => key(c.x, c.y)));
    const blocked = (x, y) => {
      if (!this.inBounds(x, y)) return true;
      const c = this.cell(x, y);
      if (c === C_HARD || c === C_SOFT) return true;
      if (this.bombAt(x, y)) return true;
      // active explosions are walls for fleeing, not just danger
      for (const e of this.explosions) {
        if (e.cells.some(cc => cc.x === x && cc.y === y)) return true;
      }
      for (const b of this.bombs) {
        if (b.fuse < 1.2 && this.blastCells(b.x, b.y, b.blast).some(cc => cc.x === x && cc.y === y))
          return true;
      }
      return false;
    };
    const seen = new Set([key(sx, sy)]);
    const q = [{ x: sx, y: sy, d: 0, path: [] }];
    const maxDepth = Math.min(10, Math.floor((FUSE - 0.6) * bot.speed));
    while (q.length) {
      const cur = q.shift();
      if (cur.d > 0 && !blastSet.has(key(cur.x, cur.y))) return cur.path;
      if (cur.d >= maxDepth) continue;
      for (const d of DIRS) {
        const nx = cur.x + d.x, ny = cur.y + d.y, k = key(nx, ny);
        if (seen.has(k) || blocked(nx, ny)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny, d: cur.d + 1, path: cur.path.concat([{ x: nx, y: ny }]) });
      }
    }
    return null;
  }
  escapeExists(bot) { return this.findEscapePath(bot) !== null; }
  maybeBomb(bot) {
    if (!bot.alive || bot.bombsOut >= bot.maxBombs) return;
    if (this.bombAt(bot.tx, bot.ty)) return;
    // NOW trigger jumps the queue: opening settle and desire don't apply,
    // but the escape plan always does — never a suicide order.
    const forced = bot.forceBomb;
    bot.forceBomb = false;
    if (this.time < 4 && !forced) return; // opening settle: let everyone spread out first
    const w = this.effW(bot);
    const enemyNear = this.enemyInBlast(bot);
    const enemyAdj = this.nearestEnemy(bot).dist <= 1.6;
    const softAdj = this.adjacentSoft(bot);
    const desire = w.aggro * (enemyNear ? 1.0 : 0.12) +
                  w.demolish * (softAdj > 0 ? 0.5 : 0) +
                  (enemyAdj ? 0.25 : 0);
    if (forced || desire >= 0.45) {
      // the bot may be mid-stride: plan the escape from the tile it's
      // actually heading to, not the one it just left
      const sx = bot.moving ? bot.nx : bot.tx;
      const sy = bot.moving ? bot.ny : bot.ty;
      const path = this.findEscapePath(bot, sx, sy);
      if (!path) return;
      this.bombs.push({ x: bot.tx, y: bot.ty, fuse: FUSE, blast: bot.blast, owner: bot });
      bot.bombsOut++;
      bot.fleePath = path; // commit: walk this route, don't improvise
      this.onEvent('bomb', { bot: bot.name });
    }
  }
  detonate(bomb) {
    bomb.dead = true;
    const cells = this.blastCells(bomb.x, bomb.y, bomb.blast);
    // destroy soft blocks, maybe reveal powerups
    for (const c of cells) {
      if (c.soft && this.map.grid[c.y][c.x] === C_SOFT) {
        this.map.grid[c.y][c.x] = C_EMPTY;
        if (this.rng() < 0.28) {
          const types = ['blast', 'bomb', 'speed'];
          this.powerups.set(key(c.x, c.y), types[(this.rng() * 3) | 0]);
        }
      }
    }
    this.explosions.push({ cells, ttl: EXPL_TTL });
    // chain-detonate
    for (const b of this.bombs) {
      if (!b.dead && b !== bomb && cells.some(c => c.x === b.x && c.y === b.y)) {
        b.fuse = Math.min(b.fuse, 0.02);
      }
    }
    // kills
    for (const b of this.bots) {
      if (!b.alive) continue;
      if (cells.some(c => c.x === b.tx && c.y === b.ty)) this.kill(b, bomb.owner);
    }
    if (bomb.owner) {
      bomb.owner.bombsOut = Math.max(0, bomb.owner.bombsOut - 1);
      bomb.owner.fleePath = null; // its bomb is gone; free to improvise again
    }
    this.onEvent('boom', { x: bomb.x, y: bomb.y });
  }
  kill(bot, by) {
    if (!bot.alive) return;
    bot.alive = false; bot.moving = false;
    if (by && by !== bot) by.kills++;
    this.lastKillT = this.time;
    this.onEvent('kill', { bot: bot.name, by: by ? by.name : null });
    const alive = this.bots.filter(b => b.alive);
    if (alive.length <= 1 && !this.over) {
      this.over = true;
      this.winner = alive[0] || null;
      this.onEvent('gameover', { winner: this.winner ? this.winner.name : null });
    }
  }
  /* ---------- per-frame update ---------- */
  update(rawDt) {
    const dt = Math.min(0.05, rawDt) * this.speed;
    if (this.over) { this.updateFx(dt); return; }
    this.time += dt;
    // hard cap: no kill for 110s with multiple bots left = stalemate draw
    // (sudden death at 90s gets 20s to resolve it first)
    if (this.time - this.lastKillT > 110) {
      const alive = this.bots.filter(b => b.alive);
      if (alive.length > 1) {
        this.over = true; this.winner = null;
        this.onEvent('gameover', { winner: null, draw: true });
        return;
      }
    }
    // bombs
    for (const b of this.bombs) b.fuse -= dt;
    const due = this.bombs.filter(b => !b.dead && b.fuse <= 0);
    for (const b of due) this.detonate(b);
    this.bombs = this.bombs.filter(b => !b.dead);
    this.updateFx(dt);
    // bots
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      bot.bombTimer -= dt;
      if (bot.bombTimer <= 0) { bot.bombTimer = 0.3; this.maybeBomb(bot); }
      this.moveBot(bot, dt);
      // powerup pickup
      const pk = key(bot.tx, bot.ty);
      const pu = this.powerups.get(pk);
      if (pu) {
        this.powerups.delete(pk);
        bot.loot++;
        if (pu === 'blast') bot.blast = Math.min(6, bot.blast + 1);
        else if (pu === 'bomb') bot.maxBombs = Math.min(5, bot.maxBombs + 1);
        else bot.speed = Math.min(5.5, bot.speed + 0.55);
        this.onEvent('loot', { bot: bot.name, pu });
      }
      // standing in fire
      if (this.dangerAt(bot.tx, bot.ty) >= 1) this.kill(bot, null);
    }
  }
  updateFx(dt) {
    for (const e of this.explosions) e.ttl -= dt;
    this.explosions = this.explosions.filter(e => e.ttl > 0);
  }
  moveBot(bot, dt) {
    if (!bot.moving) { this.decide(bot); if (!bot.moving) return; }
    // target center
    const txc = bot.nx + 0.5, tyc = bot.ny + 0.5;
    const step = bot.speed * dt;
    const dx = txc - bot.px, dy = tyc - bot.py;
    const dist = Math.hypot(dx, dy);
    if (dist <= step) {
      bot.px = txc; bot.py = tyc;
      bot.tx = bot.nx; bot.ty = bot.ny;
      this.decide(bot); // fluid: decide the next leg immediately
    } else {
      bot.px += (dx / dist) * step;
      bot.py += (dy / dist) * step;
    }
  }
  setTile(bot, tileId, via) {
    const t = TILE_BY_ID[tileId];
    if (!t) return false;
    bot.tileW = t.w; bot.tileName = t.name; bot.tileId = tileId;
    bot.lastOrder = { tile: t.name, via: via || '?', t: this.time };
    this.onEvent('tile', { bot: bot.name, tile: t.name, via });
    return true;
  }
  /* ---------- commitment window (integration) ----------
     An order locks the tile for 3s ("Committed!"). BELAY within 1.5s cancels
     a misheard order and restores the previous tile. NOW always works: it is
     a trigger, not an order — it clears the lock and drops a bomb now.
     BOLT always works (panic button) but carries its own 5s lock. */
  orderTile(bot, tileId, via) {
    const t = TILE_BY_ID[tileId];
    if (!t) return { ok: false, reason: 'unknown' };
    if (tileId === bot.tileId) return { ok: true, noop: true }; // re-issuing: no-op
    const now = this.time;
    if (tileId !== 'bolt' && now < bot.lockUntil) {
      return { ok: false, reason: 'locked', remaining: bot.lockUntil - now };
    }
    bot.prevTileId = bot.tileId;
    this.setTile(bot, tileId, via);
    bot.lockDur = tileId === 'bolt' ? 5 : 3;
    bot.lockUntil = now + bot.lockDur;
    bot.lockOrderT = now;
    this.onEvent('commit', { bot: bot.name, tile: t.name, icon: t.icon, lock: bot.lockDur });
    return { ok: true, lock: bot.lockDur };
  }
  belay(bot) {
    const now = this.time;
    if (now < bot.lockUntil && now - bot.lockOrderT <= 1.5 && bot.prevTileId) {
      const t = TILE_BY_ID[bot.prevTileId];
      this.setTile(bot, bot.prevTileId, 'belay');
      bot.lockUntil = 0; bot.prevTileId = null;
      this.onEvent('belay', { bot: bot.name, tile: t.name, icon: t.icon });
      return true;
    }
    return false;
  }
  triggerNow(bot) {
    if (!bot.alive) return false;
    bot.lockUntil = 0; // NOW always works — clears the lock
    bot.forceBomb = true; // and springs the armed action
    this.onEvent('now', { bot: bot.name });
    return true;
  }
  /* ---------- rendering ---------- */
  render() {
    const ctx = this.ctx;
    if (!ctx || !this.map) return;
    const W = COLS * TS, H = ROWS * TS;
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, W, H);
    // cells
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.map.grid[y][x], px = x * TS, py = y * TS;
        if (c === C_HARD) {
          ctx.fillStyle = '#262633';
          ctx.fillRect(px, py, TS, TS);
          ctx.fillStyle = '#343448';
          ctx.fillRect(px, py, TS, 4);
        } else if (c === C_SOFT) {
          ctx.fillStyle = '#7a4f24';
          ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
          ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2;
          ctx.strokeRect(px + 3, py + 3, TS - 6, TS - 6);
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 3); ctx.lineTo(px + TS - 3, py + TS - 3);
          ctx.moveTo(px + TS - 3, py + 3); ctx.lineTo(px + 3, py + TS - 3);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fillRect(px, py, TS, TS);
        }
      }
    }
    // powerups
    const PCOL = { blast: '#ff9f1c', bomb: '#4cc9f0', speed: '#80ed99' };
    const PLBL = { blast: 'R', bomb: 'B', speed: 'S' };
    for (const [k, pu] of this.powerups) {
      const [x, y] = k.split(',').map(Number);
      const cx = x * TS + TS / 2, cy = y * TS + TS / 2;
      ctx.fillStyle = PCOL[pu];
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#101018'; ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(PLBL[pu], cx, cy + 1);
    }
    // bombs
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 14);
    for (const b of this.bombs) {
      const cx = b.x * TS + TS / 2, cy = b.y * TS + TS / 2;
      ctx.fillStyle = '#14141c';
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(239,71,111,' + pulse.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(cx, cy - 4, 4, 0, 7); ctx.fill();
    }
    // explosions
    for (const e of this.explosions) {
      const a = clamp(e.ttl / EXPL_TTL, 0, 1);
      for (const c of e.cells) {
        ctx.fillStyle = 'rgba(255,' + Math.round(120 + 100 * a) + ',40,' + (0.55 + 0.4 * a).toFixed(2) + ')';
        ctx.fillRect(c.x * TS + 2, c.y * TS + 2, TS - 4, TS - 4);
        ctx.fillStyle = 'rgba(255,255,240,' + (0.5 * a).toFixed(2) + ')';
        ctx.fillRect(c.x * TS + 8, c.y * TS + 8, TS - 16, TS - 16);
      }
    }
    // bots
    for (const b of this.bots) {
      if (!b.alive) continue;
      const cx = b.px * TS, cy = b.py * TS, r = 11;
      if (b.isPlayer) {
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 7); ctx.stroke();
      }
      // commitment lock: draining ring, visible to both sides (integration)
      if (b.lockUntil > this.time) {
        const frac = clamp((b.lockUntil - this.time) / b.lockDur, 0, 1);
        ctx.strokeStyle = b.isPlayer ? '#ffd166' : '#9a9ab0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#101018';
      ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, 7); ctx.fill();
      // eyes toward direction
      const ex = b.dx * 3, ey = b.dy * 3;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 4 + ex, cy - 2 + ey, 2.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4 + ex, cy - 2 + ey, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#101018';
      ctx.beginPath(); ctx.arc(cx - 4 + ex * 1.6, cy - 2 + ey * 1.6, 1.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4 + ex * 1.6, cy - 2 + ey * 1.6, 1.3, 0, 7); ctx.fill();
    }
  }
}

/* ============================== commands ============================== */
function parseCommand(text) {
  const t = String(text).toLowerCase().trim();
  if (!t) return { type: 'unknown', text };
  if (/new game|new round|restart|fresh map/.test(t)) return { type: 'newgame' };
  // BELAY is unambiguous — check before tiles ("belay that hunt" still belays)
  if (/\bbelay\b/.test(t)) return { type: 'belay' };
  // longest phrase first so "hunt him down" beats "hunt"
  const all = [];
  for (const tile of TILES) for (const p of tile.phrases) all.push({ tile, p });
  all.sort((a, b) => b.p.length - a.p.length);
  for (const { tile, p } of all) {
    if (t.includes(p)) return { type: 'tile', tile };
  }
  // NOW is a bare trigger, not an order ("hunt now" already matched hunt above)
  if (/\bnow\b/.test(t)) return { type: 'now' };
  return { type: 'unknown', text };
}

/* node test shim (harmless in browsers) */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mulberry32, TILES, TILE_BY_ID, PROTO_IDS, AI_TILES, genMap, Bot, Game, parseCommand, COLS, ROWS, C_EMPTY, C_HARD, C_SOFT };
}
