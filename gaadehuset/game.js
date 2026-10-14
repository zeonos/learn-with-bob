/*
 * Gådehuset – Bobs hus fuld af gåder: sudoku, malebilleder, hvem ejer hvad, over floden, Hanois tårn og sandt eller falsk.
 * Hver gåde kan løses uden at gætte. Hjælp: »Tjek« og »Få et tip« (højst 2 stjerner); efter tre forsøg kan barnet
 * se løsningen skridt for skridt (1 stjerne). En halvfærdig gåde gemmes. Niveauet følger barnet.
 * The puzzle kinds are in kinds.js, the solvers in sudoku.js, nonogram.js, logic.js, river.js, hanoi.js and truth.js.
 */
(function (root) {
  'use strict';
  var Core = root.Core, Bob = root.Bob, S = root.STR.gh, SC = root.STR.core, K = root.GH_KINDS, ART = root.GH_ART;
  var h = Core.h, t = Core.t;
  var ID = 'gaadehuset', OUTFIT = 'puzzler';
  var app = null, st = null, el = {}, clock = 0, timers = [];

  /* ---------- rooms and levels ---------- */
  var ROUTES = [
    { id: 'm-sudoku', b: 'M', kind: 'sudoku', levels: [{ n: 4, givens: 8, count: 2 }, { n: 4, givens: 6, count: 2 }, { n: 6, givens: 18, count: 1 }, { n: 6, givens: 14, count: 1 }] },
    { id: 'm-billeder', b: 'M', kind: 'nono', levels: [{ from: 5, to: 5, count: 2 }, { from: 6, to: 6, count: 2 }, { from: 7, to: 7, count: 1 }, { from: 8, to: 8, count: 1 }] },
    { id: 'm-hvem', b: 'M', kind: 'logic', levels: [{ level: 1, count: 1 }, { level: 2, count: 1 }, { level: 3, count: 1 }] },
    { id: 'm-flod', b: 'M', kind: 'river', levels: [{ puzzle: 'boern', count: 1 }, { puzzle: 'ulv', count: 1 }, { puzzle: 'familie', count: 1 }] },
    { id: 'm-hanoi', b: 'M', kind: 'hanoi', levels: [{ n: 3, count: 1 }, { n: 4, count: 1 }, { n: 5, count: 1 }] },
    { id: 'u-sudoku', b: 'U', kind: 'sudoku', levels: [{ n: 6, givens: 15, count: 1 }, { n: 9, givens: 36, count: 1 }, { n: 9, givens: 30, count: 1 }, { n: 9, givens: 26, count: 1 }] },
    { id: 'u-billeder', b: 'U', kind: 'nono', levels: [{ from: 9, to: 10, count: 1 }, { from: 11, to: 12, count: 1 }] },
    { id: 'u-hvem', b: 'U', kind: 'logic', levels: [{ level: 1, count: 1 }, { level: 2, count: 1 }, { level: 3, count: 1 }] },
    { id: 'u-flod', b: 'U', kind: 'river', levels: [{ puzzle: 'ulv-u', count: 1 }, { puzzle: 'tung', count: 1 }, { puzzle: 'faar', count: 1 }] },
    { id: 'u-sandt', b: 'U', kind: 'truth', levels: [{ level: 1, count: 3 }, { level: 2, count: 3 }, { level: 3, count: 3 }] }
  ];
  function route(id) { return ROUTES.filter(function (r) { return r.id === id; })[0]; }
  function nameOf(r) { return S.routes[r.id][0]; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.lv = d.lv || {}; d.saved = d.saved || {}; d.pics = d.pics || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, plays: 0 }); }
  function levelOf(r, d) { d = d || data(); var l = Number((d.lv || {})[r.id]) || 1; return Math.max(1, Math.min(r.levels.length, l)); }

  // the puzzles for one round
  function makeRound(r, lvl, R) {
    var cfg = r.levels[lvl - 1], out = [];
    R = R || Math.random;
    if (r.kind === 'nono') {
      var d = data(), pics = (root.GH_PICS || []).filter(function (p) { var m = Math.max(p.rows.length, p.rows[0].length); return p.b === r.b && m >= cfg.from && m <= cfg.to; });
      var fresh = pics.filter(function (p) { return !d.pics[p.id]; }), pool = (fresh.length >= cfg.count ? fresh : pics).slice();
      for (var i = 0; i < cfg.count && pool.length; i++) { var p = pool.splice(Math.floor(R() * pool.length), 1)[0]; out.push({ kind: 'nono', pz: K.nono.create({ pic: p.id }) }); }
      return out;
    }
    for (var k = 0; k < cfg.count; k++) {
      var spec = r.kind === 'logic' ? { band: r.b, level: cfg.level } : r.kind === 'truth' ? { level: cfg.level } : cfg;
      out.push({ kind: r.kind, pz: K[r.kind].create(spec, R) });
    }
    return out;
  }

  /* ---------- hub API ---------- */
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
  function collection(d) { return { n: Object.keys(d.pics || {}).filter(function (id) { return (root.GH_PICS || []).some(function (p) { return p.id === id; }); }).length, max: (root.GH_PICS || []).length }; }
  // Daily challenge: a sudoku square, a logic question, the fewest boat trips or Hanoi moves
  function quickTask(band, d) {
    var kinds = band === 'M' ? ['sudoku', 'logic', 'river', 'hanoi'] : ['sudoku', 'logic', 'river'], kind = pick(kinds);
    if (kind === 'sudoku') {
      var n = band === 'M' ? 4 : 6, m, empties = [];
      for (var g = 0; g < 50 && !empties.length; g++) {
        m = root.SUDOKU.make(n, n === 4 ? 7 : 16, Math.random);
        m.puzzle.forEach(function (v, i) { if (!v && root.SUDOKU.candidates(m.puzzle, n, i).length === 1) empties.push(i); });
      }
      var i = pick(empties), bh = root.SUDOKU.BOX[n][0], bw = root.SUDOKU.BOX[n][1], cells = '';
      m.puzzle.forEach(function (v, j) {
        var r = Math.floor(j / n), c = j % n, bd = 'border-right:' + ((c + 1) % bw === 0 && c < n - 1 ? '3px' : '1px') + ' solid #4A2C17;border-bottom:' + ((r + 1) % bh === 0 && r < n - 1 ? '3px' : '1px') + ' solid #4A2C17;';
        cells += '<span style="display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;' + bd + (j === i ? 'background:#FFE14D;' : '') + '">' + (v || '') + '</span>';
      });
      var html = '<div style="display:inline-grid;grid-template-columns:repeat(' + n + ',38px);grid-auto-rows:38px;border:3px solid #4A2C17;background:#fff;font-family:system-ui,sans-serif;color:#4A2C17">' + cells + '</div>';
      var opts = []; for (var v = 1; v <= n; v++) opts.push(String(v));
      return { q: S.qSudoku, html: html, options: opts, answer: String(m.solution[i]), hint: S.qSudokuHint, explain: t(S.qSudokuExplain, { v: m.solution[i] }) };
    }
    if (kind === 'logic') {
      var p = root.LOGIC.make(band, 1, Math.random), c = Math.floor(Math.random() * p.cats.length), w = Math.floor(Math.random() * p.n), owner = p.ans[c].indexOf(w), a = root.LOGIC.val(p, c, w);
      return { q: t(S.qLogic, { what: a[0] + ' ' + a[1] }), html: '<ol style="text-align:left;margin:0 auto;max-width:420px;font-size:17px;line-height:1.45">' + p.clues.map(function (cl) { return '<li>' + root.LOGIC.clueText(p, cl) + '</li>'; }).join('') + '</ol>',
        options: p.names.slice(), answer: p.names[owner], hint: S.qLogicHint, explain: root.LOGIC.answerText(p) };
    }
    if (kind === 'river') {
      var pz = pick(root.RIVER.PUZZLES.filter(function (x) { return x.b === band && !x.same; })), best = root.RIVER.best(pz);
      return { q: S.qRiver, html: '<p style="text-align:left;max-width:460px;margin:0 auto;font-size:17px;line-height:1.45">' + pz.story + '</p>', input: 'number', answer: String(best), unit: S.unitTrips,
        hint: S.qRiverHint, explain: t(S.rvBest, { n: best }) + ' ' + pz.solution.map(function (s) { return s[1]; }).join(' ') };
    }
    var nd = 3 + Math.floor(Math.random() * 3), seq = [];
    for (var k = 1; k <= nd; k++) seq.push(Math.pow(2, k) - 1);
    return { q: t(S.qHanoi, { n: nd }), input: 'number', answer: String(Math.pow(2, nd) - 1), unit: S.unitMoves, hint: S.qHanoiHint, explain: t(S.qHanoiExplain, { calc: seq.join(', ') }) };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearAll(); clearInterval(clock); Core.stopSpeaking(); saveRound(); st = null; el = {}; Core.save(); }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }

  /* ================= MAP ================= */
  function topbar() { return h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back)]); }
  function showMap() {
    clearAll(); Core.stopSpeaking(); saveRound(true); st = null; el = {};
    var d = data(), list = ROUTES.filter(function (r) { return r.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen gh-map' }, [
      topbar(),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id), saved = !!d.saved[r.id];
        return h('button', { type: 'button', class: 'rs-world gh-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, nameOf(r)), h('span', { class: 'rs-world-desc' }, S.routes[r.id][1]),
          h('span', { class: 'gh-level' }, t(S.level, { n: levelOf(r, d), max: r.levels.length })),
          saved ? h('span', { class: 'gh-saved' }, S.continueSaved) : null,
          h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      })),
      h('div', { class: 'row center gh-extra' }, [
        h('button', { type: 'button', class: 'btn', onclick: function () { Core.play('click'); showSandbox(); } }, S.sandbox),
        h('button', { type: 'button', class: 'btn', onclick: function () { Core.play('click'); showGallery(); } }, S.gallery)
      ])
    ]));
  }

  /* ================= GALLERY ================= */
  function showGallery() {
    var d = data(), pics = root.GH_PICS || [], done = pics.filter(function (p) { return d.pics[p.id]; });
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen gh-gallery' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + S.toMap), h('h1', {}, S.gallery)]),
      h('p', { class: 'lead' }, done.length ? S.ngGallery + ': ' + done.length + ' / ' + pics.length : S.ngGalleryNone),
      h('ul', { class: 'gh-gal' }, pics.map(function (p) {
        var on = !!d.pics[p.id];
        return h('li', { class: on ? '' : 'locked' }, [h('span', { class: 'gh-gal-art', html: on ? ART.picSvg(p, 72) : '<b aria-hidden="true">?</b>' }), h('small', {}, on ? p.name : '')]);
      }))
    ]));
  }

  /* ================= PLAY ================= */
  function saveRound(now) { if (st && st.route) { data().saved[st.route] = JSON.parse(JSON.stringify({ route: st.route, level: st.level, items: st.items, i: st.i, results: st.results, cur: st.cur })); if (now) Core.save(); else Core.saveSoon(); } }
  function freshCur(item) { return { work: K[item.kind].init(item.pz), tries: 0, helped: false, shown: false, solved: false }; }
  function startRound(r) {
    var d = data(), saved = d.saved[r.id];
    if (saved && saved.items && saved.items.length && saved.cur) st = saved;
    else {
      var lvl = levelOf(r), items = makeRound(r, lvl);
      st = { route: r.id, level: lvl, items: items, i: 0, results: [], cur: freshCur(items[0]) };
    }
    saveRound();
    showPuzzle();
  }
  function startCustom(item) { st = { route: null, level: 0, items: [item], i: 0, results: [], cur: freshCur(item) }; showPuzzle(); }
  function curItem() { return st.items[st.i]; }
  function kindOf() { return K[curItem().kind]; }

  function showPuzzle() {
    clearAll(); Core.stopSpeaking();
    var item = curItem(), kind = kindOf(), r = st.route ? route(st.route) : null;
    app.innerHTML = '';
    el = {};
    el.step = h('span', { class: 'rs-wave' }, st.items.length > 1 ? t(S.step, { n: st.i + 1, total: st.items.length }) : r ? t(S.level, { n: st.level, max: r.levels.length }) : '');
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, r ? nameOf(r) : S.sbFriend), el.step]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        onclick: function () { Core.speak((kind.readText ? kind.readText(item.pz) : kind.intro(item.pz))); } }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.bob = h('div', { class: 'gh-bob' }); el.say = h('p', { class: 'gh-say', role: 'status', 'aria-live': 'polite' });
    var bobline = h('div', { class: 'gh-bobline' }, [el.bob, el.say]);
    el.board = h('div', { class: 'gh-board k-' + item.kind });
    el.tools = h('div', { class: 'gh-tools' }); el.explain = h('div', { class: 'gh-explain', 'aria-live': 'polite' });
    var intro = item.kind === 'river' ? null : h('p', { class: 'gh-intro' }, kind.intro(item.pz));
    app.appendChild(h('main', { class: 'gh-play' }, [hud, h('div', { class: 'gh-inner' }, [bobline, intro, el.board, el.tools, el.explain])]));
    var ctx = {
      locked: function () { return st.cur.solved || !!el.solving; },
      say: function (text, expr) { setBob(expr || 'thinking', text); },
      changed: function (quiet) { saveRound(); if (!quiet) afterChange(); },
      fail: function (msg) { st.cur.tries++; saveRound(); if (msg) setBob('encouraging', msg); drawTools(); },
      submit: function () { if (kind.correct(item.pz, st.cur.work)) solved(); else { st.cur.tries++; saveRound(); Core.play('wrong'); setBob('encouraging', st.cur.tries === 1 && kind.submitHint ? kind.submitHint(item.pz) : S.notYet); drawTools(); } }
    };
    el.ctx = ctx;
    el.view = kind.view(el.board, item.pz, st.cur.work, ctx);
    setBob('hello', st.i === 0 && !st.results.length ? pick(S.bobStart) : null);
    if (st.cur.solved) { el.view.refresh({}); showSolved(); } else drawTools();
  }
  function setBob(expr, text) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 120, crop: 'head' });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text) el.say.textContent = text;
  }
  function drawTools() {
    var item = curItem(), kind = kindOf(), c = st.cur;
    el.tools.innerHTML = '';
    if (c.solved) return;
    var noCheck = item.kind === 'river' || item.kind === 'hanoi' || item.kind === 'truth';
    var row = h('div', { class: 'gh-toolrow' }, [
      noCheck ? null : h('button', { type: 'button', class: 'btn', onclick: doCheck }, S.check),
      h('button', { type: 'button', class: 'btn', onclick: doTip }, S.tip),
      h('button', { type: 'button', class: 'btn' + (c.tries >= 3 ? ' primary' : ''), disabled: c.tries < 3, onclick: startSolution, title: c.tries < 3 ? S.solutionLocked : '' }, S.showSolution)
    ]);
    el.tools.appendChild(row);
    el.tools.appendChild(h('p', { class: 'gh-note' }, [c.tries ? h('b', {}, t(S.triesLeft, { n: Math.min(3, c.tries) }) + ' · ') : null, c.tries < 3 ? S.solutionLocked + ' ' : '', S.helpNote]));
  }
  function afterChange() {
    var item = curItem(), kind = kindOf(), c = st.cur;
    if (c.solved || !kind.complete(item.pz, c.work)) return;
    if (kind.correct(item.pz, c.work)) solved();
    else { c.tries++; saveRound(); Core.play('wrong'); setBob('encouraging', S.notYet); drawTools(); }
  }
  function doCheck() {
    var item = curItem(), kind = kindOf(), c = st.cur, w = kind.wrong(item.pz, c.work);
    c.helped = true;
    if (w.length) { c.tries++; el.view.refresh({ errors: w }); setBob('encouraging', S.checkBad); Core.play('wrong'); }
    else { setBob('happy', S.checkGood); Core.play('correct'); }
    saveRound(); drawTools();
  }
  function doTip() {
    var item = curItem(), kind = kindOf(), c = st.cur, tp = kind.tip(item.pz, c.work);
    c.helped = true;
    if (!tp) return;
    if (tp.errors) { c.tries++; el.view.refresh({ errors: tp.errors }); setBob('encouraging', S.checkBad); Core.play('wrong'); saveRound(); drawTools(); return; }
    tp.apply(c.work);
    el.view.refresh({ cells: tp.cells });
    explain(tp.text);
    setBob('thinking', null);
    Core.play('step');
    saveRound(); drawTools();
    if (item.kind !== 'river') afterChange();
  }
  function explain(text, head) { el.explain.innerHTML = ''; if (text) el.explain.appendChild(h('div', { class: 'oj-rule' }, [head ? h('p', { class: 'gh-stephead' }, head) : null, h('p', {}, text)])); }

  // »Vis løsningen«: from the start, one step at a time
  function startSolution() {
    var item = curItem(), kind = kindOf(), c = st.cur;
    if (c.tries < 3) return;
    c.shown = true; c.work = kind.init(item.pz); saveRound();
    el.board.innerHTML = '';
    el.solving = { steps: kind.solution(item.pz), i: 0 };
    el.view = kind.view(el.board, item.pz, c.work, el.ctx);
    setBob('thinking', S.solutionIntro);
    explain(null);
    drawSolveTools();
  }
  function drawSolveTools() {
    el.tools.innerHTML = '';
    var s = el.solving;
    el.tools.appendChild(h('div', { class: 'gh-toolrow' }, [
      h('button', { type: 'button', class: 'btn primary', onclick: nextSolveStep }, S.nextStep),
      s.steps.length - s.i > 1 ? h('button', { type: 'button', class: 'btn', onclick: function () { while (el.solving && el.solving.i < el.solving.steps.length - 1) nextSolveStep(true); nextSolveStep(); } }, S.showRest) : null
    ]));
    el.tools.querySelector('.btn.primary').focus();
  }
  function nextSolveStep(quick) {
    var s = el.solving, step = s.steps[s.i++], c = st.cur;
    if (step) {
      if (step.sail && el.view.sail && !quick) { el.view.sail(step.cells, function () { }); }
      else step.apply(c.work);
      if (!(step.sail && el.view.sail && !quick)) el.view.refresh({ cells: step.cells });
      explain(step.text, t(S.solveStep, { n: s.i, total: s.steps.length }));
      Core.play('step');
    }
    if (s.i >= s.steps.length) { el.solving = null; later(function () { solved(); }, quick ? 0 : 700); return; }
    if (!quick) drawSolveTools();
  }

  /* ---------- one puzzle solved ---------- */
  function puzzleStars() {
    var c = st.cur, kind = kindOf(), item = curItem();
    if (c.shown) return 1;
    if (c.helped) return 2;
    if (kind.allow && kind.moves(c.work) > kind.allow(item.pz)) return 2;
    if (item.kind === 'truth' && c.tries) return 2;
    return 3;
  }
  function solved() {
    var c = st.cur, item = curItem();
    if (c.solved) return;
    c.solved = true; c.stars = puzzleStars();
    if (!c.shown && c.tries >= 3) Core.visit('staedig');
    if (item.kind === 'nono' && item.pz.pic) data().pics[item.pz.pic] = 1;
    st.results.push(c.stars);
    saveRound();
    Core.play('win');
    showSolved();
  }
  function showSolved() {
    var c = st.cur, item = curItem(), kind = kindOf();
    el.tools.innerHTML = '';
    if (item.kind === 'nono' && el.view.reveal) el.view.reveal();
    el.view.refresh({});
    var msg = [];
    if (item.kind === 'nono') { var p = root.GH_PICS.filter(function (x) { return x.id === item.pz.pic; })[0]; msg.push(p ? t(S.ngDone, { name: p.name }) : S.ngDoneOwn); }
    if (kind.best && !c.shown) msg.push(t(item.kind === 'river' ? S.rvBest : S.hnBest, { n: kind.best(item.pz) }));
    setBob(c.stars >= 2 ? 'cheering' : 'happy', c.shown ? S.solutionDone : pick(S.solved));
    var last = st.i >= st.items.length - 1;
    el.explain.innerHTML = '';
    el.explain.appendChild(h('div', { class: 'oj-rule gh-solved' }, [
      h('div', { class: 'gh-solved-stars', html: Core.starIcons(c.stars, 3) }),
      h('p', {}, h('strong', {}, S.solvedStars[c.stars])),
      msg.length ? h('p', {}, msg.join(' ')) : null,
      h('button', { type: 'button', class: 'btn primary', onclick: last ? finish : nextPuzzle }, S.continue)
    ]));
    var b = el.explain.querySelector('.btn.primary'); if (b) b.focus();
  }
  function nextPuzzle() { st.i++; st.cur = freshCur(curItem()); saveRound(); Core.play('step'); showPuzzle(); window.scrollTo(0, 0); }

  /* ---------- the round is over ---------- */
  function finish() {
    clearAll();
    var res = st.results, sum = res.reduce(function (a, b) { return a + b; }, 0), stars = Math.round(sum / (res.length || 1));
    if (!st.route) { st = null; showMap(); return; } // a friend's puzzle: no stars to keep
    var r = route(st.route), d = data(), rs = routeState(r.id), before = rs.stars, newBest = stars > rs.stars;
    rs.stars = Math.max(rs.stars, stars); rs.plays++;
    var lvl = st.level, all3 = res.every(function (x) { return x === 3; }), newLvl = all3 ? Math.min(r.levels.length, lvl + 1) : stars <= 1 ? Math.max(1, lvl - 1) : lvl;
    d.lv[r.id] = newLvl;
    delete d.saved[r.id];
    st = null;
    Core.save();
    var badgeNode = Core.roundDone(ID, r.id, rs.plays > 1 ? before : null, rs.stars);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : 'happy', outfit: OUTFIT, size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      newLvl > lvl ? h('p', { class: 'gh-lvlmsg' }, S.levelUp) : newLvl < lvl ? h('p', { class: 'gh-lvlmsg' }, S.levelDown) : null,
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

  /* ================= SANDBOX: make a puzzle ================= */
  var PAINT = ['k', 'r', 'o', 'y', 'g', 'b', 'v', 'p', 'n'];
  var sb = { tab: 'pic', size: 8, pic: null, col: 'k', sd: 6, grid: null, sel: -1 };
  function showSandbox() {
    clearAll(); saveRound(true); st = null;
    Core.visit(ID + ':sandbox');
    app.innerHTML = '';
    var body = h('div', { class: 'gh-sb-body' }), result = h('div', { class: 'gh-sb-result', 'aria-live': 'polite' });
    function tabBtn(id, label) { return h('button', { type: 'button', class: 'seg' + (sb.tab === id ? ' sel' : ''), 'aria-pressed': sb.tab === id ? 'true' : 'false', onclick: function () { sb.tab = id; showSandbox(); } }, label); }
    var codeIn = h('input', { class: 'gh-sb-code', type: 'text', 'aria-label': S.sbLoadTitle, maxlength: '200', autocomplete: 'off', spellcheck: 'false' });
    var loadMsg = h('p', { class: 'muted', 'aria-live': 'polite' });
    app.appendChild(h('main', { class: 'screen gh-sandbox' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + S.toMap), h('h1', {}, S.sbTitle)]),
      h('p', { class: 'lead' }, S.sbIntro),
      h('div', { class: 'segmented', role: 'group' }, [tabBtn('pic', S.sbPicture), tabBtn('sd', S.sbSudoku)]),
      body, result,
      h('section', { class: 'card gh-sb-load' }, [h('h2', {}, S.sbLoadTitle), h('div', { class: 'row' }, [codeIn, h('button', { type: 'button', class: 'btn', onclick: function () {
        var item = parseCode(codeIn.value);
        if (!item) { loadMsg.textContent = S.sbBadCode; Core.play('wrong'); return; }
        startCustom(item);
      } }, S.sbLoad)]), loadMsg])
    ]));
    if (sb.tab === 'pic') picEditor(body, result); else sdEditor(body, result);
  }
  function sizeRow(list, cur, set) {
    return h('div', { class: 'gh-sb-sizes' }, [h('span', {}, S.sbSize + ':'), h('div', { class: 'segmented' }, list.map(function (n) {
      return h('button', { type: 'button', class: 'seg' + (cur === n ? ' sel' : ''), onclick: function () { set(n); } }, n + ' × ' + n);
    }))]);
  }
  function codeBox(result, code, item, msg) {
    var inp = h('input', { class: 'gh-sb-code', type: 'text', readonly: true, value: code, 'aria-label': S.sbCode });
    var copied = h('span', { class: 'muted' });
    result.innerHTML = '';
    Core.visit('gaademager');
    var badge = Core.roundDone(ID, 'sandbox', null, 0);
    result.appendChild(h('div', { class: 'oj-rule' }, [h('p', {}, h('strong', {}, msg)), h('p', {}, S.sbCode), h('div', { class: 'row' }, [inp,
      h('button', { type: 'button', class: 'btn', onclick: function () { inp.select(); try { navigator.clipboard.writeText(code).then(function () { copied.textContent = S.sbCopied; }, function () { document.execCommand('copy'); copied.textContent = S.sbCopied; }); } catch (e) { document.execCommand('copy'); copied.textContent = S.sbCopied; } } }, S.sbCopy), copied]),
      h('button', { type: 'button', class: 'btn primary', onclick: function () { startCustom(item); } }, S.sbPlay), badge]));
  }
  function picEditor(body, result) {
    if (!sb.pic || sb.pic.length !== sb.size) { sb.pic = []; for (var y = 0; y < sb.size; y++) sb.pic.push(new Array(sb.size + 1).join('.')); }
    body.appendChild(sizeRow([5, 8, 10, 12], sb.size, function (n) { sb.size = n; sb.pic = null; showSandbox(); }));
    var pal = h('div', { class: 'gh-sb-pal', role: 'group' }, PAINT.concat(['.']).map(function (c) {
      return h('button', { type: 'button', class: 'gh-sb-col' + (sb.col === c ? ' sel' : '') + (c === '.' ? ' rub' : ''), style: c === '.' ? '' : 'background:' + root.NONO.PAL[c], 'aria-label': c === '.' ? S.sbErase : c, title: c === '.' ? S.sbErase : '', 'aria-pressed': sb.col === c ? 'true' : 'false',
        onclick: function () { sb.col = c; [].forEach.call(pal.children, function (b) { b.classList.remove('sel'); }); this.classList.add('sel'); } }, c === '.' ? '⌫' : '');
    }));
    var n = sb.size, grid = h('div', { class: 'gh-sb-grid', style: '--n:' + n }), painting = null;
    function cellAt(e) { var el2 = document.elementFromPoint(e.clientX, e.clientY); return el2 && el2.parentNode === grid ? +el2.getAttribute('data-i') : -1; }
    function setCell(i) { if (i < 0) return; var y = Math.floor(i / n), x = i % n, row = sb.pic[y]; sb.pic[y] = row.slice(0, x) + painting + row.slice(x + 1); grid.children[i].style.background = painting === '.' ? '' : root.NONO.PAL[painting]; }
    for (var i = 0; i < n * n; i++) { var ch = sb.pic[Math.floor(i / n)].charAt(i % n); grid.appendChild(h('div', { class: 'gh-sb-cell', 'data-i': i, style: ch === '.' ? '' : 'background:' + root.NONO.PAL[ch] })); }
    grid.addEventListener('pointerdown', function (e) { var i = cellAt(e); if (i < 0) return; e.preventDefault(); var cur = sb.pic[Math.floor(i / n)].charAt(i % n); painting = cur === sb.col ? '.' : sb.col; setCell(i); try { grid.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ } });
    grid.addEventListener('pointermove', function (e) { if (painting !== null) setCell(cellAt(e)); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { grid.addEventListener(ev, function () { painting = null; result.innerHTML = ''; }); });
    body.appendChild(pal); body.appendChild(grid);
    body.appendChild(h('div', { class: 'row center' }, [
      h('button', { type: 'button', class: 'btn ghost', onclick: function () { sb.pic = null; showSandbox(); } }, S.sbClear),
      h('button', { type: 'button', class: 'btn primary', onclick: function () {
        var p = { rows: sb.pic.slice(), name: '' }, filled = sb.pic.join('').replace(/\./g, '').length;
        if (filled < 3) { result.innerHTML = ''; result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, S.sbPicEmpty))); return; }
        if (!root.NONO.check(p).ok) { result.innerHTML = ''; result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, S.sbPicBad))); Core.play('wrong'); return; }
        Core.play('correct');
        var code = picCode(p.rows);
        codeBox(result, code, { kind: 'nono', pz: { pic: null, own: { rows: p.rows, name: '' } } }, S.sbPicGood);
      } }, S.sbTest)
    ]));
  }
  function sdEditor(body, result) {
    var n = sb.sd, SD = root.SUDOKU;
    if (!sb.grid || sb.grid.length !== n * n) { sb.grid = []; for (var i = 0; i < n * n; i++) sb.grid.push(0); sb.sel = -1; }
    body.appendChild(sizeRow([4, 6, 9], n, function (m) { sb.sd = m; sb.grid = null; showSandbox(); }));
    body.appendChild(h('p', { class: 'muted' }, S.sbSdPick));
    var bh = SD.BOX[n][0], bw = SD.BOX[n][1], grid = h('div', { class: 'gh-sd', style: '--n:' + n }), cells = [];
    for (var j = 0; j < n * n; j++) (function (j) {
      var r = Math.floor(j / n), c = j % n;
      var b = h('button', { type: 'button', class: 'gh-sd-cell given' + ((c + 1) % bw === 0 && c < n - 1 ? ' br' : '') + ((r + 1) % bh === 0 && r < n - 1 ? ' bb' : ''), onclick: function () { sb.sel = j; draw(); } });
      cells.push(b); grid.appendChild(b);
    })(j);
    var pad = h('div', { class: 'gh-pad' });
    for (var v = 0; v <= n; v++) (function (v) { pad.appendChild(h('button', { type: 'button', class: 'gh-padkey' + (v ? '' : ' erase'), onclick: function () { if (sb.sel >= 0) { sb.grid[sb.sel] = v; result.innerHTML = ''; draw(); } } }, v ? String(v) : '⌫')); })(v);
    function draw() { cells.forEach(function (b, k) { b.textContent = sb.grid[k] || ''; b.classList.toggle('sel', k === sb.sel); }); }
    draw();
    body.appendChild(grid); body.appendChild(pad);
    body.appendChild(h('div', { class: 'row center' }, [
      h('button', { type: 'button', class: 'btn ghost', onclick: function () { sb.grid = null; showSandbox(); } }, S.sbClear),
      h('button', { type: 'button', class: 'btn primary', onclick: function () {
        var cnt = SD.count(sb.grid, n, 2);
        result.innerHTML = '';
        if (cnt !== 1) { result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, cnt === 0 ? S.sbSdNone : S.sbSdMany))); Core.play('wrong'); return; }
        Core.play('correct');
        codeBox(result, SD.toCode(n, sb.grid), { kind: 'sudoku', pz: { n: n, puzzle: sb.grid.slice(), solution: SD.solveOne(sb.grid, n) } }, S.sbSdGood);
      } }, S.sbTest)
    ]));
  }
  // picture codes: B<width>x<height>-<rows>, colours as letters, '.' empty
  function picCode(rows) { return 'B' + rows[0].length + 'x' + rows.length + '-' + rows.join(''); }
  function parseCode(code) {
    code = String(code || '').replace(/\s+/g, '');
    var m = /^B(\d{1,2})x(\d{1,2})-([.kblrpoygmnsvw]+)$/.exec(code);
    if (m) {
      var W = +m[1], H = +m[2], s = m[3];
      if (W < 3 || W > 15 || H < 3 || H > 15 || s.length !== W * H) return null;
      var rows = []; for (var y = 0; y < H; y++) rows.push(s.slice(y * W, y * W + W));
      if (!root.NONO.check({ rows: rows }).ok) return null;
      return { kind: 'nono', pz: { pic: null, own: { rows: rows, name: '' } } };
    }
    var sd = root.SUDOKU.fromCode(code);
    if (sd && root.SUDOKU.count(sd.puzzle, sd.n, 2) === 1) return { kind: 'sudoku', pz: { n: sd.n, puzzle: sd.puzzle, solution: root.SUDOKU.solveOne(sd.puzzle, sd.n) } };
    return null;
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask, collection: collection,
    _state: function () { return st; }, _routes: ROUTES, _makeRound: makeRound, _parseCode: parseCode, _picCode: picCode, _el: function () { return el; } }); // test hooks
})(window);
