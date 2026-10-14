/*
 * Robotkoden – programmeringsspil.
 * Børnene bygger et program af blokke, der kører en robot hen til ladestationen.
 * Blokke sættes ind ved at trykke (eller trække) – og kan flyttes, fjernes og sættes inde i hinanden.
 */
(function (root) {
  'use strict';
  var Core = root.Core, RK = root.RK, LV = root.RK_LEVELS, Bob = root.Bob, S = root.STR.rk, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'robotkoden';
  var CONTAINERS = { gentag: 1, indtil: 1, hvis: 1 };

  var app = null, st = null, timers = [], clock = 0, el = {}, LEVELS = null;

  /* ---------- data ---------- */
  function levels() { if (!LEVELS) LEVELS = LV.defs.map(RK.buildLevel); return LEVELS; }
  function data() {
    var d = Core.gameData(ID);
    d.levels = d.levels || {};
    if (d.fast === undefined) d.fast = false;
    return d;
  }
  function lvState(id, d) { d = d || data(); return d.levels[id] || (d.levels[id] = { stars: 0, solved: false }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---------- icons ---------- */
  var I = {
    frem: '<svg viewBox="0 0 24 24"><path d="M12 20V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    venstre: '<svg viewBox="0 0 24 24"><path d="M18 20v-7a5 5 0 0 0-5-5H6M10 4L6 8l4 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hojre: '<svg viewBox="0 0 24 24"><path d="M6 20v-7a5 5 0 0 1 5-5h7M14 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gentag: '<svg viewBox="0 0 24 24"><path d="M4 12a7 7 0 0 1 12-5l2 2M20 12a7 7 0 0 1-12 5l-2-2M18 4v5h-5M6 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    indtil: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hvis: '<svg viewBox="0 0 24 24"><path d="M12 3l9 9-9 9-9-9z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M10 10a2 2 0 1 1 3 1.7c-.6.4-1 .8-1 1.5M12 16.5v.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    kald: '<svg viewBox="0 0 24 24"><path d="M9 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3M15 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
    stepI: '<svg viewBox="0 0 24 24"><path d="M5 5v14l9-7zM16 5h3v14h-3z" fill="currentColor"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  };
  function icon(name) { return h('span', { class: 'rk-ico', 'aria-hidden': 'true', html: I[name] }); }

  /* ---------- board graphics ---------- */
  var ART = {
    robot: '<svg viewBox="0 0 80 80"><line x1="40" y1="12" x2="40" y2="4" stroke="#4A2C17" stroke-width="3"/><circle cx="40" cy="4" r="4" fill="#6BB8E0" stroke="#4A2C17" stroke-width="2.5"/>' +
      '<rect x="14" y="12" width="52" height="40" rx="13" fill="#A9D8F2" stroke="#4A2C17" stroke-width="3.5"/><rect x="21" y="19" width="38" height="26" rx="8" fill="#E3F3FB" stroke="#4A2C17" stroke-width="2.5"/>' +
      '<circle cx="32" cy="30" r="3.4" fill="#4A2C17"/><circle cx="48" cy="30" r="3.4" fill="#4A2C17"/><path d="M34 37q6 5 12 0" fill="none" stroke="#4A2C17" stroke-width="2.5" stroke-linecap="round"/>' +
      '<rect x="22" y="52" width="36" height="18" rx="7" fill="#A9D8F2" stroke="#4A2C17" stroke-width="3"/><circle cx="29" cy="73" r="5" fill="#5D6878" stroke="#4A2C17" stroke-width="2.5"/><circle cx="51" cy="73" r="5" fill="#5D6878" stroke="#4A2C17" stroke-width="2.5"/></svg>',
    battery: '<svg viewBox="0 0 40 40"><rect x="10" y="7" width="20" height="29" rx="4" fill="#8DD17E" stroke="#2E5E28" stroke-width="2.5"/><rect x="16" y="3" width="8" height="5" rx="1.5" fill="#2E5E28"/><path d="M21 12l-5 10h5l-2 9 6-12h-5l2-7z" fill="#FFF6B0" stroke="#2E5E28" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    goal: '<svg viewBox="0 0 40 40"><rect x="4" y="9" width="32" height="24" rx="6" fill="#FCE7A8" stroke="#4A2C17" stroke-width="2.5"/><path d="M22 12l-7 10h6l-3 8 8-11h-6l2-7z" fill="#F7C548" stroke="#4A2C17" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    wall: '<svg viewBox="0 0 40 40" preserveAspectRatio="none"><rect x="2" y="2" width="36" height="36" rx="5" fill="#B9A58A" stroke="#6F5A40" stroke-width="2.5"/><path d="M2 20h36M20 2v18M11 20v18M29 20v18" stroke="#8E7A5E" stroke-width="2"/></svg>'
  };

  /* ---------- hub API ---------- */
  function summary(d) {
    var n = 0; for (var k in (d.levels || {})) n += d.levels[k].stars || 0;
    return { stars: n, max: LV.defs.length * 3 };
  }
  // Worlds 1–3 (from 8–9 years) count as Mellemtrin, worlds 4–5 (from 11 years) as Udskoling
  function progress(d) {
    var out = { plays: 0, bands: { M: [], U: [] } };
    LV.defs.forEach(function (x) { var ls = (d.levels || {})[x.id] || {}; if (ls.solved) out.plays++; out.bands[x.world >= 4 ? 'U' : 'M'].push(ls.stars || 0); });
    return out;
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  // Daily challenge: follow a short program on a 5×5 grid and find where the robot ends.
  function quickTask(band) {
    var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], N = 5;
    function run(x, y, dir, prog) {
      for (var i = 0; i < prog.length; i++) {
        var b = prog[i];
        if (b === 'venstre') dir = (dir + 3) % 4; else if (b === 'hojre') dir = (dir + 1) % 4;
        else { x += DX[dir]; y += DY[dir]; if (x < 0 || y < 0 || x >= N || y >= N) return null; }
      }
      return [x, y];
    }
    for (var guard = 0; guard < 500; guard++) {
      var x0 = Math.floor(Math.random() * N), y0 = Math.floor(Math.random() * N), dir = Math.floor(Math.random() * 4), prog = [], shown, rep = 0, inner = [];
      if (band === 'U' && Math.random() < 0.6) { // a repeat block
        rep = 2 + Math.floor(Math.random() * 2);
        inner = [['frem', 'hojre'], ['frem', 'venstre'], ['frem', 'frem', 'hojre'], ['frem']][Math.floor(Math.random() * 4)];
        for (var k = 0; k < rep; k++) prog = prog.concat(inner);
        if (Math.random() < 0.5) prog.push('frem');
        shown = [t(S.quickRepeat, { n: rep, blocks: inner.map(function (b) { return S.blocks[b]; }).join(', ') })].concat(prog.length > rep * inner.length ? [S.blocks.frem] : []);
      } else {
        var len = band === 'U' ? 5 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3);
        for (var j = 0; j < len; j++) prog.push(Math.random() < 0.6 ? 'frem' : Math.random() < 0.5 ? 'venstre' : 'hojre');
        if (prog.indexOf('frem') < 0) continue;
        shown = prog.map(function (b) { return S.blocks[b]; });
      }
      var end = run(x0, y0, dir, prog); if (!end || (end[0] === x0 && end[1] === y0)) continue;
      // wrong answers: left and right swapped, or the last step forgotten
      var swapped = run(x0, y0, dir, prog.map(function (b) { return b === 'venstre' ? 'hojre' : b === 'hojre' ? 'venstre' : b; })), short = run(x0, y0, dir, prog.slice(0, -1));
      var cands = [end], extra = [swapped, short, run(x0, y0, (dir + 2) % 4, prog)];
      extra.forEach(function (c) { if (c && cands.length < 3 && !cands.some(function (o) { return o[0] === c[0] && o[1] === c[1]; }) && !(c[0] === x0 && c[1] === y0)) cands.push(c); });
      if (cands.length < 3) continue;
      cands = shuffle(cands);
      var letters = ['A', 'B', 'C'], right = letters[cands.indexOf(end)], cs = 44;
      var svg = '<svg viewBox="0 0 ' + (N * cs + 4) + ' ' + (N * cs + 4) + '" width="' + (N * cs + 4) + '" height="' + (N * cs + 4) + '" role="img" aria-label="Robotbane" style="max-width:100%">';
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) svg += '<rect x="' + (2 + c * cs) + '" y="' + (2 + r * cs) + '" width="' + cs + '" height="' + cs + '" fill="' + (c === x0 && r === y0 ? '#BFE3B4' : '#FFF9EC') + '" stroke="#C9B48A" stroke-width="1.5"/>';
      cands.forEach(function (p, i) { svg += '<circle cx="' + (2 + p[0] * cs + cs / 2) + '" cy="' + (2 + p[1] * cs + cs / 2) + '" r="15" fill="#FFE7A0" stroke="#4A2C17" stroke-width="2"/><text x="' + (2 + p[0] * cs + cs / 2) + '" y="' + (2 + p[1] * cs + cs / 2 + 6) + '" text-anchor="middle" font-size="17" font-weight="800" fill="#4A2C17" font-family="system-ui,sans-serif">' + letters[i] + '</text>'; });
      var cx = 2 + x0 * cs + cs / 2, cy = 2 + y0 * cs + cs / 2;
      svg += '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + dir * 90 + ')"><circle r="14" fill="#A9D8F2" stroke="#4A2C17" stroke-width="2.5"/><path d="M0,-12 L8,2 L-8,2 Z" fill="#4A2C17"/></g></svg>';
      return { q: S.quickQ, html: svg, big: shown.join(' → '), options: letters, answer: right, hint: S.quickHint, explain: t(S.quickExplain, { x: right }) };
    }
    return null;
  }
  function parentReport(d) {
    var rows = [];
    LV.worlds.forEach(function (w) {
      var defs = LV.defs.filter(function (x) { return x.world === w.id; });
      var solved = 0, stars = 0;
      defs.forEach(function (x) { var s = (d.levels || {})[x.id]; if (s && s.solved) solved++; stars += s ? s.stars || 0 : 0; });
      if (solved || stars) rows.push([w.id + '. ' + w.name, solved + '/' + defs.length, stars + '/' + defs.length * 3]);
    });
    return { head: S.reportHead, rows: rows };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) {
    app = container;
    clock = setInterval(function () { if (st && st.lvl && !document.hidden) Core.addTime(ID, 1); }, 1000);
    showMap();
  }
  function unmount() {
    stopRun(); clearTimers(); clearInterval(clock);
    root.removeEventListener('resize', layout);
    st = null; el = {};
    Core.save();
  }

  /* ================= MAP ================= */
  function showMap() {
    stopRun(); clearTimers(); root.removeEventListener('resize', layout);
    st = null; el = {};
    var d = data(), all = levels(), nextId = null;
    for (var i = 0; i < all.length; i++) if (!lvState(all[i].id, d).solved) { nextId = all[i].id; break; }
    var sections = LV.worlds.map(function (w) {
      var btns = all.filter(function (l) { return l.world === w.id; }).map(function (l) {
        var s = lvState(l.id, d);
        return h('button', { type: 'button', class: 'rk-lvl' + (l.id === nextId ? ' next' : '') + (s.solved ? ' done' : ''), onclick: function () { Core.play('click'); startLevel(l); } }, [
          h('span', { class: 'rk-lvl-no' }, l.id),
          l.id === nextId ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('span', { class: 'rk-lvl-title' }, l.title),
          h('span', { html: Core.starIcons(s.stars || 0, 3, 'small') })
        ]);
      });
      return h('section', { class: 'rk-world' }, [
        h('div', { class: 'rk-world-head' }, [h('h2', {}, w.id + '. ' + w.name), h('span', { class: 'rk-age' }, w.from), h('p', { class: 'muted' }, w.desc)]),
        h('div', { class: 'rk-lvls' }, btns)
      ]);
    });
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen rk-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, [h('span', { class: 'ico', html: I.back }), SC.back])]),
      h('div', { class: 'rs-title' }, [
        h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: 'tools', size: 170 }) }),
        h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])
      ]),
      sections,
      h('section', { class: 'rk-world' }, h('div', { class: 'row' }, [
        h('button', { type: 'button', class: 'btn primary', onclick: showEditor }, S.buildOwn),
        h('button', { type: 'button', class: 'btn secondary', onclick: showShared }, S.playShared)
      ]))
    ]));
  }

  /* ================= PLAY ================= */
  function startLevel(lvl, opts) {
    stopRun(); clearTimers();
    opts = opts || {};
    var d = data(), saved = lvl.custom ? null : lvState(lvl.id, d).prog;
    var prog = saved ? { main: RK.clone(saved.main), f: RK.clone(saved.f) } : lvl.pre ? { main: RK.clone(lvl.pre.main), f: RK.clone(lvl.pre.f) } : { main: [], f: [] };
    st = { lvl: lvl, prog: prog, cursor: { path: 'main', index: prog.main.length }, sel: null, running: false, stepping: null, fails: 0, helped: false, codeView: false, opts: opts, robot: null };
    app.innerHTML = '';

    el.blocksInfo = h('span', { class: 'rk-chip' });
    el.batInfo = lvl.batteries.length ? h('span', { class: 'rk-chip bat' }) : null;
    var hud = h('header', { class: 'rk-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: I.back, onclick: function () { if (opts.fromEditor) showEditor(); else showMap(); } }),
      h('div', { class: 'rk-hud-title' }, [h('strong', {}, (lvl.custom ? S.ownLevel : lvl.id) + ' · ' + (lvl.title || S.ownLevel)), h('span', { class: 'rk-chips' }, [el.blocksInfo, el.batInfo])]),
      lvl.hint ? h('button', { type: 'button', class: 'chip', onclick: showTip }, [icon('bulb'), S.tip]) : null
    ]);

    el.board = h('div', { class: 'rk-board' });
    el.bob = h('div', { class: 'rk-bob' });
    el.bubble = h('div', { class: 'rk-bubble', role: 'status', 'aria-live': 'polite' });
    el.stage = h('div', { class: 'rk-stage' }, [el.board, el.bob, el.bubble]);

    el.palette = h('div', { class: 'rk-palette', role: 'toolbar', 'aria-label': 'Blokke' }, lvl.palette.map(paletteButton));
    el.program = h('div', { class: 'rk-program' });
    el.code = h('pre', { class: 'rk-code', hidden: true });
    el.runBtn = h('button', { type: 'button', class: 'btn primary rk-run', onclick: function () { if (st.running) stopRun(true); else runProgram(); } });
    el.stepBtn = h('button', { type: 'button', class: 'btn secondary', onclick: stepOnce }, [icon('stepI'), S.step]);
    el.speedBtn = h('button', { type: 'button', class: 'chip', 'aria-pressed': d.fast ? 'true' : 'false', onclick: function () { d.fast = !d.fast; Core.save(); updateControls(); } });
    el.codeBtn = h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: function () { st.codeView = !st.codeView; renderProgram(); updateControls(); } });
    el.clearBtn = confirmChip(S.clearAll, function () { st.prog = { main: [], f: [] }; st.cursor = { path: 'main', index: 0 }; st.sel = null; changed(); });
    var controls = h('div', { class: 'rk-controls' }, [el.runBtn, el.stepBtn, h('div', { class: 'rk-controls-more' }, [el.speedBtn, el.codeBtn, el.clearBtn])]);
    el.side = h('div', { class: 'rk-side' }, [el.palette, h('div', { class: 'rk-program-wrap' }, [el.program, el.code]), controls]);

    el.root = h('div', { class: 'rk-play' }, [hud, h('div', { class: 'rk-main' }, [el.stage, el.side])]);
    app.appendChild(el.root);

    buildBoard();
    renderProgram();
    updateControls();
    root.addEventListener('resize', layout);
    layout();
    if (lvl.pre && !saved) setBob('thinking', S.debugIntro, 6000);
    else setBob('hello', Core.pick(S.bobStart));
  }

  function confirmChip(label, fn) {
    var armed = false, timer;
    var b = h('button', { type: 'button', class: 'chip', onclick: function () {
      if (st.running) return;
      if (!armed) { armed = true; b.textContent = SC.confirmAgain; timer = setTimeout(function () { armed = false; b.textContent = label; }, 3000); return; }
      clearTimeout(timer); armed = false; b.textContent = label; fn();
    } }, label);
    return b;
  }

  function setBob(expr, text, ms) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: 'tools', sidekick: false, size: 200 });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text !== undefined && text !== null) {
      el.bubble.innerHTML = '';
      el.bubble.appendChild(typeof text === 'string' ? document.createTextNode(text) : text);
      el.bubble.classList.add('show');
      clearTimeout(el.bubbleTimer);
      if (ms !== 0) el.bubbleTimer = setTimeout(function () { el.bubble && el.bubble.classList.remove('show'); }, ms || 4500);
    }
  }
  function showTip() { Core.play('click'); setBob('thinking', st.lvl.hint, 8000); }

  /* ---------- board ---------- */
  function buildBoard() {
    var lvl = st.lvl;
    el.board.innerHTML = '';
    el.board.style.gridTemplateColumns = 'repeat(' + lvl.cols + ', var(--tile))';
    el.tiles = {};
    for (var r = 0; r < lvl.rows; r++) for (var c = 0; c < lvl.cols; c++) {
      var ch = lvl.grid[r][c];
      var tile = h('div', { class: 'rk-tile ' + (ch === '#' ? 'wall' : 'floor') + ((r + c) % 2 ? ' alt' : ''), html: ch === '#' ? ART.wall : '' });
      if (ch === 'B') tile.appendChild(h('div', { class: 'rk-item battery', html: ART.battery }));
      if (ch === 'G') tile.appendChild(h('div', { class: 'rk-item goal', html: ART.goal }));
      el.tiles[r + ',' + c] = tile;
      el.board.appendChild(tile);
    }
    el.robot = h('div', { class: 'rk-robot' }, [h('div', { class: 'rk-dir', html: '<svg viewBox="0 0 40 40"><path d="M20 1l7 8H13z" fill="#2F7DB3" stroke="#fff" stroke-width="1.5"/></svg>' }), h('div', { class: 'rk-robot-img', html: ART.robot })]);
    el.board.appendChild(el.robot);
    resetRobot();
  }
  function resetRobot() {
    var s = st.lvl.start;
    st.robot = { r: s.r, c: s.c, d: s.d, angle: s.d * 90, got: 0 };
    el.board.querySelectorAll('.rk-item.battery').forEach(function (b) { b.classList.remove('taken'); });
    el.robot.classList.remove('crash', 'win', 'bump');
    placeRobot(true);
    updateInfo();
  }
  function placeRobot(instant) {
    var R = st.robot;
    if (instant) el.robot.classList.add('instant');
    el.robot.style.transform = 'translate(calc(var(--tile) * ' + R.c + '), calc(var(--tile) * ' + R.r + '))';
    el.robot.querySelector('.rk-dir').style.transform = 'rotate(' + R.angle + 'deg)';
    if (instant) { void el.robot.offsetWidth; el.robot.classList.remove('instant'); }
  }
  function layout() {
    if (!el.stage) return;
    var lvl = st.lvl, W = el.stage.clientWidth, H = el.stage.clientHeight;
    var wide = W > H * 1.25;
    var bob = Math.round(Math.max(84, Math.min(190, wide ? H * 0.32 : Math.min(W * 0.26, H * 0.36))));
    var reserveW = wide ? bob * 0.85 : 0, reserveH = wide ? 0 : bob * 0.72;
    var tile = Math.floor(Math.max(24, Math.min(96, (W - 24 - reserveW) / lvl.cols, (H - 24 - reserveH) / lvl.rows)));
    el.stage.style.setProperty('--tile', tile + 'px');
    el.stage.style.setProperty('--bob', bob + 'px');
    el.stage.style.paddingLeft = (12 + reserveW) + 'px';
    el.stage.style.paddingBottom = (12 + reserveH) + 'px';
    el.stage.classList.toggle('wide', wide);
  }

  /* ---------- palette & program editing ---------- */
  function blockLabel(t) { return S.blocks[t]; }
  function paletteButton(type) {
    var b = h('button', { type: 'button', class: 'rk-pal t-' + type, 'data-type': type }, [icon(type), h('span', {}, blockLabel(type))]);
    b.addEventListener('click', function () { if (b._dragged) { b._dragged = false; return; } addBlock(type); });
    dragSource(b, { type: type });
    return b;
  }
  function newBlock(type) {
    var b = { id: RK.newId(), t: type };
    if (type === 'gentag') { b.n = 3; b.body = []; }
    if (type === 'indtil') b.body = [];
    if (type === 'hvis') { b.c = 'frem'; b.body = []; b.ellers = []; }
    return b;
  }
  function getList(path) {
    var parts = path.split('.'), list = st.prog[parts[0]];
    for (var i = 1; i < parts.length; i += 2) list = list[+parts[i]][parts[i + 1]];
    return list;
  }
  function findBlock(id, list, path) {
    list = list || null;
    if (!list) return findBlock(id, st.prog.main, 'main') || findBlock(id, st.prog.f, 'f');
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return { list: list, index: i, path: path, block: list[i] };
      var sub = list[i].body && findBlock(id, list[i].body, path + '.' + i + '.body');
      if (sub) return sub;
      sub = list[i].ellers && findBlock(id, list[i].ellers, path + '.' + i + '.ellers');
      if (sub) return sub;
    }
    return null;
  }
  function canAdd(type, path, silent) {
    var lvl = st.lvl, n = RK.countProgram(st.prog);
    if (lvl.limit && n + 1 > lvl.limit) { if (!silent) { Core.play('wrong'); setBob('surprised', t(S.limitReached, { max: lvl.limit })); flashInfo(); } return false; }
    if (type === 'kald' && path.split('.')[0] === 'f') { if (!silent) { Core.play('wrong'); setBob('thinking', S.noFuncInFunc); } return false; }
    return true;
  }
  function addBlock(type, path, index) {
    if (st.running) return;
    stopStepping();
    path = path || st.cursor.path; index = index === undefined ? st.cursor.index : index;
    if (!canAdd(type, path)) return;
    var b = newBlock(type), list = getList(path);
    list.splice(index, 0, b);
    Core.play('click');
    st.sel = null;
    if (CONTAINERS[type]) st.cursor = { path: path + '.' + index + '.body', index: 0 };
    else st.cursor = { path: path, index: index + 1 };
    changed(b.id);
  }
  function removeBlock(id) {
    var f = findBlock(id); if (!f) return;
    f.list.splice(f.index, 1);
    // cursor inside the removed block → move it to where the block was
    if (st.cursor.path.indexOf(f.path + '.' + f.index + '.') === 0 || st.cursor.path === f.path + '.' + f.index) st.cursor = { path: f.path, index: f.index };
    else if (st.cursor.path === f.path && st.cursor.index > f.index) st.cursor.index--;
    st.sel = null;
    Core.play('click');
    changed();
  }
  function moveBlock(id, delta) {
    var f = findBlock(id); if (!f) return;
    var j = f.index + delta; if (j < 0 || j >= f.list.length) return;
    var tmp = f.list[j]; f.list[j] = f.list[f.index]; f.list[f.index] = tmp;
    st.cursor = { path: f.path, index: j + 1 };
    changed(id);
  }
  function moveTo(id, path, index) { // drag & drop of an existing block
    var f = findBlock(id); if (!f) return;
    var own = f.path + '.' + f.index + '.';
    if ((path + '.').indexOf(own) === 0) return; // into itself
    if (f.block.t === 'kald' && path.split('.')[0] === 'f') { canAdd('kald', path); return; }
    var target = getList(path); // keep the array itself: paths can shift when the block leaves
    f.list.splice(f.index, 1);
    if (target === f.list && index > f.index) index--;
    target.splice(index, 0, f.block);
    var nf = findBlock(id);
    st.cursor = { path: nf.path, index: nf.index + 1 };
    Core.play('click');
    changed(id);
  }
  function changed(focusId) {
    stopStepping();
    if (!st.running) resetRobot();
    if (!st.lvl.custom) { lvState(st.lvl.id).prog = { main: RK.clone(st.prog.main, true), f: RK.clone(st.prog.f, true) }; Core.saveSoon(); }
    renderProgram(focusId);
    updateInfo();
  }

  /* ---------- program rendering ---------- */
  function renderProgram(focusId) {
    var showF = st.lvl.palette.indexOf('kald') >= 0;
    el.program.innerHTML = '';
    el.program.hidden = st.codeView;
    el.code.hidden = !st.codeView;
    if (st.codeView) { el.code.textContent = RK.toCode(st.prog) || '// …'; return; }
    el.program.appendChild(section(S.program, 'main'));
    if (showF) el.program.appendChild(section(S.func, 'f'));
    if (focusId) {
      var n = el.program.querySelector('[data-id="' + focusId + '"]');
      if (n && n.scrollIntoView) n.scrollIntoView({ block: 'nearest' });
    } else {
      var cur = el.program.querySelector('.rk-slot.cursor');
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    }
  }
  function section(title, path) {
    return h('div', { class: 'rk-section rk-sec-' + path }, [h('div', { class: 'rk-sec-title' }, [path === 'f' ? icon('kald') : null, title]), renderList(st.prog[path], path)]);
  }
  function renderList(list, path) {
    var wrap = h('div', { class: 'rk-list' });
    for (var i = 0; i <= list.length; i++) {
      wrap.appendChild(slot(path, i, i === list.length, list.length === 0));
      if (i < list.length) wrap.appendChild(renderBlock(list[i], path, i));
    }
    return wrap;
  }
  function slot(path, index, isEnd, isEmpty) {
    var cur = st.cursor.path === path && st.cursor.index === index;
    var nested = path !== 'main' && path !== 'f';
    var s = h('div', { class: 'rk-slot' + (cur ? ' cursor' : '') + (isEnd ? ' end' : '') + (isEmpty ? ' empty' : ''), 'data-path': path, 'data-index': index, role: 'button', tabindex: isEnd ? '0' : '-1',
      'aria-label': S.addHere, onclick: function () { st.cursor = { path: path, index: index }; st.sel = null; Core.play('click'); renderProgram(); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.click(); } } },
      isEnd ? (isEmpty ? (nested ? S.emptyInside : S.addHere) : '+') : null);
    return s;
  }
  function renderBlock(b, path, index) {
    var selected = st.sel === b.id;
    var head = h('div', { class: 'rk-head' });
    var grip = h('span', { class: 'rk-grip', html: I.grip, 'aria-hidden': 'true' });
    head.appendChild(grip);
    head.appendChild(icon(b.t));
    if (b.t === 'gentag') {
      head.appendChild(h('span', {}, S.blocks.gentag));
      head.appendChild(h('span', { class: 'rk-num' }, [
        h('button', { type: 'button', class: 'rk-mini', 'aria-label': S.less, onclick: function (e) { e.stopPropagation(); if (b.n > 2) { b.n--; changed(b.id); } } }, '−'),
        h('strong', {}, String(b.n)),
        h('button', { type: 'button', class: 'rk-mini', 'aria-label': S.more, onclick: function (e) { e.stopPropagation(); if (b.n < 12) { b.n++; changed(b.id); } } }, '+')
      ]));
      head.appendChild(h('span', {}, S.blocks.gentagTimes));
    } else if (b.t === 'hvis') {
      head.appendChild(h('span', {}, S.blocks.hvis));
      head.appendChild(h('button', { type: 'button', class: 'rk-cond', onclick: function (e) {
        e.stopPropagation(); b.c = b.c === 'frem' ? 'venstre' : b.c === 'venstre' ? 'hojre' : 'frem'; Core.play('click'); changed(b.id);
      } }, S.cond[b.c] + ' ▾'));
    } else head.appendChild(h('span', {}, blockLabel(b.t)));
    if (selected) {
      head.appendChild(h('span', { class: 'rk-tools' }, [
        h('button', { type: 'button', class: 'rk-mini', 'aria-label': S.moveUp, html: I.up, onclick: function (e) { e.stopPropagation(); moveBlock(b.id, -1); } }),
        h('button', { type: 'button', class: 'rk-mini', 'aria-label': S.moveDown, html: I.down, onclick: function (e) { e.stopPropagation(); moveBlock(b.id, 1); } }),
        h('button', { type: 'button', class: 'rk-mini danger', 'aria-label': S.remove, html: I.x, onclick: function (e) { e.stopPropagation(); removeBlock(b.id); } })
      ]));
    }
    var node = h('div', { class: 'rk-block t-' + b.t + (selected ? ' sel' : ''), 'data-id': b.id, tabindex: '0', role: 'button', 'aria-label': blockLabel(b.t) + (b.t === 'gentag' ? ' ' + b.n + ' ' + S.blocks.gentagTimes : b.t === 'hvis' ? ' ' + S.cond[b.c] : '') }, [head]);
    head.addEventListener('click', function () {
      if (node._dragged) { node._dragged = false; return; }
      if (st.running) return;
      st.sel = selected ? null : b.id;
      st.cursor = { path: path, index: index + 1 };
      Core.play('click');
      renderProgram();
    });
    node.addEventListener('keydown', function (e) {
      if (e.target !== node) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); head.click(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeBlock(b.id); }
    });
    dragSource(grip, { id: b.id, node: node });
    if (b.body) node.appendChild(h('div', { class: 'rk-body' }, renderList(b.body, path + '.' + index + '.body')));
    if (b.t === 'hvis') {
      node.appendChild(h('div', { class: 'rk-else-label' }, S.blocks.ellers));
      node.appendChild(h('div', { class: 'rk-body' }, renderList(b.ellers, path + '.' + index + '.ellers')));
    }
    return node;
  }

  /* ---------- drag & drop (mouse, touch and pen) ---------- */
  function dragSource(handle, what) {
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || st.running) return;
      var sx = e.clientX, sy = e.clientY, ghost = null, hover = null;
      function move(ev) {
        if (!ghost) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 8) return;
          ghost = h('div', { class: 'rk-ghost t-' + (what.type || findBlock(what.id).block.t) }, what.type ? [icon(what.type), blockLabel(what.type)] : [icon(findBlock(what.id).block.t), blockLabel(findBlock(what.id).block.t)]);
          document.body.appendChild(ghost);
          el.side.classList.add('dragging');
          if (what.node) what.node.classList.add('lifted');
        }
        ev.preventDefault();
        ghost.style.transform = 'translate(' + (ev.clientX + 8) + 'px,' + (ev.clientY - 20) + 'px)';
        var under = document.elementFromPoint(ev.clientX, ev.clientY);
        var s = under && under.closest && under.closest('.rk-slot');
        if (hover && hover !== s) hover.classList.remove('hover');
        hover = s; if (hover) hover.classList.add('hover');
        el.palette.classList.toggle('trash', !!(what.id && under && under.closest && under.closest('.rk-palette')));
        // auto-scroll the program area
        var wrap = el.program.parentNode, r = wrap.getBoundingClientRect();
        if (ev.clientY < r.top + 30) wrap.scrollTop -= 10; else if (ev.clientY > r.bottom - 30) wrap.scrollTop += 10;
      }
      function up(ev) {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        if (!ghost) return;
        handle._dragged = true; if (what.node) what.node._dragged = true;
        setTimeout(function () { handle._dragged = false; if (what.node) what.node._dragged = false; }, 50);
        ghost.remove();
        el.side.classList.remove('dragging');
        el.palette.classList.remove('trash');
        if (what.node) what.node.classList.remove('lifted');
        var under = document.elementFromPoint(ev.clientX, ev.clientY);
        if (hover) {
          var path = hover.getAttribute('data-path'), index = +hover.getAttribute('data-index');
          if (what.type) addBlock(what.type, path, index); else moveTo(what.id, path, index);
        } else if (what.id && under && under.closest && under.closest('.rk-palette')) removeBlock(what.id);
      }
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
  }

  /* ---------- info & controls ---------- */
  function updateInfo() {
    if (!el.blocksInfo) return;
    var n = RK.countProgram(st.prog), lvl = st.lvl;
    el.blocksInfo.textContent = lvl.limit ? t(S.blocksLimit, { n: n, max: lvl.limit }) : t(S.blocksUsed, { n: n });
    el.blocksInfo.classList.toggle('full', !!lvl.limit && n >= lvl.limit);
    if (el.batInfo) el.batInfo.textContent = t(S.batteriesGot, { n: st.robot ? st.robot.got : 0, max: lvl.batteries.length });
  }
  function flashInfo() { el.blocksInfo.classList.remove('flash'); void el.blocksInfo.offsetWidth; el.blocksInfo.classList.add('flash'); }
  function updateControls() {
    var d = data();
    el.runBtn.innerHTML = '';
    el.runBtn.appendChild(icon(st.running ? 'stop' : 'play'));
    el.runBtn.appendChild(document.createTextNode(st.running ? S.stop : S.run));
    el.runBtn.classList.toggle('stop', st.running);
    el.stepBtn.disabled = st.running;
    el.speedBtn.textContent = d.fast ? S.fast : S.slow;
    el.speedBtn.setAttribute('aria-pressed', d.fast ? 'true' : 'false');
    el.codeBtn.textContent = st.codeView ? S.showBlocks : S.showCode;
    el.codeBtn.setAttribute('aria-pressed', st.codeView ? 'true' : 'false');
    el.root.classList.toggle('running', st.running);
    el.stage.style.setProperty('--rk-speed', d.fast ? '.15s' : '.38s');
  }

  /* ---------- running ---------- */
  function speed() { return data().fast ? 170 : 430; }
  function highlight(id) {
    el.program.querySelectorAll('.rk-block.running').forEach(function (n) { n.classList.remove('running'); });
    if (id) { var n = el.program.querySelector('[data-id="' + id + '"]'); if (n) n.classList.add('running'); }
  }
  function applyEvent(e) {
    var R = st.robot;
    if (e.type === 'move') {
      R.r = e.r; R.c = e.c; placeRobot(); Core.play('step');
      if (e.battery) {
        R.got++;
        var b = el.tiles[e.r + ',' + e.c].querySelector('.battery'); if (b) b.classList.add('taken');
        later(function () { Core.play('battery'); }, speed() * 0.6);
        updateInfo();
      }
    } else if (e.type === 'turn') { R.d = e.d; R.angle += e.turn * 90; placeRobot(); Core.play('turn'); }
    else if (e.type === 'crash') { el.robot.style.setProperty('--bx', RK.DC[R.d] * 26 + '%'); el.robot.style.setProperty('--by', RK.DR[R.d] * 26 + '%'); el.robot.classList.remove('bump'); void el.robot.offsetWidth; el.robot.classList.add('bump'); Core.play('bump'); }
    highlight(e.id);
  }
  function eventDelay(e) { return e.type === 'move' || e.type === 'turn' || e.type === 'crash' ? speed() : Math.round(speed() * 0.35); }

  function runProgram() {
    if (st.running) return;
    stopStepping();
    if (!RK.countProgram(st.prog)) { Core.play('wrong'); setBob('thinking', S.empty); return; }
    var res = RK.run(st.lvl, st.prog);
    resetRobot();
    st.running = true; st.sel = null; renderProgram(); updateControls();
    setBob('default', null);
    var i = 0;
    (function next() {
      if (!st || !st.running) return;
      if (i >= res.events.length) { later(function () { finishRun(res); }, 150); return; }
      var e = res.events[i++];
      applyEvent(e);
      later(next, eventDelay(e));
    })();
  }
  function stopRun(byUser) {
    clearTimers();
    if (!st || !el.root) return;
    st.running = false;
    highlight(null);
    if (byUser) resetRobot();
    updateControls();
  }
  function stopStepping() { if (st && st.stepping) { st.stepping = null; highlight(null); } }
  function stepOnce() {
    if (!st || st.running) return;
    if (!RK.countProgram(st.prog)) { Core.play('wrong'); setBob('thinking', S.empty); return; }
    if (!st.stepping) { st.stepping = { res: RK.run(st.lvl, st.prog), i: 0 }; resetRobot(); st.sel = null; renderProgram(); }
    var sp = st.stepping, res = sp.res;
    while (sp.i < res.events.length) {
      var e = res.events[sp.i++];
      applyEvent(e);
      if (e.type === 'move' || e.type === 'turn' || e.type === 'crash') break;
    }
    if (sp.i >= res.events.length) { st.stepping = null; later(function () { finishRun(res); }, speed()); }
  }

  function finishRun(res) {
    if (!st) return;
    st.running = false; updateControls(); highlight(null);
    var lvl = st.lvl;
    if (res.result === 'goal') {
      el.robot.classList.add('win');
      Core.play('win');
      var s = RK.stars(lvl, res), n = st.helped ? 1 : s.n;
      if (!lvl.custom) {
        var ls = lvState(lvl.id), wasSolved = ls.solved, before = ls.stars || 0;
        ls.solved = true; ls.stars = Math.max(ls.stars || 0, n); Core.save();
        st.badgeNode = Core.roundDone(ID, lvl.id, wasSolved ? before : null, ls.stars);
      }
      setBob('cheering', S.goal, 0);
      later(function () { showResult(res, s, n); }, 700);
      return;
    }
    st.fails++;
    var msg = res.result === 'crash' ? Core.pick(S.crash) : res.result === 'limit' ? S.limit : S.end;
    if (res.result === 'crash') el.robot.classList.add('crash');
    Core.play('wrong');
    if (st.fails >= 3 && lvl.solution && !st.helped) {
      var box = h('span', {}, [msg + ' ', h('button', { type: 'button', class: 'rk-help-btn', onclick: showSolution }, S.showSolution)]);
      setBob('encouraging', box, 0);
    } else setBob(res.result === 'crash' ? 'surprised' : 'encouraging', msg, 6000);
  }

  function showSolution() {
    var sol = st.lvl.solution;
    st.prog = { main: RK.clone(sol.main), f: RK.clone(sol.f) };
    st.helped = true; st.cursor = { path: 'main', index: st.prog.main.length }; st.sel = null;
    changed();
    setBob('happy', S.solutionShown, 6000);
  }

  function showResult(res, s, n) {
    var lvl = st.lvl, all = levels(), idx = all.indexOf(lvl), next = lvl.custom ? null : all[idx + 1];
    function line(ok, text) { return h('li', { class: ok ? 'ok' : 'miss' }, [h('span', { html: Core.starIcons(ok ? 1 : 0, 1, 'small') }), text]); }
    var items = [line(true, S.starGoal)];
    if (lvl.batteries.length) items.push(line(s.batteries, t(s.batteries ? S.starBatteries : S.starBatteriesMiss, { n: res.collected, max: res.total })));
    if (lvl.target) items.push(line(s.short, t(s.short ? S.starShort : S.starShortMiss, { n: res.blocks, max: lvl.target })));
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: n >= 2 ? 'cheering' : 'happy', outfit: 'tools', size: 150 }) }),
      h('h2', {}, S.resultTitle[n]),
      starBox,
      h('ul', { class: 'rk-starlist' }, items),
      st.helped ? h('p', { class: 'muted' }, S.helped) : null,
      st.badgeNode || null,
      h('div', { class: 'row center' }, [
        h('button', { type: 'button', class: 'btn ghost', onclick: function () { if (st.opts.fromEditor) showEditor(); else showMap(); } }, st.opts.fromEditor ? S.backToEditor : S.toMap),
        h('button', { type: 'button', class: 'btn secondary', onclick: function () { o.remove(); resetRobot(); } }, S.tryAgain),
        next ? h('button', { type: 'button', class: 'btn primary', onclick: function () { startLevel(next); } }, S.nextLevel) : null
      ])
    ]));
    app.appendChild(o);
    var starEls = starBox.querySelectorAll('.star');
    for (var i = 0; i < n; i++) (function (i) { later(function () { starEls[i].classList.remove('off'); starEls[i].classList.add('on', 'pop'); Core.play('star'); }, 350 + i * 350); })(i);
    var btn = o.querySelector('.btn.primary') || o.querySelector('.btn.secondary'); btn && btn.focus();
  }

  /* ================= LEVEL BUILDER ================= */
  var EROWS = 7, ECOLS = 8;
  function defaultCustom() {
    var m = [];
    for (var r = 0; r < EROWS; r++) { var row = ''; for (var c = 0; c < ECOLS; c++) row += (r === 0 || c === 0 || r === EROWS - 1 || c === ECOLS - 1) ? '#' : '.'; m.push(row); }
    m[3] = m[3].slice(0, 1) + 'E' + m[3].slice(2, 6) + 'G' + m[3].slice(7);
    return { map: m, palette: ['frem', 'venstre', 'hojre', 'gentag'], title: '' };
  }
  function showEditor() {
    stopRun(); clearTimers(); root.removeEventListener('resize', layout);
    Core.visit(ID + ':sandbox');
    st = null; el = {};
    var d = data();
    if (!d.custom) d.custom = defaultCustom();
    var cu = d.custom, tool = 'wall';
    var grid = cu.map.map(function (r) { return r.split(''); });
    var msg = h('p', { class: 'error', role: 'alert' });
    var board = h('div', { class: 'rk-board editor', style: 'grid-template-columns: repeat(' + ECOLS + ', var(--tile))' });
    function save() { cu.map = grid.map(function (r) { return r.join(''); }); Core.saveSoon(); }
    function draw() {
      board.innerHTML = '';
      grid.forEach(function (row, r) {
        row.forEach(function (ch, c) {
          var tile = h('button', { type: 'button', class: 'rk-tile ' + (ch === '#' ? 'wall' : 'floor') + ((r + c) % 2 ? ' alt' : ''), 'aria-label': 'Felt ' + (r + 1) + ',' + (c + 1), html: ch === '#' ? ART.wall : '',
            onclick: function () { paint(r, c); } });
          if (ch === 'B') tile.appendChild(h('div', { class: 'rk-item battery', html: ART.battery }));
          if (ch === 'G') tile.appendChild(h('div', { class: 'rk-item goal', html: ART.goal }));
          if ('NESW'.indexOf(ch) >= 0) tile.appendChild(h('div', { class: 'rk-item robot', html: ART.robot + '<div class="rk-dir" style="transform:rotate(' + 'NESW'.indexOf(ch) * 90 + 'deg)"><svg viewBox="0 0 40 40"><path d="M20 1l7 8H13z" fill="#2F7DB3" stroke="#fff" stroke-width="1.5"/></svg></div>' }));
          board.appendChild(tile);
        });
      });
    }
    function paint(r, c) {
      var ch = grid[r][c];
      if (tool === 'robot') {
        if ('NESW'.indexOf(ch) >= 0) grid[r][c] = 'NESW'['NESW'.indexOf(ch) + 1] || 'N';
        else { clearChar(/[NESW]/); grid[r][c] = 'E'; }
      } else if (tool === 'goal') { clearChar(/G/); grid[r][c] = 'G'; }
      else grid[r][c] = tool === 'wall' ? '#' : tool === 'battery' ? 'B' : '.';
      Core.play('click'); save(); draw();
    }
    function clearChar(re) { grid.forEach(function (row) { row.forEach(function (ch, c) { if (re.test(ch)) row[c] = '.'; }); }); }
    function current() {
      var map = grid.map(function (r) { return r.join(''); }), txt = map.join('');
      if ((txt.match(/[NESW]/g) || []).length !== 1 || (txt.match(/G/g) || []).length !== 1) { msg.textContent = S.needRobotGoal; return null; }
      msg.textContent = '';
      return { map: map, palette: cu.palette, title: cu.title };
    }
    var toolNames = ['floor', 'wall', 'battery', 'goal', 'robot'];
    var tools = h('div', { class: 'segmented rk-tools-seg', role: 'radiogroup', 'aria-label': S.editorTitle }, toolNames.map(function (tn) {
      var b = h('button', { type: 'button', class: 'seg' + (tn === tool ? ' sel' : ''), role: 'radio', 'aria-checked': tn === tool ? 'true' : 'false', onclick: function () {
        tool = tn; [].forEach.call(tools.children, function (x) { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); }); b.classList.add('sel'); b.setAttribute('aria-checked', 'true');
      } }, S.tools[tn]);
      return b;
    }));
    var opts = ['gentag', 'indtil', 'hvis', 'kald'].map(function (p) {
      return h('label', { class: 'switch' }, [h('input', { type: 'checkbox', checked: cu.palette.indexOf(p) >= 0, onchange: function (e) {
        var base = ['frem', 'venstre', 'hojre'], set = cu.palette.filter(function (x) { return x !== p; });
        if (e.target.checked) set.push(p);
        cu.palette = base.concat(['gentag', 'indtil', 'hvis', 'kald'].filter(function (x) { return set.indexOf(x) >= 0; }));
        save();
      } }), h('span', { class: 'track', 'aria-hidden': 'true' }), S.blocks[p]]);
    });
    var nameInput = h('input', { type: 'text', maxlength: '40', placeholder: S.levelNamePh, value: cu.title || '', 'aria-label': S.levelName, oninput: function (e) { cu.title = e.target.value; save(); } });
    var shareOut = h('div', { class: 'rk-share', hidden: true });
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen rk-editor' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, [h('span', { class: 'ico', html: I.back }), SC.back]), h('h1', {}, S.editorTitle)]),
      h('p', {}, S.editorHelp),
      tools,
      h('div', { class: 'rk-editor-board' }, board),
      msg,
      h('label', { class: 'label' }, S.levelName), nameInput,
      h('p', { class: 'label' }, S.allowBlocks), h('div', { class: 'rs-switches rk-opts' }, opts),
      h('div', { class: 'row' }, [
        h('button', { type: 'button', class: 'btn primary', onclick: function () { var c = current(); if (c) playCustom(c, true); } }, S.testLevel),
        h('button', { type: 'button', class: 'btn secondary', onclick: function () {
          var c = current(); if (!c) return;
          var code = RK.encodeLevel(c);
          var ta = h('textarea', { class: 'code', readonly: true, rows: '3' }, code);
          var cp = h('button', { type: 'button', class: 'btn secondary', onclick: function () {
            function ok() { cp.textContent = S.copied; setTimeout(function () { cp.textContent = S.copy; }, 2000); }
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, function () { ta.select(); document.execCommand('copy'); ok(); });
            else { ta.select(); document.execCommand('copy'); ok(); }
          } }, S.copy);
          shareOut.innerHTML = ''; shareOut.hidden = false;
          [h('p', {}, S.shareHelp), ta, cp].forEach(function (x) { shareOut.appendChild(x); });
        } }, S.shareLevel)
      ]),
      shareOut
    ]));
    var bw = Math.min(app.clientWidth - 32, 640);
    board.style.setProperty('--tile', Math.floor(Math.min(64, bw / ECOLS)) + 'px');
    draw();
  }
  function playCustom(c, fromEditor) {
    var lvl = RK.buildLevel({ id: 'egen', map: c.map, palette: c.palette, custom: true, title: c.title || S.ownLevel });
    startLevel(lvl, { fromEditor: !!fromEditor });
  }
  function showShared() {
    stopRun(); clearTimers(); st = null; el = {};
    var ta = h('textarea', { class: 'code', rows: '4', placeholder: S.pasteCode, 'aria-label': S.pasteCode });
    var msg = h('p', { class: 'error', role: 'alert' });
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, [h('span', { class: 'ico', html: I.back }), SC.back]), h('h1', {}, S.playShared)]),
      h('section', { class: 'card' }, [ta, msg, h('button', { type: 'button', class: 'btn primary', onclick: function () {
        var c = RK.decodeLevel(ta.value);
        if (!c) { msg.textContent = S.badCode; return; }
        playCustom(c, false);
      } }, S.play)])
    ]));
    ta.focus();
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask,
    _state: function () { return st; }, _start: function (id) { var l = levels().filter(function (x) { return x.id === id; })[0]; startLevel(l); } }); // _state/_start: automated tests only
})(window);
