/*
 * Laboratoriet – naturfagsspil.
 * Fem stationer (Vandtanken, Strømbordet, Vægtstangen, Kemikøkkenet, Økosystemet). I hvert forsøg gætter barnet først,
 * ser forsøget og forklarer bagefter (forudsig → observér → forklar). Opdagelser samles i en logbog, og stationerne
 * kan bruges frit i Sandkassen.
 */
(function (root) {
  'use strict';
  var Core = root.Core, L = root.LAB, Sim = root.LabSim, Sc = root.LabScenes, Bob = root.Bob, S = root.STR.lab, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'laboratoriet';
  var app = null, st = null, timers = [], clock = 0, el = {}, scene = null;

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.facts = d.facts || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function stationOpen(sid) { var d = data(); return L.routes.some(function (r) { return r.st === sid && (d.routes[r.id] || {}).stars > 0; }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; Sc.stopAll(); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function station(id) { return L.stations.filter(function (s) { return s.id === id; })[0]; }
  function pts(x) { return String(Math.round(x * 100) / 100).replace('.', ','); }

  /* ---------- hub API ---------- */
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = L.routes.filter(function (r) { return r.b === band; });
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    L.routes.forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([station(r.st).name + ': ' + r.name + ' (' + r.b + ')', rs.stars + '/3', pts(rs.best) + ' / 6']); });
    var n = Object.keys(d.facts || {}).length; if (n) rows.push([t(S.reportFacts, { n: n }), '', '']);
    return { head: S.reportHead, rows: rows };
  }

  function progress(d) { return Core.routeProgress(d, L.routes); }
  function collection(d) { return { n: Object.keys(d.facts || {}).filter(function (k) { return L.facts[k]; }).length, max: Object.keys(L.facts).length }; }
  // Daily challenge: one predict–observe–explain experiment, question or calculation from the weakest route.
  function quickTask(band, d) {
    var routes = L.routes.filter(function (r) { return r.b === band; }), rid = Core.weakest(routes.map(function (r) { return r.id; }), d.routes);
    var r = routes.filter(function (x) { return x.id === rid; })[0], ids = [];
    r.plan.forEach(function (g) { (Array.isArray(g) ? g : [g]).forEach(function (x) { if (ids.indexOf(x) < 0 && x !== 'lever-tilt') ids.push(x); }); });
    var cards = ids.map(function (id) { return L.gen[id](Math.random, {}, band); }).filter(function (c) { return c.type === 'mc' || c.type === 'poe' || c.type === 'calc'; });
    if (!cards.length) return null;
    var c = cards[Math.floor(Math.random() * cards.length)], after = [c.result, c.after].filter(Boolean).join(' ');
    if (c.type === 'calc') return { q: c.q, input: 'number', answer: L.num(c.answer), unit: c.unit, hint: c.hint || S.numberWrong, explain: typeof c.solution === 'string' ? c.solution : after };
    return { q: c.q, options: c.options, answer: c.answer, hint: c.hint || S.numberWrong, explain: after || null };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearTimers(); clearInterval(clock); Core.stopSpeaking(); st = null; el = {}; scene = null; Core.save(); }

  /* ================= MENU ================= */
  function showMap() {
    clearTimers(); st = null; el = {}; scene = null;
    var d = data(), list = L.routes.filter(function (r) { return r.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    var nFacts = Object.keys(d.facts).length;
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen lab-menu' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary', onclick: showLogbook }, S.logbook + ' (' + nFacts + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: 'lab', size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id), stn = station(r.st);
        return h('button', { type: 'button', class: 'rs-world lab-route' + (i === nextIdx ? ' next' : ''), style: '--st:' + stn.color, onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'lab-route-icon', 'aria-hidden': 'true', html: Sc.icons[r.st] }), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, r.name), h('span', { class: 'rs-world-desc' }, stn.name + ' · ' + stn.desc), h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      })),
      h('h2', {}, S.sandbox), h('p', { class: 'muted' }, S.sandboxDesc),
      h('div', { class: 'lab-sandlist' }, L.stations.map(function (s) {
        var open = stationOpen(s.id);
        return h('button', { type: 'button', class: 'lab-sandbtn' + (open ? '' : ' locked'), style: '--st:' + s.color, disabled: open ? null : 'disabled', 'aria-label': s.name + (open ? '' : ' (' + S.locked + ')'),
          onclick: function () { Core.play('click'); showSandbox(s.id); } }, [h('span', { class: 'lab-route-icon', 'aria-hidden': 'true', html: Sc.icons[s.id] }), h('strong', {}, s.name), open ? null : h('small', {}, S.locked)]);
      }))
    ]));
  }

  /* ================= LOGBOOK ================= */
  function showLogbook() {
    var d = data(), keys = Object.keys(L.facts).filter(function (k) { return d.facts[k]; });
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.logbookTitle)]),
      h('p', { class: 'lead' }, keys.length ? t(S.logbookCount, { n: keys.length, max: Object.keys(L.facts).length }) : S.logbookEmpty),
      h('div', { class: 'lab-facts' }, keys.map(function (k) { return h('article', { class: 'lab-fact' }, [h('h3', {}, L.facts[k].t), h('p', {}, L.facts[k].x)]); }))
    ]));
  }

  /* ================= PLAY LAYOUT ================= */
  function layout(title, sub, onBack) {
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' }, sub || '');
    el.stage = h('div', { class: 'lab-stage' });
    el.bob = h('div', { class: 'lab-bob' }); el.bubble = h('div', { class: 'lab-bubble', role: 'status', 'aria-live': 'polite' });
    el.prompt = h('div', { class: 'lab-prompt' });
    el.panel = h('div', { class: 'lab-panel' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, onclick: onBack, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, title), el.step]), h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.side = h('aside', { class: 'lab-side' }, [h('div', { class: 'lab-bobrow' }, [el.bob, el.bubble]), el.prompt, el.panel]);
    el.root = h('div', { class: 'lab-play' }, [hud, el.stage, el.side]);
    app.appendChild(el.root);
  }
  function setBob(expr, text) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: 'lab', size: 160 });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    el.bubble.textContent = text || ''; el.bubble.classList.toggle('show', !!text);
  }
  function makeScene(kind, cfg, opts) {
    Sc.stopAll(); el.stage.innerHTML = '';
    var has = kind && Sc.has(kind);
    el.root.classList.toggle('noscene', !has);
    scene = has ? Sc.create(kind, el.stage, cfg, opts) : null;
    return scene;
  }

  /* ================= ROUND ================= */
  function startRound(route) {
    clearTimers();
    st = { route: route, tasks: L.buildRound(route), i: 0, results: [], newFacts: 0 };
    layout(route.name, '', askLeave);
    showTask();
    setBob('hello', pick(S.bobStart));
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: function () { Core.stopSpeaking(); showMap(); } }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }
  function task() { return st.tasks[st.i]; }
  function showTask() {
    clearTimers(); Core.stopSpeaking();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.score = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    if (st.i > 0) setBob('default', null);
    el.prompt.innerHTML = ''; el.panel.innerHTML = '';
    var q = h('p', { class: 'lab-q' }, tk.q);
    el.prompt.appendChild(h('div', { class: 'lab-qrow' }, [q, Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn lab-say', 'aria-label': S.readAloud, title: S.readAloud, onclick: function () { Core.speak(tk.q); },
      html: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 010 7M18.5 6a8 8 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }) : null]));
    el.root.classList.toggle('building', tk.type === 'build');
    ({ poe: runPOE, build: runBuild, calc: runCalc, order: runOrder, sort: runSort, mc: runMC })[tk.type](tk);
    el.side.scrollTop = 0;
  }
  function feedbackBox() { var f = h('div', { class: 'lab-feedback', 'aria-live': 'polite' }); el.panel.appendChild(f); return f; }
  function note(box, cls, text) { box.innerHTML = ''; if (text) box.appendChild(h('p', { class: 'lab-note ' + cls }, text)); }

  /* ---------- finishing a task ---------- */
  function complete(tk, score) {
    if (st.done) return; st.done = true;
    st.results.push(score);
    var d = data(), isNew = tk.fact && !d.facts[tk.fact];
    if (tk.fact) d.facts[tk.fact] = 1;
    if (isNew) st.newFacts++;
    Core.saveSoon();
    var f = tk.fact && L.facts[tk.fact];
    var box = h('div', { class: 'lab-done' }, [
      f ? h('div', { class: 'lab-factcard' }, [h('span', { class: 'lab-factlabel' }, isNew ? S.newDiscovery : S.discovery), h('strong', {}, f.t), h('p', {}, f.x)]) : null,
      h('button', { type: 'button', class: 'btn primary lab-next', onclick: nextTask }, S.continue)
    ]);
    el.panel.appendChild(box);
    later(function () { var b = el.panel.querySelector('.lab-next'); if (b) { b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, 80);
  }
  function nextTask() { Core.play('click'); st.i++; st.done = false; showTask(); }
  function praise(first) { Core.play('correct'); setBob(first ? 'happy' : 'encouraging', pick(first ? S.correct : S.correctSecond)); }

  /* ================= POE: predict → observe → explain ================= */
  function sceneFor(tk, opts) { var s = tk.scene || {}; return makeScene(s.kind, s, opts); }
  function setupObject(tk) {
    var s = tk.scene;
    if (s.kind === 'tank' && s.obj) scene.add(s.obj, 400, s.rho);
  }
  function observe(tk, done) {
    var s = tk.scene || {};
    if (!scene) return done();
    if (s.kind === 'tank') {
      scene.drop(null, function () {
        if (!s.then) return later(done, 400);
        later(function () {
          if (s.then.liquid) scene.setLiquid(s.then.liquid, function () { later(done, 400); });
          else if (s.then.boat) scene.morph('lerbaad', function () { later(done, 400); });
          else if (s.then.obj) scene.morph(s.then.obj, function () { later(done, 400); });
        }, 700);
      });
    } else if (s.kind === 'board') {
      var r = scene.solve(); Core.play(r.short ? 'bump' : r.anyLit ? 'zap' : 'click');
      if (s.remove) later(function () { scene.setParts(scene.parts().filter(function (p) { return p.slot !== s.remove; })); scene.solve(); later(done, 600); }, 1300);
      else later(done, 900);
    } else if (s.kind === 'lever') scene.tilt(function () { Core.play('bump'); later(done, 300); });
    else if (scene.run) scene.run(function () { later(done, 300); });
    else done();
  }
  function runPOE(tk) {
    sceneFor(tk, {}); setupObject(tk);
    el.panel.appendChild(h('h3', { class: 'lab-stage-h' }, S.predict));
    var opts = h('div', { class: 'lab-options' + (tk.options.length > 3 ? ' two' : '') }), fb;
    tk.options.forEach(function (o) {
      var b = h('button', { type: 'button', class: 'lab-opt', onclick: function () {
        if (st.locked) return; st.locked = true;
        [].forEach.call(opts.children, function (x) { x.disabled = true; });
        b.classList.add('chosen');
        var right = o === tk.answer; st.predRight = right;
        setBob('thinking', S.observe);
        observe(tk, function () {
          [].forEach.call(opts.children, function (x) { if (x.textContent === tk.answer) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
          if (right) { st.score += 0.5; Core.play('correct'); setBob('happy', S.youGuessed); } else { Core.play('wrong'); setBob('surprised', S.youGuessedWrong); }
          fb.appendChild(h('p', { class: 'lab-result' }, tk.result));
          explain(tk);
        });
      } }, o);
      opts.appendChild(b);
    });
    el.panel.appendChild(opts);
    fb = feedbackBox();
  }
  function explain(tk) {
    var ex = tk.explain; if (!ex) return complete(tk, st.score);
    el.panel.appendChild(h('h3', { class: 'lab-stage-h' }, S.explainHead + ': ' + ex.q));
    var tries = 0, box = h('div', { class: 'lab-options col' }), fb;
    ex.options.forEach(function (o) {
      var b = h('button', { type: 'button', class: 'lab-opt wide', onclick: function () {
        if (st.done) return;
        if (o === ex.answer) {
          b.classList.add('right'); [].forEach.call(box.children, function (x) { x.disabled = true; });
          st.score += tries === 0 ? 0.5 : 0.25; praise(tries === 0); note(fb, '', ''); return complete(tk, st.score);
        }
        tries++; b.classList.add('wrong'); b.disabled = true; Core.play('wrong');
        if (tries >= 2) {
          [].forEach.call(box.children, function (x) { x.disabled = true; if (x.textContent === ex.answer) x.classList.add('right'); });
          setBob('encouraging', t(S.answerIs, { a: ex.answer.replace(/\.$/, '') })); return complete(tk, st.score);
        }
        setBob('thinking', S.numberWrong);
      } }, o);
      box.appendChild(b);
    });
    el.panel.appendChild(box); fb = feedbackBox();
    later(function () { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
  }

  /* ---------- shared try/hint/solution logic for build, calc, order ---------- */
  function attemptFailed(tk, fb, msg, showSolution) {
    st.attempt++; Core.play('wrong');
    if (st.attempt === 1) {
      setBob('thinking', msg);
      fb.innerHTML = ''; if (tk.hint) fb.appendChild(h('p', { class: 'lab-note hint' }, [h('strong', {}, S.hint + ': '), tk.hint]));
      return false;
    }
    setBob('encouraging', msg);
    fb.innerHTML = '';
    if (tk.solution && typeof tk.solution === 'string') fb.appendChild(h('p', { class: 'lab-note sol' }, [h('strong', {}, S.solution + ': '), tk.solution]));
    if (showSolution) showSolution();
    st.locked = true;
    complete(tk, 0);
    return true;
  }
  function succeeded(tk, fb, msg) {
    st.locked = true;
    praise(st.attempt === 0);
    fb.innerHTML = ''; fb.appendChild(h('p', { class: 'lab-note ok' }, msg));
    if (tk.solution && typeof tk.solution === 'string' && tk.type === 'calc') fb.appendChild(h('p', { class: 'lab-note' }, tk.solution));
    if (tk.after) fb.appendChild(h('p', { class: 'lab-note' }, tk.after));
    complete(tk, st.attempt === 0 ? 1 : 0.5);
  }

  /* ================= BUILD ================= */
  function runBuild(tk) {
    var k = tk.scene.kind;
    ({ board: buildBoard, lever: buildLever, boat: buildBoat, thermo: buildThermo, titration: buildTitration })[k](tk);
  }
  function toolButton(label, count, sel, onclick) {
    return h('button', { type: 'button', class: 'lab-tool' + (sel ? ' sel' : ''), 'aria-pressed': sel ? 'true' : 'false', onclick: onclick }, [label, count !== null ? h('span', { class: 'lab-count' }, String(count)) : null]);
  }
  function buildBoard(tk) {
    var s = tk.scene, tools = Object.assign({}, s.tools), sel = Object.keys(tools)[0], tray = h('div', { class: 'lab-tools' }), fb;
    var board = sceneFor(tk, { editable: true, onSlot: onSlot, onSwitch: function (p) { if (st.locked) return; p.on = !p.on; Core.play('click'); board.off(); } });
    function drawTray() {
      tray.innerHTML = '';
      Object.keys(tools).forEach(function (k) { tray.appendChild(toolButton(S.toolNames[k], tools[k], sel === k, function () { sel = k; drawTray(); })); });
    }
    function onSlot(sl) {
      if (st.locked) return;
      var ps = board.parts(), p = board.partAt(sl);
      if (p) { if (p.lock) return; board.setParts(ps.filter(function (x) { return x !== p; })); tools[p.type] = (tools[p.type] || 0) + 1; Core.play('click'); drawTray(); return; }
      if (!sel || !tools[sel]) return;
      ps.push({ slot: sl, type: sel, on: sel === 'switch' ? true : undefined }); tools[sel]--; board.setParts(ps); Core.play('step');
      if (!tools[sel]) { var other = Object.keys(tools).filter(function (x) { return tools[x] > 0; })[0]; if (other) sel = other; }
      drawTray();
    }
    function evaluate() {
      var r, ps = board.parts();
      if (s.goal === 'lit') { r = board.solve(); return r.short ? [false, S.shortMsg] : r.anyLit ? [true, S.litOk] : [false, S.litNo]; }
      if (s.goal === 'parallel') {
        r = board.solve(); if (r.short) return [false, S.shortMsg];
        var bulbs = ps.map(function (p, i) { return p.type === 'bulb' ? r.parts[i] : null; }).filter(Boolean);
        if (bulbs.length < 2 || !bulbs.every(function (b) { return b.lit; })) return [false, S.litNo];
        return bulbs.every(function (b) { return b.glow > 0.9; }) ? [true, S.parallelOk] : [false, S.parallelDim];
      }
      if (s.goal === 'switch') {
        var sw = ps.filter(function (p) { return p.type === 'switch'; }); if (!sw.length) return [false, S.switchNo];
        sw.forEach(function (p) { p.on = false; }); var off = Sim.solveCircuit({ cols: s.cols, rows: s.rows, parts: ps });
        sw.forEach(function (p) { p.on = true; }); r = board.solve();
        return !r.short && r.anyLit && !off.anyLit ? [true, S.switchOk] : [false, r.short ? S.shortMsg : S.switchNo];
      }
    }
    el.panel.appendChild(h('p', { class: 'muted small' }, S.tapSlot));
    drawTray(); el.panel.appendChild(tray);
    el.panel.appendChild(h('button', { type: 'button', class: 'btn primary lab-test', onclick: function () {
      if (st.locked) return;
      var res = evaluate(); Core.play(res[0] ? 'zap' : 'bump');
      if (res[0] && s.goal === 'switch') { // show the switch working
        var sw = board.parts().filter(function (p) { return p.type === 'switch'; });
        later(function () { sw.forEach(function (p) { p.on = false; }); board.solve(); }, 900);
        later(function () { sw.forEach(function (p) { p.on = true; }); board.solve(); }, 1800);
      }
      if (res[0]) return succeeded(tk, fb, res[1]);
      attemptFailed(tk, fb, res[1], function () {
        var ps = board.parts().filter(function (p) { return p.lock; }), sol = tk.solution;
        sol.add.forEach(function (sl, i) { ps.push({ slot: sl, type: (sol.types && sol.types[i]) || sol.type || 'wire', on: true, lock: 1 }); });
        board.setParts(ps); board.solve();
      });
    } }, S.turnOn));
    fb = feedbackBox();
  }
  function buildLever(tk) {
    var s = tk.scene, tray = s.tray.map(function (kg) { return { kg: kg, placed: false }; }), sel = 0, fb, trayEl = h('div', { class: 'lab-tools' });
    var lv = sceneFor(tk, { onPeg: onPeg, onWeight: onWeight });
    function onPeg(pos) {
      if (st.locked) return;
      var it = tray[sel]; if (!it || it.placed) return;
      it.placed = true; it.pos = pos; lv.level(); sync(); Core.play('step');
      var nxt = tray.findIndex(function (x) { return !x.placed; }); if (nxt >= 0) sel = nxt; drawTray();
    }
    function onWeight(idx) {
      if (st.locked) return;
      var w = lv.weights()[idx]; if (!w || w.lock) return;
      var it = tray.filter(function (x) { return x.placed && x.pos === w.pos && x.kg === w.kg; })[0]; if (it) { it.placed = false; sel = tray.indexOf(it); }
      lv.level(); sync(); drawTray(); Core.play('click');
    }
    function sync() { lv.setWeights(s.weights.map(function (w) { return Object.assign({}, w); }).concat(tray.filter(function (x) { return x.placed; }).map(function (x) { return { pos: x.pos, kg: x.kg }; }))); }
    function drawTray() {
      trayEl.innerHTML = '';
      tray.forEach(function (it, i) { if (!it.placed) trayEl.appendChild(toolButton(it.kg + ' kg', null, sel === i, function () { sel = i; drawTray(); })); });
    }
    el.panel.appendChild(h('p', { class: 'muted small' }, S.tapPeg));
    drawTray(); el.panel.appendChild(trayEl);
    el.panel.appendChild(h('button', { type: 'button', class: 'btn primary lab-test', onclick: function () {
      if (st.locked) return;
      if (tray.some(function (x) { return !x.placed; })) { note(fb, 'hint', S.placeAll); return; }
      st.locked = true;
      lv.tilt(function (r) {
        st.locked = false; Core.play('bump');
        if (r.tilt === 'balance') return succeeded(tk, fb, S.balanceOk);
        attemptFailed(tk, fb, t(S.balanceNo, { side: (r.tilt === 'left' ? S.left : S.right).toLowerCase() }), function () {
          var sol = Array.isArray(tk.answer) ? tk.answer : [tk.answer];
          tray.forEach(function (it, i) { it.placed = true; it.pos = sol[i]; }); lv.level(); sync(); drawTray();
        });
      });
    } }, S.test));
    fb = feedbackBox();
  }
  function buildBoat(tk) {
    var s = tk.scene, n = 0, fb, bt = sceneFor(tk), lab = h('strong', { class: 'lab-stepval' }, t(S.weights, { n: 0 }));
    function set(v) { if (st.locked) return; n = Math.max(0, Math.min(s.max + 6, v)); lab.textContent = t(S.weights, { n: n }); bt.reset(); bt.setLoad(n); }
    el.panel.appendChild(h('div', { class: 'lab-stepper' }, [
      h('button', { type: 'button', class: 'lab-step', 'aria-label': S.fewer, onclick: function () { set(n - 1); } }, '−'), lab,
      h('button', { type: 'button', class: 'lab-step', 'aria-label': S.more, onclick: function () { set(n + 1); } }, '+')]));
    el.panel.appendChild(h('button', { type: 'button', class: 'btn primary lab-test', onclick: function () {
      if (st.locked) return; st.locked = true;
      bt.test(n, function (floats) {
        st.locked = false;
        if (floats && n === s.max) return succeeded(tk, fb, t(S.boatOk, { n: n }));
        Core.play(floats ? 'click' : 'rain');
        attemptFailed(tk, fb, floats ? S.boatMore : t(S.boatSank, { n: n }), function () { n = s.max; lab.textContent = t(S.weights, { n: n }); bt.reset(); bt.setLoad(n); bt.test(n); });
      });
    } }, S.test));
    fb = feedbackBox();
  }
  function buildThermo(tk) {
    var s = tk.scene, temp = s.start, fb, th = sceneFor(tk), lab = h('strong', { class: 'lab-stepval' }, t(S.temperature, { t: String(temp).replace('-', '−') }));
    var range = h('input', { type: 'range', min: -30, max: 130, step: 5, value: temp, class: 'lab-range', 'aria-label': t(S.temperature, { t: '' }).replace(':', '').trim(),
      oninput: function () { temp = +range.value; lab.textContent = t(S.temperature, { t: String(temp).replace('-', '−') }); } });
    function nudge(dv) { temp = Math.max(-30, Math.min(130, temp + dv)); range.value = temp; lab.textContent = t(S.temperature, { t: String(temp).replace('-', '−') }); }
    el.panel.appendChild(h('div', { class: 'lab-stepper' }, [h('button', { type: 'button', class: 'lab-step', 'aria-label': S.colder, onclick: function () { nudge(-10); } }, '−'), lab, h('button', { type: 'button', class: 'lab-step', 'aria-label': S.warmer, onclick: function () { nudge(10); } }, '+')]));
    el.panel.appendChild(range);
    el.panel.appendChild(h('button', { type: 'button', class: 'btn primary lab-test', onclick: function () {
      if (st.locked) return; st.locked = true;
      th.run(temp, function () {
        st.locked = false;
        if (tk.check(temp)) return succeeded(tk, fb, S.thermoOk);
        attemptFailed(tk, fb, S.thermoNo, function () { var v = s.goal === 'koge' ? 100 : s.goal === 'smelte' ? 20 : -10; th.run(v); });
      });
    } }, S.test));
    fb = feedbackBox();
  }
  function buildTitration(tk) {
    var s = tk.scene, vb = 0, fb, ti = sceneFor(tk);
    function add(ml) { if (st.locked) return; vb = Math.round((vb + ml) * 10) / 10; var ph = ti.set(vb); Core.play('step'); if (ph > 7.6) note(fb, 'hint', S.titrBase); }
    el.panel.appendChild(h('div', { class: 'lab-tools' }, [
      toolButton(t(S.addMl, { ml: 1 }), null, false, function () { add(1); }), toolButton(t(S.addMl, { ml: 5 }), null, false, function () { add(5); }),
      toolButton(S.reset, null, false, function () { if (st.locked) return; vb = 0; ti.set(0); note(fb, '', ''); })]));
    el.panel.appendChild(h('button', { type: 'button', class: 'btn primary lab-test', onclick: function () {
      if (st.locked) return;
      var ph = Sim.titration(s.ca, s.va, s.cb, vb);
      if (Math.abs(vb - tk.answer) < 1e-6) return succeeded(tk, fb, S.titrOk);
      attemptFailed(tk, fb, ph < 6 ? S.titrAcid : S.titrBase, function () { vb = tk.answer; ti.set(vb); });
      if (!st.locked) { vb = 0; ti.set(0); }
    } }, S.done));
    fb = feedbackBox();
  }

  /* ================= CALC ================= */
  function parseNum(v) {
    v = String(v).trim().replace(/\s/g, '');
    if (/^-?\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, ''); // 5.000 = five thousand
    v = v.replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(v) ? parseFloat(v) : NaN;
  }
  function runCalc(tk) {
    sceneFor(tk, {});
    var fb, input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'lab-input', 'aria-label': S.answerHere, placeholder: S.answerHere,
      onkeydown: function (e) { if (e.key === 'Enter') check(); } });
    function check() {
      if (st.locked) return;
      var v = parseNum(input.value);
      if (isNaN(v)) { note(fb, 'hint', S.numberBad); return; }
      if (Math.abs(v - tk.answer) <= Math.max(1e-6, Math.abs(tk.answer) * 0.005)) { input.disabled = true; return succeeded(tk, fb, t(S.answerIs, { a: L.num(tk.answer) + ' ' + tk.unit })); }
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
      if (attemptFailed(tk, fb, S.numberWrong)) input.disabled = true; else { input.select(); }
    }
    el.panel.appendChild(h('div', { class: 'lab-calc' }, [input, h('span', { class: 'lab-unit' }, tk.unit), h('button', { type: 'button', class: 'btn primary', onclick: check }, S.check)]));
    fb = feedbackBox();
    later(function () { if (window.matchMedia('(pointer: fine)').matches) input.focus(); }, 100);
  }

  /* ================= ORDER ================= */
  function runOrder(tk) {
    makeScene(null);
    var placed = [], fb, slots = h('ol', { class: 'lab-slots' }), pool = h('div', { class: 'lab-cards' }), checkBtn;
    var cards = shuffle(tk.items);
    function draw() {
      slots.innerHTML = ''; pool.innerHTML = '';
      tk.items.forEach(function (_, i) {
        var it = placed[i];
        slots.appendChild(h('li', { class: 'lab-slot-card' + (it ? ' full' : '') }, it ? h('button', { type: 'button', class: 'lab-card-btn', onclick: function () { if (st.locked) return; placed.splice(i, 1); Core.play('click'); draw(); } }, it.name) : h('span', { class: 'lab-empty' }, String(i + 1))));
      });
      cards.forEach(function (c) { if (placed.indexOf(c) < 0) pool.appendChild(h('button', { type: 'button', class: 'lab-card-btn', onclick: function () { if (st.locked) return; placed.push(c); Core.play('step'); draw(); } }, c.name)); });
      checkBtn.disabled = placed.length < tk.items.length;
    }
    checkBtn = h('button', { type: 'button', class: 'btn primary lab-test', onclick: function () {
      if (st.locked) return;
      var ok = placed.every(function (c, i) { return c.id === tk.items[i].id; });
      if (ok) { [].forEach.call(slots.querySelectorAll('.lab-slot-card'), function (x) { x.classList.add('right'); }); return succeeded(tk, fb, S.orderOk); }
      [].forEach.call(slots.querySelectorAll('.lab-slot-card'), function (x, i) { x.classList.toggle('wrong', placed[i].id !== tk.items[i].id); });
      var over = attemptFailed(tk, fb, S.orderWrong, function () { placed = tk.items.slice(); draw(); [].forEach.call(slots.querySelectorAll('.lab-slot-card'), function (x) { x.classList.add('right'); }); });
      if (!over) later(function () { placed = placed.filter(function (c, i) { return c.id === tk.items[i].id && placed.slice(0, i).every(function (p, j) { return p.id === tk.items[j].id; }); }); draw(); }, 1200);
    } }, S.check);
    el.panel.appendChild(h('p', { class: 'muted small' }, S.orderTap));
    el.panel.appendChild(slots); el.panel.appendChild(pool); el.panel.appendChild(checkBtn);
    fb = feedbackBox(); draw();
  }

  /* ================= SORT ================= */
  function runSort(tk) {
    makeScene(null);
    var i = 0, mistakes = 0, fb, cur = h('div', { class: 'lab-sortitem', 'aria-live': 'polite' }), bins = h('div', { class: 'lab-bins' }), binLists = {};
    tk.bins.forEach(function (b) {
      var list = h('div', { class: 'lab-binlist' });
      binLists[b.id] = list;
      bins.appendChild(h('div', { class: 'lab-bin' }, [h('button', { type: 'button', class: 'lab-binbtn bin-' + b.id.replace('æ', 'ae'), onclick: function () { choose(b.id); } }, b.name), list]));
    });
    function show() {
      cur.innerHTML = '';
      var it = tk.items[i]; if (!it) return;
      var ic = it.icon && L.objects[it.icon] ? Sc.objShape(it.icon) : null;
      cur.appendChild(h('div', { class: 'lab-sortcard enter' }, [ic ? h('span', { class: 'lab-sorticon', html: '<svg viewBox="' + (-ic.w / 2 - 6) + ' ' + (-ic.h / 2 - 6) + ' ' + (ic.w + 12) + ' ' + (ic.h + 12) + '">' + ic.s + '</svg>' }) : null, h('strong', {}, it.name)]));
    }
    function choose(bin) {
      if (st.locked) return;
      var it = tk.items[i]; if (!it) return;
      var ok = it.bin === bin;
      if (!ok) { mistakes++; Core.play('wrong'); setBob('thinking', t(S.sortWrong, { bin: tk.bins.filter(function (b) { return b.id === it.bin; })[0].name })); }
      else { Core.play('correct'); }
      binLists[it.bin].appendChild(h('span', { class: 'lab-chip' + (ok ? '' : ' fixed') }, it.name));
      i++;
      if (i >= tk.items.length) {
        st.locked = true; cur.innerHTML = '';
        var score = mistakes === 0 ? 1 : mistakes === 1 ? 0.5 : 0;
        if (score === 1) praise(true); else setBob('encouraging', null);
        return complete(tk, score);
      }
      show();
    }
    el.panel.appendChild(cur); el.panel.appendChild(bins);
    fb = feedbackBox(); show();
  }

  /* ================= MC ================= */
  function runMC(tk) {
    makeScene(null);
    var box = h('div', { class: 'lab-options col' }), fb;
    tk.options.forEach(function (o) {
      var b = h('button', { type: 'button', class: 'lab-opt wide', onclick: function () {
        if (st.locked) return;
        if (o === tk.answer) { b.classList.add('right'); [].forEach.call(box.children, function (x) { x.disabled = true; }); st.locked = true; praise(st.attempt === 0); return complete(tk, st.attempt === 0 ? 1 : 0.5); }
        b.classList.add('wrong'); b.disabled = true; st.attempt++; Core.play('wrong');
        if (st.attempt >= 2) { st.locked = true; [].forEach.call(box.children, function (x) { x.disabled = true; if (x.textContent === tk.answer) x.classList.add('right'); }); setBob('encouraging', t(S.answerIs, { a: tk.answer })); return complete(tk, 0); }
        setBob('thinking', S.numberWrong);
      } }, o);
      box.appendChild(b);
    });
    el.panel.appendChild(box); fb = feedbackBox();
  }

  /* ================= RESULT ================= */
  function finish() {
    clearTimers();
    var total = st.tasks.length, sum = st.results.reduce(function (a, b) { return a + b; }, 0), acc = sum / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
    var rs = routeState(st.route.id), newBest = stars > rs.stars;
    var before = rs.stars;
    rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, sum); rs.plays++;
    Core.save();
    var badgeNode = Core.roundDone(ID, st.route.id, rs.plays > 1 ? before : null, rs.stars);
    var route = st.route, starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: 'lab', size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { score: pts(sum), total: total })),
      st.newFacts ? h('p', {}, t(S.newFacts, { n: st.newFacts })) : null,
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
      badgeNode,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: function () { startRound(route); } }, S.playAgain)])
    ]));
    app.appendChild(o);
    Core.play(stars ? 'win' : 'click');
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    o.querySelector('.btn.primary').focus();
  }

  /* ================= SANDBOX ================= */
  function showSandbox(sid) {
    clearTimers(); st = null; Core.visit(ID + ':sandbox');
    var stn = station(sid);
    layout(S.sandbox + ': ' + stn.name, '', showMap);
    el.root.classList.add('sandbox');
    setBob('happy', null);
    ({ tank: sbTank, board: sbBoard, lever: sbLever, kitchen: sbKitchen, eco: sbEco })[sid]();
  }
  function chooser(list, sel, onpick) {
    var box = h('div', { class: 'lab-tools wrap' });
    function draw() { box.innerHTML = ''; list.forEach(function (x) { box.appendChild(toolButton(x.name, null, x.id === sel, function () { sel = x.id; draw(); onpick(x.id); })); }); }
    draw(); return box;
  }
  function sbTank() {
    var liq = 'vand', tk = makeScene('tank', { liquid: liq }), slots = [250, 350, 450, 550], n = 0, info = h('ul', { class: 'lab-sbinfo' });
    el.prompt.appendChild(h('p', { class: 'lab-q' }, S.sbTank));
    el.panel.appendChild(chooser(Object.keys(L.liquids).map(function (k) { return { id: k, name: L.liquids[k].name }; }), liq, function (k) { liq = k; tk.setLiquid(k, list); list(); }));
    function list() {
      info.innerHTML = '';
      tk.items().forEach(function (it) { var fl = it.rho < L.liquids[tk.liquidKey()].rho; info.appendChild(h('li', {}, (L.objects[it.id] || {}).name + ': ' + (fl ? S.floats : S.sinks) + ' (' + L.num(it.rho) + ' g/cm³)')); });
    }
    var objs = h('div', { class: 'lab-tools wrap' });
    Object.keys(L.objects).forEach(function (k) {
      objs.appendChild(toolButton(L.objects[k].name, null, false, function () {
        if (tk.items().length >= 4) { tk.clear(); n = 0; }
        var it = tk.add(k, slots[n++ % 4]); tk.drop(it, list); Core.play('click');
      }));
    });
    el.panel.appendChild(objs);
    el.panel.appendChild(toolButton(S.sbEmpty, null, false, function () { tk.clear(); n = 0; list(); }));
    el.panel.appendChild(info);
  }
  function sbBoard() {
    var sel = 'wire', cfg = { cols: 4, rows: 3, parts: [{ slot: 'v:0:0', type: 'battery' }] }, tray = h('div', { class: 'lab-tools wrap' });
    var board = makeScene('board', cfg, { editable: true, onSlot: function (sl) {
      var ps = board.parts(), p = board.partAt(sl);
      if (p) board.setParts(ps.filter(function (x) { return x !== p; }));
      else { ps.push({ slot: sl, type: sel, on: true }); board.setParts(ps); }
      Core.play('click'); board.solve();
    }, onSwitch: function (p) { p.on = !p.on; Core.play('click'); board.solve(); } });
    el.prompt.appendChild(h('p', { class: 'lab-q' }, S.sbBoard));
    function draw() { tray.innerHTML = ''; ['wire', 'bulb', 'switch', 'battery'].forEach(function (k) { tray.appendChild(toolButton(S.toolNames[k], null, sel === k, function () { sel = k; draw(); })); }); }
    draw(); el.panel.appendChild(tray);
    el.panel.appendChild(toolButton(S.sbClear, null, false, function () { board.setParts([{ slot: 'v:0:0', type: 'battery' }]); board.solve(); }));
    board.solve();
  }
  function sbLever() {
    var sel = 1, ws = [], tray = h('div', { class: 'lab-tools wrap' });
    var lv = makeScene('lever', { weights: [] }, { onPeg: function (pos) { ws.push({ pos: pos, kg: sel }); lv.setWeights(ws); lv.tilt(); Core.play('step'); },
      onWeight: function (idx) { ws.splice(idx, 1); lv.setWeights(ws); lv.tilt(); Core.play('click'); } });
    el.prompt.appendChild(h('p', { class: 'lab-q' }, S.sbLever));
    function draw() { tray.innerHTML = ''; [1, 2, 3, 4].forEach(function (k) { tray.appendChild(toolButton(k + ' kg', null, sel === k, function () { sel = k; draw(); })); }); }
    draw(); el.panel.appendChild(tray);
  }
  function sbKitchen() {
    var sub = 'citron', ind = 'cabbage', bk = makeScene('beaker', { sub: sub, ind: ind });
    el.prompt.appendChild(h('p', { class: 'lab-q' }, S.sbKitchen));
    bk.show(sub, ind);
    el.panel.appendChild(chooser([{ id: 'cabbage', name: S.cabbage }, { id: 'btb', name: S.btb }], ind, function (k) { ind = k; bk.show(sub, ind); }));
    el.panel.appendChild(chooser(Object.keys(L.substances).map(function (k) { return { id: k, name: L.substances[k].name }; }), sub, function (k) { sub = k; bk.show(sub, ind); Core.play('click'); }));
    el.panel.appendChild(h('p', { class: 'muted small' }, L.facts.danger.x));
  }
  function sbEco() {
    var H0 = 60, F0 = 10, ch = makeScene('pop', { hares: H0, foxes: F0 });
    el.prompt.appendChild(h('p', { class: 'lab-q' }, S.sbEco));
    function slider(label, min, max, val, on) {
      var out = h('strong', {}, label + ': ' + val), r = h('input', { type: 'range', min: min, max: max, step: 1, value: val, class: 'lab-range', 'aria-label': label, oninput: function () { out.textContent = label + ': ' + r.value; on(+r.value); } });
      return h('label', { class: 'lab-slider' }, [out, r]);
    }
    el.panel.appendChild(slider(S.hares, 5, 150, H0, function (v) { H0 = v; }));
    el.panel.appendChild(slider(S.foxes, 0, 40, F0, function (v) { F0 = v; }));
    el.panel.appendChild(h('div', { class: 'lab-tools wrap' }, [
      toolButton(S.sbStart, null, false, function () { ch.restart(H0, F0, null); }),
      toolButton(S.removeFoxes, null, false, function () { ch.restart(H0, F0, 'foxes'); }),
      toolButton(S.removeHares, null, false, function () { ch.restart(H0, F0, 'hares'); })]));
    ch.run();
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask, collection: collection,
    _state: function () { return st; }, _scene: function () { return scene; }, _goto: function (i) { st.i = i; st.done = false; showTask(); } }); // test hooks
})(window);
