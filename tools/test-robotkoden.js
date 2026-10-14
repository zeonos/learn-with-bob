// Robotkoden: proves every level can be solved for 3 stars, and checks the interpreter.
// Run: node tools/test-robotkoden.js
'use strict';
var RK = require('../robotkoden/engine.js'), LV = require('../robotkoden/levels.js');
var fails = 0;
function check(ok, msg) { if (!ok) { fails++; console.log('FAIL', msg); } }

LV.defs.forEach(function (def) {
  var lvl;
  try { lvl = RK.buildLevel(def); } catch (e) { check(false, def.id + ' build: ' + e.message); return; }
  var res = RK.run(lvl, lvl.solution), st = RK.stars(lvl, res);
  check(res.result === 'goal', def.id + ' solution reaches goal (got ' + res.result + ')');
  check(st.n === 3, def.id + ' solution earns 3 stars (got ' + st.n + ', batteries ' + res.collected + '/' + res.total + ')');
  check(lvl.batteries.length === (Array.isArray(def.bat) ? def.bat.length : def.bat || 0), def.id + ' battery count');
  check(lvl.rows <= 12 && lvl.cols <= 14, def.id + ' size ' + lvl.rows + 'x' + lvl.cols);
  if (lvl.limit) check(RK.countProgram(lvl.solution) <= lvl.limit, def.id + ' solution within limit');
  var used = RK.types(lvl.solution.main, RK.types(lvl.solution.f));
  Object.keys(used).forEach(function (t) { check(lvl.palette.indexOf(t) >= 0, def.id + ' palette lacks ' + t); });
  // the limit must force the new idea: the plain step-by-step path must not fit
  if (lvl.limit && def.world !== 3) {
    var flat = 0; RK.walkPath({ id: def.id, path: def.path || def.sol, f: def.f, dir: def.dir, revisit: def.revisit }).length;
    var seq = expandFlat(RK.program(def.path || def.sol, def.f || ''));
    check(seq > lvl.limit, def.id + ' limit ' + lvl.limit + ' does not force a loop (flat program has ' + seq + ' blocks)');
  }
  if (def.pre) {
    var pr = RK.run(lvl, lvl.pre);
    check(pr.result !== 'goal', def.id + ' buggy start program must fail (got ' + pr.result + ')');
  }
  check(typeof def.title === 'string' && def.title && typeof def.hint === 'string' && def.hint, def.id + ' title and hint');
});
function expandFlat(p) {
  var n = 0;
  (function walk(list) { list.forEach(function (b) { if (b.t === 'gentag') for (var i = 0; i < b.n; i++) walk(b.body); else if (b.t === 'kald') walk(p.f); else n++; }); })(p.main);
  return n;
}
check(LV.defs.length === 40, '40 levels (got ' + LV.defs.length + ')');

// interpreter edge cases
var tiny = RK.buildLevel({ id: 't', sol: 'FF' });
check(RK.run(tiny, RK.program('FFF')).result === 'goal', 'stops at goal even with extra blocks');
check(RK.run(tiny, RK.program('L F')).result === 'crash', 'crash into wall');
check(RK.run(tiny, RK.program('F')).result === 'end', 'program ends before goal');
check(RK.run(tiny, RK.program('U(L)')).result === 'limit', 'endless loop is stopped');
check(RK.run(tiny, RK.program('U()')).result === 'limit', 'empty endless loop is stopped');
check(RK.run(tiny, { main: RK.parse('P'), f: RK.parse('P') }).result === 'limit', 'endless recursion is stopped');
check(RK.countProgram(RK.program('3(F?f(F|R))', 'FL')) === 7, 'block count');
var code = RK.toCode(RK.program('U(?f(F|?l(L|R)))P', '3(F)R'));
check(/while \(!vedMålet\(\)\)/.test(code) && /if \(vejFrem\(\)\)/.test(code) && /function minFunktion/.test(code) && /for \(let i = 0; i < 3; i\+\+\)/.test(code), 'code view');
// share codes
var enc = RK.encodeLevel({ map: ['#####', '#E.G#', '#####'], palette: ['frem', 'venstre', 'hojre', 'gentag'], title: 'Min bane æøå' });
var dec = RK.decodeLevel(enc);
check(dec && dec.title === 'Min bane æøå' && dec.palette.indexOf('gentag') >= 0 && dec.map[1] === '#E.G#', 'share code round trip');
check(RK.decodeLevel('RK1-xyz') === null && RK.decodeLevel('hej') === null, 'bad codes rejected');
var custom = RK.buildLevel({ id: 'c', map: dec.map, palette: dec.palette, custom: true });
check(RK.run(custom, RK.program('FF')).result === 'goal', 'custom level plays');

console.log(LV.defs.length + ' levels checked, ' + fails + ' failures');
process.exit(fails ? 1 : 0);
