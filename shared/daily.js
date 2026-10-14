/*
 * Dagens udfordring: tre små opgaver fra tre spil om dagen, en kalender og en stime.
 * Regler: ingen tid, tip efter første forkerte svar og svaret efter andet. Forkerte svar gennemfører også.
 * Opgaverne vælges ud fra profil og dato, så en genindlæsning giver de samme tre. En ny dag starter ved midnat
 * på enhedens ur. En glemt dag kan ikke spilles bagefter. Én hviledag pr. uge holder stimen i live.
 * Logikken øverst (dateKey, streak …) er ren og testes med node tools/test-badges-daily.js.
 */
(function (root) {
  'use strict';

  /* ---------- pure date and streak logic ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); } // noon: safe across summer time
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
  function weekKey(k) { var d = parseKey(k), wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dateKey(d); } // the Monday
  // Walks from the first day played to today. A missed day is a rest day if the week has not used one and a streak is running.
  // Returns { current, best, rest: {dateKey: true} }. Today not played yet does not break the streak.
  function streak(days, today) {
    var keys = Object.keys(days || {}).filter(function (k) { return days[k] && k <= today; }).sort();
    var out = { current: 0, best: 0, rest: {} };
    if (!keys.length) return out;
    var cur = 0, restWeek = {}, pendingRest = [];
    for (var k = keys[0]; k <= today; k = addDays(k, 1)) {
      if (days[k]) {
        cur++; pendingRest.forEach(function (r) { out.rest[r] = true; }); pendingRest = [];
        if (cur > out.best) out.best = cur;
      } else if (k === today) {
        break; // still time to play today
      } else if (cur > 0 && !restWeek[weekKey(k)]) {
        restWeek[weekKey(k)] = true; cur++; pendingRest.push(k);
      } else { cur = 0; pendingRest = []; }
    }
    pendingRest.forEach(function (r) { out.rest[r] = true; }); // yesterday's rest keeps the current streak alive
    out.current = cur;
    if (out.current > out.best) out.best = out.current;
    return out;
  }
  function bestMonth(days) {
    var m = {}; Object.keys(days || {}).forEach(function (k) { if (days[k]) m[k.slice(0, 7)] = (m[k.slice(0, 7)] || 0) + 1; });
    return Math.max.apply(null, [0].concat(Object.keys(m).map(function (x) { return m[x]; })));
  }
  // Chooses three games: the ones played before come first; others fill up if fewer than three have been played.
  function chooseGames(played, others, seed, rngFn) {
    var r = rngFn(seed);
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
    return shuffle(played).concat(shuffle(others));
  }
  // Compares a typed answer with the right one: numbers by value (3,5 = 3.5; −4 = -4), words without case and spaces
  function sameAnswer(typed, right) {
    function num(s) { s = String(s).replace(/\s+/g, '').replace(/−/g, '-').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN; }
    var a = num(typed), b = num(right);
    if (!isNaN(a) && !isNaN(b)) return Math.abs(a - b) < 1e-9;
    return String(typed).trim().toLowerCase().replace(/\s+/g, ' ') === String(right).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  var pure = { dateKey: dateKey, parseKey: parseKey, addDays: addDays, weekKey: weekKey, streak: streak, bestMonth: bestMonth, chooseGames: chooseGames, sameAnswer: sameAnswer };
  if (typeof module !== 'undefined' && module.exports) { module.exports = pure; }
  if (typeof document === 'undefined') return;

  /* ---------- in the browser ---------- */
  var Core = root.Core, S = root.STR.core, h = Core.h, t = Core.t;
  function state(p) { p = p || Core.profile(); if (!p) return null; p.daily = p.daily || {}; p.daily.days = p.daily.days || {}; return p.daily; }
  function today() { return dateKey(); }
  function titleOf(id) { return (S.games.filter(function (g) { return g.id === id; })[0] || {}).title || id; }
  function outfitOf(id) { return (S.games.filter(function (g) { return g.id === id; })[0] || {}).outfit; }

  // Today's three tasks (made once per day and saved, so reloading shows the same ones)
  function todays() {
    var p = Core.profile(), dl = state(p), date = today();
    if (dl.today && dl.today.date === date) return dl.today;
    var band = p.band === 'U' ? 'U' : 'M', played = [], others = [];
    (root.GAMES || []).forEach(function (m) {
      var g = Core.games[m.id]; if (!g || !g.quickTask) return;
      var pr = g.progress ? g.progress(Core.gameData(m.id)) : { plays: 0 };
      (pr.plays > 0 ? played : others).push(m.id);
    });
    var order = chooseGames(played, others, p.id + ':' + date, Core.rng), tasks = [];
    for (var i = 0; i < order.length && tasks.length < 3; i++) {
      var id = order[i], task = null;
      try { task = Core.seeded(p.id + ':' + date + ':' + id, function () { return Core.games[id].quickTask(band, Core.gameData(id)); }); }
      catch (e) { console.error(e); }
      if (task && (task.options ? task.options.indexOf(task.answer) >= 0 : task.input)) tasks.push({ game: id, task: JSON.parse(JSON.stringify(task)) });
    }
    dl.today = { date: date, tasks: tasks, results: [] };
    Core.save();
    return dl.today;
  }
  function stats(p) {
    var dl = state(p), s = streak(dl.days, today());
    return { days: Object.keys(dl.days).filter(function (k) { return dl.days[k]; }).length, current: s.current, best: s.best, bestMonth: bestMonth(dl.days), rest: s.rest };
  }
  function streakText(n) { return n === 0 ? S.dailyStreak0 : n === 1 ? S.dailyStreak1 : t(S.dailyStreak, { n: n }); }

  /* ---------- the banner on the hub ---------- */
  function banner(slot) {
    if (!slot) return;
    var td = todays(), st = stats(), done = td.results.length >= td.tasks.length && td.tasks.length > 0;
    slot.innerHTML = '';
    if (!td.tasks.length) return;
    var cards = td.tasks.map(function (x, i) {
      var res = td.results[i], cls = res === undefined ? '' : res === 1 ? ' ok' : ' tried';
      return h('div', { class: 'daily-card' + cls }, [h('div', { class: 'daily-bob', html: root.Bob.svg({ expression: 'hello', outfit: outfitOf(x.game), size: 60, crop: 'head' }) }),
        h('span', {}, titleOf(x.game)), h('span', { class: 'daily-mark', 'aria-hidden': 'true' }, res === undefined ? String(i + 1) : '✓')]);
    });
    slot.appendChild(h('section', { class: 'daily-banner card' + (done ? ' done' : '') }, [
      h('div', { class: 'daily-head' }, [h('h2', {}, S.dailyTitle), h('p', { class: 'daily-streak' + (st.current ? '' : ' zero') }, streakText(st.current))]),
      h('div', { class: 'daily-cards' }, cards),
      h('p', { class: 'muted daily-text' }, done ? S.dailyDone : S.dailyIntro),
      h('div', { class: 'row' }, [
        done ? null : h('button', { type: 'button', class: 'btn primary daily-go', onclick: function () { Core.play('click'); player(slot); } }, td.results.length ? S.dailyContinue : S.dailyStart),
        h('a', { class: 'btn ghost', href: '#/kalender' }, S.dailyCalendar)
      ])
    ]));
  }

  /* ---------- the compact player ---------- */
  function player(slot) {
    var td = todays(), i = td.results.length, attempt = 0, firstRight = 0;
    var body = h('div', { class: 'daily-body' }), o = h('div', { class: 'rs-overlay daily-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': S.dailyTitle },
      h('div', { class: 'card rs-dialog daily-dialog' }, [h('button', { type: 'button', class: 'daily-x', 'aria-label': S.dailyClose, onclick: close }, '×'), body]));
    document.body.appendChild(o);
    function close() { o.remove(); banner(slot); }
    function show() {
      body.innerHTML = '';
      if (i >= td.tasks.length) return finished();
      attempt = 0;
      var x = td.tasks[i], tk = x.task, fb = h('div', { class: 'daily-feedback', role: 'status', 'aria-live': 'polite' }), locked = false;
      body.appendChild(h('p', { class: 'daily-step' }, [h('span', { class: 'daily-minibob', html: root.Bob.svg({ expression: 'hello', outfit: outfitOf(x.game), size: 34, crop: 'head' }) }), t(S.dailyTaskOf, { n: i + 1 }) + ' · ' + titleOf(x.game)]));
      body.appendChild(h('p', { class: 'daily-q' }, tk.q));
      if (tk.html) body.appendChild(h('div', { class: 'daily-html', html: tk.html }));
      if (tk.big) body.appendChild(h('p', { class: 'daily-big', lang: tk.bigLang || null }, tk.big));
      if (tk.sub) body.appendChild(h('p', { class: 'daily-sub' }, tk.sub));
      if (tk.speak || Core.canSpeak()) {
        var say = tk.speak || [tk.q, tk.big, tk.sub].filter(Boolean).join('. ');
        if (Core.canSpeak(tk.speakLang || 'da')) body.appendChild(h('button', { type: 'button', class: 'chip daily-say', onclick: function () { Core.speak(say, tk.speakLang || 'da'); } }, S.readAloud));
      }
      function wrong(node) {
        attempt++; Core.play('wrong');
        if (node) { node.classList.add('wrong'); if (node.tagName === 'BUTTON') node.disabled = true; }
        fb.innerHTML = '';
        if (attempt === 1) {
          fb.appendChild(h('div', { class: 'oj-rule daily-hint' }, [h('p', {}, S.dailyTryAgain), tk.hint ? h('p', {}, tk.hint) : null, tk.hintHtml ? h('div', { class: 'daily-html', html: tk.hintHtml }) : null]));
          return;
        }
        end(0);
      }
      function end(score) {
        locked = true;
        td.results.push(score); if (score === 1) firstRight++;
        Core.save();
        [].forEach.call(body.querySelectorAll('.daily-opt'), function (b) { b.disabled = true; if (b.getAttribute('data-v') === tk.answer) b.classList.add('right'); });
        fb.innerHTML = '';
        var box = h('div', { class: 'oj-rule' });
        if (score) box.appendChild(h('p', {}, h('strong', {}, Core.pick(S.dailyRight))));
        else box.appendChild(h('p', {}, h('strong', {}, t(S.dailyAnswer, { a: tk.answer + (tk.unit ? ' ' + tk.unit : '') }))));
        if (tk.explain) box.appendChild(h('p', { lang: tk.explainLang || null }, tk.explain));
        fb.appendChild(box);
        var last = i === td.tasks.length - 1;
        fb.appendChild(h('button', { type: 'button', class: 'btn primary daily-next', onclick: function () { i++; Core.play('step'); show(); } }, last ? S.dailyFinish : S.dailyNext));
        fb.querySelector('.daily-next').focus();
      }
      function right(node) { if (node) node.classList.add('right'); Core.play('correct'); end(attempt === 0 ? 1 : 0.5); }
      if (tk.options) {
        var box = h('div', { class: 'daily-options' + (tk.options.every(function (x) { return String(x).length <= 3; }) ? ' short' : '') });
        tk.options.forEach(function (v) {
          var b = h('button', { type: 'button', class: 'oj-opt daily-opt', 'data-v': v, lang: tk.optLang || null, onclick: function () { if (locked) return; if (v === tk.answer) right(b); else wrong(b); } }, v);
          box.appendChild(b);
        });
        body.appendChild(box);
      } else {
        var inp = h('input', { type: 'text', inputmode: tk.input === 'number' ? 'decimal' : 'text', class: 'oj-input daily-input', autocomplete: 'off', 'aria-label': S.dailyTypeHere, placeholder: S.dailyTypeHere });
        body.appendChild(h('form', { class: 'daily-form', onsubmit: function (e) {
          e.preventDefault(); if (locked || !inp.value.trim()) return;
          if (sameAnswer(inp.value, tk.answer)) { inp.disabled = true; right(inp); } else { wrong(null); inp.value = ''; inp.focus(); }
        } }, [inp, tk.unit ? h('span', { class: 'daily-unit' }, tk.unit) : null, h('button', { type: 'submit', class: 'btn primary' }, S.dailyCheck)]));
        setTimeout(function () { inp.focus(); }, 50);
      }
      body.appendChild(fb);
    }
    function finished() {
      var dl = state(), date = td.date;
      var firstTry = td.results.filter(function (r) { return r === 1; }).length;
      if (!dl.days[date]) dl.days[date] = { n: firstTry };
      Core.save();
      var badgeNode = root.Badges ? root.Badges.afterDaily() : null;
      Core.play('win');
      body.appendChild(h('div', { class: 'daily-end' }, [
        h('div', { class: 'bob', html: root.Bob.svg({ expression: 'cheering', size: 130, look: Core.profile().bob || {} }) }),
        h('h2', {}, S.dailyStamp), h('p', {}, t(S.dailyResult, { n: firstTry })), h('p', { class: 'daily-streak' }, streakText(stats().current)),
        badgeNode,
        h('div', { class: 'row center' }, [h('a', { class: 'btn ghost', href: '#/kalender', onclick: function () { o.remove(); } }, S.dailyCalendar), h('button', { type: 'button', class: 'btn primary', onclick: close }, S.dailyClose)])
      ]));
      body.querySelector('.btn.primary').focus();
    }
    show();
  }

  /* ---------- calendar ---------- */
  function showCalendar(app, monthKey) {
    var p = Core.profile(), dl = state(p), st = stats(p), now = today();
    monthKey = monthKey || now.slice(0, 7);
    var y = +monthKey.slice(0, 4), m = +monthKey.slice(5, 7) - 1, first = new Date(y, m, 1, 12), lead = (first.getDay() + 6) % 7;
    var nDays = new Date(y, m + 1, 0, 12).getDate(), cells = [], count = 0;
    for (var i = 0; i < lead; i++) cells.push(h('span', { class: 'cal-cell empty' }));
    for (var dnum = 1; dnum <= nDays; dnum++) {
      var k = y + '-' + pad(m + 1) + '-' + pad(dnum), done = !!dl.days[k], rest = !!st.rest[k];
      if (done) count++;
      cells.push(h('span', { class: 'cal-cell' + (done ? ' done' : '') + (rest ? ' rest' : '') + (k === now ? ' today' : ''), title: rest ? S.dailyRestDay : null },
        [h('span', { class: 'cal-num' }, String(dnum)), done ? h('span', { class: 'cal-stamp', html: root.Bob.svg({ expression: 'happy', size: 30, crop: 'head' }) }) : rest ? h('span', { class: 'cal-rest' }, S.dailyRestDay) : null]));
    }
    var prev = new Date(y, m - 1, 1, 12), next = new Date(y, m + 1, 1, 12);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + S.back), h('h1', {}, S.dailyCalendarTitle)]),
      h('p', { class: 'lead' }, streakText(st.current)), h('p', { class: 'muted' }, S.restDayNote),
      h('section', { class: 'card cal' }, [
        h('div', { class: 'cal-head' }, [
          h('button', { type: 'button', class: 'chip', 'aria-label': S.prevMonth, onclick: function () { showCalendar(app, dateKey(prev).slice(0, 7)); } }, '‹'),
          h('h2', {}, S.dailyMonths[m].charAt(0).toUpperCase() + S.dailyMonths[m].slice(1) + ' ' + y),
          h('button', { type: 'button', class: 'chip', 'aria-label': S.nextMonth, disabled: dateKey(next).slice(0, 7) > now.slice(0, 7), onclick: function () { showCalendar(app, dateKey(next).slice(0, 7)); } }, '›')
        ]),
        h('div', { class: 'cal-grid' }, S.dailyDays.map(function (d) { return h('span', { class: 'cal-dow' }, d); }).concat(cells)),
        h('p', { class: 'muted' }, t(count === 1 ? S.dailyMonthCount1 : S.dailyMonthCount, { n: count, month: S.dailyMonths[m] }))
      ])
    ]));
  }

  pure.todays = todays; pure.stats = stats; pure.banner = banner; pure.player = player; pure.showCalendar = showCalendar;
  root.Daily = pure;
})(typeof window !== 'undefined' ? window : this);
