/*
 * Ordbroen – engelskspil.
 * Bob bygger en bro over Nordsøen: hvert svar lægger en planke. Mini-spil: Hør og find, Sig det på engelsk,
 * Lyt og stav, Hul i sætningen, Byg sætningen, Uregelmæssige verber, Falske venner, Faste udtryk, Læs og forstå.
 * Fejl kommer på en øveliste, og lærte ord samles i en ordbog.
 */
(function (root) {
  'use strict';
  var Core = root.Core, D = root.OB_DATA, Bob = root.Bob, S = root.STR.ob, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'ordbroen', STEPS = 10, OUTFIT = 'schoolbag';
  var app = null, st = null, timers = [], clock = 0, el = {};

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.practice = d.practice || {}; d.dict = d.dict || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function theme(id) { return D.themes.filter(function (x) { return x.id === id; })[0]; }
  function canEn() { return Core.canSpeak('en'); }
  function sayEn(text) { if (canEn()) Core.speak(text, 'en'); }

  /* ---------- tasks ---------- */
  function wordAt(tid, i) { var th = theme(tid); return th && th.words[+i]; }
  function makeTask(key) {
    var p = key.split(':'), kind = p[0], w, others;
    if (kind === 'h' || kind === 'y' || kind === 's') {
      w = wordAt(p[1], p[2]); if (!w) return null;
      var th = theme(p[1]);
      if (kind === 's') return { type: 'spell', key: key, rule: 'word', en: w[0], da: w[1], us: w[2], answer: w[0], word: key };
      others = shuffle(th.words.filter(function (x) { return x !== w; })).slice(0, 3);
      if (kind === 'h') return { type: 'hear', key: key, rule: 'word', en: w[0], da: w[1], answer: w[1], options: shuffle([w[1]].concat(others.map(function (x) { return x[1]; }))), word: key };
      return { type: 'say', key: key, rule: 'word', en: w[0], da: w[1], answer: w[0], options: shuffle([w[0]].concat(others.map(function (x) { return x[0]; }))), word: key };
    }
    if (kind === 'g') { var g = D.gaps[+p[1]]; if (!g) return null; return { type: 'gap', key: key, rule: g.r, item: g, answer: g.a, options: shuffle([g.a].concat(g.x)) }; }
    if (kind === 'b') { var s = D.sentences[+p[1]]; if (!s) return null; return { type: 'build', key: key, rule: 'order', item: s, words: s.en.split(' '), answer: s.en }; }
    if (kind === 'v') {
      var v = D.verbs[+p[1]]; if (!v) return null;
      var form = p[2] === 'pp' ? 2 : 1, right = v[form];
      return { type: 'verb', key: key, rule: 'verb', verb: v, form: form, answer: right, options: shuffle(D.verbOptions(v, form)) };
    }
    if (kind === 'f') { var f = D.falseFriends[+p[1]]; if (!f) return null; return { type: 'false', key: key, rule: 'false', item: f, answer: f[1], options: shuffle([f[1], f[2]].concat(f[4])) }; }
    if (kind === 'i') { var it = D.idioms[+p[1]]; if (!it) return null; return { type: 'idiom', key: key, rule: 'idiom', item: it, answer: it[1], options: shuffle([it[1]].concat(it[2])) }; }
    if (kind === 'r') { var tx = D.texts[+p[1]], q = tx && tx.qs[+p[2]]; if (!q) return null; return { type: 'read', key: key, rule: 'read', text: tx, q: q, answer: q[1], options: shuffle([q[1]].concat(q[2])) }; }
    return null;
  }
  function keysFor(route) {
    var out = [];
    if (route.kind === 'words') route.themes.forEach(function (tid) {
      theme(tid).words.forEach(function (w, i) { out.push((route.b === 'M' ? (Math.random() < 0.6 ? 'h' : 'y') : ['h', 'y', 's'][Math.floor(Math.random() * 3)]) + ':' + tid + ':' + i); });
    });
    if (route.kind === 'spell') D.themes.forEach(function (th) { if (th.b === route.b) th.words.forEach(function (w, i) { if (!/[ \-]/.test(w[0])) out.push('s:' + th.id + ':' + i); }); });
    if (route.kind === 'gap') D.gaps.forEach(function (g, i) { if (route.rules.indexOf(g.r) >= 0 && g.b === route.b) out.push('g:' + i); });
    if (route.kind === 'build') D.sentences.forEach(function (s, i) { if (s.b === route.b) out.push('b:' + i); });
    if (route.kind === 'verbs') for (var i = route.range[0]; i < route.range[1]; i++) out.push('v:' + i + ':' + (Math.random() < 0.5 ? 'p' : 'pp'));
    if (route.kind === 'false') D.falseFriends.forEach(function (f, i) { out.push('f:' + i); });
    if (route.kind === 'idiom') D.idioms.forEach(function (f, i) { out.push('i:' + i); });
    return out;
  }
  function buildRound(route) {
    var d = data(), keys;
    if (route.kind === 'read') { // three texts, all their questions in order
      var tx = shuffle(D.texts.map(function (x, i) { return i; }).filter(function (i) { return D.texts[i].b === route.b; })).slice(0, 3);
      keys = []; tx.forEach(function (i) { D.texts[i].qs.forEach(function (q, j) { keys.push('r:' + i + ':' + j); }); });
      return keys.map(makeTask).filter(Boolean);
    }
    if (route.kind === 'practice') keys = shuffle(Object.keys(d.practice));
    else {
      keys = shuffle(keysFor(route));
      var baseOf = function (k) { return k.replace(/^[hys]:/, 'w:').replace(/:(p|pp)$/, ''); }, bases = keys.map(baseOf);
      // up to 3 items from the practice list that belong to this route come first
      var mine = Object.keys(d.practice).filter(function (k) { return bases.indexOf(baseOf(k)) >= 0; }).slice(0, 3);
      keys = mine.concat(keys.filter(function (k) { return mine.indexOf(k) < 0; }));
    }
    var tasks = [], seen = {};
    for (var i = 0; i < keys.length && tasks.length < STEPS; i++) {
      var tk = makeTask(keys[i]); if (!tk) continue;
      var id = keys[i].replace(/^[hys]:/, 'w:').replace(/:(p|pp)$/, ''); if (seen[id]) continue; seen[id] = 1;
      tasks.push(tk);
    }
    return shuffle(tasks);
  }

  /* ---------- daily challenge ---------- */
  function quickTask(band, d) {
    var routes = D.routes.filter(function (r) { return r.b === band && ['words', 'gap', 'verbs', 'false', 'idiom'].indexOf(r.kind) >= 0; });
    var keys = Object.keys(d.practice || {}).filter(function (k) { return /^[hygvfi]:/.test(k); });
    if (!keys.length || Math.random() < 0.4) {
      var rid = Core.weakest(routes.map(function (r) { return r.id; }), d.routes);
      keys = keysFor(routes.filter(function (r) { return r.id === rid; })[0]).filter(function (k) { return !/^s:/.test(k); });
    }
    var tk = makeTask(keys[Math.floor(Math.random() * keys.length)]);
    if (!tk) return null;
    var r = D.rules[tk.rule] || D.rules.word, hint = r.name + ': ' + r.text, base = { options: tk.options, answer: tk.answer, hint: hint };
    function x(o) { for (var k in base) if (o[k] === undefined) o[k] = base[k]; return o; }
    if (tk.type === 'hear') return x({ q: S.promptHear, big: tk.en, bigLang: 'en', speak: tk.en, speakLang: 'en', explain: tk.en + ' = ' + tk.da });
    if (tk.type === 'say') return x({ q: S.promptSay, big: tk.da, optLang: 'en', explain: tk.da + ' = ' + tk.en });
    if (tk.type === 'gap') return x({ q: S.promptGap, big: tk.item.s.replace('___', '_____'), bigLang: 'en', optLang: 'en', explain: tk.item.s.replace('___', tk.answer), explainLang: 'en' });
    if (tk.type === 'verb') return x({ q: t(tk.form === 1 ? S.promptPast : S.promptPerfect, { v: tk.verb[0], da: tk.verb[3] }), optLang: 'en', explain: tk.verb.slice(0, 3).join(' – '), explainLang: 'en' });
    if (tk.type === 'false') return x({ q: t(S.promptFalse, { w: tk.item[0] }), explain: t(S.falseNote, { dk: tk.item[2], en: tk.item[3] }) });
    if (tk.type === 'idiom') return x({ q: S.promptIdiom, big: '»' + tk.item[0] + '«', bigLang: 'en' });
    return null;
  }
  function progress(d) { return Core.routeProgress(d, D.routes); }
  function collection(d) { var n = 0; D.themes.forEach(function (th) { n += th.words.length; }); return { n: Object.keys(d.dict || {}).length, max: n }; }

  /* ---------- hub API ---------- */
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = D.routes.filter(function (r) { return r.b === band; });
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    D.routes.forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([r.name + ' (' + r.b + ')', rs.stars + '/3', rs.best + ' %']); });
    var n = Object.keys(d.practice || {}).length; if (n) rows.push([t(S.reportPractice, { n: n }), '', '']);
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
    var nPractice = Object.keys(d.practice).length, known = Object.keys(d.dict).length;
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen ob-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary', onclick: showDictionary }, S.dictionary + ' (' + known + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      nPractice ? h('button', { type: 'button', class: 'oj-practice ob-practice', onclick: function () { startRound({ id: 'practice', kind: 'practice', name: S.practice, b: d.band }); } }, [
        h('strong', {}, S.practice), h('span', {}, t(S.practiceDesc, { n: nPractice }))]) : null,
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world ob-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, r.name), h('span', { class: 'rs-world-desc' }, r.desc), h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      }))
    ]));
  }

  /* ================= DICTIONARY ================= */
  function showDictionary() {
    var d = data(), total = 0, found = 0;
    D.themes.forEach(function (th) { total += th.words.length; });
    var groups = D.themes.map(function (th) {
      var ws = th.words.filter(function (w, i) { return d.dict[th.id + ':' + i]; });
      found += ws.length;
      if (!ws.length) return null;
      return h('section', { class: 'card oj-nb-group' }, [h('h2', {}, th.name), h('div', { class: 'oj-chips' }, ws.map(function (w) {
        return h('button', { type: 'button', class: 'oj-chip ob-chip', onclick: function () { detail.innerHTML = ''; detail.appendChild(h('strong', { lang: 'en' }, w[0])); detail.appendChild(document.createTextNode(' = ' + w[1])); sayEn(w[0]); } }, w[0]);
      }))]);
    }).filter(Boolean);
    var detail = h('p', { class: 'oj-nb-detail', role: 'status' }, found ? S.dictionaryTap : '');
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.dictionaryTitle)]),
      h('p', { class: 'lead' }, found ? t(S.dictionaryCount, { n: found, max: total }) : S.dictionaryEmpty),
      h('div', { class: 'oj-nb-bar', 'aria-hidden': 'true' }, h('span', { style: 'width:' + Math.round(100 * found / total) + '%' })),
      detail, groups
    ]));
  }

  /* ================= BRIDGE ================= */
  function plankX(i, n) { return 23 + (54 * (i + 0.5) / n); }
  function sceneSvg() {
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="obSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CDEBFA"/><stop offset="1" stop-color="#F3FAFF"/></linearGradient></defs>' +
      '<rect width="100" height="100" fill="url(#obSky)"/>' +
      '<rect y="66" width="100" height="34" fill="#4A9CCB"/>' +
      '<path d="M0 72 Q10 70 20 72 T40 72 T60 72 T80 72 T100 72" fill="none" stroke="#9FD3EE" stroke-width="1.2" vector-effect="non-scaling-stroke"/>' +
      '<path d="M0 58 L18 58 Q24 60 24 70 L24 100 L0 100 Z" fill="#6FB57E"/><path d="M100 58 L82 58 Q76 60 76 70 L76 100 L100 100 Z" fill="#6FB57E"/>' +
      '</svg>';
  }
  function landmarks() {
    // Denmark: a flag; England: a red phone box (a simple drawing)
    return '<div class="ob-mark ob-dk" aria-hidden="true"><svg viewBox="0 0 40 60"><path d="M6 60V4" stroke="#4A2C17" stroke-width="3"/><rect x="7" y="5" width="28" height="19" fill="#D9463B" stroke="#4A2C17" stroke-width="2"/><path d="M7 14.5h28M17 5v19" stroke="#fff" stroke-width="4"/></svg></div>' +
      '<div class="ob-mark ob-uk" aria-hidden="true"><svg viewBox="0 0 40 70"><rect x="8" y="8" width="24" height="60" rx="4" fill="#D9463B" stroke="#4A2C17" stroke-width="2.5"/><path d="M8 14q12-10 24 0" fill="#D9463B" stroke="#4A2C17" stroke-width="2.5"/><rect x="12" y="20" width="16" height="22" fill="#FDF2C0" stroke="#4A2C17" stroke-width="2"/><path d="M20 20v22M12 31h16" stroke="#4A2C17" stroke-width="1.5"/></svg></div>';
  }
  function startRound(route) {
    clearTimers(); Core.stopSpeaking();
    var tasks = buildRound(route);
    st = { route: route, tasks: tasks, i: 0, results: [], attempt: 0, locked: false, learned: [] };
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, route.name), el.step]),
      canEn() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onclick: readTask }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.scene = h('div', { class: 'oj-scene ob-scene' });
    el.scene.innerHTML = sceneSvg() + landmarks();
    el.planks = [];
    for (var i = 0; i < tasks.length; i++) { var pk = h('div', { class: 'ob-plank', style: 'left:' + plankX(i, tasks.length) + '%;width:' + (54 / tasks.length + 0.4) + '%' }); el.planks.push(pk); el.scene.appendChild(pk); }
    el.bob = h('div', { class: 'oj-bob' }); el.bubble = h('div', { class: 'oj-bubble', role: 'status', 'aria-live': 'polite' });
    el.scene.appendChild(el.bob); el.scene.appendChild(el.bubble);
    el.task = h('div', { class: 'oj-task' });
    el.root = h('div', { class: 'oj-play ob-play' }, [hud, el.scene, h('div', { class: 'oj-task-wrap' }, el.task)]);
    app.appendChild(el.root);
    placeBob(0);
    setBob('hello', Core.pick(S.bobStart.concat(D.startLines)));
    showTask();
  }
  function placeBob(i) {
    var n = st.tasks.length || 1, x = i === 0 ? 14 : i >= n ? 86 : plankX(i - 1, n) + 54 / n / 2;
    var half = Math.round((el.bob.offsetWidth || 120) / 2) + 4;
    el.bob.style.left = 'max(' + x + '%, ' + half + 'px)'; el.bob.style.top = (i === 0 || i >= n ? 58 : 62) + '%';
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

  /* ================= TASKS ================= */
  function task() { return st.tasks[st.i]; }
  function readTask() {
    var tk = task(); if (!tk) return;
    if (tk.type === 'hear' || tk.type === 'spell') sayEn(tk.en);
    else if (tk.type === 'say') Core.speak(tk.da);
    else if (tk.type === 'gap') sayEn(tk.item.s.replace('___', '…'));
    else if (tk.type === 'build') Core.speak(tk.item.da);
    else if (tk.type === 'verb') sayEn(tk.verb[0]);
    else if (tk.type === 'false') sayEn(tk.item[0]);
    else if (tk.type === 'idiom') sayEn(tk.item[0]);
    else if (tk.type === 'read') sayEn(tk.text.text);
  }
  function showTask() {
    clearTimers();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    el.task.innerHTML = '';
    var prompt = { hear: S.promptHear, say: S.promptSay, spell: canEn() ? S.promptSpell : S.promptSpellRead, gap: S.promptGap, build: S.promptBuild,
      verb: tk.type === 'verb' ? t(tk.form === 1 ? S.promptPast : S.promptPerfect, { v: tk.verb[0], da: tk.verb[3] }) : '',
      false: tk.type === 'false' ? t(S.promptFalse, { w: tk.item[0] }) : '', idiom: S.promptIdiom, read: S.promptRead }[tk.type];
    el.task.appendChild(h('p', { class: 'oj-prompt' }, prompt));
    el.body = h('div', { class: 'oj-body ob-body t-' + tk.type });
    el.task.appendChild(el.body);
    el.feedback = h('div', { class: 'oj-feedback', role: 'status', 'aria-live': 'polite' });
    el.task.appendChild(el.feedback);
    ({ hear: renderHear, say: renderSay, spell: renderSpell, gap: renderGap, build: renderBuild, verb: renderChoiceOnly, false: renderChoiceOnly, idiom: renderIdiom, read: renderRead })[tk.type](tk);
    el.task.classList.remove('enter'); void el.task.offsetWidth; el.task.classList.add('enter');
  }
  function options(tk, wide) {
    var box = h('div', { class: 'oj-options' + (wide ? ' col' : '') });
    tk.options.forEach(function (o) { var b = h('button', { type: 'button', class: 'oj-opt' + (wide ? ' wide' : ''), lang: tk.type === 'say' || tk.type === 'verb' || tk.type === 'gap' || tk.type === 'read' && tk.text.b === 'U' ? 'en' : null, onclick: function () { answer(o, b); } }, o); box.appendChild(b); });
    el.body.appendChild(box);
  }
  function enWord(text) { return h('div', { class: 'ob-word', lang: 'en' }, [text, canEn() ? h('button', { type: 'button', class: 'rs-iconbtn ob-say', 'aria-label': S.listen, title: S.listen, onclick: function () { sayEn(text); },
    html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }) : null]); }
  function renderHear(tk) { el.body.appendChild(enWord(tk.en)); options(tk); later(function () { sayEn(tk.en); }, 350); }
  function renderSay(tk) { el.body.appendChild(h('div', { class: 'ob-word da' }, tk.da)); options(tk); }
  function renderChoiceOnly(tk) { if (tk.type === 'false' || tk.type === 'verb') el.body.appendChild(enWord(tk.type === 'verb' ? tk.verb[0] : tk.item[0])); options(tk); }
  function renderIdiom(tk) { el.body.appendChild(h('p', { class: 'oj-idiom', lang: 'en' }, '»' + tk.item[0] + '«')); options(tk, true); }
  function renderGap(tk) {
    var parts = tk.item.s.split('___');
    el.sentence = h('p', { class: 'oj-sentence', lang: 'en' }, [parts[0], h('span', { class: 'oj-gap' }, ' '), parts[1]]);
    el.body.appendChild(el.sentence); options(tk);
  }
  function renderRead(tk) {
    el.body.appendChild(h('article', { class: 'ob-text', lang: 'en' }, [h('h3', {}, tk.text.title), h('p', {}, tk.text.text)]));
    el.body.appendChild(h('p', { class: 'ob-q', lang: tk.text.b === 'U' ? 'en' : null }, tk.q[0]));
    options(tk, true);
  }
  function renderSpell(tk) {
    var input = h('input', { type: 'text', class: 'oj-input', lang: 'en', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': S.typeHere, placeholder: S.typeHere });
    var form = h('form', { class: 'oj-lyt', onsubmit: function (e) { e.preventDefault(); if (input.value.trim()) answer(input.value, input); } });
    if (canEn()) {
      form.appendChild(h('button', { type: 'button', class: 'btn secondary oj-listen', onclick: function () { sayEn(tk.en); input.focus(); } }, S.listenAgain));
      later(function () { sayEn(tk.en); }, 400);
    } else form.appendChild(h('div', { class: 'ob-word da' }, tk.da));
    form.appendChild(h('div', { class: 'oj-type' }, [input, h('button', { type: 'submit', class: 'btn primary' }, S.check)]));
    el.body.appendChild(form); el.input = input;
    later(function () { input.focus(); }, 100);
  }
  function renderBuild(tk) {
    el.body.appendChild(h('p', { class: 'ob-da' }, tk.item.da));
    var line = h('div', { class: 'ob-line', lang: 'en', 'aria-live': 'polite' }), pool = h('div', { class: 'ob-cards', lang: 'en' }), picked = [];
    var cards = shuffle(tk.words.map(function (w, i) { return { w: w, i: i }; }));
    function draw() {
      line.innerHTML = ''; pool.innerHTML = '';
      picked.forEach(function (c, k) { line.appendChild(h('button', { type: 'button', class: 'ob-card in', onclick: function () { if (st.locked) return; picked.splice(k, 1); Core.play('click'); draw(); } }, c.w)); });
      if (!picked.length) line.appendChild(h('span', { class: 'ob-placeholder' }, '…'));
      cards.forEach(function (c) { if (picked.indexOf(c) < 0) pool.appendChild(h('button', { type: 'button', class: 'ob-card', onclick: function () { if (st.locked) return; picked.push(c); Core.play('step'); draw(); if (picked.length === cards.length) answer(picked.map(function (x) { return x.w; }).join(' '), line); } }, c.w)); });
    }
    el.build = { reset: function () { picked = []; draw(); }, line: line };
    el.body.appendChild(line); el.body.appendChild(pool); draw();
  }

  /* ---------- answers ---------- */
  function norm(s) { return String(s).trim().replace(/\s+/g, ' ').replace(/[’`]/g, '\'').toLowerCase(); }
  function isRight(tk, value) {
    if (tk.type === 'spell') return norm(value) === norm(tk.en) || (tk.us && norm(value) === norm(tk.us));
    if (tk.type === 'build') return value === tk.answer || (tk.item.alts || []).indexOf(value) >= 0;
    return value === tk.answer;
  }
  function answer(value, node) {
    var tk = task(); if (!tk || st.locked) return;
    var d = data();
    if (isRight(tk, value)) {
      st.locked = true;
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      if (d.practice[tk.key] && first) { d.practice[tk.key].ok = (d.practice[tk.key].ok || 0) + 1; if (d.practice[tk.key].ok >= 2) { delete d.practice[tk.key]; d.practiceCleared = (d.practiceCleared || 0) + 1; } }
      if (tk.word) { var wk = tk.key.split(':').slice(1).join(':'); if (!d.dict[wk]) { d.dict[wk] = 1; st.learned.push(tk.en); } }
      Core.saveSoon();
      markCorrect(tk, node);
      Core.play('correct');
      setBob(first ? 'happy' : 'encouraging', Core.pick(first ? S.correct.concat(D.praise) : S.correctSecond));
      if (tk.type === 'spell' && tk.us && norm(value) === norm(tk.en)) showNote(t(S.usAccepted, { us: tk.us }));
      if (tk.type === 'false') showNote(t(S.falseNote, { dk: tk.item[2], en: tk.item[3] }));
      var go = function () { layPlank(first); st.i++; placeBob(st.i); Core.play('step'); later(showTask, 650); };
      if (el.feedback.querySelector('.ob-note')) { // a note to read: wait for »Videre«
        var nb = h('button', { type: 'button', class: 'btn primary ob-next', onclick: function () { nb.disabled = true; go(); } }, S.continue);
        el.feedback.appendChild(nb); nb.focus();
      } else later(go, 900);
      return;
    }
    st.attempt++;
    Core.play('wrong');
    if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake', 'wrong'); if (node.tagName === 'BUTTON') node.disabled = true; }
    d.practice[tk.key] = { ok: 0 };
    Core.saveSoon();
    if (st.attempt === 1) {
      setBob('thinking', S.tryAgain);
      showRule(tk, false);
      if (tk.type === 'spell') { el.input.value = ''; el.input.focus(); }
      if (tk.type === 'build') later(function () { node.classList.remove('wrong'); el.build.reset(); }, 900);
    } else {
      st.results.push(0); st.locked = true;
      markCorrect(tk, null);
      setBob('encouraging', null);
      showRule(tk, true);
    }
  }
  function layPlank(good) { var p = el.planks[st.i]; if (p) p.classList.add('on', good ? 'good' : 'patch'); }
  function markCorrect(tk, node) {
    if (tk.type === 'gap') { var g = el.sentence.querySelector('.oj-gap'); g.textContent = tk.answer; g.classList.add('filled'); }
    if (tk.type === 'spell') { el.input.value = tk.en; el.input.classList.add('right'); el.input.disabled = true; }
    if (tk.type === 'build') { el.build.line.innerHTML = ''; el.build.line.appendChild(h('span', { class: 'ob-done' }, tk.answer)); el.build.line.classList.add('right'); }
    [].forEach.call(el.body.querySelectorAll('.oj-opt, .ob-card'), function (b) { if (b.textContent === tk.answer) b.classList.add('right'); b.disabled = true; });
  }
  function showNote(text) { el.feedback.innerHTML = ''; el.feedback.appendChild(h('p', { class: 'ob-note' }, text)); }
  function showRule(tk, final) {
    var r = D.rules[tk.rule] || D.rules.word;
    el.feedback.innerHTML = '';
    var shown = tk.type === 'hear' ? tk.en + ' = ' + tk.da : tk.type === 'say' ? tk.da + ' = ' + tk.en : tk.answer;
    var box = h('div', { class: 'oj-rule' + (final ? ' final' : '') }, [
      final ? h('p', { class: 'oj-answer' }, t(S.answerWas, { a: shown })) : null,
      tk.type === 'false' && final ? h('p', {}, t(S.falseNote, { dk: tk.item[2], en: tk.item[3] })) : null,
      h('strong', {}, S.rule + ': ' + r.name), h('p', {}, r.text),
      final ? h('p', { class: 'muted small' }, S.savedForPractice) : null,
      final ? h('button', { type: 'button', class: 'btn primary', onclick: function () { layPlank(false); st.i++; placeBob(st.i); Core.play('step'); showTask(); } }, S.continue) : null
    ]);
    el.feedback.appendChild(box);
    var btn = box.querySelector('.btn'); if (btn) btn.focus();
    if (box.scrollIntoView) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------- finish ---------- */
  function finish() {
    clearTimers();
    var total = st.results.length || 1, sum = st.results.reduce(function (a, b) { return a + b; }, 0), acc = sum / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0, first = st.results.filter(function (r) { return r === 1; }).length, route = st.route, newBest = false;
    if (route.kind !== 'practice') { var rs = routeState(route.id), before = rs.stars; newBest = stars > rs.stars; rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, Math.round(100 * first / total)); rs.plays++; }
    Core.save();
    var badgeNode = route.kind !== 'practice' ? Core.roundDone(ID, route.id, rs.plays > 1 ? before : null, rs.stars) : Core.roundDone(ID, 'practice', null, 0);
    setBob(stars >= 2 ? 'cheering' : 'happy', null);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: OUTFIT, size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: first, total: st.results.length })),
      st.learned.length ? h('p', { class: 'oj-found' }, [t(S.newWords, { n: st.learned.length }) + ': ', h('strong', { lang: 'en' }, st.learned.join(', '))]) : null,
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

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask, collection: collection,
    _state: function () { return st; } }); // test hook
})(window);
