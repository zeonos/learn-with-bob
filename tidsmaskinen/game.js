/*
 * Tidsmaskinen – historiespil.
 * Bob rejser i tiden. Mini-spil: Perioderne, Hvem kom først?, Livet dengang, Tidslinjen, Imens i verden,
 * Årstal og Kildedetektiven. Besøgte begivenheder samles i en rejsedagbog.
 */
(function (root) {
  'use strict';
  var Core = root.Core, D = root.TM_DATA, Bob = root.Bob, S = root.STR.tm, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'tidsmaskinen', STEPS = 10, OUTFIT = 'timetravel';
  var app = null, st = null, timers = [], clock = 0, el = {};

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.diary = d.diary || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function ev(id) { return D.events.filter(function (e) { return e.id === id; })[0]; }
  function period(id) { return D.periods.filter(function (p) { return p.id === id; })[0]; }
  function periodOf(y) { for (var i = D.periods.length - 1; i >= 0; i--) if (y >= D.periods[i].from) return D.periods[i]; return D.periods[0]; }
  function pool(band) { return D.events.filter(function (e) { return band === 'U' || e.b === 'M'; }); }

  /* ---------- task generators (also used by the tests) ---------- */
  function periodOptions(right) {
    var idx = D.periods.indexOf(right), near = D.periods.filter(function (p, i) { return p !== right && Math.abs(i - idx) <= 3; });
    return shuffle([right.name].concat(shuffle(near).slice(0, 3).map(function (p) { return p.name; })));
  }
  var gen = {
    period: function (band) {
      return pool(band).filter(function (e) { return !e.noPeriod; }).map(function (e) {
        var p = periodOf(e.y); return { type: 'choice', kind: 'period', ev: e.id, mark: e.y, q: e.t, sub: e.d, answer: p.name, options: periodOptions(p), explain: e.yt + ': ' + e.t + '. ' + p.name + ' (' + p.yt + ').' };
      });
    },
    life: function () {
      return D.things.map(function (th) { var p = period(th[1]); return { type: 'choice', kind: 'life', mark: (p.from + Math.min(p.to, 2025)) / 2, q: th[0], answer: p.name, options: periodOptions(p), explain: p.name + ': ' + p.yt + '.' }; });
    },
    first: function (band) {
      var P = pool(band), out = [], gap = band === 'M' ? 150 : 25;
      for (var k = 0; k < 400 && out.length < 40; k++) {
        var a = pick(P), b = pick(P);
        if (a === b || Math.abs(a.y - b.y) < gap) continue;
        var early = a.y < b.y ? a : b;
        out.push({ type: 'choice', kind: 'first', evs: [a.id, b.id], q: null, answer: early.t, options: [a.t, b.t], mark: early.y, explain: a.t + ': ' + a.yt + '. ' + b.t + ': ' + b.yt + '.' });
      }
      return out;
    },
    order: function (band) {
      var P = pool(band), n = band === 'M' ? 3 : 4, gap = band === 'M' ? 200 : 15, out = [];
      for (var k = 0; k < 600 && out.length < 30; k++) {
        var set = shuffle(P).slice(0, n).sort(function (x, y) { return x.y - y.y; }), ok = true;
        for (var i = 1; i < set.length; i++) if (set[i].y - set[i - 1].y < gap) ok = false;
        if (band === 'M' && ok) { var ps = set.map(function (e) { return periodOf(e.y).id; }); if (new Set(ps).size < ps.length) ok = false; }
        if (ok) out.push({ type: 'order', kind: 'order', items: set.map(function (e) { return e.id; }), answer: set.map(function (e) { return e.t; }).join(' → ') });
      }
      return out;
    },
    world: function (band) {
      var dk = pool(band).filter(function (e) { return !e.world; }), wo = pool(band).filter(function (e) { return e.world; }), out = [];
      var near = band === 'M' ? 60 : 40, far = band === 'M' ? 300 : 150;
      dk.forEach(function (e) {
        var good = wo.filter(function (w) { return Math.abs(w.y - e.y) <= near; });
        if (!good.length) return;
        var right = pick(good), bad = shuffle(wo.filter(function (w) { return Math.abs(w.y - e.y) >= far; })).slice(0, 2);
        if (bad.length < 2) return;
        out.push({ type: 'choice', kind: 'world', ev: e.id, mark: e.y, q: e.t + ' (' + e.yt + ')', answer: right.t, options: shuffle([right.t].concat(bad.map(function (b) { return b.t; }))), evs: [e.id, right.id],
          explain: right.t + ': ' + right.yt + '.' });
      });
      return out;
    },
    year: function (band, filter) {
      return pool(band).filter(function (e) { return !filter || e[filter]; }).map(function (e) {
        var cands = D.events.filter(function (x) { return Math.abs(x.y - e.y) >= 20 && Math.abs(x.y - e.y) <= (e.y < 0 ? 4000 : 600) && x.yt !== e.yt; });
        var opts = [e.yt]; shuffle(cands).forEach(function (x) { if (opts.length < 4 && opts.indexOf(x.yt) < 0 && opts.every(function (o) { return o !== x.yt; })) opts.push(x.yt); });
        return { type: 'choice', kind: 'year', ev: e.id, mark: e.y, q: e.t, sub: e.d, answer: e.yt, options: shuffle(opts), explain: e.yt + ': ' + e.t + '.' };
      }).filter(function (tk) { return tk.options.length === 4; });
    },
    source: function () {
      var out = [];
      D.sources.forEach(function (s, i) { s.qs.forEach(function (q, j) { out.push({ type: 'choice', kind: 'source', src: i, q: q[0], answer: q[1], options: shuffle([q[1]].concat(q[2])), explain: null }); }); });
      return out;
    }
  };
  function buildRound(route) {
    if (route.kind === 'source') { // three sources, all their questions
      var picks = shuffle(D.sources.map(function (s, i) { return i; })).slice(0, 3);
      return gen.source().filter(function (tk) { return picks.indexOf(tk.src) >= 0; }).sort(function (a, b) { return picks.indexOf(a.src) - picks.indexOf(b.src); });
    }
    var list = gen[route.kind](route.b, route.filter);
    var seen = {}, out = [];
    shuffle(list).forEach(function (tk) { var k = tk.ev || tk.q || (tk.evs || tk.items || []).join(); if (seen[k] || out.length >= STEPS) return; seen[k] = 1; out.push(tk); });
    return out;
  }

  /* ---------- daily challenge: a choice task from the weakest route (no timeline sorting) ---------- */
  function quickTask(band, d) {
    var routes = D.routes.filter(function (r) { return r.b === band && r.kind !== 'order'; });
    var rid = Core.weakest(routes.map(function (y) { return y.id; }), d.routes), r = routes.filter(function (x) { return x.id === rid; })[0];
    var list = gen[r.kind](r.b, r.filter); if (!list.length) return null;
    var tk = list[Math.floor(Math.random() * list.length)];
    var prompt = { period: S.promptPeriod, first: S.promptFirst, life: S.promptLife, world: S.promptWorld, year: S.promptYear, source: S.promptSource }[tk.kind];
    var src = tk.kind === 'source' ? D.sources[tk.src] : null;
    return { q: prompt, big: src ? null : tk.q, html: src ? '<div style="font-family:Georgia,serif;font-style:italic;background:#FBF5E6;border:2px solid #D9C48F;border-radius:12px;padding:10px 14px;text-align:left"><b style="font-style:normal;font-family:system-ui,sans-serif">' + esc(src.title) + '</b><br>' + esc(src.text) + '</div>' : null,
      sub: src ? tk.q : null, options: tk.options, answer: tk.answer, hint: tk.kind === 'source' ? S.sourceHint : S.tryAgain, explain: tk.explain || null };
  }
  function esc(x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function progress(d) { return Core.routeProgress(d, D.routes); }
  function collection(d) { return { n: Object.keys(d.diary || {}).filter(function (k) { return ev(k); }).length, max: D.events.length }; }

  /* ---------- hub API ---------- */
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = D.routes.filter(function (r) { return r.b === band; });
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    D.routes.forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([r.name + ' (' + r.b + ')', rs.stars + '/3', rs.best + ' %']); });
    return { head: S.reportHead, rows: rows };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearTimers(); clearInterval(clock); Core.stopSpeaking(); st = null; el = {}; Core.save(); }

  /* ================= MAP ================= */
  function showMap() {
    clearTimers(); Core.stopSpeaking(); st = null; el = {};
    var d = data(), list = D.routes.filter(function (r) { return r.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen tm-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary', onclick: showDiary }, S.diary + ' (' + Object.keys(d.diary).length + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world tm-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, r.name), h('span', { class: 'rs-world-desc' }, r.desc), h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      }))
    ]));
  }

  /* ================= DIARY ================= */
  function showDiary() {
    var d = data(), seen = D.events.filter(function (e) { return d.diary[e.id]; }).sort(function (a, b) { return a.y - b.y; });
    app.innerHTML = '';
    var groups = D.periods.map(function (p) {
      var es = seen.filter(function (e) { return periodOf(e.y) === p; });
      if (!es.length) return null;
      return h('section', { class: 'card tm-diary-group', style: '--pc:' + p.color }, [h('h2', {}, p.name + ' · ' + p.yt),
        h('ul', { class: 'tm-diary' }, es.map(function (e) { return h('li', {}, [h('strong', {}, e.yt + ' – ' + e.t), h('span', {}, e.d)]); }))]);
    }).filter(Boolean);
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.diaryTitle)]),
      h('p', { class: 'lead' }, seen.length ? t(S.diaryCount, { n: seen.length, max: D.events.length }) : S.diaryEmpty), groups
    ]));
  }

  /* ================= PLAY ================= */
  function barSvg() {
    var n = D.periods.length, w = 100 / n, s = '<div class="tm-bar" aria-hidden="true">';
    D.periods.forEach(function (p, i) { s += '<div class="tm-seg" style="left:' + (i * w) + '%;width:' + w + '%;background:' + p.color + '"><span>' + p.name + '</span></div>'; });
    return s + '</div>';
  }
  function xOf(y) { // equal-width periods, linear inside each
    var n = D.periods.length, p = periodOf(y), i = D.periods.indexOf(p), to = Math.min(p.to, 2026);
    return (i + Math.max(0, Math.min(1, (y - p.from) / (to - p.from)))) * 100 / n;
  }
  function startRound(route) {
    clearTimers(); Core.stopSpeaking();
    st = { route: route, tasks: buildRound(route), i: 0, results: [], attempt: 0, locked: false, newDiary: 0 };
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, route.name), el.step]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onclick: readTask }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.scene = h('div', { class: 'oj-scene tm-scene' });
    el.scene.innerHTML = '<div class="tm-sky" aria-hidden="true"></div>' + barSvg();
    el.marker = h('div', { class: 'tm-marker', 'aria-hidden': 'true' });
    el.bob = h('div', { class: 'oj-bob tm-bob' }); el.bubble = h('div', { class: 'oj-bubble', role: 'status', 'aria-live': 'polite' });
    el.scene.appendChild(el.marker); el.scene.appendChild(el.bob); el.scene.appendChild(el.bubble);
    el.task = h('div', { class: 'oj-task' });
    el.root = h('div', { class: 'oj-play tm-play' }, [hud, el.scene, h('div', { class: 'oj-task-wrap' }, el.task)]);
    app.appendChild(el.root);
    moveBob(50);
    setBob('hello', pick(S.bobStart));
    showTask();
  }
  function moveBob(x) {
    var half = Math.round((el.bob.offsetWidth || 120) / 2) + 4;
    el.bob.style.left = 'min(max(' + x + '%, ' + half + 'px), calc(100% - ' + half + 'px))'; el.bob.style.top = '68%';
    el.bubble.style.left = 'min(' + (x + 7) + '%, calc(100% - 300px))';
  }
  function setBob(expr, text) {
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 200 });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text) { el.bubble.textContent = text; el.bubble.classList.add('show'); clearTimeout(el.bubbleTimer); el.bubbleTimer = setTimeout(function () { el.bubble && el.bubble.classList.remove('show'); }, 3500); }
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }
  function task() { return st.tasks[st.i]; }
  function readTask() {
    var tk = task(); if (!tk) return;
    if (tk.kind === 'source') Core.speak(D.sources[tk.src].text + ' ' + tk.q);
    else if (tk.type === 'order') Core.speak(tk.items.map(function (id) { return ev(id).t; }).join('. '));
    else Core.speak((tk.q || '') + '. ' + tk.options.join('. '));
  }
  function showTask() {
    clearTimers();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    el.marker.classList.remove('show');
    el.task.innerHTML = '';
    var prompt = { period: S.promptPeriod, first: S.promptFirst, life: S.promptLife, order: S.promptOrder, world: S.promptWorld, year: S.promptYear, source: S.promptSource }[tk.kind];
    el.task.appendChild(h('p', { class: 'oj-prompt' }, prompt));
    el.body = h('div', { class: 'oj-body tm-body k-' + tk.kind }); el.task.appendChild(el.body);
    el.feedback = h('div', { class: 'oj-feedback', role: 'status', 'aria-live': 'polite' }); el.task.appendChild(el.feedback);
    if (tk.kind === 'source') {
      var src = D.sources[tk.src];
      el.body.appendChild(h('article', { class: 'tm-source' }, [h('span', { class: 'tm-kind' }, src.kind), h('h3', {}, src.title), h('p', {}, src.text), h('small', {}, src.real ? S.sourceReal : S.sourceNote)]));
    }
    if (tk.q && tk.kind !== 'source') el.body.appendChild(h('div', { class: 'tm-card' }, h('strong', {}, tk.q)));
    if (tk.kind === 'source') el.body.appendChild(h('p', { class: 'tm-q' }, tk.q));
    if (tk.type === 'order') renderOrder(tk); else renderChoice(tk);
    el.task.classList.remove('enter'); void el.task.offsetWidth; el.task.classList.add('enter');
  }
  function renderChoice(tk) {
    var box = h('div', { class: 'oj-options' + (tk.kind === 'first' ? ' tm-two' : ' col') });
    tk.options.forEach(function (o) { var b = h('button', { type: 'button', class: 'oj-opt wide' + (tk.kind === 'first' ? ' tm-big' : ''), onclick: function () { answer(o, b); } }, o); box.appendChild(b); });
    el.body.appendChild(box);
  }
  function renderOrder(tk) {
    var line = h('ol', { class: 'tm-line' }), poolBox = h('div', { class: 'tm-pool' }), picked = [];
    var cards = shuffle(tk.items);
    function draw() {
      line.innerHTML = ''; poolBox.innerHTML = '';
      tk.items.forEach(function (x, k) {
        var id = picked[k];
        line.appendChild(h('li', { class: 'tm-slot' + (id ? ' full' : '') }, id ? h('button', { type: 'button', class: 'tm-ev in', onclick: function () { if (st.locked) return; picked.splice(k, 1); Core.play('click'); draw(); } }, ev(id).t) : h('span', {}, String(k + 1))));
      });
      cards.forEach(function (id) { if (picked.indexOf(id) < 0) poolBox.appendChild(h('button', { type: 'button', class: 'tm-ev', onclick: function () { if (st.locked) return; picked.push(id); Core.play('step'); draw(); if (picked.length === tk.items.length) answer(picked.join(), line); } }, ev(id).t)); });
    }
    el.order = { reset: function () { picked = []; draw(); }, line: line };
    el.body.appendChild(line); el.body.appendChild(poolBox); draw();
  }

  /* ---------- answers ---------- */
  function addDiary(tk) {
    var d = data(), ids = (tk.ev ? [tk.ev] : []).concat(tk.evs || [], tk.items || []);
    ids.forEach(function (id) { if (!d.diary[id]) { d.diary[id] = 1; st.newDiary++; } });
  }
  function answer(value, node) {
    var tk = task(); if (!tk || st.locked) return;
    var ok = tk.type === 'order' ? value === tk.items.join() : value === tk.answer;
    if (ok) {
      st.locked = true;
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      addDiary(tk); Core.saveSoon();
      reveal(tk, node);
      Core.play('correct');
      setBob(first ? 'happy' : 'encouraging', pick(first ? S.correct : S.correctSecond));
      if (tk.explain || tk.type === 'order') { // give time to read the answer and the explanation
        el.feedback.appendChild(h('button', { type: 'button', class: 'btn primary tm-next', onclick: nextTask }, S.continue));
        el.feedback.querySelector('.tm-next').focus();
      } else later(nextTask, 1100);
      return;
    }
    st.attempt++;
    Core.play('wrong');
    if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake', 'wrong'); if (node.tagName === 'BUTTON') node.disabled = true; }
    if (st.attempt === 1) {
      setBob('thinking', S.tryAgain);
      if (tk.kind === 'source') { el.feedback.innerHTML = ''; el.feedback.appendChild(h('div', { class: 'oj-rule' }, h('p', {}, S.sourceHint))); }
      if (tk.type === 'order') later(function () { node.classList.remove('wrong'); el.order.reset(); }, 900);
      return;
    }
    st.results.push(0); st.locked = true;
    reveal(tk, null);
    setBob('encouraging', null);
    el.feedback.appendChild(h('button', { type: 'button', class: 'btn primary', onclick: nextTask }, S.continue));
    el.feedback.querySelector('.btn').focus();
  }
  function reveal(tk, node) {
    [].forEach.call(el.body.querySelectorAll('.oj-opt'), function (b) { if (b.textContent === tk.answer) b.classList.add('right'); b.disabled = true; });
    el.feedback.innerHTML = '';
    if (tk.type === 'order') {
      el.order.line.innerHTML = '';
      tk.items.forEach(function (id) { var e = ev(id); el.order.line.appendChild(h('li', { class: 'tm-slot full right' }, h('span', { class: 'tm-ev in' }, [h('b', {}, e.yt), ' ', e.t]))); });
    } else if (tk.explain) el.feedback.appendChild(h('div', { class: 'oj-rule' }, h('p', {}, tk.explain)));
    else if (!node) el.feedback.appendChild(h('div', { class: 'oj-rule' }, h('p', {}, t(S.answerWas, { a: tk.answer }))));
    if (tk.mark !== undefined || tk.items) {
      var y = tk.mark !== undefined ? tk.mark : ev(tk.items[tk.items.length - 1]).y, x = xOf(y);
      el.marker.style.left = x + '%'; el.marker.classList.add('show'); moveBob(x);
    }
  }
  function nextTask() { Core.play('step'); st.i++; showTask(); }

  /* ---------- finish ---------- */
  function finish() {
    clearTimers();
    var total = st.results.length || 1, sum = st.results.reduce(function (a, b) { return a + b; }, 0), acc = sum / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0, first = st.results.filter(function (r) { return r === 1; }).length, route = st.route;
    var rs = routeState(route.id), newBest = stars > rs.stars, before = rs.stars; rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, Math.round(100 * first / total)); rs.plays++;
    Core.save();
    var badgeNode = Core.roundDone(ID, route.id, rs.plays > 1 ? before : null, rs.stars);
    setBob(stars >= 2 ? 'cheering' : 'happy', null);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: OUTFIT, size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: first, total: st.results.length })),
      st.newDiary ? h('p', {}, t(S.newDiary, { n: st.newDiary })) : null,
      badgeNode,
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: function () { startRound(route); } }, S.playAgain)])
    ]));
    app.appendChild(o);
    Core.play(stars ? 'win' : 'click');
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    o.querySelector('.btn.primary').focus();
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask, collection: collection,
    _state: function () { return st; }, _gen: gen, _periodOf: periodOf }); // test hooks
})(window);
