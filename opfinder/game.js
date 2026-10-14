/*
 * Opfinderværkstedet – Bob er opfinder. Barnet bygger kædereaktionsmaskiner af ramper, vipper, tandhjul, trisser,
 * dominobrikker og fjedre, så de løser en opgave: ring med klokken, giv blomsten vand, hejs spanden …
 * Seks værksteder (tre for mellemtrinnet, tre for udskolingen) med seks håndlavede maskiner hver (machines.js).
 * Reglerne står i physics.js: alt sker felt for felt, så samme maskine altid gør det samme.
 * Ingen tid. 3 stjerner: maskinen virker uden hjælp. 2: med et tip. 1: med »Vis løsningen« (efter 3 forsøg).
 * Alt gemmes med det samme: løste maskiner, det barnet har bygget, og den frie opfindelse.
 */
(function (root) {
  'use strict';
  var Core = root.Core, Bob = root.Bob, S = root.STR.of, SC = root.STR.core, P = root.OF_PARTS, F = root.OF_PHYS, MS = root.OF_MACHINES;
  var h = Core.h, t = Core.t;
  var ID = 'opfinder', OUTFIT = 'inventor', NLEV = 6, SOLVE_AFTER = 3, CELL = 100, VW = 800, VH = 630, FLOOR = 600;
  var WORLDS = MS.worlds, COLS = P.COLS, ROWS = P.ROWS;
  var app = null, st = null, el = {}, clock = 0, timers = [], raf = 0, speedK = 1, uidN = 0, TS = 1;

  function worldById(id) { return WORLDS.filter(function (w) { return w.id === id; })[0]; }
  function nameOf(id) { return (S.worlds[id] || [S.sbTitle])[0]; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function f1(n) { return Math.round(n * 10) / 10; }
  function num(n) { return String(Math.round(n * 100) / 100).replace('.', ','); } // Danish decimal comma
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function lkey(wid, n) { return wid + ':' + n; }

  /* ---------- data and hub API ---------- */
  // d.w[world] = { best: [stars per level], plays }, d.lv[world] = furthest level (1–6), d.cards[world] = 1,
  // d.build['world:n'] = what the child has placed, d.help['world:n'] = { fails, tip, shown }, d.sb = the sandbox
  function data() {
    var d = Core.gameData(ID); d.w = d.w || {}; d.lv = d.lv || {}; d.cards = d.cards || {}; d.build = d.build || {}; d.help = d.help || {};
    if (!d.band) d.band = (Core.profile() || {}).band || 'M';
    return d;
  }
  function wState(d, id) { var x = d.w[id] || (d.w[id] = { best: [0, 0, 0, 0, 0, 0], plays: 0 }); if (!Array.isArray(x.best)) x.best = [0, 0, 0, 0, 0, 0]; return x; }
  function bestOf(d, id) { var x = (d.w || {})[id]; return x && Array.isArray(x.best) ? x.best : [0, 0, 0, 0, 0, 0]; }
  // a world's stars: the average of its six machines' best stars, rounded down (unbuilt machines count 0)
  function worldStars(d, id) { var b = bestOf(d, id), s = 0; for (var i = 0; i < NLEV; i++) s += clamp(Number(b[i]) || 0, 0, 3); return Math.floor(s / NLEV); }
  function levelOf(d, id) { return clamp(Number((d.lv || {})[id]) || 1, 1, NLEV); }
  function levelsDone(d, id) { return bestOf(d, id).filter(function (s) { return s > 0; }).length; }
  function summary(d) {
    var band = d.band || (Core.profile() || {}).band || 'M', n = 0, list = WORLDS.filter(function (w) { return w.b === band; });
    list.forEach(function (w) { n += worldStars(d, w.id); });
    return { stars: n, max: list.length * 3 };
  }
  function progress(d) {
    var out = { plays: 0, bands: { M: [], U: [] } };
    WORLDS.forEach(function (w) { out.plays += ((d.w || {})[w.id] || {}).plays || 0; out.bands[w.b].push(worldStars(d, w.id)); });
    return out;
  }
  function parentReport(d) {
    var rows = [];
    WORLDS.forEach(function (w) { var x = (d.w || {})[w.id]; if (x && x.plays) rows.push([nameOf(w.id) + ' (' + w.b + ')', worldStars(d, w.id) + '/3', levelsDone(d, w.id) + '/' + NLEV]); });
    return { head: S.reportHead, rows: rows };
  }
  function collection(d) { return { n: WORLDS.filter(function (w) { return (d.cards || {})[w.id]; }).length, max: WORLDS.length }; }
  function starsFor(helped, shown) { return shown ? 1 : helped ? 2 : 3; }

  /* ---------- words ---------- */
  function pname(k) { return (S.parts[k] || S.parts.wall)[0]; }
  function pdef(k) { return (S.parts[k] || S.parts.wall)[1]; }
  function gange(x) { return Math.abs(x - 1) < 1e-9 ? S.times1 : S.timesN; }
  function partsWord(n) { return n === 1 ? S.part1 : t(S.partsN, { n: n }); }
  function boxLabel(b) {
    if (b.k === 'gear') return t(S.boxGear, { z: b.z });
    if (b.k === 'weight') return t(S.boxWeight, { m: num(b.m) });
    if (b.k === 'block') return t(S.boxBlock, { n: b.n });
    if (b.k === 'crank') return t(S.boxCrank, { z: b.z });
    return pname(b.k);
  }
  function loadWords(p) { return S.loads[(p && p.look) || 'bucket'] || S.loads.bucket; }

  /* ================= DRAWING (SVG strings; also used by the proof sheet) ================= */
  var GEARCOL = { 10: '#F59E0B', 15: '#84CC16', 20: '#38BDF8', 25: '#F472B6', 30: '#34D399', 40: '#A78BFA' };
  function txt(x, y, s, size, col, anchor, weight) {
    size = Math.round(size * TS);
    return '<text x="' + f1(x) + '" y="' + f1(y) + '" font-size="' + size + '" text-anchor="' + (anchor || 'middle') + '" font-weight="' + (weight || 800) + '" fill="' + (col || '#2B1D10') +
      '" stroke="#FFFFFF" stroke-width="' + Math.max(3, size / 5) + '" paint-order="stroke" stroke-linejoin="round" font-family="system-ui,Segoe UI,sans-serif">' + esc(s) + '</text>';
  }
  function gearR(z) { return 30 + 0.45 * z; }
  function gearShape(z, col) {
    var R = gearR(z), n = Math.max(8, Math.min(40, z)), o = '', i, a, b2;
    var pts = [];
    for (i = 0; i < n; i++) {
      a = i * 2 * Math.PI / n; b2 = Math.PI / n;
      [[a - b2 * 0.55, R], [a - b2 * 0.35, R + 7], [a + b2 * 0.35, R + 7], [a + b2 * 0.55, R]].forEach(function (q) { pts.push(f1(Math.cos(q[0]) * q[1]) + ',' + f1(Math.sin(q[0]) * q[1])); });
      pts.push(f1(Math.cos(a + b2) * (R - 1)) + ',' + f1(Math.sin(a + b2) * (R - 1)));
    }
    o += '<polygon points="' + pts.join(' ') + '" fill="' + col + '" stroke="#3B2A1A" stroke-width="2.5" stroke-linejoin="round"/>';
    o += '<circle r="' + f1(R * 0.62) + '" fill="#FFFFFF" fill-opacity=".35" stroke="#3B2A1A" stroke-opacity=".35" stroke-width="2"/>';
    o += '<line x1="0" y1="0" x2="0" y2="' + f1(-R * 0.62) + '" stroke="#3B2A1A" stroke-width="5" stroke-linecap="round"/>';
    o += '<circle r="7" fill="#3B2A1A"/>';
    return o;
  }
  function ballSvg() {
    return '<circle r="24" fill="#E2483D" stroke="#7A1D16" stroke-width="3"/><circle cx="-8" cy="-9" r="7" fill="#FFFFFF" fill-opacity=".7"/>';
  }
  function weightSvg(m) {
    return '<path d="M-30,22 L-22,-18 L22,-18 L30,22 Z" fill="#4B5563" stroke="#1F2937" stroke-width="3" stroke-linejoin="round"/><path d="M-9,-18 Q0,-32 9,-18" fill="none" stroke="#1F2937" stroke-width="4"/>' +
      '<text y="10" font-size="' + Math.round(19 * Math.min(TS, 1.3)) + '" text-anchor="middle" font-weight="800" fill="#FFFFFF" font-family="system-ui,sans-serif">' + esc(num(m)) + ' kg</text>';
  }
  function partSvg(p, W, o) {
    var k = p.k, d = p.d || 1, s = '', flip = d < 0 ? ' transform="translate(100,0) scale(-1,1)"' : '';
    switch (k) {
      case 'wall':
        return '<rect x="3" y="6" width="94" height="88" rx="9" fill="#C68B59" stroke="#6B4226" stroke-width="3"/><path d="M14,30 q20,-6 40,0 t34,0 M12,58 q24,6 44,0 t32,2" fill="none" stroke="#8B5A33" stroke-width="2.5" stroke-linecap="round"/>';
      case 'ramp':
        s = '<polygon points="6,8 94,92 6,92" fill="#F2B33D" stroke="#8A5A12" stroke-width="3" stroke-linejoin="round"/><line x1="10" y1="12" x2="88" y2="86" stroke="#FFF3C4" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M30,62 l14,0 l-4,-5 M44,62 l-4,5" fill="none" stroke="#8A5A12" stroke-width="3" stroke-linecap="round"/>';
        return '<g' + flip + '>' + s + '</g>';
      case 'push':
        s = '<rect x="6" y="34" width="46" height="50" rx="8" fill="#E2483D" stroke="#7A1D16" stroke-width="3"/><path d="M18,59 l14,0 m-5,-6 l6,6 l-6,6" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<g class="of-plunger"><rect x="52" y="54" width="22" height="10" fill="#9CA3AF" stroke="#374151" stroke-width="2"/><rect x="74" y="44" width="16" height="30" rx="5" fill="#FBBF24" stroke="#92400E" stroke-width="3"/></g>';
        return '<g' + flip + '>' + s + '</g>';
      case 'domino':
        return '<g class="of-dom"><rect x="36" y="10" width="28" height="86" rx="5" fill="#FFFDF5" stroke="#2B2B3A" stroke-width="3"/><line x1="40" y1="53" x2="60" y2="53" stroke="#2B2B3A" stroke-width="2.5"/>' +
          '<circle cx="50" cy="30" r="4" fill="#2B2B3A"/><circle cx="44" cy="70" r="3.5" fill="#2B2B3A"/><circle cx="56" cy="80" r="3.5" fill="#2B2B3A"/></g>';
      case 'spring':
        s = '<rect x="18" y="86" width="64" height="10" rx="3" fill="#6B7280" stroke="#374151" stroke-width="2.5"/><polyline points="50,86 30,78 70,70 30,62 70,54 30,46 50,40" fill="none" stroke="#475569" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>' +
          '<rect x="22" y="32" width="56" height="9" rx="3" fill="#22C55E" stroke="#166534" stroke-width="2.5"/><path d="M44,24 Q62,4 82,16" fill="none" stroke="#166534" stroke-width="4" stroke-linecap="round"/><path d="M76,8 l8,8 l-10,4" fill="none" stroke="#166534" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
        return '<g' + flip + '>' + s + '</g>';
      case 'bell':
        return '<line x1="50" y1="4" x2="50" y2="16" stroke="#6B4226" stroke-width="5"/><g class="of-bellbody"><path d="M24,74 Q24,22 50,18 Q76,22 76,74 L84,82 L16,82 Z" fill="#FACC15" stroke="#854D0E" stroke-width="3" stroke-linejoin="round"/>' +
          '<circle cx="50" cy="88" r="8" fill="#854D0E"/><path d="M34,40 q4,-12 14,-14" fill="none" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/></g>' +
          '<g class="of-ringlines" fill="none" stroke="#854D0E" stroke-width="4" stroke-linecap="round"><path d="M8,40 q-6,12 0,24"/><path d="M92,40 q6,12 0,24"/></g>';
      case 'cup':
        return '<path d="M14,30 L24,94 L76,94 L86,30 Z" fill="#6BB8E0" stroke="#1E4E79" stroke-width="3" stroke-linejoin="round"/><ellipse cx="50" cy="30" rx="36" ry="8" fill="#1E4E79" fill-opacity=".35" stroke="#1E4E79" stroke-width="3"/>' +
          '<path d="M86,44 q14,4 8,22 q-4,8 -12,8" fill="none" stroke="#1E4E79" stroke-width="5"/>';
      case 'flower':
        return '<path d="M30,72 L36,96 L64,96 L70,72 Z" fill="#C2410C" stroke="#7C2D12" stroke-width="3" stroke-linejoin="round"/><rect x="26" y="66" width="48" height="9" rx="3" fill="#EA580C" stroke="#7C2D12" stroke-width="2.5"/>' +
          '<g class="of-dry"><path d="M50,66 Q50,46 60,36" fill="none" stroke="#65A30D" stroke-width="4"/><g transform="translate(62,36) rotate(40)"><ellipse rx="10" ry="6" cx="0" cy="-8" fill="#C4B5A0"/><ellipse rx="10" ry="6" cx="0" cy="8" fill="#C4B5A0"/><circle r="6" fill="#A8A29E"/></g></g>' +
          '<g class="of-wet"><path d="M50,66 L50,34" stroke="#16A34A" stroke-width="5"/><path d="M50,54 q-14,-6 -18,-16 q12,0 18,10" fill="#22C55E"/><g transform="translate(50,26)"><circle cx="0" cy="-12" r="9" fill="#F472B6"/><circle cx="12" cy="0" r="9" fill="#F472B6"/><circle cx="0" cy="12" r="9" fill="#F472B6"/><circle cx="-12" cy="0" r="9" fill="#F472B6"/><circle r="8" fill="#FACC15"/></g></g>';
      case 'can':
        s = '<g class="of-canbody"><path d="M20,44 L26,92 L66,92 L72,44 Z" fill="#22C55E" stroke="#14532D" stroke-width="3" stroke-linejoin="round"/><path d="M72,58 L94,34" stroke="#14532D" stroke-width="9" stroke-linecap="round"/><path d="M72,58 L94,34" stroke="#22C55E" stroke-width="4" stroke-linecap="round"/>' +
          '<path d="M30,44 Q46,20 62,44" fill="none" stroke="#14532D" stroke-width="5"/><ellipse cx="46" cy="44" rx="26" ry="6" fill="#1E3A8A" fill-opacity=".5"/></g>';
        return '<g' + flip + '>' + s + '</g>';
      case 'button':
        return '<rect x="14" y="80" width="72" height="16" rx="5" fill="#6B7280" stroke="#374151" stroke-width="3"/><g class="of-btncap"><path d="M26,80 Q26,58 50,58 Q74,58 74,80 Z" fill="#EF4444" stroke="#7F1D1D" stroke-width="3"/></g>';
      case 'door':
        return '<rect x="4" y="4" width="92" height="92" rx="6" fill="#A16207" stroke="#713F12" stroke-width="3"/><rect x="18" y="30" width="64" height="66" rx="30" fill="#2B1D10"/>' +
          '<g class="of-cat"><circle cx="50" cy="70" r="20" fill="#F97316"/><path d="M33,58 l4,-16 l10,10 M67,58 l-4,-16 l-10,10" fill="#F97316"/><circle cx="43" cy="68" r="3" fill="#2B1D10"/><circle cx="57" cy="68" r="3" fill="#2B1D10"/><path d="M47,76 q3,3 6,0" fill="none" stroke="#2B1D10" stroke-width="2"/></g>' +
          '<g class="of-flap"><rect x="16" y="28" width="68" height="70" rx="30" fill="#CA8A04" stroke="#713F12" stroke-width="3"/><circle cx="72" cy="66" r="4" fill="#713F12"/></g>';
      case 'friend':
        return '<rect x="6" y="66" width="88" height="28" rx="8" fill="#93C5FD" stroke="#1E3A8A" stroke-width="3"/><rect x="6" y="48" width="22" height="46" rx="6" fill="#BFDBFE" stroke="#1E3A8A" stroke-width="3"/>' +
          '<g><circle cx="36" cy="56" r="18" fill="#A16207" stroke="#713F12" stroke-width="3"/><circle cx="24" cy="42" r="7" fill="#A16207" stroke="#713F12" stroke-width="2.5"/><circle cx="48" cy="42" r="7" fill="#A16207" stroke="#713F12" stroke-width="2.5"/>' +
          '<g class="of-sleep"><path d="M27,56 q4,3 8,0 M39,56 q4,3 8,0" fill="none" stroke="#2B1D10" stroke-width="2.5" stroke-linecap="round"/><text x="70" y="40" font-size="20" font-weight="800" fill="#1E3A8A" font-family="system-ui,sans-serif">z</text><text x="80" y="26" font-size="15" font-weight="800" fill="#1E3A8A" font-family="system-ui,sans-serif">z</text></g>' +
          '<g class="of-awake"><circle cx="31" cy="54" r="3.5" fill="#2B1D10"/><circle cx="43" cy="54" r="3.5" fill="#2B1D10"/><ellipse cx="37" cy="63" rx="4" ry="5" fill="#7F1D1D"/><text x="66" y="38" font-size="28" font-weight="900" fill="#DC2626" font-family="system-ui,sans-serif">!</text></g></g>' +
          '<path d="M44,70 q20,-8 50,-2" fill="none" stroke="#1E3A8A" stroke-width="3"/>';
      case 'gear': case 'crank': case 'dial': case 'winch':
        return gearPartSvg(p, W, o);
      case 'basket':
        return '';
      default: return '';
    }
  }
  function gearPartSvg(p, W, o) {
    var s = '', z = p.z;
    if (p.k === 'winch' && z) s += '';
    if (!z) { // an empty axle
      s += '<circle cx="50" cy="50" r="38" fill="#FFFFFF" fill-opacity=".55" stroke="#7A5A3E" stroke-width="3" stroke-dasharray="8 7"/><circle cx="50" cy="50" r="8" fill="#7A5A3E"/>';
      s += txt(50, 32, '?', 26, '#7A5A3E');
    } else {
      s += '<g transform="translate(50,50)"><g class="of-rot" data-ix="' + p.ix + '">' + gearShape(z, GEARCOL[z] || '#FBBF24');
      if (p.k === 'crank') s += '<line x1="0" y1="0" x2="' + f1(gearR(z) * 0.9) + '" y2="0" stroke="#7C2D12" stroke-width="8" stroke-linecap="round"/><circle cx="' + f1(gearR(z) * 0.9) + '" cy="0" r="9" fill="#EF4444" stroke="#7C2D12" stroke-width="3"/>';
      if (p.k === 'winch') s += '<circle r="15" fill="#A16207" stroke="#713F12" stroke-width="3"/>';
      if (p.k === 'dial') s += '<circle r="17" fill="#FFFFFF" stroke="#1F2937" stroke-width="2.5"/><path d="M0,4 L0,-26" stroke="#DC2626" stroke-width="6" stroke-linecap="round"/><path d="M-6,-20 L0,-32 L6,-20 Z" fill="#DC2626"/>';
      s += '</g></g>';
      if (o.numbers || p.k !== 'gear') s += txt(p.k === 'crank' ? 18 : 82, 96, String(z), 22, '#1F2937');
    }
    if (p.k === 'crank' && !z) s += txt(50, 92, S.parts.crank[0], 15, '#7A5A3E');
    return s;
  }
  // a goal: a little flag in the corner (green tick when reached)
  function goalBadge(cls) {
    return '<g class="of-goalflag ' + (cls || '') + '"><circle cx="86" cy="14" r="13" fill="#FACC15" stroke="#854D0E" stroke-width="2.5"/><path d="M80,14 l4,5 l8,-10" class="of-tick" fill="none" stroke="#14532D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="of-star" d="M86,5 l2.6,5.6 6,.6 -4.5,4 1.3,6 -5.4,-3.1 -5.4,3.1 1.3,-6 -4.5,-4 6,-.6z" fill="#854D0E"/></g>';
  }
  function dialGoal(p) {
    var a = (p.want || 1) > 0;
    return '<g class="of-dialgoal"><rect x="1" y="1" width="58" height="26" rx="13" fill="#FFFFFF" stroke="#B91C1C" stroke-width="2.5"/>' +
      '<g transform="translate(45,14)"><path d="' + (a ? 'M-6,-3 A7,7 0 1 1 -3,6' : 'M6,-3 A7,7 0 1 0 3,6') + '" fill="none" stroke="#B91C1C" stroke-width="2.5"/>' +
      '<path d="' + (a ? 'M-9,-6 L-6,0 L-2,-5' : 'M9,-6 L6,0 L2,-5') + '" fill="none" stroke="#B91C1C" stroke-width="2.5" stroke-linejoin="round"/></g>' +
      '<text x="20" y="21" font-size="17" text-anchor="middle" font-weight="900" fill="#B91C1C" font-family="system-ui,sans-serif">' + esc(num(p.need)) + '×</text></g>';
  }
  // The whole picture. opts: { uid, W (from OF_PHYS.build or a run), grid: bool, numbers: bool, label, mine: { 'c,r': 1 }, sel: 'c,r', tip: 'c,r' }
  function sceneSvg(W, opts) {
    opts = opts || {};
    var uid = opts.uid || ('of' + (++uidN) + '-'), o = '', back = '', front = '';
    TS = opts.ts || TS || 1;
    o += '<defs><pattern id="' + uid + 'peg" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="12.5" cy="12.5" r="2.6" fill="#D9BF92"/></pattern>' +
      '<linearGradient id="' + uid + 'wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B7793F"/><stop offset="1" stop-color="#8A5527"/></linearGradient></defs>';
    o += '<rect width="' + VW + '" height="' + VH + '" fill="#F6E7C8"/><rect width="' + VW + '" height="' + FLOOR + '" fill="url(#' + uid + 'peg)"/>';
    o += '<rect y="' + FLOOR + '" width="' + VW + '" height="' + (VH - FLOOR) + '" fill="url(#' + uid + 'wood)"/><line x1="0" y1="' + FLOOR + '" x2="' + VW + '" y2="' + FLOOR + '" stroke="#5B3517" stroke-width="4"/>';
    if (opts.grid) { var g = '<g class="of-gridlines" stroke="#B08A5A" stroke-opacity=".45" stroke-width="2" stroke-dasharray="6 8">'; for (var c = 1; c < COLS; c++) g += '<line x1="' + c * CELL + '" y1="0" x2="' + c * CELL + '" y2="' + FLOOR + '"/>'; for (var r = 1; r < ROWS; r++) g += '<line x1="0" y1="' + r * CELL + '" x2="' + VW + '" y2="' + r * CELL + '"/>'; o += g + '</g>'; }
    var mine = opts.mine || {};
    // highlight under the child's parts, the selection and the tip
    W.parts.forEach(function (p) { if (mine[p.c + ',' + p.r]) back += '<rect class="of-mine" x="' + (p.c * CELL + 4) + '" y="' + (p.r * CELL + 4) + '" width="92" height="92" rx="14"/>'; });
    W.actors.forEach(function (a) { if (mine[a.c + ',' + a.r]) back += '<rect class="of-mine" x="' + (a.c * CELL + 4) + '" y="' + (a.r * CELL + 4) + '" width="92" height="92" rx="14"/>'; });
    if (opts.tip) { var tp = opts.tip.split(','); back += '<rect class="of-tipcell" x="' + (tp[0] * CELL + 2) + '" y="' + (tp[1] * CELL + 2) + '" width="96" height="96" rx="16"/>'; }
    o += back;
    // links from buttons to what they start (a dotted cable)
    W.parts.forEach(function (p) {
      if (p.k !== 'button' || !p.link) return;
      var q = W.parts.filter(function (x) { return x.name === p.link; })[0]; if (!q) return;
      o += '<path d="M' + (p.c * CELL + 50) + ',' + (p.r * CELL + 82) + ' C' + (p.c * CELL + 50) + ',' + (p.r * CELL + 130) + ' ' + (q.c * CELL + 50) + ',' + (q.r * CELL + 130) + ' ' + (q.c * CELL + 50) + ',' + (q.r * CELL + 60) + '" fill="none" stroke="#7C3AED" stroke-opacity=".55" stroke-width="4" stroke-dasharray="3 9" stroke-linecap="round"/>';
    });
    // levers, hoists and winches (several cells each)
    W.levers.forEach(function (L, i) { o += leverSvg(L, i, uid, opts); });
    W.rigs.forEach(function (rig, i) { o += rigSvg(rig, i, uid, opts); });
    W.parts.forEach(function (p) { if (p.k === 'winch' && p.bucket) o += winchRopeSvg(p, uid); });
    // the single-cell parts
    W.parts.forEach(function (p) {
      var inner = partSvg(p, W, opts); if (!inner && !p.goal) return;
      var cls = 'of-part k-' + p.k + (p.k === 'can' ? ' d' + (p.d || 1) : '');
      var gb = '';
      if (p.goal && p.k !== 'load' && p.k !== 'wbucket' && p.k !== 'pivot') gb = p.k === 'dial' ? dialGoal(p) + goalBadge('dialg') : goalBadge();
      o += '<g class="' + cls + '" id="' + uid + 'p' + p.ix + '" transform="translate(' + p.c * CELL + ',' + p.r * CELL + ')">' + inner + gb + '</g>';
    });
    // water from the cans
    W.parts.forEach(function (p) { if (p.k === 'can') o += '<rect class="of-water" id="' + uid + 'w' + p.ix + '" x="0" y="0" width="0" height="0" rx="9" fill="#38BDF8" fill-opacity=".85"/>'; });
    // the balls and weights
    W.actors.forEach(function (a, i) { var xy = actorXY(W, a.c, a.r, a.k); front += '<g class="of-actor k-' + a.k + '" id="' + uid + 'a' + i + '" transform="translate(' + xy[0] + ',' + f1(xy[1] + leverOff(W, a.c, a.r, 0)) + ')">' + (a.k === 'ball' ? ballSvg() : weightSvg(a.m)) + '</g>'; });
    o += front;
    if (opts.sel) { var sp = opts.sel.split(','); o += '<rect class="of-selcell" x="' + (sp[0] * CELL + 3) + '" y="' + (sp[1] * CELL + 3) + '" width="94" height="94" rx="14"/>'; }
    o += '<g id="' + uid + 'marks"></g>';
    return '<svg class="of-svg" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="' + esc(opts.label || S.scene) + '" xmlns="http://www.w3.org/2000/svg">' + o + '</svg>';
  }
  function leverSvg(L, i, uid, opts) {
    var px = L.pc * CELL + 50, py = L.pr * CELL + 7, o = '';
    o += '<path d="M' + (px - 26) + ',' + (L.pr * CELL + 96) + ' L' + px + ',' + (py + 6) + ' L' + (px + 26) + ',' + (L.pr * CELL + 96) + ' Z" fill="#9CA3AF" stroke="#374151" stroke-width="3" stroke-linejoin="round"/>';
    var x0 = -L.left * CELL - 46, x1 = L.right * CELL + 46;
    o += '<g class="of-plank" id="' + uid + 'lv' + i + '" transform="translate(' + px + ',' + py + ') rotate(' + (L.start * 11) + ')"><rect x="' + x0 + '" y="-7" width="' + (x1 - x0) + '" height="14" rx="5" fill="#B45309" stroke="#78350F" stroke-width="3"/>';
    if (opts.numbers) for (var k = -L.left; k <= L.right; k++) if (k) o += '<line x1="' + k * CELL + '" y1="-7" x2="' + k * CELL + '" y2="7" stroke="#FDE68A" stroke-width="3"/>';
    o += '</g><circle cx="' + px + '" cy="' + py + '" r="7" fill="#1F2937"/>';
    if (opts.numbers) for (var j = -L.left; j <= L.right; j++) if (j) o += txt(px + j * CELL, L.pr * CELL + 52, Math.abs(j) + ' m', 20, '#78350F');
    if (L.pivot.goal) o += '<g transform="translate(' + L.pc * CELL + ',' + L.pr * CELL + ')">' + goalBadge() + '</g>';
    if (L.pivot.balance) o += '<path d="M' + (px - 40) + ',' + (L.pr * CELL + 38) + ' h80" stroke="#15803D" stroke-width="3" stroke-dasharray="6 5"/>';
    return o;
  }
  function loadSvg(p, numbers) {
    var look = p.look || 'bucket', s;
    if (look === 'crate') s = '<rect x="12" y="22" width="76" height="72" rx="5" fill="#D97706" stroke="#78350F" stroke-width="3"/><path d="M12,22 L88,94 M88,22 L12,94" stroke="#92400E" stroke-width="4"/><rect x="12" y="22" width="76" height="72" rx="5" fill="none" stroke="#78350F" stroke-width="3"/>';
    else s = '<path d="M20,34 L28,94 L72,94 L80,34 Z" fill="#94A3B8" stroke="#334155" stroke-width="3" stroke-linejoin="round"/>' + (look === 'water' ? '<path d="M23,46 L77,46 L72,90 L28,90 Z" fill="#38BDF8" fill-opacity=".8"/>' : '') + '<path d="M22,36 Q50,0 78,36" fill="none" stroke="#334155" stroke-width="4"/>';
    if (numbers && p.m) s += txt(50, 70, num(p.m) + ' kg', 20, '#1F2937');
    return '<line x1="50" y1="0" x2="50" y2="20" stroke="#5B3A1E" stroke-width="4"/>' + s;
  }
  function needLine(c, r, need, numbers) {
    var y = (r - need) * CELL + 34;
    return '<g class="of-need"><line x1="' + (c * CELL + 4) + '" y1="' + y + '" x2="' + (c * CELL + 96) + '" y2="' + y + '" stroke="#15803D" stroke-width="4" stroke-dasharray="10 6"/>' +
      '<path d="M' + (c * CELL + 92) + ',' + (y - 2) + ' v-26 l-18,8 l18,8" fill="#22C55E" stroke="#14532D" stroke-width="2"/></g>';
  }
  function rigSvg(rig, i, uid, opts) {
    var cx = (Math.min(rig.cl, rig.cp) + 1) * CELL, cy = rig.rw * CELL + 50, o = '', lx = rig.cl * CELL + 50, pxx = rig.cp * CELL + 50;
    o += '<rect x="' + (cx - 60) + '" y="' + (rig.rw * CELL + 2) + '" width="120" height="12" rx="4" fill="#6B7280" stroke="#374151" stroke-width="2.5"/>';
    o += needLine(rig.cl, rig.rl, rig.load.need, opts.numbers);
    o += '<g id="' + uid + 'rig' + i + '">';
    var n = rig.n;
    // the ropes are drawn by frame() (they change length); here only placeholders
    o += '<g class="of-ropes" id="' + uid + 'rope' + i + '" stroke="#5B3A1E" stroke-width="4" fill="none">' + ropeLines(rig, { rise: 0, drop: 0 }) + '</g>';
    o += '<g id="' + uid + 'load' + i + '">' + (rig.slot ? '<g transform="translate(' + rig.cl * CELL + ',' + (rig.rl - 1) * CELL + ')">' + blockSvg(rig.slot.k === 'block' ? n : 0, opts) + '</g>' : '') +
      '<g transform="translate(' + rig.cl * CELL + ',' + rig.rl * CELL + ')">' + loadSvg(rig.load, opts.numbers) + goalBadge() + '</g></g>';
    if (rig.pull.k === 'basket') o += '<g id="' + uid + 'pull' + i + '"><g transform="translate(' + rig.cp * CELL + ',' + rig.rp * CELL + ')"><line x1="50" y1="0" x2="50" y2="34" stroke="#5B3A1E" stroke-width="4"/><path d="M14,40 L24,92 L76,92 L86,40 Z" fill="#D6A35C" stroke="#7C4A12" stroke-width="3"/><path d="M18,58 h64 M21,74 h58" stroke="#7C4A12" stroke-width="2.5"/><path d="M14,40 Q50,6 86,40" fill="none" stroke="#7C4A12" stroke-width="4"/></g></g>';
    else o += '<g id="' + uid + 'pull' + i + '"><g transform="translate(' + rig.cp * CELL + ',' + rig.rp * CELL + ')"><rect x="6" y="34" width="88" height="62" rx="8" fill="#2563EB" stroke="#1E3A8A" stroke-width="3"/><g transform="translate(50,36)"><g class="of-rot" data-rig="' + i + '"><circle r="16" fill="#A16207" stroke="#713F12" stroke-width="3"/><line x1="0" y1="0" x2="0" y2="-12" stroke="#713F12" stroke-width="4"/></g></g>' +
      (opts.numbers ? '<text x="50" y="80" font-size="' + Math.round(15 * Math.min(TS, 1.3)) + '" text-anchor="middle" font-weight="800" fill="#FFFFFF" font-family="system-ui,sans-serif">' + esc(num(rig.pull.F)) + ' kg</text><text x="50" y="94" font-size="' + Math.round(12 * Math.min(TS, 1.3)) + '" text-anchor="middle" font-weight="700" fill="#DBEAFE" font-family="system-ui,sans-serif">' + esc(num(rig.pull.R)) + ' m reb</text>' : '') + '</g></g>';
    o += '</g>';
    o += '<g transform="translate(' + cx + ',' + cy + ')"><g class="of-rot" data-wheel="' + i + '"><circle r="46" fill="#CBD5E1" stroke="#334155" stroke-width="4"/><circle r="38" fill="none" stroke="#64748B" stroke-width="3"/><path d="M0,-38 L0,38 M-38,0 L38,0" stroke="#64748B" stroke-width="4"/></g><circle r="8" fill="#334155"/></g>';
    return o;
  }
  function blockSvg(n, opts) {
    if (!n) return '<g><circle cx="50" cy="56" r="16" fill="#FFFFFF" fill-opacity=".6" stroke="#7A5A3E" stroke-width="3" stroke-dasharray="6 6"/><path d="M50,72 v12 q0,8 -8,8" fill="none" stroke="#7A5A3E" stroke-width="4"/></g>';
    var o = '<rect x="22" y="30" width="56" height="52" rx="10" fill="#E5E7EB" stroke="#334155" stroke-width="3"/>';
    for (var k = 0; k < Math.min(n, 4); k++) o += '<circle cx="' + (34 + k * 32 / Math.max(1, Math.min(n, 4) - 1)) + '" cy="50" r="' + (n > 2 ? 8 : 11) + '" fill="#94A3B8" stroke="#334155" stroke-width="2"/>';
    o += '<path d="M50,82 v12" stroke="#334155" stroke-width="4"/>';
    if (opts.numbers || true) o += txt(50, 76, String(n), 20, '#1F2937');
    return o;
  }
  function winchRopeSvg(p, uid) {
    var b = p.bucket, o = needLine(b.c, b.r, b.need, true);
    o += '<g id="' + uid + 'wb' + p.ix + '"><line class="of-wrope" x1="' + (p.c * CELL + 50) + '" y1="' + (p.r * CELL + 60) + '" x2="' + (p.c * CELL + 50) + '" y2="' + (b.r * CELL + 2) + '" stroke="#5B3A1E" stroke-width="4"/>' +
      '<g class="of-wbucket" transform="translate(' + b.c * CELL + ',' + b.r * CELL + ')">' + loadSvg(b, false) + goalBadge() + '</g></g>';
    return o;
  }
  // where a ball or a weight is drawn in cell (c, r)
  function actorXY(W, c, r, k) {
    var p = P.inside(c, r) ? W.grid[r * COLS + c] : null, x = c * CELL + 50, y = r * CELL + (k === 'ball' ? 72 : 74);
    if (p && p.k === 'ramp') y = r * CELL + 40;
    if (p && p.k === 'cup') y = r * CELL + 62;
    if (p && p.k === 'basket') y = r * CELL + 58;
    return [x, y];
  }

  /* ================= THE BENCH: the picture, the cells to tap and the running machine ================= */
  // B = { cfg, host, stage, cells, svg, uid, W, res, tf, mode: 'build' | 'play' | 'pause' | 'end', target, shown }
  // cfg = { machine(): parts, numbers, mine(): {key}, sel(): 'c,r', tip(): 'c,r', onCell(c, r), onTick(k, evs), onEnd(res), cellLabel(c, r) }
  var B = null;
  function stepMs() { return 560 / speedK; }
  function makeBench(cfg) {
    var b = { cfg: cfg, uid: 'ofb' + (++uidN) + '-', mode: 'build', res: null, tf: 0, shown: 0 };
    b.stage = h('div', { class: 'of-stage' });
    b.cells = h('div', { class: 'of-cells' });
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) (function (c, r) {
      b.cells.appendChild(h('button', { type: 'button', class: 'of-cell', 'data-c': c, 'data-r': r, onclick: function () { if (B === b) cfg.onCell(c, r); } }));
    })(c, r);
    b.host = h('div', { class: 'of-stagewrap' }, [b.stage, b.cells]);
    return b;
  }
  function textScale() { var w = (app && app.clientWidth) || root.innerWidth || 1000; return w < 560 ? 1.55 : w < 820 ? 1.2 : 1; }
  function benchDraw() {
    var b = B; if (!b) return;
    b.res = null; b.tf = 0; b.mode = 'build'; b.shown = 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    b.W = F.build(b.cfg.machine());
    b.stage.innerHTML = sceneSvg(b.W, { uid: b.uid, grid: true, numbers: b.cfg.numbers, mine: b.cfg.mine ? b.cfg.mine() : {}, sel: b.cfg.sel ? b.cfg.sel() : null, tip: b.cfg.tip ? b.cfg.tip() : null, ts: textScale() });
    b.svg = b.stage.querySelector('svg');
    b.cells.classList.remove('off');
    [].forEach.call(b.cells.children, function (btn) { var c = +btn.getAttribute('data-c'), r = +btn.getAttribute('data-r'); btn.setAttribute('aria-label', b.cfg.cellLabel(c, r)); btn.disabled = false; });
  }
  function q(id) { return B.svg.querySelector('#' + B.uid + id); }
  function prog(t0, t1, tf) { return t0 < 0 ? 0 : t1 <= t0 ? (tf >= t0 ? 1 : 0) : clamp((tf - t0) / (t1 - t0), 0, 1); }
  function leverAngle(L, tf) {
    var cur = L.start * 11;
    for (var i = 0; i < L.flips.length; i++) {
      var f = L.flips[i];
      if (tf >= f[0]) cur = f[1] * 11;
      else { if (tf > f[0] - 1) return cur + (f[1] * 11 - cur) * (tf - (f[0] - 1)); break; }
    }
    return cur;
  }
  function leverOff(W, c, r, tf) {
    for (var i = 0; i < W.levers.length; i++) {
      var L = W.levers[i];
      if ((r === L.pr - 1 || r === L.pr - 2) && c >= L.pc - L.left && c <= L.pc + L.right) return Math.tan(leverAngle(L, tf) * Math.PI / 180) * (c - L.pc) * CELL;
    }
    return 0;
  }
  function rigNow(rig, tf) { var p = prog(rig.t0, rig.t1, tf); return { rise: rig.state === 1 ? rig.rise * p : 0, drop: rig.state === 1 ? rig.drop * p : 0, p: p }; }
  function onOff(node, on) { if (node) node.classList.toggle('on', !!on); }
  // draw the machine as it is at time tf (a tick number, with fractions between the ticks)
  function frame(tf) {
    var b = B, W = b.W, res = b.res, svg = b.svg; if (!svg || !res) return;
    var n = res.snaps.length, k0 = clamp(Math.floor(tf), 0, n - 1), k1 = Math.min(k0 + 1, n - 1), fr = clamp(tf - k0, 0, 1);
    W.actors.forEach(function (a, i) {
      var s0 = res.snaps[k0][i], s1 = res.snaps[k1][i], node = q('a' + i); if (!node) return;
      var p0 = actorXY(W, s0[0], s0[1], a.k), p1 = actorXY(W, s1[0], s1[1], a.k);
      var y0 = p0[1] + leverOff(W, s0[0], s0[1], k0), y1 = p1[1] + leverOff(W, s1[0], s1[1], k1);
      var x = p0[0] + (p1[0] - p0[0]) * fr, y = y0 + (y1 - y0) * fr;
      var cellP = W.grid[s1[1] * COLS + s1[0]];
      if (s1[2] && cellP && cellP.k === 'basket' && cellP.rig) y += rigNow(cellP.rig, tf).drop * CELL;
      var rot = a.k === 'ball' ? (p1[0] - p0[0]) * fr * 3 + (s0[0] * 100) : 0;
      node.setAttribute('transform', 'translate(' + f1(x) + ',' + f1(y) + ')' + (s1[2] && cellP && cellP.k === 'cup' ? ' scale(.82)' : '') + (rot ? ' rotate(' + f1(rot) + ')' : ''));
    });
    W.parts.forEach(function (p) {
      var g = q('p' + p.ix);
      if (p.k === 'domino' && g) { var dm = g.querySelector('.of-dom'), a = p.kt !== undefined ? p.fd * 84 * prog(p.kt, p.ft === undefined ? p.kt + 1 : p.ft, tf) : 0; dm.setAttribute('transform', a ? 'rotate(' + f1(a) + ' ' + (p.fd > 0 ? 64 : 36) + ' 96)' : ''); }
      if (p.k === 'can' && g) {
        var cb = g.querySelector('.of-canbody'), ta = p.tipped !== undefined ? 62 * prog(p.tipped - 1, p.tipped, tf) : 0; cb.setAttribute('transform', ta ? 'rotate(' + f1(ta) + ' 46 92)' : '');
        var wr = q('w' + p.ix);
        if (wr && p.water && p.wt !== undefined && tf > p.wt - 1) {
          var hitP = P.inside(p.water[0], p.water[2]) ? W.grid[p.water[2] * COLS + p.water[0]] : null, yEnd = p.water[2] >= ROWS ? FLOOR : p.water[2] * CELL + (hitP && hitP.k === 'flower' ? 40 : 6), y0w = p.water[1] * CELL + 36;
          var hh = (yEnd - y0w) * prog(p.wt - 1, p.wt, tf);
          wr.setAttribute('x', p.water[0] * CELL + 36); wr.setAttribute('y', y0w); wr.setAttribute('width', 28); wr.setAttribute('height', f1(Math.max(0, hh)));
        } else if (wr) wr.setAttribute('height', 0);
      }
      if (g) {
        if (p.k === 'bell') onOff(g, p.rung !== undefined && tf >= p.rung);
        if (p.k === 'button') onOff(g, p.pressed !== undefined && tf >= p.pressed);
        if (p.k === 'door') onOff(g, p.open !== undefined && tf >= p.open);
        if (p.k === 'friend') onOff(g, p.awake !== undefined && tf >= p.awake);
        if (p.k === 'flower') onOff(g, p.watered !== undefined && tf >= p.watered);
        if (p.k === 'push') onOff(g, tf >= 0.5 && tf < 1.6);
        if (p.k === 'crank' || p.k === 'motor') onOff(g, p.jam !== undefined && tf >= p.jam);
      }
      if (P.KINDS[p.k].gear && p.z) {
        var rn = svg.querySelector('.of-rot[data-ix="' + p.ix + '"]');
        if (rn) { var ang = p.train ? (p.dir || 0) * (p.turns || 0) * 360 * prog(p.train.t0, p.train.t1, tf) : 0; rn.setAttribute('transform', 'rotate(' + f1(ang) + ')'); }
      }
      if (p.k === 'winch' && p.bucket) {
        var wb = q('wb' + p.ix), bk = p.bucket, rise = p.train ? (bk.rise || 0) * prog(p.train.t0, p.train.t1, tf) : 0;
        if (wb) { wb.querySelector('.of-wbucket').setAttribute('transform', 'translate(' + bk.c * CELL + ',' + f1(bk.r * CELL - rise * CELL) + ')'); wb.querySelector('.of-wrope').setAttribute('y2', f1(bk.r * CELL + 2 - rise * CELL)); }
      }
    });
    W.levers.forEach(function (L, i) { var pl = q('lv' + i); if (pl) pl.setAttribute('transform', 'translate(' + (L.pc * CELL + 50) + ',' + (L.pr * CELL + 7) + ') rotate(' + f1(leverAngle(L, tf)) + ')'); });
    W.rigs.forEach(function (rig, i) { rigFrame(rig, i, rigNow(rig, tf), W); });
  }
  function ropeLines(rig, now) {
    var cy = rig.rw * CELL + 50, lx = rig.cl * CELL + 50, px = rig.cp * CELL + 50, n = rig.n, o = '';
    var top = rig.slot ? (rig.rl - 1) * CELL + 30 - now.rise * CELL : rig.rl * CELL - now.rise * CELL;
    if (rig.slot && rig.slot.k === 'block' && n > 1) for (var k = 0; k < n; k++) { var x = lx - 16 + 32 * k / (n - 1); o += '<line x1="' + f1(x) + '" y1="' + cy + '" x2="' + f1(x) + '" y2="' + f1(top + 8) + '"/>'; }
    else o += '<line x1="' + lx + '" y1="' + cy + '" x2="' + lx + '" y2="' + f1(top + (rig.slot ? 8 : 0)) + '"/>';
    var pend = rig.pull.k === 'basket' ? rig.rp * CELL + now.drop * CELL : rig.rp * CELL + 18;
    o += '<line x1="' + px + '" y1="' + cy + '" x2="' + px + '" y2="' + f1(pend) + '"/>';
    return o;
  }
  function rigFrame(rig, i, now, W) {
    var ld = q('load' + i), pl = q('pull' + i), rp = q('rope' + i); if (!ld) return;
    ld.setAttribute('transform', 'translate(0,' + f1(-now.rise * CELL) + ')');
    if (rig.pull.k === 'basket') pl.setAttribute('transform', 'translate(0,' + f1(now.drop * CELL) + ')');
    var o = ropeLines(rig, now), n = rig.n;
    rp.innerHTML = o;
    var wheel = B.svg.querySelector('.of-rot[data-wheel="' + i + '"]'), sign = rig.cp > rig.cl ? 1 : -1;
    if (wheel) wheel.setAttribute('transform', 'rotate(' + f1(sign * now.rise * n * CELL / 46 * 57.3) + ')');
    var drum = B.svg.querySelector('.of-rot[data-rig="' + i + '"]'); if (drum) drum.setAttribute('transform', 'rotate(' + f1(now.rise * n * 300) + ')');
    if (pl) pl.classList.toggle('weak', rig.state === 3);
  }
  // start (or go on with) the machine; step = only one tick
  function benchRun(step) {
    var b = B; if (!b) return;
    if (!b.res) {
      b.res = F.run(b.cfg.machine(), { trace: true }); b.W = b.res.W; b.tf = 0; b.shown = 0;
      b.stage.innerHTML = sceneSvg(b.W, { uid: b.uid, grid: false, numbers: b.cfg.numbers, mine: b.cfg.mine ? b.cfg.mine() : {}, ts: textScale() });
      b.svg = b.stage.querySelector('svg'); b.cells.classList.add('off');
      [].forEach.call(b.cells.children, function (btn) { btn.disabled = true; });
      frame(0);
      if (b.cfg.onStart) b.cfg.onStart();
    }
    if (b.mode === 'end') return;
    b.mode = 'play'; b.target = step ? Math.min(b.res.ticks, Math.floor(b.tf + 1e-6) + 1) : b.res.ticks;
    if (b.res.ticks === 0) { benchEnd(); return; }
    var last = null;
    if (raf) cancelAnimationFrame(raf);
    function tick(now) {
      if (B !== b || b.mode !== 'play') { raf = 0; return; }
      var dt = last === null ? 16 : Math.min(100, now - last); last = now;
      b.tf = Math.min(b.target, b.tf + dt / stepMs());
      frame(b.tf);
      while (b.shown < Math.floor(b.tf + 1e-6)) { b.shown++; if (b.cfg.onTick) b.cfg.onTick(b.shown, b.res.events[b.shown] || []); }
      if (b.tf >= b.target - 1e-9) {
        raf = 0;
        if (b.tf >= b.res.ticks - 1e-9) { benchEnd(); return; }
        b.mode = 'pause'; if (b.cfg.onPause) b.cfg.onPause(); return;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }
  function benchPause() { var b = B; if (!b || b.mode !== 'play') return; b.mode = 'pause'; if (raf) { cancelAnimationFrame(raf); raf = 0; } if (b.cfg.onPause) b.cfg.onPause(); }
  function benchEnd() {
    var b = B; b.mode = 'end'; b.tf = b.res.ticks; frame(b.tf);
    b.res.goals.forEach(function (g) { markGoal(g); });
    if (!b.res.ok) stopMark(b.res);
    b.cfg.onEnd(b.res);
  }
  function markGoal(g) {
    var W = B.W, node = null;
    if (g.k === 'load') { var ri = W.rigs.map(function (r) { return r.load; }).indexOf(W.grid[g.r * COLS + g.c]); node = q('load' + ri); }
    else if (g.k === 'wbucket') { var wp = W.grid[g.r * COLS + g.c].winch; node = wp ? q('wb' + wp.ix) : null; }
    else if (g.k === 'pivot') node = B.svg;
    else node = q('p' + W.grid[g.r * COLS + g.c].ix);
    if (!node) return;
    if (g.k === 'pivot') { [].forEach.call(node.querySelectorAll('.of-goalflag'), function (f) { f.classList.add(g.ok ? 'ok' : 'no'); }); return; }
    var fl = node.querySelector('.of-goalflag'); if (fl) fl.classList.add(g.ok ? 'ok' : 'no');
  }
  // where did it stop? the last ball or weight that moved, else the last thing that happened
  function stopPlace(res) {
    var sn = res.snaps, W = res.W, i, k, at = null;
    for (k = sn.length - 1; k > 0 && !at; k--) for (i = 0; i < W.actors.length; i++) { var a = sn[k][i], b0 = sn[k - 1][i]; if (a[0] !== b0[0] || a[1] !== b0[1]) { at = [a[0], a[1]]; break; } }
    if (!at) { for (k = res.events.length - 1; k >= 0 && !at; k--) { var e = res.events[k].filter(function (x) { return x.c !== undefined; }); if (e.length) at = [e[e.length - 1].c, e[e.length - 1].r]; } }
    return at;
  }
  function stopMark(res) {
    var at = stopPlace(res), m = q('marks'); if (!at || !m) return;
    var x = at[0] * CELL + 50, y = at[1] * CELL + 50;
    m.innerHTML = '<circle class="of-stopmark" cx="' + x + '" cy="' + y + '" r="48" fill="none" stroke="#DC2626" stroke-width="6" stroke-dasharray="12 8"/>';
  }

  /* ---------- the story line and the sounds ---------- */
  var EV_PRIO = ['jam', 'motorWeak', 'ropeShort', 'winchCrash', 'winchWrong', 'crankEmpty', 'rigLight', 'rigStuck', 'rigLow', 'rigUp', 'winch', 'dial', 'flower', 'door', 'friend', 'ring', 'cup', 'basketDown', 'basket',
    'catapult', 'lever', 'motor', 'crank', 'button', 'can', 'splash', 'waterFloor', 'waterWall', 'domino', 'spring', 'pushBall', 'push', 'ramp', 'stop', 'land', 'fly', 'roll', 'fall'];
  var EV_SOUND = { jam: 'wrong', motorWeak: 'wrong', ropeShort: 'wrong', winchCrash: 'bump', winchWrong: 'wrong', crankEmpty: 'wrong', rigLight: 'bump', rigLow: 'bump', rigUp: 'level', winch: 'level', dial: 'level',
    flower: 'correct', door: 'level', friend: 'level', ring: 'star', cup: 'correct', basket: 'click', basketDown: 'turn', catapult: 'zap', lever: 'turn', motor: 'battery', crank: 'turn', button: 'click', can: 'rain',
    domino: 'step', spring: 'zap', pushBall: 'click', push: 'click', stop: 'bump', ramp: 'step' };
  function rigOf(W, e) { var p = W.grid[e.r * COLS + e.c]; return p && (p.rig || (p.k === 'motor' ? p.rig : null)); }
  function evText(e, W, nums) {
    var E = S.ev, ld, rig;
    if (nums === undefined) nums = !!(B && B.cfg.numbers);
    switch (e.e) {
      case 'pushBall': return E.pushBall[e.by] || E.pushBall.ball;
      case 'roll': return t(E.roll, { dir: S.dirs[e.d > 0 ? 1 : '-1'] });
      case 'fall': return e.k === 'weight' ? E.fallW : E.fall;
      case 'land': return t(e.k === 'weight' ? E.landW : E.land, { def: pdef(e.on) });
      case 'stop': return t(E.stop, { def: pdef(e.what) });
      case 'splash': return t(E.splash, { def: pdef(e.k) });
      case 'basket': return e.k === 'weight' ? E.basketW : E.basket;
      case 'basketDown': rig = rigOf(W, e); return t(E.basketDown, { load: loadWords(rig && rig.load)[1] });
      case 'rigLight': rig = rigOf(W, e); return nums ? t(E.rigLightU, { m: num(e.m), n: e.n, load: num(e.load) }) : t(E.rigLight, { load: loadWords(rig && rig.load)[1] });
      case 'rigUp': case 'rigLow': ld = W.grid[e.r * COLS + e.c]; return t(E[e.e], { Load: loadWords(ld)[0], x: num(e.rise) });
      case 'motor': return t(E.motor, { n: partsWord(e.n), pull: num(e.pull) });
      case 'motorWeak': return t(E.motorWeak, { n: partsWord(e.n), k: e.n, m: num(e.m), pull: num(e.pull), F: num(e.F) });
      case 'ropeShort': ld = W.grid[e.r * COLS + e.c]; rig = ld.rig; return t(E.ropeShort, { n: partsWord(e.n), k: e.n, need: num(ld.need), rope: num(e.n * ld.need), R: num(rig.pull.R) });
      case 'crank': return t(e.by === 'button' ? E.crankButton : E.crank, { T: num(e.T), gange: gange(e.T) });
      case 'dial': return t(E.dial, { x: num(e.turns), gange: gange(e.turns), dir: e.dir > 0 ? S.cw : S.ccw });
      case 'winch': return t(E.winch, { x: num(e.rise), gange: gange(e.rise) });
      case 'winchCrash': ld = W.grid[e.r * COLS + e.c]; return t(E.winchCrash, { x: num(e.rise), max: num(ld.max) });
      case 'lever': return t(nums ? E.leverU : E.lever, { side: S.dirs[e.s > 0 ? 1 : '-1'], l: num(e.l), r: num(e.rr) });
      default: return E[e.e] || '';
    }
  }
  function storyOf(evs, W, nums) {
    var main = evs.filter(function (e) { return !e.minor; }), list = main.length ? main : evs.slice(0, 1);
    list = list.slice().sort(function (a, b) { return EV_PRIO.indexOf(a.e) - EV_PRIO.indexOf(b.e); });
    var seen = {}, out = [];
    list.forEach(function (e) { var s = evText(e, W, nums); if (s && !seen[s] && out.length < (e.e === 'dial' ? 3 : 2)) { seen[s] = 1; out.push(s); } });
    return out.join(' ');
  }
  function soundOf(evs) {
    var best = null;
    evs.forEach(function (e) { if (EV_SOUND[e.e] && (best === null || EV_PRIO.indexOf(e.e) < EV_PRIO.indexOf(best))) best = e.e; });
    return best ? EV_SOUND[best] : null;
  }
  function litCells(evs) {
    if (!B || !B.svg) return;
    [].forEach.call(B.svg.querySelectorAll('.lit'), function (n) { n.classList.remove('lit'); });
    evs.forEach(function (e) { if (e.minor || e.c === undefined || !P.inside(e.c, e.r)) return; var p = B.W.grid[e.r * COLS + e.c]; var n = p ? q('p' + p.ix) : null; if (n) n.classList.add('lit'); });
  }
  // Bob's words after a run that did not work: where it stopped and what is missing
  function failText(res, nums) {
    if (nums === undefined) nums = !!(B && B.cfg.numbers);
    var W = res.W, all = [];
    res.events.forEach(function (l) { l.forEach(function (e) { all.push(e); }); });
    if (res.loop) return S.loop;
    var big = all.filter(function (e) { return !e.minor && e.e !== 'push'; });
    var msg = big.length ? S.stopped + ' ' + evText(big[big.length - 1], W, nums) : S.nothing;
    var miss = res.goals.filter(function (g) { return !g.ok; }).map(function (g) {
      var p = W.grid[g.r * COLS + g.c];
      if (g.k === 'dial') return t(S.notGoal.dial, { need: num(p.need), gange: gange(p.need), dir: (p.want || 1) > 0 ? S.cw : S.ccw });
      if (g.k === 'wbucket') return t(S.notGoal.wbucket, { need: num(p.need) });
      if (g.k === 'load') return t(S.notGoal.load, { Load: loadWords(p)[0], need: num(p.need) });
      if (g.k === 'pivot') return p.want ? t(S.notGoal.want, { side: S.dirs[p.want > 0 ? 1 : '-1'] }) : S.notGoal.balance + (nums && big.length && big[big.length - 1].e === 'lever' ? '' : ' ' + t(S.balanceNow, { l: num(p.lever.endL), r: num(p.lever.endR) }));
      return S.notGoal[g.k] || '';
    });
    return msg + (miss.length ? ' ' + miss[0] : '');
  }

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if ((st || B) && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearAll(); clearInterval(clock); Core.stopSpeaking(); st = null; B = null; el = {}; Core.save(); }
  function closeOverlays() { [].forEach.call(document.querySelectorAll('.of-overlay'), function (o) { o.remove(); }); }
  function reset() { clearAll(); closeOverlays(); Core.stopSpeaking(); st = null; B = null; el = {}; }

  /* ================= MAP ================= */
  function worldIcon(id, size) {
    var o = '';
    if (id === 'vaerksted') o = '<polygon points="6,14 42,40 6,40" fill="#F2B33D" stroke="#8A5A12" stroke-width="2.5"/><circle cx="14" cy="9" r="7" fill="#E2483D" stroke="#7A1D16" stroke-width="2"/><path d="M30,26 l4,16 h10 l4,-16z" fill="#6BB8E0" stroke="#1E4E79" stroke-width="2"/>';
    else if (id === 'haven') o = '<path d="M10,44 l3,-12 h14 l3,12z" fill="#C2410C"/><path d="M20,32 v-14" stroke="#16A34A" stroke-width="3"/><circle cx="20" cy="13" r="7" fill="#F472B6"/><circle cx="20" cy="13" r="3" fill="#FACC15"/><path d="M30,22 l10,-2 l6,-8" stroke="#22C55E" stroke-width="4" fill="none"/><rect x="28" y="22" width="14" height="14" rx="3" fill="#22C55E" stroke="#14532D" stroke-width="2"/>';
    else if (id === 'gaarden') o = '<circle cx="24" cy="10" r="8" fill="#CBD5E1" stroke="#334155" stroke-width="2.5"/><path d="M16,10 v22 M32,10 v14" stroke="#5B3A1E" stroke-width="2.5"/><path d="M8,32 l3,12 h10 l3,-12z" fill="#94A3B8" stroke="#334155" stroke-width="2"/><path d="M26,24 l2,10 h8 l2,-10z" fill="#D6A35C" stroke="#7C4A12" stroke-width="2"/>';
    else if (id === 'urmager') o = '<circle cx="24" cy="24" r="19" fill="#FFFFFF" stroke="#1F2937" stroke-width="3"/><path d="M24,24 V10 M24,24 L33,29" stroke="#DC2626" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="24" r="3" fill="#1F2937"/>';
    else if (id === 'havnekran') o = '<path d="M10,44 V8 H44" fill="none" stroke="#D97706" stroke-width="5"/><path d="M10,14 L22,8" stroke="#D97706" stroke-width="3"/><path d="M38,8 v18" stroke="#5B3A1E" stroke-width="2"/><rect x="31" y="26" width="14" height="12" fill="#2563EB" stroke="#1E3A8A" stroke-width="2"/>';
    else o = '<path d="M24,4 l6,13 14,1 -11,9 4,14 -13,-8 -13,8 4,-14 -11,-9 14,-1z" fill="#FACC15" stroke="#854D0E" stroke-width="2.5" stroke-linejoin="round"/><circle cx="24" cy="24" r="6" fill="#38BDF8" stroke="#1E3A8A" stroke-width="2"/>';
    return '<svg viewBox="0 0 48 48" width="' + size + '" height="' + size + '" aria-hidden="true">' + o + '</svg>';
  }
  function howSvg() {
    var o = '<rect width="220" height="120" rx="12" fill="#F6E7C8"/><rect y="104" width="220" height="16" fill="#A86A33"/>';
    o += '<rect x="10" y="40" width="60" height="14" rx="4" fill="#C68B59" stroke="#6B4226" stroke-width="2"/><circle cx="40" cy="28" r="11" fill="#E2483D" stroke="#7A1D16" stroke-width="2"/>';
    o += '<polygon points="78,56 118,92 78,92" fill="#F2B33D" stroke="#8A5A12" stroke-width="2.5"/><path d="M50,28 Q72,30 80,52" fill="none" stroke="#2B1D10" stroke-width="2.5" stroke-dasharray="3 5"/>';
    o += '<path d="M120,94 Q140,92 146,80" fill="none" stroke="#2B1D10" stroke-width="2.5" stroke-dasharray="3 5"/><rect x="150" y="50" width="16" height="54" rx="3" fill="#FFFDF5" stroke="#2B2B3A" stroke-width="2.5"/>';
    o += '<path d="M184,98 Q184,62 196,60 Q208,62 208,98z" fill="#FACC15" stroke="#854D0E" stroke-width="2.5"/>';
    return '<svg viewBox="0 0 220 120" width="220" height="120" aria-hidden="true">' + o + '</svg>';
  }
  function showMap() {
    reset();
    var d = data(), list = WORLDS.filter(function (w) { return w.b === d.band; }), nextIdx = -1;
    for (var i = 0; i < list.length; i++) if (levelsDone(d, list[i].id) < NLEV) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (d.band === code ? ' sel' : ''), 'aria-pressed': d.band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    var col = collection(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen of-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back), h('button', { type: 'button', class: 'btn secondary of-bookbtn', onclick: function () { Core.play('click'); showBook(); } }, S.book + ' (' + col.n + ')')]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('section', { class: 'card of-how' }, [h('div', { class: 'of-how-pic', html: howSvg() }), h('div', {}, [h('h2', {}, S.howTitle), h('p', {}, S.howTo), h('p', {}, S.howRun), d.band === 'U' ? h('p', { class: 'muted' }, S.howU) : null])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseWorld),
      h('div', { class: 'rs-worlds of-worlds' }, list.map(function (w, i) {
        var done = levelsDone(d, w.id), stars = worldStars(d, w.id);
        return h('button', { type: 'button', class: 'rs-world of-world w-' + w.id + (done ? ' lit' : '') + (i === nextIdx ? ' next' : ''), 'data-world': w.id, onclick: function () { Core.play('click'); chooseLevel(w); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, nameOf(w.id)), h('span', { class: 'rs-world-desc' }, S.worlds[w.id][1]),
          h('span', { class: 'of-level' }, done >= NLEV ? S.allDone : t(S.level, { n: levelOf(d, w.id), max: NLEV })),
          h('span', { class: 'rs-world-foot' }, [h('span', { html: Core.starIcons(stars, 3) }), h('span', { class: 'of-wicon', html: worldIcon(w.id, 44) })])
        ]);
      })),
      h('div', { class: 'row center of-extra' }, [h('button', { type: 'button', class: 'btn of-sbbtn', onclick: function () { Core.play('click'); showSandbox(); } }, S.sandbox)])
    ]));
  }
  function chooseLevel(w) {
    var d = data(), cur = levelOf(d, w.id), best = bestOf(d, w.id);
    if (cur === 1 && !best[0]) { startLevel(w.id, 1); return; }
    var o = h('div', { class: 'rs-overlay of-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': S.pickLevel }, h('div', { class: 'card rs-dialog of-pick' }, [
      h('h2', {}, nameOf(w.id) + ': ' + S.pickLevel), h('p', { class: 'muted' }, S.pickLevelText),
      h('div', { class: 'of-pick-grid' }, w.levels.map(function (lv, i) {
        var n = i + 1, open = n <= cur;
        return h('button', { type: 'button', class: 'of-pick-btn' + (n === cur ? ' cur' : ''), disabled: !open, 'data-level': n, onclick: function () { o.remove(); startLevel(w.id, n); } },
          [h('strong', {}, t(S.levelBtn, { n: n })), open ? h('span', { html: Core.starIcons(best[i] || 0, 3, 'small') }) : h('span', { class: 'muted' }, S.locked)]);
      })),
      h('div', { class: 'row center' }, h('button', { type: 'button', class: 'btn ghost', onclick: function () { o.remove(); } }, S.close))
    ]));
    app.appendChild(o);
    var c = o.querySelector('.of-pick-btn.cur') || o.querySelector('.of-pick-btn'); if (c) c.focus();
  }

  /* ================= PLAY ================= */
  function sameKind(a, b) { return a.k === b.k && a.z === b.z && a.m === b.m && a.n === b.n && a.T === b.T; }
  function cleanBuild(lv, list) { // a saved build, checked part by part
    var out = [], used = {};
    (Array.isArray(list) ? list : []).forEach(function (q) {
      if (!q || typeof q !== 'object' || !lv.box[q.i] || used[q.i]) return;
      var x = { i: q.i, c: q.c, r: q.r, d: q.d === -1 ? -1 : 1 };
      if (P.canPlace(lv, out, lv.box[q.i], x.c, x.r) !== '') return;
      used[q.i] = 1; out.push(x);
    });
    return out;
  }
  function startLevel(wid, n) {
    reset();
    var w = worldById(wid), lv = w.levels[n - 1], d = data(), key = lkey(wid, n), hp = d.help[key] || {};
    lv.id = lv.id || key;
    st = { w: wid, level: n, lv: lv, key: key, numbers: w.b === 'U', placed: cleanBuild(lv, d.build[key]), sel: null, tipCell: null, fails: Number(hp.fails) || 0, helped: !!hp.tip, shown: !!hp.shown, solving: false, done: false };
    showLevel();
  }
  function saveBuild() {
    if (!st) return;
    var d = data();
    d.build[st.key] = st.placed.map(function (q) { return { i: q.i, c: q.c, r: q.r, d: q.d }; });
    d.help[st.key] = { fails: st.fails, tip: st.helped ? 1 : 0, shown: st.shown ? 1 : 0 };
    Core.save();
  }
  function placedAt(c, r) { for (var i = 0; i < st.placed.length; i++) if (st.placed[i].c === c && st.placed[i].r === r) return i; return -1; }
  function machineNow() { return P.machine(st.lv, st.placed); }
  function selKey() { if (!st || !st.sel || st.sel.grid === undefined) return null; var q0 = st.placed[st.sel.grid]; return q0 ? q0.c + ',' + q0.r : null; }
  function mineKeys() { var m = {}; (st ? st.placed : []).forEach(function (q0) { m[q0.c + ',' + q0.r] = 1; }); return m; }
  function cellText(parts, c, r) {
    var here = parts.filter(function (p) { return p.c === c && p.r === r; })[0], lab = t(S.cell, { c: c + 1, r: r + 1 }) + ': ';
    if (!here) return lab + S.cellEmpty;
    var name = here.box !== undefined && st ? boxLabel(st.lv.box[here.box]) : here.k === 'weight' ? t(S.boxWeight, { m: num(here.m) }) : pname(here.k);
    return lab + name + (here.d && P.KINDS[here.k].turn ? ' (' + S.dirs[here.d > 0 ? 1 : '-1'] + ')' : '');
  }
  function shell(title, sub) {
    app.innerHTML = ''; el = {};
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, title), h('span', { class: 'rs-wave' }, sub || '')]),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        onclick: function () { Core.speak([el.goal && el.goal.textContent, el.say && el.say.textContent].filter(Boolean).join(' ')); } }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.bob = h('div', { class: 'of-bobface' }); el.say = h('p', { class: 'of-say', role: 'status', 'aria-live': 'polite' });
    el.goal = h('p', { class: 'of-goal' });
    el.story = h('p', { class: 'of-story', 'aria-live': 'polite' });
    el.side = h('div', { class: 'of-side' }); el.explain = h('div', { class: 'of-explain', 'aria-live': 'polite' });
    el.left = h('div', { class: 'of-left' });
    app.appendChild(h('main', { class: 'of-play' }, [hud, h('div', { class: 'of-inner' }, [h('div', { class: 'of-bobline' }, [el.bob, el.say]), el.goal, h('div', { class: 'of-work' }, [el.left, el.side]), el.explain])]));
  }
  function setBob(expr, text) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 120, crop: 'head' });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text !== undefined && text !== null) el.say.textContent = text;
  }
  function showLevel() {
    var lv = st.lv;
    shell(nameOf(st.w), t(S.level, { n: st.level, max: NLEV }));
    el.goal.innerHTML = ''; el.goal.appendChild(h('strong', {}, S.goalLabel + ' ')); el.goal.appendChild(document.createTextNode(lv.goal));
    setBob('hello', pick(S.bobStart));
    B = makeBench({
      machine: machineNow, numbers: st.numbers, mine: mineKeys, sel: selKey, tip: function () { return st && st.tipCell; },
      cellLabel: function (c, r) { return cellText(machineNow(), c, r); },
      onCell: tapCell, onTick: playTick, onEnd: runEnded, onPause: updateRun, onStart: function () { el.story.textContent = S.narrationStart; }
    });
    el.left.appendChild(B.host); el.left.appendChild(el.story);
    el.box = h('section', { class: 'of-box', 'aria-label': S.toolbox });
    el.run = h('div', { class: 'of-run' });
    el.help = h('div', { class: 'of-help' });
    el.side.appendChild(el.box); el.side.appendChild(el.run); el.side.appendChild(el.help);
    el.btnGo = h('button', { type: 'button', class: 'btn primary of-go', onclick: goPressed }, S.start);
    el.btnStep = h('button', { type: 'button', class: 'btn of-stepbtn', onclick: function () { if (B.mode === 'build' || B.mode === 'pause') { Core.play('click'); benchRun(true); updateRun(); } } }, S.step);
    el.btnReset = h('button', { type: 'button', class: 'btn of-resetbtn', onclick: function () { Core.play('click'); resetRun(); } }, S.reset);
    el.run.appendChild(el.btnGo); el.run.appendChild(h('div', { class: 'of-run2' }, [el.btnStep, el.btnReset]));
    el.btnTip = h('button', { type: 'button', class: 'btn of-tipbtn', onclick: useTip }, S.tip);
    el.btnSol = h('button', { type: 'button', class: 'btn of-solbtn', onclick: showSolution }, S.showSolution);
    el.note = h('p', { class: 'of-note' });
    el.help.appendChild(h('div', { class: 'of-helprow' }, [el.btnTip, el.btnSol])); el.help.appendChild(el.note);
    redraw();
  }
  function redraw() { benchDraw(); drawBox(); updateRun(); }
  function drawBox() {
    if (!el.box || !st) return;
    var lv = st.lv, building = B && B.mode === 'build' && !st.solving && !st.done;
    el.box.innerHTML = '';
    el.box.appendChild(h('h2', {}, S.toolbox));
    var items = h('div', { class: 'of-items' });
    lv.box.forEach(function (b, i) {
      var j = -1; st.placed.forEach(function (q0, k) { if (q0.i === i) j = k; });
      var sel = st.sel && (st.sel.box === i || (st.sel.grid !== undefined && st.placed[st.sel.grid] && st.placed[st.sel.grid].i === i));
      items.appendChild(h('button', { type: 'button', class: 'of-item' + (j >= 0 ? ' used' : '') + (sel ? ' sel' : ''), 'data-i': i, disabled: !building, 'aria-pressed': sel ? 'true' : 'false',
        onclick: function () { tapItem(i); } }, [h('span', { class: 'of-ico', html: partIcon(b) }), h('span', { class: 'of-itemlab' }, boxLabel(b)), j >= 0 ? h('span', { class: 'of-tag' }, S.placedTag) : null]));
    });
    el.box.appendChild(items);
    if (st.sel && st.sel.grid !== undefined && st.placed[st.sel.grid] && building) {
      var q0 = st.placed[st.sel.grid], b2 = lv.box[q0.i];
      el.box.appendChild(h('div', { class: 'of-actions' }, [
        P.KINDS[b2.k].turn ? h('button', { type: 'button', class: 'btn of-turn', onclick: function () { turnPlaced(st.sel.grid); } }, '↔ ' + S.turn) : null,
        h('button', { type: 'button', class: 'btn ghost of-back', onclick: function () { putBack(st.sel.grid); } }, S.putBack)
      ]));
    }
  }
  function partIcon(b) {
    var p = P.copy(b); p.c = 0; p.r = 0; p.ix = -1; p.d = b.d || 1;
    var inner;
    if (b.k === 'ball') inner = '<g transform="translate(50,56)">' + ballSvg() + '</g>';
    else if (b.k === 'weight') inner = '<g transform="translate(50,58) scale(1.2)">' + weightSvg(b.m) + '</g>';
    else if (b.k === 'block') inner = blockSvg(b.n, {});
    else inner = partSvg(p, null, { numbers: true });
    return '<svg viewBox="0 0 100 100" width="44" height="44" aria-hidden="true">' + inner + '</svg>';
  }
  function tapItem(i) {
    if (!st || st.solving || st.done || B.mode !== 'build') return;
    Core.play('click');
    var j = -1; st.placed.forEach(function (q0, k) { if (q0.i === i) j = k; });
    if (j >= 0) st.sel = { grid: j };
    else st.sel = st.sel && st.sel.box === i ? null : { box: i };
    st.tipCell = null;
    setBob('thinking', st.sel ? (st.sel.box !== undefined ? t(S.chosen, { part: boxLabel(st.lv.box[i]).toLowerCase() }) : t(S.chosenPlaced, { part: boxLabel(st.lv.box[i]).toLowerCase() })) : '');
    redraw();
  }
  function tapCell(c, r) {
    if (!st || st.solving || st.done) return;
    if (B.mode === 'end') resetRun(); else if (B.mode !== 'build') return;
    var lv = st.lv, j = placedAt(c, r);
    st.tipCell = null;
    if (j >= 0 && !(st.sel && st.sel.box !== undefined && P.canPlace(lv, st.placed, lv.box[st.sel.box], c, r) === '')) {
      if (st.sel && st.sel.grid === j && P.KINDS[lv.box[st.placed[j].i].k].turn) { turnPlaced(j); return; }
      st.sel = { grid: j }; Core.play('click');
      setBob('thinking', t(S.chosenPlaced, { part: boxLabel(lv.box[st.placed[j].i]).toLowerCase() }));
      redraw(); focusCell(c, r); return;
    }
    if (!st.sel) {
      var fixed = P.parseMap(lv).filter(function (p) { return p.c === c && p.r === r; })[0];
      setBob('thinking', fixed && !fixed.axle && fixed.k !== 'slot' ? S.fixedPart : S.pickFirst); Core.play('bump'); return;
    }
    var bi = st.sel.box !== undefined ? st.sel.box : st.placed[st.sel.grid].i, why = P.canPlace(lv, st.placed, lv.box[bi], c, r, st.sel.grid);
    if (why) { setBob('thinking', S.cant[why] || S.cant.taken); Core.play('bump'); return; }
    if (st.sel.box !== undefined) st.placed.push({ i: bi, c: c, r: r, d: lv.box[bi].d === -1 ? -1 : 1 });
    else { st.placed[st.sel.grid].c = c; st.placed[st.sel.grid].r = r; }
    st.sel = null; Core.play('click');
    setBob('happy', pick(S.bobBuilt));
    saveBuild(); redraw(); focusCell(c, r);
  }
  function focusCell(c, r) { var b0 = B && B.cells.querySelector('[data-c="' + c + '"][data-r="' + r + '"]'); if (b0 && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('of-cell')) b0.focus(); }
  function turnPlaced(j) { var q0 = st.placed[j]; if (!q0) return; q0.d = -(q0.d || 1); Core.play('turn'); saveBuild(); redraw(); focusCell(q0.c, q0.r); }
  function putBack(j) { st.placed.splice(j, 1); st.sel = null; Core.play('click'); saveBuild(); redraw(); }
  function goPressed() {
    if (!B) return;
    Core.play('click');
    if (B.mode === 'play') { benchPause(); el.story.textContent = S.paused; }
    else if (B.mode === 'build' || B.mode === 'pause') { st.sel = null; benchRun(false); }
    updateRun();
  }
  function resetRun() { if (!B) return; benchDraw(); el.story.textContent = ''; el.explain.innerHTML = ''; drawBox(); updateRun(); }
  function updateRun() {
    if (!B || !el.btnGo || !st) return;
    var m = B.mode, ok = m === 'end' && B.res && B.res.ok;
    el.btnGo.textContent = m === 'play' ? S.pause : m === 'pause' ? S.resume : S.start;
    el.btnGo.disabled = m === 'end' || st.solving || st.done;
    el.btnStep.disabled = !(m === 'build' || m === 'pause') || st.solving || st.done;
    el.btnReset.disabled = m === 'build' || st.solving || st.done || ok;
    el.btnReset.textContent = m === 'end' ? S.reset : S.editAgain;
    el.btnTip.disabled = m !== 'build' || st.solving || st.done;
    el.btnSol.disabled = m !== 'build' || st.solving || st.done || st.fails < SOLVE_AFTER || st.shown;
    el.btnSol.classList.toggle('secondary', st.fails >= SOLVE_AFTER && !st.shown);
    el.note.innerHTML = '';
    if (st.fails) el.note.appendChild(h('b', {}, t(S.fails, { n: st.fails }) + ' · '));
    el.note.appendChild(document.createTextNode(S.helpNote));
    [].forEach.call(el.box.querySelectorAll('.of-item'), function (b0) { b0.disabled = m !== 'build' || st.solving || st.done; });
  }
  function playTick(k, evs) {
    var s = storyOf(evs, B.W);
    if (s) el.story.textContent = s;
    var snd = soundOf(evs); if (snd) Core.play(snd);
    litCells(evs);
  }
  function runEnded(res) {
    updateRun();
    if (res.ok) { solved(); return; }
    st.fails++; saveBuild();
    Core.play('wrong');
    setBob(st.fails >= SOLVE_AFTER ? 'encouraging' : 'thinking', failText(res));
    updateRun();
  }

  /* ---------- help ---------- */
  function useTip() {
    if (!st || B.mode !== 'build' || st.solving || st.done) return;
    var lv = st.lv, box = lv.box;
    for (var s = 0; s < lv.sol.length; s++) {
      var so = lv.sol[s], want = box[so.i], turnable = P.KINDS[want.k].turn, sd = so.d === -1 ? -1 : 1;
      var good = st.placed.filter(function (q0) { return q0.c === so.c && q0.r === so.r && sameKind(box[q0.i], want) && (!turnable || q0.d === sd); })[0];
      if (good) continue;
      st.helped = true; st.sel = null; st.tipCell = so.c + ',' + so.r;
      var j = placedAt(so.c, so.r);
      if (j >= 0 && sameKind(box[st.placed[j].i], want)) { st.placed[j].d = sd; setBob('happy', t(S.tipTurned, { part: pdef(want.k) })); }
      else {
        if (j >= 0) st.placed.splice(j, 1);
        var used = {}; st.placed.forEach(function (q0) { used[q0.i] = 1; });
        var free = -1; box.forEach(function (b0, i) { if (free < 0 && !used[i] && sameKind(b0, want)) free = i; });
        if (free >= 0) st.placed.push({ i: free, c: so.c, r: so.r, d: sd });
        else { // move a part of the same kind that is in a wrong place
          var solSpots = {}; lv.sol.forEach(function (x) { solSpots[x.c + ',' + x.r] = 1; });
          var mv = -1; st.placed.forEach(function (q0, k) { if (mv < 0 && sameKind(box[q0.i], want) && !solSpots[q0.c + ',' + q0.r]) mv = k; });
          if (mv < 0) st.placed.forEach(function (q0, k) { if (mv < 0 && sameKind(box[q0.i], want)) mv = k; });
          st.placed[mv].c = so.c; st.placed[mv].r = so.r; st.placed[mv].d = sd;
        }
        setBob('happy', t(S.tipPlaced, { part: pdef(want.k) }));
      }
      Core.play('star'); saveBuild(); redraw(); return;
    }
    setBob('happy', S.tipNone);
  }
  function solStepText(so) {
    var lv = st.lv, b = lv.box[so.i], k = b.k, d = so.d === -1 ? -1 : 1, SS = S.solStep;
    if (k === 'ramp' || k === 'spring') return t(SS[k], { dir: S.dirs[d > 0 ? 1 : '-1'] });
    if (k === 'weight') {
      var W = F.build(P.parseMap(lv)), L = null;
      W.levers.forEach(function (x) { if (so.c >= x.pc - x.left && so.c <= x.pc + x.right && so.c !== x.pc && x.pr > so.r) L = x; });
      return L ? t(SS.weight, { m: num(b.m), a: Math.abs(so.c - L.pc), mom: num(b.m * Math.abs(so.c - L.pc)) }) : t(SS.weightAir, { m: num(b.m) });
    }
    if (k === 'gear') { var ax = P.parseMap(lv).filter(function (p) { return p.c === so.c && p.r === so.r && p.axle; })[0]; return t(ax ? SS.gearAxle : SS.gear, { z: b.z }); }
    if (k === 'block') return t(SS.block, { n: b.n });
    return SS[k] || SS.other;
  }
  function showSolution() {
    if (!st || st.fails < SOLVE_AFTER || st.shown || B.mode !== 'build' || st.solving) return;
    var lv = st.lv;
    st.shown = true; st.solving = true; st.placed = []; st.sel = null; st.tipCell = null; saveBuild(); redraw();
    setBob('thinking', S.solutionGo);
    var ol = h('ol', { class: 'of-sollist' });
    el.explain.innerHTML = '';
    el.explain.appendChild(h('div', { class: 'oj-rule of-why' }, [h('p', { class: 'of-stephead' }, S.solutionHead), ol]));
    lv.sol.forEach(function (so, k) {
      later(function () {
        if (!st || !st.solving) return;
        st.placed.push({ i: so.i, c: so.c, r: so.r, d: so.d === -1 ? -1 : 1 }); st.tipCell = so.c + ',' + so.r;
        Core.play('click'); saveBuild(); redraw();
        ol.appendChild(h('li', {}, t(S.solCell, { c: so.c + 1, r: so.r + 1 }) + ' ' + solStepText(so)));
      }, (k + 1) * 1100 / speedK);
    });
    later(function () {
      if (!st) return;
      st.solving = false; st.tipCell = null;
      ol.parentNode.appendChild(h('p', {}, [h('strong', {}, S.whyHead + ' '), lv.why]));
      redraw(); benchRun(false); updateRun();
    }, (lv.sol.length + 1) * 1100 / speedK + 200);
  }

  /* ---------- solved ---------- */
  function solved() {
    st.done = true;
    var bal = B && B.W ? B.W.levers.filter(function (L) { return L.pivot.balance; })[0] : null;
    if (bal) el.story.textContent = t(S.ev.balance, { l: num(bal.endL), r: num(bal.endR) });
    Core.play('win');
    setBob('cheering', pick(S.success));
    st.stars = starsFor(st.helped, st.shown);
    if (!st.shown && st.fails >= SOLVE_AFTER) Core.visit('staedig');
    updateRun(); drawBox();
    var box = h('div', { class: 'oj-rule of-why of-success' }, [h('p', { class: 'of-stephead' }, S.explainTitle), h('p', {}, [h('strong', {}, S.whyHead + ' '), st.lv.why]),
      h('button', { type: 'button', class: 'btn primary of-goon', onclick: finish }, S.goOn)]);
    var old = el.explain.querySelector('.of-why');
    if (old && st.shown) { old.classList.add('of-success'); old.appendChild(box.querySelector('.of-goon')); }
    else { el.explain.innerHTML = ''; el.explain.appendChild(box); }
    later(function () { var g = el.explain.querySelector('.of-goon'); if (g) { g.focus(); try { g.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* old browsers */ } } }, 50);
  }
  function finish() {
    clearAll();
    var d = data(), wid = st.w, lvl = st.level, ws = wState(d, wid), stars = st.stars;
    var before = worldStars(d, wid), prevBest = ws.best[lvl - 1] || 0, newBest = prevBest > 0 && stars > prevBest;
    ws.best[lvl - 1] = Math.max(prevBest, stars); ws.plays++;
    d.lv[wid] = Math.max(levelOf(d, wid), Math.min(NLEV, lvl + 1));
    var after = worldStars(d, wid), complete = levelsDone(d, wid) >= NLEV, newCard = complete && !d.cards[wid];
    if (newCard) d.cards[wid] = 1;
    var fails = st.fails, helped = st.helped, shown = st.shown;
    delete d.build[st.key]; delete d.help[st.key];
    Core.save();
    var badgeNode = Core.roundDone(ID, wid, ws.plays > 1 ? before : null, after);
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var primary = lvl < NLEV ? h('button', { type: 'button', class: 'btn primary', onclick: function () { startLevel(wid, lvl + 1); } }, S.nextLevel)
      : newCard ? h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); showCard(wid, true); } }, S.seeCard)
      : h('button', { type: 'button', class: 'btn primary', onclick: function () { startLevel(wid, lvl); } }, S.playAgain);
    var o = h('div', { class: 'rs-overlay of-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog of-result' }, [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : 'happy', outfit: OUTFIT, size: 130 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', { class: 'of-runmsg' }, fails ? t(S.runsN, { n: fails + 1 }) : S.runs1),
      shown ? h('p', { class: 'muted' }, S.withSolution) : helped ? h('p', { class: 'muted' }, S.withTip) : null,
      complete ? h('p', { class: 'of-lvlmsg' }, t(S.worldDone, { world: nameOf(wid) })) : h('p', { class: 'muted' }, t(S.nextLevelMsg, { n: Math.min(NLEV, lvl + 1), max: NLEV })),
      newCard ? h('p', { class: 'rs-newbest of-newcard' }, S.newCard) : null,
      badgeNode,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), primary])
    ]));
    app.appendChild(o);
    var se = starBox.querySelectorAll('.star');
    for (var i = 0; i < stars; i++) (function (i) { later(function () { se[i].classList.remove('off'); se[i].classList.add('on', 'pop'); Core.play('star'); }, 450 + i * 380); })(i);
    primary.focus();
    st = null;
  }
  function askLeave() {
    var o = h('div', { class: 'rs-overlay of-overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'card rs-dialog' }, [
      h('h2', {}, S.leaveQ), h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: function () { if (st) saveBuild(); showMap(); } }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]));
    app.appendChild(o); o.querySelector('.btn.primary').focus();
  }

  /* ================= OPFINDERBOGEN ================= */
  function prettyUrl(u) { var s = u.replace(/^https?:\/\//, ''); try { s = decodeURI(s); } catch (e) { /* keep it */ } return s; }
  function cardNode(wid, isNew) {
    var c = S.cards[wid];
    return h('article', { class: 'of-card w-' + wid }, [
      h('div', { class: 'of-card-head' }, [h('span', { html: worldIcon(wid, 56) }), h('div', {}, [isNew ? h('span', { class: 'of-card-new' }, S.newCard) : null, h('h3', {}, c.title), h('span', { class: 'of-card-year' }, c.year)])]),
      h('p', { class: 'of-fact' }, c.fact),
      h('p', { class: 'of-src' }, [S.source + ' ', h('span', { class: 'of-url' }, prettyUrl(c.url))]),
      h('p', { class: 'muted of-card-world' }, nameOf(wid))
    ]);
  }
  function showCard(wid, isNew) {
    var o = h('div', { class: 'rs-overlay of-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': S.cards[wid].title }, h('div', { class: 'card rs-dialog of-carddlg' }, [
      cardNode(wid, isNew),
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); showBook(); } }, S.book)])
    ]));
    app.appendChild(o); Core.play('level');
    o.querySelector('.btn.primary').focus();
  }
  function showBook() {
    reset();
    var d = data(), col = collection(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen of-book' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + S.toMap), h('h1', {}, S.bookTitle)]),
      h('p', { class: 'lead' }, col.n ? t(S.bookCount, col) : S.bookEmpty), col.n ? h('p', { class: 'muted' }, S.bookIntro) : null,
      h('div', { class: 'of-cards' }, WORLDS.map(function (w) {
        if (d.cards[w.id]) return cardNode(w.id);
        return h('article', { class: 'of-card locked' }, [h('div', { class: 'of-card-head' }, [h('span', { class: 'of-q', 'aria-hidden': 'true' }, '?'), h('div', {}, [h('h3', {}, nameOf(w.id)), h('span', { class: 'muted' }, t(S.levelsDone, { n: levelsDone(d, w.id), max: NLEV }))])]), h('p', {}, t(S.cardLocked, { world: nameOf(w.id) }))]);
      }))
    ]));
  }

  /* ================= FRI OPFINDELSE (sandbox) ================= */
  var SBX = F.sandbox, sbTool = 0;
  function sbList() { var d = data(); if (!Array.isArray(d.sb) || (d.sb.length && !SBX.valid(d.sb))) d.sb = []; return d.sb; }
  function sbLabel(e) { return pname(e.k) + (e.d ? ' ' + (e.d > 0 ? '→' : '←') : ''); }
  function showSandbox(msg) {
    reset();
    Core.visit(ID + ':sandbox');
    var list = sbList();
    app.innerHTML = '';
    st = null; el = {};
    el.say = h('p', { class: 'of-say of-sbsay', role: 'status', 'aria-live': 'polite' });
    el.story = h('p', { class: 'of-story', 'aria-live': 'polite' });
    el.result = h('div', { class: 'of-sb-result', 'aria-live': 'polite' });
    el.count = h('p', { class: 'of-sb-count' });
    var tools = h('div', { class: 'of-sb-tools', role: 'group', 'aria-label': S.sbParts }, P.SANDBOX.map(function (e, i) {
      return h('button', { type: 'button', class: 'of-sb-tool' + (sbTool === i ? ' sel' : ''), 'data-tool': e.ch, 'aria-pressed': sbTool === i ? 'true' : 'false', onclick: function () { sbTool = i; markTools(); } },
        [h('span', { class: 'of-ico', html: partIcon(e) }), sbLabel(e)]);
    }).concat([h('button', { type: 'button', class: 'of-sb-tool' + (sbTool === -1 ? ' sel' : ''), 'data-tool': 'erase', 'aria-pressed': sbTool === -1 ? 'true' : 'false', onclick: function () { sbTool = -1; markTools(); } }, [h('span', { class: 'of-ico of-erase', 'aria-hidden': 'true' }, '×'), S.sbErase])]));
    function markTools() { [].forEach.call(tools.children, function (b0, i) { var on = (i === P.SANDBOX.length ? -1 : i) === sbTool; b0.classList.toggle('sel', on); b0.setAttribute('aria-pressed', on ? 'true' : 'false'); }); Core.play('click'); }
    B = makeBench({
      machine: function () { return SBX.machine(sbList()); }, numbers: false,
      cellLabel: function (c, r) { return cellText(SBX.machine(sbList()), c, r); },
      onCell: sbTap, onTick: function (k, evs) { var s = storyOf(evs, B.W); if (s) el.story.textContent = s; var snd = soundOf(evs); if (snd) Core.play(snd); litCells(evs); },
      onEnd: function (res) { sbRunUI(); if (res.ok) { Core.play('win'); el.say.textContent = S.sbGood; } else { Core.play('wrong'); el.say.textContent = sbHasGoalNow() ? failText(res) : S.sbNoGoal; } },
      onPause: sbRunUI, onStart: function () { el.story.textContent = S.narrationStart; }
    });
    el.btnGo = h('button', { type: 'button', class: 'btn primary of-go', onclick: function () { Core.play('click'); if (B.mode === 'play') benchPause(); else if (B.mode === 'build' || B.mode === 'pause') benchRun(false); sbRunUI(); } }, S.start);
    el.btnStep = h('button', { type: 'button', class: 'btn of-stepbtn', onclick: function () { if (B.mode === 'build' || B.mode === 'pause') { benchRun(true); sbRunUI(); } } }, S.step);
    el.btnReset = h('button', { type: 'button', class: 'btn of-resetbtn', onclick: function () { benchDraw(); el.story.textContent = ''; sbRunUI(); } }, S.reset);
    var codeIn = h('input', { class: 'of-sb-code', type: 'text', 'aria-label': S.sbLoadTitle, maxlength: '90', autocomplete: 'off', spellcheck: 'false' }), loadMsg = h('p', { class: 'muted of-sb-loadmsg', 'aria-live': 'polite' });
    app.appendChild(h('main', { class: 'screen of-sandbox' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + S.toMap), h('h1', {}, S.sbTitle)]),
      h('p', { class: 'lead' }, S.sbIntro),
      tools,
      h('div', { class: 'of-sb-bench' }, [B.host]), el.story, el.count, el.say,
      h('div', { class: 'row center of-sb-run' }, [el.btnGo, el.btnStep, el.btnReset]),
      h('div', { class: 'row center' }, [
        h('button', { type: 'button', class: 'btn ghost of-sb-clear', onclick: function () { data().sb = []; Core.save(); Core.play('click'); el.result.innerHTML = ''; sbRedraw(); } }, S.sbClear),
        h('button', { type: 'button', class: 'btn secondary of-sb-check', onclick: sbCheckNow }, S.sbCheck)
      ]),
      el.result,
      h('section', { class: 'card of-sb-load' }, [h('h2', {}, S.sbLoadTitle), h('div', { class: 'row' }, [codeIn, h('button', { type: 'button', class: 'btn of-sb-loadbtn', onclick: function () {
        var got = SBX.fromCode(codeIn.value);
        if (!got) { loadMsg.textContent = S.sbBadCode; Core.play('wrong'); return; }
        var chk = SBX.check(got);
        if (!chk.ok) { loadMsg.textContent = S.sbBadMachine; Core.play('wrong'); return; }
        data().sb = got; Core.save(); Core.play('correct'); loadMsg.textContent = S.sbLoaded; el.result.innerHTML = ''; sbRedraw();
      } }, S.sbLoad)]), loadMsg])
    ]));
    if (msg) el.say.textContent = msg;
    sbRedraw();
  }
  function sbHasGoalNow() { return sbList().some(function (q0) { return P.SB_GOALS.indexOf(q0.k) >= 0; }); }
  function sbRedraw() { benchDraw(); el.count.textContent = t(S.sbCount, { n: sbList().length, max: P.SB_MAX }); sbRunUI(); }
  function sbRunUI() {
    if (!el.btnGo || !B) return;
    var m = B.mode;
    el.btnGo.textContent = m === 'play' ? S.pause : m === 'pause' ? S.resume : S.start;
    el.btnGo.disabled = m === 'end' || !sbList().length;
    el.btnStep.disabled = !(m === 'build' || m === 'pause') || !sbList().length;
    el.btnReset.disabled = m === 'build';
  }
  function sbTap(c, r) {
    if (!B) return;
    if (B.mode === 'end') { benchDraw(); el.story.textContent = ''; } else if (B.mode !== 'build') return;
    var list = sbList(), at = -1;
    list.forEach(function (q0, i) { if (q0.c === c && q0.r === r) at = i; });
    el.result.innerHTML = '';
    if (sbTool === -1) { if (at >= 0) { list.splice(at, 1); Core.play('click'); } else Core.play('bump'); }
    else {
      var e = P.SANDBOX[sbTool], same = at >= 0 && list[at].k === e.k && (list[at].d || 0) === (e.d || 0);
      if (same) list.splice(at, 1);
      else if (at >= 0) { list[at] = { k: e.k, c: c, r: r }; if (e.d) list[at].d = e.d; }
      else if (list.length >= P.SB_MAX) { el.say.textContent = t(S.sbFull, { max: P.SB_MAX }); Core.play('bump'); return; }
      else { var q1 = { k: e.k, c: c, r: r }; if (e.d) q1.d = e.d; list.push(q1); }
      Core.play('click');
    }
    Core.save(); sbRedraw();
    var b0 = B.cells.querySelector('[data-c="' + c + '"][data-r="' + r + '"]'); if (b0 && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('of-cell')) b0.focus();
  }
  function sbCheckNow() {
    var list = sbList(), chk = SBX.check(list);
    el.result.innerHTML = '';
    if (!chk.ok) {
      Core.play('wrong');
      el.result.appendChild(h('div', { class: 'oj-rule final' }, h('p', {}, chk.why === 'goal' || chk.why === 'invalid' ? S.sbNoGoal : S.sbFail + ' ' + failText(chk.res))));
      return;
    }
    Core.play('correct');
    Core.visit('gaademager');
    var badge = Core.roundDone(ID, 'sandbox', null, 0), code = SBX.toCode(list);
    var inp = h('input', { class: 'of-sb-code', type: 'text', readonly: true, value: code, 'aria-label': S.sbCode }), copied = h('span', { class: 'muted' });
    el.result.appendChild(h('div', { class: 'oj-rule' }, [h('p', {}, h('strong', {}, S.sbGood)), h('p', {}, S.sbCode), h('div', { class: 'row' }, [inp,
      h('button', { type: 'button', class: 'btn', onclick: function () { inp.select(); try { navigator.clipboard.writeText(code).then(function () { copied.textContent = S.sbCopied; }, function () { document.execCommand('copy'); copied.textContent = S.sbCopied; }); } catch (e) { document.execCommand('copy'); copied.textContent = S.sbCopied; } } }, S.sbCopy), copied]), badge]));
  }

  /* ================= THE DAILY CHALLENGE ================= */
  function qSvg(w, hh, inner, label) { return '<div class="of-daily"><svg viewBox="0 0 ' + w + ' ' + hh + '" width="' + w + '" height="' + hh + '" role="img" aria-label="' + esc(label || '') + '">' + inner + '</svg></div>'; }
  function qGear(x, y, z, col, arrow, label) {
    var R = (gearR(z) * 0.42), o = '<g transform="translate(' + x + ',' + y + ') scale(.42)">' + gearShape(z, col) + '</g>';
    if (arrow) o += '<path d="M' + (x - R - 4) + ',' + (y - 6) + ' A' + (R + 6) + ',' + (R + 6) + ' 0 0 1 ' + (x + 6) + ',' + (y - R - 6) + '" fill="none" stroke="#DC2626" stroke-width="3.5"/><path d="M' + (x + 2) + ',' + (y - R - 12) + ' l8,6 l-9,5" fill="#DC2626"/>';
    if (label) o += '<text x="' + x + '" y="' + (y + R + 20) + '" font-size="14" font-weight="800" text-anchor="middle" fill="#1F2937" font-family="system-ui,sans-serif">' + esc(label) + '</text>';
    return o;
  }
  function qLever(m1, a1, m2, a2) {
    var cx = 160, k = 34, o = '<rect width="320" height="130" rx="10" fill="#F6E7C8"/><path d="M146,112 L160,78 L174,112 Z" fill="#9CA3AF" stroke="#374151" stroke-width="2.5"/><rect x="' + (cx - 4 * k - 12) + '" y="70" width="' + (8 * k + 24) + '" height="9" rx="3" fill="#B45309" stroke="#78350F" stroke-width="2"/>';
    for (var i = -4; i <= 4; i++) if (i) o += '<text x="' + (cx + i * k) + '" y="96" font-size="11" text-anchor="middle" fill="#78350F" font-weight="700" font-family="system-ui,sans-serif">' + Math.abs(i) + ' m</text>';
    [[-a1, m1], [a2, m2]].forEach(function (w) { var x = cx + w[0] * k; o += '<path d="M' + (x - 15) + ',69 L' + (x - 11) + ',44 L' + (x + 11) + ',44 L' + (x + 15) + ',69 Z" fill="#4B5563" stroke="#1F2937" stroke-width="2"/><text x="' + x + '" y="62" font-size="12" text-anchor="middle" fill="#fff" font-weight="800" font-family="system-ui,sans-serif">' + num(w[1]) + ' kg</text>'; });
    return o;
  }
  function qPulley(n, m) {
    var o = '<rect width="220" height="150" rx="10" fill="#F6E7C8"/><rect x="50" y="6" width="120" height="8" fill="#6B7280"/><circle cx="110" cy="30" r="16" fill="#CBD5E1" stroke="#334155" stroke-width="3"/>';
    for (var i = 0; i < n; i++) { var x = 92 + 36 * i / Math.max(1, n - 1); o += '<line x1="' + x + '" y1="30" x2="' + x + '" y2="78" stroke="#5B3A1E" stroke-width="3"/>'; }
    o += '<rect x="86" y="74" width="48" height="22" rx="6" fill="#E5E7EB" stroke="#334155" stroke-width="2.5"/><text x="110" y="90" font-size="13" font-weight="800" text-anchor="middle" fill="#1F2937" font-family="system-ui,sans-serif">' + n + '</text>';
    o += '<line x1="110" y1="96" x2="110" y2="104" stroke="#334155" stroke-width="3"/><rect x="80" y="104" width="60" height="38" rx="4" fill="#D97706" stroke="#78350F" stroke-width="2.5"/><text x="110" y="128" font-size="14" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">' + num(m) + ' kg</text>';
    o += '<line x1="170" y1="30" x2="170" y2="110" stroke="#5B3A1E" stroke-width="3"/><path d="M162,104 l8,12 l8,-12" fill="none" stroke="#DC2626" stroke-width="3"/>';
    return o;
  }
  var QKINDS = { vaerksted: ['ramp', 'chain'], haven: ['leverM', 'chain'], gaarden: ['gearDir', 'pulleyM'], urmager: ['gearTurns', 'gearDir'], havnekran: ['moment', 'balance', 'pulleyForce'], mester: ['pulleyRope', 'gearTurns', 'moment'] };
  function quickTask(band, d) {
    d = d || {};
    var list = WORLDS.filter(function (w) { return w.b === band; }), min = Math.min.apply(null, list.map(function (w) { return worldStars(d, w.id); }));
    var w = pick(list.filter(function (x) { return worldStars(d, x.id) === min; })), k = pick(QKINDS[w.id]);
    return makeTask(k);
  }
  function makeTask(k) {
    var x, o, opts;
    if (k === 'ramp') {
      var dr = Math.random() < 0.5 ? 1 : -1, ans = cap(S.qRampOpts[dr > 0 ? 1 : 0]);
      o = '<rect width="200" height="110" rx="10" fill="#F6E7C8"/><g transform="translate(50,8)"><g' + (dr < 0 ? ' transform="translate(100,0) scale(-1,1)"' : '') + '><polygon points="6,8 94,92 6,92" fill="#F2B33D" stroke="#8A5A12" stroke-width="3"/></g></g><circle cx="' + (dr > 0 ? 66 : 134) + '" cy="10" r="10" fill="#E2483D" stroke="#7A1D16" stroke-width="2"/>';
      return { q: S.qRamp, html: qSvg(200, 110, o, S.parts.ramp[0]), options: S.qRampOpts.slice(), answer: ans, hint: S.qRampHint, explain: t(S.qRampExplain, { dir: S.dirs[dr > 0 ? 1 : '-1'] }) };
    }
    if (k === 'chain') {
      o = '<rect width="240" height="90" rx="10" fill="#F6E7C8"/><rect y="74" width="240" height="16" fill="#A86A33"/><circle cx="22" cy="62" r="11" fill="#E2483D" stroke="#7A1D16" stroke-width="2"/><path d="M36,62 h14 m-5,-5 l5,5 l-5,5" stroke="#2B1D10" stroke-width="2.5" fill="none"/>';
      for (var i = 0; i < 4; i++) o += '<rect x="' + (64 + i * 30) + '" y="30" width="13" height="44" rx="3" fill="#FFFDF5" stroke="#2B2B3A" stroke-width="2.5"/>';
      o += '<path d="M196,72 Q196,36 210,34 Q224,36 224,72 Z" fill="#FACC15" stroke="#854D0E" stroke-width="2.5"/>';
      return { q: S.qChain, html: qSvg(240, 90, o, S.parts.domino[0]), options: shuffle(S.qChainOpts), answer: S.qChainOpts[0], hint: S.qChainHint, explain: S.qChainExplain };
    }
    if (k === 'leverM') {
      o = '<rect width="220" height="110" rx="10" fill="#F6E7C8"/><path d="M98,96 L110,64 L122,96 Z" fill="#9CA3AF" stroke="#374151" stroke-width="2.5"/><rect x="30" y="58" width="160" height="9" rx="3" fill="#B45309" stroke="#78350F" stroke-width="2"/><circle cx="44" cy="22" r="11" fill="#E2483D" stroke="#7A1D16" stroke-width="2"/><path d="M44,36 v12 m-5,-5 l5,5 l5,-5" stroke="#2B1D10" stroke-width="2.5" fill="none"/>';
      return { q: S.qLeverM, html: qSvg(220, 110, o, S.parts.pivot[0]), options: S.qLeverMOpts.slice(), answer: S.qLeverMOpts[0], hint: S.qLeverMHint, explain: S.qLeverMExplain };
    }
    if (k === 'pulleyM') return { q: S.qPulleyM, html: qSvg(220, 150, qPulley(1, 10).replace(/>10 kg</, '><'), S.parts.wheel[0]), options: S.qPulleyMOpts.slice(), answer: S.qPulleyMOpts[1], hint: S.qPulleyMHint, explain: S.qPulleyMExplain };
    if (k === 'gearDir') {
      var n = 2 + Math.floor(Math.random() * 4), cols = ['#38BDF8', '#F59E0B', '#34D399', '#F472B6', '#A78BFA'];
      o = '<rect width="' + (n * 56 + 24) + '" height="100" rx="10" fill="#F6E7C8"/>';
      for (var g = 0; g < n; g++) o += qGear(40 + g * 56, 52, 20, cols[g], g === 0);
      var last = n % 2 ? S.cw : S.ccw;
      return { q: S.qGearDir, html: qSvg(n * 56 + 24, 100, o, S.parts.gear[0]), options: [cap(S.cw), cap(S.ccw)], answer: cap(last), hint: S.qGearDirHint, explain: t(S.qGearDirExplain, { n: n, dir: last }) };
    }
    if (k === 'gearTurns') {
      var pr = pick([[20, 10], [30, 10], [40, 10], [40, 20], [30, 15], [45, 15], [24, 8], [36, 12], [60, 20], [40, 8]]);
      x = pr[0] / pr[1];
      opts = [x, x + 1, x * 2, Math.max(1, x - 1), pr[0] - pr[1]].filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 4);
      o = '<rect width="220" height="130" rx="10" fill="#F6E7C8"/>' + qGear(78, 58, Math.min(40, pr[0]), '#A78BFA', true, t(S.teeth, { z: pr[0] })) + qGear(78 + (gearR(Math.min(40, pr[0])) + gearR(Math.min(40, pr[1]))) * 0.42 + 4, 58, Math.min(40, pr[1]), '#F59E0B', false, t(S.teeth, { z: pr[1] }));
      return { q: t(S.qGearTurns, { a: pr[0], b: pr[1] }), html: qSvg(220, 130, o, S.parts.gear[0]), options: shuffle(opts.map(String)), answer: String(x), hint: t(S.qGearTurnsHint, { a: pr[0] }), explain: t(S.qGearTurnsExplain, { a: pr[0], b: pr[1], x: x }) };
    }
    if (k === 'moment') {
      var m1 = 1 + Math.floor(Math.random() * 6), a1 = 1 + Math.floor(Math.random() * 4), m2 = 1 + Math.floor(Math.random() * 6), a2 = 1 + Math.floor(Math.random() * 4);
      var l = m1 * a1, r = m2 * a2, idx = l > r ? 0 : l < r ? 1 : 2;
      return { q: t(S.qMoment, { m1: m1, a1: a1, m2: m2, a2: a2 }), html: qSvg(320, 130, qLever(m1, a1, m2, a2), S.parts.pivot[0]), options: S.qMomentOpts.slice(), answer: S.qMomentOpts[idx], hint: S.qMomentHint,
        explain: t(S.qMomentExplain, { m1: m1, a1: a1, m2: m2, a2: a2, l: l, r: r, res: S.qMomentRes[idx] }) };
    }
    if (k === 'balance') {
      var c0 = pick([[6, 2, 3], [4, 3, 2], [8, 1, 2], [3, 4, 2], [9, 2, 3], [6, 2, 4], [5, 4, 2], [2, 3, 1], [4, 2, 1], [12, 1, 3]]);
      x = c0[0] * c0[1] / c0[2];
      opts = [x, x + 1, Math.max(1, x - 1), c0[0], x * 2].filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).map(function (v) { return v + ' kg'; });
      return { q: t(S.qBalance, { m1: c0[0], a1: c0[1], a2: c0[2] }), html: qSvg(320, 130, qLever(c0[0], c0[1], '?', c0[2]).replace('>? kg<', '>? kg<'), S.parts.pivot[0]), options: shuffle(opts), answer: x + ' kg', hint: S.qBalanceHint, explain: t(S.qBalanceExplain, { m1: c0[0], a1: c0[1], a2: c0[2], l: c0[0] * c0[1], x: x }) };
    }
    if (k === 'pulleyForce') {
      var pf = pick([[60, 2], [60, 3], [80, 2], [80, 4], [120, 3], [120, 4], [150, 3], [200, 4], [240, 3], [100, 4]]);
      x = pf[0] / pf[1];
      opts = [x, pf[0], x * 2, pf[0] - pf[1]].filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).map(function (v) { return v + ' kg'; });
      return { q: t(S.qPulleyForce, { m: pf[0], n: pf[1] }), html: qSvg(220, 150, qPulley(pf[1], pf[0]), S.parts.block[0]), options: shuffle(opts), answer: x + ' kg', hint: S.qPulleyForceHint, explain: t(S.qPulleyForceExplain, { m: pf[0], n: pf[1], x: x }) };
    }
    // pulleyRope
    var pn = 2 + Math.floor(Math.random() * 3), ph = 1 + Math.floor(Math.random() * 3);
    x = pn * ph;
    opts = [x, ph, x + pn, pn].filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 4).map(function (v) { return v + ' m'; });
    return { q: t(S.qPulleyRope, { n: pn, h: ph }), html: qSvg(220, 150, qPulley(pn, 100).replace('>100 kg<', '><'), S.parts.block[0]), options: shuffle(opts), answer: x + ' m', hint: S.qPulleyRopeHint, explain: t(S.qPulleyRopeExplain, { n: pn, h: ph, x: x }) };
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport, progress: progress, quickTask: quickTask, collection: collection,
    // test hooks
    _state: function () { return st; }, _bench: function () { return B; }, _worlds: WORLDS, _speed: function (k) { speedK = k || 1; }, _sceneSvg: sceneSvg, _makeTask: makeTask, QKINDS: QKINDS,
    _starsFor: starsFor, _worldStars: worldStars, _failText: failText, _storyOf: storyOf, _evText: evText, _solStepText: function (lv, so) { var keep = st; st = { lv: lv }; var s = solStepText(so); st = keep; return s; } });
})(window);
