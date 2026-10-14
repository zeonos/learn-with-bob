// Korrektur-ark for Opfinderværkstedet: node tools/korrektur-opfinder.js  → tools/korrektur-opfinder.html
// Alle danske tekster, kortene i Opfinderbogen med kilder, hver maskine med et billede af løsningen, målet, »Hvorfor?«,
// løsningens trin, historien, mens den kører, og Bobs besked, hvis man starter uden at bygge – og eksempler på dagens opgaver.
'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
require('../shared/strings-da.js'); require('../opfinder/strings-da.js');
var P = require('../opfinder/parts.js'), F = require('../opfinder/physics.js'), M = require('../opfinder/machines.js');
var of = window.STR.of, game = null;
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; } };
require('../opfinder/game.js');

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
    '.ill svg{width:340px;max-width:100%;height:auto;vertical-align:middle;border-radius:6px}.daily svg{max-width:100%;height:auto}ol{margin:4px 0;padding-left:22px}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: ' + title + '</h1><p>Genereret ' + date + '. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder.</p>' +
    '<div class="intro">' + intro + '</div>' + body + '</body></html>';
}
function boxLabel(b) { return b.k === 'gear' ? Core.t(of.boxGear, b) : b.k === 'weight' ? Core.t(of.boxWeight, b) : b.k === 'block' ? Core.t(of.boxBlock, b) : b.k === 'crank' ? Core.t(of.boxCrank, b) : of.parts[b.k][0]; }

var intro = '<p>Opfinderværkstedet har 6 værksteder med 6 håndlavede maskiner hver: Værkstedet, Haven og Gården for mellemtrinnet; Urmagerens værksted, Havnekranen og Mesterværket for udskolingen. Barnet sætter delene fra værktøjskassen på væggen og starter maskinen, som kører felt for felt efter faste regler (opfinder/physics.js).</p>' +
  '<p><b>Det er allerede kontrolleret automatisk</b> (<code>tools/test-opfinder.js</code>): en selvstændig udgave af reglerne kører hver løsning og er enig med spillet om alle 725.199 måder at sætte delene på; ingen maskine virker uden barnets dele; tandhjulenes udveksling, vægtstængernes vægt · arm og taljernes træk (last : rebparter, reb = rebparter · højde) er regnet efter; dagens opgaver er regnet efter; alle tekster er stavekontrolleret med hunspell (da_DK).</p>' +
  '<p><b>Det skal et menneske vurdere:</b> om sproget er naturligt for børn, om »Hvorfor?«-teksterne passer til maskinerne på billederne, om historien (»Kuglen triller ned ad rampen …«) er til at følge, og om fakta på kortene i Opfinderbogen passer med kilderne (links står ved hvert kort).</p>';
var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(of) + '</table>';

b += '<h2>2. Opfinderbogen</h2><p class="c">Kortet får barnet, når alle 6 maskiner i værkstedet er bygget. Tjek fakta mod kilden.</p><table><tr><th>Værksted</th><th>Kort</th><th>OK</th></tr>';
M.worlds.forEach(function (w) {
  var c = of.cards[w.id];
  b += tr2([esc(of.worlds[w.id][0]), '<strong>' + esc(c.title) + '</strong> (' + esc(c.year) + ')<br>' + esc(c.fact) + '<br><span class="c">Kilde: <a href="' + esc(c.url) + '">' + esc(c.url) + '</a></span>']);
});
b += '</table>';

b += '<h2>3. Maskinerne</h2><p class="c">Billedet viser maskinen bygget som i den gemte løsning (barnets dele har blå baggrund). Antal løsninger = så mange måder kan værktøjskassens dele sættes på, så maskinen virker.</p>';
M.worlds.forEach(function (w) {
  b += '<h3>' + bandName(w.b) + ': ' + esc(of.worlds[w.id][0]) + ' – ' + esc(of.worlds[w.id][1]) + '</h3>';
  b += '<table><tr><th>Maskine</th><th>Billede af løsningen</th><th>Mål, »Hvorfor?«, løsning og historie</th><th>OK</th></tr>';
  w.levels.forEach(function (lv, i) {
    lv.id = lv.id || w.id + ':' + (i + 1);
    var list = P.machine(lv, lv.sol), W = F.build(list), mine = {};
    lv.sol.forEach(function (so) { mine[so.c + ',' + so.r] = 1; });
    var pic = game._sceneSvg(W, { uid: 'k' + w.id + i + '-', numbers: w.b === 'U', mine: mine });
    var res = F.run(list, { trace: true }), story = [];
    res.events.forEach(function (ev) { if (!ev.length) return; var s = game._storyOf(ev, res.W, w.b === 'U'); if (s && story[story.length - 1] !== s) story.push(s); });
    var fail = game._failText(F.run(P.machine(lv, []), { trace: true }), w.b === 'U');
    b += '<tr><td class="k">Maskine ' + (i + 1) + '<br><span class="c">Værktøjskasse: ' + lv.box.map(function (x) { return esc(boxLabel(x)); }).join(', ') + '</span></td><td class="ill">' + pic + '</td><td>' +
      '<strong>Mål: ' + esc(lv.goal) + '</strong><br><b>Hvorfor?</b> ' + esc(lv.why) +
      '<br><span class="c">Løsning:</span><ol>' + lv.sol.map(function (so) { return '<li>' + esc(Core.t(of.solCell, { c: so.c + 1, r: so.r + 1 }) + ' ' + game._solStepText(lv, so)) + '</li>'; }).join('') + '</ol>' +
      '<span class="c">Mens den kører:</span> <em>' + story.map(esc).join(' → ') + '</em>' +
      '<br><span class="c">Bob, hvis man starter uden at bygge:</span> »' + esc(fail) + '«</td><td class="ok"></td></tr>';
  });
  b += '</table>';
});

b += '<h2>4. Dagens udfordring</h2><table><tr><th>Slags</th><th>Opgave</th><th>OK</th></tr>';
var kinds = ['ramp', 'chain', 'leverM', 'pulleyM', 'gearDir', 'gearTurns', 'moment', 'balance', 'pulleyForce', 'pulleyRope'];
kinds.forEach(function (k, ki) {
  for (var i = 0; i < 2; i++) {
    var keep = Math.random; Math.random = rng(700 + ki * 10 + i); var q = game._makeTask(k); Math.random = keep;
    b += tr2([esc(k), '<strong class="q">' + esc(q.q) + '</strong>' + (q.html ? '<div class="daily">' + q.html + '</div>' : '<br>') + opts2(q.answer, q.options.filter(function (o) { return o !== q.answer; })) + '<br><span class="c">Hjælp:</span> ' + esc(q.hint) + '<br><span class="c">Forklaring:</span> <em>' + esc(q.explain) + '</em>']);
  }
});
b += '</table>';

b += '<h2>5. Fri opfindelse</h2><p class="c">Et eksempel på en delekode og maskinen, den giver. Koden læses strengt: kun kendte dele, inden for væggen, højst ' + P.SB_MAX + ' dele, og maskinen skal nå sine mål.</p>';
var ex = F.sandbox.fromCode('O1-P00B10W01W11W21R33K45');
b += '<table><tr><th>Kode</th><th>Maskine</th><th>OK</th></tr>' + tr2(['O1-P00B10W01W11W21R33K45', '<span class="ill">' + game._sceneSvg(F.build(F.sandbox.machine(ex)), { uid: 'ksb-', grid: true }) + '</span>']) + '</table>';

fs.writeFileSync(path.join(__dirname, 'korrektur-opfinder.html'), page('Opfinderværkstedet', intro, b));
console.log('Wrote tools/korrektur-opfinder.html');
