// Korrektur-ark for Mysteriet på museet: node tools/korrektur-museet.js  → tools/korrektur-museet.html
// Hele historien, tingene i hver sal, sporene, eksempler på hver gådelås i begge trin (rigtige og forkerte svar, tip,
// forklaringer), Mr. Smiths engelske breve, alle kort i Museets samling med kilde, og eksempler på dagens opgaver.
'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
require('../shared/strings-da.js'); require('../museet/strings-da.js');
var STORY = require('../museet/story.js'), PZ = require('../museet/puzzles.js');
var mu = window.STR.mu, game = null;
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, gameData: function () { return {}; }, profile: function () { return null; } };
require('../museet/game.js');
var t = window.Core.t;

function esc(s) { return String(s).replace(/­/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
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
function link(u) { return '<a href="' + esc(u) + '">' + esc(u) + '</a>'; }
function bandName(b) { return b === 'M' ? 'Mellemtrin' : 'Udskoling'; }
var TH = '<table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>';
function page(title, intro, body) {
  var date = new Date().toISOString().slice(0, 10);
  return '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Korrektur-ark – ' + title + '</title><style>' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2b1d10;max-width:1000px;margin:0 auto;padding:24px 16px;line-height:1.45}' +
    'h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:3px solid #F7C548;padding-bottom:4px}h3{margin:18px 0 6px}' +
    'table{border-collapse:collapse;width:100%;font-size:15px;margin-bottom:8px}td,th{border:1px solid #e3d6bb;padding:6px 8px;vertical-align:top;text-align:left}' +
    'th{background:#FFF3D6}td.k{color:#7A5A3E;width:18%;font-size:13px}td.ok{width:44px}.a{color:#2E6E2A;font-weight:700}.x{color:#B03A2E}.q{color:#2F7DB3}.c{color:#7A5A3E;font-size:14px}' +
    '.ill svg{max-width:100%;height:auto;vertical-align:middle}.scene svg{width:460px;max-width:100%;height:auto;border-radius:8px}.en{font-family:Georgia,serif;background:#FBF3DF;padding:8px 12px;border-radius:8px;white-space:pre-wrap}' +
    '.runes{background:#CFC6B4;border-radius:8px;padding:6px;display:inline-block}.intro{background:#E6F4FC;border-radius:10px;padding:12px 16px}@media print{h2{break-before:page}tr{break-inside:avoid}}</style></head><body>' +
    '<h1>Korrektur-ark: ' + title + '</h1><p>Genereret ' + date + '. <span class="a">Grøn</span> = rigtigt svar, <span class="x">rød</span> = forkerte valgmuligheder.</p>' +
    '<div class="intro">' + intro + '</div>' + body + '</body></html>';
}

var intro = '<p>Mysteriet på museet er et »escape room« i seks sale: Hallen (i dag), Oldtiden, Vikingetiden, Middelalderen, Renæssancen og Loftet (1800-tallet). Historien er den samme for mellemtrin og udskoling, men gåderne og sproget er sværere i udskolingen. Alle personer og »Byens Museum« er opdigtede. Tyven er urmageren; skaden på loftet er et falsk spor.</p>' +
  '<p><b>Det er allerede kontrolleret automatisk</b> (<code>tools/test-museet.js</code>): at alle spor findes og stryger præcis de tre uskyldige, at der er én tyv, at hver gådelås har præcis ét rigtigt svar (hver sal laves 3.000 gange pr. trin, og svarene regnes efter på en anden måde: tidsregning, tidslinje, runer med en selvstændig runetabel, skålvægt og ligninger, brevets tider), at dagens opgaver virker, og at alle danske tekster er stavet rigtigt (hunspell da_DK). De engelske breve er ikke stavekontrolleret som dansk.</p>' +
  '<p><b>Det skal et menneske vurdere:</b> om historien er sjov og venlig, om sproget er naturligt for børn på 8–11 og 12–14 år, om tip og forklaringer er til at forstå, om de engelske breve passer til niveauet, og om fakta på samlingskortene står rigtigt i forhold til kilderne (alle kilder er linket nedenfor).</p>';
var b = '';

/* 1. the story */
b += '<h2>1. Historien</h2>' + TH;
STORY.intro.forEach(function (p, i) { b += tr2(['Start ' + (i + 1), esc(p)]); });
STORY.suspects.forEach(function (s) { b += tr2(['Mistænkt', '<strong>' + esc(s.name) + '</strong>, ' + esc(s.role) + (s.culprit ? ' <span class="x">(tyven)</span>' : '') + ' – ' + esc(s.about)]); });
STORY.ending.forEach(function (p, i) { b += tr2(['Slutning ' + (i + 1), esc(t(p, { T: '21.40' }))]); });
STORY.trueStory.forEach(function (p, i) { b += tr2(['Den sande historie ' + (i + 1), esc(p)]); });
b += tr2(['Kilder til den sande historie', STORY.trueStorySources.map(link).join('<br>')]);
b += '</table>';

/* 2. the rooms, the things to tap and the clues */
b += '<h2>2. Salene, tingene og sporene</h2>';
STORY.rooms.forEach(function (r, i) {
  b += '<h3>Sal ' + (i + 1) + ': ' + esc(r.name) + ' (' + esc(r.era) + ')</h3><div class="scene">' + game._sceneSvg(r.id, 'U', PZ.make(r.id, 'U', rng(40 + i)), r.name) + '</div><table><tr><th>Sted</th><th>Tekst</th><th>OK</th></tr>';
  ['M', 'U'].forEach(function (bd) { b += tr2(['Kortet (' + bandName(bd) + ')', esc(r.desc[bd])]); b += tr2(['Indledning (' + bandName(bd) + ')', esc(r.intro[bd])]); });
  STORY.spots[r.id].forEach(function (s) {
    b += tr2([esc(s.label) + (s.bands ? ' (kun ' + s.bands.map(bandName).join(', ') + ')' : '') + (s.lock ? ' – gådelås' : ''), esc(s.text) + (s.clue ? '<br><span class="c">Spor:</span> ' + esc(STORY.clues.filter(function (c) { return c.id === s.clue; })[0].text) : '') + (s.item ? '<br><span class="c">Ting i lommen:</span> ' + esc(STORY.items[s.item]) : '')]);
  });
  STORY.clues.filter(function (c) { return c.room === r.id && c.when === 'solve'; }).forEach(function (c) { b += tr2(['Spor, når låsen åbner', esc(c.text) + ' <span class="c">({T} = urets klokkeslæt, {instr}/{place}/{start}/{end} fra brevet)</span>']); });
  b += tr2(['Når låsen åbner', esc(STORY.opened[r.id])]);
  ['M', 'U'].forEach(function (bd) { b += tr2(['»Sådan virker det« (' + bandName(bd) + ')', esc(mu.lesson[r.id][bd])]); });
  b += '</table>';
});
b += '<table><tr><th>Spor</th><th>Betydning</th><th>OK</th></tr>';
STORY.clues.forEach(function (c) { b += tr2([esc(c.id), esc(c.text) + '<br><span class="c">' + (c.clears ? 'Giver alibi til ' + esc(STORY.suspects.filter(function (s) { return s.id === c.clears; })[0].name) : c.points ? 'Peger på urmageren' : 'Falsk spor') + (c.bands ? ' · kun udskoling' : '') + '</span>']); });
b += '</table>';

/* 3. the locks: examples per band */
b += '<h2>3. Gådelåsene – eksempler</h2><p class="c">Hver gang en sal spilles, laves en ny gåde. Her er to eksempler pr. trin. Under hvert trin: rigtigt svar, forkerte svar, de to tip og forklaringen.</p>';
function stepRow(pz, st, bd) {
  var pic = '', right = '', wrong = [];
  if (st.kind === 'code') {
    pic = PZ.clockSvg(st.T, 120, 'ur');
    right = st.fields.map(function (f, i) { return f.label + ' ' + st.answer[i]; }).join(', ');
    wrong = [st.fields.map(function (f, i) { return f.label + ' ' + (i === 1 ? (st.answer[i] + 10) % 60 : st.answer[i]); }).join(', ')];
    if (st.signs) pic += '<br><span class="c">Skilte: ' + st.signs.map(function (s) { return s.year + ' ' + esc(s.text); }).join(' · ') + '</span>';
    pic += '<br><span class="c">' + esc(st.rule) + '</span>';
  } else if (st.kind === 'timeline') {
    pic = st.items.map(function (id) { return PZ.findSvg(id, 40); }).join('');
    right = st.answer.map(function (id) { return STORY.finds[id].name + ' (' + (bd === 'M' ? STORY.periods[PZ.find(id).period].name : STORY.finds[id].when) + ')'; }).join(' → ');
    wrong = [st.answer.slice().reverse().map(function (id) { return STORY.finds[id].name; }).join(' → ')];
  } else if (st.kind === 'runes') {
    pic = '<span class="runes">' + PZ.runesSvg(st.runes, { h: 50 }) + '</span>'; right = st.answer; wrong = [st.answer.split('').reverse().join('')];
  } else if (st.kind === 'strike') {
    right = 'Stryg: ' + st.answer.map(function (id) { return STORY.suspects.filter(function (s) { return s.id === id; })[0].name; }).join(', '); wrong = ['Stryg kun Karl Lampe og Mr. Smith', 'Stryg alle fire'];
  } else {
    if (st.runes) pic = '<span class="runes">' + PZ.runesSvg(st.runes, { h: 40 }) + '</span>';
    if (st.kind === 'scale') pic = PZ.scaleSvg(st, null, { w: 300 }) + '<br><span class="c">' + esc(PZ.scaleText(st)) + '</span>';
    right = st.answer; wrong = st.options.filter(function (o) { return o !== st.answer; });
  }
  return tr2([bandName(bd), '<strong class="q">' + esc(st.q) + '</strong>' + (pic ? '<div class="ill">' + pic + '</div>' : '<br>') + opts2(right, wrong) +
    '<br><span class="c">Tip 1:</span> ' + esc(st.hints[0]) + '<br><span class="c">Tip 2:</span> ' + esc(st.hints[1]) + '<br><span class="c">Forklaring:</span> <em>' + esc(st.explain) + '</em>']);
}
STORY.rooms.forEach(function (r, i) {
  b += '<h3>' + esc(r.name) + '</h3><table><tr><th>Trin</th><th>Opgave</th><th>OK</th></tr>';
  ['M', 'U'].forEach(function (bd) {
    [1, 2].forEach(function (k) {
      var pz = PZ.make(r.id, bd, rng(500 + i * 10 + k + (bd === 'U' ? 100 : 0)), { T: PZ.clockTime(bd, rng(k)) });
      if (pz.letter) b += tr2([bandName(bd) + ' – brevet (engelsk)', '<div class="en" lang="en">' + esc(pz.letter) + '</div>']);
      if (pz.where) b += tr2([bandName(bd) + ' – nøglen', esc(t(STORY.opened.vikingetiden, { where: pz.where }))]);
      pz.steps.forEach(function (st) { b += stepRow(pz, st, bd); });
    });
  });
  b += '</table>';
});

/* 4. the English letters */
b += '<h2>4. Mr. Smiths breve (engelsk)</h2><p class="c">Skabelonerne. Ordene i {} skiftes ud: instrument (' + PZ.LETTER.instr.map(function (x) { return x[0]; }).join(', ') + '), sted (' + PZ.LETTER.place.map(function (x) { return x[0]; }).join(', ') + '), søster (' + PZ.LETTER.sis.join(', ') + ') og tiderne.</p><table><tr><th>Trin</th><th>Brev</th><th>OK</th></tr>';
['M', 'U'].forEach(function (bd) { b += tr2([bandName(bd), '<div class="en" lang="en">' + esc(STORY.letters[bd]) + '</div>']); });
b += '</table>';

/* 5. the collection */
b += '<h2>5. Museets samling – fakta og kilder</h2><table><tr><th>Sal og trin</th><th>Kort</th><th>OK</th></tr>';
['M', 'U'].forEach(function (bd) {
  STORY.rooms.forEach(function (r) {
    var c = STORY.cards[bd][r.id];
    b += tr2([esc(r.name) + ' (' + bandName(bd) + ')', '<strong>' + esc(c.title) + '</strong> <span class="c">(' + esc(c.era) + ')</span><br>' + esc(c.fact) + '<br><span class="c">Kilde:</span> ' + [c.src, c.src2].filter(Boolean).map(link).join('<br>')]);
  });
});
b += '</table>';

/* 6. other facts the puzzles use */
b += '<h2>6. Andre fakta i gåderne</h2><table><tr><th>Hvad</th><th>Brugt som</th><th>OK</th></tr>';
Object.keys(STORY.finds).forEach(function (id) { var f = STORY.finds[id]; b += tr2([esc(f.name), esc(f.what) + ' – <strong>' + esc(f.when) + '</strong><br>' + link(f.src)]); });
Object.keys(STORY.periods).forEach(function (id) { var p = STORY.periods[id]; b += tr2([esc(p.name), esc(p.when)]); });
b += tr2(['Kilder til perioderne', STORY.periodSources.map(link).join('<br>')]);
STORY.signs.forEach(function (s) { b += tr2(['Skilt i hallen', s.year + ' – ' + esc(s.text) + '<br>' + link(s.src)]); });
b += tr2(['Runerne', PZ.RUNES.map(function (r) { return '<span class="runes">' + PZ.runeIcon(r.k, 28) + '</span> ' + esc(r.vals.join('/')); }).join(' &nbsp; ') + '<br><span class="c">Vikingetidens 16 runer (langkvistruner). At én rune kan stå for flere lyde (i også e og j, t også d, k også g, b også p): </span>' + link('https://snl.no/runer') + ', ' + link('https://lex.dk/runer')]);
b += tr2(['Skaden', 'En husskade vejer ca. 210 g (i spillet: ca. 200 gram). ' + link('https://naturhistoriskmuseum.dk/viden-forskning/naturlex/fugle/husskade')]);
b += '</table>';

/* 7. buttons and messages */
b += '<h2>7. Knapper og beskeder</h2>' + TH + rows(mu) + '</table>';
b += '<table><tr><th>Ting i lommen</th><th>Tekst</th><th>OK</th></tr>';
Object.keys(STORY.items).forEach(function (k) { b += tr2([esc(k), esc(STORY.items[k])]); });
b += '</table>';

/* 8. the daily challenge */
b += '<h2>8. Dagens udfordring</h2><table><tr><th>Trin</th><th>Opgave</th><th>OK</th></tr>';
var seenQ = {};
['M', 'U'].forEach(function (band) { for (var i = 0; i < 80; i++) {
  var keep = Math.random; Math.random = rng(900 + i + (band === 'U' ? 4000 : 0)); var q = game.quickTask(band, {}); Math.random = keep;
  var key = band + q.q.slice(0, 20); if (seenQ[key]) continue; seenQ[key] = 1;
  b += tr2([bandName(band), '<strong class="q">' + esc(q.q) + '</strong>' + (q.html ? '<div class="ill">' + q.html + '</div>' : '<br>') + opts2(q.answer, q.options.filter(function (o) { return o !== q.answer; })) + '<br><span class="c">Hjælp:</span> ' + esc(q.hint) + '<br><span class="c">Forklaring:</span> <em>' + esc(q.explain) + '</em>']);
} });
b += '</table>';

fs.writeFileSync(path.join(__dirname, 'korrektur-museet.html'), page('Mysteriet på museet', intro, b));
console.log('Wrote tools/korrektur-museet.html');
