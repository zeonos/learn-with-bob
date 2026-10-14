/*
 * Mysteriet på museet – et »escape room« i seks sale. Bob er låst inde på museet om natten, og kopierne af
 * Guldhornene er væk. Hver sal har ting at trykke på (spor til notesbogen og ting til lommen) og en gådelås.
 * Gåderne laves i puzzles.js, historien står i story.js. Ingen tid og intet, der skynder på.
 * Stjerner pr. sal: 3 uden hjælp, 2 med »Tip«, 1 med »Vis løsningen« (kommer efter 3 forkerte forsøg).
 * Forkerte forsøg koster ikke stjerner.
 */
(function (root) {
  'use strict';
  var Core = root.Core, Bob = root.Bob, S = root.STR.mu, SC = root.STR.core, STORY = root.MU_STORY, PZ = root.MU_PUZ;
  var h = Core.h, t = Core.t;
  var ID = 'museet', OUTFIT = 'museum';
  var ROOMS = STORY.rooms, BANDS = ['M', 'U'];
  var app = null, st = null, el = {}, clock = 0, timers = [], keyHandler = null, uid = 0;

  function roomById(id) { return ROOMS.filter(function (r) { return r.id === id; })[0]; }
  function roomIdx(id) { for (var i = 0; i < ROOMS.length; i++) if (ROOMS[i].id === id) return i; return -1; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function later(fn, ms) { var x = setTimeout(fn, ms); timers.push(x); return x; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function host(url) { return String(url).replace(/^https?:\/\/(www\.)?/, '').split('/')[0]; }
  function forBand(x, band) { return !x.bands || x.bands.indexOf(band) >= 0; }

  /* ---------- saved data and the hub API ---------- */
  // d.rooms[band][room] = { stars, best, plays }, d.nb[band] = { clues, order, struck, items, vars, seen }, d.cards[band][room] = 1
  function data() {
    var d = Core.gameData(ID);
    d.rooms = d.rooms || {}; d.nb = d.nb || {}; d.cards = d.cards || {};
    BANDS.forEach(function (b) { d.rooms[b] = d.rooms[b] || {}; d.cards[b] = d.cards[b] || {}; });
    if (!d.band) d.band = (Core.profile() || {}).band === 'U' ? 'U' : 'M';
    return d;
  }
  function nb(d, band) {
    var n = d.nb[band] || (d.nb[band] = {});
    n.clues = n.clues || {}; n.order = n.order || []; n.struck = n.struck || {}; n.items = n.items || {}; n.vars = n.vars || {}; n.seen = n.seen || {};
    return n;
  }
  function roomState(d, band, id) { var b = (d.rooms || {})[band] || {}; return b[id] || { stars: 0, best: 0, plays: 0 }; }
  function bestOf(d, band, id) { return Math.max(0, Math.min(3, Number(roomState(d, band, id).best) || 0)); }
  function isOpen(d, band, i) { return i === 0 || bestOf(d, band, ROOMS[i - 1].id) > 0; }
  function summary(d) {
    var band = d.band || ((Core.profile() || {}).band === 'U' ? 'U' : 'M'), n = 0;
    ROOMS.forEach(function (r) { n += bestOf(d, band, r.id); });
    return { stars: n, max: ROOMS.length * 3 };
  }
  function progress(d) {
    var out = { plays: 0, bands: { M: [], U: [] } };
    BANDS.forEach(function (b) { ROOMS.forEach(function (r) { out.plays += Number(roomState(d, b, r.id).plays) || 0; out.bands[b].push(bestOf(d, b, r.id)); }); });
    return out;
  }
  function parentReport(d) {
    var rows = [];
    BANDS.forEach(function (b) { ROOMS.forEach(function (r) { var rs = roomState(d, b, r.id); if (rs.plays) rows.push([r.name.replace(/\u00ad/g, '') + ' (' + b + ')', bestOf(d, b, r.id) + '/3', String(rs.plays)]); }); });
    return { head: S.reportHead, rows: rows };
  }
  function collection(d) {
    var n = 0; BANDS.forEach(function (b) { ROOMS.forEach(function (r) { if (((d.cards || {})[b] || {})[r.id]) n++; }); });
    return { n: n, max: ROOMS.length * BANDS.length };
  }
  function clueText(c, vars) { return t(c.text, vars || {}); }

  /* ---------- the daily challenge ---------- */
  function weakestRoom(band, d) {
    var min = 9, low = [];
    ROOMS.forEach(function (r) { var s = bestOf(d || {}, band, r.id); if (s < min) { min = s; low = [r.id]; } else if (s === min) low.push(r.id); });
    return low[Math.floor(Math.random() * low.length)];
  }
  function runeKeyHtml(keys, band) {
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px">' + keys.map(function (k) {
      return '<span style="display:inline-flex;flex-direction:column;align-items:center;min-width:34px;padding:4px 4px 2px;background:#F3E9D2;border:2px solid #8A6A3A;border-radius:8px">' + PZ.runeIcon(k, 30) +
        '<b style="font:700 15px system-ui,sans-serif;color:#2B1A0C">' + esc(PZ.runeLabel(k, band).toUpperCase()) + '</b></span>';
    }).join('') + '</div>';
  }
  function quickTask(band, d) {
    band = band === 'U' ? 'U' : 'M'; d = d || {};
    var room = weakestRoom(band, d), Q = S.q, step, opts;
    if (room === 'hallen') {
      var T = PZ.clockTime('M', Math.random), el2 = T - PZ.CLOSE, hh = Math.floor(el2 / 60), mm = el2 % 60, fo = function (a, b) { return t(Q.timeOpt, { h: a, m: b }); };
      var right = fo(hh, mm), cand = [fo(hh + 1, mm), fo(hh - 1, mm), fo(hh, (mm + 10) % 60 || 5), fo(hh + 12, mm), fo(hh, mm === 30 ? 20 : 30)];
      opts = [right]; shuffle(cand).forEach(function (x) { if (opts.length < 4 && opts.indexOf(x) < 0) opts.push(x); });
      var v = { T: PZ.hm(T), clock: PZ.hm(T - 720), full: PZ.hm(Math.floor(T / 60) * 60), h: hh, m: mm };
      return { q: Q.time, html: '<div style="text-align:center">' + PZ.clockSvg(T, 150, S.clockLabel) + '</div>', options: shuffle(opts), answer: right, hint: Q.timeHint, explain: t(Q.timeExplain, v) };
    }
    if (room === 'oldtiden') {
      var pool = band === 'M' ? PZ.PERIODS.map(function (p) { return pick(PZ.FINDS.filter(function (f) { return f.period === p; })); }) : PZ.FINDS.slice();
      var three = shuffle(pool).slice(0, band === 'M' ? 3 : 4), old = three.slice().sort(function (a, b) { return a.year - b.year; })[0];
      var lab = function (f) { return STORY.finds[f.id].name + ' (' + (band === 'M' ? STORY.periods[f.period].name.toLowerCase() : STORY.finds[f.id].when) + ')'; };
      return { q: Q.oldest, options: three.map(lab), answer: lab(old), hint: Q.oldestHint, explain: t(Q.oldestExplain, { a: STORY.finds[old.id].name, w: band === 'M' ? STORY.periods[old.period].name.toLowerCase() : STORY.finds[old.id].when }) };
    }
    if (room === 'vikingetiden') {
      var w = pick(PZ.M_WORDS), runes = PZ.encode(w), keys = [];
      runes[0].forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
      shuffle(PZ.RUNES.map(function (r) { return r.k; }).filter(function (k) { return keys.indexOf(k) < 0 && k !== 'R' && k !== 'th' && k !== 'o'; })).slice(0, 3).forEach(function (k) { keys.push(k); });
      keys = shuffle(keys);
      var others = shuffle(PZ.M_WORDS.filter(function (x) { return x !== w; })).slice(0, 3);
      return { q: Q.rune, html: '<div style="text-align:center"><div style="display:inline-block;background:#CFC6B4;border:3px solid #6E6658;border-radius:12px;padding:6px 10px">' + PZ.runesSvg(runes, { h: 64, label: Q.rune }) + '</div>' + runeKeyHtml(keys, 'M') + '</div>',
        options: shuffle([w].concat(others)), answer: w, hint: Q.runeHint, explain: t(Q.runeExplain, { w: w, list: w.split('').join(' – ') }) };
    }
    if (room === 'middelalderen') {
      step = PZ.make('middelalderen', band, Math.random).steps[0];
      return { q: step.q, html: '<div style="text-align:center">' + PZ.scaleSvg(step, null, { w: 300, label: step.q }) + '</div>', options: step.options.slice(), answer: step.answer, hint: step.hints[0], explain: step.explain };
    }
    if (room === 'renaessancen') {
      var it = pick(Q.englishItems);
      return { q: t(Q.english, { s: it[0] }), options: shuffle([it[1]].concat(it[2])), answer: it[1], hint: Q.englishHint, explain: t(Q.englishExplain, { s: it[0], a: it[1] }) };
    }
    var T2 = PZ.hm(PZ.clockTime(band, Math.random));
    return { q: t(Q.logic, { T: T2 }), options: shuffle(Q.logicOpts.slice()), answer: Q.logicOpts[0], hint: Q.logicHint, explain: Q.logicExplain };
  }

  /* ================= DRAWINGS ================= */
  var VW = 1000, VH = 600;
  function torch(u, cx, cy) {
    return '<defs><radialGradient id="' + u + 'torch" cx="' + cx + '" cy="' + cy + '" r="0.75"><stop offset="0" stop-color="#FFF4C8" stop-opacity=".16"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0A0814" stop-opacity=".55"/></radialGradient></defs>' +
      '<rect width="' + VW + '" height="' + VH + '" fill="url(#' + u + 'torch)" pointer-events="none"/>';
  }
  function lg(id, a, b, vert) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (vert === false ? 1 : 0) + '" y2="' + (vert === false ? 0 : 1) + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  // a door: the leaf swings open (class mu-leaf) when the room is solved; behind it a warm light
  function door(x, y, w, hh, col, edge, extra) {
    return '<g class="mu-door"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" fill="#FFE6A3"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" fill="#FFB547" opacity=".35"/>' +
      '<g class="mu-leaf"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="6" fill="' + col + '" stroke="' + edge + '" stroke-width="5"/>' +
      '<rect x="' + (x + 14) + '" y="' + (y + 16) + '" width="' + (w - 28) + '" height="' + (hh * 0.38) + '" rx="4" fill="none" stroke="' + edge + '" stroke-width="3" opacity=".7"/>' +
      '<rect x="' + (x + 14) + '" y="' + (y + hh * 0.5) + '" width="' + (w - 28) + '" height="' + (hh * 0.42) + '" rx="4" fill="none" stroke="' + edge + '" stroke-width="3" opacity=".7"/>' +
      '<circle cx="' + (x + w - 18) + '" cy="' + (y + hh * 0.52) + '" r="7" fill="#E2B33C" stroke="#5A3A12" stroke-width="2"/>' + (extra || '') + '</g></g>';
  }
  function sceneSvg(room, band, pz, label) {
    var u = 'mu' + (++uid) + '-', o = '', defs = '';
    if (room === 'hallen') {
      var T = pz && pz.steps[0].T || 21 * 60 + 40;
      defs += lg(u + 'w', '#2E4B5C', '#1D3240') + lg(u + 'f', '#D9CFBD', '#A79A82');
      o += '<rect width="1000" height="440" fill="url(#' + u + 'w)"/><rect y="440" width="1000" height="160" fill="url(#' + u + 'f)"/>';
      for (var i = 0; i < 10; i++) for (var j = 0; j < 3; j++) if ((i + j) % 2) o += '<path d="M' + (i * 100 + (j - 1) * 30) + ',' + (440 + j * 54) + ' h100 l30,54 h-100z" fill="#8F826B" opacity=".35"/>';
      o += '<rect y="430" width="1000" height="14" fill="#5B4A33"/>';
      // tall night windows
      [[300, 40], [600, 40]].forEach(function (p) { o += '<rect x="' + p[0] + '" y="' + p[1] + '" width="100" height="150" rx="50" fill="#0E1A33" stroke="#C9B48A" stroke-width="6"/><path d="M' + (p[0] + 50) + ',' + p[1] + ' V' + (p[1] + 150) + ' M' + p[0] + ',' + (p[1] + 90) + ' h100" stroke="#C9B48A" stroke-width="4"/>' +
        '<circle cx="' + (p[0] + 28) + '" cy="' + (p[1] + 40) + '" r="2" fill="#FFF"/><circle cx="' + (p[0] + 72) + '" cy="' + (p[1] + 70) + '" r="1.6" fill="#FFF"/><circle cx="' + (p[0] + 64) + '" cy="' + (p[1] + 30) + '" r="1.4" fill="#FFF"/>'; });
      o += '<path d="M640,70 a16,16 0 1 0 14,24 a12,12 0 1 1 -14,-24z" fill="#FFF3C4"/>';
      // grandfather clock
      o += '<rect x="118" y="96" width="104" height="420" rx="8" fill="#6B3E1F" stroke="#3A200D" stroke-width="5"/><path d="M110,104 q60,-50 120,0 v20 h-120z" fill="#7C4A25" stroke="#3A200D" stroke-width="5"/>';
      o += '<rect x="140" y="270" width="60" height="200" rx="6" fill="#4A2A12" stroke="#2A1608" stroke-width="3"/><line x1="170" y1="270" x2="170" y2="420" stroke="#C9A03B" stroke-width="3"/><circle cx="170" cy="428" r="16" fill="#E2B33C" stroke="#7A5A10" stroke-width="3"/>';
      o += PZ.clockSvg(T, 92, '').replace('<svg ', '<svg x="124" y="128" ');
      o += '<rect x="112" y="510" width="116" height="16" rx="4" fill="#3A200D"/>';
      // the empty case
      o += '<rect x="420" y="390" width="160" height="80" fill="#7A5534" stroke="#3E2A16" stroke-width="4"/><rect x="410" y="378" width="180" height="16" fill="#8E6A45" stroke="#3E2A16" stroke-width="3"/>';
      o += '<rect x="425" y="210" width="150" height="168" fill="#BFE6F2" fill-opacity=".22" stroke="#E8F6FB" stroke-width="4"/><path d="M440,225 l30,30 M520,225 l40,40" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>';
      o += '<path d="M455,360 q20,-6 50,0 M498,360 q20,-6 50,0" stroke="#5B4A33" stroke-width="3" fill="none" opacity=".6"/><rect x="452" y="418" width="96" height="26" rx="3" fill="#F3E9D2" stroke="#3E2A16" stroke-width="2"/><path d="M462,428 h76 M462,436 h50" stroke="#7A5A3E" stroke-width="2"/>';
      // guest book on a lectern
      o += '<path d="M300,486 l12,-90 h46 l12,90z" fill="#6B3E1F" stroke="#3A200D" stroke-width="4"/><path d="M282,396 l52,-30 l54,30 l-52,14z" fill="#F7F0DE" stroke="#5B4A33" stroke-width="3"/><path d="M334,366 v44" stroke="#5B4A33" stroke-width="2"/><path d="M296,392 l30,-16 M300,398 l28,-15 M342,378 l30,14 M344,386 l28,13" stroke="#8A7A5E" stroke-width="2"/>';
      // the bench Bob slept on
      o += '<rect x="560" y="486" width="140" height="14" rx="4" fill="#7A5534" stroke="#3E2A16" stroke-width="3"/><rect x="572" y="500" width="10" height="34" fill="#3E2A16"/><rect x="678" y="500" width="10" height="34" fill="#3E2A16"/>';
      // sign
      o += '<rect x="826" y="82" width="128" height="76" rx="6" fill="#F3E9D2" stroke="#5B4A33" stroke-width="4"/><text x="890" y="112" font-size="18" font-weight="800" text-anchor="middle" fill="#3B2A14" font-family="Georgia,serif">ÅBENT</text><text x="890" y="138" font-size="17" text-anchor="middle" fill="#3B2A14" font-family="Georgia,serif">10–17</text>';
      // door with keypad
      o += door(728, 170, 144, 346, '#4E6E5D', '#24382D', '<rect x="' + 840 + '" y="300" width="22" height="40" rx="3" fill="#20262B" stroke="#C9A03B" stroke-width="2"/><g fill="#C9A03B">' + [0, 1, 2].map(function (r) { return '<circle cx="846" cy="' + (310 + r * 9) + '" r="2"/><circle cx="856" cy="' + (310 + r * 9) + '" r="2"/>'; }).join('') + '</g>');
      o += torch(u, '0.45', '0.55');
    } else if (room === 'oldtiden') {
      defs += lg(u + 'w', '#4E5A3A', '#323A24') + lg(u + 'f', '#8A6E4A', '#5E4A30');
      o += '<rect width="1000" height="450" fill="url(#' + u + 'w)"/><rect y="450" width="1000" height="150" fill="url(#' + u + 'f)"/>';
      // painted animals on the wall (like a cave)
      o += '<g fill="none" stroke="#C98B4A" stroke-width="4" stroke-linecap="round" opacity=".55"><path d="M330,90 q30,-20 70,-6 q10,-14 20,-4 l-6,14 q8,30 -10,34 l-2,24 M350,110 l-4,30 M390,116 l2,26 M330,90 q-8,10 -2,24"/><path d="M500,70 l18,30 l18,-30 M518,100 v40"/></g>';
      o += '<path d="M0,450 q120,-20 250,-6 t260,0 t260,2 t230,-4 v20 h-1000z" fill="#6E5636"/>';
      // two curved bronze horns on a stand
      o += '<rect x="70" y="390" width="140" height="16" fill="#3E2E1A"/><rect x="84" y="406" width="10" height="44" fill="#3E2E1A"/><rect x="186" y="406" width="10" height="44" fill="#3E2E1A"/>';
      o += '<path d="M100,390 q-30,-120 40,-210 q20,-26 50,-14" fill="none" stroke="#B9873B" stroke-width="12" stroke-linecap="round"/><path d="M180,390 q30,-120 -30,-200 q-14,-20 -40,-18" fill="none" stroke="#C99A45" stroke-width="10" stroke-linecap="round"/><circle cx="194" cy="166" r="16" fill="#D9AE5A" stroke="#7A5A10" stroke-width="3"/><circle cx="104" cy="170" r="13" fill="#D9AE5A" stroke="#7A5A10" stroke-width="3"/>';
      // the curator's table with papers and a train ticket
      o += '<rect x="282" y="410" width="176" height="16" rx="3" fill="#7A5534" stroke="#3E2A16" stroke-width="3"/><rect x="296" y="426" width="12" height="74" fill="#3E2A16"/><rect x="432" y="426" width="12" height="74" fill="#3E2A16"/>';
      o += '<rect x="300" y="390" width="60" height="22" fill="#F3E9D2" stroke="#7A5A3E" stroke-width="2" transform="rotate(-6 330 400)"/><rect x="372" y="388" width="56" height="24" rx="3" fill="#F7D774" stroke="#7A5A10" stroke-width="2"/><path d="M380,396 h40 M380,404 h26" stroke="#7A5A10" stroke-width="2"/>';
      o += '<rect x="436" y="372" width="18" height="38" rx="3" fill="#D8D2C2" stroke="#5B4A33" stroke-width="2"/>';
      // model hut with reed roof
      o += '<rect x="520" y="330" width="160" height="16" fill="#3E2E1A"/><path d="M536,330 v-60 h128 v60z" fill="#A47B4A" stroke="#4A3010" stroke-width="3"/><path d="M520,276 l80,-96 l80,96z" fill="#C9A35A" stroke="#6B4A1E" stroke-width="3"/><path d="M548,262 l52,-62 M578,272 l30,-40 M626,270 l-26,-32" stroke="#8A6A2E" stroke-width="2"/><rect x="586" y="290" width="28" height="40" fill="#3A2614"/>';
      // a flint axe and the sun disc in small cases
      o += '<rect x="380" y="232" width="90" height="70" rx="4" fill="#E9F2E4" fill-opacity=".15" stroke="#DCE7D2" stroke-width="3"/><path d="M402,286 q18,-48 46,-40 q-6,30 -46,40z" fill="#8E8E86" stroke="#45453F" stroke-width="2"/>';
      o += '<rect x="700" y="232" width="56" height="70" rx="4" fill="#E9F2E4" fill-opacity=".15" stroke="#DCE7D2" stroke-width="3"/><circle cx="728" cy="266" r="18" fill="#E9B93A" stroke="#7A5A10" stroke-width="2"/><path d="M720,266 a8,8 0 1 1 8,8" fill="none" stroke="#7A5A10" stroke-width="2"/>';
      // door with the timeline
      o += door(778, 150, 144, 360, '#6B4A2A', '#3A2614', '<rect x="796" y="200" width="108" height="26" rx="4" fill="#E8D9B6" stroke="#3A2614" stroke-width="2"/>' + [0, 1, 2, 3].map(function (k) { return '<rect x="' + (802 + k * 25) + '" y="205" width="20" height="16" rx="2" fill="#B8A27A"/>'; }).join(''));
      o += torch(u, '0.5', '0.5');
    } else if (room === 'vikingetiden') {
      defs += lg(u + 'w', '#6E3B26', '#4A2516') + lg(u + 'f', '#5E4630', '#3E2E1E');
      o += '<rect width="1000" height="450" fill="url(#' + u + 'w)"/>';
      for (var p = 0; p < 1000; p += 50) o += '<line x1="' + p + '" y1="0" x2="' + p + '" y2="450" stroke="#3A1E10" stroke-width="2" opacity=".45"/>';
      o += '<rect y="450" width="1000" height="150" fill="url(#' + u + 'f)"/><rect y="444" width="1000" height="10" fill="#2E1A0E"/>';
      // shields and a helmet on the wall
      [[260, 120, '#C23B30'], [350, 110, '#E2B33C'], [700, 110, '#2F7DB3']].forEach(function (s) { o += '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="36" fill="' + s[2] + '" stroke="#3A200D" stroke-width="5"/><circle cx="' + s[0] + '" cy="' + s[1] + '" r="10" fill="#B9B1A3" stroke="#3A200D" stroke-width="3"/><path d="M' + (s[0] - 36) + ',' + s[1] + ' h72 M' + s[0] + ',' + (s[1] - 36) + ' v72" stroke="#3A200D" stroke-width="3" opacity=".5"/>'; });
      o += '<path d="M736,214 q0,-34 30,-34 q30,0 30,34 z" fill="#9AA0A8" stroke="#3A3E44" stroke-width="3"/><path d="M766,214 v16" stroke="#3A3E44" stroke-width="5"/>';
      // hanging lamp
      o += '<path d="M440,0 v40" stroke="#2E1A0E" stroke-width="3"/><path d="M424,40 h32 l-6,22 h-20z" fill="#8A6A3A" stroke="#2E1A0E" stroke-width="2"/><circle cx="440" cy="68" r="7" fill="#FFD36B"/>';
      // rune stone
      o += '<path d="M36,500 l-6,-200 q20,-110 70,-104 q52,8 58,110 l-6,194z" fill="#B9B1A3" stroke="#555048" stroke-width="5"/>';
      o += '<path d="M58,300 q42,-70 84,0" fill="none" stroke="#8C2F25" stroke-width="5"/><path d="M66,330 q30,40 70,-6 M60,380 q50,30 84,-10 M70,430 q30,22 60,-6" fill="none" stroke="#8C2F25" stroke-width="4"/>';
      // ship model on a low stand
      o += '<rect x="196" y="440" width="210" height="16" fill="#3A200D"/><path d="M180,400 q110,50 240,0 l-14,34 q-100,24 -212,0z" fill="#8A5A2E" stroke="#3A200D" stroke-width="4"/><path d="M180,400 q-14,-28 -4,-46 M420,400 q14,-28 4,-46" fill="none" stroke="#3A200D" stroke-width="5" stroke-linecap="round"/>';
      o += '<path d="M300,404 v-110" stroke="#3A200D" stroke-width="5"/><path d="M246,300 h108 v74 h-108z" fill="#F3E9D2" stroke="#3A200D" stroke-width="3"/><path d="M246,320 h108 M246,345 h108" stroke="#C23B30" stroke-width="10"/>';
      // cupboard, small house, mug, bench, chest, sack, bucket (places for the key)
      o += '<rect x="630" y="300" width="70" height="150" rx="4" fill="#7A4A26" stroke="#3A200D" stroke-width="4"/><path d="M665,304 v142" stroke="#3A200D" stroke-width="3"/><circle cx="658" cy="380" r="4" fill="#E2B33C"/><circle cx="672" cy="380" r="4" fill="#E2B33C"/>';
      o += '<path d="M640,300 l25,-28 l25,28" fill="#A0522D" stroke="#3A200D" stroke-width="3"/>';
      o += '<rect x="476" y="428" width="70" height="12" fill="#7A4A26" stroke="#3A200D" stroke-width="2"/><rect x="484" y="440" width="8" height="50" fill="#3A200D"/><rect x="530" y="440" width="8" height="50" fill="#3A200D"/>';
      o += '<rect x="580" y="430" width="26" height="30" rx="4" fill="#B5793F" stroke="#3A200D" stroke-width="3"/><path d="M606,436 q12,8 0,18" fill="none" stroke="#3A200D" stroke-width="3"/>';
      o += '<path d="M436,520 q14,-30 26,-2 q4,-24 20,-6 l-2,34 h-40z" fill="#C8A86A" stroke="#6B4A1E" stroke-width="2"/><path d="M692,512 h38 l-4,36 h-30z" fill="#8A6A3A" stroke="#3A200D" stroke-width="3"/><path d="M692,512 q19,-22 38,0" fill="none" stroke="#3A200D" stroke-width="2"/>';
      o += '<rect x="630" y="476" width="54" height="40" rx="4" fill="#7A4A26" stroke="#3A200D" stroke-width="3"/><path d="M630,490 h54" stroke="#C9A03B" stroke-width="3"/>';
      // the rune key board
      o += '<rect x="444" y="82" width="212" height="148" rx="8" fill="#E8D9B6" stroke="#3A200D" stroke-width="5"/>';
      PZ.RUNES.forEach(function (r, k) { var cx = 462 + (k % 8) * 25, cy = 96 + Math.floor(k / 8) * 64; o += '<path d="' + r.d + '" transform="translate(' + (cx - 5) + ',' + cy + ') scale(.75)" fill="none" stroke="#2B1A0C" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><text x="' + (cx + 3) + '' + '" y="' + (cy + 44) + '" font-size="13" font-weight="800" text-anchor="middle" fill="#8C2F25" font-family="system-ui,sans-serif">' + esc(r.main.toUpperCase()) + '</text>'; });
      // door with runes above it
      var words = pz ? pz.steps[0].runes : [['s', 'k', 'i', 'b']];
      o += '<rect x="742" y="96" width="196" height="54" rx="6" fill="#CFC6B4" stroke="#555048" stroke-width="3"/>';
      o += PZ.runesSvg(words, { h: 46 }).replace('<svg ', '<svg x="748" y="100" preserveAspectRatio="xMidYMid meet" ').replace(/width="\d+" height="\d+"/, 'width="184" height="46"');
      o += door(768, 160, 144, 352, '#6E4A2E', '#2E1A0E', '<path d="M790,250 l100,0 M790,420 l100,0" stroke="#2E1A0E" stroke-width="6"/><rect x="838" y="324" width="20" height="26" rx="3" fill="#2E1A0E"/>');
      // chair with the logbook (front)
      o += '<rect x="512" y="440" width="86" height="12" fill="#8A5A2E" stroke="#3A200D" stroke-width="3"/><rect x="590" y="360" width="10" height="92" fill="#3A200D"/><rect x="516" y="452" width="8" height="52" fill="#3A200D"/><rect x="586" y="452" width="8" height="52" fill="#3A200D"/><rect x="526" y="424" width="56" height="16" rx="2" fill="#2F4A7A" stroke="#14233F" stroke-width="2"/><path d="M532,432 h44" stroke="#E2B33C" stroke-width="2"/>';
      o += torch(u, '0.5', '0.45');
    } else if (room === 'middelalderen') {
      defs += lg(u + 'w', '#8C8577', '#5E594F') + lg(u + 'f', '#7A6A52', '#4E4334');
      o += '<rect width="1000" height="450" fill="url(#' + u + 'w)"/>';
      for (var r = 0; r < 9; r++) for (var c = 0; c < 11; c++) o += '<rect x="' + (c * 96 - (r % 2) * 48) + '" y="' + (r * 50) + '" width="92" height="46" rx="3" fill="#000" opacity="' + (((r * 7 + c * 3) % 5) * 0.02 + 0.03) + '"/>';
      o += '<path d="M300,0 v200 q0,-90 100,-110 q100,20 100,110 v-200z" fill="#3E3A33" opacity=".4"/>';
      o += '<rect y="450" width="1000" height="150" fill="url(#' + u + 'f)"/><rect y="444" width="1000" height="10" fill="#3A3226"/>';
      // banners
      [[340, '#2F5C8A'], [700, '#8C2F25']].forEach(function (b) { o += '<path d="M' + b[0] + ',20 h60 v120 l-30,-22 l-30,22z" fill="' + b[1] + '" stroke="#2A2620" stroke-width="3"/><circle cx="' + (b[0] + 30) + '" cy="64" r="12" fill="#E2B33C"/>'; });
      // market stall
      o += '<rect x="44" y="300" width="232" height="150" fill="#8A5A2E" stroke="#3A200D" stroke-width="4"/><rect x="56" y="200" width="10" height="100" fill="#3A200D"/><rect x="254" y="200" width="10" height="100" fill="#3A200D"/>';
      o += '<path d="M36,210 h248 l-12,-46 h-224z" fill="#E8D9B6" stroke="#5B4A33" stroke-width="3"/>' + [0, 1, 2, 3, 4].map(function (k) { return '<path d="M' + (48 + k * 48) + ',164 h24 l4,46 h-32z" fill="#C23B30" opacity=".85"/>'; }).join('');
      o += '<path d="M70,300 q20,-40 44,0z" fill="#F3EFE6" stroke="#5B4A33" stroke-width="2"/><path d="M130,300 q20,-36 44,0z" fill="#3B2A14" stroke="#1E140A" stroke-width="2"/><rect x="190" y="268" width="66" height="32" fill="#2F5C8A" stroke="#1E2E44" stroke-width="2"/><path d="M190,278 h66 M190,288 h66" stroke="#6FA0CF" stroke-width="2"/>';
      // the big scale (decor; the puzzle draws its own)
      o += '<rect x="530" y="430" width="60" height="18" rx="4" fill="#4A3010"/><rect x="552" y="200" width="16" height="232" fill="#8A6230" stroke="#4A3010" stroke-width="3"/><path d="M450,214 l110,-16 l110,16" fill="none" stroke="#5A3A12" stroke-width="10" stroke-linecap="round"/><circle cx="560" cy="198" r="10" fill="#C9A03B" stroke="#4A3010" stroke-width="3"/>';
      o += '<path d="M450,214 l-34,110 M450,214 l34,110 M670,214 l-34,110 M670,214 l34,110" stroke="#4A3010" stroke-width="2"/><path d="M406,324 h88 q-6,16 -44,16 q-38,0 -44,-16z M626,324 h88 q-6,16 -44,16 q-38,0 -44,-16z" fill="#C9A03B" stroke="#6B4A1E" stroke-width="3"/>';
      o += '<path d="M430,324 l3,-18 h22 l3,18z" fill="#7D7F86" stroke="#2E2F33" stroke-width="2"/>';
      // the little gear glinting on the floor
      o += '<g transform="translate(380 520)"><circle r="16" fill="#E2B33C" stroke="#7A5A10" stroke-width="3"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (k) { var a = k * Math.PI / 4; return '<rect x="-4" y="-22" width="8" height="8" fill="#E2B33C" stroke="#7A5A10" stroke-width="2" transform="rotate(' + (k * 45) + ')"/>'; }).join('') + '<circle r="5" fill="#7A5A10"/></g><path d="M398,494 l6,-8 M404,504 l10,-2" stroke="#FFF6C8" stroke-width="3" stroke-linecap="round"/>';
      // money chest
      o += '<rect x="676" y="440" width="108" height="70" rx="6" fill="#6B3E1F" stroke="#3A200D" stroke-width="4"/><path d="M676,462 h108" stroke="#C9A03B" stroke-width="5"/><rect x="720" y="456" width="20" height="22" rx="3" fill="#C9A03B" stroke="#5A3A12" stroke-width="2"/>';
      // door with a rope to the scale
      o += '<path d="M670,214 q90,-60 162,-40" fill="none" stroke="#C8A86A" stroke-width="4" stroke-dasharray="10 5"/>';
      o += door(826, 138, 128, 350, '#5E4630', '#2A2016', '<path d="M846,138 v350 M934,138 v350" stroke="#2A2016" stroke-width="3" opacity=".4"/><circle cx="830" cy="176" r="6" fill="#C8A86A"/>');
      o += torch(u, '0.5', '0.5');
    } else if (room === 'renaessancen') {
      defs += lg(u + 'w', '#2F4A7A', '#1F3358') + lg(u + 'f', '#7A5534', '#4E3520');
      o += '<rect width="1000" height="450" fill="url(#' + u + 'w)"/>';
      for (var q = 0; q < 1000; q += 80) o += '<path d="M' + (q + 40) + ',30 l10,14 l-10,14 l-10,-14z" fill="#C9A03B" opacity=".35"/>';
      o += '<rect y="300" width="1000" height="150" fill="#24395F"/><rect y="296" width="1000" height="8" fill="#C9A03B"/>';
      o += '<rect y="450" width="1000" height="150" fill="url(#' + u + 'f)"/>';
      for (var x2 = 0; x2 < 1000; x2 += 60) o += '<path d="M' + x2 + ',450 l30,0 l-60,150 l-30,0z" fill="#3E2A16" opacity=".35"/>';
      // painting of the round tower
      o += '<rect x="122" y="80" width="176" height="200" fill="#C9A03B" stroke="#7A5A10" stroke-width="5"/><rect x="138" y="96" width="144" height="168" fill="#9CC3DE"/><rect x="138" y="210" width="144" height="54" fill="#7A9A5E"/>';
      o += '<path d="M180,250 v-110 q30,-16 60,0 v110z" fill="#B5583A" stroke="#5A2A18" stroke-width="3"/><path d="M180,140 q30,-16 60,0" fill="none" stroke="#5A2A18" stroke-width="3"/><rect x="196" y="120" width="28" height="18" fill="#7A8890" stroke="#3A3E44" stroke-width="2"/>' + [0, 1, 2].map(function (k) { return '<rect x="' + (192 + k * 14) + '" y="' + (160 + (k % 2) * 30) + '" width="8" height="14" fill="#3A1E10"/>'; }).join('');
      // a second picture: a ship
      o += '<rect x="360" y="70" width="140" height="110" fill="#C9A03B" stroke="#7A5A10" stroke-width="5"/><rect x="372" y="82" width="116" height="86" fill="#CFE0E6"/><path d="M380,150 q50,14 100,0 l-8,12 h-84z" fill="#6B3E1F"/><path d="M430,150 v-56 M430,96 l26,40 h-26 M430,100 l-24,36 h24" stroke="#3A200D" stroke-width="2" fill="#F3E9D2"/>';
      // globe and telescope
      o += '<rect x="74" y="500" width="120" height="14" rx="4" fill="#4E3520"/><path d="M134,500 v-40" stroke="#4E3520" stroke-width="8"/><circle cx="134" cy="420" r="52" fill="#4F8FB8" stroke="#2A4A6A" stroke-width="4"/><path d="M96,400 q30,-20 60,6 q-20,24 -50,8z M128,440 q20,0 30,16 q-24,6 -30,-16z" fill="#8FBF6A"/><path d="M80,420 a54,54 0 0 0 108,0" fill="none" stroke="#C9A03B" stroke-width="5"/>';
      o += '<path d="M180,380 l60,-40" stroke="#C9A03B" stroke-width="12" stroke-linecap="round"/><path d="M216,356 l-4,90 M216,356 l30,90" stroke="#4E3520" stroke-width="4"/>';
      // writing desk with the letter
      o += '<path d="M420,396 l200,-20 v24 l-200,20z" fill="#7A4A26" stroke="#3A200D" stroke-width="4"/><rect x="430" y="420" width="12" height="80" fill="#3A200D"/><rect x="600" y="400" width="12" height="100" fill="#3A200D"/>';
      o += '<path d="M480,386 l70,-8 l4,26 l-70,8z" fill="#FBF5E4" stroke="#7A5A3E" stroke-width="2"/><path d="M490,392 l50,-5 M491,399 l44,-5" stroke="#7A5A3E" stroke-width="1.5"/><circle cx="540" cy="398" r="5" fill="#B03A2E"/>';
      o += '<path d="M590,380 l14,-46" stroke="#F3E9D2" stroke-width="3"/><rect x="580" y="372" width="18" height="12" rx="2" fill="#2E2A30"/>';
      // ornate door
      o += door(792, 140, 136, 368, '#7A3A2A', '#3A160E', '<path d="M808,150 q52,-30 104,0" fill="none" stroke="#C9A03B" stroke-width="4"/>' + [0, 1, 2].map(function (k) { return '<circle cx="' + (830 + k * 30) + '" cy="300" r="7" fill="#C9A03B" stroke="#5A3A12" stroke-width="2"/>'; }).join(''));
      o += torch(u, '0.5', '0.5');
    } else { // loftet
      defs += lg(u + 'w', '#4A3B52', '#2E2433') + lg(u + 'f', '#6E5A44', '#4A3C2C');
      o += '<rect width="1000" height="460" fill="url(#' + u + 'w)"/><rect y="460" width="1000" height="140" fill="url(#' + u + 'f)"/>';
      for (var b2 = 0; b2 < 1000; b2 += 42) o += '<line x1="' + b2 + '" y1="460" x2="' + (b2 - 30) + '" y2="600" stroke="#3A2E22" stroke-width="2" opacity=".5"/>';
      // sloping roof beams
      o += '<path d="M0,0 L380,0 L0,300z" fill="#2A2030"/><path d="M1000,0 L620,0 L1000,300z" fill="#2A2030"/><path d="M0,300 L380,0 M1000,300 L620,0" stroke="#6B4A2E" stroke-width="22"/><rect x="0" y="0" width="1000" height="22" fill="#6B4A2E"/>';
      [180, 500, 820].forEach(function (x) { o += '<rect x="' + (x - 10) + '" y="22" width="20" height="438" fill="#5A3E26"/>'; });
      // open window with the moon, the nest on the sill
      o += '<rect x="620" y="120" width="160" height="120" fill="#16234A" stroke="#7A5A3E" stroke-width="8"/><circle cx="728" cy="160" r="22" fill="#FFF3C4"/><circle cx="660" cy="150" r="2" fill="#FFF"/><circle cx="700" cy="200" r="1.6" fill="#FFF"/>';
      o += '<path d="M780,120 l60,20 v120 l-60,-20z" fill="#5E4A36" stroke="#3A2A1A" stroke-width="4"/><path d="M790,140 l40,13 v90 l-40,-13z" fill="#16234A" opacity=".6"/>';
      o += '<rect x="606" y="240" width="190" height="14" fill="#7A5A3E"/><path d="M626,240 q40,-30 90,0" fill="#6B4A2A" stroke="#3A2A1A" stroke-width="3"/>' + [0, 1, 2, 3, 4, 5].map(function (k) { return '<path d="M' + (632 + k * 14) + ',236 l' + (8 - k * 3) + ',-16" stroke="#3A2A1A" stroke-width="2"/>'; }).join('');
      o += '<path d="M740,250 q16,-10 30,4 q-14,8 -30,-4z" fill="#1E1E24"/><path d="M754,246 q6,-4 14,2" stroke="#F3F3F3" stroke-width="3" fill="none"/><path d="M590,262 q10,-14 26,-6 q-12,10 -26,6z" fill="#F3F3F3" stroke="#1E1E24" stroke-width="1.5"/>';
      // the board where Bob collects the clues
      o += '<rect x="58" y="176" width="164" height="230" rx="6" fill="#2E3A30" stroke="#6B4A2E" stroke-width="8"/><path d="M80,220 h80 M80,250 h110 M80,280 h60 M80,310 h100 M80,340 h70" stroke="#E8E4D8" stroke-width="3" opacity=".7"/><path d="M190,200 l20,10 M200,350 q10,10 0,20" stroke="#E8E4D8" stroke-width="3" opacity=".7"/><path d="M90,406 l-16,54 M190,406 l16,54" stroke="#6B4A2E" stroke-width="8"/>';
      // trunk with a padlock and a golden glint
      o += '<rect x="240" y="390" width="200" height="120" rx="8" fill="#7A4A26" stroke="#3A200D" stroke-width="5"/><path d="M240,420 q100,-60 200,0" fill="#8A5A2E" stroke="#3A200D" stroke-width="5"/><path d="M240,440 h200 M290,390 v120 M390,390 v120" stroke="#3A200D" stroke-width="4"/><rect x="328" y="430" width="24" height="26" rx="4" fill="#C9A03B" stroke="#5A3A12" stroke-width="3"/><path d="M333,430 v-10 a7,7 0 0 1 14,0 v10" fill="none" stroke="#5A3A12" stroke-width="3"/>';
      o += '<path d="M400,436 l10,-2 M404,428 l4,-8 M412,442 l8,2" stroke="#FFE27A" stroke-width="3" stroke-linecap="round"/>';
      if (band === 'U') o += '<g transform="translate(510 504)"><circle r="16" fill="#CFE8F5" fill-opacity=".6" stroke="#2E2A30" stroke-width="5"/><path d="M12,10 l12,10" stroke="#2E2A30" stroke-width="6" stroke-linecap="round"/></g>';
      // old things: a rocking horse and boxes
      o += '<path d="M860,500 q50,26 100,0" fill="none" stroke="#6B3E1F" stroke-width="8"/><path d="M880,496 v-50 h56 v50 M936,446 l16,-40 q10,0 12,14 l-14,26" fill="#C9A35A" stroke="#6B3E1F" stroke-width="4"/>';
      o += '<rect x="520" y="400" width="80" height="60" fill="#B08A5A" stroke="#5A3E26" stroke-width="3"/><rect x="540" y="350" width="60" height="50" fill="#C9A570" stroke="#5A3E26" stroke-width="3"/>';
      o += torch(u, '0.45', '0.55');
    }
    return '<svg class="mu-svg" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="' + esc(label || '') + '" xmlns="http://www.w3.org/2000/svg"><defs>' + defs + '</defs>' + o + '</svg>';
  }

  // portraits of the suspects
  function faceSvg(id, size) {
    var o = '<circle cx="30" cy="30" r="29" fill="#F3E9D2"/>', skin = '<circle cx="30" cy="34" r="15" fill="#F2C9A0" stroke="#5A3A20" stroke-width="2"/><circle cx="25" cy="33" r="1.8" fill="#2B1D10"/><circle cx="35" cy="33" r="1.8" fill="#2B1D10"/>';
    if (id === 'vagt') o += '<path d="M10,60 q20,-16 40,0z" fill="#2F4A7A"/>' + skin + '<path d="M26,41 q4,3 8,0" stroke="#5A3A20" stroke-width="2" fill="none"/><path d="M14,26 q16,-16 32,0z" fill="#2F4A7A" stroke="#14233F" stroke-width="2"/><path d="M14,26 h34 l-4,4 h-30z" fill="#14233F"/><circle cx="30" cy="20" r="2.5" fill="#E2B33C"/>';
    else if (id === 'inspektor') o += '<path d="M10,60 q20,-16 40,0z" fill="#3F8A3A"/><circle cx="30" cy="16" r="7" fill="#8C4A2A"/><path d="M15,32 q0,-16 15,-16 q15,0 15,16" fill="#8C4A2A"/>' + skin + '<circle cx="25" cy="33" r="4.5" fill="none" stroke="#2B1D10" stroke-width="1.8"/><circle cx="35" cy="33" r="4.5" fill="none" stroke="#2B1D10" stroke-width="1.8"/><path d="M29.5,33 h1" stroke="#2B1D10" stroke-width="1.8"/><path d="M26,41 q4,3 8,0" stroke="#5A3A20" stroke-width="2" fill="none"/>';
    else if (id === 'smith') o += '<path d="M10,60 q20,-16 40,0z" fill="#5A4A6E"/><path d="M26,49 l4,3 l4,-3 l-4,-2z" fill="#C23B30"/>' + skin + '<path d="M23,40 q7,-4 14,0 q-7,3 -14,0z" fill="#6B4A2E"/><path d="M17,23 q13,-20 26,0z" fill="#2E2A30"/><path d="M12,24 h36" stroke="#2E2A30" stroke-width="4" stroke-linecap="round"/>';
    else o += '<path d="M10,60 q20,-16 40,0z" fill="#8A6A3A"/><path d="M18,60 v-8 h24 v8" fill="#5E4A36"/>' + skin + '<path d="M15,30 q-2,-10 6,-12 M45,30 q2,-10 -6,-12" stroke="#C9C9C9" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="35" cy="33" r="5" fill="#CFE8F5" stroke="#2E2A30" stroke-width="2.5"/><path d="M26,41 q4,2 8,0" stroke="#5A3A20" stroke-width="2" fill="none"/>';
    return '<svg viewBox="0 0 60 60" width="' + size + '" height="' + size + '" aria-hidden="true">' + o + '</svg>';
  }
  // icons for the collection cards and the map
  function iconSvg(id, size) {
    var o = '';
    switch (id) {
      case 'horn': o = PZ.findSvg('guldhorn', 60).replace(/^<svg[^>]*>|<\/svg>$/g, ''); break;
      case 'sol': o = PZ.findSvg('solvognen', 60).replace(/^<svg[^>]*>|<\/svg>$/g, ''); break;
      case 'sten': o = PZ.findSvg('jelling', 60).replace(/^<svg[^>]*>|<\/svg>$/g, ''); break;
      case 'pige': o = PZ.findSvg('egtved', 60).replace(/^<svg[^>]*>|<\/svg>$/g, ''); break;
      case 'by': o = '<path d="M6,50 v-20 l10,-10 l10,10 v20z M26,50 v-28 l8,-12 l8,12 v28z M42,50 v-16 l7,-8 l7,8 v16z" fill="#C98B4A" stroke="#5A3A12" stroke-width="2"/><path d="M34,10 v-6" stroke="#5A3A12" stroke-width="2"/><rect x="13" y="38" width="6" height="12" fill="#5A3A12"/>'; break;
      case 'taarn': o = '<path d="M18,54 v-40 q12,-6 24,0 v40z" fill="#B5583A" stroke="#5A2A18" stroke-width="2.5"/><rect x="24" y="6" width="12" height="8" fill="#7A8890" stroke="#3A3E44" stroke-width="2"/><rect x="26" y="22" width="5" height="8" fill="#3A1E10"/><rect x="30" y="36" width="5" height="8" fill="#3A1E10"/>'; break;
      case 'skade': o = '<path d="M10,36 q8,-16 26,-12 l14,-6 l-6,8 q4,8 -4,14 l-24,4z" fill="#1E1E24"/><path d="M22,32 q8,-6 16,0 q-8,6 -16,0z" fill="#F3F3F3"/><path d="M14,40 l-10,12" stroke="#1E1E24" stroke-width="4" stroke-linecap="round"/><circle cx="42" cy="22" r="1.6" fill="#FFF"/>'; break;
      case 'noegle': o = '<circle cx="18" cy="30" r="10" fill="none" stroke="#C9A03B" stroke-width="5"/><path d="M28,30 h26 M46,30 v8 M52,30 v6" stroke="#C9A03B" stroke-width="5" stroke-linecap="round"/>'; break;
      case 'rune': o = '<rect x="8" y="6" width="44" height="48" rx="8" fill="#CFC6B4" stroke="#555048" stroke-width="2.5"/>' + ['k', 'a', 't'].map(function (k, i) { return '<path d="' + PZ.rune(k).d + '" transform="translate(' + (12 + i * 13) + ',14) scale(.6)" fill="none" stroke="#8C2F25" stroke-width="4" stroke-linecap="round"/>'; }).join(''); break;
      case 'lov': o = '<rect x="12" y="8" width="36" height="46" rx="3" fill="#E8D9B6" stroke="#5B4A33" stroke-width="2.5"/><path d="M18,18 h24 M18,26 h24 M18,34 h18" stroke="#7A5A3E" stroke-width="2"/><circle cx="38" cy="46" r="7" fill="#B03A2E"/>'; break;
      case 'krone': o = '<path d="M8,44 l4,-26 l10,12 l8,-18 l8,18 l10,-12 l4,26z" fill="#E2B33C" stroke="#7A5A10" stroke-width="2.5"/><rect x="8" y="44" width="44" height="8" fill="#C9A03B" stroke="#7A5A10" stroke-width="2"/><circle cx="30" cy="34" r="3" fill="#C23B30"/>'; break;
      case 'ur': o = PZ.clockSvg(21 * 60 + 40, 60, '').replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/^/, '<g transform="scale(.5)">') + '</g>'; break;
      case 'skib': o = '<path d="M4,36 q26,14 52,0 l-4,10 q-22,8 -44,0z" fill="#8A5A2E" stroke="#3A200D" stroke-width="2"/><path d="M30,38 v-30" stroke="#3A200D" stroke-width="2.5"/><path d="M18,12 h24 v18 h-24z" fill="#F3E9D2" stroke="#3A200D" stroke-width="2"/><path d="M18,18 h24 M18,24 h24" stroke="#C23B30" stroke-width="3"/>'; break;
      case 'vaegt': o = '<path d="M30,8 v42 M14,50 h32 M8,16 h44" stroke="#5A3A12" stroke-width="3.5" stroke-linecap="round"/><path d="M8,16 l-6,16 h12z M52,16 l-6,16 h12z" fill="#C9A03B" stroke="#6B4A1E" stroke-width="2"/>'; break;
    }
    return '<svg viewBox="0 0 60 60" width="' + size + '" height="' + size + '" aria-hidden="true">' + o + '</svg>';
  }
  var ROOM_ICON = { hallen: 'ur', oldtiden: 'sol', vikingetiden: 'skib', middelalderen: 'vaegt', renaessancen: 'taarn', loftet: 'skade' };
  var LOCK_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor"/><path d="M8,10 V7 a4,4 0 0 1 8,0 v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
  var LOOK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M14.5,14.5 L20,20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  var TICK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5,12 l4,4 l10,-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var BOOK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 8h8M8 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ---------- lifecycle ---------- */
  function mount(container) { app = container; clock = setInterval(function () { if (st && !document.hidden) Core.addTime(ID, 1); }, 1000); showMap(); }
  function unmount() { clearAll(); clearInterval(clock); dropKeys(); Core.stopSpeaking(); st = null; el = {}; Core.save(); }
  function dropKeys() { if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; } }
  function closeOverlays() { [].forEach.call(document.querySelectorAll('.mu-overlay'), function (o) { o.remove(); }); }
  function overlay(cls, label, children) {
    var o = h('div', { class: 'rs-overlay mu-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, h('div', { class: 'card rs-dialog ' + cls }, children));
    app.appendChild(o);
    return o;
  }

  /* ================= MAP: the museum plan ================= */
  function showMap() {
    clearAll(); dropKeys(); closeOverlays(); Core.stopSpeaking(); st = null; el = {};
    var d = data(), band = d.band, nextIdx = -1, col = collection(d);
    for (var i = 0; i < ROOMS.length; i++) if (isOpen(d, band, i) && !bestOf(d, band, ROOMS[i].id)) { nextIdx = i; break; }
    function bandBtn(code, label) {
      return h('button', { type: 'button', class: 'seg' + (band === code ? ' sel' : ''), 'aria-pressed': band === code ? 'true' : 'false',
        onclick: function () { if (d.band !== code) { d.band = code; Core.save(); Core.play('click'); showMap(); } } }, label);
    }
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen mu-map' }, [
      h('header', { class: 'topbar' }, [h('a', { class: 'btn ghost', href: '#/hjem' }, '← ' + SC.back),
        h('div', { class: 'mu-topbtns' }, [h('button', { type: 'button', class: 'btn secondary mu-nbbtn', onclick: function () { Core.play('click'); showNotebook(); } }, S.notebook),
          h('button', { type: 'button', class: 'btn secondary mu-colbtn', onclick: function () { Core.play('click'); showCollection(); } }, S.collection + ' (' + col.n + ')')])]),
      h('div', { class: 'rs-title' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'hello', outfit: OUTFIT, size: 160 }) }), h('div', {}, [h('h1', {}, S.title), h('p', { class: 'lead' }, S.tagline)])]),
      h('section', { class: 'card mu-storycard' }, [h('div', { class: 'mu-story-faces', 'aria-hidden': 'true' }, STORY.suspects.map(function (s) { return h('span', { html: faceSvg(s.id, 46) }); })),
        h('div', {}, [h('p', {}, STORY.intro[2]), h('button', { type: 'button', class: 'btn mu-storybtn', onclick: function () { Core.play('click'); showStory(false); } }, S.storyBtn)])]),
      h('div', { class: 'rs-controls' }, [h('div', { class: 'segmented', role: 'group', 'aria-label': SC.band }, [bandBtn('M', SC.bandM + ' · ' + SC.bandMAge), bandBtn('U', SC.bandU + ' · ' + SC.bandUAge)])]),
      h('h2', {}, S.chooseRoom), h('p', { class: 'muted mu-plannote' }, S.planNote),
      h('div', { class: 'rs-worlds mu-rooms' }, ROOMS.map(function (r, i) {
        var open = isOpen(d, band, i), best = bestOf(d, band, r.id);
        return h('button', { type: 'button', class: 'rs-world mu-room r-' + r.id + (best ? ' lit' : '') + (i === nextIdx ? ' next' : '') + (open ? '' : ' locked'), 'data-room': r.id, disabled: !open,
          'aria-label': r.name + ', ' + r.era + (open ? '' : ', ' + S.locked), onclick: function () { Core.play('click'); startRoom(r.id); } }, [
          h('span', { class: 'rs-world-no', 'aria-hidden': 'true' }, String(i + 1)), i === nextIdx ? h('span', { class: 'rs-tag' }, S.next) : null,
          h('strong', {}, r.name), h('span', { class: 'mu-era' }, r.era), h('span', { class: 'rs-world-desc' }, open ? r.desc[band] : S.lockedNote),
          h('span', { class: 'rs-world-foot' }, [open ? h('span', { html: Core.starIcons(best, 3) }) : h('span', { class: 'mu-lockchip' }, [h('span', { html: LOCK_SVG }), S.locked]), h('span', { class: 'mu-roomicon', html: iconSvg(ROOM_ICON[r.id], 44) })])
        ]);
      }))
    ]));
    if (!d.introSeen) { d.introSeen = 1; Core.save(); showStory(true); }
  }
  function showStory(first) {
    var o = overlay('mu-storydlg', S.storyTitle, [
      h('div', { class: 'bob', html: Bob.svg({ expression: 'surprised', outfit: OUTFIT, size: 120 }) }),
      h('h2', {}, S.storyTitle),
      h('div', { class: 'mu-storytext' }, STORY.intro.map(function (p) { return h('p', {}, p); })),
      h('h3', {}, S.suspectsTitle),
      h('div', { class: 'mu-suspects mini' }, STORY.suspects.map(function (s) { return h('div', { class: 'mu-suspect static' }, [h('span', { class: 'mu-face', html: faceSvg(s.id, 52) }), h('strong', {}, s.name), h('span', { class: 'mu-role' }, s.role)]); })),
      h('div', { class: 'row center' }, h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, first ? S.start : S.close))
    ]);
    o.querySelector('.btn.primary').focus();
  }

  /* ================= PLAY ================= */
  function startRoom(id) {
    var d = data(), band = d.band, n = nb(d, band), r = roomById(id);
    var pz = PZ.make(id, band, Math.random, { T: n.vars.Tmin });
    st = { room: id, band: band, pz: pz, si: 0, wrong: 0, hinted: false, lvl: 0, shown: false, solved: false, open: false, input: {}, stars: 0 };
    shell(r);
    drawScene();
    setBob('hello', pick(S.bobStart));
    el.intro.textContent = r.intro[band];
    drawPocket(); drawLockPrompt(); drawTools();
  }
  function shell(r) {
    clearAll(); dropKeys(); closeOverlays(); Core.stopSpeaking();
    app.innerHTML = ''; el = {};
    var hud = h('header', { class: 'rs-hud' }, [
      h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': SC.back, title: SC.back, html: '<svg viewBox="0 0 24 24"><path d="M7 12h12M7 12l5-5M7 12l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', onclick: askLeave }),
      h('div', { class: 'rs-hud-title' }, [h('strong', {}, r.name), h('span', { class: 'rs-wave' }, t(S.roomNo, { n: roomIdx(r.id) + 1 }) + ' · ' + r.era)]),
      h('button', { type: 'button', class: 'rs-iconbtn mu-nbicon', 'aria-label': S.notebook, title: S.notebook, html: BOOK_SVG, onclick: function () { Core.play('click'); showNotebook(); } }),
      Core.canSpeak() ? h('button', { type: 'button', class: 'rs-iconbtn', 'aria-label': S.readAloud, title: S.readAloud, html: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        onclick: function () { Core.speak([el.say && el.say.textContent, el.qtext && el.qtext.textContent].filter(Boolean).join(' ')); } }) : h('span', { class: 'rs-iconbtn-space' })
    ]);
    el.bob = h('div', { class: 'mu-bobface' }); el.say = h('p', { class: 'mu-say', role: 'status', 'aria-live': 'polite' });
    el.intro = h('p', { class: 'mu-intro' });
    el.stage = h('div', { class: 'mu-stage' }); el.chips = h('div', { class: 'mu-chips', role: 'group', 'aria-label': S.spotsLabel });
    el.pocket = h('div', { class: 'mu-pocket' }); el.note = h('div', { class: 'mu-note', 'aria-live': 'polite' });
    el.panel = h('section', { class: 'mu-panel' }); el.tools = h('div', { class: 'mu-tools' }); el.explain = h('div', { class: 'mu-explain', 'aria-live': 'polite' });
    app.appendChild(h('main', { class: 'mu-play r-' + r.id }, [hud, h('div', { class: 'mu-inner' }, [h('div', { class: 'mu-bobline' }, [el.bob, el.say]), el.intro, el.stage, el.chips, el.pocket, el.note, el.panel, el.tools, el.explain])]));
  }
  function setBob(expr, text) {
    if (!el.bob) return;
    el.bob.innerHTML = Bob.svg({ expression: expr, outfit: OUTFIT, size: 120, crop: 'head' });
    el.bob.classList.remove('react'); void el.bob.offsetWidth; el.bob.classList.add('react');
    if (text !== undefined && text !== null) el.say.textContent = text;
  }
  function spotsOf(room, band) { return STORY.spots[room].filter(function (s) { return forBand(s, band); }); }
  function drawScene() {
    var d = data(), n = nb(d, st.band), r = roomById(st.room);
    el.stage.innerHTML = sceneSvg(st.room, st.band, st.pz, t(S.sceneLabel, { room: r.name }));
    if (st.solved) el.stage.classList.add('mu-open');
    el.chips.innerHTML = '';
    el.chips.appendChild(h('span', { class: 'mu-chips-label' }, S.spotsLabel));
    spotsOf(st.room, st.band).forEach(function (s) {
      var seen = !!n.seen[st.room + ':' + s.id];
      var btn = h('button', { type: 'button', class: 'mu-spot' + (seen ? ' seen' : '') + (s.lock ? ' lock' : ''), 'data-spot': s.id, 'aria-label': s.label + (s.lock ? ' (' + S.lockSpot + ')' : seen ? ' (' + S.seen + ')' : ''), title: s.label,
        style: 'left:' + s.x + '%;top:' + s.y + '%;width:' + s.w + '%;height:' + s.h + '%', onclick: function () { tapSpot(s); } },
        h('span', { class: 'mu-spot-badge', 'aria-hidden': 'true', html: s.lock ? LOCK_SVG : seen ? TICK_SVG : LOOK_SVG }));
      el.stage.appendChild(btn);
      el.chips.appendChild(h('button', { type: 'button', class: 'mu-chip' + (seen ? ' seen' : '') + (s.lock ? ' lock' : ''), 'data-spot': s.id, onclick: function () { tapSpot(s); } },
        [h('span', { class: 'mu-chip-ico', 'aria-hidden': 'true', html: s.lock ? LOCK_SVG : seen ? TICK_SVG : LOOK_SVG }), s.label]));
    });
  }
  function tapSpot(s) {
    if (!st) return;
    var d = data(), n = nb(d, st.band), key = st.room + ':' + s.id, fresh = !n.seen[key];
    n.seen[key] = 1;
    Core.play('click');
    setBob(s.lock ? 'thinking' : s.clue ? 'surprised' : 'happy', s.text);
    var notes = [];
    if (s.clue && addClue(s.clue)) notes.push([S.newClue, clueText(clueById(s.clue), n.vars)]);
    if (s.item && !n.items[s.item]) { n.items[s.item] = 1; notes.push([S.newItem, STORY.items[s.item]]); drawPocket(); }
    Core.save();
    if (notes.length) showNotes(notes);
    if (fresh) { // update the markers without redrawing the picture
      [].forEach.call(app.querySelectorAll('[data-spot="' + s.id + '"]'), function (b) { b.classList.add('seen'); var ic = b.querySelector('.mu-spot-badge, .mu-chip-ico'); if (ic && !s.lock) ic.innerHTML = TICK_SVG; });
    }
    if (s.lock) openPuzzle(true);
  }
  function clueById(id) { return STORY.clues.filter(function (c) { return c.id === id; })[0]; }
  function addClue(id) {
    var d = data(), n = nb(d, st ? st.band : d.band);
    if (n.clues[id]) return false;
    n.clues[id] = 1; n.order.push(id); Core.save();
    return true;
  }
  function showNotes(list) {
    el.note.innerHTML = '';
    list.forEach(function (x) { el.note.appendChild(h('div', { class: 'mu-newclue' }, [h('strong', {}, x[0] + ': '), x[1]])); });
  }
  function drawPocket() {
    var n = nb(data(), st.band), keys = Object.keys(STORY.start).concat(Object.keys(STORY.items).filter(function (k) { return n.items[k] && !STORY.start[k]; }));
    el.pocket.innerHTML = '';
    el.pocket.appendChild(h('span', { class: 'mu-pocket-label' }, S.pocket));
    keys.forEach(function (k) { el.pocket.appendChild(h('span', { class: 'mu-item' }, STORY.items[k])); });
  }
  function drawLockPrompt() {
    if (st.open) return;
    el.panel.innerHTML = '';
    el.panel.appendChild(h('button', { type: 'button', class: 'btn primary mu-openlock', onclick: function () { openPuzzle(true); } }, [h('span', { html: LOCK_SVG, 'aria-hidden': 'true' }), ' ' + S.openLock]));
  }
  function openPuzzle(scroll) {
    if (!st || st.solved) return;
    if (!st.open) { st.open = true; setBob('thinking', S.bobLock); renderStep(); drawTools(); }
    if (scroll && el.panel.scrollIntoView) later(function () { if (el.panel && el.panel.isConnected) el.panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  }
  function cur() { return st.pz.steps[st.si]; }

  /* ---------- the steps ---------- */
  function renderStep() {
    var step = cur(), multi = st.pz.steps.length > 1;
    dropKeys();
    el.panel.innerHTML = '';
    if (st.room === 'renaessancen') el.panel.appendChild(letterNode());
    if (multi) el.panel.appendChild(h('p', { class: 'mu-stepno' }, t(S.stepOf, { n: st.si + 1, total: st.pz.steps.length })));
    el.qtext = h('p', { class: 'mu-q' }, step.q);
    el.panel.appendChild(el.qtext);
    if (step.kind === 'code') codeView(step);
    else if (step.kind === 'timeline') timelineView(step);
    else if (step.kind === 'runes') runesView(step);
    else if (step.kind === 'strike') strikeView(step);
    else if (step.kind === 'scale') scaleView(step);
    else mcView(step);
  }
  function letterNode() {
    var txt = st.pz.letter;
    return h('div', { class: 'mu-letter', lang: 'en' }, [
      h('div', { class: 'mu-letter-text' }, txt.split('\n').map(function (line) { return h('p', {}, line); })),
      Core.canSpeak('en') ? h('button', { type: 'button', class: 'btn ghost mu-speak-en', lang: 'da', onclick: function () { Core.speak(txt.replace(/\n/g, ' '), 'en'); } }, S.readEnglish) : null
    ]);
  }
  function right(msg) {
    var step = cur();
    Core.play('correct');
    el.explain.innerHTML = '';
    if (st.si < st.pz.steps.length - 1) {
      setBob('happy', msg || pick(S.bobRight));
      el.explain.appendChild(h('div', { class: 'oj-rule mu-stepdone' }, h('p', {}, step.explain)));
      st.si++; st.lvl = 0;
      renderStep(); drawTools();
      return;
    }
    solved();
  }
  function wrong(msg) {
    st.wrong++;
    Core.play('wrong');
    setBob(st.wrong >= 3 ? 'encouraging' : 'thinking', (msg || pick(S.bobWrong)) + (st.wrong === 3 ? ' ' + S.bobWrong3 : ''));
    drawTools();
  }
  function shake(node) { if (!node) return; node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }

  // the code lock: fields filled from a keypad
  function codeView(step) {
    var inp = st.input; inp.fields = inp.fields || step.fields.map(function () { return ''; }); inp.f = inp.f || 0;
    var info = h('div', { class: 'mu-codeinfo' }, [
      h('div', { class: 'mu-clockbox', html: PZ.clockSvg(step.T, 150, S.clockLabel) }),
      h('div', { class: 'mu-codefacts' }, [h('p', { class: 'mu-rule' }, step.rule), h('p', { class: 'mu-chipline' }, [h('span', { class: 'mu-tag' }, S.closedSign), st.band === 'U' ? h('span', { class: 'mu-tag' }, S.guestSign) : null]),
        step.signs ? h('div', { class: 'mu-signs' }, [h('strong', {}, S.signsHead), h('ul', {}, step.signs.map(function (s) { return h('li', {}, [h('b', {}, String(s.year)), ' – ' + s.text]); }))]) : null])
    ]);
    var fields = h('div', { class: 'mu-fields', role: 'group', 'aria-label': S.codeFields });
    function drawFields() {
      fields.innerHTML = '';
      step.fields.forEach(function (f, i) {
        fields.appendChild(h('button', { type: 'button', class: 'mu-field' + (i === inp.f ? ' sel' : ''), 'data-f': i, 'aria-label': t(S.fieldLabel, { label: f.label, value: inp.fields[i] || '–' }), onclick: function () { inp.f = i; drawFields(); } },
          [h('span', { class: 'mu-field-label' }, f.label), h('span', { class: 'mu-field-val' }, inp.fields[i] || ' ')]));
      });
    }
    function key(dg) {
      if (st.solved) return;
      var f = step.fields[inp.f];
      if (inp.fields[inp.f].length >= f.max) { if (inp.f < step.fields.length - 1) inp.f++; else return; }
      inp.fields[inp.f] += dg; Core.play('click');
      if (inp.fields[inp.f].length >= step.fields[inp.f].max && inp.f < step.fields.length - 1) inp.f++;
      drawFields();
    }
    function del() { if (st.solved) return; if (!inp.fields[inp.f] && inp.f > 0) inp.f--; inp.fields[inp.f] = inp.fields[inp.f].slice(0, -1); Core.play('click'); drawFields(); }
    function tryIt() {
      if (st.solved) return;
      if (inp.fields.some(function (x) { return x === ''; })) { setBob('thinking', S.emptyField); return; }
      if (PZ.check(step, inp.fields)) { right(); return; }
      var firstOk = Number(inp.fields[0]) === step.answer[0] && Number(inp.fields[1]) === step.answer[1];
      shake(fields); wrong(st.band === 'U' && firstOk ? S.wrongCodePart : S.wrongCode);
    }
    var pad = h('div', { class: 'mu-keypad' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (k) { return h('button', { type: 'button', class: 'mu-key', 'data-key': k, onclick: function () { key(k); } }, k); })
      .concat([h('button', { type: 'button', class: 'mu-key mu-key-del', 'data-key': 'del', onclick: del }, S.del), h('button', { type: 'button', class: 'mu-key', 'data-key': '0', onclick: function () { key('0'); } }, '0'),
        h('button', { type: 'button', class: 'mu-key mu-key-ok', 'data-key': 'ok', onclick: tryIt }, 'OK')]));
    el.panel.appendChild(info);
    el.panel.appendChild(h('div', { class: 'mu-lock' }, [fields, pad, h('button', { type: 'button', class: 'btn primary mu-try', onclick: tryIt }, S.tryCode)]));
    drawFields();
    keyHandler = function (e) {
      if (!st || st.solved || document.querySelector('.rs-overlay') || !fields.isConnected) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); key(e.key); } else if (e.key === 'Backspace') { e.preventDefault(); del(); } else if (e.key === 'Enter' && e.target === document.body) { e.preventDefault(); tryIt(); }
    };
    document.addEventListener('keydown', keyHandler);
    el.fillCode = function (vals) { inp.fields = vals.map(String); drawFields(); };
  }

  // the timeline: tap the finds in order
  function timelineView(step) {
    var inp = st.input; inp.placed = inp.placed || [];
    var slotsBox = h('ol', { class: 'mu-slots' }), pool = h('div', { class: 'mu-pool' }), check = h('button', { type: 'button', class: 'btn primary mu-checkorder', onclick: tryIt }, S.checkOrder);
    if (step.showPeriod) el.panel.appendChild(h('div', { class: 'mu-periods', 'aria-label': S.periodsHead }, PZ.PERIODS.map(function (p) { return h('span', { class: 'mu-period p-' + p }, [h('strong', {}, STORY.periods[p].name), h('span', {}, STORY.periods[p].when)]); })));
    el.panel.appendChild(h('p', { class: 'muted mu-small' }, S.placeHint));
    el.panel.appendChild(h('div', { class: 'mu-tl-ends', 'aria-hidden': 'true' }, [h('span', {}, '← ' + S.oldest), h('span', {}, S.newest + ' →')]));
    el.panel.appendChild(slotsBox); el.panel.appendChild(pool); el.panel.appendChild(h('div', { class: 'row center' }, check));
    function card(id, placed, idx) {
      var f = STORY.finds[id], fd = PZ.find(id);
      return h('button', { type: 'button', class: 'mu-find' + (placed ? ' placed' : ''), 'data-find': id, 'aria-label': f.name + (step.showYear ? ', ' + f.when : ', ' + STORY.periods[fd.period].name) + (placed ? ', ' + t(S.slot, { n: idx + 1 }) : ''),
        onclick: function () { if (st.solved) return; Core.play('click'); if (placed) inp.placed.splice(idx, 1); else inp.placed.push(id); draw(); } }, [
        h('span', { class: 'mu-find-pic', html: PZ.findSvg(id, 52) }),
        h('span', { class: 'mu-find-txt' }, [h('strong', {}, f.name), h('span', { class: 'mu-find-what' }, f.what), step.showYear ? h('span', { class: 'mu-when' }, f.when) : h('span', { class: 'mu-when p-' + fd.period }, STORY.periods[fd.period].name)])
      ]);
    }
    function draw() {
      slotsBox.innerHTML = ''; pool.innerHTML = '';
      step.items.forEach(function (x, i) {
        slotsBox.appendChild(h('li', { class: 'mu-slot' + (inp.placed[i] ? ' full' : '') }, [h('span', { class: 'mu-slot-no' }, String(i + 1)), inp.placed[i] ? card(inp.placed[i], true, i) : h('span', { class: 'mu-slot-empty' }, t(S.emptySlot, { n: i + 1 }))]));
      });
      step.items.forEach(function (id) { if (inp.placed.indexOf(id) < 0) pool.appendChild(card(id, false)); });
      check.disabled = inp.placed.length < step.items.length;
    }
    function tryIt() {
      if (st.solved || inp.placed.length < step.items.length) return;
      if (PZ.check(step, inp.placed)) { right(); return; }
      var ok = inp.placed.filter(function (id, i) { return step.answer[i] === id; }).length;
      shake(slotsBox); wrong(t(S.wrongOrder, { n: ok, total: step.items.length }));
    }
    draw();
    el.fillTimeline = function (ids) { inp.placed = ids.slice(); draw(); };
  }

  // runes (Mellemtrin): write the word with the letter keys
  function runeKey(band) {
    return h('div', { class: 'mu-runekey' }, [h('strong', { class: 'mu-runekey-title' }, S.keyTitle + (band === 'U' ? ' – ' + S.keyNoteU : '')),
      h('div', { class: 'mu-runegrid' }, PZ.RUNES.map(function (r) { return h('span', { class: 'mu-runecell' }, [h('span', { html: PZ.runeIcon(r.k, 34) }), h('b', {}, PZ.runeLabel(r.k, band).toUpperCase())]); }))]);
  }
  function runeBand(runes) { return h('div', { class: 'mu-runeband', html: PZ.runesSvg(runes, { h: 70, label: S.keyTitle }) }); }
  function runesView(step) {
    var inp = st.input; inp.word = inp.word || '';
    el.panel.appendChild(runeBand(step.runes));
    el.panel.appendChild(runeKey('M'));
    var boxes = h('div', { class: 'mu-letters', 'aria-label': S.typeWord });
    function draw() { boxes.innerHTML = ''; for (var i = 0; i < step.word.length; i++) boxes.appendChild(h('span', { class: 'mu-letterbox' + (i === inp.word.length ? ' sel' : ''), 'aria-label': t(S.letterBox, { n: i + 1 }) }, inp.word[i] || ' ')); }
    function key(c) { if (st.solved || inp.word.length >= step.word.length) return; inp.word += c; Core.play('click'); draw(); }
    function del() { if (st.solved) return; inp.word = inp.word.slice(0, -1); Core.play('click'); draw(); }
    function tryIt() { if (st.solved) return; if (inp.word.length < step.word.length) { setBob('thinking', S.emptyField); return; } if (PZ.check(step, inp.word)) right(); else { shake(boxes); wrong(S.wrongWord); } }
    el.panel.appendChild(h('p', { class: 'mu-typeword' }, S.typeWord));
    el.panel.appendChild(boxes);
    el.panel.appendChild(h('div', { class: 'mu-abc' }, step.letters.map(function (c) { return h('button', { type: 'button', class: 'mu-key mu-abc-key', 'data-letter': c, onclick: function () { key(c); } }, c); })
      .concat([h('button', { type: 'button', class: 'mu-key mu-key-del', onclick: del }, S.del)])));
    el.panel.appendChild(h('div', { class: 'row center' }, h('button', { type: 'button', class: 'btn primary mu-checkword', onclick: tryIt }, S.checkWord)));
    draw();
    keyHandler = function (e) {
      if (!st || st.solved || document.querySelector('.rs-overlay') || !boxes.isConnected) return;
      var c = (e.key || '').toUpperCase();
      if (step.letters.indexOf(c) >= 0) { e.preventDefault(); key(c); } else if (e.key === 'Backspace') { e.preventDefault(); del(); }
    };
    document.addEventListener('keydown', keyHandler);
    el.fillWord = function (w) { inp.word = w; draw(); };
  }

  // choose one answer (also: the rune sentence in Udskoling, the letter and the attic)
  function mcView(step) {
    if (step.runes) { el.panel.appendChild(runeBand(step.runes)); el.panel.appendChild(runeKey('U')); }
    var box = h('div', { class: 'oj-options col mu-opts' });
    step.options.forEach(function (o, i) {
      var b = h('button', { type: 'button', class: 'oj-opt wide mu-opt', 'data-i': i, onclick: function () {
        if (st.solved || b.disabled) return;
        if (o === step.answer) { b.classList.add('right'); [].forEach.call(box.children, function (x) { x.disabled = true; }); right(); }
        else { b.classList.add('wrong'); b.disabled = true; shake(b); wrong(); }
      } }, o);
      box.appendChild(b);
    });
    el.panel.appendChild(box);
    el.fillMc = function () { [].forEach.call(box.children, function (x, i) { x.disabled = true; if (step.options[i] === step.answer) x.classList.add('right'); }); };
  }

  // the scale: pick a weight, and the scale tips (or balances)
  function scaleView(step) {
    var pic = h('div', { class: 'mu-scalebox', html: PZ.scaleSvg(step, null, { label: step.q }) });
    if (step.eq) el.panel.appendChild(h('p', { class: 'mu-eq' }, step.eq));
    el.panel.appendChild(pic);
    el.panel.appendChild(h('p', { class: 'mu-scalewords' }, PZ.scaleText(step)));
    var box = h('div', { class: 'oj-options mu-weights', role: 'group', 'aria-label': S.chooseWeight });
    step.options.forEach(function (o, i) {
      var b = h('button', { type: 'button', class: 'oj-opt mu-weight', 'data-i': i, onclick: function () {
        if (st.solved || b.disabled) return;
        var v = step.values[i], sides = PZ.scaleSides(step, v);
        pic.innerHTML = PZ.scaleSvg(step, v, { label: step.q });
        if (o === step.answer) { b.classList.add('right'); [].forEach.call(box.children, function (x) { x.disabled = true; }); right(); return; }
        b.classList.add('wrong'); b.disabled = true;
        var msg = step.mode === 'add' ? (sides[0] > sides[1] ? S.heavyLeft : S.heavyRight) : t(S.wrongSacks, { v: PZ.kg(v), l: PZ.kg(sides[0]), r: PZ.kg(sides[1]) });
        wrong(msg);
      } }, o);
      box.appendChild(b);
    });
    el.panel.appendChild(box);
    el.fillMc = function () { var i = step.options.indexOf(step.answer); pic.innerHTML = PZ.scaleSvg(step, step.values[i], { label: step.q }); [].forEach.call(box.children, function (x, k) { x.disabled = true; if (k === i) x.classList.add('right'); }); };
  }

  // strike the suspects with an alibi (shares the notebook's crossed-out list)
  function suspectCard(s, n, onToggle) {
    var on = !!n.struck[s.id];
    return h('button', { type: 'button', class: 'mu-suspect' + (on ? ' struck' : ''), 'data-suspect': s.id, 'aria-pressed': on ? 'true' : 'false', 'aria-label': t(on ? S.nbStruck : S.nbOpen, { name: s.name + ', ' + s.role }),
      onclick: function () { if (n.struck[s.id]) delete n.struck[s.id]; else n.struck[s.id] = 1; Core.save(); Core.play('click'); onToggle(); } }, [
      h('span', { class: 'mu-face', html: faceSvg(s.id, 56) }), h('strong', {}, s.name), h('span', { class: 'mu-role' }, s.role), h('span', { class: 'mu-stamp', 'aria-hidden': 'true' }, S.struck)
    ]);
  }
  function strikeView(step) {
    var d = data(), n = nb(d, st.band), grid = h('div', { class: 'mu-suspects' });
    function draw() { grid.innerHTML = ''; STORY.suspects.forEach(function (s) { grid.appendChild(suspectCard(s, n, draw)); }); }
    el.panel.appendChild(h('p', { class: 'muted mu-small' }, S.strikeHelp));
    el.panel.appendChild(grid);
    if (step.help) {
      el.panel.appendChild(h('div', { class: 'mu-cluehelp' }, [h('strong', {}, S.helpClues), h('ul', {}, STORY.clues.filter(function (c) { return c.clears && forBand(c, st.band); }).map(function (c) { return h('li', {}, clueText(c, n.vars)); }))]));
    }
    el.panel.appendChild(h('div', { class: 'row center' }, h('button', { type: 'button', class: 'btn primary mu-checkstrike', onclick: function () {
      if (st.solved) return;
      var got = Object.keys(n.struck).filter(function (k) { return n.struck[k]; });
      if (!got.length) { setBob('thinking', S.strikeNone); return; }
      if (PZ.check(step, got)) right(); else { shake(grid); wrong(S.strikeWrong); }
    } }, S.checkStrike)));
    draw();
    el.syncStrike = draw;
    el.fillStrike = function () { n.struck = {}; step.answer.forEach(function (k) { n.struck[k] = 1; }); Core.save(); draw(); };
  }

  /* ---------- help: Tip and Vis løsningen ---------- */
  function drawTools() {
    if (!el.tools || !st) return;
    el.tools.innerHTML = '';
    if (st.solved || !st.open) return;
    var step = cur(), more = st.lvl < step.hints.length;
    el.tools.appendChild(h('div', { class: 'mu-toolrow' }, [
      h('button', { type: 'button', class: 'btn mu-tip', disabled: !more, onclick: tip }, more ? S.tip : S.noMoreTips),
      h('button', { type: 'button', class: 'btn mu-solve' + (st.wrong >= 3 ? ' secondary' : ''), disabled: st.wrong < 3, onclick: showSolution }, S.showSolution)
    ]));
    el.tools.appendChild(h('p', { class: 'mu-helpnote' }, [st.wrong ? h('b', {}, t(S.wrongCount, { n: st.wrong }) + ' · ') : null, S.helpNote]));
  }
  function tip() {
    var step = cur(); if (!st || st.solved || st.lvl >= step.hints.length) return;
    st.hinted = true;
    var text = step.hints[st.lvl++];
    Core.play('click');
    setBob('encouraging', S.bobTip);
    el.explain.innerHTML = '';
    el.explain.appendChild(h('div', { class: 'oj-rule mu-tipbox' }, [h('p', { class: 'mu-head' }, t(S.tipHead, { n: st.lvl })), h('p', {}, text)]));
    drawTools();
    var tb = el.explain.querySelector('.mu-tipbox'); if (tb && tb.scrollIntoView) later(function () { if (tb.isConnected) tb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
  }
  function showSolution() {
    if (!st || st.solved || st.wrong < 3) return;
    st.shown = true;
    var rest = st.pz.steps.slice(st.si), step = cur();
    if (step.kind === 'code' && el.fillCode) el.fillCode(step.answer);
    else if (step.kind === 'timeline' && el.fillTimeline) el.fillTimeline(step.answer);
    else if (step.kind === 'runes' && el.fillWord) el.fillWord(step.answer);
    else if (step.kind === 'strike' && el.fillStrike) el.fillStrike();
    else if (el.fillMc) el.fillMc();
    if (st.room === 'loftet') { var n = nb(data(), st.band); n.struck = {}; st.pz.steps.filter(function (s) { return s.kind === 'strike'; }).forEach(function (s) { s.answer.forEach(function (k) { n.struck[k] = 1; }); }); Core.save(); }
    el.explain.innerHTML = '';
    el.explain.appendChild(h('div', { class: 'oj-rule final mu-solution' }, [h('p', { class: 'mu-head' }, S.solutionHead)].concat(rest.map(function (s) { return h('p', {}, s.explain); }))));
    setBob('thinking', S.bobShown);
    solved();
  }

  /* ---------- the room is solved ---------- */
  function solved() {
    if (!st || st.solved) return;
    st.solved = true; dropKeys();
    st.stars = st.shown ? 1 : st.hinted ? 2 : 3;
    if (!st.shown && st.wrong >= 3) Core.visit('staedig');
    Core.play('win');
    var d = data(), n = nb(d, st.band), notes = [];
    // remember the story's variable parts for the notebook
    if (st.room === 'hallen') { n.vars.T = st.pz.vars.T; n.vars.Tmin = st.pz.steps[0].T; }
    if (st.room === 'renaessancen') { n.vars.instr = st.pz.vars.instr; n.vars.place = st.pz.vars.place; n.vars.start = st.pz.vars.start; n.vars.end = st.pz.vars.end; }
    if (!n.vars.T) { n.vars.Tmin = PZ.clockTime(st.band, Math.random); n.vars.T = PZ.hm(n.vars.Tmin); }
    STORY.clues.forEach(function (c) { if (c.room === st.room && forBand(c, st.band) && addClue(c.id)) notes.push([S.newClue, clueText(c, n.vars)]); });
    if (st.room === 'vikingetiden' && !n.items.noegle) { n.items.noegle = 1; notes.push([S.newItem, STORY.items.noegle]); drawPocket(); }
    Core.save();
    el.stage.classList.add('mu-open');
    el.tools.innerHTML = '';
    if (!st.shown) setBob('cheering', t(STORY.opened[st.room], { where: st.pz.where || '' }));
    var r = roomById(st.room), last = st.room === 'loftet';
    var box = h('div', { class: 'oj-rule mu-lesson' }, [
      st.shown ? null : h('div', { class: 'mu-solved-stars', html: Core.starIcons(st.stars, 3) }),
      st.shown ? null : h('p', {}, h('strong', {}, cur().explain)),
      h('p', { class: 'mu-head' }, S.lessonHead), h('p', {}, S.lesson[r.id][st.band]),
      notes.length ? h('div', { class: 'mu-lessonnotes' }, notes.map(function (x) { return h('p', { class: 'mu-newclue' }, [h('strong', {}, x[0] + ': '), x[1]]); })) : null,
      h('button', { type: 'button', class: 'btn primary mu-continue', onclick: last ? showEnding : finish }, last ? S.endingGo : S.continue)
    ]);
    if (st.shown) el.explain.appendChild(box); else { el.explain.innerHTML = ''; el.explain.appendChild(box); }
    later(function () { var b = el.explain && el.explain.querySelector('.mu-continue'); if (b) { b.focus({ preventScroll: true }); if (b.scrollIntoView) b.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 80);
  }
  function showEnding() {
    if (!st) return;
    clearAll(); dropKeys(); closeOverlays(); Core.stopSpeaking();
    var n = nb(data(), st.band), vars = { T: n.vars.T || '21.40' };
    app.innerHTML = ''; el = {};
    app.appendChild(h('main', { class: 'screen mu-ending' }, [
      h('div', { class: 'mu-ending-head' }, [h('div', { class: 'bob', html: Bob.svg({ expression: 'cheering', outfit: OUTFIT, size: 150 }) }), h('div', { class: 'mu-ending-faces', 'aria-hidden': 'true' }, [h('span', { html: faceSvg('vagt', 70) }), h('span', { html: faceSvg('urmager', 70) }), h('span', { html: iconSvg('horn', 70) })]), h('h1', {}, S.endingTitle)]),
      h('section', { class: 'card mu-ending-story' }, STORY.ending.map(function (p) { return h('p', {}, t(p, vars)); })),
      h('section', { class: 'card mu-truestory' }, [h('h2', {}, S.trueTitle)].concat(STORY.trueStory.map(function (p) { return h('p', {}, p); }))),
      h('div', { class: 'row center' }, h('button', { type: 'button', class: 'btn primary mu-continue', onclick: finish }, S.continue))
    ]));
    window.scrollTo(0, 0);
    Core.play('level');
  }
  function finish() {
    if (!st) return;
    clearAll(); dropKeys();
    var d = data(), band = st.band, room = st.room, stars = st.stars, rs = d.rooms[band][room] || (d.rooms[band][room] = { stars: 0, best: 0, plays: 0 });
    var before = rs.plays ? rs.best : null, newBest = rs.plays > 0 && stars > rs.best;
    rs.stars = stars; rs.best = Math.max(rs.best || 0, stars); rs.plays = (rs.plays || 0) + 1;
    var newCard = !d.cards[band][room]; d.cards[band][room] = 1;
    Core.save();
    var badgeNode = Core.roundDone(ID, band + '-' + room, before, rs.best);
    var i = roomIdx(room), last = i === ROOMS.length - 1;
    var starBox = h('div', { class: 'rs-result-stars', html: Core.starIcons(0, 3, 'big') });
    var primary = last ? h('button', { type: 'button', class: 'btn primary', onclick: showCollection }, S.seeCollection)
      : h('button', { type: 'button', class: 'btn primary', onclick: function () { startRoom(ROOMS[i + 1].id); } }, S.nextRoom);
    var o = overlay('mu-result', S.resultTitle[stars], [
      h('div', { class: 'bob', html: Bob.svg({ expression: stars >= 2 ? 'cheering' : 'happy', outfit: OUTFIT, size: 120 }) }),
      h('h2', {}, S.resultTitle[stars]), starBox,
      newBest ? h('p', { class: 'rs-newbest' }, S.newBest) : null,
      h('p', { class: 'muted mu-small' }, S.starsRule),
      newCard ? h('p', { class: 'rs-newbest mu-newcard' }, S.newCard) : null,
      newCard ? cardNode(band, room, false) : null,
      badgeNode,
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.toMap), primary])
    ]);
    var se = starBox.querySelectorAll('.star');
    for (var k = 0; k < stars; k++) (function (k) { later(function () { se[k].classList.remove('off'); se[k].classList.add('on', 'pop'); Core.play('star'); }, 400 + k * 350); })(k);
    primary.focus();
    st = null;
  }
  function askLeave() {
    var o = overlay('mu-leave', S.leaveQ, [h('h2', {}, S.leaveQ), h('p', { class: 'muted' }, S.leaveNote),
      h('div', { class: 'row center' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, S.leave), h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.stay)])]);
    o.querySelector('.btn.primary').focus();
  }

  /* ================= NOTEBOOK ================= */
  function showNotebook() {
    var d = data(), band = st ? st.band : d.band, n = nb(d, band);
    var found = STORY.clues.filter(function (c) { return n.clues[c.id] && forBand(c, band); });
    var grid = h('div', { class: 'mu-suspects' });
    function draw() { grid.innerHTML = ''; STORY.suspects.forEach(function (s) { grid.appendChild(suspectCard(s, n, function () { draw(); if (el.syncStrike && el.panel && el.panel.isConnected) el.syncStrike(); })); }); }
    var o = overlay('mu-nb', S.nbTitle, [
      h('h2', {}, S.nbTitle + ' · ' + S.bandName[band]),
      h('h3', {}, S.nbClues),
      found.length ? h('ol', { class: 'mu-cluelist' }, found.map(function (c) { return h('li', { class: c.clears ? 'clears' : c.points ? 'points' : '' }, clueText(c, n.vars)); })) : h('p', { class: 'muted' }, S.nbNone),
      h('h3', {}, S.nbSuspects), h('p', { class: 'muted mu-small' }, S.nbHelp), grid,
      h('div', { class: 'row center' }, h('button', { type: 'button', class: 'btn primary', onclick: function () { o.remove(); } }, S.close))
    ]);
    draw();
    o.querySelector('.btn.primary').focus();
  }

  /* ================= MUSEETS SAMLING ================= */
  function cardNode(band, room, isNew) {
    var c = STORY.cards[band][room];
    return h('article', { class: 'mu-card' }, [
      h('div', { class: 'mu-card-head' }, [h('span', { class: 'mu-card-ico', html: iconSvg(c.icon, 60) }), h('div', {}, [isNew ? h('span', { class: 'mu-card-new' }, S.newCard) : null, h('h3', {}, c.title), h('span', { class: 'mu-card-era' }, c.era)])]),
      h('p', { class: 'mu-card-fact' }, c.fact),
      h('p', { class: 'mu-card-src' }, S.source + ': ' + [c.src, c.src2].filter(Boolean).map(host).join(', '))
    ]);
  }
  function showCollection() {
    clearAll(); dropKeys(); closeOverlays(); Core.stopSpeaking(); st = null; el = {};
    var d = data(), col = collection(d);
    app.innerHTML = '';
    app.appendChild(h('main', { class: 'screen mu-collection' }, [
      h('header', { class: 'topbar' }, [h('button', { type: 'button', class: 'btn ghost', onclick: showMap }, '← ' + S.toMap), h('h1', {}, S.colTitle)]),
      h('p', { class: 'lead' }, col.n ? t(S.colCount, col) : S.colEmpty), h('p', { class: 'muted' }, S.colIntro),
      [d.band].concat(BANDS.filter(function (b) { return b !== d.band; })).map(function (b) {
        return h('section', { class: 'mu-colband' }, [h('h2', {}, t(S.colBand, { band: S.bandName[b] })), h('div', { class: 'mu-cards' }, ROOMS.map(function (r) {
          if (d.cards[b][r.id]) return cardNode(b, r.id);
          return h('article', { class: 'mu-card locked' }, [h('div', { class: 'mu-card-head' }, [h('span', { class: 'mu-qmark', 'aria-hidden': 'true' }, '?'), h('div', {}, [h('h3', {}, r.name), h('span', { class: 'mu-card-era' }, r.era)])]), h('p', {}, t(S.cardLocked, { room: r.name, band: S.bandName[b] }))]);
        }))]);
      })
    ]));
    window.scrollTo(0, 0);
  }

  Core.registerGame({ id: ID, title: S.title, mount: mount, unmount: unmount, summary: summary, parentReport: parentReport, progress: progress, quickTask: quickTask, collection: collection,
    // test hooks
    _state: function () { return st; }, _step: function () { return st && st.pz ? cur() : null; }, _rooms: ROOMS, _sceneSvg: sceneSvg, _faceSvg: faceSvg, _iconSvg: iconSvg, _el: function () { return el; } });
})(window);
