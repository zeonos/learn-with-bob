/*
 * Gådehuset: one object per kind of puzzle. game.js runs the round, the help buttons and the stars; each kind knows
 * how to make a puzzle, draw it, see whether it is solved, give a tip and show the solution step by step.
 *
 *   create(spec, R) → pz (plain data, saved while the puzzle is half done)
 *   init(pz) → st (the child's work, plain data)
 *   view(board, pz, st, ctx) → { refresh(mark) }   mark = { errors: [...], cells: [...] } to colour
 *   complete(pz, st) / correct(pz, st), wrong(pz, st) → the child's mistakes (for »Tjek«)
 *   tip(pz, st) → { errors } or { text, cells, apply(st) };  solution(pz) → [{ text, cells, apply(st) }] from init(pz)
 *   moves(st), best(pz), allow(pz): move puzzles get the third star within allow(pz) moves
 */
(function (root) {
  'use strict';
  var Core = root.Core, S = root.STR.gh, h = Core.h, t = Core.t;
  var SD = root.SUDOKU, NG = root.NONO, LG = root.LOGIC, RV = root.RIVER, HN = root.HANOI, TF = root.TRUTH;
  function and(list) { return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' og ' + list[list.length - 1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function has(list, x) { return (list || []).some(function (y) { return JSON.stringify(y) === JSON.stringify(x); }); }
  var K = {};

  /* ================= Sudoku ================= */
  function sdText(g, n, s) {
    if (s.kind === 'reveal') return t(S.sdCell, { r: Math.floor(s.i / n) + 1, c: s.i % n + 1 }) + ': ' + s.v + '.';
    var d = SD.explainData(g, n, s);
    if (s.kind === 'number') return t(S.sdCell, { r: d.r, c: d.c }) + ': ' + t(S.sdNumber, { v: s.v, others: and(d.others.map(String)) });
    return t(S.sdCell, { r: d.r, c: d.c }) + ': ' + t(S.sdPlace, { unit: S.sdUnits[d.unit], v: s.v });
  }
  K.sudoku = {
    create: function (spec, R) { var m = SD.make(spec.n, spec.givens, R); return { n: m.n, puzzle: m.puzzle, solution: m.solution }; },
    init: function (pz) { return { v: pz.puzzle.slice() }; },
    intro: function (pz) { return t(S.sdIntro, { n: pz.n }) + ' ' + S.sdPick; },
    complete: function (pz, st) { return st.v.every(Boolean); },
    correct: function (pz, st) { return st.v.every(function (v, i) { return v === pz.solution[i]; }); },
    wrong: function (pz, st) { var out = []; st.v.forEach(function (v, i) { if (v && !pz.puzzle[i] && v !== pz.solution[i]) out.push(i); }); return out; },
    tip: function (pz, st) {
      var w = this.wrong(pz, st); if (w.length) return { errors: w };
      var s = SD.nextStep(st.v, pz.n);
      if (!s) { var i = st.v.indexOf(0); s = { i: i, v: pz.solution[i], kind: 'reveal' }; }
      return { text: sdText(st.v, pz.n, s), cells: [s.i], apply: function (x) { x.v[s.i] = s.v; } };
    },
    solution: function (pz) {
      var g = pz.puzzle.slice(), out = [];
      while (g.indexOf(0) >= 0) { // children's own puzzles may need more than the simple steps: then the next square is just shown
        var s = SD.nextStep(g, pz.n), i0 = g.indexOf(0);
        if (!s) s = { i: i0, v: pz.solution[i0], kind: 'reveal' };
        (function (s) { var text = sdText(g, pz.n, s); g[s.i] = s.v; out.push({ text: text, cells: [s.i], apply: function (x) { x.v[s.i] = s.v; } }); })(s);
      }
      return out;
    },
    view: function (board, pz, st, ctx) {
      var n = pz.n, bh = SD.BOX[n][0], bw = SD.BOX[n][1], U = SD.units(n), sel = -1, mark = {}, cells = [];
      var grid = h('div', { class: 'gh-sd', role: 'grid', style: '--n:' + n });
      for (var i = 0; i < n * n; i++) (function (i) {
        var r = Math.floor(i / n), c = i % n;
        var b = h('button', { type: 'button', class: 'gh-sd-cell' + (pz.puzzle[i] ? ' given' : '') + ((c + 1) % bw === 0 && c < n - 1 ? ' br' : '') + ((r + 1) % bh === 0 && r < n - 1 ? ' bb' : ''),
          onclick: function () { sel = i; refresh(); }, onkeydown: function (e) { key(e, i); } });
        cells.push(b); grid.appendChild(b);
      })(i);
      var pad = h('div', { class: 'gh-pad' });
      for (var v = 1; v <= n; v++) (function (v) { pad.appendChild(h('button', { type: 'button', class: 'gh-padkey', onclick: function () { put(v); } }, String(v))); })(v);
      pad.appendChild(h('button', { type: 'button', class: 'gh-padkey erase', 'aria-label': S.erase, title: S.erase, onclick: function () { put(0); } }, '⌫'));
      board.appendChild(grid); board.appendChild(pad);
      function put(v) {
        if (sel < 0 || pz.puzzle[sel] || ctx.locked()) return;
        st.v[sel] = v; mark = {}; Core.play('click'); refresh(); ctx.changed();
      }
      function key(e, i) {
        var r = Math.floor(i / n), c = i % n, to = -1;
        if (/^[1-9]$/.test(e.key) && +e.key <= n) { sel = i; put(+e.key); e.preventDefault(); return; }
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { sel = i; put(0); e.preventDefault(); return; }
        if (e.key === 'ArrowRight') to = r * n + Math.min(n - 1, c + 1);
        if (e.key === 'ArrowLeft') to = r * n + Math.max(0, c - 1);
        if (e.key === 'ArrowDown') to = Math.min(n - 1, r + 1) * n + c;
        if (e.key === 'ArrowUp') to = Math.max(0, r - 1) * n + c;
        if (to >= 0) { e.preventDefault(); sel = to; refresh(); cells[to].focus(); }
      }
      function refresh(m) {
        if (m) mark = m;
        var o = sel >= 0 ? U.of[sel] : null, sv = sel >= 0 ? st.v[sel] : 0;
        cells.forEach(function (b, i) {
          var oi = U.of[i], peer = o && (oi.row === o.row || oi.col === o.col || oi.box === o.box);
          b.textContent = st.v[i] || '';
          b.classList.toggle('sel', i === sel);
          b.classList.toggle('peer', !!peer && i !== sel);
          b.classList.toggle('same', !!sv && st.v[i] === sv && i !== sel);
          b.classList.toggle('bad', (mark.errors || []).indexOf(i) >= 0 && st.v[i] !== pz.solution[i]);
          b.classList.toggle('tip', (mark.cells || []).indexOf(i) >= 0);
          b.setAttribute('aria-label', t(S.sdCell, { r: oi.row + 1, c: oi.col + 1 }) + ': ' + (st.v[i] || '–'));
        });
      }
      refresh();
      return { refresh: refresh };
    }
  };

  /* ================= Malebilleder ================= */
  function picOf(pz) { return (root.GH_PICS || []).filter(function (p) { return p.id === pz.pic; })[0] || pz.own; }
  function ngInfo(pz) { var p = picOf(pz), g = NG.grid(p); return { p: p, g: g, cl: NG.clues(g), H: g.length, W: g[0].length }; }
  function ngKnown(st, I) { var out = []; for (var y = 0; y < I.H; y++) { out.push([]); for (var x = 0; x < I.W; x++) { var v = st.c[y * I.W + x]; out[y].push(v === 1 ? 1 : v === 2 ? 0 : -1); } } return out; }
  function ngText(I, s) {
    var clue = (s.kind === 'row' ? I.cl.rows[s.i] : I.cl.cols[s.i]), line = t(s.kind === 'row' ? S.ngRow : S.ngCol, { i: s.i + 1 });
    var f = s.cells.some(function (c) { return c[2] === 1; }), x = s.cells.some(function (c) { return c[2] === 0; });
    return cap(t(f && x ? S.ngStepBoth : f ? S.ngStepFill : S.ngStepCross, { line: line, clue: clue.length ? clue.join(' ') : S.ngEmptyClue }));
  }
  function ngApply(I, cells) { return function (st) { cells.forEach(function (c) { st.c[c[1] * I.W + c[0]] = c[2] === 1 ? 1 : 2; }); }; }
  K.nono = {
    create: function (spec) { return { pic: spec.pic }; },
    init: function (pz) { var I = ngInfo(pz), c = []; for (var i = 0; i < I.W * I.H; i++) c.push(0); return { c: c }; },
    intro: function () { return S.ngIntro; },
    complete: function (pz, st) {
      var I = ngInfo(pz), rows = [], y, x;
      for (y = 0; y < I.H; y++) { rows.push([]); for (x = 0; x < I.W; x++) rows[y].push(st.c[y * I.W + x] === 1 ? 1 : 0); }
      var c2 = NG.clues(rows);
      return JSON.stringify(c2) === JSON.stringify(I.cl);
    },
    correct: function (pz, st) { var I = ngInfo(pz); return st.c.every(function (v, i) { return (v === 1) === (I.g[Math.floor(i / I.W)][i % I.W] === 1); }); },
    wrong: function (pz, st) { var I = ngInfo(pz), out = []; st.c.forEach(function (v, i) { var s = I.g[Math.floor(i / I.W)][i % I.W]; if ((v === 1 && !s) || (v === 2 && s)) out.push(i); }); return out; },
    tip: function (pz, st) {
      var w = this.wrong(pz, st); if (w.length) return { errors: w };
      var I = ngInfo(pz), r = NG.solve(I.cl, ngKnown(st, I), 1), s = r.steps[0];
      if (!s) { for (var i = 0; i < st.c.length; i++) { var sol = I.g[Math.floor(i / I.W)][i % I.W]; if ((st.c[i] === 1) !== !!sol) { s = { kind: 'row', i: Math.floor(i / I.W), cells: [[i % I.W, Math.floor(i / I.W), sol]] }; break; } } }
      if (!s) return null;
      return { text: ngText(I, s), cells: s.cells.map(function (c) { return c[1] * I.W + c[0]; }), apply: ngApply(I, s.cells) };
    },
    solution: function (pz) {
      var I = ngInfo(pz);
      return NG.solve(I.cl).steps.map(function (s) { return { text: ngText(I, s), cells: s.cells.map(function (c) { return c[1] * I.W + c[0]; }), apply: ngApply(I, s.cells) }; });
    },
    view: function (board, pz, st, ctx) {
      var I = ngInfo(pz), mode = 1, mark = {}, cells = [], rowClues = [], colClues = [], painting = null;
      var maxRow = Math.max.apply(null, I.cl.rows.map(function (c) { return Math.max(1, c.length); })), maxCol = Math.max.apply(null, I.cl.cols.map(function (c) { return Math.max(1, c.length); }));
      var tools = h('div', { class: 'gh-ng-modes', role: 'group' });
      var bFill = h('button', { type: 'button', class: 'seg sel', 'aria-pressed': 'true', onclick: function () { setMode(1); } }, [h('span', { class: 'gh-ng-ico fill', 'aria-hidden': 'true' }), S.ngFill]);
      var bCross = h('button', { type: 'button', class: 'seg', 'aria-pressed': 'false', onclick: function () { setMode(2); } }, [h('span', { class: 'gh-ng-ico cross', 'aria-hidden': 'true' }, '✕'), S.ngCross]);
      tools.appendChild(h('div', { class: 'segmented' }, [bFill, bCross]));
      function setMode(m) { mode = m; bFill.classList.toggle('sel', m === 1); bCross.classList.toggle('sel', m === 2); bFill.setAttribute('aria-pressed', m === 1); bCross.setAttribute('aria-pressed', m === 2); }
      var table = h('div', { class: 'gh-ng', style: '--w:' + I.W + ';--h:' + I.H + ';--rc:' + maxRow + ';--cc:' + maxCol });
      table.appendChild(h('div', { class: 'gh-ng-corner' }));
      I.cl.cols.forEach(function (c, x) { var el = h('div', { class: 'gh-ng-cc' + (x % 5 === 4 && x < I.W - 1 ? ' b5' : '') }, (c.length ? c : [0]).map(function (v) { return h('span', {}, String(v)); })); colClues.push(el); table.appendChild(el); });
      for (var y = 0; y < I.H; y++) {
        var rc = h('div', { class: 'gh-ng-rc' + (y % 5 === 4 && y < I.H - 1 ? ' b5' : '') }, (I.cl.rows[y].length ? I.cl.rows[y] : [0]).map(function (v) { return h('span', {}, String(v)); }));
        rowClues.push(rc); table.appendChild(rc);
        for (var x = 0; x < I.W; x++) {
          var b = h('div', { class: 'gh-ng-cell' + (x % 5 === 4 && x < I.W - 1 ? ' r5' : '') + (y % 5 === 4 && y < I.H - 1 ? ' b5' : ''), 'data-i': y * I.W + x, role: 'button', tabindex: '-1' });
          cells.push(b); table.appendChild(b);
        }
      }
      var fit = h('div', { class: 'gh-ng-fit' }, table);
      board.appendChild(tools); board.appendChild(fit);
      // tap or drag across squares
      function cellAt(e) { var el = document.elementFromPoint(e.clientX, e.clientY); return el && el.classList && el.classList.contains('gh-ng-cell') && table.contains(el) ? +el.getAttribute('data-i') : -1; }
      function setCell(i) { if (i < 0 || st.c[i] === painting) return; st.c[i] = painting; mark = {}; refreshCell(i); }
      table.addEventListener('pointerdown', function (e) {
        var i = cellAt(e); if (i < 0 || ctx.locked()) return;
        e.preventDefault();
        painting = st.c[i] === mode ? 0 : mode;
        setCell(i); Core.play('click');
        try { table.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
      });
      table.addEventListener('pointermove', function (e) { if (painting !== null) setCell(cellAt(e)); });
      function end() { if (painting === null) return; painting = null; refreshClues(); ctx.changed(); }
      table.addEventListener('pointerup', end); table.addEventListener('pointercancel', end); table.addEventListener('lostpointercapture', end);
      // the board fits the screen: square size from the room there is
      function size() {
        if (!fit.isConnected) { root.removeEventListener('resize', size); return; }
        var room = Math.min(fit.clientWidth || 340, 720), clueW = maxRow * 15 + 10, cs = Math.floor((room - clueW) / I.W);
        table.style.setProperty('--cs', Math.max(18, Math.min(42, cs)) + 'px');
      }
      root.addEventListener('resize', size);
      function refreshCell(i) {
        var b = cells[i], v = st.c[i];
        b.classList.toggle('on', v === 1); b.classList.toggle('x', v === 2);
        b.classList.toggle('bad', (mark.errors || []).indexOf(i) >= 0);
        b.classList.toggle('tip', (mark.cells || []).indexOf(i) >= 0);
        b.setAttribute('aria-label', t(S.sdCell, { r: Math.floor(i / I.W) + 1, c: i % I.W + 1 }) + ': ' + (v === 1 ? S.ngFill : v === 2 ? S.ngCross : '–'));
      }
      function refreshClues() {
        var rows = [], y, x;
        for (y = 0; y < I.H; y++) { rows.push([]); for (x = 0; x < I.W; x++) rows[y].push(st.c[y * I.W + x] === 1 ? 1 : 0); }
        rowClues.forEach(function (el, y) { el.classList.toggle('done', JSON.stringify(NG.lineClue(rows[y])) === JSON.stringify(I.cl.rows[y])); });
        colClues.forEach(function (el, x) { el.classList.toggle('done', JSON.stringify(NG.lineClue(rows.map(function (r) { return r[x]; }))) === JSON.stringify(I.cl.cols[x])); });
      }
      function refresh(m) { if (m) mark = m; cells.forEach(function (_, i) { refreshCell(i); }); refreshClues(); }
      refresh(); setTimeout(size, 0); size();
      return {
        refresh: refresh,
        reveal: function () { // the finished picture in colour
          table.classList.add('solved');
          cells.forEach(function (b, i) { var ch = I.p.rows[Math.floor(i / I.W)].charAt(i % I.W); b.style.background = ch === '.' ? '' : NG.PAL[ch]; });
        }
      };
    }
  };
  function picSvg(p, px) { // small coloured picture for the gallery
    var H = p.rows.length, W = p.rows[0].length, s = '';
    p.rows.forEach(function (r, y) { r.split('').forEach(function (c, x) { if (c !== '.') s += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + NG.PAL[c] + '"/>'; }); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + px + '" height="' + Math.round(px * H / W) + '" shape-rendering="crispEdges" aria-hidden="true">' + s + '</svg>';
  }

  /* ================= Hvem ejer hvad? ================= */
  function lgSame(st, s) { return s.marks.every(function (m) { return st.m[m[1]][m[0]][m[2]] === (m[3] ? 1 : 0); }); }
  function lgApply(s) { return function (st) { s.marks.forEach(function (m) { st.m[m[1]][m[0]][m[2]] = m[3] ? 1 : 0; }); }; }
  function lgCells(s) { return s.marks.map(function (m) { return [m[1], m[0], m[2]]; }); }
  K.logic = {
    create: function (spec, R) { return LG.make(spec.band, spec.level, R); },
    init: function (pz) { return { m: LG.blank(pz.n, pz.cats.length), off: {} }; },
    intro: function () { return S.lgIntro; },
    complete: function (pz, st) { return st.m.every(function (cat) { return cat.every(function (row) { return row.filter(function (v) { return v === 1; }).length === 1; }); }); },
    correct: function (pz, st) { return LG.matches(pz, st.m); },
    wrong: function (pz, st) {
      var out = [];
      st.m.forEach(function (cat, c) { cat.forEach(function (row, x) { row.forEach(function (v, w) { var yes = pz.ans[c][x] === w; if ((v === 1 && !yes) || (v === 0 && yes)) out.push([c, x, w]); }); }); });
      return out;
    },
    tip: function (pz, st) {
      var w = this.wrong(pz, st); if (w.length) return { errors: w };
      var steps = LG.solve(pz, pz.clues).steps;
      for (var i = 0; i < steps.length; i++) if (!lgSame(st, steps[i])) return { text: LG.stepText(pz, steps[i]), cells: lgCells(steps[i]), apply: lgApply(steps[i]) };
      return null;
    },
    solution: function (pz) { return LG.solve(pz, pz.clues).steps.map(function (s) { return { text: LG.stepText(pz, s), cells: lgCells(s), apply: lgApply(s) }; }); },
    readText: function (pz) { return S.lgClues + '. ' + pz.clues.map(function (c, i) { return (i + 1) + '. ' + LG.clueText(pz, c); }).join(' '); },
    view: function (board, pz, st, ctx) {
      var mark = {}, btns = [];
      var list = h('ol', { class: 'gh-lg-clues' }, pz.clues.map(function (c, i) {
        var li = h('li', { class: st.off[i] ? 'off' : '', onclick: function () { st.off[i] = !st.off[i]; li.classList.toggle('off', !!st.off[i]); ctx.changed(true); } }, LG.clueText(pz, c));
        return li;
      }));
      board.appendChild(h('div', { class: 'gh-lg-cluebox' }, [h('h3', {}, S.lgClues), list]));
      var grids = h('div', { class: 'gh-lg-grids' });
      pz.cats.forEach(function (cat, c) {
        var tb = h('table', { class: 'gh-lg' }), head = h('tr', {}, [h('th', { class: 'corner' }, S.lgCat[cat.id])]);
        cat.vals.forEach(function (vi, v) { head.appendChild(h('th', { scope: 'col' }, LG.val(pz, c, v)[3])); });
        tb.appendChild(h('thead', {}, head));
        var body = h('tbody');
        pz.names.forEach(function (nm, x) {
          var tr = h('tr', {}, [h('th', { scope: 'row' }, nm)]);
          cat.vals.forEach(function (vi, v) {
            var b = h('button', { type: 'button', class: 'gh-lg-cell', onclick: function () {
              if (ctx.locked()) return;
              var cur = st.m[c][x][v]; st.m[c][x][v] = cur === -1 ? 0 : cur === 0 ? 1 : -1; mark = {}; Core.play('click'); refresh(); ctx.changed();
            } });
            b._k = [c, x, v]; btns.push(b);
            tr.appendChild(h('td', {}, b));
          });
          body.appendChild(tr);
        });
        tb.appendChild(body);
        grids.appendChild(tb);
      });
      board.appendChild(grids);
      function refresh(m) {
        if (m) mark = m;
        btns.forEach(function (b) {
          var k = b._k, v = st.m[k[0]][k[1]][k[2]], a = LG.val(pz, k[0], k[2]);
          b.textContent = v === 1 ? '✓' : v === 0 ? '✗' : '';
          b.className = 'gh-lg-cell' + (v === 1 ? ' yes' : v === 0 ? ' no' : '') + (has(mark.errors, k) ? ' bad' : '') + (has(mark.cells, k) ? ' tip' : '');
          b.setAttribute('aria-label', pz.names[k[1]] + ', ' + a[3] + ': ' + (v === 1 ? '✓' : v === 0 ? '✗' : '–'));
        });
      }
      refresh();
      return { refresh: refresh };
    }
  };

  /* ================= Over floden ================= */
  var ICON = {
    person: function (shirt, hair, opts) {
      opts = opts || {}; var sc = opts.small ? 0.82 : 1, y0 = opts.small ? 8 : 0;
      return '<g transform="translate(' + (24 - 24 * sc) + ' ' + y0 + ') scale(' + sc + ')">' +
        '<path d="M10 46 q0-16 14-16 q14 0 14 16z" fill="' + shirt + '" stroke="#4A2C17" stroke-width="2"/>' +
        '<circle cx="24" cy="20" r="10" fill="#F6D2B0" stroke="#4A2C17" stroke-width="2"/>' +
        (hair || '') + '<circle cx="20.5" cy="20" r="1.4" fill="#4A2C17"/><circle cx="27.5" cy="20" r="1.4" fill="#4A2C17"/><path d="M21 24.5 q3 2 6 0" fill="none" stroke="#4A2C17" stroke-width="1.6" stroke-linecap="round"/></g>';
    }
  };
  var ICONS = {
    bonde: ICON.person('#3E8FC2', '<path d="M8 13 h32 l-3 3 h-26z" fill="#E8C35A" stroke="#4A2C17" stroke-width="2"/><path d="M15 13 q9-12 18 0z" fill="#E8C35A" stroke="#4A2C17" stroke-width="2"/>'),
    far: ICON.person('#3E8FC2', '<path d="M14 18 q0-10 10-10 q10 0 10 10 q-3-5-10-5 q-7 0-10 5z" fill="#6B4426"/><path d="M17 26 q7 7 14 0 q-1 6-7 6 q-6 0-7-6z" fill="#6B4426"/>'),
    mor: ICON.person('#D9463B', '<path d="M13 24 q-3-16 11-16 q14 0 11 16 q-2-10-11-11 q-9 1-11 11z" fill="#B5652E"/>'),
    pige: ICON.person('#F2C94C', '<path d="M14 18 q0-10 10-10 q10 0 10 10 q-4-5-10-5 q-6 0-10 5z" fill="#E8B923"/><circle cx="12" cy="20" r="3.5" fill="#E8B923" stroke="#4A2C17" stroke-width="1.5"/><circle cx="36" cy="20" r="3.5" fill="#E8B923" stroke="#4A2C17" stroke-width="1.5"/>', { small: true }),
    dreng: ICON.person('#5BA34B', '<path d="M13 16 q0-9 11-9 q11 0 11 9z" fill="#2F6E9E" stroke="#4A2C17" stroke-width="1.5"/><path d="M33 15 h8 v3 h-8z" fill="#2F6E9E"/>', { small: true }),
    ulv: '<path d="M10 14 l6 10 M38 14 l-6 10" stroke="#4A2C17" stroke-width="2"/><path d="M9 12 l9 8 h12 l9-8 l-2 18 q-4 12-13 14 q-9-2-13-14z" fill="#9AA3AE" stroke="#4A2C17" stroke-width="2" stroke-linejoin="round"/><path d="M18 32 q6 8 12 0 q-6 5-12 0z" fill="#E6E9ED"/><circle cx="19" cy="25" r="1.8" fill="#4A2C17"/><circle cx="29" cy="25" r="1.8" fill="#4A2C17"/><circle cx="24" cy="35" r="2.4" fill="#4A2C17"/>',
    ged: '<path d="M14 12 q-6-4-8 2 M34 12 q6-4 8 2" fill="none" stroke="#8B5A2B" stroke-width="3" stroke-linecap="round"/><path d="M13 16 q11-8 22 0 l-2 16 q-4 8-9 8 q-5 0-9-8z" fill="#FFFFFF" stroke="#4A2C17" stroke-width="2"/><path d="M20 38 q4 8 8 0 l-4 8z" fill="#E6E2DA" stroke="#4A2C17" stroke-width="1.5"/><circle cx="19" cy="24" r="1.8" fill="#4A2C17"/><circle cx="29" cy="24" r="1.8" fill="#4A2C17"/><path d="M10 20 l-5 3 l6 1 M38 20 l5 3 l-6 1" fill="#FFFFFF" stroke="#4A2C17" stroke-width="1.5"/>',
    kaal: '<circle cx="24" cy="27" r="16" fill="#8CCB6A" stroke="#4A2C17" stroke-width="2"/><path d="M24 11 q-8 8 0 32 M24 11 q8 8 0 32 M10 22 q14 4 28 0" fill="none" stroke="#3F7F34" stroke-width="2"/>',
    faar: '<path d="M10 24 a6 6 0 0 1 6-8 a6 6 0 0 1 10-3 a6 6 0 0 1 10 4 a6 6 0 0 1 3 10 a6 6 0 0 1-6 9 a6 6 0 0 1-10 2 a6 6 0 0 1-10-3 a6 6 0 0 1-3-11z" fill="#FFFFFF" stroke="#4A2C17" stroke-width="2"/><ellipse cx="24" cy="27" rx="6" ry="7.5" fill="#3B2A20"/><circle cx="21.5" cy="26" r="1.3" fill="#FFFFFF"/><circle cx="26.5" cy="26" r="1.3" fill="#FFFFFF"/>'
  };
  function rvIcon(type, px) { return '<svg viewBox="0 0 48 48" width="' + (px || 44) + '" height="' + (px || 44) + '" aria-hidden="true">' + (ICONS[type] || '') + '</svg>'; }
  function rvPz(pz) { return RV.puzzle(pz.id); }
  function rvSailNow(pz, st, ids) { var p = rvPz(pz), ns = RV.sail(p, st, ids); st.at = ns.at; st.boat = ns.boat; st.inBoat = []; st.trips++; }
  function whoText(p, ids) { return and(ids.map(function (id) { return RV.item(p, id).name; })); }
  K.river = {
    create: function (spec) { return { id: spec.puzzle }; },
    init: function (pz) { var s = RV.start(rvPz(pz)); return { at: s.at, boat: 0, inBoat: [], trips: 0 }; },
    intro: function (pz) { return rvPz(pz).story; },
    readText: function (pz) { return rvPz(pz).story; },
    complete: function (pz, st) { return RV.done(rvPz(pz), st); },
    correct: function (pz, st) { return RV.done(rvPz(pz), st); },
    wrong: function () { return []; },
    moves: function (st) { return st.trips; },
    best: function (pz) { return RV.best(rvPz(pz)); },
    allow: function (pz) { return RV.best(rvPz(pz)) + 2; },
    tip: function (pz, st) {
      var p = rvPz(pz), r = RV.bfs(p, { at: st.at, boat: st.boat });
      if (!r || !r.path.length) return null;
      var ids = r.path[0];
      return { text: t(S.rvTip, { who: whoText(p, ids), dir: st.boat === 0 ? S.rvOver : S.rvBack }), cells: ids, apply: function (x) { x.inBoat = ids.slice(); } };
    },
    solution: function (pz) {
      var p = rvPz(pz);
      return p.solution.map(function (s) { return { text: s[1], cells: s[0], sail: true, apply: function (x) { rvSailNow(pz, x, s[0]); } }; });
    },
    view: function (board, pz, st, ctx) {
      var p = rvPz(pz), mark = {}, busy = false;
      var story = h('p', { class: 'gh-rv-story' }, p.story);
      var left = h('div', { class: 'gh-rv-bank left' }), right = h('div', { class: 'gh-rv-bank right' }), seats = h('div', { class: 'gh-rv-seats' });
      var boat = h('div', { class: 'gh-rv-boat' }, [seats, h('div', { class: 'gh-rv-hull', html: '<svg viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><path d="M2 4 h116 l-14 26 h-88z" fill="#B5652E" stroke="#4A2C17" stroke-width="3" stroke-linejoin="round"/><path d="M10 12 h100" stroke="#8B4A20" stroke-width="2"/></svg>' })]);
      var water = h('div', { class: 'gh-rv-water' }, boat);
      var scene = h('div', { class: 'gh-rv' }, [left, water, right]);
      var info = h('div', { class: 'gh-rv-info' }), sailBtn = h('button', { type: 'button', class: 'btn primary gh-rv-sail', onclick: sail }, S.rvSail);
      board.appendChild(story); board.appendChild(scene); board.appendChild(h('div', { class: 'gh-rv-bar' }, [info, sailBtn]));
      function token(it, where) {
        var b = h('button', { type: 'button', class: 'gh-rv-item' + ((mark.cells || []).indexOf(it.id) >= 0 ? ' tip' : ''), 'aria-label': cap(it.name) + (it.w ? ', ' + it.w + ' kg' : ''),
          onclick: function () { tap(it.id); } }, [h('span', { html: rvIcon(it.type, 44) }), h('small', {}, cap(it.name.replace(/^(et|en) /, '')) + (it.w ? ' ' + it.w + ' kg' : ''))]);
        if (where !== 'boat' && st.at[it.id] !== st.boat) b.disabled = true;
        return b;
      }
      function tap(id) {
        if (ctx.locked() || busy) return;
        var i = st.inBoat.indexOf(id);
        if (i >= 0) st.inBoat.splice(i, 1);
        else {
          if (st.at[id] !== st.boat) { ctx.say(S.rvWrongSide); return; }
          if (st.inBoat.length >= p.boat.cap) { ctx.say(S.rvFull); return; }
          st.inBoat.push(id);
        }
        mark = {}; Core.play('click'); refresh(); ctx.changed(true);
      }
      function sail() {
        if (ctx.locked() || busy) return;
        var why = RV.canSail(p, st, st.inBoat);
        if (why) { ctx.say(why === 'heavy' ? t(S.rvHeavy, { max: p.boat.maxW, w: RV.weight(p, st.inBoat) }) : why === 'rower' ? S.rvRower : why === 'full' ? S.rvFull : S.rvEmpty); Core.play('bump'); return; }
        var before = JSON.stringify(st), ns = RV.sail(p, st, st.inBoat), bad = RV.broken(p, ns);
        busy = true; Core.play('step');
        animate(function () {
          rvSailNow(pz, st, st.inBoat.slice());
          refresh();
          if (bad) {
            setTimeout(function () { var old = JSON.parse(before); st.at = old.at; st.boat = old.boat; st.inBoat = []; st.trips = old.trips; busy = false; refresh(); ctx.fail(bad.msg); }, 900);
          } else { busy = false; ctx.changed(); }
        });
      }
      function animate(after) { water.classList.toggle('at-right', st.boat === 0); setTimeout(after, 650); } // the boat (with its passengers) crosses first
      function refresh(m) {
        if (m) mark = m;
        left.innerHTML = ''; right.innerHTML = ''; seats.innerHTML = '';
        p.items.forEach(function (it) {
          if (st.inBoat.indexOf(it.id) >= 0) seats.appendChild(token(it, 'boat'));
          else (st.at[it.id] === 0 ? left : right).appendChild(token(it, 'bank'));
        });
        water.classList.toggle('at-right', st.boat === 1);
        info.textContent = t(S.rvTrips, { n: st.trips });
        sailBtn.disabled = ctx.locked();
      }
      refresh();
      return { refresh: refresh, sail: function (ids, done) { st.inBoat = ids.slice(); refresh(); busy = true; animate(function () { rvSailNow(pz, st, ids); busy = false; refresh(); if (done) done(); }); } };
    }
  };

  /* ================= Hanois tårn ================= */
  var PEG = S.hnPegs;
  K.hanoi = {
    create: function (spec) { return { n: spec.n }; },
    init: function (pz) { return { pos: HN.start(pz.n), moves: 0 }; },
    intro: function () { return S.hnIntro + ' ' + S.hnPick; },
    complete: function (pz, st) { return HN.done(st.pos, 2); },
    correct: function (pz, st) { return HN.done(st.pos, 2); },
    wrong: function () { return []; },
    moves: function (st) { return st.moves; },
    best: function (pz) { return HN.best(pz.n); },
    allow: function (pz) { return HN.best(pz.n) + 2 * (pz.n - 2); },
    tip: function (pz, st) {
      var m = HN.nextMove(st.pos); if (!m) return null;
      return { text: t(S.hnTip, { d: m.d, from: PEG[m.from], to: PEG[m.to] }), cells: [m.from, m.to], apply: function (x) { x.pos = HN.move(x.pos, m.from, m.to); x.moves++; } };
    },
    solution: function (pz) {
      var pos = HN.start(pz.n), out = [], m;
      while ((m = HN.nextMove(pos))) {
        var text = m.parent ? t(S.hnStepBig, { p: m.parent.d, pto: PEG[m.parent.to], d: m.d, from: PEG[m.from], to: PEG[m.to] }) : t(S.hnStepMove, { d: m.d, from: PEG[m.from], to: PEG[m.to] });
        (function (m) { out.push({ text: text, cells: [m.from, m.to], apply: function (x) { x.pos = HN.move(x.pos, m.from, m.to); x.moves++; } }); })(m);
        pos = HN.move(pos, m.from, m.to);
      }
      return out;
    },
    view: function (board, pz, st, ctx) {
      var sel = -1, mark = {}, pegs = [];
      var wrap = h('div', { class: 'gh-hn', style: '--n:' + pz.n });
      [0, 1, 2].forEach(function (k) {
        var b = h('button', { type: 'button', class: 'gh-hn-peg' + (k === 2 ? ' goal' : ''), onclick: function () { tap(k); } });
        pegs.push(b); wrap.appendChild(b);
      });
      var info = h('div', { class: 'gh-hn-info' });
      var again = h('button', { type: 'button', class: 'btn ghost', onclick: restart }, S.restart);
      board.appendChild(wrap); board.appendChild(h('div', { class: 'gh-rv-bar' }, [info, again]));
      function tap(k) {
        if (ctx.locked()) return;
        if (sel < 0) { if (HN.top(st.pos, k)) { sel = k; Core.play('click'); } refresh(); return; }
        if (sel === k) { sel = -1; refresh(); return; }
        if (!HN.canMove(st.pos, sel, k)) { var s0 = sel; sel = -1; refresh(); Core.play('bump'); ctx.fail(S.hnTooBig); return; }
        st.pos = HN.move(st.pos, sel, k); st.moves++; sel = -1; mark = {}; Core.play('step'); refresh(); ctx.changed();
      }
      function restart() { if (ctx.locked() || !st.moves) return; st.pos = HN.start(pz.n); st.moves = 0; sel = -1; refresh(); ctx.fail(null); }
      function refresh(m) {
        if (m) mark = m;
        pegs.forEach(function (b, k) {
          var discs = HN.stack(st.pos, k);
          b.innerHTML = '<span class="gh-hn-rod" aria-hidden="true"></span>' + discs.map(function (d, j) {
            var lifted = sel === k && j === discs.length - 1;
            return '<span class="gh-hn-disc d' + d + (lifted ? ' up' : '') + '" style="--d:' + d + ';--j:' + j + '">' + d + '</span>';
          }).join('') + '<b class="gh-hn-label">' + PEG[k] + '</b>';
          b.classList.toggle('sel', sel === k);
          b.classList.toggle('tip', (mark.cells || []).indexOf(k) >= 0);
          b.setAttribute('aria-label', PEG[k] + ': ' + (discs.length ? discs.join(', ') : '–'));
        });
        info.textContent = t(S.hnMoves, { n: st.moves });
        again.disabled = ctx.locked() || !st.moves;
      }
      refresh();
      return { refresh: refresh };
    }
  };

  /* ================= Sandt eller falsk ================= */
  function tfLine(pz, i) { var w = S.tf, a = pz.answer[i], f = TF.fact(pz, pz.says[i]); return t(a ? S.tfExplainTrue : S.tfExplainFalse, { name: pz.names[i], fact: f }); }
  K.truth = {
    create: function (spec, R) { return TF.make(spec.level, R); },
    init: function (pz) { return { a: pz.names.map(function () { return null; }) }; },
    intro: function () { return S.tfIntro; },
    readText: function (pz) { return S.tfIntro + ' ' + pz.names.map(function (nm, i) { return t(S.tfSays, { name: nm }) + ' ' + TF.said(pz, pz.says[i]); }).join(' '); },
    complete: function () { return false; },
    correct: function (pz, st) { return st.a.every(function (v, i) { return v === pz.answer[i]; }); },
    wrong: function (pz, st) { var out = []; st.a.forEach(function (v, i) { if (v !== null && v !== pz.answer[i]) out.push(i); }); return out; },
    submitHint: function (pz) { return t(S.tfHint, { name: pz.names[0] }); },
    tip: function (pz, st) {
      var w = this.wrong(pz, st); if (w.length) return { errors: w };
      for (var i = 0; i < pz.n; i++) if (st.a[i] === null) return (function (i) { return { text: tfLine(pz, i), cells: [i], apply: function (x) { x.a[i] = pz.answer[i]; } }; })(i);
      return null;
    },
    solution: function (pz) {
      return [{ text: pz.names.map(function (_, i) { return tfLine(pz, i); }).join(' ') + ' ' + S.tfOnly, cells: pz.names.map(function (_, i) { return i; }), apply: function (x) { x.a = pz.answer.slice(); } }];
    },
    view: function (board, pz, st, ctx) {
      var mark = {}, cards = [];
      var list = h('div', { class: 'gh-tf' });
      pz.names.forEach(function (nm, i) {
        var bT = h('button', { type: 'button', class: 'seg', onclick: function () { set(i, true); } }, S.tfTruth);
        var bL = h('button', { type: 'button', class: 'seg', onclick: function () { set(i, false); } }, S.tfLie);
        var card = h('div', { class: 'gh-tf-card' }, [
          h('div', { class: 'gh-tf-who' }, [h('span', { class: 'gh-tf-av', 'aria-hidden': 'true' }, nm.charAt(0)), h('strong', {}, nm)]),
          h('p', { class: 'gh-tf-say' }, [h('small', {}, t(S.tfSays, { name: nm })), ' »' + TF.said(pz, pz.says[i]) + '«']),
          h('div', { class: 'segmented gh-tf-pick', role: 'group', 'aria-label': nm }, [bT, bL])
        ]);
        card._b = [bT, bL]; cards.push(card); list.appendChild(card);
      });
      var go = h('button', { type: 'button', class: 'btn primary gh-tf-go', onclick: function () {
        if (ctx.locked()) return;
        if (st.a.some(function (v) { return v === null; })) { ctx.say(S.tfChoose); return; }
        ctx.submit();
      } }, S.tfAnswer);
      board.appendChild(list); board.appendChild(go);
      function set(i, v) { if (ctx.locked()) return; st.a[i] = st.a[i] === v ? null : v; mark = {}; Core.play('click'); refresh(); ctx.changed(true); }
      function refresh(m) {
        if (m) mark = m;
        cards.forEach(function (c, i) {
          c._b[0].classList.toggle('sel', st.a[i] === true); c._b[0].setAttribute('aria-pressed', st.a[i] === true);
          c._b[1].classList.toggle('sel', st.a[i] === false); c._b[1].setAttribute('aria-pressed', st.a[i] === false);
          c.classList.toggle('bad', (mark.errors || []).indexOf(i) >= 0);
          c.classList.toggle('tip', (mark.cells || []).indexOf(i) >= 0);
        });
        go.disabled = ctx.locked();
      }
      refresh();
      return { refresh: refresh };
    }
  };

  root.GH_KINDS = K;
  root.GH_ART = { picSvg: picSvg, rvIcon: rvIcon };
})(window);
