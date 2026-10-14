/*
 * Robotkoden – motor. Ingen DOM, så den kan testes i Node.
 *  - Program: { main: [blok…], f: [blok…] }
 *    blok: { id, t: 'frem'|'venstre'|'hojre'|'gentag'|'indtil'|'hvis'|'kald', n?, c?: 'frem'|'venstre'|'hojre', body?, ellers? }
 *  - Bane: { cols, rows, grid: [['#','.','B','G']…], start: {r,c,d}, goal: {r,c}, batteries: [{r,c}], palette, target, limit }
 *  - run(bane, program) → { events, result: 'goal'|'crash'|'end'|'limit', collected, steps }
 */
(function (root) {
  'use strict';
  var DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1]; // N, E, S, W
  var DIRS = { N: 0, E: 1, S: 2, W: 3 };
  var nextId = 1;
  function newId() { return 'b' + (nextId++); }

  /* ---------- tiny DSL used to write levels and solutions ----------
     F frem · L drej venstre · R drej højre · P kør funktion
     3( … ) gentag 3 gange · U( … ) gentag indtil målet
     ?f( dann | ellers ) hvis vej frem · ?l( … ) venstre · ?r( … ) højre */
  function parse(src) {
    var s = String(src || '').replace(/\s+/g, ''), i = 0;
    function list(stop) {
      var out = [];
      while (i < s.length && stop.indexOf(s[i]) < 0) {
        var ch = s[i];
        if (ch === 'F') { out.push({ id: newId(), t: 'frem' }); i++; }
        else if (ch === 'L') { out.push({ id: newId(), t: 'venstre' }); i++; }
        else if (ch === 'R') { out.push({ id: newId(), t: 'hojre' }); i++; }
        else if (ch === 'P') { out.push({ id: newId(), t: 'kald' }); i++; }
        else if (ch === 'U') { i += 2; var b = list(')'); i++; out.push({ id: newId(), t: 'indtil', body: b }); }
        else if (ch === '?') {
          var c = { f: 'frem', l: 'venstre', r: 'hojre' }[s[i + 1]]; i += 3;
          var th = list('|)'), el = [];
          if (s[i] === '|') { i++; el = list(')'); }
          i++;
          out.push({ id: newId(), t: 'hvis', c: c, body: th, ellers: el });
        }
        else if (/\d/.test(ch)) {
          var num = ''; while (/\d/.test(s[i])) num += s[i++];
          i++; var body = list(')'); i++;
          out.push({ id: newId(), t: 'gentag', n: +num, body: body });
        }
        else throw new Error('Ukendt tegn i program: ' + ch);
      }
      return out;
    }
    return list('');
  }
  function program(mainSrc, fSrc) { return { main: parse(mainSrc), f: parse(fSrc || '') }; }

  /* ---------- counting & cloning ---------- */
  function count(list) {
    var n = 0;
    (list || []).forEach(function (b) { n += 1 + count(b.body) + count(b.ellers); });
    return n;
  }
  function countProgram(p) { return count(p.main) + count(p.f); }
  function types(list, out) {
    out = out || {};
    (list || []).forEach(function (b) { out[b.t] = 1; types(b.body, out); types(b.ellers, out); });
    return out;
  }
  function clone(list, keepIds) {
    return (list || []).map(function (b) {
      var c = { id: keepIds ? b.id : newId(), t: b.t };
      if (b.n !== undefined) c.n = b.n;
      if (b.c !== undefined) c.c = b.c;
      if (b.body) c.body = clone(b.body, keepIds);
      if (b.ellers) c.ellers = clone(b.ellers, keepIds);
      return c;
    });
  }

  /* ---------- seeded random for decorations ---------- */
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- build a level from its definition ---------- */
  // def: { id, path (DSL, conditions not allowed), sol, f?, dir, bat (count or [indices]), revisit?, open? , map? (explicit rows) }
  function walkPath(def) {
    var prog = program(def.path || def.sol, def.f || '');
    var r = 0, c = 0, d = DIRS[def.dir || 'E'], cells = [[0, 0]], seen = { '0,0': 1 }, guard = 0;
    function exec(list) {
      list.forEach(function (b) {
        if (++guard > 2000) throw new Error('path too long');
        if (b.t === 'frem') {
          r += DR[d]; c += DC[d];
          var k = r + ',' + c;
          if (seen[k] && !def.revisit) throw new Error('Banen ' + def.id + ' krydser sig selv ved ' + k);
          seen[k] = 1; cells.push([r, c]);
        }
        else if (b.t === 'venstre') d = (d + 3) % 4;
        else if (b.t === 'hojre') d = (d + 1) % 4;
        else if (b.t === 'gentag') for (var i = 0; i < b.n; i++) exec(b.body);
        else if (b.t === 'kald') exec(prog.f);
        else throw new Error('path cannot contain ' + b.t);
      });
    }
    exec(prog.main);
    return cells;
  }

  function buildLevel(def) {
    if (def.map) return fromMap(def.map, def);
    var cells = walkPath(def);
    var minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
    cells.forEach(function (p) { minR = Math.min(minR, p[0]); maxR = Math.max(maxR, p[0]); minC = Math.min(minC, p[1]); maxC = Math.max(maxC, p[1]); });
    var rows = maxR - minR + 3, cols = maxC - minC + 3, grid = [];
    for (var i = 0; i < rows; i++) { grid.push([]); for (var j = 0; j < cols; j++) grid[i].push('#'); }
    cells.forEach(function (p) { grid[p[0] - minR + 1][p[1] - minC + 1] = '.'; });
    // extra open floor for planning (never on condition levels)
    if (def.open) {
      var rand = rng(hash(def.id));
      for (i = 1; i < rows - 1; i++) for (j = 1; j < cols - 1; j++) if (grid[i][j] === '#' && rand() < def.open) grid[i][j] = '.';
    }
    var startCell = cells[0], goalCell = cells[cells.length - 1];
    var bat = def.bat || 0, idx = [];
    if (Array.isArray(bat)) idx = bat;
    else for (var k = 1; k <= bat; k++) idx.push(Math.round((cells.length - 1) * k / (bat + 1)));
    var batteries = idx.map(function (n) { return { r: cells[n][0] - minR + 1, c: cells[n][1] - minC + 1 }; });
    batteries.forEach(function (b) { grid[b.r][b.c] = 'B'; });
    var goal = { r: goalCell[0] - minR + 1, c: goalCell[1] - minC + 1 };
    grid[goal.r][goal.c] = 'G';
    var start = { r: startCell[0] - minR + 1, c: startCell[1] - minC + 1, d: DIRS[def.dir || 'E'] };
    return finish(def, grid, start, goal, batteries);
  }

  function fromMap(rowsArr, def) {
    var grid = [], start = null, goal = null, batteries = [];
    rowsArr.forEach(function (line, r) {
      grid.push([]);
      line.split('').forEach(function (ch, c) {
        if ('NESW'.indexOf(ch) >= 0) { start = { r: r, c: c, d: DIRS[ch] }; ch = '.'; }
        if (ch === 'G') goal = { r: r, c: c };
        if (ch === 'B') batteries.push({ r: r, c: c });
        grid[r].push(ch === '.' || ch === 'B' || ch === 'G' ? ch : '#');
      });
    });
    return finish(def, grid, start, goal, batteries);
  }

  function finish(def, grid, start, goal, batteries) {
    var lvl = {
      id: def.id, world: def.world, title: def.title, hint: def.hint,
      rows: grid.length, cols: grid[0].length, grid: grid, start: start, goal: goal, batteries: batteries,
      palette: def.palette || ['frem', 'venstre', 'hojre'], limit: def.limit || 0,
      pre: def.pre ? program(def.pre, def.preF) : null, custom: !!def.custom
    };
    if (def.sol !== undefined) {
      lvl.solution = program(def.sol, def.f || '');
      lvl.target = def.target || countProgram(lvl.solution);
    } else lvl.target = def.target || 0;
    return lvl;
  }

  /* ---------- interpreter ---------- */
  var MAX_EVENTS = 800;
  function run(lvl, prog) {
    var r = lvl.start.r, c = lvl.start.c, d = lvl.start.d;
    var got = {}, events = [], result = null, steps = 0;
    function free(rr, cc) { return rr >= 0 && cc >= 0 && rr < lvl.rows && cc < lvl.cols && lvl.grid[rr][cc] !== '#'; }
    function isGoal() { return r === lvl.goal.r && c === lvl.goal.c; }
    function emit(e) { events.push(e); if (events.length > MAX_EVENTS) throw { stop: 'limit' }; }
    function exec(list, depth) {
      if (depth > 40) throw { stop: 'limit' };
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (b.t === 'frem') {
          var nr = r + DR[d], nc = c + DC[d];
          if (!free(nr, nc)) { emit({ id: b.id, type: 'crash', r: r, c: c, d: d }); throw { stop: 'crash' }; }
          r = nr; c = nc; steps++;
          var e = { id: b.id, type: 'move', r: r, c: c, d: d };
          if (lvl.grid[r][c] === 'B' && !got[r + ',' + c]) { got[r + ',' + c] = 1; e.battery = true; }
          emit(e);
          if (isGoal()) throw { stop: 'goal' };
        } else if (b.t === 'venstre' || b.t === 'hojre') {
          d = (d + (b.t === 'venstre' ? 3 : 1)) % 4; steps++;
          emit({ id: b.id, type: 'turn', r: r, c: c, d: d, turn: b.t === 'venstre' ? -1 : 1 });
        } else if (b.t === 'gentag') {
          for (var k = 0; k < b.n; k++) { emit({ id: b.id, type: 'loop', i: k + 1, n: b.n }); exec(b.body || [], depth + 1); }
        } else if (b.t === 'indtil') {
          while (!isGoal()) {
            emit({ id: b.id, type: 'loop' });
            var before = events.length;
            exec(b.body || [], depth + 1);
            if (!(b.body || []).length && events.length === before) throw { stop: 'limit' };
          }
        } else if (b.t === 'hvis') {
          var dd = b.c === 'venstre' ? (d + 3) % 4 : b.c === 'hojre' ? (d + 1) % 4 : d;
          var ok = free(r + DR[dd], c + DC[dd]);
          emit({ id: b.id, type: 'check', ok: ok });
          exec(ok ? (b.body || []) : (b.ellers || []), depth + 1);
        } else if (b.t === 'kald') {
          emit({ id: b.id, type: 'call' });
          exec(prog.f || [], depth + 1);
        }
      }
    }
    try { exec(prog.main || [], 0); result = isGoal() ? 'goal' : 'end'; }
    catch (x) { if (x && x.stop) result = x.stop; else throw x; }
    return { events: events, result: result, collected: Object.keys(got).length, total: lvl.batteries.length, steps: steps, blocks: countProgram(prog) };
  }

  function stars(lvl, res) {
    if (res.result !== 'goal') return { goal: false, batteries: false, short: false, n: 0 };
    var s = { goal: true, batteries: res.collected === res.total, short: !lvl.target || res.blocks <= lvl.target };
    s.n = 1 + (s.batteries ? 1 : 0) + (s.short ? 1 : 0);
    return s;
  }

  /* ---------- show the program as JavaScript-like code ---------- */
  var COND = { frem: 'vejFrem()', venstre: 'vejTilVenstre()', hojre: 'vejTilHøjre()' };
  function toCode(prog) {
    var out = [], loopVar = ['i', 'j', 'k', 'm', 'n'];
    function emit(list, ind, depth) {
      list.forEach(function (b) {
        var pad = new Array(ind + 1).join('  ');
        if (b.t === 'frem') out.push(pad + 'frem();');
        else if (b.t === 'venstre') out.push(pad + 'drejVenstre();');
        else if (b.t === 'hojre') out.push(pad + 'drejHøjre();');
        else if (b.t === 'kald') out.push(pad + 'minFunktion();');
        else if (b.t === 'gentag') {
          var v = loopVar[depth % loopVar.length];
          out.push(pad + 'for (let ' + v + ' = 0; ' + v + ' < ' + b.n + '; ' + v + '++) {'); emit(b.body || [], ind + 1, depth + 1); out.push(pad + '}');
        } else if (b.t === 'indtil') { out.push(pad + 'while (!vedMålet()) {'); emit(b.body || [], ind + 1, depth); out.push(pad + '}'); }
        else if (b.t === 'hvis') {
          out.push(pad + 'if (' + COND[b.c] + ') {'); emit(b.body || [], ind + 1, depth);
          if ((b.ellers || []).length) { out.push(pad + '} else {'); emit(b.ellers, ind + 1, depth); }
          out.push(pad + '}');
        }
      });
    }
    if (prog.f && prog.f.length) { out.push('function minFunktion() {'); emit(prog.f, 1, 0); out.push('}', ''); }
    emit(prog.main || [], 0, 0);
    return out.join('\n');
  }

  /* ---------- share codes for home-made levels ---------- */
  function b64enc(str) {
    if (typeof Buffer !== 'undefined' && typeof btoa === 'undefined') return Buffer.from(str, 'utf8').toString('base64');
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64dec(b64) {
    if (typeof Buffer !== 'undefined' && typeof atob === 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  var PAL = { frem: 'f', venstre: 'l', hojre: 'r', gentag: 'g', indtil: 'u', hvis: 'h', kald: 'k' };
  function encodeLevel(o) { // o: { map: [rows], palette: [...], title }
    var pal = o.palette.map(function (p) { return PAL[p]; }).join('');
    return 'RK1-' + b64enc(JSON.stringify({ m: o.map, p: pal, t: (o.title || '').slice(0, 40) })).replace(/=+$/, '');
  }
  function decodeLevel(code) {
    try {
      var s = String(code || '').replace(/\s+/g, '');
      if (s.indexOf('RK1-') !== 0) return null;
      var b = s.slice(4); while (b.length % 4) b += '=';
      var o = JSON.parse(b64dec(b));
      if (!Array.isArray(o.m) || !o.m.length || o.m.length > 12) return null;
      var w = o.m[0].length;
      if (w > 12 || o.m.some(function (row) { return typeof row !== 'string' || row.length !== w || /[^#.BGNESW]/.test(row); })) return null;
      var txt = o.m.join('');
      if ((txt.match(/[NESW]/g) || []).length !== 1 || (txt.match(/G/g) || []).length !== 1) return null;
      var inv = {}; for (var k in PAL) inv[PAL[k]] = k;
      var palette = String(o.p || 'flr').split('').map(function (ch) { return inv[ch]; }).filter(Boolean);
      ['frem', 'venstre', 'hojre'].forEach(function (p) { if (palette.indexOf(p) < 0) palette.unshift(p); });
      return { map: o.m, palette: palette, title: String(o.t || '') };
    } catch (e) { return null; }
  }

  var api = {
    parse: parse, program: program, count: count, countProgram: countProgram, types: types, clone: clone, newId: newId,
    buildLevel: buildLevel, walkPath: walkPath, run: run, stars: stars, toCode: toCode,
    encodeLevel: encodeLevel, decodeLevel: decodeLevel, DR: DR, DC: DC, DIRS: DIRS
  };
  root.RK = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
