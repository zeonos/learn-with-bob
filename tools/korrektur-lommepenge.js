// Korrektur-ark (proof sheet) for Lommepenge: node tools/korrektur-lommepenge.js  ->  tools/korrektur-lommepenge.html
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '..');
global.window = global;
require(path.join(ROOT, 'shared/strings-da.js')); require(path.join(ROOT, 'lommepenge/strings-da.js'));
var M = require(path.join(ROOT, 'lommepenge/money.js')), lp = window.STR.lp, game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s) { return s; }, registerGame: function (g) { game = g; }, profile: function () { return null; } };
require(path.join(ROOT, 'lommepenge/game.js'));

function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
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
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}.money{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.fig{margin:6px 0}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: ' + title + '</h1><p>Genereret ' + date + '. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder.</p>' +
    '<div class="intro">' + intro + '</div>' + body + '</body></html>';
}
function tr2(cells) { return '<tr>' + cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="k"' : '') + '>' + c + '</td>'; }).join('') + '<td class="ok"></td></tr>'; }
function bandName(b) { return b === 'M' ? 'Mellemtrin' : 'Udskoling'; }
var TH = '<table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>';
var kr = M.krk;

/* 1–2: texts and routes */
var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(lp) + '</table>' +
  '<h2>2. Opgaver (ruter)</h2>' + TH + M.ROUTES.map(function (r) { return tr2([bandName(r.b), '<strong>' + esc(lp.routes[r.id].name) + '</strong> – ' + esc(lp.routes[r.id].desc) + '<br><span class="c">' + r.mix.map(function (m) { return m[1] + ' × ' + m[0]; }).join(', ') + '</span>']); }).join('') + '</table>';

/* 3: coins and notes */
b += '<h2>3. Mønter og sedler (egne, enkle tegninger)</h2><p>Tjek, at tegningerne er tydelige og ikke ligner kopier af de rigtige: 50 øre kobberfarvet, 1, 2 og 5 kr. sølvfarvede med hul, 10 og 20 kr. guldfarvede uden hul, sedler til 50, 100, 200 og 500 kr. Der er ingen 1000-kroneseddel.</p>' +
  '<div class="money">' + M.VALUES.map(function (v) { return '<figure style="margin:0;text-align:center">' + game._money(v) + '<figcaption class="c">' + esc(lp.denomIndef[v]) + '</figcaption></figure>'; }).join('') + '</div>' +
  '<table><tr><th>Værdi</th><th>Navne (ubestemt · bestemt · flertal)</th><th>OK</th></tr>' + M.VALUES.map(function (v) { return tr2([M.kr(v), esc(lp.denomIndef[v] + ' · ' + lp.denomDef[v] + ' · ' + lp.denomPlural[v])]); }).join('') + '</table>';

/* 4: prices and products */
b += '<h2>4. Priser, varer og navne (er de realistiske i 2026?)</h2><p>Alle priser står i <code>lommepenge/money.js</code> og kan rettes der. Alle navne på butikker, banker og mobilselskaber er opdigtede.</p>' +
  '<h3>Varer i Bobs butik</h3><table><tr><th>Vare</th><th>Mulige priser</th><th>OK</th></tr>' + M.ITEMS.map(function (it) { return tr2([esc(it.label) + '<br><span class="c">' + esc(it.a) + ' / ' + esc(it.pl) + '</span>', it.p.map(kr).join(' · ')]); }).join('') + '</table>' +
  '<h3>Indkøb (fest, filmaften, skovtur)</h3>' + M.BASKETS.map(function (bk) { return '<table><tr><th colspan="3">' + esc(bk.intro) + '</th></tr>' + bk.rows.map(function (r) { return tr2([esc(r[0]), r[1].map(function (o) { return esc(o[0]) + ' ' + kr(o[1]); }).join(' · ')]); }).join('') + '</table>'; }).join('') +
  '<h3>Pakninger til kilopris og literpris</h3><table><tr><th>Vare</th><th>Størrelser · pris pr. kg/liter</th><th>OK</th></tr>' + M.PACKS.map(function (p) { return tr2([esc(p.product) + ' (' + esc(p.pack) + ')', p.sizes.map(function (s) { return M.sizeText(s, p.unit); }).join(', ') + ' · ' + kr(p.per[0]) + '–' + kr(p.per[1]) + ' pr. ' + (p.unit === 'kg' ? 'kg' : 'liter')]); }).join('') + '</table>' +
  '<h3>Ting til rabat og moms (ikke mad, så opgaverne passer, selv om momsen på fødevarer ændres)</h3><table><tr><th>Ting</th><th>Priser med moms</th><th>OK</th></tr>' + M.NONFOOD.map(function (it) { return tr2([esc(it.a), it.p.map(kr).join(' · ')]); }).join('') + '</table>' +
  '<h3>Sparemål (sparebøssen)</h3><table><tr><th>Trin</th><th>Mål · pris</th><th>OK</th></tr>' + M.GOALS.map(function (g) { return tr2([bandName(g.b), esc(g.a) + ' · ' + kr(g.p)]); }).join('') + '</table>' +
  '<h3>Bobs første lejlighed – budget pr. måned</h3><table><tr><th>Post</th><th>Fra–til (trin)</th><th>OK</th></tr>' +
  tr2(['Indkomst efter skat', kr(M.INCOME[0]) + '–' + kr(M.INCOME[1]) + ' (' + kr(M.INCOME[2]) + ')']) +
  M.BUDGET.map(function (r) { return tr2([esc(lp.budgetItems[r[0]]), kr(r[1]) + '–' + kr(r[2]) + ' (' + kr(r[3]) + ')']); }).join('') + '</table>' +
  '<h3>Mobilabonnementer</h3><table><tr><th>Data</th><th>Månedspris fra–til · oprettelse</th><th>OK</th></tr>' + M.PLANS.map(function (p) { return tr2([esc(M.gbText(p[0])), kr(p[1]) + '–' + kr(p[2]) + ' · oprettelse ' + M.SETUP.filter(function (x, i, a) { return a.indexOf(x) === i; }).map(kr).join(' / ')]); }).join('') + '</table>' +
  '<h3>Lån</h3><p>Forbrugslån: 5.000–30.000 kr. over 12, 24 eller 36 måneder, rente 5–20 % om året, gebyr 0–2.500 kr. Kviklån: 2.000–7.500 kr. over 12 måneder, rente 14–24 %, gebyr 0–500 kr., ÅOP højst 35 %. Den månedlige ydelse er regnet som et annuitetslån, og ÅOP er regnet ud fra ydelserne og det beløb, man reelt får udbetalt (lån minus gebyr).</p>' +
  '<h3>Renter</h3><p>Opsparing: 1–6 % om året. (Realistiske indlånsrenter er lavere i 2026; tallene er valgt, så forskellen på simpel rente og rentes rente kan ses.)</p>' +
  '<h3>Navne</h3>' + TH + tr2(['Børn', esc(M.NAMES.join(', '))]) + tr2(['Butikker', esc(M.SHOPS.join(', '))]) + tr2(['Banker', esc(M.BANKS.join(', '))]) + tr2(['Mobilselskaber', esc(M.CARRIERS.join(', '))]) + '</table>';

/* 5: facts */
b += '<h2>5. Faktaspørgsmål</h2><table><tr><th>Hjælp</th><th>Spørgsmål · svar · forklaring</th><th>OK</th></tr>' +
  Object.keys(M.FACTS).map(function (k) { return M.FACTS[k].map(function (f) { return tr2([esc(f[3]), '<strong>' + esc(f[0]) + '</strong><br><span class="a">' + esc(f[1]) + '</span> · ' + f[2].map(function (w) { return '<span class="x">' + esc(w) + '</span>'; }).join(' · ') + '<br><em>' + esc(f[4]) + '</em>']); }).join(''); }).join('') + '</table>';

/* 6: examples of every task type */
function optLabel(tk, o) { return tk.optKind === 'money' ? lp.denomIndef[+o] : tk.optKind === 'kr' ? kr(+o) : o; }
function example(tk) {
  var ans, wrong = '';
  if (tk.type === 'choice') { ans = optLabel(tk, tk.answer); wrong = tk.options.filter(function (o) { return o !== tk.answer; }).map(function (o) { return '<span class="x">' + esc(optLabel(tk, o)) + '</span>'; }).join(' · '); }
  else if (tk.type === 'number') { ans = M.fmtAnswer(tk.answer, tk.unit) + (tk.tol ? ' (±' + tk.tol + ')' : ''); wrong = tk.wrong.map(function (w) { return '<span class="x">' + esc(M.fmtAnswer(w, tk.unit)) + '</span>'; }).join(' · '); }
  else if (tk.type === 'pay' || tk.type === 'change') { ans = M.kr(tk.answer) + ' – færrest: ' + tk.solution.map(M.kr).join(' + '); wrong = '<span class="x">fx ' + M.kr(Math.max(50, tk.answer - 100)) + ' (hjælp: ' + esc(M.fill(lp.h.payLess, { sum: M.kr(Math.max(50, tk.answer - 100)), diff: M.kr(tk.answer - Math.max(50, tk.answer - 100)) })) + ')</span>'; }
  else if (tk.type === 'basket') { ans = 'Alt, der højst koster ' + M.kr(tk.budget); wrong = '<span class="x">' + esc(tk.rows.map(function (r) { return r.title + ': ' + r.opts.map(function (o) { return o.name + ' ' + M.kr(o.price); }).join(' / '); }).join('; ')) + '</span>'; }
  var fig = tk.fig ? '<div class="fig">' + game._fig(tk.fig, true) + '</div>' : '';
  var hint = tk.type === 'basket' ? M.fill(tk.hint, { over: '25 kr.' }) : tk.hint;
  return tr2([esc(tk.kind) + '<br>' + tk.type, '<strong>' + esc(tk.q) + '</strong>' + fig + '<br>Svar: <span class="a">' + esc(ans) + '</span>' + (wrong ? '<br>Forkert: ' + wrong : '') +
    '<br><span class="q">Hjælp: ' + esc(hint) + '</span><br><em>Forklaring: ' + esc(tk.explain) + '</em>']);
}
b += '<h2>6. Eksempler på alle opgavetyper</h2><p>Opgaverne laves af generatorer i <code>money.js</code>, så her er to eksempler pr. type. Blå tekst er hjælpen efter første forkerte svar; kursiv er forklaringen, der vises med svaret.</p>';
M.ROUTES.forEach(function (r) {
  b += '<h3>' + esc(lp.routes[r.id].name) + ' (' + bandName(r.b).toLowerCase() + ')</h3><table><tr><th>Type</th><th>Opgave · svar · hjælp · forklaring</th><th>OK</th></tr>';
  r.mix.forEach(function (m, mi) { for (var k = 1; k <= 2; k++) b += example(seeded(1000 * mi + 17 * k + r.id.length, function () { return M.gen[m[0]](); })); });
  b += '</table>';
});
var qt = seeded(42, function () { return game.quickTask('M', {}); }), qu = seeded(43, function () { return game.quickTask('U', {}); });
b += '<h3>Dagens udfordring (eksempler)</h3><table>' + [qt, qu].map(function (q) { return tr2([q.input ? 'Skriv tal' : 'Vælg', '<strong>' + esc(q.q) + '</strong>' + (q.html ? '<div class="fig">' + q.html + '</div>' : '') + '<br>Svar: <span class="a">' + esc(q.answer) + (q.unit ? ' ' + esc(q.unit) : '') + '</span>' + (q.options ? '<br>Valg: ' + q.options.map(esc).join(' · ') : '')]); }).join('') + '</table>';

/* 7: sources */
b += '<h2>7. Kilder til fakta</h2><ul>' +
  '<li><a href="https://lex.dk/m%C3%B8nt">Lex: Mønt</a> – danske mønter i omløb: 50 øre, 1, 2, 5, 10 og 20 kroner; 25-øren blev afskaffet i 2008, og kontante betalinger rundes af til nærmeste 50 øre.</li>' +
  '<li><a href="https://www.nationalbanken.dk/da/sedler-og-moenter">Danmarks Nationalbank: Sedler og mønter</a> – gyldige sedler er 50, 100, 200 og 500 kroner. 1000-kroneseddelen er ikke længere gyldig (den kan kun indløses), og en ny seddelserie ventes 2028–2029.</li>' +
  '<li><a href="https://lex.dk/moms">Lex: Moms</a> og <a href="https://skat.dk/erhverv/moms">Skattestyrelsen: Moms</a> – momsen er 25 %. Der er politiske planer om lavere moms på fødevarer fra 2028, men det er ikke vedtaget; derfor bruger momsopgaverne kun ting, der ikke er mad, og satsen står ét sted (<code>MOMS</code> i money.js).</li>' +
  '<li>ÅOP = årlige omkostninger i procent: lånets samlede årlige pris med både rente og gebyrer (fx Forbrugerrådet Tænk og Finans Danmark om lån). Spillet regner ÅOP som den effektive årlige rente ud fra ydelserne og det udbetalte beløb.</li></ul>';

var intro = '<p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-lommepenge.js</code>, ca. 700.000 tjek):</p><ul>' +
  '<li>Hver opgavetype er lavet 1.500 gange med forskellige frø, og alle summer, byttepenge, kilopriser, procenter, moms, renter, rentes rente, ydelser, ÅOP og budgetter er regnet efter igen med egne formler.</li>' +
  '<li>Byttepenge med færrest mulige mønter og sedler er sammenlignet med en udtømmende optælling (36 millioner kombinationer) og en bredde-først-søgning for alle beløb op til 500 kr.</li>' +
  '<li>Alle kontante beløb er hele kroner eller 50 øre, og afrunding til nærmeste 50 øre følger reglen. Der findes ingen 1000-kroneseddel nogen steder i spillet.</li>' +
  '<li>Alle budgetter i Indkøbslisten kan løses (og ikke alle kurve passer), momsopgaverne bruger kun ting, der ikke er mad, og det rigtige svar er altid blandt valgene.</li>' +
  '<li>Al tekst er stavekontrolleret (hunspell da_DK). Opdigtede navne er ikke med og skal læses her. Testen leder også efter rigtige butikker, banker og mærker.</li></ul>' +
  '<p><strong>Det skal et menneske vurdere:</strong> om priserne (afsnit 4) er realistiske i 2026, om teksterne er naturligt dansk og passer til alderen, og om forklaringerne er til at forstå. Ret priser og varer i <code>lommepenge/money.js</code> og tekster i <code>lommepenge/strings-da.js</code>.</p>';
var k = page('Lommepenge', intro, b);
fs.writeFileSync(path.join(__dirname, 'korrektur-lommepenge.html'), k);
console.log('Wrote tools/korrektur-lommepenge.html (' + Math.round(k.length / 1024) + ' KB)');
