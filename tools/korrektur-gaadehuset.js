// Korrektur-ark for Gådehuset: node tools/korrektur-gaadehuset.js  → tools/korrektur-gaadehuset.html
// Alle danske tekster, alle billeder, flodgåderne med løsninger, og eksempler på alle andre slags gåder med forklaringer.
'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
require('../shared/strings-da.js'); require('../gaadehuset/strings-da.js'); require('../gaadehuset/pictures.js');
var NG = require('../gaadehuset/nonogram.js'), SD = require('../gaadehuset/sudoku.js'), LG = require('../gaadehuset/logic.js'),
  RV = require('../gaadehuset/river.js'), TF = require('../gaadehuset/truth.js'), gh = window.STR.gh, game = null;
require('../gaadehuset/hanoi.js');
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; }, play: function () {} };
require('../gaadehuset/kinds.js'); require('../gaadehuset/game.js');
var K = window.GH_KINDS, ART = window.GH_ART;

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


function steps(list, max) { var s = list.slice(0, max).map(function (x, i) { return '<li>' + esc(x.text) + '</li>'; }).join(''); return '<ol class="c">' + s + (list.length > max ? '<li>… (' + (list.length - max) + ' skridt mere)</li>' : '') + '</ol>'; }
function sdGrid(pz) { var n = pz.n, s = '<table style="border-collapse:collapse;margin:4px 0">'; for (var r = 0; r < n; r++) { s += '<tr>'; for (var c = 0; c < n; c++) s += '<td style="width:22px;height:22px;text-align:center;padding:0;font-weight:700">' + (pz.puzzle[r * n + c] || '') + '</td>'; s += '</tr>'; } return s + '</table>'; }

var intro = '<p>Gådehuset har 10 rum (5 for mellemtrinnet, 5 for udskolingen). Billeder, flodgåder og tekster står her i deres helhed; sudokuer, logikgåder og sandt-eller-falsk laves af et program, så her er eksempler.</p>' +
  '<p><code>tools/test-gaadehuset.js</code> løser alle gåder igen med sine egne programmer: hver sudoku, hvert billede og hver logikgåde har præcis én løsning, hvert forklaret skridt følger af det, man ved på det tidspunkt, flodgåderne og Hanois tårn klares på færrest mulige ture og flyt, og kun ét svar passer i sandt eller falsk.</p>' +
  '<p>Se især på: om billederne er til at genkende, om navnene og kønnet (en/et) er rigtige, og om forklaringerne er til at forstå for et barn.</p>';
var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(gh) + '</table>';
b += '<h2>2. Malebilleder (' + window.GH_PICS.length + ')</h2><table><tr><th>Trin</th><th>Billede · navn · størrelse · tal</th><th>OK</th></tr>' + window.GH_PICS.map(function (p) {
  var cl = NG.clues(NG.grid(p));
  return tr2([bandName(p.b), '<span class="ill">' + ART.picSvg(p, 90) + '</span> <strong>' + esc(p.name) + '</strong> <span class="c">(' + p.rows[0].length + ' × ' + p.rows.length + ', id ' + p.id + ')</span><br><span class="c">Rækker: ' + cl.rows.map(function (r) { return r.join(' ') || '0'; }).join(' | ') + '</span>']);
}).join('') + '</table>';
b += '<h2>3. Over floden</h2>' + RV.PUZZLES.filter(function (p) { return !p.same; }).map(function (p) {
  return '<h3>' + esc(p.title) + ' <span class="c">(' + bandName(p.b) + ', ' + RV.best(p) + ' ture)</span></h3><table><tr><th>Del</th><th>Tekst</th><th>OK</th></tr>' + tr2(['Historie', esc(p.story)]) +
    p.rules.map(function (r) { return tr2(['Når det går galt', esc(r.msg)]); }).join('') + tr2(['Personer og dyr', esc(p.items.map(function (i) { return i.name; }).join(', '))]) +
    p.solution.map(function (s, i) { return tr2(['Tur ' + (i + 1), esc(s[1])]); }).join('') + '</table>';
}).join('');
b += '<h2>4. Hvem ejer hvad?</h2>';
var seed = 11;
['M', 'U'].forEach(function (band) { [1, 2, 3].forEach(function (l) { for (var k = 0; k < 2; k++) {
  var p = LG.make(band, l, rng(seed++));
  b += '<h3>' + bandName(band) + ', niveau ' + l + '</h3><table><tr><th>Del</th><th>Tekst</th><th>OK</th></tr>' + tr2(['Spor', '<ol>' + p.clues.map(function (c) { return '<li>' + esc(LG.clueText(p, c)) + '</li>'; }).join('') + '</ol>']) +
    tr2(['Løsning skridt for skridt', steps(K.logic.solution(p), 40)]) + tr2(['Svar', esc(LG.answerText(p))]) + '</table>';
} }); });
b += '<h2>5. Sudoku</h2>';
game._routes.filter(function (r) { return r.kind === 'sudoku'; }).forEach(function (r) { r.levels.forEach(function (cfg, i) {
  var pz = K.sudoku.create(cfg, rng(seed++));
  b += '<h3>' + bandName(r.b) + ', niveau ' + (i + 1) + ' <span class="c">(' + cfg.n + ' × ' + cfg.n + ', ' + pz.puzzle.filter(Boolean).length + ' tal fra start)</span></h3><table><tr><th>Gåde</th><th>De første skridt i løsningen</th><th>OK</th></tr>' + tr2([sdGrid(pz), steps(K.sudoku.solution(pz), 6)]) + '</table>';
}); });
b += '<h2>6. Hanois tårn (3 skiver)</h2><table><tr><th>Flyt</th><th>Forklaring</th><th>OK</th></tr>' + K.hanoi.solution({ n: 3 }).map(function (s, i) { return tr2([String(i + 1), esc(s.text)]); }).join('') + '</table>';
b += '<h2>7. Sandt eller falsk</h2>';
[1, 2, 3].forEach(function (l) { for (var k = 0; k < 3; k++) {
  var p = TF.make(l, rng(seed++));
  b += '<table><tr><th>Niveau ' + l + '</th><th>Gåde og forklaring</th><th>OK</th></tr>' + tr2(['', p.names.map(function (nm, i) { return '<b>' + esc(nm) + ':</b> »' + esc(TF.said(p, p.says[i])) + '«'; }).join('<br>') + '<br><span class="a">' + esc(p.names.map(function (nm, i) { return nm + ': ' + (p.answer[i] ? gh.tfTruth : gh.tfLie); }).join(', ')) + '</span><br><em>' + esc(K.truth.solution(p)[0].text) + '</em>']) + '</table>';
} });
b += '<h2>8. Dagens udfordring</h2><table><tr><th>Trin</th><th>Opgave</th><th>OK</th></tr>';
['M', 'U'].forEach(function (band) { for (var i = 0; i < 6; i++) {
  var keep = Math.random; Math.random = rng(500 + i + (band === 'U' ? 50 : 0)); var q = game.quickTask(band, {}); Math.random = keep;
  b += tr2([bandName(band), '<strong class="q">' + esc(q.q) + '</strong>' + (q.html ? '<div class="ill">' + q.html + '</div>' : '<br>') + (q.options ? opts2(q.answer, q.options.filter(function (o) { return o !== q.answer; })) : '<span class="a">' + q.answer + ' ' + esc(q.unit || '') + '</span>') +
    '<br><span class="c">Hjælp:</span> ' + esc(q.hint) + '<br><span class="c">Forklaring:</span> <em>' + esc(q.explain) + '</em>']);
} });
b += '</table>';
fs.writeFileSync(path.join(__dirname, 'korrektur-gaadehuset.html'), page('Gådehuset', intro, b));
console.log('Wrote tools/korrektur-gaadehuset.html');
