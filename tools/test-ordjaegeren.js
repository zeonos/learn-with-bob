// Ordjægeren: checks the whole word bank. Run: node tools/test-ordjaegeren.js  (needs hunspell + hunspell-da)
'use strict';
var D = require('../ordjaegeren/words.js'), execFileSync = require('child_process').execFileSync;
var fails = 0, notes = [];
function check(ok, msg) { if (!ok) { fails++; console.log('FAIL', msg); } }
var NAMES = ['Ali', 'Max', 'Danmark', 'Bornholm', 'ig', 'aj', 'hv', 'Hv']; // names and letter groups in rule texts
// "Real word" = accepted by hunspell with compounding switched off, so made-up words like "desvære"
// (which normal hunspell accepts as des + være) count as wrong.
var fs = require('fs'), path = require('path');
var NOCOMP = path.join(__dirname, '.cache', 'da_NOCOMP');
if (!fs.existsSync(NOCOMP + '.aff')) {
  fs.mkdirSync(path.dirname(NOCOMP), { recursive: true });
  fs.copyFileSync('/usr/share/hunspell/da_DK.dic', NOCOMP + '.dic');
  fs.writeFileSync(NOCOMP + '.aff', fs.readFileSync('/usr/share/hunspell/da_DK.aff', 'utf8').split('\n')
    .filter(function (l) { return !/^(COMPOUND|ONLYINCOMPOUND|CHECKCOMPOUND)/.test(l); }).join('\n'));
}
var realCache = {};
function isRealWord(w) {
  if (!(w in realCache)) realCache[w] = execFileSync('hunspell', ['-d', NOCOMP, '-l', '-i', 'utf-8'], { input: w, encoding: 'utf8' }).trim() === '';
  return realCache[w];
}
function unknown(words) {
  var list = Array.from(new Set(words.filter(function (w) { return w && NAMES.indexOf(w) < 0; })));
  if (!list.length) return [];
  return execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
}
function tokens(text) { return text.match(/[A-Za-zÆØÅæøåÉé]+/g) || []; }
function textOk(text, where) { var u = unknown(tokens(text)); check(!u.length, where + ': unknown words ' + u.join(', ') + ' in "' + text + '"'); }
function hasWord(sentence, w) { return new RegExp('(^|[^A-Za-zÆØÅæøå])' + w.replace(/ /g, ' ') + '($|[^A-Za-zÆØÅæøå])', 'i').test(sentence); }

// spelling
var seen = {};
D.spelling.forEach(function (it) {
  var where = 'spelling "' + it.w + '"';
  check(!seen[it.w], where + ' duplicate'); seen[it.w] = 1;
  check(D.rules[it.r], where + ' unknown rule ' + it.r);
  check(it.b === 'M' || it.b === 'U', where + ' band');
  check(unknown(tokens(it.w)).length === 0, where + ' target not in dictionary');
  check(hasWord(it.s, it.w), where + ' sentence does not contain the word');
  textOk(it.s, where);
  check(it.x.length >= 2, where + ' needs 2 distractors');
  it.x.forEach(function (x) {
    check(x !== it.w, where + ' distractor equals answer');
    if (/[ -]/.test(x)) { // særskrivning: the parts are real words, but the joined form must be the answer
      check(x.replace(/[ -]/g, '') === it.w.replace(/ /g, '') || it.r !== 'sammensat', where + ' split distractor ' + x + ' should be the answer split up');
      return;
    }
    var real = isRealWord(x), allowed = (it.rw || []).indexOf(x) >= 0;
    if (real && !allowed) check(false, where + ' distractor "' + x + '" is a real word – add to rw if it clearly does not fit, or change it');
    if (!real && allowed) check(false, where + ' rw lists "' + x + '" but it is not a real word');
    // the sentence with the distractor must not be another correct sentence: real-word distractors are reviewed by hand (rw)
  });
});
['M', 'U'].forEach(function (b) { console.log('spelling ' + b + ': ' + D.spelling.filter(function (x) { return x.b === b; }).length + ' words'); });

// word classes
var all = {};
Object.keys(D.classes).forEach(function (k) {
  D.classes[k].forEach(function (w) { check(!all[w], 'class word "' + w + '" appears twice'); all[w] = k; });
  var u = unknown(D.classes[k]); check(!u.length, 'class ' + k + ' unknown words: ' + u.join(', '));
  check(D.classes[k].length >= 30, 'class ' + k + ' has ' + D.classes[k].length + ' words');
});

// gaps
D.gaps.forEach(function (g, i) {
  var where = 'gap ' + g.r + ' #' + i;
  check(D.rules[g.r], where + ' rule');
  check((g.s.match(/___/g) || []).length === 1, where + ' must have one gap');
  check(g.x.indexOf(g.a) < 0, where + ' answer among distractors');
  textOk(g.s.replace('___', g.a), where);
  g.x.forEach(function (x) {
    if (/^hv/.test(x) && g.r === 'hvV' && !isRealWord(x)) return; // made-up hv-form on purpose (hvise, hvære)
    check(isRealWord(x), where + ' distractor "' + x + '" should be a real word (it tests meaning, not spelling)');
  });
});
console.log('gap sentences: ' + D.gaps.length);

// commas
D.commas.forEach(function (c, i) {
  check((c.match(/\|/g) || []).length === 1, 'comma #' + i + ' must mark exactly one comma');
  check(!/,/.test(c.replace('|', '')), 'comma #' + i + ' has an extra comma');
  textOk(c.replace('|', ','), 'comma #' + i);
});
// idioms
D.idioms.forEach(function (d, i) {
  check(d.x.length === 2 && d.x.indexOf(d.a) < 0 && d.x[0] !== d.x[1], 'idiom #' + i + ' options');
  textOk(d.u + ' ' + d.a + ' ' + d.x.join(' '), 'idiom #' + i);
});
textOk(Object.keys(D.rules).map(function (k) { return D.rules[k].name + ' ' + D.rules[k].text; }).join(' '), 'rule texts');
textOk(D.routes.map(function (r) { return r.name + ' ' + r.desc; }).join(' '), 'route names');

// every route must have enough material for 10 tasks
D.routes.forEach(function (r) {
  var n = 0;
  if (r.kind === 'fang') n = D.spelling.filter(function (x) { return x.b === r.b && r.rules.indexOf(x.r) >= 0 || (x.r === 'sammensat' && r.rules.indexOf('sammensat') >= 0); }).length;
  else if (r.kind === 'gap') n = D.gaps.filter(function (g) { return r.rules.indexOf(g.r) >= 0; }).length;
  else if (r.kind === 'sorter') n = Object.keys(all).length;
  else if (r.kind === 'komma') n = D.commas.length;
  else if (r.kind === 'udtryk') n = D.idioms.length;
  else n = 99;
  check(n >= 12, 'route ' + r.id + ' has only ' + n + ' tasks');
});

console.log('Ordjægeren word bank: ' + fails + ' failures');
process.exit(fails ? 1 : 0);
