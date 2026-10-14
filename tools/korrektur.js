// Generates the korrektur-ark (proof sheets) for all games: node tools/korrektur.js
// Output: tools/korrektur-regnestorm.html – open in a browser, read through, print if you like.
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.resolve(__dirname, '..');
var Regn = require(path.join(ROOT, 'regnestorm/problems.js'));
function strings(file) { var c = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), c); return c.window.STR; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function rows(obj, prefix) {
  var out = [];
  (function walk(o, k) {
    if (typeof o === 'string') out.push('<tr><td class="k">' + esc(k) + '</td><td>' + esc(o) + '</td><td class="ok"></td></tr>');
    else if (Array.isArray(o)) o.forEach(function (v, i) { walk(v, k + ' ' + (i + 1)); });
    else for (var x in o) { if (/^(id|outfit)$/.test(x)) continue; walk(o[x], k ? k + ' › ' + x : x); }
  })(obj, prefix || '');
  return out.join('');
}
var core = strings('shared/strings-da.js').core, rs = strings('regnestorm/strings-da.js').rs;
var date = new Date().toISOString().slice(0, 10);
var h = '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – Regnestorm</title><style>' +
  'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
  'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}h3{margin:20px 0 6px}' +
  'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
  'th{background:#FFF3D6}td.k{color:#7A5A3E;width:24%;font-size:13px}td.ok{width:44px}.lvl{background:#FFF9EC;font-weight:700}' +
  '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}.say{color:#2F7DB3;font-style:italic}' +
  '@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
  '<h1>Korrektur-ark: Regnestorm</h1><p>Genereret ' + date + '. Alt dansk tekst, som et barn kan møde i spillet.</p>' +
  '<div class="intro"><p><strong>Sådan bruger du arket:</strong> Læs teksterne, og sæt et flueben i den sidste kolonne, når en tekst er i orden. ' +
  'Skriv rettelser i margenen, eller send dem til Claude. Teksterne i afsnit 1 og 2 rettes i <code>shared/strings-da.js</code> og <code>regnestorm/strings-da.js</code>. ' +
  'Opgaverne i afsnit 3 bliver lavet af en generator, så her ser du tre eksempler pr. niveau; rettelser laves i <code>regnestorm/problems.js</code>.</p>' +
  '<p>Allerede kontrolleret automatisk: stavning (dansk ordbog, hunspell da_DK), at hvert svar er regnet rigtigt (90.000 opgaver), og at der ikke er tomme felter.</p></div>' +
  '<h2>1. Fælles tekster (start, spillere, forældreside)</h2><table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>' + rows(core) + '</table>' +
  '<h2>2. Regnestorm – knapper og beskeder</h2><table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>' + rows(rs) + '</table>' +
  '<h2>3. Opgaver, hjælp og løsninger</h2><p>Blå kursiv er det, oplæsningen siger (hvis enheden har en dansk stemme).</p>';
['M', 'U'].forEach(function (band) {
  h += '<h3>' + (band === 'M' ? 'Mellemtrin (8–11 år)' : 'Udskoling (12–14 år)') + '</h3>';
  Regn.bands[band].forEach(function (tp) {
    h += '<table><tr><th colspan="3">' + esc(tp.name) + ' – ' + esc(tp.desc) + '</th></tr>';
    for (var L = 1; L <= 5; L++) {
      var R = Regn.makeRand(7 * L + tp.id.length), seen = {};
      h += '<tr><td colspan="3" class="lvl">Niveau ' + L + '</td></tr>';
      for (var i = 0, n = 0; i < 40 && n < 3; i++) {
        var p = Regn.generate(tp.id, L, R);
        var key = p.hint.text.replace(/[\d,−.]+/g, '#');
        if (seen[key] && i < 30) continue; // prefer different sentence patterns
        seen[key] = 1; n++;
        h += '<tr><td class="k">Opgave<br>Svar: ' + esc(p.answerText) + '</td><td><strong>' + esc(p.text) + '</strong><br>Hjælp: ' + esc(p.hint.text) +
             '<br>Løsning: ' + esc(p.solution) + '<br><span class="say">Oplæsning: ' + esc(p.speech) + '</span></td><td class="ok"></td></tr>';
      }
    }
    h += '</table>';
  });
});
h += '</body></html>';
fs.writeFileSync(path.join(__dirname, 'korrektur-regnestorm.html'), h);
console.log('Wrote tools/korrektur-regnestorm.html (' + Math.round(h.length / 1024) + ' KB)');

// ---------- Robotkoden ----------
(function () {
  var RK = require(path.join(ROOT, 'robotkoden/engine.js')), LV = require(path.join(ROOT, 'robotkoden/levels.js'));
  var rk = strings('robotkoden/strings-da.js').rk;
  var COLORS = { '#': '#9C876B', '.': '#FBF6EA', B: '#8DD17E', G: '#F7C548' };
  function board(l) {
    var s = '<div style="display:inline-grid;grid-template-columns:repeat(' + l.cols + ',14px);gap:1px;background:#e3d6bb;padding:1px;border-radius:4px">';
    for (var r = 0; r < l.rows; r++) for (var c = 0; c < l.cols; c++) {
      var ch = l.grid[r][c], isStart = r === l.start.r && c === l.start.c;
      s += '<span style="width:14px;height:14px;background:' + (isStart ? '#6BB8E0' : COLORS[ch]) + '"></span>';
    }
    return s + '</div>';
  }
  var k = '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – Robotkoden</title><style>' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
    'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}' +
    'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#FFF3D6}td.k{color:#7A5A3E;width:24%;font-size:13px}td.ok{width:44px}pre{margin:6px 0 0;font-size:12px;color:#555}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: Robotkoden</h1><p>Genereret ' + date + '. Alle tekster, et barn kan møde i Robotkoden.</p>' +
    '<div class="intro"><p><strong>Sådan bruger du arket:</strong> Læs teksterne, og sæt et flueben, når en tekst er i orden. Knapper og beskeder rettes i <code>robotkoden/strings-da.js</code>, banernes titler og tips i <code>robotkoden/levels.js</code>.</p>' +
    '<p>Allerede kontrolleret automatisk: stavning (hunspell da_DK), og at alle 40 baner kan løses med tre stjerner.</p></div>' +
    '<h2>1. Knapper og beskeder</h2><table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>' + rows(rk) + '</table>' +
    '<h2>2. Verdener</h2><table><tr><th>Verden</th><th>Tekst</th><th>OK</th></tr>' +
    LV.worlds.map(function (w) { return '<tr><td class="k">' + w.id + '</td><td><strong>' + esc(w.name) + '</strong> – ' + esc(w.desc) + ' (' + esc(w.from) + ')</td><td class="ok"></td></tr>'; }).join('') + '</table>' +
    '<h2>3. Baner: titel, tip og Bobs forslag</h2><p>Blå felt = robotten, grøn = batteri, gul = ladestation.</p><table><tr><th>Bane</th><th>Tekst</th><th>OK</th></tr>';
  LV.defs.forEach(function (d) {
    var l = RK.buildLevel(d);
    k += '<tr><td class="k">' + d.id + '<br>' + board(l) + '</td><td><strong>' + esc(d.title) + '</strong><br>Tip: ' + esc(d.hint) +
      (d.pre ? '<br>Starter med et program med fejl.' : '') + '<pre>' + esc(RK.toCode(l.solution)) + '</pre></td><td class="ok"></td></tr>';
  });
  k += '</table></body></html>';
  fs.writeFileSync(path.join(__dirname, 'korrektur-robotkoden.html'), k);
  console.log('Wrote tools/korrektur-robotkoden.html (' + Math.round(k.length / 1024) + ' KB)');
})();

// ---------- Ordjægeren ----------
(function () {
  var OJ = require(path.join(ROOT, 'ordjaegeren/words.js')), oj = strings('ordjaegeren/strings-da.js').oj;
  function tr(cells) { return '<tr>' + cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="k"' : '') + '>' + c + '</td>'; }).join('') + '<td class="ok"></td></tr>'; }
  var k = '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – Ordjægeren</title><style>' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
    'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}h3{margin:18px 0 6px}' +
    'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#FFF3D6}td.k{color:#7A5A3E;width:18%;font-size:13px}td.ok{width:44px}.a{color:#2E6E2A;font-weight:700}.x{color:#B03A2E}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: Ordjægeren</h1><p>Genereret ' + date + '. Alt indhold i Ordjægeren. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder.</p>' +
    '<div class="intro"><p><strong>Det er allerede kontrolleret automatisk:</strong></p><ul>' +
    '<li>Alle ord og sætninger er stavekontrolleret med den danske ordbog (hunspell da_DK).</li>' +
    '<li>De forkerte stavemåder er kontrolleret mod ordbogen uden sammensætninger, så »desvære« og »egenlig« ikke slipper igennem. Står der »(rigtigt ord)«, er det et rigtigt ord, som tydeligt ikke passer i sætningen.</li>' +
    '<li>Ordklasse-ordene er tjekket mod Danish Dependency Treebank (UD Danish-DDT), så ord, der også kan være en anden ordklasse, er fjernet.</li>' +
    '<li>Reglerne for komma, nogle/nogen og ad/af følger Dansk Sprognævn og sproget.dk. Kommaøvelserne bruger kun kommaer, der skal sættes uanset startkomma.</li></ul>' +
    '<p><strong>Det skal et menneske vurdere:</strong> om sætningerne lyder naturlige, om de passer til alderen, og om der kun er ét rigtigt svar. Ret i <code>ordjaegeren/words.js</code> (indhold) og <code>ordjaegeren/strings-da.js</code> (knapper og beskeder).</p></div>' +
    '<h2>1. Knapper og beskeder</h2><table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>' + rows(oj) + '</table>' +
    '<h2>2. Regler (vises efter et forkert svar)</h2><table><tr><th>Regel</th><th>Tekst</th><th>OK</th></tr>' +
    Object.keys(OJ.rules).map(function (r) { return tr([esc(OJ.rules[r].name), esc(OJ.rules[r].text)]); }).join('') + '</table>' +
    '<h2>3. Stavning: ord, sætninger og forkerte stavemåder</h2>';
  ['M', 'U'].forEach(function (b) {
    k += '<h3>' + (b === 'M' ? 'Mellemtrin' : 'Udskoling') + '</h3><table><tr><th>Regel</th><th>Sætning · rigtigt ord · forkerte</th><th>OK</th></tr>';
    OJ.spelling.filter(function (x) { return x.b === b; }).forEach(function (x) {
      k += tr([esc(OJ.rules[x.r].name), esc(x.s) + '<br><span class="a">' + esc(x.w) + '</span> · ' + x.x.map(function (y) { return '<span class="x">' + esc(y) + '</span>' + ((x.rw || []).indexOf(y) >= 0 ? ' (rigtigt ord)' : ''); }).join(', ')]);
    });
    k += '</table>';
  });
  k += '<h2>4. Ordklasser (Mellemtrin)</h2><table><tr><th>Ordklasse</th><th>Ord</th><th>OK</th></tr>' +
    Object.keys(OJ.classes).map(function (c) { return tr([OJ.classNames[c], esc(OJ.classes[c].join(', '))]); }).join('') + '</table>';
  k += '<h2>5. Hul i sætningen</h2>';
  var lastRule = null;
  OJ.gaps.forEach(function (g) {
    if (g.r !== lastRule) { if (lastRule) k += '</table>'; k += '<h3>' + esc(OJ.rules[g.r].name) + ' (' + (g.b === 'M' ? 'mellemtrin' : 'udskoling') + ')</h3><table><tr><th></th><th>Sætning · rigtigt · forkert</th><th>OK</th></tr>'; lastRule = g.r; }
    k += tr(['', esc(g.s) + '<br><span class="a">' + esc(g.a) + '</span> · <span class="x">' + esc(g.x.join(', ')) + '</span>']);
  });
  k += '</table><h2>6. Komma (udskoling)</h2><table><tr><th></th><th>Sætning med det rigtige komma</th><th>OK</th></tr>' +
    OJ.commas.map(function (c) { return tr(['', esc(c.split('|')[0]) + '<span class="a">,</span>' + esc(c.split('|')[1])]); }).join('') + '</table>';
  k += '<h2>7. Faste udtryk (udskoling)</h2><table><tr><th>Udtryk</th><th>Betydning · forkerte</th><th>OK</th></tr>' +
    OJ.idioms.map(function (d) { return tr([esc(d.u), '<span class="a">' + esc(d.a) + '</span><br><span class="x">' + esc(d.x.join(' · ')) + '</span>']); }).join('') + '</table>';
  k += '<h2>8. Ekspeditioner</h2><table><tr><th>Trin</th><th>Navn og beskrivelse</th><th>OK</th></tr>' +
    OJ.routes.map(function (r) { return tr([r.b === 'M' ? 'Mellemtrin' : 'Udskoling', '<strong>' + esc(r.name) + '</strong> – ' + esc(r.desc)]); }).join('') + '</table>';
  k += '<h2>Kilder</h2><ul><li><a href="https://test.dsn.dk/wp-content/uploads/2021/01/Komma-basisreglerne.pdf">Dansk Sprognævn: Komma – basisreglerne</a></li>' +
    '<li><a href="https://dsn.dk/wp-content/uploads/2021/01/Nogen-eller-nogle_rettelse_2024-1.pdf">Dansk Sprognævn: Nogen eller nogle</a></li>' +
    '<li><a href="https://sproget.dk/raad-og-regler/typiske-problemer/ad-eller-af">sproget.dk: Ad eller af</a></li>' +
    '<li><a href="https://github.com/UniversalDependencies/UD_Danish-DDT">UD Danish-DDT (ordklasser)</a></li></ul></body></html>';
  fs.writeFileSync(path.join(__dirname, 'korrektur-ordjaegeren.html'), k);
  console.log('Wrote tools/korrektur-ordjaegeren.html (' + Math.round(k.length / 1024) + ' KB)');
})();

/* ---------- Verdensrejsen ---------- */
(function () {
  global.window = global;
  var P = require(path.join(ROOT, 'verdensrejsen/places.js')), M = require(path.join(ROOT, 'verdensrejsen/maps.js')), vr = strings('verdensrejsen/strings-da.js').vr;
  function tr(cells) { return '<tr>' + cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="k"' : '') + '>' + c + '</td>'; }).join('') + '<td class="ok"></td></tr>'; }
  function T(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; }); }
  function gen(n) { if (/^[A-ZÆØÅ]+$/.test(n)) return n + "'s"; if (/[sxz]$/i.test(n)) return n + "'"; return n + 's'; } // same rule as game.js
  function pop(p) {
    if (p >= 1e9) return T(vr.mia, { n: String(Math.round(p / 1e8) / 10).replace('.', ',') });
    if (p >= 1e6) { var m = p / 1e6; return T(vr.mio, { n: m >= 10 ? Math.round(m) : String(Math.round(m * 10) / 10).replace('.', ',') }); }
    return String(Math.round(p / 1000) * 1000).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function pt(key, id) { return M[key].points.filter(function (p) { return p.id === id; })[0] || {}; }
  function coord(p) { return p.lat === undefined ? '' : '<span class="c">' + p.lat.toFixed(2).replace('.', ',') + '° N, ' + p.lon.toFixed(2).replace('.', ',') + '° Ø</span>'; }
  function osm(p) { return p.lat === undefined ? '' : ' <a href="https://www.openstreetmap.org/?mlat=' + p.lat + '&mlon=' + p.lon + '#map=9/' + p.lat + '/' + p.lon + '">kort</a>'; }
  function countryRows(src, key) {
    return Object.keys(src).sort(function (a, b) { return src[a].da.localeCompare(src[b].da, 'da'); }).map(function (id) {
      var c = src[id], f = M.facts[id] || {}, p = pt(key, 'cap-' + id);
      return tr([id, '<strong>' + esc(c.da) + '</strong>' + (c.quiz === false ? ' <em>(vises kun på kortet)</em>' : '') +
        (c.cap ? '<br>Hovedstad: <span class="a">' + esc(c.cap) + '</span> ' + coord(p) + osm(p) + '<br><span class="q">' + esc(T(vr.capitalQ, { land: gen(c.da) })) + '</span>' : '') +
        (f.pop ? '<br><span class="c">' + esc(T(vr.factPop, { pop: pop(f.pop), year: f.year })) + ' · ' + esc(T(vr.factContinent, { c: vr.continents[f.cont] || f.cont })) + '</span>' : '')]);
    }).join('');
  }
  var k = '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – Verdensrejsen</title><style>' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
    'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}h3{margin:18px 0 6px}' +
    'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#FFF3D6}td.k{color:#7A5A3E;width:18%;font-size:13px}td.ok{width:44px}.a{color:#2E6E2A;font-weight:700}.q{color:#2F7DB3;font-style:italic}.c{color:#7A5A3E;font-size:13px}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: Verdensrejsen</h1><p>Genereret ' + date + '. Alle stednavne, hovedstæder, spor og tekster i Verdensrejsen. <span class="a">Grøn</span> = det rigtige svar, <span class="q">blå kursiv</span> = sådan bliver spørgsmålet stillet.</p>' +
    '<div class="intro"><p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-verdensrejsen.js</code>):</p><ul>' +
    '<li>Alle tekster og spor er stavekontrolleret med den danske ordbog (hunspell da_DK). Stednavne, som ikke står i ordbogen (fx Podgorica, Gobiørkenen), er listet i testen og tjekket mod Lex.</li>' +
    '<li>Hovedstæderne er sammenholdt med Natural Earth (engelske navne). Forskellene er kun danske stavemåder (Bruxelles/Brussels, Kyiv/Kiev) og Astana, som Natural Earth stadig kalder Nur-Sultan.</li>' +
    '<li>Hver by ligger i Danmark, hver ø og hvert land kan findes ved at trykke midt på det, og byerne ligger i den rigtige rækkefølge nord-syd og øst-vest.</li>' +
    '<li>Kompasopgaverne bruger kun bypar, hvor retningen tydeligt er en af de otte retninger (højst 12° fra midten) og byerne ligger mindst ca. 60 km fra hinanden.</li>' +
    '<li>Sporene nævner aldrig landets navn eller hovedstad.</li></ul>' +
    '<p><strong>Det skal et menneske vurdere:</strong> de danske navne (følger Lex), om sporene er rigtige og passer til alderen, og om teksterne lyder naturlige. ' +
    'Klik på »kort« ved en by for at se den på OpenStreetMap. Ret i <code>verdensrejsen/places.js</code> (steder og spor) og <code>verdensrejsen/strings-da.js</code> (knapper og beskeder). ' +
    'Kortene laves med <code>node tools/build-verdensrejsen.js</code>.</p></div>' +
    '<h2>1. Knapper og beskeder</h2><table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>' + rows(vr) + '</table>' +
    '<h2>2. Rejser</h2><table><tr><th>Trin</th><th>Navn og beskrivelse</th><th>OK</th></tr>' +
    P.routes.map(function (r) { return tr([r.b === 'M' ? 'Mellemtrin' : 'Udskoling', '<strong>' + esc(r.name) + '</strong> – ' + esc(r.desc)]); }).join('') + '</table>' +
    '<h2>3. Byer i Danmark</h2><table><tr><th></th><th>By · placering</th><th>OK</th></tr>' +
    P.towns.map(function (tw) { var p = pt('dk', tw.id); return tr(['', '<strong>' + esc(tw.da) + '</strong> ' + coord(p) + osm(p) + '<br><span class="q">' + esc(T(vr.find, { name: tw.da })) + '</span>']); }).join('') + '</table>' +
    '<h2>4. Øer og landsdele</h2><table><tr><th></th><th>Navn · vises som</th><th>OK</th></tr>' +
    P.islands.map(function (is) { return tr(['', '<strong>' + esc(is.da) + '</strong> · ' + esc(is.id === 'jylland' ? vr.kinds.halvoe : vr.kinds.oe)]); }).join('') + '</table>' +
    '<h2>5. Norden</h2><table><tr><th>Kode</th><th>Land · hovedstad · fakta</th><th>OK</th></tr>' + countryRows(P.norden, 'norden') + '</table>' +
    '<h2>6. Europa</h2><table><tr><th>Kode</th><th>Land · hovedstad · fakta</th><th>OK</th></tr>' + countryRows(P.europe, 'europe') + '</table>' +
    '<h2>7. Verden</h2><table><tr><th>Kode</th><th>Land · hovedstad · fakta</th><th>OK</th></tr>' + countryRows(P.world, 'world') + '</table>' +
    '<h2>8. Verdensdele, have og natur</h2><table><tr><th>Slags</th><th>Navn</th><th>OK</th></tr>' +
    P.continents.map(function (c) { return tr([vr.kinds.verdensdel, '<strong>' + esc(c.da) + '</strong> <span class="q">' + esc(T(vr.findContinent, { name: c.da })) + '</span>']); }).join('') +
    P.seas.map(function (s) { return tr([['atlanterhavet', 'stillehavet', 'indiske'].indexOf(s.id) >= 0 ? vr.kinds.ocean : vr.kinds.hav, '<strong>' + esc(s.da) + '</strong> <span class="q">' + esc(T(vr.findSea, { name: s.da })) + '</span>']); }).join('') +
    P.ranges.map(function (r) { return tr([r.kind === 'ørken' ? vr.kinds['ørken'] : vr.kinds.bjerge, '<strong>' + esc(r.da) + '</strong>']); }).join('') +
    P.rivers.map(function (r) { return tr([vr.kinds.flod, '<strong>' + esc(r.da) + '</strong>']); }).join('') + '</table>' +
    '<h2>9. Sporjagt</h2><p>Spor 1 og 3 bliver lavet ud fra tallene, spor 2 er skrevet i hånden.</p><table><tr><th>Land</th><th>Spor 1 · 2 · 3</th><th>OK</th></tr>' +
    Object.keys(P.clues).filter(function (id) { return P.world[id]; }).map(function (id) {
      var f = M.facts[id];
      return tr([esc(P.world[id].da), esc(T(vr.clueContinent, { c: vr.continents[f.cont], pop: pop(f.pop) })) + '<br>' + esc(P.clues[id]) + '<br>' + esc(T(vr.clueCapital, { cap: P.world[id].cap }))]);
    }).join('') + '</table>' +
    '<h2>Kilder</h2><ul><li><a href="https://lex.dk/Europas_hovedst%C3%A6der">Lex: Europas hovedstæder</a> og Lex-artiklerne om de enkelte lande (danske navne)</li>' +
    '<li><a href="https://www.naturalearthdata.com/">Natural Earth</a> (kort, grænser, hovedstæder, indbyggertal – public domain)</li>' +
    '<li><a href="https://www.geonames.org/">GeoNames</a> (placering af danske byer – CC BY 4.0)</li></ul></body></html>';
  fs.writeFileSync(path.join(__dirname, 'korrektur-verdensrejsen.html'), k);
  console.log('Wrote tools/korrektur-verdensrejsen.html (' + Math.round(k.length / 1024) + ' KB)');
})();

/* ---------- Laboratoriet ---------- */
(function () {
  global.window = global;
  require(path.join(ROOT, 'laboratoriet/sim.js'));
  var L = require(path.join(ROOT, 'laboratoriet/content.js')), lab = strings('laboratoriet/strings-da.js').lab;
  function tr(cells) { return '<tr>' + cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="k"' : '') + '>' + c + '</td>'; }).join('') + '<td class="ok"></td></tr>'; }
  function rngf(seed) { return function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }
  function opts(list, right) { return list.map(function (o) { return o === right ? '<span class="a">' + esc(o) + '</span>' : '<span class="x">' + esc(o) + '</span>'; }).join(' · '); }
  function show(c) {
    var out = '<strong>' + esc(c.q) + '</strong>';
    if (c.options) out += '<br>' + opts(c.options, c.answer);
    if (c.type === 'calc') out += '<br>Svar: <span class="a">' + esc(L.num(c.answer) + ' ' + c.unit) + '</span>';
    if (c.type === 'build' && typeof c.answer !== 'undefined') out += '<br>Løsning: <span class="a">' + esc(Array.isArray(c.answer) ? c.answer.join(' og ') : String(c.answer)) + '</span>';
    if (c.items && c.type === 'order') out += '<br>Rækkefølge: <span class="a">' + esc(c.items.map(function (x) { return x.name; }).join(' → ')) + '</span>';
    if (c.items && c.type === 'sort') out += '<br>' + c.bins.map(function (b) { return '<em>' + esc(b.name) + ':</em> ' + esc(c.items.filter(function (x) { return x.bin === b.id; }).map(function (x) { return x.name; }).join(', ')); }).join(' · ');
    if (c.result) out += '<br><span class="q">Forsøget viser: ' + esc(c.result) + '</span>';
    if (c.explain) out += '<br><em>' + esc(c.explain.q) + '</em><br>' + opts(c.explain.options, c.explain.answer);
    if (c.hint) out += '<br><span class="c">Tip: ' + esc(c.hint) + '</span>';
    if (typeof c.solution === 'string') out += '<br><span class="c">Løsning: ' + esc(c.solution) + '</span>';
    if (c.after) out += '<br><span class="c">' + esc(c.after) + '</span>';
    return out;
  }
  var date = new Date().toISOString().slice(0, 10);
  var k = '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – Laboratoriet</title><style>' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
    'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}h3{margin:18px 0 6px}' +
    'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#FFF3D6}td.k{color:#7A5A3E;width:18%;font-size:13px}td.ok{width:44px}.a{color:#2E6E2A;font-weight:700}.x{color:#B03A2E}.q{color:#2F7DB3}.c{color:#7A5A3E;font-size:14px}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: Laboratoriet</h1><p>Genereret ' + date + '. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder, <span class="q">blå</span> = det, forsøget viser.</p>' +
    '<div class="intro"><p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-laboratoriet.js</code>, ca. 92.000 tjek):</p><ul>' +
    '<li>Al tekst er stavekontrolleret med den danske ordbog (hunspell da_DK). Sammensatte ord er desuden gennemgået i hånden.</li>' +
    '<li>Simulationerne regner rigtigt: Ohms lov, serie- og parallelforbindelser, kortslutning, momenter på vippen, udveksling, titrering, flyde/synke (Arkimedes) og 10 %-reglen i fødekæder.</li>' +
    '<li>Hver opgave er lavet 300 gange pr. forsøg, og svaret er kontrolleret mod simulationen: fx at pæren faktisk lyser med det materiale, at vippen faktisk er i balance med løsningen, og at båden synker med ét lod mere.</li>' +
    '<li>Alle fødekæder starter med en producent. Massefylder og pH-værdier står i afsnit 5 med kilder.</li></ul>' +
    '<p><strong>Det skal et menneske vurdere:</strong> om spørgsmålene er klare, om de forkerte svar er rimelige at gætte på, og om forklaringerne passer til alderen. ' +
    'Ret i <code>laboratoriet/content.js</code> (forsøg, tal og forklaringer) og <code>laboratoriet/strings-da.js</code> (knapper og beskeder). Opgaverne laves af generatorer, så her ses to eksempler på hver.</p></div>' +
    '<h2>1. Knapper og beskeder</h2><table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>' + rows(lab) + '</table>' +
    '<h2>2. Opdagelser i logbogen</h2><table><tr><th>Titel</th><th>Tekst</th><th>OK</th></tr>' +
    Object.keys(L.facts).map(function (f) { return tr([esc(L.facts[f].t), esc(L.facts[f].x)]); }).join('') + '</table>' +
    '<h2>3. Stationer og forsøg</h2><table><tr><th>Trin</th><th>Station · forsøg</th><th>OK</th></tr>' +
    L.routes.map(function (r) { var s = L.stations.filter(function (x) { return x.id === r.st; })[0]; return tr([r.b === 'M' ? 'Mellemtrin' : 'Udskoling', esc(s.name + ' (' + s.desc + ') · ' + r.name)]); }).join('') + '</table>' +
    '<h2>4. Alle opgaver</h2>';
  L.routes.forEach(function (r) {
    k += '<h3>' + esc(r.name) + ' (' + (r.b === 'M' ? 'mellemtrin' : 'udskoling') + ')</h3><table><tr><th>Opgave</th><th>Spørgsmål, svar og forklaring</th><th>OK</th></tr>';
    var ids = []; r.plan.forEach(function (g) { (Array.isArray(g) ? g : [g]).forEach(function (x) { if (ids.indexOf(x) < 0) ids.push(x); }); });
    ids.forEach(function (id) { var firstQ = null; [11, 29].forEach(function (seed, j) { var c = L.gen[id](rngf(seed * 31 + id.length), {}, r.b); if (j && c.q === firstQ) return; firstQ = c.q; k += tr([j ? '' : esc(id) + '<br>(' + c.type + ')', show(c)]); }); });
    k += '</table>';
  });
  k += '<h2>5. Tal og fakta</h2><h3>Massefylde (g/cm³)</h3><table><tr><th>Ting</th><th>Massefylde · i vand</th><th>OK</th></tr>' +
    Object.keys(L.objects).map(function (o) { var x = L.objects[o]; return tr([esc(x.name), L.num(x.rho) + ' · ' + (x.rho < 1 ? 'flyder' : 'synker') + (x.note ? ' (' + esc(x.note) + ')' : '')]); }).join('') +
    Object.keys(L.liquids).map(function (o) { var x = L.liquids[o]; return tr([esc(x.name), L.num(x.rho) + ' (væske)']); }).join('') + '</table>' +
    '<h3>pH-værdier (afrundede, typiske)</h3><table><tr><th>Væske</th><th>pH · sur/neutral/basisk</th><th>OK</th></tr>' +
    Object.keys(L.substances).map(function (o) { var x = L.substances[o]; return tr([esc(x.name), L.num(x.pH) + ' · ' + window.LabSim.acidity(x.pH)]); }).join('') + '</table>' +
    '<h3>Leder strøm?</h3><table><tr><th>Materiale</th><th>Leder</th><th>OK</th></tr>' +
    Object.keys(L.materials).map(function (o) { var x = L.materials[o]; return tr([esc(x.name), x.cond ? (x.R ? 'ja, men dårligere end metal' : 'ja') : 'nej (isolator)']); }).join('') + '</table>' +
    '<h3>Fødekæder</h3><table><tr><th>Hvor</th><th>Kæde</th><th>OK</th></tr>' +
    L.chains.map(function (c) { return tr([esc(c.where), esc(c.ids.map(function (i) { return L.organisms[i].name + ' (' + L.roleName[L.organisms[i].role].toLowerCase() + ')'; }).join(' → '))]); }).join('') + '</table>' +
    '<h2>Kilder</h2><ul><li>Massefylder: afrundede værdier fra fysiske opslagsværker (fx kork 0,24, is 0,92, glas 2,5, jern 7,9 g/cm³)</li>' +
    '<li><a href="https://www.chemie.de/lexikon/Bromthymolblau.html">Bromthymolblåt: omslag ved pH 5,8–7,6 (gul → grøn → blå)</a></li>' +
    '<li><a href="https://videnskab.dk/miljo-naturvidenskab/eksperiment-med-rodkalssaft">Videnskab.dk: Eksperiment med rødkålssaft</a> og <a href="https://www.kemifokus.dk/sjov-med-roedkaal">Kemifokus: Sjov med rødkål</a></li>' +
    '<li><a href="https://www.caryinstitute.org/sites/default/files/public/downloads/curriculum-project/4A1_pH_reading.pdf">Cary Institute: pH-værdier for almindelige væsker</a></li>' +
    '<li><a href="https://www.cei.washington.edu/lesson-plans-resources/draw-a-circuit-fun-with-graphite">University of Washington: grafit leder strøm</a></li>' +
    '<li>Forudsig–observér–forklar (POE) er en kendt undervisningsmetode i naturfag.</li></ul></body></html>';
  fs.writeFileSync(path.join(__dirname, 'korrektur-laboratoriet.html'), k);
  console.log('Wrote tools/korrektur-laboratoriet.html (' + Math.round(k.length / 1024) + ' KB)');
})();

/* ---------- Fase 2: Ordbroen, Tidsmaskinen, Netdetektiven ---------- */
function page(title, intro, body) {
  var date = new Date().toISOString().slice(0, 10);
  return '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – ' + title + '</title><style>' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
    'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}h3{margin:18px 0 6px}' +
    'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#FFF3D6}td.k{color:#7A5A3E;width:18%;font-size:13px}td.ok{width:44px}.a{color:#2E6E2A;font-weight:700}.x{color:#B03A2E}.q{color:#2F7DB3}.c{color:#7A5A3E;font-size:14px}.en{font-style:italic}' +
    '.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: ' + title + '</h1><p>Genereret ' + date + '. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder.</p>' +
    '<div class="intro">' + intro + '</div>' + body + '</body></html>';
}
function tr2(cells) { return '<tr>' + cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="k"' : '') + '>' + c + '</td>'; }).join('') + '<td class="ok"></td></tr>'; }
function opts2(right, wrong) { return '<span class="a">' + esc(right) + '</span> · ' + wrong.map(function (w) { return '<span class="x">' + esc(w) + '</span>'; }).join(' · '); }
function bandName(b) { return b === 'M' ? 'Mellemtrin' : 'Udskoling'; }
var TH = '<table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>';

/* Ordbroen */
(function () {
  global.window = global;
  var D = require(path.join(ROOT, 'ordbroen/words.js')), ob = strings('ordbroen/strings-da.js').ob;
  var en = function (s) { return '<span class="en" lang="en">' + esc(s) + '</span>'; };
  var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(ob) + '</table>' +
    '<h2>2. Ruter</h2>' + TH + D.routes.map(function (r) { return tr2([bandName(r.b), '<strong>' + esc(r.name) + '</strong> – ' + esc(r.desc)]); }).join('') + '</table>' +
    '<h2>3. Ordforråd</h2><p>Britisk stavning først; amerikansk stavning (godkendes også) står i parentes.</p>' +
    D.themes.map(function (th) { return '<h3>' + esc(th.name || th.id) + ' (' + bandName(th.b).toLowerCase() + ')</h3><table><tr><th>Engelsk</th><th>Dansk</th><th>OK</th></tr>' +
      th.words.map(function (w) { return tr2([en(w[0]) + (w[2] ? ' (' + en(w[2]) + ')' : ''), esc(w[1])]); }).join('') + '</table>'; }).join('') +
    '<h2>4. Sætninger at bygge</h2><table><tr><th>Dansk</th><th>Engelsk</th><th>OK</th></tr>' + D.sentences.map(function (s) { return tr2([esc(s.da), en(s.en)]); }).join('') + '</table>' +
    '<h2>5. Grammatik – regler</h2>' + TH + Object.keys(D.rules).map(function (k) { return tr2([esc(D.rules[k].name), esc(D.rules[k].text)]); }).join('') + '</table>' +
    '<h2>6. Grammatik – udfyld hullet</h2><table><tr><th>Regel</th><th>Sætning · svar · forkerte</th><th>OK</th></tr>' + D.gaps.map(function (g) { return tr2([esc(D.rules[g.r].name) + '<br>' + bandName(g.b), en(g.s) + '<br>' + opts2(g.a, g.x)]); }).join('') + '</table>' +
    '<h2>7. Uregelmæssige udsagnsord</h2><table><tr><th>Dansk</th><th>Navneform · datid · førnutid</th><th>OK</th></tr>' + D.verbs.map(function (v) { return tr2([esc(v[3]), en(v[0] + ' – ' + v[1] + ' – ' + v[2]) + (v[4] ? ' (US: ' + en(v[4]) + ')' : '')]); }).join('') + '</table>' +
    '<h2>8. Falske venner</h2><table><tr><th>Engelsk</th><th>Rigtigt dansk · forkerte · forklaring</th><th>OK</th></tr>' + D.falseFriends.map(function (f) { return tr2([en(f[0]), opts2(f[1], [f[2]].concat(f[4])) + '<br><span class="c">' + esc(f[2]) + ' hedder ' + esc(f[3]) + ' på engelsk</span>']); }).join('') + '</table>' +
    '<h2>9. Udtryk</h2><table><tr><th>Engelsk</th><th>Betydning · forkerte</th><th>OK</th></tr>' + D.idioms.map(function (i) { return tr2([en(i[0]), opts2(i[1], i[2])]); }).join('') + '</table>' +
    '<h2>10. Læsetekster</h2>' + D.texts.map(function (t) { return '<h3>' + esc(t.title) + ' (' + bandName(t.b).toLowerCase() + ')</h3><table><tr><td colspan="2">' + en(t.text) + '</td><td class="ok"></td></tr>' + t.qs.map(function (q) { return tr2([(t.b === 'U' ? en(q[0]) : esc(q[0])), opts2(q[1], q[2])]); }).join('') + '</table>'; }).join('') +
    '<h2>11. Ros og startreplikker på engelsk</h2>' + TH + D.praise.concat(D.startLines).map(function (s) { return tr2(['', en(s)]); }).join('') + '</table>';
  var intro = '<p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-ordbroen.js</code>):</p><ul>' +
    '<li>Alle engelske ord og sætninger er stavekontrolleret med britisk ordbog (hunspell en_GB), de amerikanske stavemåder med en_US, og alt dansk med da_DK.</li>' +
    '<li>To ord i samme tema har aldrig samme danske oversættelse, så valgmulighederne er entydige.</li>' +
    '<li>De forkerte bøjninger af udsagnsord (fx »goed«) er ikke rigtige engelske ord, og alle huller har netop ét rigtigt svar blandt valgene.</li></ul>' +
    '<p><strong>Det skal et menneske vurdere:</strong> oversættelserne, om sætningerne lyder naturlige, og om forklaringerne passer til alderen. Ret i <code>ordbroen/words.js</code> og <code>ordbroen/strings-da.js</code>.</p>';
  var k = page('Ordbroen', intro, b);
  fs.writeFileSync(path.join(__dirname, 'korrektur-ordbroen.html'), k);
  console.log('Wrote tools/korrektur-ordbroen.html (' + Math.round(k.length / 1024) + ' KB)');
})();

/* Tidsmaskinen */
(function () {
  var D = require(path.join(ROOT, 'tidsmaskinen/events.js')), tm = strings('tidsmaskinen/strings-da.js').tm;
  function periodOf(y) { for (var i = D.periods.length - 1; i >= 0; i--) if (y >= D.periods[i].from) return D.periods[i]; return D.periods[0]; }
  var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(tm) + '</table>' +
    '<h2>2. Rejser</h2>' + TH + D.routes.map(function (r) { return tr2([bandName(r.b), '<strong>' + esc(r.name) + '</strong> – ' + esc(r.desc)]); }).join('') + '</table>' +
    '<h2>3. Perioder</h2>' + TH + D.periods.map(function (p) { return tr2([esc(p.name), esc(p.yt)]); }).join('') + '</table>' +
    '<h2>4. Begivenheder</h2><p>K = med i historiekanonen, V = verdensbegivenhed. Perioden er den, spillet regner ud fra årstallet.</p><table><tr><th>Årstal · periode</th><th>Titel og beskrivelse</th><th>OK</th></tr>' +
    D.events.slice().sort(function (a, b) { return a.y - b.y; }).map(function (e) {
      return tr2([esc(e.yt) + '<br>' + (e.noPeriod ? '(ingen periode-opgave)' : esc(periodOf(e.y).name)) + '<br>' + bandName(e.b) + (e.canon ? ' · K' : '') + (e.world ? ' · V' : ''), '<strong>' + esc(e.t) + '</strong><br>' + esc(e.d)]);
    }).join('') + '</table>' +
    '<h2>5. Livet dengang</h2><table><tr><th>Periode</th><th>Ting</th><th>OK</th></tr>' + D.things.map(function (th) { return tr2([esc(D.periods.filter(function (p) { return p.id === th[1]; })[0].name), esc(th[0])]); }).join('') + '</table>' +
    '<h2>6. Kilder</h2>' + D.sources.map(function (s) {
      return '<h3>' + esc(s.title) + '</h3><table><tr><td class="k">' + esc(s.kind) + (s.real ? '<br>(ægte kilde)' : '<br>(skrevet til spillet)') + '</td><td><em>' + esc(s.text) + '</em></td><td class="ok"></td></tr>' +
        s.qs.map(function (q) { return tr2([esc(q[0]), opts2(q[1], q[2])]); }).join('') + '</table>';
    }).join('') +
    '<h2>Kilder til fakta</h2><ul><li><a href="https://lex.dk/Tidslinje_for_100_Danmarkshistorier">Lex: Tidslinje for 100 Danmarkshistorier</a> og Lex-artiklerne om de enkelte begivenheder, fx <a href="https://lex.dk/Kielerfreden">Kielerfreden</a>, <a href="https://lex.dk/Dansk_Vestindien">Dansk Vestindien</a> og <a href="https://lex.dk/MYTE_Gjorde_stavnsb%C3%A5ndets_l%C3%B8sning_i_1788_de_danske_b%C3%B8nder_frie%3F">Stavnsbåndets ophævelse</a></li>' +
    '<li>Historiekanonen i Fælles Mål for historie (emu.dk), revideret 2023 med »Nordatlanten og rigsfællesskabet«</li></ul>';
  var intro = '<p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-tidsmaskinen.js</code>, ca. 23.000 tjek):</p><ul>' +
    '<li>Al tekst er stavekontrolleret (hunspell da_DK). Navne er ikke med i stavekontrollen og skal læses her.</li>' +
    '<li>Perioderne hænger sammen uden huller, og alle 29 punkter i historiekanonen er med.</li>' +
    '<li>Alle opgaver er lavet mange gange: det rigtige svar er altid blandt valgene, valgene er forskellige, »hvad kom først« og tidslinjer er i rigtig rækkefølge, og »imens i verden« ligger højst 60 år fra hinanden.</li>' +
    '<li>Årstal og beskrivelser er faktatjekket mod Lex, og fejlene fra tjekket er rettet.</li></ul>' +
    '<p><strong>Det skal et menneske vurdere:</strong> om beskrivelserne er rigtige og passer til alderen, og om kilderne er rimelige. Ret i <code>tidsmaskinen/events.js</code> og <code>tidsmaskinen/strings-da.js</code>.</p>';
  var k = page('Tidsmaskinen', intro, b);
  fs.writeFileSync(path.join(__dirname, 'korrektur-tidsmaskinen.html'), k);
  console.log('Wrote tools/korrektur-tidsmaskinen.html (' + Math.round(k.length / 1024) + ' KB)');
})();

/* Netdetektiven */
(function () {
  var D = require(path.join(ROOT, 'netdetektiven/cases.js')), nd = strings('netdetektiven/strings-da.js').nd;
  var bins = {}; D.shareBins.forEach(function (x) { bins[x.id] = x.name; });
  var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(nd) + '</table>' +
    '<h2>2. Sager</h2>' + TH + D.routes.map(function (r) { return tr2([bandName(r.b), '<strong>' + esc(r.name) + '</strong> – ' + esc(r.desc)]); }).join('') + '</table>' +
    '<h2>3. Beskeder</h2><table><tr><th>Svar</th><th>Besked · spor · forklaring</th><th>OK</th></tr>' + D.mails.map(function (m) {
      return tr2([bandName(m.b) + '<br>' + (m.safe ? '<span class="a">Sikker</span>' : '<span class="x">Snyd</span>'), '<span class="c">Fra: ' + esc(m.from) + '</span><br><strong>' + esc(m.subject) + '</strong><br>' + esc(m.body) +
        '<ul>' + m.parts.map(function (p) { return '<li><b>' + esc(p[0]) + ':</b> ' + esc(p[1]) + '</li>'; }).join('') + '</ul><em>' + esc(m.signs) + '</em>']);
    }).join('') + '</table>' +
    '<h2>4. Kodeord</h2><table><tr><th>Stærkt · svagt</th><th>Forklaring</th><th>OK</th></tr>' + D.passwordPairs.map(function (p) { return tr2(['<span class="a">' + esc(p[0]) + '</span><br><span class="x">' + esc(p[1]) + '</span>', esc(p[2])]); }).join('') + '</table>' +
    '<p>Kort til kodeordsmaskinen: ' + D.passwordCards.map(function (c) { return c.personal ? '<span class="x">' + esc(c.w) + '</span>' : esc(c.w); }).join(', ') + ' (røde afslører noget om barnet).</p>' +
    '<h2>5. Del eller lad være</h2><table><tr><th>Svar</th><th>Ting</th><th>OK</th></tr>' + D.shareItems.map(function (s) { return tr2([esc(bins[s[1]]), esc(s[0])]); }).join('') + '</table>' +
    '<h2>6. Hvad gør du?</h2><table><tr><th>Trin</th><th>Situation · svar · forklaring</th><th>OK</th></tr>' + D.scenarios.map(function (s) { return tr2([bandName(s[0]), '<strong>' + esc(s[1]) + '</strong><br>' + opts2(s[2], s[3]) + '<br><em>' + esc(s[4]) + '</em>']); }).join('') + '</table>' +
    '<h2>7. Kildejagten (udskoling)</h2>' + D.sourceSets.map(function (s) {
      return '<h3>' + esc(s.claim) + '</h3><table>' + s.pages.map(function (p, i) { return tr2([i === s.best ? '<span class="a">Bedst</span>' : '', '<strong>' + esc(p[0]) + '</strong><br>' + esc(p[1])]); }).join('') +
        tr2(['Hvorfor?', opts2(s.why[0], s.why[1])]) + '</table>';
    }).join('') +
    '<h2>8. Ægte eller redigeret? (udskoling)</h2><table><tr><th></th><th>Billede · svar · forklaring</th><th>OK</th></tr>' + D.imageCases.map(function (c) { return tr2(['', esc(c[0]) + '<br>' + opts2(c[1], c[2]) + '<br><em>' + esc(c[3]) + '</em>']); }).join('') + '</table>' +
    '<h2>9. Data og algoritmer (udskoling)</h2><table><tr><th></th><th>Spørgsmål · svar · forklaring</th><th>OK</th></tr>' + D.dataQuiz.map(function (c) { return tr2(['', '<strong>' + esc(c[0]) + '</strong><br>' + opts2(c[1], c[2]) + '<br><em>' + esc(c[3]) + '</em>']); }).join('') +
    tr2(['Feed', esc(nd.promptFeed.replace('{topic}', 'katte')) + '<br>' + opts2(nd.feedMore.replace('{topic}', 'katte'), [nd.feedMore.replace('{topic}', 'musik'), nd.feedAll]) + '<br><em>' + esc(nd.feedExplain) + '</em>']) + '</table>';
  var intro = '<p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-netdetektiven.js</code>):</p><ul>' +
    '<li>Al tekst er stavekontrolleret (hunspell da_DK). Opdigtede navne og webadresser er ikke med og skal læses her.</li>' +
    '<li>Ingen rigtige firmaer, apps eller hjemmesider er nævnt (testen leder efter en lang liste af kendte navne). Alle adresser er opdigtede, og spillet sender ingenting nogen steder hen.</li>' +
    '<li>Mobning, nøgenbilleder, falske profiler og AI-billeder findes kun i udskolingen.</li>' +
    '<li>Hver runde har det rigtige svar blandt valgene, og hver besked har mindst to spor.</li></ul>' +
    '<p><strong>Det skal et menneske vurdere:</strong> om tonen er rolig og tryg, om rådene er rigtige, og om beskederne ligner det, børn møder i dag. »Spørg en voksen« er altid et godt valg i spillet. Ret i <code>netdetektiven/cases.js</code> og <code>netdetektiven/strings-da.js</code>.</p>';
  var k = page('Netdetektiven', intro, b);
  fs.writeFileSync(path.join(__dirname, 'korrektur-netdetektiven.html'), k);
  console.log('Wrote tools/korrektur-netdetektiven.html (' + Math.round(k.length / 1024) + ' KB)');
})();

/* Mærker, Bobs garderobe og dagens udfordring */
(function () {
  global.window = global;
  var Bob = require(path.join(ROOT, 'shared/mascot/bob.js')), B = require(path.join(ROOT, 'shared/badges.js')), core = strings('shared/strings-da.js').core;
  function title(id) { return core.games.filter(function (g) { return g.id === id; })[0].title; }
  function T(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; }); }
  var AV = require(path.join(ROOT, 'shared/games.js')).map(function (m) { return m.id; }), DEFS = B.defs(AV);
  var rows = DEFS.map(function (b) {
    var name = b.game ? T(core.badgeGameName, { name: core.gameBadgeNames[b.game], level: core.badgeLevels[b.level - 1] }) : core.badges[b.id][0];
    var how = b.game ? T(core.badgeHow[b.level - 1], { game: title(b.game) }) : core.badges[b.id][1];
    var look = {}; look[b.reward[0]] = b.reward[1];
    return '<tr><td class="k">' + esc(core.badgeGroups[b.group]) + '</td><td><strong>' + esc(name) + '</strong><br>' + esc(how) + '<br><span class="c">' + esc(T(core.badgeUnlocks, { item: core.looks[b.reward[0]][b.reward[1]] })) + '</span></td><td style="width:90px">' +
      Bob.svg({ expression: 'happy', size: 80, look: look }) + '</td><td class="ok"></td></tr>';
  }).join('');
  var dailyKeys = Object.keys(core).filter(function (k) { return /^daily|^restDay|^prevMonth|^nextMonth|^parent(Badges|Streak)/.test(k); });
  var daily = {}; dailyKeys.forEach(function (k) { daily[k] = core[k]; });
  var intro = '<p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-badges-daily.js</code> og <code>node tools/e2e-hub.js</code>):</p><ul>' +
    '<li>Alle ' + DEFS.length + ' mærker kan opnås, og hvert mærke giver Bob sin egen ting. Alle ' + DEFS.length + ' ting kan låses op. Spil, der er planlagt men ikke bygget endnu, har deres mærker og ting klar, men de vises først, når spillet kommer med.</li>' +
    '<li>Reglerne for dage i træk er afprøvet over et helt simuleret år: én glemt dag om ugen er en hviledag og tæller med, to glemte dage i samme uge bryder rækken, og dagen i dag bryder den ikke, før den er gået.</li>' +
    '<li>Dagens tre opgaver er de samme efter en genindlæsning, de kommer fra tre forskellige spil, og alle ' + AV.length + ' spils små opgaver er afprøvet 120 gange hver (rigtigt svar blandt valgene, samme opgave for samme dag).</li>' +
    '<li>Al tekst er stavekontrolleret (hunspell da_DK).</li></ul>' +
    '<p><strong>Det skal et menneske vurdere:</strong> navnene på mærkerne, om forklaringerne er til at forstå for et barn, og Bobs nye ting. Teksterne står i <code>shared/strings-da.js</code>, tegningerne i <code>shared/mascot/bob.js</code>.</p>';
  var b = '<h2>1. Mærkerne</h2><table><tr><th>Gruppe</th><th>Navn · sådan får man det · belønning</th><th>Bob</th><th>OK</th></tr>' + rows + '</table>' +
    '<h2>2. Teksterne på mærkesiden og i garderoben</h2>' + TH + rows2({ badgesButton: core.badgesButton, badgesTitle: core.badgesTitle, badgesIntro: core.badgesIntro, badgesCount: core.badgesCount, badgeNew: core.badgeNew, badgesNew: core.badgesNew, badgeLocked: core.badgeLocked, dressTitle: core.dressTitle, dressIntro: core.dressIntro, dressNone: core.dressNone, dressDefault: core.dressDefault, dressLocked: core.dressLocked, lookCats: core.lookCats }) + '</table>' +
    '<h2>3. Dagens udfordring og kalenderen</h2>' + TH + rows2(daily) + '</table>';
  function rows2(o) { return rows_(o); }
  var k = page('Mærker og dagens udfordring', intro, b);
  fs.writeFileSync(path.join(__dirname, 'korrektur-maerker.html'), k);
  console.log('Wrote tools/korrektur-maerker.html (' + Math.round(k.length / 1024) + ' KB)');
})();
function rows_(o) { return rows(o); }

/* Spillene fra fase 2 og 3 har deres egne korrektur-skripter */
['byggepladsen', 'lommepenge', 'taktslaget', 'tankespind', 'gaadehuset', 'labyrinten', 'raketbanen', 'museet', 'opfinder'].forEach(function (g) { require(path.join(__dirname, 'korrektur-' + g + '.js')); });
