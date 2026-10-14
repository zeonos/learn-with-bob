/*
 * Tankespind – tænkeopgaver i stil med IQ-opgaver, men uden IQ-tal.
 * Bob har et tårn med en etage for hver slags opgave. Niveauet (1–5) følger barnet: efter en god runde
 * bliver opgaverne lidt sværere, efter en svær runde lidt lettere. Opgaverne laves i puzzles.js.
 */
(function (root) {
  'use strict';
  var Core = root.Core, P = root.TK, Bob = root.Bob, S = root.STR.tk, SC = root.STR.core;
  var h = Core.h, t = Core.t;
  var ID = 'tankespind', STEPS = 8, OUTFIT = 'thinker', LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var app = null, st = null, timers = [], clock = 0, el = {};

  /* ---------- data ---------- */
  function data() {
    var d = Core.gameData(ID);
    d.routes = d.routes || {}; d.lv = d.lv || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function route(id) { return P.ROUTES.filter(function (r) { return r.id === id; })[0]; }
  function routeState(id) { var d = data(); return d.routes[id] || (d.routes[id] = { stars: 0, best: 0, plays: 0 }); }
  function levelOf(r, d) { d = d || data(); var l = (d.lv || {})[r.id]; return Math.max(r.min, Math.min(r.max, l || r.min)); }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function nameOf(r) { return S.routes[r.id][0]; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------- drawing (plain HTML strings, also used by the daily challenge) ---------- */
  var BOX = 'display:inline-flex;align-items:center;justify-content:center;background:#fff;border:2px solid #E3D6BB;border-radius:10px;margin:3px;vertical-align:middle;';
  function cell(inner, px) { return '<span class="tk-cell" style="' + BOX + 'width:' + px + 'px;height:' + px + 'px">' + inner + '</span>'; }
  function figCell(f, px) { return cell(P.figSvg(f, px - 8), px); }
  function qCell(px) { return cell('<span style="font-size:' + Math.round(px * 0.5) + 'px;font-weight:800;color:#B07A3A">?</span>', px); }
  function lettered(list, px) { // options drawn with letters, for the daily challenge
    return '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;margin-top:8px">' + list.map(function (html, i) {
      return '<span style="display:inline-flex;flex-direction:column;align-items:center">' + html + '<b style="font-family:system-ui,sans-serif;color:#4A2C17">' + LETTERS[i] + '</b></span>';
    }).join('') + '</div>';
  }
  function stage(tk, px) { // the picture part of a task (everything above the answer buttons)
    px = px || 88;
    switch (tk.type) {
      case 'figrow': return tk.seq.map(function (f) { return figCell(f, px); }).join('') + qCell(px);
      case 'matrix': return '<span class="tk-grid" style="display:inline-grid;grid-template-columns:repeat(3,' + (px + 6) + 'px)">' + tk.grid.map(function (f) { return f ? figCell(f, px) : qCell(px); }).join('') + '</span>';
      case 'analogy': return tk.kind === 'fig' ? figCell(tk.a, px) + '<b class="tk-arrow">→</b>' + figCell(tk.b, px) + '<span class="tk-gap"></span>' + figCell(tk.c, px) + '<b class="tk-arrow">→</b>' + qCell(px) : '';
      case 'turn': return P.polySvg(tk.base, Math.round(px * 1.35), { axis: tk.mode === 'mirror' ? tk.axis : null, color: '#F2C94C' });
      case 'fold':
        var parts = [];
        for (var i = 0; i < tk.folds.length; i++) parts.push(P.foldStepSvg(tk.folds, i, null, Math.round(px * 1.1)));
        parts.push(P.foldStepSvg(tk.folds, tk.folds.length, tk.holes, Math.round(px * 1.1)));
        return parts.join('<b class="tk-arrow">→</b>');
      case 'code': return '<span class="tk-eqs" style="display:inline-flex;flex-direction:column;align-items:flex-start;gap:4px">' + tk.eqs.map(function (e) { return P.codeSvg(e, tk.syms, 0.8); }).join('') + '</span>';
    }
    return '';
  }
  function optionHtml(tk, o, px) {
    if (tk.type === 'turn') return P.polySvg(o, px);
    if (tk.type === 'fold') return P.foldStepSvg([], 0, o, px);
    return P.figSvg(o, px - 8);
  }
  function promptOf(tk) {
    var p = S.prompts;
    if (tk.type === 'analogy') return tk.kind === 'fig' ? p.analogyFig : p.analogyWord;
    if (tk.type === 'turn') return tk.mode === 'mirror' ? p.mirror : p.turn;
    if (tk.type === 'code') return t(p.code, { name: S.symDef[tk.syms[tk.ask][0]] });
    return p[tk.type];
  }
  function answerText(tk) {
    if (tk.type === 'numrow' || tk.type === 'code') return String(tk.options[tk.answer]);
    if (tk.type === 'odd' && tk.kind !== 'fig') return String(tk.items[tk.answer]);
    if (tk.type === 'analogy' && tk.kind === 'word') return tk.options[tk.answer];
    return LETTERS[tk.type === 'odd' ? tk.answer : tk.answer];
  }

  /* ---------- hub API ---------- */
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = P.ROUTES.filter(function (r) { return r.b === band; });
    list.forEach(function (r) { n += ((d.routes || {})[r.id] || {}).stars || 0; });
    return { stars: n, max: list.length * 3 };
  }
  function parentReport(d) {
    var rows = [];
    P.ROUTES.forEach(function (r) { var rs = (d.routes || {})[r.id]; if (rs && rs.plays) rows.push([nameOf(r) + ' (' + r.b + ')', rs.stars + '/3', levelOf(r, d) + '/' + r.max]); });
    return { head: S.reportHead, rows: rows };
  }
  function progress(d) { return Core.routeProgress(d, P.ROUTES); }
  // Daily challenge: one task from the weakest floor, at the child's level there
  function quickTask(band, d) { return P.ids('dq' + Math.floor(Math.random() * 1e6).toString(36), function () { return quick(band, d); }); } // seeded on the daily page, so the same day draws the same picture
  function quick(band, d) {
    var list = P.ROUTES.filter(function (r) { return r.b === band; }), rid = Core.weakest(list.map(function (r) { return r.id; }), d.routes), r = route(rid);
    var tk = P.make(r.kind, Math.random, levelOf(r, d), band), q = promptOf(tk), base = { q: q, hint: tk.hint, explain: tk.explain };
    function x(o) { for (var k in base) if (o[k] === undefined) o[k] = base[k]; return o; }
    var letters = LETTERS.slice(0, (tk.options || tk.items).length);
    switch (tk.type) {
      case 'numrow': return x({ big: tk.seq.join(', ') + ', ?', options: tk.options.map(String), answer: String(tk.options[tk.answer]) });
      case 'code': return x({ html: stage(tk, 60), options: tk.options.map(String), answer: String(tk.options[tk.answer]) });
      case 'odd':
        if (tk.kind !== 'fig') return x({ options: tk.items.map(String), answer: String(tk.items[tk.answer]) });
        return x({ html: lettered(tk.items.map(function (f) { return figCell(f, 58); }), 58), options: letters, answer: LETTERS[tk.answer] });
      case 'analogy':
        if (tk.kind === 'word') return x({ big: t(S.analogyLine, { a: tk.a, b: tk.b, c: tk.c }), options: tk.options, answer: tk.options[tk.answer] });
        break;
    }
    return x({ html: '<div style="text-align:center">' + stage(tk, 56) + '</div>' + lettered(tk.options.map(function (o) { return cell(optionHtml(tk, o, 54), 60); }), 60), options: letters, answer: LETTERS[tk.answer] });
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearTimers(); clearInterval(clock); Core.stopSpeaking(); st = null; el = {}; Core.save(); }

  /* ================= MAP ================= */
  function showMap() {
    clearTimers(); Core.stopSpeaking(); st = null; el = {};
    var d = data(), list = P.ROUTES.filter(function (r) { return r.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (routeState(list[i].id).stars < 3) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen tk-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back)]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoute),
      h('div', { class: 'rs-worlds' }, list.map(function (r, i) {
        var rs = routeState(r.id);
        return h('button', { type: 'button', class: 'rs-world tk-route' + (i === nextIdx ? ' next' : ''), onclick: function () { Core.play('click'); startRound(r); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, nameOf(r)), h('span', { class: 'rs-world-desc' }, S.routes[r.id][1]),
          h('span', { class: 'tk-level' }, t(S.level, { n: levelOf(r, d), max: r.max })),
          h('span', { class: 'rs-world-foot' }, h('span', { html: Core.starIcons(rs.stars, 3) }))
        ]);
      })),
      h('p', { class: 'muted tk-noiq' }, S.noIq)
    ]));
  }

  /* ================= PLAY ================= */
  function startRound(r) {
    clearTimers(); Core.stopSpeaking();
    var lvl = levelOf(r);
    st = { route: r, level: lvl, tasks: P.buildRound(r, lvl, Math.random, STEPS), i: 0, results: [], attempt: 0, locked: false };
    app.innerHTML = '';
    el.step = h('span', { class: 'rs-wave' });
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, nameOf(r)), el.step]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onclick: readTask }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.scene = h('div', { class: 'oj-scene tk-scene' });
    el.scene.innerHTML = '<div class="tk-room" aria-hidden="true"><i class="tk-window"></i><i class="tk-board"><b>?</b><em></em></i><i class="tk-shelf s1"></i><i class="tk-shelf s2"></i></div>';
    el.bob = h('div', { class: 'oj-bob tk-bob' }); el.bubble = h('div', { class: 'oj-bubble', role: 'status', 'aria-live': 'polite' });
    el.scene.appendChild(el.bob); el.scene.appendChild(el.bubble);
    el.task = h('div', { class: 'oj-task' });
    el.root = h('div', { class: 'oj-play tk-play' }, [hud, el.scene, h('div', { class: 'oj-task-wrap' }, el.task)]);
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
  function readTask() {
    var tk = task(); if (!tk) return;
    var extra = tk.type === 'numrow' ? tk.seq.join(', ') : tk.type === 'odd' && tk.kind !== 'fig' ? tk.items.join(', ')
      : tk.type === 'analogy' && tk.kind === 'word' ? t(S.analogyLine, { a: tk.a, b: tk.b, c: tk.c }).replace(/:/g, 'til').replace('?', '') + '. ' + tk.options.join(', ') : '';
    Core.speak(promptOf(tk) + (extra ? ' ' + extra : ''));
  }
  function showTask() {
    clearTimers();
    var tk = task(); if (!tk) return finish();
    st.attempt = 0; st.locked = false;
    el.step.textContent = t(S.step, { n: st.i + 1, total: st.tasks.length });
    el.task.innerHTML = '';
    el.task.appendChild(h('p', { class: 'oj-prompt tk-prompt' }, promptOf(tk)));
    el.body = h('div', { class: 'oj-body tk-body k-' + tk.type }); el.task.appendChild(el.body);
    el.feedback = h('div', { class: 'oj-feedback', role: 'status', 'aria-live': 'polite' }); el.task.appendChild(el.feedback);
    var st0 = stage(tk);
    if (st0) el.body.appendChild(h('div', { class: 'tk-stage', html: st0 }));
    if (tk.type === 'numrow') el.body.appendChild(h('p', { class: 'tk-numrow' }, tk.seq.join(', ') + ', ?'));
    if (tk.type === 'analogy' && tk.kind === 'word') el.body.appendChild(h('p', { class: 'tk-analogy' }, [h('b', {}, tk.a), ' : ', h('b', {}, tk.b), h('span', { class: 'tk-som' }, ' er som '), h('b', {}, tk.c), ' : ?']));
    renderOptions(tk);
    el.task.classList.remove('enter'); void el.task.offsetWidth; el.task.classList.add('enter');
  }
  function renderOptions(tk) {
    var box, figs = tk.type === 'figrow' || tk.type === 'matrix' || tk.type === 'turn' || tk.type === 'fold' || (tk.type === 'analogy' && tk.kind === 'fig');
    if (tk.type === 'odd') { // the items themselves are the buttons
      box = h('div', { class: 'tk-items k-' + tk.kind });
      tk.items.forEach(function (it, i) {
        var b = h('button', { type: 'button', class: 'oj-opt tk-item', 'data-i': i, 'aria-label': tk.kind === 'fig' ? t(S.optionLabel, { l: LETTERS[i] }) + ': ' + P.describe(it) : String(it), onclick: function () { answer(i, b); } },
          tk.kind === 'fig' ? h('span', { html: P.figSvg(it, 64) }) : String(it));
        box.appendChild(b);
      });
    } else if (figs) {
      box = h('div', { class: 'tk-figopts' });
      tk.options.forEach(function (o, i) {
        var label = t(S.optionLabel, { l: LETTERS[i] }) + (tk.type === 'figrow' || tk.type === 'matrix' || tk.type === 'analogy' ? ': ' + P.describe(o) : '');
        var b = h('button', { type: 'button', class: 'oj-opt tk-figopt', 'data-i': i, 'aria-label': label, onclick: function () { answer(i, b); } },
          [h('span', { class: 'tk-figart', html: optionHtml(tk, o, tk.type === 'turn' || tk.type === 'fold' ? 86 : 74) }), h('b', { class: 'tk-letter' }, LETTERS[i])]);
        box.appendChild(b);
      });
    } else {
      box = h('div', { class: 'oj-options tk-textopts' });
      tk.options.forEach(function (o, i) { var b = h('button', { type: 'button', class: 'oj-opt', 'data-i': i, onclick: function () { answer(i, b); } }, String(o)); box.appendChild(b); });
    }
    el.body.appendChild(box);
  }

  /* ---------- answers ---------- */
  function answer(i, node) {
    var tk = task(); if (!tk || st.locked) return;
    if (i === tk.answer) {
      st.locked = true;
      var first = st.attempt === 0;
      st.results.push(first ? 1 : 0.5);
      Core.saveSoon();
      reveal(tk, true);
      Core.play('correct');
      setBob(first ? 'happy' : 'encouraging', pick(first ? S.correct : S.correctSecond));
      return;
    }
    st.attempt++;
    Core.play('wrong');
    if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake', 'wrong'); node.disabled = true; }
    var two = (tk.options || tk.items).length <= 2;
    if (st.attempt === 1 && !two) {
      setBob('thinking', S.tryAgain);
      el.feedback.innerHTML = '';
      el.feedback.appendChild(h('div', { class: 'oj-rule' }, h('p', {}, tk.hint)));
      return;
    }
    st.results.push(0); st.locked = true;
    reveal(tk, false);
    setBob('encouraging', null);
    el.bubble.classList.remove('show'); // the »try again« words no longer fit
  }
  function reveal(tk, ok) {
    [].forEach.call(el.body.querySelectorAll('[data-i]'), function (b) { b.disabled = true; if (+b.getAttribute('data-i') === tk.answer) b.classList.add('right'); });
    if (tk.type === 'matrix' || tk.type === 'figrow') { var q = el.body.querySelector('.tk-stage .tk-cell:last-child, .tk-grid .tk-cell:last-child'); if (q) q.innerHTML = P.figSvg(tk.type === 'matrix' ? tk.solution : tk.options[tk.answer], 80); }
    el.feedback.innerHTML = '';
    var box = h('div', { class: 'oj-rule' + (ok ? '' : ' final') });
    if (!ok) box.appendChild(h('p', {}, h('strong', {}, t(S.answerWas, { a: answerText(tk) }))));
    box.appendChild(h('p', {}, tk.explain));
    el.feedback.appendChild(box);
    var next = h('button', { type: 'button', class: 'btn primary tk-next', onclick: nextTask }, S.continue);
    el.feedback.appendChild(next); next.focus();
  }
  function nextTask() { Core.play('step'); st.i++; showTask(); }

  /* ---------- finish: stars and the next level ---------- */
  function finish() {
    clearTimers();
    var total = st.results.length || 1, sum = st.results.reduce(function (a, b) { return a + b; }, 0), acc = sum / total;
    var stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.5 ? 1 : 0, first = st.results.filter(function (r) { return r === 1; }).length, r = st.route, d = data();
    var rs = routeState(r.id), newBest = stars > rs.stars, before = rs.stars;
    rs.stars = Math.max(rs.stars, stars); rs.best = Math.max(rs.best, Math.round(100 * first / total)); rs.plays++;
    var lvl = st.level, newLvl = acc >= 0.85 ? Math.min(r.max, lvl + 1) : acc < 0.5 ? Math.max(r.min, lvl - 1) : lvl;
    d.lv[r.id] = newLvl;
    Core.save();
    var badgeNode = Core.roundDone(ID, r.id, rs.plays > 1 ? before : null, rs.stars);
    setBob(stars >= 2 ? 'cheering' : 'happy', null);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var o = h('div', { class: 'rs-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : stars === 1 ? 'happy' : 'encouraging', outfit: OUTFIT, size: 150 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest && stars ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', {}, t(S.resultText, { correct: first, total: st.results.length })),
      newLvl > lvl ? h('p', { class: 'tk-lvlmsg' }, S.levelUp) : newLvl < lvl ? h('p', { class: 'tk-lvlmsg' }, S.levelDown) : null,
      h('p', { class: 'muted' }, t(S.resultLevel, { n: newLvl, max: r.max })),
      stars === 0 ? h('p', { class: 'muted' }, S.resultTip) : null,
      badgeNode,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: function () { startRound(r); } }, S.playAgain)])
    ]));
    app.appendChild(o);
    Core.play(stars ? 'win' : 'click');
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    o.querySelector('.btn.primary').focus();
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport,
    progress: progress, quickTask: quickTask,
    _state: function () { return st; }, _stage: stage, _show: function () { showTask(); } }); // test hooks
})(window);
