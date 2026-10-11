/* Bomberman Commander — UI wiring. Loaded after game.js. DOM-only. */
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const game = new Game(canvas);

  /* queued order: a tile tapped during the commitment lock fires the moment
     the lock clears. Latest tap wins; belay / new round / death clears it. */
  let queuedTile = null;

  /* ---------- banner ---------- */
  function showBanner(title, text, buttons) {
    $('banner-title').textContent = title;
    $('banner-text').textContent = text || '';
    const box = $('banner-btns'); box.innerHTML = '';
    (buttons || []).forEach(b => {
      const el = document.createElement('button');
      el.className = 'btn' + (b.primary ? ' primary' : '');
      el.textContent = b.label;
      el.onclick = b.onClick;
      box.appendChild(el);
    });
    $('banner').hidden = false;
  }
  function hideBanner() { $('banner').hidden = true; }

  /* ---------- round lifecycle ---------- */
  function startTheater(seed) {
    queuedTile = null;
    game.speed = currentSpeed();
    game.newRound(seed == null ? (Math.random() * 1e9) | 0 : seed, 'theater');
    $('theater').hidden = false;
    $('commander').hidden = true;
    hideBanner();
    refreshSeedline();
  }
  function startCommander() {
    queuedTile = null;
    game.speed = 1;
    syncSpeedButtons();
    game.newRound((Math.random() * 1e9) | 0, 'commander');
    $('theater').hidden = true;
    $('commander').hidden = false;
    hideBanner();
    // opening stance: set directly, no lock — the commander should be free
    // to order immediately
    game.setTile(game.bots[0], 'dig', 'system');
    order('🎖 Commander online. Your bomber is blue — say or tap a tile. Orders lock 3s; <b>belay</b> cancels a mishear, <b>now</b> always fires.');
    refreshSeedline();
    refreshTilebar();
    renderStrip();
  }
  function refreshSeedline() {
    $('seedline').textContent = 'seed ' + game.map.seed + ' · ' + game.mode;
  }

  game.onEvent = (type, data) => {
    if (type === 'round') { refreshSeedline(); renderStrip(); }
    if (type === 'commit') {
      order('🎖 <b>Committed!</b> ' + data.icon + ' <b>' + escapeHtml(data.tile) +
            '</b> — locked ' + data.lock + 's. <span style="color:var(--dim)">Belay within 1.5s to cancel.</span>');
      refreshTilebar();
    }
    if (type === 'belay') {
      order('⏪ <b>Belayed.</b> Back to ' + data.icon + ' <b>' + escapeHtml(data.tile) + '</b>.');
      refreshTilebar();
    }
    if (type === 'now') {
      order('⚡ <b>NOW!</b> — lock cleared, springing the action.');
    }
    if (type === 'gameover') {
      if (game.mode === 'theater') {
        // attractor: roll straight into the next random game
        setTimeout(() => { if (game.mode === 'theater') startTheater(); }, 2600);
      } else if (data.draw) {
        showBanner('🤝 Stalemate!',
          'Nobody could finish it. The commanders live to fight another round.',
          [
            { label: '🎲 New round', primary: true, onClick: startCommander },
            { label: '📺 Watch theater', onClick: startTheater },
          ]);
      } else {
        const me = game.bots[0];
        const won = me.alive;
        showBanner(won ? '🏆 You win!' : '💥 Your bomber fell',
          won ? 'Flawless commanding. Run it back?'
              : 'The bots keep playing below — or start a fresh round.',
          [
            { label: '🎲 New round', primary: true, onClick: startCommander },
            { label: '📺 Watch theater', onClick: startTheater },
          ]);
      }
    }
    if (type === 'kill' && game.mode === 'commander') {
      const me = game.bots[0];
      if (!me.alive && !game.over) {
        order('💥 Your bomber is down. New round when ready.');
      }
    }
  };

  /* ---------- main loop ---------- */
  let last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    game.update(dt);
    // drain a queued order the moment the commitment lock clears
    if (queuedTile && game.mode === 'commander') {
      const me = game.bots[0];
      if (!me || !me.alive) { queuedTile = null; }
      else if (game.time >= me.lockUntil) {
        const q = queuedTile; queuedTile = null; // clear first: no re-queue loops
        const r = game.orderTile(me, q, 'queue');
        if (r.ok) refreshTilebar(); // commit bark arrives via onEvent
        else order('⚠️ Queued order dropped — say or tap it again.');
      }
    }
    game.render();
    sheetTick++;
    if (sheetTick % 15 === 0) { computeAir(); renderStrip(); }
    if (sheetTick % 30 === 0) renderSheet();
    requestAnimationFrame(frame);
  }

  /* ---------- tile bar (prototype six) ---------- */
  function refreshTilebar() {
    const bar = $('tilebar'); bar.innerHTML = '';
    const me = game.mode === 'commander' && game.bots[0] ? game.bots[0] : null;
    const active = me ? me.tileId : null;
    const locked = me && game.time < me.lockUntil;
    PROTO_IDS.forEach(id => {
      const t = TILE_BY_ID[id];
      const b = document.createElement('button');
      b.className = 'tile' + (t.id === active ? ' active' : '');
      b.innerHTML = '<span class="ic">' + t.icon + '</span>' + t.name +
                    '<small>' + t.desc + '</small>';
      b.title = t.desc + ' — say "' + t.phrases[0] + '"';
      if (locked && t.id !== active && t.id !== 'bolt') b.style.opacity = '0.45';
      if (t.id === queuedTile) b.classList.add('queued');
      b.onclick = () => setPlayerTile(t.id, 'tap');
      bar.appendChild(b);
    });
  }
  function setPlayerTile(id, via) {
    if (game.mode !== 'commander' || !game.bots[0] || !game.bots[0].alive) return;
    const me = game.bots[0];
    if (id === me.tileId) { // re-tapping the live tile cancels any queued order
      if (queuedTile) { queuedTile = null; refreshTilebar(); order('🎖 Staying on ' + TILE_BY_ID[id].icon + ' <b>' + TILE_BY_ID[id].name + '</b> — queued order cancelled.'); }
      return;
    }
    const r = game.orderTile(me, id, via || 'tap');
    if (!r.ok && r.reason === 'locked') {
      // queue it: fires the moment the lock clears (latest tap wins)
      queuedTile = id;
      const t = TILE_BY_ID[id];
      order('🔒 <b>Locked</b> — ' + t.icon + ' <b>' + t.name + '</b> queued, fires in ' +
            r.remaining.toFixed(1) + 's. <span style="color:var(--dim)">Tap again to change the queue · <b>belay</b> cancels · <b>now</b> fires immediately · <b>bolt</b> panics.</span>');
      refreshTilebar();
      return;
    }
    if (r.ok && !r.noop) {
      // commit bark arrives via onEvent; just refresh the bar
      refreshTilebar();
    } else if (r.ok && r.noop) {
      refreshTilebar();
    }
  }
  function doBelay() {
    if (game.mode !== 'commander' || !game.bots[0] || !game.bots[0].alive) return;
    queuedTile = null; // belay cancels everything pending
    if (!game.belay(game.bots[0])) {
      order('⏪ Nothing to belay — no order inside the 1.5s window.');
    }
    refreshTilebar();
  }
  function doNow() {
    if (game.mode !== 'commander' || !game.bots[0] || !game.bots[0].alive) return;
    game.triggerNow(game.bots[0]);
    refreshTilebar();
  }

  /* ---------- orders (voice / type) ---------- */
  function order(html) {
    $('orderline').innerHTML = html;
  }
  function handleCommand(text, via) {
    const r = parseCommand(text);
    if (r.type === 'tile') {
      const before = game.bots[0] ? game.bots[0].tileId : null;
      setPlayerTile(r.tile.id, via);
      // if the order landed (not locked), the commit bark comes via onEvent;
      // if it was a no-op re-issue, acknowledge quietly
      if (game.bots[0] && game.bots[0].tileId === before && game.bots[0].tileId === r.tile.id) {
        order('🎖 <b>"' + escapeHtml(text) + '"</b> → already on ' + r.tile.icon + ' <b>' + r.tile.name + '</b>.');
      }
    } else if (r.type === 'belay') {
      doBelay();
    } else if (r.type === 'now') {
      doNow();
    } else if (r.type === 'newgame') {
      order('🎲 <b>New round</b> — fresh map, fresh bots.');
      startCommander();
    } else {
      // mishear policy: no-op beats wrong-op — never guess between two tiles
      const names = PROTO_IDS.map(id => TILE_BY_ID[id].phrases[0]).join(', ');
      order('🤷 <b>"' + escapeHtml(text) + '"</b> — say again? Holding current tile. Try: ' + names + '.');
    }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  $('cmdtext').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = e.target.value.trim();
      if (v) { handleCommand(v, 'type'); e.target.value = ''; }
    }
  });

  /* ---------- PTT (Sitka pattern, browser-only) ---------- */
  const pttBtn = $('ptt');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let rec = null, pttState = 'idle';
  function pttVisual() {
    pttBtn.classList.toggle('listening', pttState === 'listening');
    pttBtn.classList.toggle('transcribing', pttState === 'transcribing');
    pttBtn.textContent =
      pttState === 'listening' ? '🔴 LISTENING — release to send' :
      pttState === 'transcribing' ? '⏳ hearing you…' : '🎙 HOLD TO TALK';
  }
  function pttCleanup() { if (rec) { try { rec.abort(); } catch (_) {} rec = null; } }
  function pttStart() {
    if (!SR || pttState === 'listening') return;
    pttCleanup();
    rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const t = (e.results[0][0].transcript || '').trim();
      pttCleanup(); pttState = 'idle'; pttVisual();
      if (t) handleCommand(t, 'voice');
    };
    rec.onerror = (e) => {
      pttCleanup(); pttState = 'idle'; pttVisual();
      if (e.error === 'no-speech') order('🎙 Heard nothing — hold the button and speak a tile.');
      else if (e.error === 'not-allowed') order('🎙 Mic blocked — type your order instead.');
    };
    rec.onend = () => { if (pttState === 'listening') { pttCleanup(); pttState = 'idle'; pttVisual(); } };
    try { rec.start(); pttState = 'listening'; }
    catch (err) { pttCleanup(); pttState = 'idle'; }
    pttVisual();
  }
  function pttStop(cancel) {
    if (cancel) {
      // finger slid off: cancel ONLY while still listening. If we already
      // released (transcribing), the leave event must not kill the utterance —
      // on touch, pointerleave fires right after pointerup.
      if (pttState !== 'listening') return;
      pttCleanup(); pttState = 'idle'; pttVisual(); return;
    }
    if (rec && pttState === 'listening') {
      pttState = 'transcribing'; pttVisual();
      try { rec.stop(); } catch (_) { pttCleanup(); pttState = 'idle'; pttVisual(); }
      // safety: if the service never answers, reset after 3s
      setTimeout(() => {
        if (pttState === 'transcribing') { pttCleanup(); pttState = 'idle'; pttVisual(); }
      }, 3000);
    }
  }
  if (!SR) {
    pttBtn.disabled = true;
    pttBtn.textContent = '🎙 voice not supported here — type instead';
    $('vstat').textContent = ' · voice unavailable in this browser';
  } else {
    pttBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); pttStart(); });
    pttBtn.addEventListener('pointerup', () => pttStop(false));
    pttBtn.addEventListener('pointerleave', () => pttStop(true));
    pttBtn.addEventListener('pointercancel', () => pttStop(true));
    // keyboard: hold space while focused
    pttBtn.addEventListener('keydown', (e) => { if (e.key === ' ' && !e.repeat) pttStart(); });
    pttBtn.addEventListener('keyup', (e) => { if (e.key === ' ') pttStop(false); });
  }

  /* ---------- theater controls ---------- */
  function currentSpeed() {
    const on = document.querySelector('.spd.on');
    return on ? parseInt(on.dataset.spd, 10) : 1;
  }
  function syncSpeedButtons() {
    document.querySelectorAll('.spd').forEach(b =>
      b.classList.toggle('on', parseInt(b.dataset.spd, 10) === game.speed));
  }
  document.querySelectorAll('.spd').forEach(b => {
    b.onclick = () => {
      game.speed = parseInt(b.dataset.spd, 10);
      syncSpeedButtons();
    };
  });
  $('newgame').onclick = () => startTheater();
  $('newgame2').onclick = () => startCommander();
  $('takecommand').onclick = () => startCommander();
  $('watch').onclick = () => startTheater();
  $('belaybtn').onclick = () => doBelay();
  $('nowbtn').onclick = () => doNow();

  /* ---------- spreadsheet strip: 4 cells pinned to the board edge ----------
     stance · AIR (safe tiles) · intent · order age. Always visible; the full
     grid stays below the fold. */
  const INTENT = {
    dig: '⛏️ digging', hunt: '🎯 chasing', cage: '🪤 cutting off',
    turtle: '🐢 holding', ambush: '🕸️ lying in wait', bolt: '🏃 fleeing',
  };
  let airCached = 0;
  function computeAir() {
    // AIR = walkable tiles not currently lethal. Cheap enough at ~2Hz.
    let n = 0;
    for (let y = 1; y < ROWS - 1; y++)
      for (let x = 1; x < COLS - 1; x++) {
        if (game.cell(x, y) !== 0) continue;
        if (game.dangerAt(x, y) < 1) n++;
      }
    airCached = n;
  }
  function intentFor(b) {
    if (!b.alive) return '💀 dead';
    if (b.fleePath && b.fleePath.length) return '🏃 escaping blast';
    if (game.time < b.lockUntil) return '🔒 committed';
    if (b.isPlayer && INTENT[b.tileId]) return INTENT[b.tileId];
    return '🤖 ' + (b.tileName || 'roaming');
  }
  function stripRow(b) {
    const t = TILE_BY_ID[b.tileId];
    const stance = t ? t.icon + ' <b>' + t.name.toUpperCase() + '</b>'
                     : '🤖 <b>' + escapeHtml(b.tileName || '?') + '</b>';
    const age = b.lastOrder ? (game.time - b.lastOrder.t).toFixed(1) + 's' : '—';
    const dot = '<span class="dot" style="background:' + b.color + '"></span>';
    return '<div class="striprow">' +
      '<div class="cell"><div class="k">' + dot + escapeHtml(b.name) + ' · stance</div>' +
        '<div class="v">' + stance + '</div></div>' +
      '<div class="cell"><div class="k">air</div>' +
        '<div class="v"><b>' + airCached + '</b> safe</div></div>' +
      '<div class="cell"><div class="k">intent</div>' +
        '<div class="v">' + intentFor(b) + '</div></div>' +
      '<div class="cell"><div class="k">order age</div>' +
        '<div class="v">' + age + '</div></div>' +
      '</div>';
  }
  function renderStrip() {
    const el = $('strip');
    if (!game.bots.length) { el.innerHTML = ''; return; }
    const bots = game.mode === 'commander' ? [game.bots[0]] : game.bots;
    el.innerHTML = bots.map(stripRow).join('');
  }

  /* ---------- spreadsheet ---------- */
  let sheetTick = 0;
  const TILE_SHORT = {};
  TILES.forEach(t => { TILE_SHORT[t.name] = t.icon + ' ' + t.name; });
  function renderSheet() {
    const tb = $('sheetbody');
    tb.innerHTML = game.bots.map(b => {
      const tile = TILE_SHORT[b.tileName] || b.tileName;
      const ord = b.lastOrder
        ? b.lastOrder.tile + ' (' + b.lastOrder.via + ')'
        : '<span style="color:var(--dim)">—</span>';
      const st = b.alive ? 'alive' : '<span class="dead">dead</span>';
      return '<tr><td><span class="dot" style="background:' + b.color + '"></span>' +
        (b.alive ? b.name : '<span class="dead">' + b.name + '</span>') + '</td><td>' + tile +
        '</td><td>' + b.tx + ',' + b.ty + '</td><td>' + b.blast + '</td><td>' +
        b.bombsOut + '/' + b.maxBombs + '</td><td>' + b.speed.toFixed(1) + '</td><td>' +
        b.loot + '</td><td>' + ord + '</td><td>' + st + '</td></tr>';
    }).join('');
  }

  /* ---------- boot ---------- */
  refreshTilebar();
  startTheater();
  requestAnimationFrame(frame);
})();
