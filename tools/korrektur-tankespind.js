// Korrektur-ark for Tankespind: node tools/korrektur-tankespind.js  → tools/korrektur-tankespind.html
// Alle danske tekster, ordlister og analogier, og eksempler på hver opgavetype og hvert niveau med rigtige og forkerte svar.
'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
require('../shared/strings-da.js'); require('../tankespind/strings-da.js');
var P = require('../tankespind/puzzles.js'), tk = window.STR.tk, game = null;
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); }, registerGame: function (g) { game = g; } };
require('../tankespind/game.js');

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


var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
function prompt(t) {
  var p = tk.prompts;
  if (t.type === 'analogy') return t.kind === 'fig' ? p.analogyFig : p.analogyWord;
  if (t.type === 'turn') return t.mode === 'mirror' ? p.mirror : p.turn;
  if (t.type === 'code') return Core.t(p.code, { name: tk.symDef[t.syms[t.ask][0]] });
  return p[t.type];
}
function pic(t, o) { return t.type === 'turn' ? P.polySvg(o, 64) : t.type === 'fold' ? P.foldStepSvg([], 0, o, 64) : P.figSvg(o, 56); }
function box(html, right) { return '<span style="display:inline-block;text-align:center;margin:2px 4px;padding:2px;border:3px solid ' + (right ? '#2E6E2A' : '#E3D6BB') + ';border-radius:8px">' + html + '</span>'; }
function example(t) {
  var top = '', ans;
  if (t.type === 'numrow') top = '<strong>' + t.seq.join(', ') + ', ?</strong><br>';
  else if (t.type === 'analogy' && t.kind === 'word') top = '<strong>' + esc(t.a) + ' : ' + esc(t.b) + ' er som ' + esc(t.c) + ' : ?</strong><br>';
  else if (!(t.type === 'odd' && t.kind === 'fig')) { var st = game._stage(t, 56); if (st) top = '<div class="ill">' + st + '</div>'; }
  if (t.type === 'odd' && t.kind === 'fig') ans = '<div class="ill">' + t.items.map(function (f, i) { return box(P.figSvg(f, 56) + '<br>' + LETTERS[i], i === t.answer); }).join('') + '</div>';
  else if (t.type === 'odd') ans = opts2(t.items[t.answer], t.items.filter(function (x, i) { return i !== t.answer; }));
  else if (t.type === 'numrow' || t.type === 'code' || (t.type === 'analogy' && t.kind === 'word')) ans = opts2(t.options[t.answer], t.options.filter(function (x, i) { return i !== t.answer; }));
  else ans = '<div class="ill">' + t.options.map(function (o, i) { return box(pic(t, o) + '<br>' + LETTERS[i], i === t.answer); }).join('') + '</div>';
  return '<strong class="q">' + esc(prompt(t)) + '</strong><br>' + top + ans + '<br><span class="c">Hjælp efter første forkerte svar:</span> ' + esc(t.hint) + '<br><span class="c">Forklaring:</span> <em>' + esc(t.explain) + '</em>';
}

var intro = '<p>Tankespind har 12 etager (6 for mellemtrinnet, 6 for udskolingen) med niveau 1–5. Opgaverne laves af et program, så her er et udvalg: to eksempler pr. niveau. ' +
  'Det rigtige svar har en grøn ramme. Spillet giver aldrig et IQ-tal.</p><p>Programmet <code>tools/test-tankespind.js</code> laver tusindvis af opgaver pr. niveau og regner hver af dem efter på sin egen måde: ' +
  'der er altid præcis ét rigtigt svar, de forkerte figurer adskiller sig fra det rigtige i én ting, talrækker og koder regnes efter, foldninger foldes ud igen, og spejlvendte figurer kan ikke drejes på plads. ' +
  'Her skal du især se på, om sproget er godt, og om forklaringerne er til at forstå for et barn.</p>';
var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(tk) + '</table>';
b += '<h2>2. Ordgrupper (»Den skæve«)</h2>' + TH + P.WORDS.map(function (c) { return tr2([bandName(c.b), '<strong>' + esc(c.name) + '</strong> (' + esc(c.one) + '): ' + esc(c.words.join(', '))]); }).join('') + '</table>';
b += '<h2>3. Ordanalogier</h2><table><tr><th>Trin</th><th>Opgave · svar · forkerte valg · forklaring</th><th>OK</th></tr>' + P.ANALOGIES.map(function (a) {
  return tr2([bandName(a[0]), esc(a[1] + ' : ' + a[2] + ' er som ' + a[3] + ' : ?') + '<br>' + opts2(a[4], a[5]) + '<br><em>' + esc(a[6]) + '</em>']); }).join('') + '</table>';
b += '<h2>4. Eksempler på opgaver</h2>';
var seed = 7;
['M', 'U'].forEach(function (band) {
  P.ROUTES.filter(function (r) { return r.b === band; }).forEach(function (r) {
    b += '<h3>' + bandName(band) + ': ' + esc(tk.routes[r.id][0]) + ' <span class="c">– ' + esc(tk.routes[r.id][1]) + '</span></h3><table><tr><th>Niveau</th><th>Opgave</th><th>OK</th></tr>';
    for (var L = r.min; L <= r.max; L++) for (var i = 0; i < 2; i++) b += tr2(['Niveau ' + L, example(P.make(r.kind, rng(seed++), L, r.b))]);
    b += '</table>';
  });
});
fs.writeFileSync(path.join(__dirname, 'korrektur-tankespind.html'), page('Tankespind', intro, b));
console.log('Wrote tools/korrektur-tankespind.html');
