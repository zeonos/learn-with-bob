// Unit test for regnestorm/problems.js – run: node tools/test-problems.js
// Generates thousands of problems per topic and level and checks each answer independently.
'use strict';
var Regn = require('../regnestorm/problems.js');
var fails = 0, count = 0;
function fail(p, msg) { fails++; if (fails < 40) console.log('FAIL', p.topic, 'L' + p.level, JSON.stringify(p.text), '→', p.answer, '|', msg); }

function num(s) { return parseFloat(s.replace(/−/g, '-').replace(',', '.')); }
function evalExpr(expr) {
  var e = expr.replace(/·/g, '*').replace(/ : /g, '/').replace(/−/g, '-').replace(/(\d),(\d)/g, '$1.$2')
    .replace(/√(\d+)/g, 'Math.sqrt($1)')
    .replace(/(\d+|\))¹⁰/g, '$1**10')
    .replace(/(\d+|\))([²³⁴-⁹])/g, function (m, b, c) {
      return b + '**' + { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 }[c];
    });
  if (!/^[\d\s+\-*/().Mathsqr]+$/.test(e)) throw new Error('unsafe expr ' + e);
  return Function('return (' + e + ')')();
}
function close(a, b) { return Math.abs(a - b) < 1e-9; }
var PL = { tusinde: 1000, tusinder: 1000, hundrede: 100, hundreder: 100, tier: 10, tiere: 10, ener: 1, enere: 1 };

function independent(p) {
  var tx = p.text;
  switch (p.topic) {
    case 'plusminus': case 'gange': case 'division': case 'hierarki': case 'negative': case 'decimal': case 'potenser':
      if (/^\?/.test(tx)) { // missing value: ? op b = c
        var m = tx.match(/^\? (.) (\d+) = (\d+)$/);
        return m[1] === '+' ? num(m[3]) - num(m[2]) : num(m[3]) / num(m[2]);
      }
      return evalExpr(tx.replace(/ = \?$/, ''));
    case 'pladsvaerdi':
      var sum = 0; tx.replace(/(\d) (tusinder?|hundreder|hundrede|tiere|tier|enere|ener)/g, function (m, d, w) { sum += d * PL[w]; });
      return sum;
    case 'broek':
      var f = tx.match(/^(\d+)\/(\d+) af (\d+) = \?$/); return f[1] / f[2] * f[3];
    case 'broekdecimal':
      return evalExpr(tx.replace('Som decimaltal: ', '').replace(/ = \?$/, ''));
    case 'procent':
      var a = tx.match(/^(\d+) % af (\d+) = \?$/); if (a) return a[1] * a[2] / 100;
      var b = tx.match(/^Hvor mange procent er (\d+) af (\d+)\?$/); if (b) return b[1] / b[2] * 100;
      var c = tx.match(/koster (\d+) kr\. Prisen sættes (\d+) % (ned|op)/); if (c) return c[3] === 'ned' ? c[1] * (1 - c[2] / 100) : c[1] * (1 + c[2] / 100);
      throw new Error('unparsed procent');
    case 'ligninger':
      var eq = tx.replace('Find x: ', '').replace(/−/g, '-').split(' = ');
      function side(s, x) { return evalExpr(s.replace(/(\d)x/g, '$1*(' + x + ')').replace(/x/g, '(' + x + ')').replace(/-/g, '−')); }
      if (!close(side(eq[0], p.answer), side(eq[1], p.answer))) throw new Error('x does not satisfy');
      // also unique: check x+1 fails
      if (close(side(eq[0], p.answer + 1), side(eq[1], p.answer + 1))) throw new Error('not unique');
      return p.answer;
  }
}

Regn.topics.forEach(function (tp) {
  for (var L = 1; L <= 5; L++) {
    var R = Regn.makeRand(1000 + L);
    var seen = {};
    for (var i = 0; i < 1500; i++) {
      var p = Regn.generate(tp.id, L, R); count++;
      seen[p.text] = 1;
      if (typeof p.answer !== 'number' || !isFinite(p.answer)) { fail(p, 'answer not finite'); continue; }
      var blob = JSON.stringify(p);
      if (/undefined|NaN|null|\{[a-z]+\}/.test(blob)) fail(p, 'undefined/NaN/placeholder in output');
      if (!p.hint || !p.hint.text) fail(p, 'missing hint');
      if (!p.solution) fail(p, 'missing solution');
      if (!Regn.isCorrect(p.answerText, p.answer)) fail(p, 'answerText does not round-trip');
      if (!tp.negative && p.answer < 0) fail(p, 'negative answer in non-negative topic');
      if (!tp.decimal && p.answer !== Math.round(p.answer)) fail(p, 'decimal answer in integer topic');
      if (p.answerText.length > 8) fail(p, 'answer too long');
      if (/[?=√·%]/.test(p.speech)) fail(p, 'speech has symbols: ' + p.speech);
      if (p.hint.svg && !/^<svg[\s\S]*<\/svg>$/.test(p.hint.svg)) fail(p, 'bad svg');
      try { var v = independent(p); if (!close(v, p.answer)) fail(p, 'independent check gave ' + v); }
      catch (e) { fail(p, 'check error: ' + e.message); }
    }
    if (Object.keys(seen).length < 8) console.log('WARN low variety', tp.id, 'L' + L, Object.keys(seen).length);
  }
});

// parseAnswer cases
[['3,5', 3.5], ['3.5', 3.5], ['-4', -4], ['−4', -4], [' 12 ', 12], ['0,50', 0.5], [',5', 0.5]].forEach(function (c) {
  if (!close(Regn.parseAnswer(c[0]), c[1])) { fails++; console.log('FAIL parse', c); }
});
['', '-', ',', 'abc', '1,2,3', '--3'].forEach(function (s) { if (!isNaN(Regn.parseAnswer(s))) { fails++; console.log('FAIL parse should be NaN', s); } });

console.log(count + ' problems checked, ' + fails + ' failures');
process.exit(fails ? 1 : 0);
