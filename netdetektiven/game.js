/*
 * Netdetektiven – digital dannelse.
 * Bob er detektiv. Mini-spil: Mærkelige beskeder / Phishing-jagt, Kodeordsmaskinen, Del eller lad være, Hvad gør du?,
 * Kildejagten, Ægte eller redigeret?, Data og algoritmer. Opklarede beskeder samles i sagsmappen.
 * Intet, barnet skriver eller vælger, sendes nogen steder hen. Kodeord gemmes ikke.
 */
(function (root) {
  'use strict';
  var Core = root.Core, D = root.ND_DATA, Bob = root.Bob, S = root.STR.nd, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'netdetektiven', STEPS = 10, OUTFIT = 'detective';
  var app = null, st = null, timers = [], clock = 0, el = {};
  var LENS = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M14.5 14.5l6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.cases = d.cases || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function mail(id) { return D.mails.filter(function (m) { return m.id === id; })[0]; }

  /* ---------- task generators (also used by the tests) ---------- */
  function choice(kind, q, right, wrong, explain, extra) {
    var tk = { type: 'choice', kind: kind, q: q, answer: right, options: shuffle([right].concat(wrong)), explain: explain };
    for (var k in extra || {}) tk[k] = extra[k];
    return tk;
  }
  var gen = {
    mail: function (band) {
      return D.mails.filter(function (m) { return m.b === band; }).map(function (m) {
        return { type: 'mail', kind: 'mail', mail: m.id, answer: m.safe ? 'safe' : 'scam', options: ['safe', 'scam'], explain: m.signs };
      });
    },
    pair: function () {
      return D.passwordPairs.map(function (p) { return choice('pair', null, p[0], [p[1]], p[2]); });
    },
    build: function (band) {
      var n = band === 'M' ? 3 : 4, safe = D.passwordCards.filter(function (c) { return !c.personal; }), pers = D.passwordCards.filter(function (c) { return c.personal; });
      return [0, 1, 2].map(function () {
        return { type: 'build', kind: 'build', n: n, cards: shuffle(shuffle(safe).slice(0, n + 2).concat(shuffle(pers).slice(0, 2))), answer: null };
      });
    },
    share: function () {
      return D.shareItems.map(function (s) {
        return { type: 'choice', kind: 'share', q: s[0], answer: s[1], options: D.shareBins.map(function (b) { return b.id; }), explain: S.shareWhy[s[1]] };
      });
    },
    scenario: function (band) {
      return D.scenarios.filter(function (s) { return s[0] === band; }).map(function (s) { return choice('scenario', s[1], s[2], s[3], s[4]); });
    },
    sources: function () {
      var out = [];
      D.sourceSets.forEach(function (s, i) {
        out.push({ type: 'choice', kind: 'sourcePick', set: i, q: s.claim, answer: s.pages[s.best][0], options: s.pages.map(function (p) { return p[0]; }), explain: null });
        out.push(choice('sourceWhy', s.claim, s.why[0], s.why[1], null, { set: i }));
      });
      return out;
    },
    images: function () {
      return D.imageCases.map(function (c) { return choice('image', c[0], c[1], c[2], c[3]); });
    },
    data: function () {
      return D.dataQuiz.map(function (c) { return choice('data', c[0], c[1], c[2], c[3]); });
    },
    feed: function () {
      return D.feedTopics.map(function (topic) {
        var other = pick(D.feedTopics.filter(function (x) { return x !== topic; })), name = S.topicNames[topic];
        return choice('feed', t(S.promptFeed, { topic: name }), t(S.feedMore, { topic: name }), [t(S.feedMore, { topic: S.topicNames[other] }), S.feedAll], S.feedExplain, { topic: topic });
      });
    }
  };
  function buildRound(route) {
    var b = route.b, take = function (list, n) { return shuffle(list).slice(0, n); };
    switch (route.kind) {
      case 'mail': return take(gen.mail(b), STEPS);
      case 'password': // pairs and builds mixed; the udskoling also gets the 2FA scenario and the reuse question
        var list = take(gen.pair(), b === 'M' ? 6 : 5), builds = gen.build(b).slice(0, 2);
        if (b === 'U') list = list.concat(gen.scenario('U').filter(function (x) { return /totrins/.test(x.answer); }), gen.data().filter(function (x) { return /kodeord/.test(x.q); }));
        list = shuffle(list); list.splice(2, 0, builds[0]); list.splice(6, 0, builds[1]);
        return list.slice(0, STEPS);
      case 'share': return take(gen.share(), STEPS);
      case 'scenario': return take(gen.scenario(b), STEPS);
      case 'sources': // keep each page choice right before its "why"
        var sets = take(D.sourceSets.map(function (s, i) { return i; }), 4), all = gen.sources();
        return [].concat.apply([], sets.map(function (i) { return all.filter(function (x) { return x.set === i; }); }));
      case 'images': return take(gen.images(), STEPS);
      case 'data':
        var q = take(gen.data(), 6), f = take(gen.feed(), 2);
        q.splice(2, 0, f[0]); q.splice(5, 0, f[1]);
        return q;
    }
    return [];
  }

  /* ---------- daily challenge: a scenario, sharing or quiz question (no message inspection) ---------- */
  function quickTask(band) {
    var r = Math.random(), tk;
    if (band === 'U' && r < 0.3) tk = pick(gen.images());
    else if (band === 'U' && r < 0.55) tk = pick(gen.data());
    else if (r < 0.75) tk = pick(gen.scenario(band));
    else tk = pick(gen.share());
    var opts = tk.kind === 'share' ? tk.options.map(function (o) { return label(tk, o); }) : tk.options, ans = tk.kind === 'share' ? label(tk, tk.answer) : tk.answer;
    var prompt = { scenario: S.promptScenario, share: S.promptShare, image: S.promptImage, data: S.promptData }[tk.kind];
    return { q: prompt, big: tk.q, options: opts, answer: ans, hint: tk.kind === 'share' ? S.shareHint : S.tryAgain, explain: tk.explain || null };
  }
  function progress(d) { return Core.routeProgress(d, D.routes); }
  function collection(d) { return { n: Object.keys(d.cases || {}).filter(function (k) { return mail(k); }).length, max: D.mails.length }; }

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
    app.appendChild(h('main', { class: 'screen nd-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary', onclick: showCasebook }, S.casebook + ' (' + Object.keys(d.cases).length + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world nd-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, r.name), h('span', { class: 'rs-world-desc' }, r.desc), h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      })),
      h('p', { class: 'muted nd-fiction' }, S.fictional)
    ]));
  }

  /* ================= CASEBOOK ================= */
  function showCasebook() {
    var d = data(), seen = D.mails.filter(function (m) { return d.cases[m.id]; });
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + SC.back), h('h1', {}, S.casebookTitle)]),
      h('p', { class: 'lead' }, seen.length ? t(S.casebookCount, { n: seen.length, max: D.mails.length }) : S.casebookEmpty),
      h('ul', { class: 'nd-casebook' }, seen.map(function (m) {
        return h('li', { class: 'card nd-case ' + (m.safe ? 'is-safe' : 'is-scam') }, [
          h('span', { class: 'nd-stamp' }, m.safe ? S.safeLabel : S.scamLabel), h('strong', {}, m.subject), h('span', { class: 'nd-from' }, m.from), h('p', {}, m.signs)]);
      }))
    ]));
  }

  /* ================= PLAY ================= */
  function startRound(route) {
    clearTimers(); Core.stopSpeaking();
    st = { route: route, tasks: buildRound(route), i: 0, results: [], attempt: 0, locked: false, newCases: 0 };
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, route.name), el.step]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onclick: readTask }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.scene = h('div', { class: 'oj-scene nd-scene' });
    el.scene.innerHTML = '<div class="nd-board" aria-hidden="true"><i class="nd-note n1"></i><i class="nd-note n2"></i><i class="nd-note n3"></i>' +
      // the red thread runs between the pins (same % positions as .nd-pin in the css)
      '<svg class="nd-thread" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="19,14 53,46 83,12" fill="none" stroke="#C23B30" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>' +
      '<i class="nd-pin nd-p1"></i><i class="nd-pin nd-p2"></i><i class="nd-pin nd-p3"></i></div>';
    el.bob = h('div', { class: 'oj-bob nd-bob' }); el.bubble = h('div', { class: 'oj-bubble', role: 'status', 'aria-live': 'polite' });
    el.scene.appendChild(el.bob); el.scene.appendChild(el.bubble);
    el.task = h('div', { class: 'oj-task' });
    el.root = h('div', { class: 'oj-play nd-play' }, [hud, el.scene, h('div', { class: 'oj-task-wrap' }, el.task)]);
    app.appendChild(el.root);
    setBob('hello', pick(S.bobStart));
    showTask();
  }
  function setBob(expr, text) {
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 200 });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text) { el.bubble.textContent = text; el.bubble.classList.add('show'); clearTimeout(el.bubbleTimer); el.bubbleTimer = setTimeout(function () { el.bubble && el.bubble.classList.remove('show'); }, 3800); }
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }
  function task() { return st.tasks[st.i]; }
  function label(tk, o) {
    if (tk.kind === 'mail') return o === 'safe' ? S.safe : S.scam;
    if (tk.kind === 'share') return D.shareBins.filter(function (b) { return b.id === o; })[0].name;
    return o;
  }
  function readTask() {
    var tk = task(); if (!tk) return;
    if (tk.kind === 'mail') { var m = mail(tk.mail); Core.speak(S.from + ' ' + m.from.replace(/<.*>/, '') + '. ' + m.subject + '. ' + m.body); }
    else if (tk.kind === 'build') Core.speak(t(S.promptBuild, { n: tk.n }));
    else Core.speak((tk.q ? tk.q + '. ' : '') + tk.options.map(function (o) { return label(tk, o); }).join('. '));
  }
  function showTask() {
    clearTimers();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    el.task.innerHTML = '';
    var prompt = { mail: S.promptMail, pair: S.promptPair, build: t(S.promptBuild, { n: tk.n }), share: S.promptShare, scenario: S.promptScenario, sourcePick: S.promptSourcePick, sourceWhy: S.promptSourceWhy,
      image: S.promptImage, data: S.promptData, feed: null }[tk.kind];
    if (prompt) el.task.appendChild(h('p', { class: 'oj-prompt' }, prompt));
    el.body = h('div', { class: 'oj-body nd-body k-' + tk.kind }); el.task.appendChild(el.body);
    el.feedback = h('div', { class: 'oj-feedback', role: 'status', 'aria-live': 'polite' }); el.task.appendChild(el.feedback);
    ({ mail: renderMail, build: renderBuild, share: renderShare, sourcePick: renderSourcePick, feed: renderFeed }[tk.kind] || renderChoice)(tk);
    el.task.classList.remove('enter'); void el.task.offsetWidth; el.task.classList.add('enter');
  }
  function optionButtons(tk, cls) {
    var box = h('div', { class: 'oj-options ' + (cls || 'col') });
    tk.options.forEach(function (o) { var b = h('button', { type: 'button', class: 'oj-opt wide', 'data-v': o, onclick: function () { answer(o, b); } }, label(tk, o)); box.appendChild(b); });
    return box;
  }
  function renderChoice(tk) {
    if (tk.kind === 'sourceWhy') el.body.appendChild(h('div', { class: 'nd-claim' }, [h('span', {}, S.claim), h('strong', {}, tk.q), h('em', {}, D.sourceSets[tk.set].pages[D.sourceSets[tk.set].best][0])]));
    else if (tk.kind === 'image') el.body.appendChild(h('figure', { class: 'nd-photo' }, [h('div', { class: 'nd-photo-frame', 'aria-hidden': 'true' }, h('span', { html: LENS })), h('figcaption', {}, [h('b', {}, S.imageLabel + ': '), tk.q])]));
    else if (tk.kind === 'pair') { /* the two passwords are the options */ }
    else if (tk.q) el.body.appendChild(h('div', { class: 'nd-card' }, h('strong', {}, tk.q)));
    el.body.appendChild(optionButtons(tk, tk.kind === 'pair' ? 'nd-two nd-pw' : 'col'));
  }

  /* ---------- message ---------- */
  function renderMail(tk) {
    var m = mail(tk.mail), clues = h('ul', { class: 'nd-clues' }), found = {};
    var name = m.from.replace(/\s*<.*>/, ''), addr = (m.from.match(/<(.*)>/) || [])[1];
    el.body.appendChild(h('article', { class: 'nd-mail' }, [
      h('div', { class: 'nd-mail-head' }, [h('span', { class: 'nd-avatar', 'aria-hidden': 'true' }, name.charAt(0)), h('div', {}, [h('strong', {}, name), addr ? h('span', { class: 'nd-addr' }, addr) : null])]),
      h('h3', {}, m.subject), h('p', {}, m.body)
    ]));
    var chips = h('div', { class: 'nd-inspect' }, [h('span', {}, S.inspect)].concat(m.parts.map(function (p, i) {
      var c = h('button', { type: 'button', class: 'nd-chip', html: LENS + '<span></span>', onclick: function () {
        if (found[i]) return; found[i] = 1; c.classList.add('on'); Core.play('step');
        clues.appendChild(h('li', {}, [h('b', {}, p[0] + ': '), p[1]]));
      } });
      c.querySelector('span').textContent = p[0];
      return c;
    })));
    el.body.appendChild(chips); el.body.appendChild(clues);
    el.body.appendChild(optionButtons(tk, 'nd-two nd-verdict'));
    el.body.appendChild(h('button', { type: 'button', class: 'btn ghost nd-adult', onclick: function () { setBob('encouraging', S.askAdultReply); } }, S.askAdult));
  }

  /* ---------- password builder ---------- */
  function strengthOf(words) {
    var len = words.join('-').length;
    return words.length >= 4 && len >= 20 ? 3 : words.length >= 3 && len >= 14 ? 2 : len >= 8 ? 1 : 0;
  }
  function renderBuild(tk) {
    var chosen = [], preview = h('div', { class: 'nd-pwbox' }), meter = h('div', { class: 'nd-meter' }), grid = h('div', { class: 'nd-cards' }), checkBtn, undoBtn;
    function draw() {
      preview.textContent = chosen.length ? chosen.map(function (c) { return c.personal ? '[' + c.w + ']' : c.w; }).join('-') : S.buildEmpty;
      preview.classList.toggle('empty', !chosen.length);
      var s = chosen.length ? strengthOf(chosen.map(function (c) { return c.w; })) : -1;
      meter.innerHTML = '';
      for (var i = 0; i < 4; i++) meter.appendChild(h('i', { class: i <= s ? 'on s' + s : '' }));
      if (s >= 0) meter.appendChild(h('span', {}, S.strength[s]));
      [].forEach.call(grid.children, function (b, k) { b.disabled = st.locked || chosen.indexOf(tk.cards[k]) >= 0 || chosen.length >= tk.n; });
      checkBtn.disabled = st.locked || chosen.length !== tk.n; undoBtn.disabled = st.locked || !chosen.length;
    }
    tk.cards.forEach(function (c) { grid.appendChild(h('button', { type: 'button', class: 'nd-word', onclick: function () { chosen.push(c); Core.play('click'); draw(); } }, c.w)); });
    checkBtn = h('button', { type: 'button', class: 'btn primary', onclick: function () { answer(chosen.slice(), preview); } }, S.check);
    undoBtn = h('button', { type: 'button', class: 'btn ghost', onclick: function () { chosen.pop(); draw(); } }, S.undo);
    el.build = { reset: function () { chosen = []; draw(); }, draw: draw, tk: tk };
    el.body.appendChild(h('div', { class: 'nd-pwlabel' }, S.buildPreview)); el.body.appendChild(preview); el.body.appendChild(meter); el.body.appendChild(grid);
    el.body.appendChild(h('div', { class: 'row center' }, [undoBtn, checkBtn]));
    draw();
  }

  /* ---------- share sorting ---------- */
  function renderShare(tk) {
    el.body.appendChild(h('div', { class: 'nd-card nd-item' }, h('strong', {}, tk.q)));
    var box = h('div', { class: 'oj-options nd-bins' });
    tk.options.forEach(function (o) { var b = h('button', { type: 'button', class: 'oj-opt nd-bin bin-' + o, 'data-v': o, onclick: function () { answer(o, b); } }, label(tk, o)); box.appendChild(b); });
    el.body.appendChild(box);
  }

  /* ---------- sources ---------- */
  function renderSourcePick(tk) {
    var set = D.sourceSets[tk.set];
    el.body.appendChild(h('div', { class: 'nd-claim' }, [h('span', {}, S.claim), h('strong', {}, set.claim)]));
    var box = h('div', { class: 'oj-options col nd-pages' });
    shuffle(set.pages).forEach(function (p) {
      var b = h('button', { type: 'button', class: 'oj-opt wide nd-page', 'data-v': p[0], onclick: function () { answer(p[0], b); } }, [h('strong', {}, p[0]), h('span', {}, p[1])]);
      box.appendChild(b);
    });
    el.body.appendChild(box);
  }

  /* ---------- feed ---------- */
  function renderFeed(tk) {
    el.body.appendChild(h('p', { class: 'oj-prompt' }, tk.q));
    var others = shuffle(D.feedTopics.filter(function (x) { return x !== tk.topic; })).slice(0, 3), posts = shuffle([tk.topic, tk.topic, tk.topic].concat(others));
    el.body.appendChild(h('div', { class: 'nd-feed', 'aria-hidden': 'true' }, posts.map(function (p) {
      return h('div', { class: 'nd-post t-' + p + (p === tk.topic ? ' liked' : '') }, [h('span', {}, p), p === tk.topic ? h('b', {}, '♥ ' + S.feedLiked) : null]);
    })));
    el.body.appendChild(optionButtons(tk, 'col'));
  }

  /* ---------- answers ---------- */
  function isRight(tk, value) {
    if (tk.type === 'build') return value.every(function (c) { return !c.personal; });
    return value === tk.answer;
  }
  function answer(value, node) {
    var tk = task(); if (!tk || st.locked) return;
    if (isRight(tk, value)) {
      st.locked = true;
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      if (tk.kind === 'mail') { var d = data(); if (!d.cases[tk.mail]) { d.cases[tk.mail] = 1; st.newCases++; } }
      Core.saveSoon();
      reveal(tk, node, true);
      Core.play('correct');
      setBob(first ? 'happy' : 'encouraging', pick(first ? S.correct : S.correctSecond));
      if (tk.explain || tk.kind === 'build') { // explanations are part of the learning: let the child read and move on
        el.feedback.appendChild(h('button', { type: 'button', class: 'btn primary', onclick: nextTask }, S.continue));
        el.feedback.querySelector('.btn').focus();
      } else later(nextTask, 1100);
      return;
    }
    st.attempt++;
    Core.play('wrong');
    if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake', 'wrong'); if (node.tagName === 'BUTTON') node.disabled = true; }
    var binary = tk.options && tk.options.length === 2;
    if (st.attempt === 1 && !binary) {
      setBob('thinking', S.tryAgain);
      var hint = tk.type === 'build' ? S.personalHint : tk.kind === 'share' ? S.shareHint : null;
      if (hint) { el.feedback.innerHTML = ''; el.feedback.appendChild(h('div', { class: 'oj-rule' }, h('p', {}, hint))); }
      if (tk.type === 'build') later(function () { node.classList.remove('wrong'); el.build.reset(); }, 900);
      return;
    }
    st.results.push(0); st.locked = true;
    reveal(tk, null, false);
    setBob('encouraging', binary ? S.wrongTwo : null);
    el.feedback.appendChild(h('button', { type: 'button', class: 'btn primary', onclick: nextTask }, S.continue));
    el.feedback.querySelector('.btn').focus();
  }
  function reveal(tk, node, ok) {
    [].forEach.call(el.body.querySelectorAll('.oj-opt'), function (b) { if (b.getAttribute('data-v') === tk.answer) b.classList.add('right'); b.disabled = true; });
    el.feedback.innerHTML = '';
    var box = h('div', { class: 'oj-rule' });
    if (tk.kind === 'mail') { // show every clue when the case is closed
      var m = mail(tk.mail);
      box.appendChild(h('p', {}, h('strong', {}, (m.safe ? S.safeLabel : S.scamLabel) + '. ')));
      box.lastChild.appendChild(document.createTextNode(m.signs));
      box.appendChild(h('ul', {}, m.parts.map(function (p) { return h('li', {}, [h('b', {}, p[0] + ': '), p[1]]); })));
      [].forEach.call(el.body.querySelectorAll('.nd-chip'), function (c) { c.disabled = true; });
    } else if (tk.type === 'build') {
      if (ok) { el.build.draw(); box.appendChild(h('p', {}, S.buildGood)); }
      else {
        var ex = shuffle(D.passwordCards.filter(function (c) { return !c.personal; })).slice(0, tk.n).map(function (c) { return c.w; }).join('-');
        box.appendChild(h('p', {}, t(S.buildExample, { a: ex }))); box.appendChild(h('p', {}, S.buildGood));
      }
    } else if (tk.explain) box.appendChild(h('p', {}, tk.explain));
    else if (!ok) box.appendChild(h('p', {}, t(S.answerWas, { a: label(tk, tk.answer) })));
    if (box.childNodes.length) el.feedback.appendChild(box);
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
      st.newCases ? h('p', {}, t(S.newCases, { n: st.newCases })) : null,
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
    _state: function () { return st; }, _gen: gen, _buildRound: buildRound, _strength: strengthOf }); // test hooks
})(window);
