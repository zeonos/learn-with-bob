// Korrektur-ark for Raketbanen: node tools/korrektur-raketbanen.js  → tools/korrektur-raketbanen.html
// Alle danske tekster, kortene til Rumlogbogen, hver bane med et lille billede, det viste skud og forklaringen,
// eksempler på Bobs beskeder efter et forbiskud og på dagens opgaver.
'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
require('../shared/strings-da.js'); require('../raketbanen/strings-da.js');
var RK = require('../raketbanen/physics.js');
require('../raketbanen/levels.js');
var rb = window.STR.rb, game = null;
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; } };
require('../raketbanen/game.js');

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function rows(obj, prefix) {
  var out = [];
  (function walk(o, k) {
    if (typeof o === 'string') out.push('<tr><td class="k">' + esc(k) + '</td><td>' + esc(o) + '</td><td class="ok"></td></tr>');
    else if (Array.isArray(o)) o.forEach(function (v, i) { walk(v, k + ' ' + (i + 1)); });
    else for (var x in o) walk(o[x], k ? k + ' › ' + x : x);
  })(obj, prefix || '');
  return out.join('');
}
function tr2(cells) { return '<tr>' + cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="k"' : '') + '>' + c + '</td>'; }).join('') + '<td class="ok"></td></tr>'; }
function opts2(right, wrong) { return '<span class="a">' + esc(right) + '</span>' + wrong.map(function (w) { return ' · <span class="x">' + esc(w) + '</span>'; }).join(''); }
function bandName(b) { return b === 'M' ? 'Mellemtrin' : 'Udskoling'; }
var TH = '<table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>';
function page(title, intro, body) {
  var date = new Date().toISOString().slice(0, 10);
  return '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – ' + title + '</title><style>' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
    'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}h3{margin:18px 0 6px}' +
    'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#FFF3D6}td.k{color:#7A5A3E;width:18%;font-size:13px}td.ok{width:44px}.a{color:#2E6E2A;font-weight:700}.x{color:#B03A2E}.q{color:#2F7DB3}.c{color:#7A5A3E;font-size:14px}' +
    '.ill svg{width:320px;max-width:100%;height:auto;vertical-align:middle;border-radius:6px}.daily svg{max-width:100%;height:auto}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: ' + title + '</h1><p>Genereret ' + date + '. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder.</p>' +
    '<div class="intro">' + intro + '</div>' + body + '</body></html>';
}

var intro = '<p>Raketbanen har 6 verdener med 6 håndlavede baner hver (Jorden, Månen og Mars for mellemtrinnet; Jupiter, Kredsløb og Solsystemet for udskolingen). Barnet vælger vinkel og kraft. Fysikken bruger de rigtige tyngdekræfter: Jorden 9,8, Månen 1,6, Mars 3,7 og Jupiter 24,8 m/s².</p>' +
  '<p><code>tools/test-raketbanen.js</code> prøver hver bane med alle vinkler (1° ad gangen) og al kraft (1 ad gangen): alle baner kan klares, færre skud rammer for hver bane i en verden, »Vis et skud« rammer, og en uafhængig udgave af fysikken er enig. Tallene på kortene tjekkes mod spillets tyngdekraft.</p>' +
  '<p>Se især på: om tallene på kortene i Rumlogbogen er rigtige, om forklaringerne passer til billederne, og om Bobs beskeder er til at forstå.</p>';
var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(rb) + '</table>';

b += '<h2>2. Rumlogbogen</h2><p class="c">Kortet får barnet, når alle 6 baner i verdenen er klaret. Tjek tallene.</p><table><tr><th>Verden</th><th>Kort</th><th>OK</th></tr>';
RK.worlds.forEach(function (w) {
  var c = rb.cards[w.id];
  b += tr2([esc(rb.worlds[w.id][0]), '<strong>' + esc(c.title) + '</strong><br>' + c.rows.map(function (r) { return esc(r[0]) + ': <strong>' + esc(r[1]) + '</strong>'; }).join('<br>') + '<br><em>' + esc(rb.cardFun) + ' ' + esc(c.fun) + '</em>']);
});
b += '</table>';

b += '<h2>3. Banerne</h2>';
RK.worlds.forEach(function (w) {
  b += '<h3>' + bandName(w.b) + ': ' + esc(rb.worlds[w.id][0]) + ' – ' + esc(rb.worlds[w.id][1]) + '</h3><p class="c">Fakta under »Vis løsningen«: ' + esc(w.fact) + '</p>';
  b += '<table><tr><th>Bane</th><th>Billede med det viste skud (grønt)</th><th>Forklaring og et forbiskud</th><th>OK</th></tr>';
  w.levels.forEach(function (lv, i) {
    var sw = RK.sweep(lv, 2, 2), sol = lv.sol, ghost = RK.simulate(lv, sol[0], sol[1], { path: true, every: 4 }).path;
    var miss = RK.simulate(lv, 45, 50, { path: true, every: 4 });
    var pic = game._sceneSvg(lv, { uid: 'k' + lv.id + '-', ghost: ghost, trails: [miss.path], aim: false, pose: sol[0] });
    b += '<tr><td class="k">Bane ' + (i + 1) + '<br><span class="c">' + (sw.frac * 100).toFixed(1) + ' % af skuddene rammer</span></td><td class="ill">' + pic + '</td><td>' +
      '<strong>Vis et skud: ' + sol[0] + '°, kraft ' + sol[1] + '</strong><br>' + esc(lv.why) + '<br><span class="c">Startskud 45°, kraft 50 (prikket): Bob siger »' + esc(game._feedback(lv, miss, 45, 50, 1)) + '«</span></td><td class="ok"></td></tr>';
  });
  b += '</table>';
});

b += '<h2>4. Bobs beskeder efter et forbiskud</h2><table><tr><th>Bane og skud</th><th>Besked</th><th>OK</th></tr>';
var seen = {};
RK.worlds.forEach(function (w) { w.levels.forEach(function (lv) {
  var s = lv.sol, ar = RK.angleRange(lv);
  [[s[0], s[1] - 8], [s[0], s[1] + 8], [s[0] + 6, s[1]], [RK.isSpace(lv) ? (s[0] + 180) % 360 : 160, 50], [s[0], 1]].forEach(function (x) {
    var a = RK.isSpace(lv) ? (x[0] + 360) % 360 : Math.max(ar[0], Math.min(ar[1], x[0])), p = Math.max(1, Math.min(100, x[1])), r = RK.simulate(lv, a, p);
    if (r.hit) return;
    var f = game._feedback(lv, r, a, p, 1); if (seen[f]) return; seen[f] = 1;
    b += tr2([esc(lv.id) + ': ' + a + '°, kraft ' + p, esc(f)]);
  });
}); });
b += '</table>';

b += '<h2>5. Dagens udfordring</h2><table><tr><th>Trin</th><th>Opgave</th><th>OK</th></tr>';
var seenQ = {};
['M', 'U'].forEach(function (band) { for (var i = 0; i < 60; i++) {
  var keep = Math.random; Math.random = rng(900 + i + (band === 'U' ? 4000 : 0)); var q = game.quickTask(band, {}); Math.random = keep;
  var key = band + q.q + q.answer; if (seenQ[key]) continue; seenQ[key] = 1;
  b += tr2([bandName(band), '<strong class="q">' + esc(q.q) + '</strong>' + (q.html ? '<div class="daily">' + q.html + '</div>' : '<br>') + opts2(q.answer, q.options.filter(function (o) { return o !== q.answer; })) + '<br><span class="c">Hjælp:</span> ' + esc(q.hint) + '<br><span class="c">Forklaring:</span> <em>' + esc(q.explain) + '</em>']);
} });
b += '</table>';

b += '<h2>6. Byg en bane</h2><p class="c">Et eksempel på en delekode og banen, den giver. Koden læses strengt: alt andet end en gyldig bane, der kan klares, afvises.</p>';
var ex = RK.sandbox.fromCode('R1-2161M42S23');
b += '<table><tr><th>Kode</th><th>Bane</th><th>OK</th></tr>' + tr2(['R1-2161M42S23', '<span class="ill">' + game._sceneSvg(ex.lv, { uid: 'ksb-', aim: false, pose: 45, grid: true }) + '</span>']) + '</table>';

fs.writeFileSync(path.join(__dirname, 'korrektur-raketbanen.html'), page('Raketbanen', intro, b));
console.log('Wrote tools/korrektur-raketbanen.html');
