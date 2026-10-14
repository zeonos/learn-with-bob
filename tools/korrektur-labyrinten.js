// Korrektur-ark for Labyrinten: node tools/korrektur-labyrinten.js  → tools/korrektur-labyrinten.html
// Alle danske tekster, en labyrint af hver slags på hvert niveau med den forklarede løsning, og eksempler på spørgsmålene.
'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
require('../shared/strings-da.js'); require('../labyrinten/strings-da.js');
var M = require('../labyrinten/mazes.js'), lb = window.STR.lb, game = null;
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; } };
require('../labyrinten/game.js');

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
    '.ill svg{max-height:110px;width:auto;max-width:100%;vertical-align:middle;margin:2px 6px 2px 0}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: ' + title + '</h1><p>Genereret ' + date + '. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder.</p>' +
    '<div class="intro">' + intro + '</div>' + body + '</body></html>';
}


var COL = { '#': '#4A3F5E', '.': '#EFE6D2', G: '#8CCB6A', a: '#D9463B', b: '#2F7DB3', c: '#E8B923', A: '#D9463B', B: '#2F7DB3', C: '#E8B923', x: '#F4C2B8' };
function mazeSvg(lv, ice) {
  var u = 14, s = '';
  lv.rows.forEach(function (r, y) { for (var x = 0; x < lv.w; x++) { var c = r[x], f = ice && c === '.' ? '#CFEAF7' : COL[c] || '#EFE6D2'; s += '<rect x="' + x * u + '" y="' + y * u + '" width="' + u + '" height="' + u + '" fill="' + f + '"/>';
    if (/[abc]/.test(c)) s += '<circle cx="' + (x * u + 7) + '" cy="' + (y * u + 7) + '" r="4" fill="#fff"/>';
    if (M.ARROW[c]) s += '<text x="' + (x * u + 7) + '" y="' + (y * u + 11) + '" text-anchor="middle" font-size="11" fill="#B05A16" font-weight="800">' + { up: '↑', down: '↓', left: '←', right: '→' }[M.ARROW[c]] + '</text>'; } });
  (lv.crates || []).forEach(function (i) { s += '<rect x="' + ((i % lv.w) * u + 2) + '" y="' + (Math.floor(i / lv.w) * u + 2) + '" width="10" height="10" fill="#C68A3E" stroke="#6B4426"/>'; });
  s += '<circle cx="' + (lv.start[0] * u + 7) + '" cy="' + (lv.start[1] * u + 7) + '" r="5" fill="#F7C548" stroke="#4A2C17" stroke-width="1.5"/>';
  return '<svg viewBox="0 0 ' + lv.w * u + ' ' + lv.h * u + '" width="' + lv.w * u + '" height="' + lv.h * u + '">' + s + '</svg>';
}
function mirrorSvg(pz) {
  var u = 22, s = '';
  for (var y = 0; y < pz.h; y++) for (var x = 0; x < pz.w; x++) { var i = y * pz.w + x; s += '<rect x="' + x * u + '" y="' + y * u + '" width="' + u + '" height="' + u + '" fill="' + (pz.walls.indexOf(i) >= 0 ? '#6E6488' : '#2F2942') + '" stroke="#3D3654"/>'; }
  pz.mirrors.forEach(function (m, i) { var o = pz.start[i]; s += '<line x1="' + (m[0] * u + 3) + '" y1="' + (m[1] * u + (o === '/' ? u - 3 : 3)) + '" x2="' + (m[0] * u + u - 3) + '" y2="' + (m[1] * u + (o === '/' ? 3 : u - 3)) + '" stroke="#CFE8F5" stroke-width="3"/>'; });
  s += '<circle cx="' + (pz.crystal[0] * u + 11) + '" cy="' + (pz.crystal[1] * u + 11) + '" r="7" fill="#B48CDE"/><rect x="0" y="' + (pz.laser[1] * u + 7) + '" width="6" height="8" fill="#E8B923"/>';
  return '<svg viewBox="0 0 ' + pz.w * u + ' ' + pz.h * u + '" width="' + pz.w * u + '" height="' + pz.h * u + '">' + s + '</svg>';
}
var intro = '<p>Labyrinten har 8 huler (4 for mellemtrinnet, 4 for udskolingen). Labyrinterne laves af et program, så her er én af hver slags på hvert niveau med den forklarede løsning, som barnet ser under »Vis løsningen«.</p>' +
  '<p><code>tools/test-labyrinten.js</code> løser alle labyrinter igen med sine egne søgninger: alle kan klares, det mindste antal skridt passer, dørene spærrer vejen uden nøgler, pilene tvinger en omvej, kun én udgang kan nås i dagens opgave, og kun én vej er billigst i spørgsmålene.</p>' +
  '<p>Se især på: om forklaringerne er til at forstå, og om ordene i spørgsmålene er klare.</p>';
var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(lb) + '</table>';
b += '<h2>2. Labyrinter med løsning</h2>';
var seed = 3;
game._routes.filter(function (r) { return r.kind !== 'route'; }).forEach(function (r) {
  r.levels.forEach(function (cfg, i) {
    var it = game._makeRound(r, i + 1, rng(seed++))[0], lv = it.lv, pic, steps;
    if (r.kind === 'mirrors') { pic = mirrorSvg(lv); steps = M.mirrorSteps(lv, lv.start); }
    else { pic = mazeSvg(lv, r.kind === 'ice'); steps = M.explain(lv); }
    var best = r.kind === 'mirrors' ? lv.best : M.solve(lv).n;
    b += '<h3>' + bandName(r.b) + ': ' + esc(lb.routes[r.id][0]) + ', niveau ' + (i + 1) + ' <span class="c">(færrest: ' + best + ')</span></h3><table><tr><th>Labyrint</th><th>Løsningen skridt for skridt</th><th>OK</th></tr>' +
      tr2(['<span class="ill">' + pic + '</span>', '<ol class="c">' + steps.slice(0, 14).map(function (s) { return '<li>' + esc(s.text) + '</li>'; }).join('') + (steps.length > 14 ? '<li>… (' + (steps.length - 14) + ' skridt mere)</li>' : '') + '</ol>']) + '</table>';
  });
});
b += '<h2>3. Korteste vej</h2><table><tr><th>Slags</th><th>Spørgsmål, svar og forklaring</th><th>OK</th></tr>';
['steps', 'pick', 'stepsMud', 'pickMud', 'count'].forEach(function (k) { for (var j = 0; j < 2; j++) {
  var q = M.makeRouteQ(k, rng(seed++));
  b += tr2([k, '<strong class="q">' + esc(q.q) + '</strong><div class="ill">' + M.routeSvg(q, 240) + '</div>' + opts2(q.options[q.answer], q.options.filter(function (o, i) { return i !== q.answer; })) + '<br><span class="c">Hjælp:</span> ' + esc(q.hint) + '<br><span class="c">Forklaring:</span> <em>' + esc(q.explain) + '</em>']);
} });
b += '</table><h2>4. Dagens udfordring</h2><table><tr><th>Trin</th><th>Opgave</th><th>OK</th></tr>';
['M', 'U'].forEach(function (band) { for (var i = 0; i < 4; i++) {
  var keep = Math.random; Math.random = rng(900 + i + (band === 'U' ? 40 : 0)); var q = game.quickTask(band, {}); Math.random = keep;
  b += tr2([bandName(band), '<strong class="q">' + esc(q.q) + '</strong><div class="ill">' + q.html + '</div>' + opts2(q.answer, q.options.filter(function (o) { return o !== q.answer; })) + '<br><span class="c">Hjælp:</span> ' + esc(q.hint) + '<br><span class="c">Forklaring:</span> <em>' + esc(q.explain) + '</em>']);
} });
b += '</table>';
fs.writeFileSync(path.join(__dirname, 'korrektur-labyrinten.html'), page('Labyrinten', intro, b));
console.log('Wrote tools/korrektur-labyrinten.html');
