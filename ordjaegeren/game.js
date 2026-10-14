/*
 * Ordjægeren – danskspil.
 * En ekspedition gennem junglen: hvert rigtigt svar flytter Bob ét trin frem.
 * Mini-spil: Fang ordet, Hul i sætningen, Sorter, Sæt kommaet, Faste udtryk, Lyt og stav.
 * Forkerte svar kommer på en øveliste, og fundne ord samles i en feltbog.
 */
(function (root) {
  'use strict';
  var Core = root.Core, D = root.OJ_DATA, Bob = root.Bob, S = root.STR.oj, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'ordjaegeren', STEPS = 10;
  var app = null, st = null, timers = [], clock = 0, el = {};

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.practice = d.practice || {}; d.notebook = d.notebook || {}; d.rules = d.rules || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------- task bank ---------- */
  function spellingFor(route) {
    return D.spelling.filter(function (x) { return route.rules.indexOf(x.r) >= 0 && (x.b === route.b || x.r === 'sammensat'); });
  }
  function makeTask(key) {
    var p = key.split(':'), kind = p[0], id = p.slice(1).join(':'), it;
    if (kind === 'sp') { it = D.spelling.filter(function (x) { return x.w === id; })[0]; if (!it) return null;
      return { type: 'fang', key: key, rule: it.r, item: it, answer: it.w, options: shuffle([it.w].concat(it.x)) }; }
    if (kind === 'ls') { it = D.spelling.filter(function (x) { return x.w === id; })[0]; if (!it) return null;
      return { type: 'lyt', key: key, rule: it.r, item: it, answer: it.w }; }
    if (kind === 'cl') { var cls = null; for (var k in D.classes) if (D.classes[k].indexOf(id) >= 0) cls = k; if (!cls) return null;
      return { type: 'sorter', key: key, rule: 'klasser', word: id, answer: cls }; }
    if (kind === 'gap') { it = D.gaps[+id]; if (!it) return null;
      return { type: 'gap', key: key, rule: it.r, item: it, answer: it.a, options: shuffle([it.a].concat(it.x)) }; }
    if (kind === 'cm') { var c = D.commas[+id]; if (!c) return null;
      var before = c.split('|')[0].split(' '), words = c.replace('|', '').split(' ');
      return { type: 'komma', key: key, rule: 'komma', words: words, answer: before.length - 1 }; }
    if (kind === 'id') { it = D.idioms[+id]; if (!it) return null;
      return { type: 'udtryk', key: key, rule: 'udtryk', item: it, answer: it.a, options: shuffle([it.a].concat(it.x)) }; }
    return null;
  }
  function keysFor(route) {
    var band = route.b;
    if (route.kind === 'fang') return spellingFor(route).map(function (x) { return 'sp:' + x.w; });
    if (route.kind === 'lyt') return D.spelling.filter(function (x) { return x.b === band; }).map(function (x) { return 'ls:' + x.w; });
    if (route.kind === 'sorter') { var out = []; for (var k in D.classes) D.classes[k].forEach(function (w) { out.push('cl:' + w); }); return out; }
    if (route.kind === 'gap') return D.gaps.map(function (g, i) { return route.rules.indexOf(g.r) >= 0 ? 'gap:' + i : null; }).filter(Boolean);
    if (route.kind === 'komma') return D.commas.map(function (c, i) { return 'cm:' + i; });
    if (route.kind === 'udtryk') return D.idioms.map(function (c, i) { return 'id:' + i; });
    return [];
  }
  function buildRound(route) {
    var d = data(), keys;
    if (route.kind === 'practice') keys = shuffle(Object.keys(d.practice));
    else if (route.kind === 'mix') {
      var parts = D.routes.filter(function (r) { return r.b === route.b && r.kind !== 'mix'; });
      keys = [];
      shuffle(parts).forEach(function (r) { keys = keys.concat(shuffle(keysFor(r)).slice(0, 2)); });
      keys = shuffle(keys);
    } else {
      keys = shuffle(keysFor(route));
      // mix in up to 3 items from the practice list that belong to this route
      var mine = Object.keys(d.practice).filter(function (k) { return keys.indexOf(k) >= 0; }).slice(0, 3);
      keys = mine.concat(keys.filter(function (k) { return mine.indexOf(k) < 0; }));
    }
    var tasks = [];
    for (var i = 0; i < keys.length && tasks.length < STEPS; i++) { var tk = makeTask(keys[i]); if (tk) tasks.push(tk); }
    return shuffle(tasks);
  }

  /* ---------- hub API ---------- */
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = D.routes.filter(function (r) { return r.b === band; });
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    D.routes.forEach(function (r) {
      var rs = (d.routes || {})[r.id]; if (!rs || !rs.plays) return;
      rows.push([r.name + ' (' + r.b + ')', rs.stars + '/3', rs.best + ' %']);
    });
    var n = Object.keys(d.practice || {}).length;
    if (n) rows.push([t(S.reportPractice, { n: n }), '', '']);
    return { head: S.reportHead, rows: rows };
  }

  function progress(d) { return Core.routeProgress(d, D.routes); }
  function collection(d) { return { n: Object.keys(d.notebook || {}).length, max: D.spelling.length }; }
  // Daily challenge: a word from the practice list if there is one, else a task from the weakest route.
  function quickTask(band, d) {
    var routes = D.routes.filter(function (r) { return r.b === band && ['fang', 'gap', 'sorter', 'udtryk'].indexOf(r.kind) >= 0; });
    var keys = Object.keys(d.practice || {}).filter(function (k) { return /^(sp|gap|cl|id):/.test(k); });
    if (!keys.length || Math.random() < 0.4) {
      var rid = Core.weakest(routes.map(function (r) { return r.id; }), d.routes);
      keys = keysFor(routes.filter(function (r) { return r.id === rid; })[0]);
    }
    var tk = makeTask(keys[Math.floor(Math.random() * keys.length)]);
    if (!tk) return null;
    var rule = D.rules[tk.rule] || {}, hint = rule.name ? rule.name + ': ' + rule.text : S.tryAgain;
    if (tk.type === 'sorter') return { q: S.promptSorter, big: tk.word, options: Object.keys(D.classNames).map(function (k) { return D.classNames[k]; }), answer: D.classNames[tk.answer], hint: hint };
    if (tk.type === 'udtryk') return { q: S.promptUdtryk, big: '»' + tk.item.u + '«', options: tk.options, answer: tk.answer, hint: hint };
    var sent = tk.item.s.indexOf('___') >= 0 ? tk.item.s : tk.item.s.replace(new RegExp('(^|[^A-Za-zÆØÅæøå])' + tk.answer + '($|[^A-Za-zÆØÅæøå])', 'i'), function (m, a, b) { return a + '___' + b; });
    return { q: tk.type === 'fang' ? S.promptFang : S.promptGap, big: sent.replace('___', '_____'), options: tk.options, answer: tk.answer, hint: hint, explain: tk.item.s.replace('___', tk.answer) };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) {
    app = container;
    clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000);
    showMap();
  }
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
    var nPractice = Object.keys(d.practice).length;
    var cards = list.map(function (r, i) {
      var rs = routeState(r.id);
      return h('button', { type: 'button', class: 'rs-world oj-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
        h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)),
        i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
        h('strong', {}, r.name), h('span', { class: 'rs-world-desc' }, r.desc),
        h('span', { class: 'rs-world-foot' }, [h('span', { html: Core.starIcons(rs.stars, 3) })])
      ]);
    });
    var found = Object.keys(d.notebook).length;
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen oj-map' }, [
      h('header', { class: 'topbar' }, [
        h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back),
        h('button', { type: 'button', class: 'btn secondary', onclick: showNotebook }, S.notebook + ' (' + found + ')')
      ]),
      h('div', { class: 'rs-title' }, [
        h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: 'explorer', size: 160 }) }),
        h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])
      ]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      nPractice ? h('button', { type: 'button', class: 'oj-practice', onclick: function () { startRound({ id: 'practice', kind: 'practice', name: S.practice, b: d.band }); } }, [
        h('strong', {}, S.practice), h('span', {}, t(S.practiceDesc, { n: nPractice }))]) : null,
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, cards)
    ]));
  }

  /* ================= NOTEBOOK ================= */
  function showNotebook() {
    var d = data(), total = D.spelling.length, found = Object.keys(d.notebook).length;
    var detail = h('p', { class: 'oj-nb-detail', role: 'status' }, found ? S.notebookTap : '');
    var groups = Object.keys(D.rules).map(function (r) {
      var words = D.spelling.filter(function (x) { return x.r === r && d.notebook[x.w]; });
      if (!words.length) return null;
      return h('section', { class: 'card oj-nb-group' }, [
        h('h2', {}, D.rules[r].name), h('p', { class: 'muted' }, D.rules[r].text),
        h('div', { class: 'oj-chips' }, words.map(function (x) {
          return h('button', { type: 'button', class: 'oj-chip', onclick: function () { detail.innerHTML = '<strong>' + esc(x.w) + '</strong> – ' + esc(x.s); if (Core.canSpeak()) Core.speak(x.s); } }, x.w);
        }))
      ]);
    }).filter(Boolean);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.notebookTitle)]),
      h('p', { class: 'lead' }, found ? t(S.notebookCount, { n: found, max: total }) : S.notebookEmpty),
      h('div', { class: 'oj-nb-bar', 'aria-hidden': 'true' }, h('span', { style: 'width:' + Math.round(100 * found / total) + '%' })),
      detail, groups
    ]));
  }

  /* ================= EXPEDITION ================= */
  var STONES = [];
  for (var s = 0; s <= STEPS; s++) STONES.push({ x: 6 + s * 8.4, y: 70 + Math.sin(s * 1.1) * 14 });

  function jungleSvg() {
    var b = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">';
    b += '<defs><linearGradient id="ojSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE6C4"/><stop offset="1" stop-color="#6FB57E"/></linearGradient></defs>';
    b += '<rect width="100" height="100" fill="url(#ojSky)"/>';
    // path
    var d = 'M' + STONES.map(function (p) { return p.x + ',' + (p.y + 4); }).join(' L');
    b += '<path d="' + d + '" fill="none" stroke="#D9C48F" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity=".55"/>';
    return b + '</svg>';
  }
  function leaves() {
    var L = '';
    [[-2, -6, 18, '#3E8A4F', -20], [10, -10, 16, '#4FA060', 15], [80, -8, 20, '#3E8A4F', 25], [92, 10, 16, '#4FA060', -30], [-4, 30, 14, '#58A868', 40], [96, 46, 14, '#3E8A4F', -50]].forEach(function (l) {
      L += '<div class="oj-leaf" style="left:' + l[0] + '%;top:' + l[1] + '%;width:' + l[2] + 'vmin;background:' + l[3] + ';transform:rotate(' + l[4] + 'deg)"></div>';
    });
    return L;
  }

  function startRound(route) {
    clearTimers(); Core.stopSpeaking();
    var tasks = buildRound(route);
    st = { route: route, tasks: tasks, i: 0, results: [], attempt: 0, locked: false, found: [] };
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, route.name), el.step]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onclick: readTask }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.scene = h('div', { class: 'oj-scene' });
    el.scene.innerHTML = jungleSvg() + leaves();
    STONES.forEach(function (p, i) {
      el.scene.appendChild(h('div', { class: 'oj-stone' + (i === STEPS ? ' camp' : ''), style: 'left:' + p.x + '%;top:' + p.y + '%' },
        i === STEPS ? h('span', { html: '<svg viewBox="0 0 60 50"><path d="M30 4L4 46h52z" fill="#F39C4A" stroke="#4A2C17" stroke-width="3" stroke-linejoin="round"/><path d="M30 18l-9 28h18z" fill="#4A2C17"/><path d="M30 4V-8" stroke="#4A2C17" stroke-width="3"/><path d="M30 -8l14 5-14 5z" fill="#D9463B"/></svg>' }) : null));
    });
    el.bob = h('div', { class: 'oj-bob' });
    el.bubble = h('div', { class: 'oj-bubble', role: 'status', 'aria-live': 'polite' });
    el.scene.appendChild(el.bob); el.scene.appendChild(el.bubble);
    el.task = h('div', { class: 'oj-task' });
    el.root = h('div', { class: 'oj-play' }, [hud, el.scene, h('div', { class: 'oj-task-wrap' }, el.task)]);
    app.appendChild(el.root);
    placeBob(0);
    setBob('hello', Core.pick(S.bobStart));
    showTask();
  }

  function placeBob(i) {
    var n = st && st.tasks.length ? st.tasks.length : STEPS;
    var p = STONES[Math.min(STEPS, Math.round(i * STEPS / n))];
    var half = Math.round((el.bob.offsetWidth || 120) / 2) + 4; // keep Bob fully on screen at the first stone
    el.bob.style.left = 'max(' + p.x + '%, ' + half + 'px)'; el.bob.style.top = p.y + '%';
    el.bubble.style.left = 'min(' + (p.x + 7) + '%, calc(100% - 300px))';
  }
  function setBob(expr, text) {
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: 'explorer', size: 200, arms: expr === 'cheering' ? null : undefined });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text) {
      el.bubble.textContent = text; el.bubble.classList.add('show');
      clearTimeout(el.bubbleTimer); el.bubbleTimer = setTimeout(function () { el.bubble && el.bubble.classList.remove('show'); }, 3500);
    }
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ),
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])
    ]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }

  function task() { return st.tasks[st.i]; }
  function readTask() {
    var tk = task(); if (!tk) return;
    if (tk.type === 'lyt') return sayWord(tk);
    if (tk.type === 'fang' || tk.type === 'gap') Core.speak(tk.item.s.replace('___', '…'));
    else if (tk.type === 'sorter') Core.speak(tk.word);
    else if (tk.type === 'komma') Core.speak(tk.words.join(' '));
    else if (tk.type === 'udtryk') Core.speak(tk.item.u);
  }
  function sayWord(tk) { Core.speak(tk.item.w + '. ' + tk.item.s + ' ' + tk.item.w + '.'); }

  function showTask() {
    clearTimers();
    var tk = task();
    if (!tk) return finish();
    st.attempt = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    el.task.innerHTML = '';
    var prompt = { fang: S.promptFang, gap: S.promptGap, sorter: S.promptSorter, komma: S.promptKomma, udtryk: S.promptUdtryk, lyt: Core.canSpeak() ? S.promptLyt : S.promptSe }[tk.type];
    el.task.appendChild(h('p', { class: 'oj-prompt' }, prompt));
    el.body = h('div', { class: 'oj-body t-' + tk.type });
    el.task.appendChild(el.body);
    el.feedback = h('div', { class: 'oj-feedback', role: 'status', 'aria-live': 'polite' });
    el.task.appendChild(el.feedback);
    ({ fang: renderChoice, gap: renderChoice, sorter: renderSorter, komma: renderKomma, udtryk: renderUdtryk, lyt: renderLyt })[tk.type](tk);
    el.task.classList.remove('enter'); void el.task.offsetWidth; el.task.classList.add('enter');
  }

  function sentenceWithGap(s, fill, cls) {
    var parts = s.split('___');
    return h('p', { class: 'oj-sentence' }, [parts[0], h('span', { class: 'oj-gap ' + (cls || '') }, fill || ' '), parts[1]]);
  }
  function renderChoice(tk) {
    el.sentence = sentenceWithGap(tk.item.s.indexOf('___') >= 0 ? tk.item.s : tk.item.s.replace(new RegExp('(^|[^A-Za-zÆØÅæøå])' + tk.answer + '($|[^A-Za-zÆØÅæøå])', 'i'), function (m, a, b) { return a + '___' + b; }));
    el.body.appendChild(el.sentence);
    var opts = h('div', { class: 'oj-options' + (tk.type === 'fang' ? ' fly' : '') });
    tk.options.forEach(function (o, i) {
      var b = h('button', { type: 'button', class: 'oj-opt', style: 'animation-delay:' + (-i * 0.7) + 's', onclick: function () { answer(o, b); } }, o);
      opts.appendChild(b);
    });
    el.body.appendChild(opts);
  }
  function renderSorter(tk) {
    el.body.appendChild(h('div', { class: 'oj-word' }, tk.word));
    var bins = h('div', { class: 'oj-bins' });
    Object.keys(D.classNames).forEach(function (k) {
      var b = h('button', { type: 'button', class: 'oj-bin bin-' + k, onclick: function () { answer(k, b); } }, D.classNames[k]);
      bins.appendChild(b);
    });
    el.body.appendChild(bins);
  }
  function renderKomma(tk) {
    var p = h('p', { class: 'oj-komma' });
    tk.words.forEach(function (w, i) {
      p.appendChild(h('span', { class: 'oj-kw' }, w));
      if (i < tk.words.length - 1) {
        var gap = h('button', { type: 'button', class: 'oj-kgap', 'aria-label': t(S.commaAfter, { w: w.replace(/[.?!]$/, '') }), onclick: function () { answer(i, gap); } }, h('span', {}, ','));
        p.appendChild(gap);
      }
    });
    el.body.appendChild(p);
  }
  function renderUdtryk(tk) {
    el.body.appendChild(h('p', { class: 'oj-idiom' }, '»' + tk.item.u + '«'));
    var opts = h('div', { class: 'oj-options col' });
    tk.options.forEach(function (o) { var b = h('button', { type: 'button', class: 'oj-opt wide', onclick: function () { answer(o, b); } }, o); opts.appendChild(b); });
    el.body.appendChild(opts);
  }
  function renderLyt(tk) {
    var input = h('input', { type: 'text', class: 'oj-input', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': S.typeHere, placeholder: S.typeHere });
    var form = h('form', { class: 'oj-lyt', onsubmit: function (e) { e.preventDefault(); if (input.value.trim()) answer(input.value, input); } });
    var shown = h('div', { class: 'oj-show' });
    if (Core.canSpeak()) {
      form.appendChild(h('button', { type: 'button', class: 'btn secondary oj-listen', onclick: function () { sayWord(tk); input.focus(); } }, S.listenAgain));
      later(function () { sayWord(tk); }, 400);
    } else {
      // no Danish voice: show the word briefly, then hide it
      var showWord = function () {
        shown.textContent = tk.item.w; shown.classList.add('on'); input.disabled = true;
        later(function () { shown.textContent = ''; shown.classList.remove('on'); input.disabled = false; input.focus(); }, 2600);
      };
      form.appendChild(shown);
      form.appendChild(h('button', { type: 'button', class: 'btn secondary oj-listen', onclick: showWord }, S.showAgain));
      later(showWord, 300);
    }
    var keys = h('div', { class: 'oj-keys' }, ['æ', 'ø', 'å'].map(function (c) {
      return h('button', { type: 'button', class: 'oj-key', onclick: function () {
        var s0 = input.selectionStart || input.value.length, s1 = input.selectionEnd || input.value.length;
        input.value = input.value.slice(0, s0) + c + input.value.slice(s1); input.focus(); input.setSelectionRange(s0 + 1, s0 + 1);
      } }, c);
    }));
    form.appendChild(h('div', { class: 'oj-type' }, [input, keys, h('button', { type: 'submit', class: 'btn primary' }, S.check)]));
    el.body.appendChild(form);
    el.input = input;
    if (Core.canSpeak()) later(function () { input.focus(); }, 100);
  }

  /* ---------- answers ---------- */
  function norm(s) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase(); }
  function answer(value, node) {
    var tk = task();
    if (!tk || st.locked) return;
    var ok = tk.type === 'lyt' ? norm(value) === norm(tk.answer) : value === tk.answer;
    var d = data(), rs = d.rules[tk.rule] || (d.rules[tk.rule] = { n: 0, ok: 0 });
    if (ok) {
      st.locked = true;
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      if (st.attempt === 0) { rs.n++; rs.ok++; }
      if (d.practice[tk.key]) { if (first) { d.practice[tk.key].ok = (d.practice[tk.key].ok || 0) + 1; if (d.practice[tk.key].ok >= 2) { delete d.practice[tk.key]; d.practiceCleared = (d.practiceCleared || 0) + 1; } } }
      if ((tk.type === 'fang' || tk.type === 'lyt') && !d.notebook[tk.item.w]) { d.notebook[tk.item.w] = 1; st.found.push(tk.item.w); }
      Core.saveSoon();
      markCorrect(tk, node);
      Core.play('correct');
      setBob(first ? 'happy' : 'encouraging', Core.pick(first ? S.correct : S.correctSecond));
      later(function () { st.i++; placeBob(st.i); Core.play('step'); later(showTask, 650); }, 900);
      return;
    }
    // wrong
    st.attempt++;
    Core.play('wrong');
    if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake', 'wrong'); if (node.tagName === 'BUTTON' && tk.type !== 'komma') node.disabled = true; }
    d.practice[tk.key] = { ok: 0 };
    if (st.attempt === 1) {
      rs.n++;
      Core.saveSoon();
      setBob('thinking', S.tryAgain);
      showRule(tk, false);
      if (tk.type === 'lyt') { el.input.value = ''; el.input.focus(); }
      if (tk.type === 'komma') later(function () { node.classList.remove('wrong'); }, 900);
    } else {
      st.results.push(0);
      st.locked = true;
      Core.saveSoon();
      markCorrect(tk, null);
      setBob('encouraging', null);
      showRule(tk, true);
    }
  }
  function markCorrect(tk, node) {
    if (tk.type === 'fang' || tk.type === 'gap') {
      var g = el.sentence.querySelector('.oj-gap'), fill = tk.answer;
      if (el.sentence.firstChild && el.sentence.firstChild.nodeType === 3 && !el.sentence.firstChild.nodeValue.trim()) fill = fill.charAt(0).toUpperCase() + fill.slice(1);
      g.textContent = fill; g.classList.add('filled');
      [].forEach.call(el.body.querySelectorAll('.oj-opt'), function (b) { if (b.textContent === tk.answer) b.classList.add('right'); b.disabled = true; });
    } else if (tk.type === 'sorter') {
      el.body.querySelector('.bin-' + tk.answer).classList.add('right');
      el.body.querySelector('.oj-word').classList.add('drop');
    } else if (tk.type === 'komma') {
      var gaps = el.body.querySelectorAll('.oj-kgap'); gaps[tk.answer].classList.add('right');
      [].forEach.call(gaps, function (b) { b.disabled = true; });
    } else if (tk.type === 'udtryk') {
      [].forEach.call(el.body.querySelectorAll('.oj-opt'), function (b) { if (b.textContent === tk.answer) b.classList.add('right'); b.disabled = true; });
    } else if (tk.type === 'lyt') {
      el.input.value = tk.answer; el.input.classList.add('right'); el.input.disabled = true;
    }
  }
  function showRule(tk, final) {
    var r = D.rules[tk.rule];
    el.feedback.innerHTML = '';
    var box = h('div', { class: 'oj-rule' + (final ? ' final' : '') }, [
      final ? h('p', { class: 'oj-answer' }, t(S.answerWas, { a: tk.type === 'sorter' ? D.classNames[tk.answer] : tk.type === 'komma' ? tk.words.slice(0, tk.answer + 1).join(' ') + ', ' + tk.words.slice(tk.answer + 1).join(' ') : tk.answer })) : null,
      h('strong', {}, S.rule + ': ' + r.name), h('p', {}, r.text),
      final ? h('p', { class: 'muted small' }, S.savedForPractice) : null,
      final ? h('button', { type: 'button', class: 'btn primary', onclick: function () { st.i++; placeBob(st.i); Core.play('step'); showTask(); } }, S.continue) : null
    ]);
    el.feedback.appendChild(box);
    var btn = box.querySelector('.btn'); if (btn) btn.focus();
    if (box.scrollIntoView) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------- finish ---------- */
  function finish() {
    clearTimers();
    var total = st.results.length || 1, sum = st.results.reduce(function (a, b) { return a + b; }, 0), acc = sum / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
    var first = st.results.filter(function (r) { return r === 1; }).length, route = st.route, newBest = false;
    if (route.kind !== 'practice') {
      var rs = routeState(route.id); newBest = stars > rs.stars;
      var before = rs.stars;
      rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, Math.round(100 * first / total)); rs.plays++;
    }
    Core.save();
    var badgeNode = route.kind !== 'practice' ? Core.roundDone(ID, route.id, rs.plays > 1 ? before : null, rs.stars) : Core.roundDone(ID, 'practice', null, 0);
    setBob(stars >= 2 ? 'cheering' : 'happy', null);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: 'explorer', size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: first, total: st.results.length })),
      st.found.length ? h('p', { class: 'oj-found' }, [t(S.newWords, { n: st.found.length }) + ': ', h('strong', {}, st.found.join(', '))]) : null,
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
      badgeNode,
      h('div', { class: 'row center' }, [
        h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap),
        h('button', { type: 'button', class: 'btn primary', onclick: function () { startRound(route); } }, S.playAgain)
      ])
    ]));
    app.appendChild(o);
    Core.play(stars ? 'win' : 'click');
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    o.querySelector('.btn.primary').focus();
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask, collection: collection,
    _state: function () { return st; } }); // _state: automated tests only
})(window);
