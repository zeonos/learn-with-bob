// Korrektur-ark for Taktslaget: node tools/korrektur-taktslaget.js  → tools/korrektur-taktslaget.html
// Alle danske tekster og eksempler på hver opgavetype med rigtige og forkerte svar (samme format som de andre korrektur-ark).
'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
require('../shared/strings-da.js'); require('../taktslaget/strings-da.js');
var M = require('../taktslaget/music.js'), ts = window.STR.ts, game = null, sound;
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function seeded(seed, fn) { var keep = Math.random; Math.random = rng(seed); try { return fn(); } finally { Math.random = keep; } }
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); }, registerGame: function (g) { game = g; },
  setting: function () { return sound; }, audio: function () { return null; }, canSpeak: function () { return false; }, profile: function () { return null; }, seeded: seeded, rng: rng };
require('../taktslaget/game.js');
var G = game._svg;

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

/* illustration of a task, the way the game shows it */
function ill(tk) {
  var s = '';
  switch (tk.kind) {
    case 'rhythm': s = G.rhythm(tk.ids, { ts: '4/4' }); break;
    case 'valueBeats': case 'valueName': s = G.rhythm([tk.dur], { noBars: true, end: false }); break;
    case 'fill': s = G.rhythm(tk.bar, { ts: tk.ts, miss: tk.miss }) + tk.options.map(function (o) { return G.rhythm([o], { noBars: true, end: false }); }).join(''); break;
    case 'sum': s = G.rhythm(tk.ids, { noBars: true }); break;
    case 'timeSig': s = G.rhythm(tk.bar, {}); break;
    case 'whichBar': s = tk.bars.map(function (b, i) { return (i + 1) + ': ' + G.rhythm(b, { barU: M.TIME[tk.ts] }); }).join(' '); break;
    case 'noteKey': case 'noteName': s = G.staff([{ ms: [tk.m] }]); break;
    case 'noteFind': s = tk.notes.map(function (m, i) { return (i + 1) + ': ' + G.staff([{ ms: [m] }], { colW: 40 }); }).join(' '); break;
    case 'higher': case 'step': case 'direction': s = G.staff(tk.notes.map(function (m, k) { return { ms: [m], label: tk.kind === 'direction' ? null : String(k + 1) }; })); break;
    case 'dyn': s = tk.levels.map(function (lv, k) { return (k + 1) + ': ' + G.staff(tk.notes.map(function (m) { return { ms: [m] }; }), { colW: 34 }) + G.dyn(lv); }).join(' '); break;
    case 'dynSign': s = G.dyn(tk.sign); break;
    case 'instrPic': case 'instrFamily': case 'windType': s = G.inst(tk.inst, 90); break;
    case 'instrDesc': s = '<em>' + esc(M.instrument(tk.inst).desc) + '</em>'; break;
    case 'instrLow': s = tk.insts.map(function (id) { return G.inst(id, 70); }).join(''); break;
    case 'chordName': s = G.staff([{ ms: M.chordNotes(tk.chord), whole: true }], { colW: 60 }); break;
    case 'intervalName': case 'readMelody': s = G.staff(tk.notes.map(function (m) { return { ms: [m] }; })); break;
    case 'scaleMissing': s = G.staff(M.C_DUR.map(function (m, i) { return i === tk.miss ? { q: true } : { ms: [m], whole: true }; }), { colW: 34 }); break;
    case 'hearMelody': s = tk.melodies.map(function (mm, i) { return (i + 1) + ': ' + G.staff(mm.map(function (m) { return { ms: [m] }; }), { colW: 34 }); }).join(' '); break;
    case 'durmol': case 'third': case 'semis': case 'halfsteps': s = '<span class="c">Klaver med markerede tangenter: ' + esc(tk.notes.map(M.name).join(', ')) + '</span>'; break;
  }
  return s ? '<div class="ill">' + s + '</div>' : '';
}
function example(tk, band) {
  var wrong = tk.options ? tk.options.filter(function (o) { return o !== tk.answer; }).map(function (o) { return game._label(tk, o); }) : [];
  var ans = tk.options ? opts2(game._label(tk, tk.answer), wrong) : tk.kind === 'build' ? '<span class="a">Tangenterne ' + esc(M.seq(M.chordNotes(tk.chord))) + '</span>' : tk.kind === 'noteKey' || tk.kind === 'noteName' ? '<span class="a">Tangenten ' + esc(M.name(tk.m)) + '</span>' : '<span class="a">Tryk rytmen på trommen</span>';
  var pic = ill(tk), tempo = tk.bpm ? ' <span class="c">(tempo ' + tk.bpm + (tk.kind === "beat" ? ', bandet spiller ' + tk.stopAt + ' af 8 slag' : '') + ')</span>' : '';
  return '<strong class="q">' + esc(game._prompt(tk)) + '</strong>' + tempo + (pic || '<br>') + ans + '<br><span class="c">Hjælp efter første forkerte svar:</span> ' + esc(game._hint(tk, band)) + '<br><span class="c">Forklaring:</span> <em>' + esc(game._explain(tk)) + '</em>';
}

var b = '<h2>1. Knapper og beskeder</h2>' + TH + rows(ts) + '</table>';
b += '<h2>2. Øvelser og musikere</h2>' + TH + M.ROUTES.map(function (r) { return tr2([bandName(r.b), '<strong>' + esc(r.name.replace(/­/g, '')) + '</strong> – ' + esc(r.desc) + '<br><span class="c">Ny musiker: ' + esc(ts.musicians[r.musician]) + '</span>']); }).join('') + '</table>';
b += '<h2>3. Nodeværdier, taktarter og dynamik</h2><table><tr><th>Tegn</th><th>Navn · varighed i slag (4/4, 3/4, 2/4)</th><th>OK</th></tr>' +
  Object.keys(M.DUR).map(function (id) { return tr2([G.rhythm([id], { noBars: true, end: false }), esc(M.DUR[id].name) + ' · ' + esc(M.beatsText(M.DUR[id].u)) + ' slag']); }).join('') +
  M.DYNAMICS.map(function (d) { return tr2([G.dyn(d.sign), esc(d.name) + ' = ' + esc(d.meaning)]); }).join('') + '</table>';
b += '<h2>4. Toner, intervaller, akkorder og skala</h2><table><tr><th>Emne</th><th>Indhold</th><th>OK</th></tr>' +
  tr2(['Tonenavne', 'c, d, e, f, g, a, h (h, ikke b). Sorte tangenter med kryds: ' + esc(M.CHROMA.filter(function (x) { return x.length > 1; }).join(', '))]) +
  tr2(['Nodelinjer (G-nøgle)', G.staff(M.naturals(57, 84).map(function (m) { return { ms: [m], label: M.name(m) }; }), { colW: 26 })]) +
  tr2(['Intervaller', esc(M.INTERVALS.join(', '))]) +
  tr2(['Akkorder', M.CHORDS.map(function (c) { return esc(M.chordLabel(c.id) + ': ' + M.seq(M.chordNotes(c.id))); }).join('<br>')]) +
  tr2(['C-dur-skalaen', esc(M.seq(M.C_DUR)) + '<br>' + G.staff(M.C_DUR.map(function (m) { return { ms: [m], whole: true }; }), { colW: 30 })]) + '</table>';
b += '<h2>5. Instrumenter</h2><table><tr><th>Tegning</th><th>Navn · familie · beskrivelse</th><th>OK</th></tr>' + M.INSTRUMENTS.map(function (x) {
  return tr2([G.inst(x.id, 70), '<strong>' + esc(x.name) + '</strong> (' + (x.et ? 'et' : 'en') + ') · ' + esc(M.family(x.fam).name) + (x.wind ? ' · ' + esc(M.WIND[x.wind]) : '') + '<br>' + esc(x.desc)]);
}).join('') + '</table><table><tr><th>Familie</th><th>Sådan laver man lyd</th><th>OK</th></tr>' + M.FAMILIES.map(function (f) { return tr2([esc(f.name), esc(f.how)]); }).join('') + '</table>';
b += '<h2>6. Spørgsmål om bandet</h2><table><tr><th></th><th>Spørgsmål · svar · forklaring</th><th>OK</th></tr>' + M.BAND_QUIZ.map(function (q) { return tr2(['', '<strong>' + esc(q[0]) + '</strong><br>' + opts2(q[1], q[2]) + '<br><em>' + esc(q[3]) + '</em>']); }).join('') + '</table>';

b += '<h2>7. Eksempler på alle opgavetyper</h2><p>To eksempler pr. type (tilfældige, men faste). Typer, der bruger lyd, vises også, som de ser ud, når lyden er slået fra.</p>';
var seed = 1;
M.ROUTES.forEach(function (r) {
  b += '<h3>' + esc(r.name.replace(/­/g, '')) + ' (' + bandName(r.b).toLowerCase() + ')</h3><table><tr><th>Type</th><th>Opgave · svar · hjælp · forklaring</th><th>OK</th></tr>';
  var kinds = M.PLAN[r.kind][r.b].filter(function (k, i, a) { return a.indexOf(k) === i; });
  kinds.forEach(function (k) {
    [0, 1].forEach(function (j) {
      var tk = seeded(seed++ * 7919 + j * 104729, function () { return M.gen[k](r.b, j ? 6 : 1); });
      sound = undefined; b += tr2([esc(k) + (j ? '' : ''), example(tk, r.b)]);
      if (j === 0 && ['higher', 'step', 'direction', 'dyn', 'durmol', 'hearMelody'].indexOf(k) >= 0) { sound = false; b += tr2([esc(k) + '<br>(uden lyd)', example(tk, r.b)]); sound = undefined; }
    });
  });
  b += '</table>';
});
b += '<h2>8. Dagens udfordring (eksempler)</h2><table><tr><th>Trin</th><th>Spørgsmål · svar · hjælp · forklaring</th><th>OK</th></tr>';
['M', 'U'].forEach(function (band) {
  for (var s = 1; s <= 6; s++) {
    var q = seeded(s * 31 + (band === 'U' ? 1000 : 0), function () { return game.quickTask(band, {}); });
    b += tr2([bandName(band), '<strong class="q">' + esc(q.q) + '</strong>' + (q.html ? '<div class="ill">' + q.html + '</div>' : '<br>') + opts2(q.answer, q.options.filter(function (o) { return o !== q.answer; })) + '<br><span class="c">Hjælp:</span> ' + esc(q.hint) + '<br><span class="c">Forklaring:</span> <em>' + esc(q.explain) + '</em>']);
  }
});
b += '</table>';
b += '<h2>9. Komponisten</h2><table><tr><th>Eksempel</th><th>Delekode</th><th>OK</th></tr>' + M.PRESETS.map(function (p) { return tr2([esc(p.name), '<code>' + esc(M.encodeSong(M.preset(p.id))) + '</code>']); }).join('') + '</table>' +
  '<p class="c">Koden har formen TAKT1:tempo-stortromme-lilletromme-hi-hat-melodi-tjektegn. En forkert eller ufuldstændig kode afvises med beskeden »' + esc(ts.importFail) + '«</p>';
b += '<h2>Kilder til fakta</h2><ul>' +
  '<li>Fælles Mål for musik (Børne- og Undervisningsministeriet, emu.dk): musik er obligatorisk i 1.–6. klasse, med kompetencemål efter 2., 4. og 6. klassetrin inden for musikudøvelse, musikalsk skaben og musikforståelse. Mellemtrinnet er kernen i spillet; udskolingsdelen er ekstra stof.</li>' +
  '<li>Dansk tonenavngivning: c, d, e, f, g, a, h (b betyder på dansk det sænkede h), og dansk oktavbetegnelse (c1 = enstreget c). Se fx <a href="https://lex.dk/tonenavne">Lex: tonenavne</a>.</li>' +
  '<li>Kammertonen a1 = 440 Hz (international standard ISO 16).</li>' +
  '<li>Almindelig musikteori: nodeværdier og pauser, taktarter, intervaller (prim–oktav), stor terts = 4 halvtonetrin og lille terts = 3, dur- og molakkorder som grundtone, terts og kvint, durskalaens trin hel-hel-halv-hel-hel-hel-halv.</li>' +
  '<li>Instrumenter: saxofon og tværfløjte regnes til træblæserne (rørblad / man blæser over et hul), trompet, basun og tuba til messingblæserne; klaveret har 88 tangenter og hamre, der slår på strenge. Se fx Lex-artiklerne <a href="https://lex.dk/saxofon">saxofon</a>, <a href="https://lex.dk/tv%C3%A6rfl%C3%B8jte">tværfløjte</a> og <a href="https://lex.dk/klaver">klaver</a>.</li>' +
  '<li>»Mester Jakob« er en gammel fransk folkemelodi (»Frère Jacques«) og er fri af ophavsret. Kun melodien er med, ingen tekst. »Bobs beat« og »Rocktrommer« er lavet til spillet.</li></ul>';

var intro = '<p><strong>Det er allerede kontrolleret automatisk</strong> (<code>node tools/test-taktslaget.js</code>, ca. 630.000 tjek):</p><ul>' +
  '<li>Al tekst og alle forklaringer er stavekontrolleret (hunspell da_DK). Kun »tonetrinet«, »Jakob« og tegnene pp og ff står på en lille undtagelsesliste.</li>' +
  '<li>Tonenavnene er danske (h, aldrig b), og hver tones plads på nodelinjerne og antallet af hjælpelinjer passer med en fast tabel fra lille a til trestreget c.</li>' +
  '<li>18.000 takter og rytmer er lavet og lagt sammen: de passer alle præcis til taktarten. I »Hvad mangler?« er det kun det rigtige svar, der gør takten fuld.</li>' +
  '<li>Akkorder, intervaller og C-dur-skalaen er regnet efter med halvtonetrin, og alle opgaver er lavet tusindvis af gange: det rigtige svar er altid blandt valgene, og valgene er forskellige.</li>' +
  '<li>Rytmebedømmelsen er testet: tryk til tiden og inden for marginen godkendes, tryk uden for marginen, manglende og ekstra tryk afvises, og den kalibrerede forsinkelse trækkes fra. Delekoder kan læses igen, og forkerte koder afvises.</li></ul>' +
  '<p><strong>Det skal et menneske vurdere:</strong> om teksterne er naturligt dansk og passer til alderen, om instrumenttegningerne er til at genkende, om rytmerne føles rimelige at trykke efter, og om lyden er behagelig. Ret i <code>taktslaget/strings-da.js</code> og <code>taktslaget/music.js</code>.</p>';
var html = page('Taktslaget', intro, b);
fs.writeFileSync(path.join(__dirname, 'korrektur-taktslaget.html'), html);
console.log('Wrote tools/korrektur-taktslaget.html (' + Math.round(html.length / 1024) + ' KB)');
