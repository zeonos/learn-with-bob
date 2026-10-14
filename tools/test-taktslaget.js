// Taktslaget: checks the music theory, every task generator, rhythm judging, the share code and the Danish spelling.
// Run: node tools/test-taktslaget.js  (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../taktslaget/strings-da.js');
var M = require('../taktslaget/music.js'), S = window.STR.ts, execFileSync = require('child_process').execFileSync;
var game = null, soundSetting;
// the same seeded generator as Core.rng (mulberry32), so quickTask can be checked for determinism
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function seeded(seed, fn) { var keep = Math.random; Math.random = rng(seed); try { return fn(); } finally { Math.random = keep; } }
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }); },
  registerGame: function (g) { game = g; }, setting: function () { return soundSetting; }, audio: function () { return null; }, canSpeak: function () { return false; }, profile: function () { return null; }, seeded: seeded, rng: rng };
require('../taktslaget/game.js');
var fails = 0, checks = 0;
function check(ok, msg) { checks++; if (!ok) { fails++; if (fails < 60) console.log('FAIL', msg); } }
function uniq(a) { return new Set(a).size === a.length; }

/* ---------- 1. Danish note names and the staff (independent facts) ---------- */
// white keys from lille a (57) to trestreget c (84), with the Danish name, the place on a treble staff (0 = bottom line e1) and the number of ledger lines
var FACTS = [[57, 'a', -4, 2], [59, 'h', -3, 1], [60, 'c', -2, 1], [62, 'd', -1, 0], [64, 'e', 0, 0], [65, 'f', 1, 0], [67, 'g', 2, 0], [69, 'a', 3, 0], [71, 'h', 4, 0],
  [72, 'c', 5, 0], [74, 'd', 6, 0], [76, 'e', 7, 0], [77, 'f', 8, 0], [79, 'g', 9, 0], [81, 'a', 10, 1], [83, 'h', 11, 1], [84, 'c', 12, 2]];
FACTS.forEach(function (f) {
  check(M.name(f[0]) === f[1], 'name of ' + f[0] + ' is ' + f[1] + ' (got ' + M.name(f[0]) + ')');
  check(M.staffPos(f[0]) === f[2], 'staff position of ' + f[1] + ' (' + f[0] + ') is ' + f[2] + ' (got ' + M.staffPos(f[0]) + ')');
  check(M.ledgers(M.staffPos(f[0])).length === f[3], 'ledger lines for ' + f[0]);
  check(M.onLine(f[2]) === (f[2] % 2 === 0), 'line/space ' + f[0]);
});
// the five lines of the treble staff are e1 g1 h1 d2 f2, the spaces f1 a1 c2 e2; g1 is the second line (the G clef curls around it)
check([64, 67, 71, 74, 77].map(M.name).join('') === 'eghdf' && [64, 67, 71, 74, 77].every(function (m) { return M.onLine(M.staffPos(m)); }), 'lines are e g h d f');
check([65, 69, 72, 76].map(M.name).join('') === 'face' && [65, 69, 72, 76].every(function (m) { return !M.onLine(M.staffPos(m)); }), 'spaces are f a c e');
check(M.staffPos(67) === 2, 'g1 on the second line');
check(M.LETTERS.join('') === 'cdefgah', 'Danish letters c d e f g a h');
check(M.CHROMA.indexOf('b') < 0 && M.name(71) === 'h' && M.name(70) === 'ais', 'h, never b');
for (var m = 21; m <= 108; m++) { var pcx = ((m % 12) + 12) % 12; check(M.isNatural(m) === [0, 2, 4, 5, 7, 9, 11].indexOf(pcx) >= 0, 'natural ' + m); if (M.isNatural(m)) check(M.fromDiatonic(M.diatonic(m)) === m, 'diatonic round trip ' + m); }
check(Math.abs(M.freq(69) - 440) < 1e-9 && Math.abs(M.freq(60) - 261.6256) < 0.001 && Math.abs(M.freq(81) - 880) < 1e-9, 'a1 = 440 Hz, c1 = 261.63 Hz');
check(M.fullName(60) === 'c1' && M.fullName(57) === 'a' && M.fullName(72) === 'c2', 'Danish octave names');

/* ---------- 2. Note values and bars (every bar adds up) ---------- */
var BEATS = { hel: 4, halv: 2, fjerdedel: 1, ottendedel: 0.5, sekstendedel: 0.25, phalv: 3, pfjerdedel: 1.5, rhel: 4, rhalv: 2, rfjerdedel: 1, rottendedel: 0.5 };
var TS = { '4/4': 4, '3/4': 3, '2/4': 2 };
function beats(ids) { return ids.reduce(function (a, id) { return a + BEATS[id]; }, 0); }
function bt(b) { var w = Math.floor(b), f = b - w; return (w ? String(w) : '') + ({ 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' })[f]; }
Object.keys(BEATS).forEach(function (id) { check(M.DUR[id] && M.DUR[id].u / 4 === BEATS[id], 'duration of ' + id); check(M.beatsText(M.DUR[id].u) === bt(BEATS[id]), 'beats text ' + id); });
check(M.DUR.hel.name === 'helnode' && M.DUR.halv.name === 'halvnode' && M.DUR.fjerdedel.name === 'fjerdedelsnode' && M.DUR.ottendedel.name === 'ottendedelsnode', 'Danish note value names');
var nBars = 0;
['M', 'U'].forEach(function (band) {
  Object.keys(TS).forEach(function (ts) {
    if (band === 'M' && ts !== '4/4') return;
    for (var i = 0; i < 3000; i++) { var bar = M.genBar(ts, band, 2); nBars++; check(beats(bar) === TS[ts], 'bar adds up to ' + ts + ': ' + bar.join(' ')); if (fails > 50) break; }
  });
  for (var i = 0; i < 3000; i++) {
    var lv = i % 3, bars = band === 'U' && i % 2 ? 2 : 1, r = M.genRhythm(band, lv, bars);
    nBars++;
    check(beats(r.ids) === 4 * bars, 'rhythm adds up to ' + bars + ' bar(s) of 4/4: ' + r.ids.join(' '));
    var pos = 0, on = []; r.ids.forEach(function (id) { if (!/^r/.test(id)) on.push(pos); pos += BEATS[id]; });
    check(JSON.stringify(on) === JSON.stringify(r.onsets) && r.onsets.length >= 3 * bars, 'rhythm onsets ' + r.ids.join(' '));
    check(!/^r/.test(r.ids[0]), 'rhythm starts with a note');
    if (band === 'M') check(r.ids.every(function (id) { return ['fjerdedel', 'ottendedel', 'halv', 'rfjerdedel'].indexOf(id) >= 0; }), 'mellemtrin rhythms use simple values');
  }
});

/* ---------- 3. Chords, intervals and the scale (from semitone math) ---------- */
var LET = 'cdefgah', NAT = [0, 2, 4, 5, 7, 9, 11];
function letterOf(m) { return LET[NAT.indexOf(((m % 12) + 12) % 12)]; }
function stepCount(a, b) { var da = Math.floor(a / 12) * 7 + NAT.indexOf(a % 12), db = Math.floor(b / 12) * 7 + NAT.indexOf(b % 12); return Math.abs(db - da) + 1; }
var CHORD_FACTS = { C: ['c – e – g', 'dur'], F: ['f – a – c', 'dur'], G: ['g – h – d', 'dur'], Am: ['a – c – e', 'mol'], Dm: ['d – f – a', 'mol'], Em: ['e – g – h', 'mol'] };
M.CHORDS.forEach(function (c) {
  var n = M.chordNotes(c.id);
  check(M.seq(n) === CHORD_FACTS[c.id][0] && c.type === CHORD_FACTS[c.id][1], 'chord ' + c.id + ' = ' + CHORD_FACTS[c.id][0]);
  check(n[1] - n[0] === (c.type === 'dur' ? 4 : 3) && n[2] - n[1] === (c.type === 'dur' ? 3 : 4) && n[2] - n[0] === 7, 'chord ' + c.id + ' built from thirds');
  check(stepCount(n[0], n[1]) === 3 && stepCount(n[0], n[2]) === 5, 'chord ' + c.id + ' is root, third, fifth');
});
check(M.chordLabel('Am') === 'a-mol (Am)' && M.chordLabel('G') === 'G-dur (G)', 'chord labels');
var IV = ['prim', 'sekund', 'terts', 'kvart', 'kvint', 'sekst', 'septim', 'oktav'];
[[60, 60, 'prim', 0], [60, 62, 'sekund', 2], [60, 64, 'terts', 4], [62, 65, 'terts', 3], [60, 65, 'kvart', 5], [60, 67, 'kvint', 7], [60, 69, 'sekst', 9], [60, 71, 'septim', 11], [60, 72, 'oktav', 12]].forEach(function (x) {
  check(M.intervalName(x[0], x[1]) === x[2] && x[1] - x[0] === x[3], 'interval ' + x[2]);
});
check(M.thirdQuality(60, 64) === 'stor' && M.thirdQuality(62, 65) === 'lille' && M.thirdQuality(69, 72) === 'lille' && M.thirdQuality(67, 71) === 'stor', 'big and small thirds');
check(JSON.stringify(M.C_DUR) === JSON.stringify([60, 62, 64, 65, 67, 69, 71, 72]) && M.seq(M.C_DUR) === 'c – d – e – f – g – a – h – c', 'C major scale');
var steps = []; for (var k = 1; k < 8; k++) steps.push(M.C_DUR[k] - M.C_DUR[k - 1]);
check(steps.join('') === '2212221', 'C major: half steps between e–f and h–c');
check(M.seq(M.majorScale(67)) === 'g – a – h – c – d – e – fis – g', 'G major has fis');

/* ---------- 4. Every generator, many times, answers recomputed independently ---------- */
var INST_FAM = { violin: 'Strengeinstrumenter', cello: 'Strengeinstrumenter', kontrabas: 'Strengeinstrumenter', guitar: 'Strengeinstrumenter', elguitar: 'Strengeinstrumenter', elbas: 'Strengeinstrumenter',
  tvaerfloejte: 'Blæseinstrumenter', blokfloejte: 'Blæseinstrumenter', klarinet: 'Blæseinstrumenter', saxofon: 'Blæseinstrumenter', trompet: 'Blæseinstrumenter', basun: 'Blæseinstrumenter', tuba: 'Blæseinstrumenter',
  trommesaet: 'Slagtøj', xylofon: 'Slagtøj', baekken: 'Slagtøj', klaver: 'Tangentinstrumenter', keyboard: 'Tangentinstrumenter' };
var WIND = { tvaerfloejte: 'træblæser', blokfloejte: 'træblæser', klarinet: 'træblæser', saxofon: 'træblæser', trompet: 'messingblæser', basun: 'messingblæser', tuba: 'messingblæser' };
var DEEPEST = ['kontrabas', 'tuba', 'elbas'];
var DYN = { pp: 'meget svagt', p: 'svagt', f: 'kraftigt', ff: 'meget kraftigt', '<': 'gradvist kraftigere', '>': 'gradvist svagere' };
function verify(tk, band) {
  var a = tk.answer, id = tk.kind;
  if (tk.options) check(uniq(tk.options) && tk.options.indexOf(a) >= 0 && tk.options.length >= 2 && tk.options.length <= 4, id + ': answer among unique options ' + JSON.stringify(tk.options) + ' / ' + a);
  switch (id) {
    case 'beat': check(tk.bpm >= 60 && tk.bpm <= 120 && tk.beats === 8 && (tk.stopAt === 4 || tk.stopAt === 8), 'beat task'); break;
    case 'rhythm': check(beats(tk.ids) === 4 * tk.bars, 'rhythm task adds up'); check(M.margin(60000 / tk.bpm, tk.minGap) < tk.minGap * 60000 / tk.bpm / 2, 'margin is less than half the shortest gap'); break;
    case 'valueBeats': check(a === bt(BEATS[tk.dur]), 'valueBeats ' + tk.dur); break;
    case 'valueName': check(a === M.DUR[tk.dur].name, 'valueName'); break;
    case 'fill':
      var rest = beats(tk.bar.filter(function (x, i) { return i !== tk.miss; }));
      check(beats(tk.bar) === TS[tk.ts], 'fill bar adds up');
      tk.options.forEach(function (o) { check((rest + BEATS[o] === TS[tk.ts]) === (o === a), 'fill: only the answer fills the bar (' + o + ')'); });
      check(band === 'U' || tk.ts === '4/4', 'mellemtrin only 4/4'); break;
    case 'sum': check(a === bt(beats(tk.ids)), 'sum'); break;
    case 'timeSig': check(TS[a] === beats(tk.bar) && Object.keys(TS).filter(function (x) { return TS[x] === beats(tk.bar); }).length === 1, 'time signature'); break;
    case 'whichBar': check(tk.bars.filter(function (b) { return beats(b) === TS[tk.ts]; }).length === 1 && beats(tk.bars[+a]) === TS[tk.ts], 'whichBar: exactly one full bar'); break;
    case 'noteKey': check(a === String(tk.m) && tk.keys.indexOf(a) >= 0 && tk.m >= 60 && tk.m <= 72 && M.isNatural(tk.m), 'noteKey'); break;
    case 'noteName': check(a === letterOf(tk.m) && tk.keys.indexOf(a) >= 0 && tk.m >= 57 && tk.m <= 84, 'noteName'); break;
    case 'noteFind': check(tk.notes.filter(function (n) { return letterOf(n) === tk.letter; }).length === 1 && letterOf(tk.notes[+a]) === tk.letter, 'noteFind'); break;
    case 'higher': check(a === (tk.notes[0] === tk.notes[1] ? 'same' : tk.notes[1] > tk.notes[0] ? 'second' : 'first'), 'higher'); break;
    case 'step': var sc = stepCount(tk.notes[0], tk.notes[1]); check(a === 'small' ? sc === 2 : sc >= 5, 'step size ' + sc); check(Math.abs(tk.notes[1] - tk.notes[0]) >= (a === 'small' ? 1 : 6), 'step semitones'); break;
    case 'direction':
      var n = tk.notes, up = n.every(function (x, i) { return !i || x > n[i - 1]; }), down = n.every(function (x, i) { return !i || x < n[i - 1]; }), same = n.every(function (x) { return x === n[0]; });
      check(a === (up ? 'up' : down ? 'down' : same ? 'same' : '?'), 'direction'); break;
    case 'dyn': check(tk.levels[a === 'first' ? 0 : 1] === 'f' && tk.levels.indexOf('p') >= 0, 'dynamics'); break;
    case 'dynSign': check(DYN[tk.sign] === a, 'dynamic sign ' + tk.sign); break;
    case 'instrPic': check(a === M.instrument(tk.inst).name, 'instrument picture'); break;
    case 'instrFamily': check(a === INST_FAM[tk.inst], 'family of ' + tk.inst); break;
    case 'instrDesc': check(a === M.instrument(tk.inst).name, 'instrument description'); break;
    case 'instrLow': check(DEEPEST.indexOf(M.INSTRUMENTS.filter(function (x) { return x.name === a; })[0].id) >= 0, 'deepest instrument'); break;
    case 'windType': check(a === WIND[tk.inst], 'wind type ' + tk.inst); break;
    case 'bandQuiz': check(M.BAND_QUIZ.some(function (q) { return q[0] === tk.q && q[1] === a; }), 'band quiz'); break;
    case 'build': check(a === CHORD_FACTS[tk.chord][0].split(' – ').map(function (l) { return NAT[LET.indexOf(l)]; }).sort(function (x, y) { return x - y; }).join(','), 'build ' + tk.chord); break;
    case 'chordName': check(a === M.chordLabel(tk.chord), 'chordName'); break;
    case 'durmol': check(a === (tk.notes[1] - tk.notes[0] === 4 ? 'dur' : 'mol') && tk.notes[2] - tk.notes[0] === 7, 'dur/mol'); break;
    case 'chordNotes': check(a === CHORD_FACTS[tk.chord][0], 'chord notes ' + tk.chord); break;
    case 'intervalName': case 'intervalFromName': check(a === IV[stepCount(tk.notes[0], tk.notes[1]) - 1] && tk.notes[1] > tk.notes[0], id); break;
    case 'third': var s3 = tk.notes[1] - tk.notes[0]; check(stepCount(tk.notes[0], tk.notes[1]) === 3 && a === (s3 === 4 ? 'stor' : s3 === 3 ? 'lille' : '?'), 'third'); break;
    case 'semis': check(+a === tk.notes[1] - tk.notes[0], 'semitones'); break;
    case 'scaleMissing': check(a === 'cdefgahc'[tk.miss], 'scale missing'); break;
    case 'degree': check(a === 'cdefgah'[tk.n - 1], 'degree'); break;
    case 'halfsteps': var pair = letterOf(tk.notes[0]) + letterOf(tk.notes[1]); check(a === (pair === 'ef' || pair === 'hc' ? 'halv' : 'hel'), 'half step ' + pair); break;
    case 'readMelody': check(a === tk.notes.map(letterOf).join(' – ') && tk.notes.every(function (x) { return x >= 60 && x <= 72; }), 'read melody'); break;
    case 'hearMelody': check(uniq(tk.melodies.map(function (x) { return x.join(','); })) && tk.melodies.every(function (x) { return x.every(function (y) { return y >= 60 && y <= 72 && M.isNatural(y); }); }), 'hear melody'); break;
    default: check(false, 'unknown kind ' + id);
  }
  // texts: prompt, hint and explanation are filled in for both sound on and off
  [undefined, false].forEach(function (snd) {
    soundSetting = snd;
    var p = game._prompt(tk), hnt = game._hint(tk, band), ex = game._explain(tk);
    check(p && !/[{}]/.test(p) && hnt && !/[{}]/.test(hnt) && ex && !/[{}]|undefined/.test(ex), id + ' texts: ' + p + ' | ' + hnt + ' | ' + ex);
    if (tk.options) tk.options.forEach(function (o) { var l = game._label(tk, o); check(l && !/undefined/.test(l), id + ' option label ' + o); });
    check(!/(^|[\s(–])b([\s,.)–]|$)/.test(ex), 'never the note name b: ' + ex);
    texts.push(p, hnt, ex);
  });
  soundSetting = undefined;
}
var textSet = new Set(), texts = { push: function () { for (var i = 0; i < arguments.length; i++) textSet.add(arguments[i]); } }, kindsSeen = {};
for (var run = 0; run < 300; run++) M.ROUTES.forEach(function (r) {
  var tasks = M.buildRound(r.id);
  check(tasks.length === (r.kind === 'beat' || r.kind === 'rhythm' ? 8 : 10), r.id + ' round length ' + tasks.length);
  var keys = tasks.filter(function (tk) { return tk.kind !== 'beat' && tk.kind !== 'rhythm'; }).map(function (tk) { var c = JSON.parse(JSON.stringify(tk)); delete c.options; delete c.melodies; delete c.bars; return JSON.stringify(c); });
  check(uniq(keys), r.id + ' no repeated tasks');
  tasks.forEach(function (tk) { kindsSeen[tk.kind] = 1; verify(tk, r.b); });
});
Object.keys(M.gen).forEach(function (k) { check(kindsSeen[k], 'generator used in a round: ' + k); });
// extra runs straight from the generators
Object.keys(M.gen).forEach(function (k) { ['M', 'U'].forEach(function (b) { for (var i = 0; i < 300; i++) verify(M.gen[k](b, i % 8), b); }); });

/* ---------- 5. Rhythm judging and calibration ---------- */
var beatMs = 750, exp = [0, 1, 2, 2.5, 3].map(function (b) { return 1000 + b * beatMs; }), mg = M.margin(beatMs, 0.5);
check(mg >= 90 && mg <= 200 && mg < beatMs * 0.5 / 2, 'margin generous but below half the eighth gap (' + mg + ' ms)');
var J = function (taps, o) { o = o || {}; o.margin = o.margin || mg; return M.judgeRhythm(exp, taps, o); };
check(J(exp.slice()).ok && J(exp.slice()).hits === 5, 'exact taps pass');
check(J(exp.map(function (e, i) { return e + (i % 2 ? 1 : -1) * (mg - 5); })).ok, 'taps just inside the margin pass');
check(!J(exp.map(function (e, i) { return i === 2 ? e + mg + 30 : e; })).ok, 'one tap outside the margin fails');
check(!J(exp.slice(0, 4)).ok && J(exp.slice(0, 4)).miss === 1, 'a missing tap fails');
check(!J(exp.concat([1000 + 1.5 * beatMs])).ok && J(exp.concat([1000 + 1.5 * beatMs])).extra === 1, 'an extra tap fails');
check(J(exp.concat([exp[1] + 40])).ok, 'a bouncy double tap is forgiven');
check(J(exp.slice(0, 4), { allowMiss: 1 }).ok, 'allowMiss works');
var late = exp.map(function (e) { return e + 170; });
check(!J(late, { margin: 120 }).ok, 'late taps fail without calibration');
check(J(late, { margin: 120, offset: 170 }).ok && J(late, { margin: 120, offset: 170 }).mean === 0, 'the calibration offset is subtracted');
check(J(late.map(function (x) { return x + 40; }), { margin: 120, offset: 170 }).mean === 40, 'mean error after offset');
check(J(exp.concat([exp[0] - 3 * beatMs]), { from: exp[0] - beatMs / 2, to: exp[4] + beatMs / 2 }).ok, 'taps during the count-in are ignored');
check(J([]).miss === 5 && !J([]).ok, 'no taps fail');
var cb = []; for (var i = 0; i < 8; i++) cb.push(5000 + i * 600);
check(M.calibrate(cb, cb.map(function (b, i) { return b + 80 + (i % 3) * 10 - 10; }), 600) === 80, 'calibration finds the median delay');
check(M.calibrate(cb, cb.map(function (b) { return b - 40; }).concat([cb[3] + 290]), 600) === -40, 'calibration ignores a stray tap');
check(M.calibrate(cb, cb.slice(0, 3), 600) === null, 'calibration needs at least four taps');
check(M.calibrate(cb, cb.map(function (b) { return b + 1000; }), 600) !== 1000, 'calibration is clamped');

/* ---------- 6. Share code ---------- */
M.PRESETS.forEach(function (p) { var s = M.preset(p.id), c = M.encodeSong(s); check(/^TAKT1:/.test(c) && JSON.stringify(M.decodeSong(c)) === JSON.stringify(s), 'preset round trip ' + p.id); });
for (var r2 = 0; r2 < 1000; r2++) {
  var song = { tempo: 60 + Math.floor(Math.random() * 101), kick: [], snare: [], hat: [], mel: [] };
  for (var j = 0; j < 16; j++) { song.kick.push(Math.random() < 0.4); song.snare.push(Math.random() < 0.3); song.hat.push(Math.random() < 0.5); song.mel.push(Math.floor(Math.random() * 9)); }
  var code = M.encodeSong(song);
  check(JSON.stringify(M.decodeSong(code)) === JSON.stringify(song), 'random song round trip');
  check(M.decodeSong(' ' + code.toLowerCase() + '\n') !== null, 'code survives case and spaces');
  var broken = code.slice(0, 12) + (code[12] === '0' ? '1' : '0') + code.slice(13);
  check(M.decodeSong(broken) === null, 'a changed character is rejected: ' + broken);
}
['', null, undefined, 'TAKT2:100-8888-2222-FFFF-1231123134503450-0', 'TAKT1:100-8888-2222-FFFF-123112313450345-0', 'TAKT1:100-8888-2222-FFFF-1231123134503459-0', 'TAKT1:100-8888-2222-FFF-1231123134503450-0',
  'BOB1:abc', 'TAKT1:', 'TAKT1:100-GGGG-2222-FFFF-1231123134503450-0', 'hej med dig'].forEach(function (bad) { check(M.decodeSong(bad) === null, 'bad code rejected: ' + bad); });
(function () { // valid format and checksum, but the tempo is out of range
  var body = '200-8888-2222-FFFF-1231123134503450', x = 0; for (var i = 0; i < body.length; i++) x = (x + body.charCodeAt(i) * (i + 1)) % 36;
  check(M.decodeSong('TAKT1:' + body + '-' + x.toString(36).toUpperCase()) === null, 'tempo 200 rejected');
  var ok = '100-8888-2222-FFFF-1231123134503450', y = 0; for (i = 0; i < ok.length; i++) y = (y + ok.charCodeAt(i) * (i + 1)) % 36;
  check(M.decodeSong('TAKT1:' + ok + '-' + y.toString(36).toUpperCase()) !== null, 'hand-made valid code accepted');
})();
check(M.validSong(M.blankSong()), 'blank song is valid');
check(M.preset('jakob').mel.join('') === '1231123134503450', 'Mester Jakob preset (traditional tune)');

/* ---------- 7. Hub API ---------- */
['M', 'U'].forEach(function (band) {
  var a = seeded(42, function () { return game.quickTask(band, {}); }), b = seeded(42, function () { return game.quickTask(band, {}); });
  check(JSON.stringify(a) === JSON.stringify(b), 'quickTask is deterministic for a seed (' + band + ')');
  for (var s = 1; s <= 400; s++) {
    var q = seeded(s, function () { return game.quickTask(band, s % 2 ? {} : { routes: {} }); });
    check(q && q.q && !/[{}]/.test(q.q) && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 4 && uniq(q.options) && q.options.indexOf(q.answer) >= 0, 'quickTask ' + band + ' ' + JSON.stringify(q).slice(0, 160));
    check(q.hint && q.explain && JSON.parse(JSON.stringify(q)).answer === q.answer, 'quickTask hint/explain ' + band);
    check(!q.html || (q.html.length < 20000 && !/class="ts-|var\(/.test(q.html.replace(/class="ts-n"/g, ''))), 'quickTask html has inline styling only');
    texts.push(q.q, q.hint, q.explain);
  }
});
(function () { // leans towards the weakest route: only Nodeværdier is unplayed
  var d = { routes: {} }; M.ROUTES.forEach(function (r) { d.routes[r.id] = { stars: r.id === 'm-noder' ? 0 : 3, best: 100, plays: 1 }; });
  for (var s = 1; s <= 50; s++) { var q = seeded(s, function () { return game.quickTask('M', d); }); check(q.q === S.quickBeats || q.q === S.prompt.valueName, 'quickTask picks the weakest route: ' + q.q); }
})();
var dd = { band: 'M', routes: { 'm-takt': { stars: 3, best: 90, plays: 2 }, 'm-noder': { stars: 1, best: 50, plays: 1 }, 'u-akkord': { stars: 2, best: 70, plays: 1 } } };
var sm = game.summary(dd), pr = game.progress(dd), rep = game.parentReport(dd), col = game.collection(dd);
check(sm.stars === 4 && sm.max === 18, 'summary');
check(pr.plays === 4 && pr.bands.M.length === 6 && pr.bands.U.length === 6 && pr.bands.M[0] === 3 && pr.bands.U[3] === 2, 'progress');
check(rep.head.length === 3 && rep.rows.length === 3 && rep.rows[0][0] === 'Hold takten (M)' && rep.rows[0][1] === '3/3', 'parent report');
check(col.n === 3 && col.max === 12, 'collection');
check(game.summary({}).max === 18 && game.progress({}).plays === 0 && game.collection({}).n === 0, 'API with empty data');
M.ROUTES.forEach(function (r) { check(S.musicians[r.musician] && M.instrument(r.musician) && (r.b === 'M' || r.b === 'U'), 'route ' + r.id); });
check(M.ROUTES.filter(function (r) { return r.b === 'M'; }).length === 6 && M.ROUTES.filter(function (r) { return r.b === 'U'; }).length === 6, 'six routes per band');

/* ---------- 8. Danish spelling ---------- */
function tok(s) { return String(s).replace(/\u00ad/g, '').replace(/\{\w+\}/g, ' ').replace(/TAKT1:\S*/g, ' ').match(/[A-Za-zÆØÅæøåÉé]+/g) || []; }
var words = new Set();
(function walk(x, key) {
  if (typeof x === 'string') { if (['id', 'kind', 'musician', 'look', 'fam', 'wind', 'sign', 'type', 'b', 'base'].indexOf(key) < 0) tok(x).forEach(function (w) { words.add(w); }); return; }
  if (Array.isArray(x)) return x.forEach(function (v) { walk(v, key); });
  if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k], k); });
})([S, M.DUR, M.DYNAMICS, M.FAMILIES, M.WIND, M.INSTRUMENTS, M.BAND_QUIZ, M.ROUTES, M.PRESETS.map(function (p) { return p.name; }), M.CHORDS.map(function (c) { return c.name; }), M.INTERVALS, Array.from(textSet)]);
// correct words the dictionary lacks (the name in »Mester Jakob«, »tonetrinet«) and the dynamic signs pp and ff
var OK = ['tonetrinet', 'jakob', 'pp', 'ff'];
var list = Array.from(words).filter(function (w) { return w.length > 1 && OK.indexOf(w.toLowerCase()) < 0; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + Array.from(new Set(bad)).join(', '));

console.log(fails ? 'Taktslaget: ' + fails + ' of ' + checks + ' checks FAILED' : 'Taktslaget: all ' + checks + ' checks passed (' + nBars + ' bars and rhythms checked)');
process.exit(fails ? 1 : 0);
