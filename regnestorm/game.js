/*
 * Regnestorm – matematikspil.
 * Stormskyer med regnestykker driver ned mod byen. Rigtigt svar = lyn, der skyder skyen væk.
 * Forkert svar = hjælp og et nyt forsøg. Rolig tilstand fjerner tidspresset.
 */
(function (root) {
  'use strict';
  var Core = root.Core, Regn = root.Regn, Bob = root.Bob, S = root.STR.rs, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'regnestorm', WAVES = 10, BOSS_HITS = 3;

  var app = null, st = null, raf = 0, timers = [], clock = 0;
  var el = {}; // live DOM references for the play screen

  /* ---------- stored data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.topics = d.topics || {};
    d.worlds = d.worlds || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    if (d.zen === undefined) d.zen = false;
    return d;
  }
  function topicState(id, d) { d = d || data(); return d.topics[id] || (d.topics[id] = { level: 1, recent: [], answered: 0, firstTry: 0 }); }
  function worldState(id, d) { d = d || data(); return d.worlds[id] || (d.worlds[id] = { stars: 0, best: 0, plays: 0 }); }

  /* ---------- helpers ---------- */
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function renderMath(s) {
    return esc(s).replace(/(\d+)\/(\d+)/g, '<span class="frac"><span class="num">$1</span><span class="den">$2</span></span>');
  }
  // Cloud text: a short instruction ("Find x") on its own line above the problem.
  var PREFIX = /^(Find x|Som decimaltal|Skriv tallet): (.*)$/;
  function cloudHtml(text) {
    var m = text.match(PREFIX);
    return m ? '<span class="pre">' + esc(m[1]) + '</span><span class="main">' + renderMath(m[2]) + '</span>' : '<span class="main">' + renderMath(text) + '</span>';
  }
  function cloudSize(text) {
    var m = text.match(PREFIX), core = m ? m[2] : text;
    return core.length > 26 ? 'long' : core.length > 12 ? 'medium' : '';
  }
  var ICON = {
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
    speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h10a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 18H9l-5-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9.5l5 5M17 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function cloudSvg() {
    return '<svg viewBox="0 0 260 150" preserveAspectRatio="none" aria-hidden="true"><path d="M58,138 C22,138 8,112 20,90 C6,70 22,42 50,46 C56,18 92,6 118,22 C136,4 178,6 190,34 C222,28 248,52 240,80 C258,96 250,136 214,138 Z"/></svg>';
  }
  function citySvg() {
    var b = '<svg viewBox="0 0 1000 130" preserveAspectRatio="xMinYMax meet" aria-hidden="true">';
    var houses = [[0, 70, 90], [95, 45, 70], [170, 85, 110], [262, 55, 80], [322, 40, 120], [367, 70, 75], [442, 90, 100], [537, 60, 85], [602, 45, 125], [652, 80, 90], [737, 55, 105], [797, 75, 70], [877, 50, 115], [932, 68, 85]];
    var cols = ['#7FA6C9', '#9BBBD8', '#6F94B8', '#A9C6E0'];
    houses.forEach(function (hs, i) {
      var x = hs[0], w = hs[1], ht = hs[2], y = 130 - ht;
      b += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + ht + '" rx="4" fill="' + cols[i % 4] + '" stroke="#4A6A88" stroke-width="2"/>';
      for (var wy = y + 12; wy < 118; wy += 22) for (var wx = x + 9; wx < x + w - 12; wx += 18)
        b += '<rect x="' + wx + '" y="' + wy + '" width="9" height="11" rx="2" fill="' + ((wx + wy + i) % 3 ? '#FCE7A8' : '#E6F4FC') + '"/>';
    });
    b += '<rect x="0" y="124" width="1000" height="6" fill="#4A6A88"/></svg>';
    return b + b + b + b; // four tiles side by side, so the full height always shows on wide screens
  }

  /* ---------- game API for the hub ---------- */
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', stars = 0, list = Regn.bands[band];
    list.forEach(function (tp) { stars += ((d.worlds || {})[tp.id] || {}).stars || 0; });
    return { stars: stars, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    Regn.topics.forEach(function (tp) {
      var ts = (d.topics || {})[tp.id];
      if (!ts || !ts.answered) return;
      var ws = (d.worlds || {})[tp.id] || {};
      rows.push([tp.name + (tp.band === 'U' ? ' (U)' : ' (M)'), ts.level, ts.answered, Math.round(100 * ts.firstTry / ts.answered) + ' %', (ws.stars || 0) + '/3']);
    });
    return { head: S.reportHead, rows: rows };
  }

  function progress(d) {
    var out = { plays: 0, bands: { M: [], U: [] } };
    Regn.topics.forEach(function (tp) { var ws = (d.worlds || {})[tp.id] || {}; out.plays += ws.plays || 0; out.bands[tp.band === 'U' ? 'U' : 'M'].push(ws.stars || 0); });
    return out;
  }
  // Daily challenge: one problem from the weakest world in the band, at the child's level there (max 3).
  function quickTask(band, d) {
    var list = Regn.bands[band === 'U' ? 'U' : 'M'], id = Core.weakest(list.map(function (tp) { return tp.id; }), d.worlds);
    var level = Math.min(3, (((d.topics || {})[id] || {}).level) || 1);
    var p = Regn.generate(id, level, Regn.makeRand(Math.floor(Math.random() * 4294967296)));
    return { q: p.text, input: 'number', answer: p.answerText, hint: p.hint.text, hintHtml: p.hint.svg || null, explain: p.solution, speak: p.speech };
  }

  /* ---------- lifecycle ---------- */
  function mount(container) {
    app = container;
    document.addEventListener('visibilitychange', onVisibility);
    clock = setInterval(function () { if (st && st.playing && !st.paused && !document.hidden) Core.addTime(ID, 1); }, 1000);
    showMap();
  }
  function unmount() {
    stopLoop(); clearTimers(); clearInterval(clock);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    root.removeEventListener('resize', measure);
    st = null; el = {};
    Core.save();
  }
  function onVisibility() { if (document.hidden && st && st.playing && !st.paused && !st.over) pause(); }

  /* ================= MAP ================= */
  function showMap() {
    stopLoop(); clearTimers();
    document.removeEventListener('keydown', onKey);
    root.removeEventListener('resize', measure);
    st = null; el = {};
    var d = data(), list = Regn.bands[d.band];
    var nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (worldState(list[i].id, d).stars < 3) { nextIdx = i; break; }

    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    function sw(label, checked, fn) {
      return h('label', { class: 'switch' }, [h('input', { type: 'checkbox', checked: checked, onchange: function (e) { fn(e.target.checked); } }), h('span', { class: 'track', 'aria-hidden': 'true' }), label]);
    }
    var worlds = list.map(function (tp, i) {
      var ws = worldState(tp.id, d), ts = topicState(tp.id, d);
      return h('button', { type: 'button', class: 'rs-world' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startLevel(tp); } }, [
        h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)),
        i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
        h('strong', {}, tp.name),
        h('span', { class: 'rs-world-desc' }, tp.desc),
        h('span', { class: 'rs-world-foot' }, [h('span', { html: Core.starIcons(ws.stars, 3) }), h('span', { class: 'rs-lvl' }, t(S.levelN, { n: ts.level }))])
      ]);
    });
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen rs-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, [h('span', { class: 'ico', html: ICON.back }), SC.back])]),
      h('div', { class: 'rs-title' }, [
        h('div', { class: 'bob', html: Bob.svg({ expression: 'cheering', outfit: 'cape', size: 150 }) }),
        h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])
      ]),
      h('div', { class: 'rs-controls' }, [
        h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)]),
        h('div', { class: 'rs-switches' }, [
          sw(S.calmMode, d.zen, function (v) { d.zen = v; Core.save(); }),
          Core.canSpeak() ? sw(SC.readAloudAuto, !!Core.setting('speechAuto'), function (v) { Core.setting('speechAuto', v); }) : null
        ]),
        h('p', { class: 'muted small rs-calm-help' }, S.calmHelp)
      ]),
      h('h2', {}, S.chooseWorld),
      h('div', { class: 'rs-worlds' }, worlds)
    ]));
  }

  /* ================= PLAY ================= */
  function startLevel(tp) {
    clearTimers(); stopLoop();
    var d = data();
    st = { tp: tp, wave: 0, results: [], zen: d.zen, playing: true, paused: false, over: false, cloud: null, input: '', attempt: 0, locked: false, frozen: false, lastTs: 0, prob: null };
    app.innerHTML = '';

    el.waveTxt = h('span', { class: 'rs-wave' });
    el.dots = h('div', { class: 'rs-dots', 'aria-hidden': 'true' }, Array.apply(null, Array(WAVES)).map(function (_, i) { return h('span', { class: i === WAVES - 1 ? 'boss' : '' }); }));
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.pause, title: S.pause, html: ICON.pause, onclick: pause }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, tp.name), el.waveTxt]),
      el.dots,
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.readAloud, title: SC.readAloud, html: ICON.speak, onclick: function () { if (st && st.prob) Core.speak(st.prob.speech); } }) : h('span', { class: 'rs-iconbtn-space' })
    ]);

    el.sky = h('div', { class: 'rs-sky' }, [
      h('div', { class: 'rs-deco d1', html: cloudSvg() }), h('div', { class: 'rs-deco d2', html: cloudSvg() }),
      el.city = h('div', { class: 'rs-city', html: citySvg() }),
      el.bolt = h('div', { class: 'rs-bolt', 'aria-hidden': 'true' }),
      el.bob = h('div', { class: 'rs-bob' }),
      el.bubble = h('div', { class: 'rs-bubble', role: 'status', 'aria-live': 'polite' }),
      el.card = h('div', { class: 'rs-card', hidden: true })
    ]);
    el.sr = h('div', { class: 'visually-hidden', 'aria-live': 'assertive' });
    el.ans = h('div', { class: 'rs-ans', role: 'textbox', 'aria-readonly': 'true', 'aria-label': S.typeAnswer });
    el.pad = numberPad(tp);
    var panel = h('div', { class: 'rs-panel' }, [h('div', { class: 'rs-ans-row' }, [h('span', { class: 'rs-ans-label' }, S.typeAnswer), el.ans]), el.pad, el.sr]);
    el.root = h('div', { class: 'rs-play' + (st.zen ? ' zen' : '') }, [hud, h('div', { class: 'rs-main' }, [el.sky, panel])]);
    app.appendChild(el.root);

    measure();
    root.addEventListener('resize', measure);
    document.addEventListener('keydown', onKey);
    setBob('hello', Core.pick(S.bobStart));
    renderInput();
    later(nextWave, 1100);
    raf = requestAnimationFrame(loop);
  }

  function numberPad(tp) {
    function key(label, k, cls, aria) {
      return h('button', { type: 'button', class: 'rs-key ' + (cls || ''), 'data-key': k, 'aria-label': aria || label,
        onpointerdown: function (e) { e.preventDefault(); press(k); } , onclick: function (e) { if (e.detail === 0) press(k); } }, label);
    }
    var keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(function (n) { return key(n, n); });
    keys.push(tp.negative ? key(Regn.MINUS, '-', 'sym', S.minus) : h('span', { class: 'rs-key-space' }));
    keys.push(key('0', '0'));
    keys.push(tp.decimal ? key(',', ',', 'sym', S.comma) : h('span', { class: 'rs-key-space' }));
    var del = h('button', { type: 'button', class: 'rs-key del', 'aria-label': S.erase, onpointerdown: function (e) { e.preventDefault(); press('del'); }, onclick: function (e) { if (e.detail === 0) press('del'); } },
      [h('span', { class: 'ico', html: ICON.del }), S.erase]);
    keys.push(del);
    keys.push(key(S.ok, 'ok', 'ok wide'));
    return h('div', { class: 'rs-pad' }, keys);
  }

  function measure() {
    if (!el.sky) return;
    st && (st.skyW = el.sky.clientWidth, st.skyH = el.sky.clientHeight, st.cityH = el.city.clientHeight);
    // Bob scales with the sky: about a third of its height, between 110 and 220 px
    var bobPx = Math.round(Math.max(110, Math.min(220, el.sky.clientHeight * 0.32, el.sky.clientWidth * 0.34)));
    el.sky.style.setProperty('--bob', bobPx + 'px');
    if (st && st.cloud) placeCloud(st.cloud, true);
  }

  function setBob(expr, text) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: 'cape', size: 200 });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text) {
      el.bubble.textContent = text;
      el.bubble.classList.add('show');
      clearTimeout(el.bubbleTimer);
      el.bubbleTimer = setTimeout(function () { el.bubble && el.bubble.classList.remove('show'); }, 3800);
    }
  }

  function updateHud() {
    var boss = st.wave === WAVES;
    el.waveTxt.textContent = boss ? S.bossWave : t(S.wave, { n: st.wave, total: WAVES });
    [].forEach.call(el.dots.children, function (dot, i) {
      dot.className = (i === WAVES - 1 ? 'boss ' : '') + (i < st.results.length && i < WAVES - 1 ? (st.results[i] === 1 ? 'hit' : st.results[i] > 0 ? 'half' : 'miss') : '') + (i === st.wave - 1 ? ' now' : '');
    });
  }

  function duration(boss) {
    var lvl = topicState(st.tp.id).level;
    var base = st.tp.time + (lvl - 1) * 2;
    var speed = 1 - 0.03 * (st.wave - 1);
    return base * speed * (boss ? 1.4 : 1);
  }

  function nextWave() {
    if (!st) return;
    st.wave++;
    if (st.wave > WAVES) return finish();
    var boss = st.wave === WAVES;
    var c = { boss: boss, hits: boss ? BOSS_HITS : 1, p: 0, done: false };
    c.txt = h('div', { class: 'rs-cloud-text' });
    c.pips = boss ? h('div', { class: 'rs-pips', 'aria-hidden': 'true' }, [h('span'), h('span'), h('span')]) : null;
    c.el = h('div', { class: 'rs-cloud enter' + (boss ? ' boss' : '') }, [h('div', { class: 'rs-cloud-shape', html: cloudSvg() }), c.txt, c.pips]);
    el.sky.insertBefore(c.el, el.city);
    st.cloud = c; st.attempt = 0; st.frozen = false; st.locked = false;
    hideCard();
    newProblem();
    c.duration = duration(boss);
    updateHud();
    if (boss) { Core.play('level'); setBob('surprised', S.bossHelp); }
    later(function () { c.el.classList.remove('enter'); }, 600);
  }

  function newProblem() {
    var c = st.cloud;
    st.prob = Regn.generate(st.tp.id, topicState(st.tp.id).level);
    st.attempt = 0; st.input = ''; renderInput();
    c.txt.innerHTML = cloudHtml(st.prob.text);
    var size = cloudSize(st.prob.text);
    c.el.classList.toggle('long', size === 'long');
    c.el.classList.toggle('medium', size === 'medium');
    c.el.setAttribute('aria-label', st.prob.text);
    el.sr.textContent = st.prob.speech;
    // place horizontally once size is known
    var w = c.el.offsetWidth || 260;
    if (c.x === undefined) c.x = Math.max(8, Math.random() * Math.max(8, (st.skyW || 600) - w - 8));
    else c.x = Math.min(c.x, Math.max(8, (st.skyW || 600) - w - 8));
    placeCloud(c, true);
    if (Core.setting('speechAuto')) Core.speak(st.prob.speech);
  }

  function placeCloud(c, force) {
    if (!c || !c.el) return;
    var ch = c.el.offsetHeight || 140, top = 10;
    var bottom = (st.skyH || 400) - (st.cityH || 100) * 0.6 - ch;
    var p = st.zen ? 0.18 : c.p;
    var y = top + p * Math.max(0, bottom - top);
    if (st.zen) y += Math.sin(performance.now() / 700) * 6;
    var w = c.el.offsetWidth || 260;
    if (c.x + w > (st.skyW || 600) - 4) c.x = Math.max(4, (st.skyW || 600) - w - 4);
    c.el.style.transform = 'translate(' + Math.round(c.x) + 'px,' + Math.round(y) + 'px)';
    c.el.classList.toggle('low', !st.zen && c.p > 0.72);
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!st || !st.cloud) { if (st) st.lastTs = ts; return; }
    var dt = st.lastTs ? Math.min(0.05, (ts - st.lastTs) / 1000) : 0;
    st.lastTs = ts;
    var c = st.cloud;
    if (c.done) return;
    if (!st.paused && !st.frozen && !st.locked && !st.zen) {
      c.p += dt / c.duration;
      if (c.p >= 1) { c.p = 1; placeCloud(c); reachCity(); return; }
    }
    placeCloud(c);
  }

  /* ---------- input ---------- */
  function press(k) {
    if (!st || st.paused || st.over) return;
    if (st.locked) { if (k === 'ok' && el.continueBtn) el.continueBtn.click(); return; }
    if (!st.cloud || !st.prob) return;
    var s = st.input;
    if (k === 'ok') return submit();
    if (k === 'del') s = s.slice(0, -1);
    else if (k === '-') { if (!st.tp.negative) return; s = s.charAt(0) === '-' ? s.slice(1) : '-' + s; }
    else if (k === ',') { if (!st.tp.decimal || s.indexOf(',') >= 0) return; s += (s === '' || s === '-') ? '0,' : ','; }
    else if (/^\d$/.test(k)) { if (s.replace(/\D/g, '').length >= 8) return; s += k; }
    st.input = s;
    renderInput();
  }
  function renderInput() {
    if (!el.ans) return;
    el.ans.textContent = st.input ? st.input.replace('-', Regn.MINUS) : '';
    el.ans.classList.toggle('empty', !st.input);
  }
  function shake(node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }

  function onKey(e) {
    if (!st || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === 'Escape') { e.preventDefault(); if (st.paused) resume(); else if (!st.over) pause(); return; }
    if (st.paused || st.over) return;
    if (st.locked) { if (k === 'Enter' && document.activeElement !== el.continueBtn && el.continueBtn) { e.preventDefault(); el.continueBtn.click(); } return; }
    var map = null;
    if (/^\d$/.test(k)) map = k;
    else if (k === ',' || k === '.' || k === 'Decimal') map = ',';
    else if (k === '-' || k === 'Subtract' || k === '−') map = '-';
    else if (k === 'Backspace' || k === 'Delete') map = 'del';
    else if (k === 'Enter') map = 'ok';
    if (map) { e.preventDefault(); press(map); flashKey(map); }
  }
  function flashKey(k) {
    var b = el.pad && el.pad.querySelector('[data-key="' + (k === 'del' ? '' : k) + '"]');
    if (!b) return;
    b.classList.add('pressed'); setTimeout(function () { b.classList.remove('pressed'); }, 120);
  }

  /* ---------- answers ---------- */
  function submit() {
    var c = st.cloud, prob = st.prob;
    if (!st.input || st.input === '-' || isNaN(Regn.parseAnswer(st.input))) { shake(el.ans); setBob('thinking', S.emptyAnswer); return; }
    if (Regn.isCorrect(st.input, prob.answer)) {
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      if (first) adapt(true);
      hideCard(); st.frozen = false; c.el.classList.remove('frozen');
      strike(c);
      Core.play('zap'); later(function () { Core.play('correct'); }, 160);
      setBob(first ? 'happy' : 'encouraging', Core.pick(first ? S.correct : S.correctSecond));
      c.hits--;
      updateHud();
      if (c.hits > 0) {
        st.locked = true;
        c.el.classList.add('hit');
        markPips(c);
        later(function () { c.el.classList.remove('hit'); c.p = Math.max(0, c.p - 0.3); st.locked = false; newProblem(); }, 650);
      } else {
        c.done = true; st.locked = true;
        markPips(c);
        c.el.classList.add('poof');
        later(function () { c.el.remove(); st.cloud = null; st.locked = false; nextWave(); }, 900);
      }
      return;
    }
    st.attempt++;
    Core.play('wrong');
    shake(el.ans);
    if (st.attempt === 1) {
      adapt(false);
      st.frozen = true; c.el.classList.add('frozen');
      c.p = Math.min(c.p, 0.04); // lift the cloud so the hint card does not cover it
      st.input = ''; renderInput();
      setBob('encouraging', S.tryAgain);
      showCard(S.hintTitle, prob.hint.text, prob.hint.svg, false);
    } else {
      st.results.push(0);
      updateHud();
      showSolution(t(S.solution, { answer: prob.answerText }));
    }
  }

  function markPips(c) {
    if (!c.pips) return;
    [].forEach.call(c.pips.children, function (p, i) { p.classList.toggle('gone', i >= c.hits); });
  }

  function adapt(ok) {
    var ts = topicState(st.tp.id);
    ts.answered++; if (ok) ts.firstTry++;
    ts.recent.push(ok ? 1 : 0);
    if (ts.recent.length >= 5) {
      var sum = ts.recent.reduce(function (a, b) { return a + b; }, 0), msg = null;
      if (sum >= 4 && ts.level < 5) { ts.level++; msg = S.levelUp; }
      else if (sum <= 2 && ts.level > 1) { ts.level--; msg = S.levelDown; }
      ts.recent = [];
      if (msg) later(function () { if (st && !st.over) { if (ts.level && msg === S.levelUp) Core.play('level'); setBob(msg === S.levelUp ? 'cheering' : 'encouraging', msg); } }, 1300);
    }
    Core.saveSoon();
  }

  function reachCity() {
    var c = st.cloud;
    if (!c || c.done || st.locked) return;
    st.results.push(0);
    if (st.attempt === 0) adapt(false);
    updateHud();
    c.el.classList.add('raining');
    el.city.classList.add('wet');
    Core.play('rain');
    showSolution(t(S.reachedCity, { answer: st.prob.answerText }));
  }

  function showSolution(title) {
    var c = st.cloud, prob = st.prob;
    st.locked = true;
    st.input = ''; renderInput();
    setBob('encouraging', null);
    showCard(title, prob.solution + '.', prob.hint.svg, true, function () {
      el.city.classList.remove('wet');
      hideCard();
      if (c.boss && c.hits > 1) {
        c.hits--; markPips(c);
        c.el.classList.remove('raining', 'frozen');
        c.p = Math.min(c.p, 0.25);
        st.frozen = false; st.locked = false;
        newProblem();
      } else {
        c.done = true;
        c.el.classList.add('fade');
        later(function () { c.el.remove(); st.cloud = null; st.locked = false; nextWave(); }, 500);
      }
    });
  }

  function showCard(title, text, svg, withButton, onContinue) {
    var body = [h('strong', { class: 'rs-card-title' }, title), h('p', { html: renderMath(text).replace(/\.\./g, '.') })];
    if (svg) body.push(h('div', { class: 'rs-card-art', html: svg }));
    el.continueBtn = null;
    if (withButton) {
      el.continueBtn = h('button', { type: 'button', class: 'btn primary', onclick: function () { Core.play('click'); onContinue(); } }, S.continue);
      body.push(el.continueBtn);
    }
    el.card.innerHTML = '';
    body.forEach(function (b) { el.card.appendChild(b); });
    el.card.hidden = false;
    el.bubble.classList.remove('show'); // the card is Bob's message now
    el.card.classList.toggle('solution', !!withButton);
    el.root.classList.toggle('locked', !!withButton);
    if (el.continueBtn) setTimeout(function () { el.continueBtn && el.continueBtn.focus(); }, 50);
  }
  function hideCard() {
    if (!el.card) return;
    el.card.hidden = true; el.card.innerHTML = ''; el.continueBtn = null;
    el.root && el.root.classList.remove('locked');
  }

  function strike(c) {
    var sky = el.sky.getBoundingClientRect(), cr = c.el.getBoundingClientRect(), br = el.bob.getBoundingClientRect();
    var x1 = br.left - sky.left + br.width * 0.62, y1 = br.top - sky.top + br.height * 0.18;
    var x2 = cr.left - sky.left + cr.width / 2, y2 = cr.top - sky.top + cr.height * 0.8;
    var pts = [[x1, y1]], n = 6;
    for (var i = 1; i < n; i++) {
      var f = i / n;
      pts.push([x1 + (x2 - x1) * f + (Math.random() - 0.5) * 40, y1 + (y2 - y1) * f + (Math.random() - 0.5) * 20]);
    }
    pts.push([x2, y2]);
    var d = 'M' + pts.map(function (p) { return Math.round(p[0]) + ',' + Math.round(p[1]); }).join(' L');
    el.bolt.innerHTML = '<svg width="100%" height="100%"><path d="' + d + '" class="glow"/><path d="' + d + '" class="core"/></svg>';
    el.bolt.classList.remove('flash'); void el.bolt.offsetWidth; el.bolt.classList.add('flash');
    el.sky.classList.remove('flash'); void el.sky.offsetWidth; el.sky.classList.add('flash');
  }

  /* ---------- pause & finish ---------- */
  function overlay(children) {
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, children));
    app.appendChild(o);
    return o;
  }
  function pause() {
    if (!st || st.paused || st.over) return;
    st.paused = true;
    Core.stopSpeaking();
    var resumeBtn = h('button', { type: 'button', class: 'btn primary', onclick: resume }, S.resume);
    st.pauseEl = overlay([
      h('div', { class: 'bob', html: Bob.svg({ expression: 'waiting', outfit: 'cape', size: 130 }) }),
      h('h2', {}, S.paused),
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.quit), resumeBtn])
    ]);
    resumeBtn.focus();
  }
  function resume() {
    if (!st || !st.paused) return;
    st.paused = false; st.lastTs = 0;
    if (st.pauseEl) { st.pauseEl.remove(); st.pauseEl = null; }
  }

  function finish() {
    st.playing = false; st.over = true; stopLoop();
    var total = st.results.length, sum = st.results.reduce(function (a, b) { return a + b; }, 0);
    var acc = total ? sum / total : 0;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0;
    var firstCount = st.results.filter(function (r) { return r === 1; }).length;
    var ws = worldState(st.tp.id), newBest = stars > ws.stars;
    var before = ws.stars;
    ws.stars = Math.max(ws.stars, stars); ws.best = Math.max(ws.best, Math.round(acc * 100)); ws.plays++;
    Core.save();
    var badgeNode = Core.roundDone(ID, st.tp.id, ws.plays > 1 ? before : null, ws.stars); // before = null on the first play

    var list = Regn.bands[data().band], idx = list.indexOf(st.tp), next = list[idx + 1];
    var tp = st.tp;
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var dlg = overlay([
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: 'cape', size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]),
      starBox,
      newBest && stars > 0 ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: firstCount, total: total })),
      badgeNode,
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
      h('div', { class: 'row center' }, [
        h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap),
        h('button', { type: 'button', class: 'btn secondary', onclick: function () { startLevel(tp); } }, S.playAgain),
        next ? h('button', { type: 'button', class: 'btn primary', onclick: function () { startLevel(next); } }, S.nextWorld) : null
      ])
    ]);
    Core.play(stars ? 'win' : 'click');
    var starEls = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) {
      later(function () { starEls[i].classList.remove('off'); starEls[i].classList.add('on', 'pop'); Core.play('star'); }, 500 + i * 380);
    })(i);
    var btn = dlg.querySelector('.btn.primary') || dlg.querySelector('.btn.secondary');
    btn && btn.focus();
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask,
    _state: function () { return st; } }); // _state is only used by the automated tests
})(window);
