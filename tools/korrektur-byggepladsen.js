// Writes the proof sheet for Byggepladsen: node tools/korrektur-byggepladsen.js -> tools/korrektur-byggepladsen.html
'use strict';
global.window = global;
var fs = require('fs'), path = require('path');
require('../shared/strings-da.js'); require('../byggepladsen/strings-da.js');
var G = require('../byggepladsen/geometry.js'), S = window.STR.bp, game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); }, registerGame: function (g) { game = g; }, profile: function () { return null; } };
require('../byggepladsen/game.js');
var V = game._svg;
function rng(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function seeded(seed, fn) { var keep = Math.random; Math.random = rng(seed); try { return fn(); } finally { Math.random = keep; } }
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
function page(title, intro, body) {
  var date = new Date().toISOString().slice(0, 10);
  return '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – ' + title + '</title><style>' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
    'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}h3{margin:18px 0 6px}' +
    'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#FFF3D6}td.k{color:#7A5A3E;width:18%;font-size:13px}td.ok{width:44px}.a{color:#2E6E2A;font-weight:700}.x{color:#B03A2E}.q{color:#2F7DB3}.c{color:#7A5A3E;font-size:14px}' +
    'td.fig{width:230px}td.fig svg{max-width:220px;max-height:170px}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: ' + title + '</h1><p>Genereret ' + date + '. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder eller et forkert svar.</p>' +
    '<div class="intro">' + intro + '</div>' + body + '</body></html>';
}
function tr(cells) { return '<tr>' + cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="fig"' : '') + '>' + c + '</td>'; }).join('') + '<td class="ok"></td></tr>'; }
var ST = 'display:block;width:100%;height:auto';

// drawing + answer description for one task (the solution is drawn in green)
function show(tk) {
  var fig = '', right = '', wrong = '';
  switch (tk.type) {
    case 'fence': fig = V.svg(V.vb(tk.W, tk.H, V.M.posts), V.fence(tk, null, null, { solution: true }), ST);
      right = 'Fx en fold på ' + tk.answer[2] + ' m · ' + tk.answer[3] + ' m (alle rigtige: ' + tk.solutions.map(function (s) { return s[0] + ' · ' + s[1]; }).join(', ') + ')';
      wrong = 'fx 1 m · 1 m'; break;
    case 'cells': fig = V.svg(V.vb(tk.W, tk.H, V.M.cells), V.cells(tk, null, { reveal: true }), ST); right = 'De grønne felter (' + tk.answer.length + ' felter)'; wrong = 'andre felter'; break;
    case 'point': fig = V.svg(V.vb(tk.W, tk.H, V.M.coord), V.coord(tk, null, { solution: true }), ST); right = 'Pæl i ' + G.pt.apply(null, tk.answer.split(',').map(Number)); wrong = 'x og y byttet om'; break;
    case 'number': fig = V.fig(tk, ST); right = tk.answer + ' ' + tk.unit + (tk.accept.length > 1 ? ' (godkender også ' + tk.accept.slice(1).map(G.fmt).join(', ') + ' – regnet med lommeregnerens π)' : ''); wrong = G.fmt(tk.accept[0] + 1) + ' ' + tk.unit; break;
    default:
      var k = tk.kind, lab = function (o) { return game._label(tk, o); };
      if (k === 'netPick') fig = tk.figs.map(function (f, i) { return '<div style="display:inline-block;width:30%;margin:1%;' + (tk.options[i] === tk.answer ? 'outline:3px solid #3F8A3A' : 'outline:2px solid #B03A2E') + '">' + V.net(f, { style: ST }) + '</div>'; }).join('');
      else if (k === 'netYesNo') fig = V.net(tk.fig, { style: ST });
      else if (k === 'netOpp') fig = V.net(tk.fig, { mark: tk.mark, labels: tk.labels, good: tk.labels.indexOf(tk.answer), style: ST });
      else if (k === 'view') fig = V.tower(tk.heights, ST);
      else if (k === 'viewPlan') fig = V.plan(tk.heights, ST);
      else if (k === 'whichMove') fig = V.svg(V.vb(tk.W, tk.H, V.M.cells), V.cells(tk, null), ST);
      else if (k === 'coordRead') fig = V.svg(V.vb(tk.W, tk.H, V.M.coord), V.coord(tk), ST);
      else if (k === 'shapeName' || k === 'rightAngles') fig = V.shape(tk.fig, ST);
      else if (k === 'angleKind') fig = V.angle(tk, ST);
      else if (k === 'tilesArea' || k === 'tilesPer') fig = V.svg(V.vb(tk.W, tk.H, V.M.cells), V.tiles(tk), ST);
      else if (k === 'rectArea' || k === 'rectPer') fig = V.rect(tk, ST);
      if (k === 'view' || k === 'viewPlan') { right = '<span style="display:inline-block;width:70px">' + V.view(tk.answer, ST) + '</span>'; wrong = tk.options.filter(function (o) { return o !== tk.answer; }).map(function (o) { return '<span style="display:inline-block;width:60px;opacity:.8">' + V.view(o, ST) + '</span>'; }).join(' '); }
      else if (k === 'netPick') { right = 'Figuren med grøn kant'; wrong = 'de røde (kan ikke foldes)'; }
      else { right = esc(lab(tk.answer)); wrong = tk.options.filter(function (o) { return o !== tk.answer; }).map(function (o) { return esc(lab(o)); }).join(' · '); }
      return [fig, '<strong>' + esc(tk.q) + '</strong><br><span class="a">' + right + '</span><br><span class="x">' + wrong + '</span><br><span class="c">Hjælp: ' + esc(tk.hint) + '</span><br><em>' + esc(tk.explain) + '</em>'];
  }
  return [fig, '<strong>' + esc(tk.q) + '</strong><br><span class="a">' + esc(right) + '</span><br><span class="x">Forkert: ' + esc(wrong) + '</span><br><span class="c">Hjælp: ' + esc(tk.hint) + '</span><br><em>' + esc(tk.explain) + '</em>'];
}
var NAMES = { fenceArea: 'Hegnet: areal', fencePer: 'Hegnet: omkreds', fenceBoth: 'Hegnet: areal og omkreds', fenceMax: 'Hegnet: største areal', fenceMin: 'Hegnet: mindst hegn',
  mirror: 'Spejlet', move: 'Kranen: parallelforskydning', rotate: 'Kranen: drejning', reflect: 'Kranen: spejling', whichMove: 'Kranen: hvilken flytning?', netPick: 'Kassefabrikken: hvilken kan foldes?',
  netYesNo: 'Kassefabrikken: ja eller nej', netOpp: 'Kassefabrikken: modsatte side', view: 'Udsigten: tegning af tårn', viewPlan: 'Udsigten: plan med tal', coordPlace: 'Tegnebordet: sæt en pæl',
  coordRead: 'Tegnebordet: aflæs et punkt', coordRect: 'Tegnebordet: det sidste hjørne', shapeName: 'Former: navne', angleKind: 'Vinkler', rightAngles: 'Rette vinkler', tiles: 'Fliserne', rect: 'Bede (rektangler)',
  tri: 'Grundene: trekant', para: 'Grundene: parallelogram', trap: 'Grundene: trapez', circA: 'Grundene: cirklens areal', circO: 'Grundene: cirklens omkreds', room: 'Målebordet: Pythagoras (rum)',
  ladder: 'Målebordet: Pythagoras (stige)', paint: 'Målebordet: maling', paintL: 'Målebordet: liter maling', pool: 'Målebordet: bassin (m³)', poolL: 'Målebordet: bassin (liter)', box: 'Målebordet: kasse',
  cyl: 'Målebordet: vandtønde', scale: 'Målebordet: målestok' };
var BANDS = { M: ['fenceArea', 'fencePer', 'mirror', 'netPick', 'netYesNo', 'coordPlace', 'coordRead', 'coordRect', 'shapeName', 'angleKind', 'rightAngles', 'tiles', 'rect'],
  U: ['fenceBoth', 'fenceMax', 'fenceMin', 'move', 'rotate', 'reflect', 'whichMove', 'netOpp', 'view', 'viewPlan', 'tri', 'para', 'trap', 'circA', 'circO', 'room', 'ladder', 'paint', 'paintL', 'pool', 'poolL', 'box', 'cyl', 'scale'] };
var ex = '';
['M', 'U'].forEach(function (b) {
  ex += '<h3>' + (b === 'M' ? 'Mellemtrin (8–11 år)' : 'Udskoling (12–14 år)') + '</h3>';
  BANDS[b].forEach(function (kind) {
    ex += '<table><tr><th colspan="3">' + esc(NAMES[kind]) + '</th></tr>';
    for (var i = 0; i < (b === 'U' && /^(reflect|view|scale|box)$/.test(kind) ? 4 : 3); i++) {
      var tk = seeded(97 * i + kind.length * 13 + (b === 'U' ? 5 : 0), function () { return kind === 'reflect' ? G.gen.reflect(b, ['vh', 'diag', 'vh', 'diag'][i]) : G.make(kind, b); });
      ex += tr(show(tk));
    }
    ex += '</table>';
  });
});
var daily = '<table><tr><th>Illustration</th><th>Dagens udfordring</th><th>OK</th></tr>';
['M', 'U'].forEach(function (b) {
  for (var i = 1; i <= 6; i++) {
    var q = seeded(i * 101 + (b === 'U' ? 7 : 0), function () { return game.quickTask(b, {}); });
    daily += tr([q.html || '', '<span class="c">' + b + ' · ' + esc(S.routes[q.route].name) + '</span><br><strong>' + esc(q.q) + '</strong><br><span class="a">' + esc(q.answer) + (q.unit ? ' ' + esc(q.unit) : '') + '</span>' +
      (q.options ? '<br><span class="x">' + q.options.filter(function (o) { return o !== q.answer; }).map(esc).join(' · ') + '</span>' : '<br><span class="c">(skrives som tal)</span>') + '<br><span class="c">Hjælp: ' + esc(q.hint) + '</span><br><em>' + esc(q.explain) + '</em>']);
  }
});
daily += '</table>';
var nets = '<p>' + G.NETS.map(function (s) { return '<span style="display:inline-block;width:110px;margin:4px">' + V.net(G.parseShape(s), { style: ST }) + '</span>'; }).join('') + '</p>';
var TH = '<table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>';
var body = '<h2>1. Knapper og beskeder</h2>' + TH + rows({ title: S.title, tagline: S.tagline, chooseRoute: S.chooseRoute, step: S.step }) + '</table>' +
  '<h2>2. Byggeopgaver og byggeprojekter</h2><table><tr><th>Trin</th><th>Navn – beskrivelse · projekt</th><th>OK</th></tr>' + G.ROUTES.map(function (r) {
    return '<tr><td class="k">' + (r.b === 'M' ? 'Mellemtrin' : 'Udskoling') + '</td><td><strong>' + esc(S.routes[r.id].name) + '</strong> – ' + esc(S.routes[r.id].desc) + ' · <em>' + esc(S.projectNames[r.id]) + '</em></td><td class="ok"></td></tr>';
  }).join('') + '</table>' +
  '<h2>3. Alle tekster i strings-da.js</h2>' + TH + rows(S) + '</table>' +
  '<h2>4. Eksempler på alle opgavetyper</h2><p>Hver opgave er lavet af en generator. Tegningen viser det rigtige svar med grønt, hvor det giver mening. Under opgaven: rigtigt svar, forkerte valg, hjælpen (vises efter første forkerte svar) og forklaringen (vises med svaret).</p>' + ex +
  '<h2>5. Dagens udfordring (eksempler)</h2>' + daily +
  '<h2>6. De 11 udfoldninger af en terning</h2><p>Spillet kender disse 11. Testen bygger selv alle 35 figurer af seks kvadrater og ruller en terning hen over hver af dem: Netop disse 11 kan foldes.</p>' + nets +
  '<h2>Kilder og faglige valg</h2><ul>' +
  '<li>Fælles Mål for matematik (emu.dk), kompetenceområdet »Geometri og måling«: geometriske egenskaber og sammenhænge, geometrisk tegning, placeringer og flytninger, måling.</li>' +
  '<li>Formler: areal af rektangel l · b, trekant ½ · g · h, parallelogram g · h, trapez ½ · (a + b) · h, cirkel π · r², omkreds 2 · π · r; rumfang af kasse l · b · h og cylinder π · r² · h; Pythagoras a² + b² = c².</li>' +
  '<li>π ≈ 3,14 som i mange skolebøger. Svaret regnes med 3,14 og rundes af som opgaven siger; svaret med lommeregnerens π godkendes også, når det giver et andet tal.</li>' +
  '<li>Afrunding: »rund af« = almindelig afrunding (5 og derover rundes op). Maling købes i hele liter, så der rundes op. Testen tjekker, at ingen opgave ligger lige på en afrundingsgrænse.</li>' +
  '<li>Enheder: 1 m³ = 1.000 liter, 1 dm³ = 1 liter, 1 m = 100 cm. Målestok 1:50 betyder, at 1 cm på tegningen er 50 cm i virkeligheden.</li>' +
  '<li>Koordinater skrives (x, y) med mellemrum efter kommaet; mellemtrinnet bruger kun 1. kvadrant (0–8 og 0–6).</li>' +
  '<li>Navne på figurer: Et kvadrat er også et rektangel, et rektangel også et parallelogram, og et parallelogram også et trapez. Derfor er et navn, der også passer, aldrig et »forkert« valg.</li>' +
  '<li>Der findes 11 udfoldninger af en terning – bevist ved optælling i testen (216 faste og 35 frie hexominoer).</li></ul>';
var intro = '<p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-byggepladsen.js</code>, ca. 635.000 tjek):</p><ul>' +
  '<li>Al tekst og 1.000+ genererede opgaver er stavekontrolleret (hunspell da_DK).</li>' +
  '<li>Der er præcis 11 udfoldninger af en terning: Testen laver alle 35 figurer af seks kvadrater og folder dem. Alle forkerte figurer i Kassefabrikken er bevist ikke at kunne foldes, og »modsatte side« er regnet efter med en anden metode.</li>' +
  '<li>Hver af de 38 generatorer er kørt 2.000 gange, og hvert svar er regnet efter på en anden måde end i spillet: hegn ved at prøve alle par af pæle, spejlinger, drejninger og flytninger med punktgeometri, tårnets tegninger fra de enkelte klodser, figurnavne og vinkler fra hjørnernes koordinater, og alle talopgaver ud fra tallene i opgaveteksten.</li>' +
  '<li>Hvis et svar er rundet af, står det i opgaven, hvordan der skal rundes, og forklaringen viser det. Kommatal kan skrives med komma (fx 12,5).</li>' +
  '<li>Koordinater ligger altid i det viste koordinatsystem, spejlfigurer bliver symmetriske, og ved »hvilken flytning« passer kun én slags flytning.</li></ul>' +
  '<p><strong>Det skal et menneske vurdere:</strong> om sproget er naturligt og passer til alderen, om fagordene er dem, eleverne kender fra skolen (fx »parallelforskydning«, »drejning«, »spejling«, »udfoldning«), om hjælpene hjælper, og om tegningerne er tydelige. Ret i <code>byggepladsen/strings-da.js</code> (tekster) og <code>byggepladsen/geometry.js</code> (tal og opgaver).</p>';
var html = page('Byggepladsen', intro, body);
fs.writeFileSync(path.join(__dirname, 'korrektur-byggepladsen.html'), html);
console.log('Wrote tools/korrektur-byggepladsen.html (' + Math.round(html.length / 1024) + ' KB)');
