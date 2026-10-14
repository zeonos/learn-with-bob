/*
 * Labyrinten – Bob udforsker et hulesystem. Hver hule har sin egen slags labyrint: find vejen, nøgler og døre,
 * envejsgader, korteste vej, glatis, kasser at skubbe og lys og spejle. Alle labyrinter laves i mazes.js, og en
 * søgning beviser, at de kan klares, og finder det mindste antal skridt.
 * Hjælp: »Vis et skridt« efter lidt tid (højst 2 stjerner); efter tre forsøg »Vis løsningen« skridt for skridt (1 stjerne).
 */
(function (root) {
  'use strict';
  var Core = root.Core, Bob = root.Bob, S = root.STR.lb, SC = root.STR.core, LAB = root.MAZE;
  var h = Core.h, t = Core.t;
  var ID = 'labyrinten', OUTFIT = 'caver', STEP_AFTER = 15000;
  var app = null, st = null, el = {}, clock = 0, timers = [], keyHandler = null;

  /* ---------- caves and levels ---------- */
  var ROUTES = [
    { id: 'm-vej', b: 'M', kind: 'maze', levels: [{ cw: 4, ch: 4, count: 2 }, { cw: 5, ch: 5, count: 2 }, { cw: 6, ch: 6, count: 1 }, { cw: 7, ch: 7, count: 1 }] },
    { id: 'm-noegler', b: 'M', kind: 'keys', levels: [{ cw: 4, ch: 4, keys: 1, count: 1 }, { cw: 5, ch: 5, keys: 2, count: 1 }, { cw: 6, ch: 6, keys: 3, count: 1 }] },
    { id: 'm-envej', b: 'M', kind: 'oneway', levels: [{ cw: 4, ch: 4, arrows: 3, count: 1 }, { cw: 5, ch: 5, arrows: 5, count: 1 }, { cw: 6, ch: 6, arrows: 7, count: 1 }] },
    { id: 'm-kort', b: 'M', kind: 'route', levels: [{ kinds: ['steps'], count: 5 }, { kinds: ['steps', 'pick'], count: 5 }, { kinds: ['pick', 'pickMud', 'steps'], count: 6 }] },
    { id: 'u-kort', b: 'U', kind: 'route', levels: [{ kinds: ['stepsMud', 'pickMud'], count: 5 }, { kinds: ['pickMud', 'stepsMud', 'count'], count: 6 }, { kinds: ['count', 'stepsMud', 'pickMud'], count: 6 }] },
    { id: 'u-is', b: 'U', kind: 'ice', levels: [{ w: 7, h: 7, lo: 3, hi: 5, count: 1 }, { w: 8, h: 8, lo: 5, hi: 7, count: 1 }, { w: 9, h: 9, lo: 7, hi: 10, count: 1 }] },
    { id: 'u-kasser', b: 'U', kind: 'crates', levels: [{ w: 5, h: 5, n: 1, lo: 8, hi: 30, count: 1 }, { w: 6, h: 6, n: 2, lo: 12, hi: 45, count: 1 }, { w: 6, h: 6, n: 3, lo: 15, hi: 60, count: 1 }] },
    { id: 'u-spejle', b: 'U', kind: 'mirrors', levels: [{ size: 6, m: 4, used: 2, count: 1 }, { size: 7, m: 6, used: 3, count: 1 }, { size: 8, m: 7, used: 4, count: 1 }] }
  ];
  function route(id) { return ROUTES.filter(function (r) { return r.id === id; })[0]; }
  function nameOf(r) { return S.routes[r.id][0]; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }

  function makeOne(kind, cfg, R) {
    R = R || Math.random;
    switch (kind) {
      case 'maze': return LAB.makeMaze(cfg.cw, cfg.ch, R);
      case 'keys': return LAB.makeKeys(cfg.cw, cfg.ch, cfg.keys, R);
      case 'oneway': return LAB.makeOneWay(cfg.cw, cfg.ch, cfg.arrows, R);
      case 'ice': return LAB.makeIce(cfg.w, cfg.h, cfg.lo, cfg.hi, R);
      case 'crates': return LAB.makeCrates(cfg.w, cfg.h, cfg.n, cfg.lo, cfg.hi, R);
      case 'mirrors': return LAB.makeMirrors(cfg.size, cfg.m, cfg.used, R);
    }
  }
  function makeRound(r, lvl, R) {
    var cfg = r.levels[lvl - 1], out = [];
    R = R || Math.random;
    for (var k = 0; k < cfg.count; k++) {
      if (r.kind === 'route') out.push({ kind: 'route', q: LAB.makeRouteQ(cfg.kinds[k % cfg.kinds.length], R) });
      else out.push({ kind: r.kind, lv: makeOne(r.kind, cfg, R) });
    }
    if (r.kind === 'route') out = out.sort(function () { return R() - 0.5; });
    return out;
  }
  function best(item) { if (item.kind === 'mirrors') return item.lv.best; if (item.best === undefined) item.best = LAB.solve(item.lv).n; return item.best; }
  function allow(item) { var b = best(item); return item.kind === 'ice' || item.kind === 'mirrors' ? b + 2 : item.kind === 'crates' ? b + Math.max(4, Math.ceil(b * 0.25)) : b + Math.ceil(b * 0.2) + 2; }

  /* ---------- data and hub API ---------- */
  function data() { var d = Core.gameData(ID); d.routes = d.routes || {}; d.lv = d.lv || {}; if (!d.band) d.band = (Core.profile() || {}).band || 'M'; return d; }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, plays: 0 }); }
  function levelOf(r, d) { d = d || data(); var l = Number((d.lv || {})[r.id]) || 1; return Math.max(1, Math.min(r.levels.length, l)); }
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = ROUTES.filter(function (r) { return r.b === band; });
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    ROUTES.forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([nameOf(r) + ' (' + r.b + ')', rs.stars + '/3', levelOf(r, d) + '/' + r.levels.length]); });
    return { head: S.reportHead, rows: rows };
  }
  function progress(d) { return Core.routeProgress(d, ROUTES); }
  function quickTask(band, d) {
    if (Math.random() < 0.5) {
      var e = LAB.makeExits(Math.random);
      return { q: S.qExits, html: '<div style="text-align:center">' + LAB.exitsSvg(e, 240) + '</div>', options: ['A', 'B', 'C'], answer: 'ABC'[e.answer], hint: S.qExitsHint, explain: t(S.qExitsExplain, { l: 'ABC'[e.answer] }) };
    }
    var q = LAB.makeRouteQ(band === 'M' ? pick(['steps', 'pick']) : pick(['stepsMud', 'pickMud', 'count']), Math.random);
    return { q: q.q, html: '<div style="text-align:center">' + LAB.routeSvg(q, 280) + '</div>', options: q.options.map(String), answer: String(q.options[q.answer]), hint: q.hint, explain: q.explain };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearAll(); clearInterval(clock); dropKeys(); Core.stopSpeaking(); st = null; el = {}; Core.save(); }
  function dropKeys() { if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; } }

  /* ================= MAP: the caves ================= */
  function showMap() {
    clearAll(); dropKeys(); Core.stopSpeaking(); st = null; el = {};
    var d = data(), list = ROUTES.filter(function (r) { return r.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen lb-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back)]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds lb-caves' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world lb-route' + (rs.stars ? ' lit' : '') + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('span', { class: 'lb-lamp', 'aria-hidden': 'true' }),
          h('strong', {}, nameOf(r)), h('span', { class: 'rs-world-desc' }, S.routes[r.id][1]),
          h('span', { class: 'lb-level' }, t(S.level, { n: levelOf(r, d), max: r.levels.length })),
          h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      })),
      h('div', { class: 'row center lb-extra' }, [h('button', { type: 'button', class: 'btn', onclick: function () { Core.play('click'); showSandbox(); } }, S.sandbox)])
    ]));
  }

  /* ================= PLAY ================= */
  function startRound(r) {
    var lvl = levelOf(r);
    st = { route: r.id, level: lvl, items: makeRound(r, lvl), i: 0, results: [], first: 0 };
    showItem();
  }
  function startCustom(lv) { st = { route: null, level: 0, items: [{ kind: 'build', lv: lv }], i: 0, results: [], first: 0 }; showItem(); }
  function item() { return st.items[st.i]; }
  function shell(title) {
    clearAll(); dropKeys(); Core.stopSpeaking();
    app.innerHTML = ''; el = {};
    var r = st.route ? route(st.route) : null;
    el.step = h('span', { class: 'rs-wave' }, st.items.length > 1 ? t(item().kind === 'route' ? S.qstep : S.step, { n: st.i + 1, total: st.items.length }) : r ? t(S.level, { n: st.level, max: r.levels.length }) : '');
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, title), el.step]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        onclick: function () { Core.speak(el.readText || ''); } }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.bob = h('div', { class: 'lb-bobface' }); el.say = h('p', { class: 'lb-say', role: 'status', 'aria-live': 'polite' });
    el.board = h('div', { class: 'lb-board' }); el.tools = h('div', { class: 'lb-tools' }); el.explain = h('div', { class: 'lb-explain', 'aria-live': 'polite' });
    el.intro = h('p', { class: 'lb-intro' });
    app.appendChild(h('main', { class: 'lb-play' }, [hud, h('div', { class: 'lb-inner' }, [h('div', { class: 'lb-bobline' }, [el.bob, el.say]), el.intro, el.board, el.tools, el.explain])]));
  }
  function setBob(expr, text) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 120, crop: 'head' });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text !== undefined && text !== null) el.say.textContent = text;
  }
  function showItem() {
    var it = item();
    if (it.kind === 'route') return showQuestion();
    var r = st.route ? route(st.route) : null;
    shell(r ? nameOf(r) : S.sbFriend);
    el.intro.textContent = S.intro[it.kind];
    el.readText = S.intro[it.kind];
    st.cur = { s: it.kind === 'mirrors' ? it.lv.start.slice() : LAB.start(it.lv), hist: [], moves: 0, tries: 0, helped: false, shown: false, solved: false, stuckSeen: false, t0: Date.now() };
    setBob('hello', st.i === 0 ? pick(S.bobStart) : null);
    if (it.kind === 'mirrors') mirrorView(); else gridView();
    drawTools();
    later(drawTools, STEP_AFTER + 50);
  }

  /* ---------- the grid: walls, keys, doors, arrows, ice, crates ---------- */
  function gridView() {
    var it = item(), lv = it.lv, c = st.cur;
    var grid = h('div', { class: 'lb-grid k-' + it.kind, style: '--w:' + lv.w + ';--h:' + lv.h, role: 'grid', 'aria-label': S.intro[it.kind] });
    var seen = {};
    for (var y = 0; y < lv.h; y++) for (var x = 0; x < lv.w; x++) {
      var ch = lv.rows[y][x], cls = 'lb-t ' + (ch === '#' ? 'wall' : 'floor');
      if (ch === 'G') cls += ' goal';
      if (/[abc]/.test(ch)) cls += ' key key-' + ch;
      if (/[ABC]/.test(ch)) cls += ' door door-' + ch.toLowerCase();
      if (LAB.ARROW[ch]) cls += ' arrow arrow-' + LAB.ARROW[ch];
      if (ch === 'x') cls += ' mark';
      grid.appendChild(h('div', { class: cls, 'data-x': x, 'data-y': y }));
    }
    el.crates = [];
    (lv.crates || []).forEach(function () { var cr = h('div', { class: 'lb-crate', 'aria-hidden': 'true' }); el.crates.push(cr); grid.appendChild(cr); });
    el.token = h('div', { class: 'lb-token', html: Bob.svg({ expression: 'happy', outfit: OUTFIT, size: 60, crop: 'head' }), 'aria-hidden': 'true' });
    grid.appendChild(el.token);
    el.grid = grid;
    var fit = h('div', { class: 'lb-fit' }, grid);
    el.board.appendChild(fit);
    el.info = h('div', { class: 'lb-info' });
    var pad = h('div', { class: 'lb-dpad', role: 'group' }, ['up', 'left', 'down', 'right'].map(function (d) {
      return h('button', { type: 'button', class: 'lb-dbtn d-' + d, 'aria-label': S.dpad[d], title: S.dpad[d], onclick: function () { go(d); } }, h('span', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><path d="M12 5l7 9H5z" fill="currentColor"/></svg>' }));
    }));
    el.board.appendChild(h('div', { class: 'lb-under' }, [el.info, pad]));
    // tap a square in Bob's row or column
    grid.addEventListener('click', function (e) {
      var tl = e.target.closest('.lb-t'); if (!tl) return;
      var x = +tl.getAttribute('data-x'), y = +tl.getAttribute('data-y'), s = st.cur.s;
      if (x === s.x && y === s.y) return;
      if (x !== s.x && y !== s.y) return;
      var d = x > s.x ? 'right' : x < s.x ? 'left' : y > s.y ? 'down' : 'up';
      if (it.kind === 'ice' || it.kind === 'crates') { go(d); return; }
      var n = Math.abs(x - s.x) + Math.abs(y - s.y);
      for (var k = 0; k < n; k++) if (!go(d, k > 0)) break;
    });
    // swipe
    var p0 = null;
    grid.addEventListener('pointerdown', function (e) { p0 = [e.clientX, e.clientY]; });
    grid.addEventListener('pointerup', function (e) {
      if (!p0) return; var dx = e.clientX - p0[0], dy = e.clientY - p0[1]; p0 = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
      e.preventDefault();
      go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    keyHandler = function (e) {
      if (!st || !el.grid || !el.grid.isConnected || document.querySelector('.rs-overlay')) return;
      var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }, d = map[e.key];
      if (d) { e.preventDefault(); go(d); }
    };
    document.addEventListener('keydown', keyHandler);
    function size() {
      if (!fit.isConnected) { root.removeEventListener('resize', size); return; }
      var room = Math.min(fit.clientWidth || 340, 640), tall = Math.max(260, (root.innerHeight || 700) - 300);
      var ts = Math.floor(Math.min(room / lv.w, tall / lv.h, 46));
      grid.style.setProperty('--ts', Math.max(16, ts) + 'px');
    }
    root.addEventListener('resize', size); size(); setTimeout(size, 0);
    drawGrid(true);
  }
  function drawGrid(instant, cells) {
    var it = item(), lv = it.lv, s = st.cur.s;
    el.token.style.transition = instant ? 'none' : '';
    el.token.style.setProperty('--x', s.x); el.token.style.setProperty('--y', s.y);
    if (s.c) s.c.forEach(function (i, k) { var cr = el.crates[k]; cr.style.setProperty('--x', i % lv.w); cr.style.setProperty('--y', Math.floor(i / lv.w)); cr.classList.toggle('home', lv.rows[Math.floor(i / lv.w)][i % lv.w] === 'x'); cr.style.transition = instant ? 'none' : ''; });
    if (s.keys !== undefined) [].forEach.call(el.grid.querySelectorAll('.key'), function (k) { var ch = k.className.match(/key-([abc])/)[1]; k.classList.toggle('taken', s.keys.indexOf(ch) >= 0); });
    if (s.keys !== undefined) [].forEach.call(el.grid.querySelectorAll('.door'), function (k) { var ch = k.className.match(/door-([abc])/)[1]; k.classList.toggle('open', s.keys.indexOf(ch) >= 0); });
    if (it.kind !== 'ice' && it.kind !== 'crates') { var here = el.grid.querySelector('.lb-t[data-x="' + s.x + '"][data-y="' + s.y + '"]'); if (here) here.classList.add('seen'); }
    [].forEach.call(el.grid.querySelectorAll('.lb-t.tip'), function (x) { x.classList.remove('tip'); });
    (cells || []).forEach(function (p) { var q = el.grid.querySelector('.lb-t[data-x="' + p[0] + '"][data-y="' + p[1] + '"]'); if (q) q.classList.add('tip'); });
    el.info.textContent = t(it.kind === 'ice' ? S.slides : S.moves, { n: st.cur.moves });
  }
  function locked() { return !st || !st.cur || st.cur.solved || !!el.solving; }
  // one move; quiet = part of a longer tap (no bump sound)
  function go(d, quiet) {
    if (locked()) return false;
    var it = item(), lv = it.lv, c = st.cur;
    if (LAB.done(lv, c.s)) return false; // Bob is out already
    var m = LAB.move(lv, c.s, d);
    if (!m) {
      if (!quiet) {
        var nx = c.s.x + LAB.DIRS[d][0], ny = c.s.y + LAB.DIRS[d][1], tl = LAB.tile(lv, nx, ny);
        setBob('thinking', /[ABC]/.test(tl) ? S.locked : LAB.ARROW[tl] || LAB.ARROW[LAB.tile(lv, c.s.x, c.s.y)] ? S.oneWayNo : it.kind === 'crates' && tl !== '#' ? S.heavy : S.bump);
        Core.play('bump');
      }
      return false;
    }
    c.hist.push(JSON.stringify(c.s)); c.s = m.s; c.moves++;
    if (m.ev === 'key') { Core.play('battery'); setBob('happy', t(S.gotKeyMsg, { col: S.colors[LAB.tile(lv, m.s.x, m.s.y)] })); }
    else Core.play(m.ev === 'push' ? 'turn' : 'step');
    drawGrid(false);
    afterMove(m);
    return true;
  }
  function afterMove(m) {
    var it = item(), lv = it.lv, c = st.cur;
    if (LAB.done(lv, c.s)) { later(solved, it.kind === 'ice' ? 350 : 200); return; }
    if ((it.kind === 'oneway' || it.kind === 'ice' || (it.kind === 'crates' && m.ev === 'push') || it.kind === 'build')) {
      if (LAB.stuck(lv, c.s)) { if (!c.stuckSeen) { c.tries++; c.stuckSeen = true; } setBob('encouraging', it.kind === 'crates' ? S.stuckCrate : S.stuck); drawTools(); }
      else c.stuckSeen = false;
    }
  }
  function undo() {
    if (locked() || !st.cur.hist.length) return;
    st.cur.s = JSON.parse(st.cur.hist.pop()); st.cur.moves++; st.cur.stuckSeen = false;
    Core.play('click'); drawGrid(false);
  }
  function restart() {
    if (locked()) return;
    var it = item(), c = st.cur;
    if (c.moves) c.tries++;
    c.s = it.kind === 'mirrors' ? it.lv.start.slice() : LAB.start(it.lv); c.hist = []; c.moves = 0; c.stuckSeen = false;
    if (it.kind === 'mirrors') drawMirrors(); else { [].forEach.call(el.grid.querySelectorAll('.seen'), function (x) { x.classList.remove('seen'); }); drawGrid(true); }
    Core.play('click'); drawTools();
  }

  /* ---------- light and mirrors ---------- */
  function mirrorView() {
    var pz = item().lv;
    var grid = h('div', { class: 'lb-grid lb-mirrors', style: '--w:' + (pz.w + 1) + ';--h:' + pz.h });
    for (var y = 0; y < pz.h; y++) for (var x = -1; x < pz.w; x++) {
      if (x < 0) { grid.appendChild(h('div', { class: 'lb-t edge' + (y === pz.laser[1] ? ' laser' : '') })); continue; }
      var i = y * pz.w + x, mi = LAB.mirrorAt(pz, x, y), cls = 'lb-t floor';
      if (pz.walls.indexOf(i) >= 0) cls = 'lb-t wall';
      if (x === pz.crystal[0] && y === pz.crystal[1]) cls += ' crystal';
      if (mi >= 0) grid.appendChild((function (mi) { return h('button', { type: 'button', class: cls + ' mirror', 'data-m': mi, 'aria-label': t(S.turnMirror, { r: y + 1, c: x + 1 }), onclick: function () { tapMirror(mi); } }); })(mi));
      else grid.appendChild(h('div', { class: cls }));
    }
    el.beam = h('div', { class: 'lb-beam', 'aria-hidden': 'true' });
    grid.appendChild(el.beam);
    el.grid = grid;
    var fit = h('div', { class: 'lb-fit' }, grid);
    el.board.appendChild(fit);
    el.info = h('div', { class: 'lb-info' });
    el.board.appendChild(h('div', { class: 'lb-under' }, el.info));
    function size() { if (!fit.isConnected) { root.removeEventListener('resize', size); return; } var ts = Math.floor(Math.min((Math.min(fit.clientWidth || 340, 560)) / (pz.w + 1), 58)); grid.style.setProperty('--ts', Math.max(28, ts) + 'px'); drawMirrors(); }
    root.addEventListener('resize', size); size(); setTimeout(size, 0);
  }
  function tapMirror(i) {
    if (locked()) return;
    var c = st.cur; c.s[i] = c.s[i] === '/' ? '\\' : '/'; c.moves++;
    Core.play('turn'); drawMirrors();
    if (LAB.trace(item().lv, c.s).hit) later(solved, 450);
  }
  function drawMirrors(cells) {
    var pz = item().lv, c = st.cur, tr = LAB.trace(pz, c.s), ts = parseFloat(getComputedStyle(el.grid).getPropertyValue('--ts')) || 44;
    [].forEach.call(el.grid.querySelectorAll('.mirror'), function (b) {
      var i = +b.getAttribute('data-m');
      b.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><line x1="' + (c.s[i] === '/' ? 6 : 6) + '" y1="' + (c.s[i] === '/' ? 34 : 6) + '" x2="34" y2="' + (c.s[i] === '/' ? 6 : 34) + '" stroke="#CFE8F5" stroke-width="7" stroke-linecap="round"/><line x1="6" y1="' + (c.s[i] === '/' ? 34 : 6) + '" x2="34" y2="' + (c.s[i] === '/' ? 6 : 34) + '" stroke="#4A6C86" stroke-width="2.5" stroke-linecap="round"/></svg>';
      b.classList.toggle('tip', (cells || []).indexOf(i) >= 0);
    });
    var pts = [[-1, pz.laser[1]]].concat(tr.cells.map(function (q) { return [q[0], q[1]]; }));
    if (!tr.hit && tr.cells.length) { var last = tr.cells[tr.cells.length - 1], d = LAB.DIRS[last[2]]; var md = LAB.mirrorAt(pz, last[0], last[1]) >= 0 ? LAB.DIRS[LAB.REFLECT[c.s[LAB.mirrorAt(pz, last[0], last[1])]][last[2]]] : d; pts.push([last[0] + md[0] * 0.5, last[1] + md[1] * 0.5]); }
    var W = (pz.w + 1) * ts, H = pz.h * ts;
    el.beam.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '"><polyline points="' + pts.map(function (p) { return ((p[0] + 1.5) * ts) + ',' + ((p[1] + 0.5) * ts); }).join(' ') + '" fill="none" stroke="#FFE14D" stroke-width="' + Math.max(3, ts * 0.12) + '" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/></svg>';
    el.grid.querySelector('.crystal').classList.toggle('lit', tr.hit);
    el.info.textContent = t(S.turns, { n: c.moves });
  }

  /* ---------- help ---------- */
  function drawTools() {
    if (!el.tools || !st || !st.cur) return;
    var c = st.cur, it = item(), stepReady = Date.now() - c.t0 >= STEP_AFTER;
    el.tools.innerHTML = '';
    if (c.solved || el.solving) return;
    el.tools.appendChild(h('div', { class: 'lb-toolrow' }, [
      it.kind === 'mirrors' ? null : h('button', { type: 'button', class: 'btn', onclick: undo }, S.undo),
      h('button', { type: 'button', class: 'btn', onclick: restart }, S.restart),
      h('button', { type: 'button', class: 'btn', disabled: !stepReady, onclick: showOneStep }, S.showStep),
      h('button', { type: 'button', class: 'btn' + (c.tries >= 3 ? ' primary' : ''), disabled: c.tries < 3, onclick: startSolution }, S.showSolution)
    ]));
    el.tools.appendChild(h('p', { class: 'lb-note' }, [c.tries ? h('b', {}, t(S.triesLeft, { n: Math.min(3, c.tries) }) + ' · ') : null, c.tries < 3 ? S.solutionLocked + ' ' : '', S.helpNote]));
  }
  function showOneStep() {
    var it = item(), c = st.cur;
    if (locked()) return;
    c.helped = true;
    if (it.kind === 'mirrors') {
      var ms = LAB.mirrorSteps(it.lv, c.s)[0]; if (!ms) return;
      c.s[ms.mirror] = c.s[ms.mirror] === '/' ? '\\' : '/'; c.moves++;
      drawMirrors([ms.mirror]); explain(ms.text); Core.play('turn');
      if (LAB.trace(it.lv, c.s).hit) later(solved, 600);
      return;
    }
    var steps = LAB.explain(it.lv, c.s);
    if (!steps.length) { setBob('encouraging', it.kind === 'crates' ? S.stuckCrate : S.stuck); return; }
    var s1 = steps[0], x = c.s.x, y = c.s.y, cells = [];
    s1.dirs.forEach(function (d) { x += LAB.DIRS[d][0]; y += LAB.DIRS[d][1]; cells.push([x, y]); });
    explain(s1.text);
    playDirs(s1.dirs, function () { drawGrid(false, cells); });
  }
  function playDirs(dirs, after) {
    var k = 0;
    (function nextMove() {
      if (el.skipAnim) return;
      if (!st || !st.cur || k >= dirs.length) { if (after) after(); return; }
      var m = LAB.move(item().lv, st.cur.s, dirs[k++]);
      if (!m) { if (after) after(); return; }
      st.cur.hist.push(JSON.stringify(st.cur.s)); st.cur.s = m.s; st.cur.moves++;
      Core.play(m.ev === 'push' ? 'turn' : 'step'); drawGrid(false);
      if (LAB.done(item().lv, st.cur.s)) { if (after) after(); if (!el.solving) later(solved, 350); return; }
      later(nextMove, item().kind === 'ice' ? 320 : 140);
    })();
  }
  function explain(text, head) { el.explain.innerHTML = ''; if (text) el.explain.appendChild(h('div', { class: 'oj-rule' }, [head ? h('p', { class: 'lb-stephead' }, head) : null, h('p', {}, text)])); }
  function startSolution() {
    var it = item(), c = st.cur;
    if (c.tries < 3 || c.solved) return;
    c.shown = true; el.skipAnim = false; el.playing = false;
    c.s = it.kind === 'mirrors' ? it.lv.start.slice() : LAB.start(it.lv); c.hist = []; c.moves = 0;
    if (it.kind === 'mirrors') { drawMirrors(); el.solving = { steps: LAB.mirrorSteps(it.lv, c.s), i: 0 }; }
    else { [].forEach.call(el.grid.querySelectorAll('.seen'), function (x) { x.classList.remove('seen'); }); drawGrid(true); el.solving = { steps: LAB.explain(it.lv, c.s), i: 0 }; }
    setBob('thinking', S.solutionIntro); explain(null);
    drawSolveTools();
  }
  function drawSolveTools() {
    el.tools.innerHTML = '';
    var s = el.solving; if (!s) return;
    el.tools.appendChild(h('div', { class: 'lb-toolrow' }, [
      h('button', { type: 'button', class: 'btn primary', disabled: !!el.playing, onclick: function () { nextSolveStep(); } }, S.nextStep),
      s.i < s.steps.length ? h('button', { type: 'button', class: 'btn', onclick: showRest }, S.showRest) : null
    ]));
    var b = el.tools.querySelector('.btn:not([disabled])'); if (b) b.focus();
  }
  function nextSolveStep() {
    var s = el.solving; if (!s || el.playing) return;
    var step = s.steps[s.i++], it = item(), c = st.cur, lastOne = s.i >= s.steps.length;
    if (!step) return;
    explain(step.text, t(S.solveStep, { n: s.i, total: s.steps.length }));
    if (it.kind === 'mirrors') { c.s[step.mirror] = c.s[step.mirror] === '/' ? '\\' : '/'; drawMirrors([step.mirror]); Core.play('turn'); if (lastOne) { el.solving = null; later(solved, 900); } else drawSolveTools(); return; }
    el.playing = true; drawSolveTools();
    playDirs(step.dirs, function () { el.playing = false; if (!el.solving) return; if (lastOne) { el.solving = null; later(solved, 500); } else drawSolveTools(); });
  }
  // »Vis resten«: the whole road at once, from the start
  function showRest() {
    var s = el.solving, it = item(), c = st.cur; if (!s) return;
    el.skipAnim = true; el.playing = false;
    if (it.kind === 'mirrors') { c.s = it.lv.start.slice(); s.steps.forEach(function (x) { c.s[x.mirror] = c.s[x.mirror] === '/' ? '\\' : '/'; }); drawMirrors(); }
    else { c.s = MAZE_START(it.lv); s.steps.forEach(function (x) { x.dirs.forEach(function (d) { var m = LAB.move(it.lv, c.s, d); if (m) c.s = m.s; }); }); drawGrid(false); }
    var last = s.steps[s.steps.length - 1];
    if (last) explain(last.text, t(S.solveStep, { n: s.steps.length, total: s.steps.length }));
    el.solving = null; el.tools.innerHTML = '';
    later(function () { el.skipAnim = false; solved(); }, 400);
  }
  function MAZE_START(lv) { return LAB.start(lv); }

  /* ---------- one maze done ---------- */
  function solved() {
    var c = st && st.cur, it = st && item();
    if (!c || c.solved) return;
    c.solved = true;
    c.stars = c.shown ? 1 : c.helped || c.moves > allow(it) ? 2 : 3;
    if (!c.shown && c.tries >= 3) Core.visit('staedig');
    st.results.push(c.stars);
    Core.play('win');
    el.tools.innerHTML = '';
    var b = best(it), last = st.i >= st.items.length - 1;
    setBob(c.stars >= 2 ? 'cheering' : 'happy', c.shown ? S.solutionDone : pick(it.kind === 'crates' ? S.solvedCrates : it.kind === 'mirrors' ? S.solvedMirrors : S.solved));
    el.explain.innerHTML = '';
    el.explain.appendChild(h('div', { class: 'oj-rule lb-solved' }, [
      h('div', { class: 'lb-solved-stars', html: Core.starIcons(c.stars, 3) }),
      h('p', {}, h('strong', {}, S.solvedStars[c.stars])),
      h('p', {}, t(it.kind === 'ice' ? S.bestSlides : it.kind === 'mirrors' ? S.bestTurns : S.bestMoves, { n: b })),
      h('button', { type: 'button', class: 'btn primary', onclick: last ? finish : nextItem }, S.continue)
    ]));
    el.explain.querySelector('.btn.primary').focus();
  }
  function nextItem() { st.i++; Core.play('step'); showItem(); window.scrollTo(0, 0); }

  /* ================= QUESTIONS: the shortest road ================= */
  function showQuestion() {
    var r = route(st.route), q = item().q;
    shell(nameOf(r));
    el.readText = q.q;
    st.cur = { attempt: 0, locked: false };
    el.intro.textContent = q.q;
    el.intro.classList.add('lb-q');
    el.board.appendChild(h('div', { class: 'lb-map-svg', html: LAB.routeSvg(q, 440) }));
    var opts = h('div', { class: 'oj-options lb-opts' });
    q.options.forEach(function (o, i) { var b = h('button', { type: 'button', class: 'oj-opt', 'data-i': i, onclick: function () { answer(i, b); } }, String(o)); opts.appendChild(b); });
    el.board.appendChild(opts);
    setBob('hello', st.i === 0 ? pick(S.bobStart) : null);
  }
  function answer(i, node) {
    var q = item().q, c = st.cur;
    if (c.locked) return;
    if (i === q.answer) {
      c.locked = true; st.results.push(c.attempt === 0 ? 1 : 0.5); if (c.attempt === 0) st.first++;
      node.classList.add('right'); Core.play('correct'); setBob(c.attempt ? 'encouraging' : 'happy', pick(c.attempt ? S.correctSecond : S.correct));
      reveal(true); return;
    }
    c.attempt++; Core.play('wrong');
    node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake', 'wrong'); node.disabled = true;
    if (c.attempt === 1) { setBob('thinking', S.tryAgain); explain(q.hint); return; }
    c.locked = true; st.results.push(0); setBob('encouraging', null); reveal(false);
  }
  function reveal(ok) {
    var q = item().q;
    [].forEach.call(el.board.querySelectorAll('.oj-opt'), function (b) { b.disabled = true; if (+b.getAttribute('data-i') === q.answer) b.classList.add('right'); });
    if (q.kind === 'steps' || q.kind === 'stepsMud') el.board.querySelector('.lb-map-svg').innerHTML = LAB.routeSvg(q, 440, { road: q.road });
    el.explain.innerHTML = '';
    var box = h('div', { class: 'oj-rule' + (ok ? '' : ' final') });
    if (!ok) box.appendChild(h('p', {}, h('strong', {}, t(S.answerWas, { a: q.options[q.answer] }))));
    box.appendChild(h('p', {}, q.explain));
    el.explain.appendChild(box);
    var last = st.i >= st.items.length - 1;
    var nb = h('button', { type: 'button', class: 'btn primary lb-next', onclick: last ? finish : nextItem }, S.continue);
    el.explain.appendChild(nb); nb.focus();
  }

  /* ---------- the round is over ---------- */
  function finish() {
    clearAll(); dropKeys();
    if (!st.route) { st = null; showMap(); return; }
    var r = route(st.route), d = data(), res = st.results, quiz = r.kind === 'route', stars;
    if (quiz) { var acc = res.reduce(function (a, b) { return a + b; }, 0) / (res.length || 1); stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0; }
    else stars = Math.round(res.reduce(function (a, b) { return a + b; }, 0) / (res.length || 1));
    var rs = routeState(r.id), before = rs.stars, newBest = stars > rs.stars;
    rs.stars = Math.max(rs.stars, stars); rs.plays++;
    var lvl = st.level, newLvl = stars === 3 ? Math.min(r.levels.length, lvl + 1) : stars <= 1 ? Math.max(1, lvl - 1) : lvl;
    d.lv[r.id] = newLvl;
    var first = st.first, total = res.length;
    st = null; Core.save();
    var badgeNode = Core.roundDone(ID, r.id, rs.plays > 1 ? before : null, rs.stars);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : 'happy', outfit: OUTFIT, size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      quiz ? h('p', {}, t(S.resultText, { correct: first, total: total })) : null,
      newLvl > lvl ? h('p', { class: 'lb-lvlmsg' }, S.levelUp) : newLvl < lvl ? h('p', { class: 'lb-lvlmsg' }, S.levelDown) : null,
      h('p', { class: 'muted' }, t(S.resultLevel, { n: newLvl, max: r.levels.length })),
      badgeNode,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: function () { startRound(r); } }, S.playAgain)])
    ]));
    app.appendChild(o);
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    o.querySelector('.btn.primary').focus();
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }

  /* ================= SANDBOX: build a maze ================= */
  var TOOLS = ['wall', 'floor', 'S', 'G', 'a', 'A', 'b', 'B'];
  var sb = { tool: 'wall', rows: null };
  function blankRows() { var N = 11, rows = []; for (var y = 0; y < N; y++) { var r = ''; for (var x = 0; x < N; x++) r += x === 0 || y === 0 || x === N - 1 || y === N - 1 ? '#' : '.'; rows.push(r); } rows[1] = '#S' + rows[1].slice(2); rows[N - 2] = rows[N - 2].slice(0, N - 2) + 'G#'; return rows; }
  function showSandbox() {
    clearAll(); dropKeys(); st = null;
    Core.visit(ID + ':sandbox');
    if (!sb.rows) sb.rows = blankRows();
    var N = sb.rows.length;
    app.innerHTML = '';
    var result = h('div', { class: 'lb-sb-result', 'aria-live': 'polite' });
    var pal = h('div', { class: 'lb-sb-tools', role: 'group' }, TOOLS.map(function (tl) {
      return h('button', { type: 'button', class: 'lb-sb-tool' + (sb.tool === tl ? ' sel' : ''), 'aria-pressed': sb.tool === tl ? 'true' : 'false', onclick: function () { sb.tool = tl; [].forEach.call(pal.children, function (b) { b.classList.remove('sel'); b.setAttribute('aria-pressed', 'false'); }); this.classList.add('sel'); this.setAttribute('aria-pressed', 'true'); } },
        [h('span', { class: 'lb-sb-swatch ' + swatch(tl), 'aria-hidden': 'true' }), S.sbTools[tl]]);
    }));
    var grid = h('div', { class: 'lb-grid lb-sb-grid', style: '--w:' + N + ';--h:' + N + ';--ts:min(34px, calc((100vw - 44px) / ' + N + '))' }), painting = false;
    function cls(ch) { return 'lb-t ' + (ch === '#' ? 'wall' : 'floor') + (ch === 'G' ? ' goal' : '') + (ch === 'S' ? ' startcell' : '') + (/[ab]/.test(ch) ? ' key key-' + ch : '') + (/[AB]/.test(ch) ? ' door door-' + ch.toLowerCase() : ''); }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) grid.appendChild(h('div', { class: cls(sb.rows[y][x]), 'data-x': x, 'data-y': y }));
    function put(el2) {
      if (!el2 || !el2.classList.contains('lb-t')) return;
      var x = +el2.getAttribute('data-x'), y = +el2.getAttribute('data-y');
      if (x === 0 || y === 0 || x === N - 1 || y === N - 1) return; // the outer wall stays
      var ch = sb.tool === 'wall' ? '#' : sb.tool === 'floor' ? '.' : sb.tool;
      if (ch === 'S' || ch === 'G' || /[abAB]/.test(ch)) sb.rows = sb.rows.map(function (r) { return r.replace(new RegExp(ch, 'g'), '.'); }); // only one of each
      sb.rows[y] = sb.rows[y].slice(0, x) + ch + sb.rows[y].slice(x + 1);
      [].forEach.call(grid.children, function (c2) { var cx = +c2.getAttribute('data-x'), cy = +c2.getAttribute('data-y'); c2.className = cls(sb.rows[cy][cx]); });
      result.innerHTML = '';
    }
    grid.addEventListener('pointerdown', function (e) { painting = true; e.preventDefault(); put(document.elementFromPoint(e.clientX, e.clientY)); try { grid.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ } });
    grid.addEventListener('pointermove', function (e) { if (painting && (sb.tool === 'wall' || sb.tool === 'floor')) put(document.elementFromPoint(e.clientX, e.clientY)); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { grid.addEventListener(ev, function () { painting = false; }); });
    var codeIn = h('input', { class: 'lb-sb-code', type: 'text', 'aria-label': S.sbLoadTitle, maxlength: '260', autocomplete: 'off', spellcheck: 'false' }), loadMsg = h('p', { class: 'muted', 'aria-live': 'polite' });
    app.appendChild(h('main', { class: 'screen lb-sandbox' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + S.toMap), h('h1', {}, S.sbTitle)]),
      h('p', { class: 'lead' }, S.sbIntro), pal, h('div', { class: 'lb-fit' }, grid),
      h('div', { class: 'row center' }, [
        h('button', { type: 'button', class: 'btn ghost', onclick: function () { sb.rows = blankRows(); showSandbox(); } }, S.sbClear),
        h('button', { type: 'button', class: 'btn primary', onclick: function () { testMaze(result); } }, S.sbTest)
      ]),
      result,
      h('section', { class: 'card lb-sb-load' }, [h('h2', {}, S.sbLoadTitle), h('div', { class: 'row' }, [codeIn, h('button', { type: 'button', class: 'btn', onclick: function () {
        var lv = LAB.fromCode(codeIn.value);
        if (!lv) { loadMsg.textContent = S.sbBadCode; Core.play('wrong'); return; }
        startCustom(lv);
      } }, S.sbLoad)]), loadMsg])
    ]));
  }
  function swatch(tl) { return tl === 'wall' ? 'wall' : tl === 'floor' ? 'floor' : tl === 'S' ? 'bob' : tl === 'G' ? 'goal' : /[ab]/.test(tl) ? 'key key-' + tl : 'door door-' + tl.toLowerCase(); }
  function testMaze(result) {
    result.innerHTML = '';
    var joined = sb.rows.join('');
    if (joined.indexOf('S') < 0 || joined.indexOf('G') < 0) { result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, S.sbNoStart))); return; }
    var lv = LAB.level('build', sb.rows.slice()), r = LAB.solve(lv);
    if (!r) { result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, S.sbBad))); Core.play('wrong'); return; }
    Core.play('correct');
    Core.visit('gaademager');
    var badge = Core.roundDone(ID, 'sandbox', null, 0), code = LAB.toCode(lv);
    var inp = h('input', { class: 'lb-sb-code', type: 'text', readonly: true, value: code, 'aria-label': S.sbCode }), copied = h('span', { class: 'muted' });
    result.appendChild(h('div', { class: 'oj-rule' }, [h('p', {}, h('strong', {}, t(S.sbGood, { n: r.n }))), h('p', {}, S.sbCode), h('div', { class: 'row' }, [inp,
      h('button', { type: 'button', class: 'btn', onclick: function () { inp.select(); try { navigator.clipboard.writeText(code).then(function () { copied.textContent = S.sbCopied; }, function () { document.execCommand('copy'); copied.textContent = S.sbCopied; }); } catch (e) { document.execCommand('copy'); copied.textContent = S.sbCopied; } } }, S.sbCopy), copied]),
      h('button', { type: 'button', class: 'btn primary', onclick: function () { startCustom(LAB.level('build', sb.rows.slice())); } }, S.sbPlay), badge]));
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport, progress: progress, quickTask: quickTask,
    _state: function () { return st; }, _routes: ROUTES, _makeRound: makeRound, _go: function (d) { return go(d); }, _allow: allow, _best: best, _el: function () { return el; } }); // test hooks
})(window);
