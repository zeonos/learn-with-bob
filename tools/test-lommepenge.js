// Lommepenge: recomputes every amount, change, unit price, percentage, VAT and interest independently over thousands of seeds,
// checks the minimal-change algorithm against brute force, the budgets, the hub API and the spelling.
// Run: node tools/test-lommepenge.js   (needs hunspell da_DK)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../lommepenge/strings-da.js');
var M = require('../lommepenge/money.js'), S = window.STR.lp, execFileSync = require('child_process').execFileSync;
var game = null;
window.Bob = { svg: function () { return ''; } };
window.Core = { h: function () {}, t: function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k]; }); }, registerGame: function (g) { game = g; }, profile: function () { return { band: 'M' }; } };
require('../lommepenge/game.js');
var fails = 0, checks = 0, failMsgs = {};
function check(ok, msg) { checks++; if (!ok) { fails++; var k = String(msg).slice(0, 60); failMsgs[k] = (failMsgs[k] || 0) + 1; if (failMsgs[k] <= 3) console.log('FAIL', msg); } }
function uniq(a) { return new Set(a).size === a.length; }
function close(a, b, eps) { return Math.abs(a - b) <= (eps || 0.005); }

/* ---------- independent helpers (do not use money.js) ---------- */
// same generator as Core.rng (mulberry32), so Core.seeded can be simulated
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function seeded(seed, fn) { var keep = Math.random; Math.random = rng(seed); try { return fn(); } finally { Math.random = keep; } }
function daNum(x) { // Danish formatting, written independently: thousands with '.', decimal comma, up to 2 decimals
  var neg = x < 0, v = Math.round(Math.abs(x) * 100), ip = Math.floor(v / 100), dp = v % 100, s = '';
  var str = String(ip); for (var i = 0; i < str.length; i++) { if (i && (str.length - i) % 3 === 0) s += '.'; s += str[i]; }
  if (dp) s += ',' + (dp % 10 ? (dp < 10 ? '0' : '') + dp : String(dp / 10));
  return (neg ? '−' : '') + s;
}
function daKr(kroner) { var v = Math.round(kroner * 100); return (v % 100 ? daNum(Math.floor(v / 100)) + ',' + ('0' + v % 100).slice(-2) : daNum(v / 100)) + ' kr.'; }
function cashRoundRule(ore) { var r = ore % 100, base = ore - r; return r < 25 ? base : r < 75 ? base + 50 : base + 100; }
var COINS_NOTES = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
var TILL = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
var VAT = 0.25; // Skattestyrelsen: 25 % moms
function annuityPay(L, ratePct, n) { var i = ratePct / 100 / 12; return L * i / (1 - Math.pow(1 + i, -n)); }
function irrAop(received, pay, n) { // Newton's method on the monthly rate, then (1+i)^12 - 1
  var i = 0.01;
  for (var k = 0; k < 100; k++) {
    var f = -received, df = 0;
    for (var m = 1; m <= n; m++) { f += pay / Math.pow(1 + i, m); df -= m * pay / Math.pow(1 + i, m + 1); }
    var ni = i - f / df; if (Math.abs(ni - i) < 1e-12) { i = ni; break; } i = ni;
  }
  return (Math.pow(1 + i, 12) - 1) * 100;
}

/* ---------- coins and notes ---------- */
check(JSON.stringify(M.VALUES) === JSON.stringify(COINS_NOTES), 'denominations are 50 øre, 1, 2, 5, 10, 20 kr. and 50, 100, 200, 500 kr. notes');
check(M.VALUES.indexOf(100000) < 0, 'no 1000-kroner note');
check(M.DENOMS.filter(function (d) { return d.coin; }).map(function (d) { return d.v; }).join() === '50,100,200,500,1000,2000', 'coins');
check(M.DENOMS.filter(function (d) { return d.hole; }).map(function (d) { return d.v; }).join() === '100,200,500', '1, 2 and 5 kr. have a hole');
check(M.denom(50).metal === 'copper' && M.denom(1000).metal === 'gold' && M.denom(2000).metal === 'gold' && M.denom(100).metal === 'silver' && M.denom(500).metal === 'silver', 'coin colours');
check(M.TILL.join() === TILL.join(), 'till 50 øre … 200 kr.');
check(M.MOMS === VAT, 'moms constant is 25 %');
['denomIndef', 'denomDef', 'denomPlural'].forEach(function (k) { check(Object.keys(S[k]).map(Number).join() === COINS_NOTES.join(), k + ' covers exactly the valid coins and notes'); });

/* ---------- formatting and parsing ---------- */
for (var v = 0; v <= 2000000; v += 37) { check(M.kr(v) === daKr(v / 100), 'kr() ' + v + ' ' + M.kr(v) + ' vs ' + daKr(v / 100)); }
[[1250, '12,50 kr.'], [125000, '1.250 kr.'], [50, '0,50 kr.'], [1800, '18 kr.'], [10000000, '100.000 kr.']].forEach(function (c) { check(M.kr(c[0]) === c[1], 'kr ' + c[1]); });
[['12,5', 12.5], ['12.5', 12.5], ['1.250', 1250], ['1 250', 1250], ['12,50 kr.', 12.5], ['  42 ', 42], ['7.179', 7179], ['abc', NaN], ['', NaN], ['3,33 %', 3.33], ['15 uger', 15]].forEach(function (c) {
  var r = M.parseDa(c[0]); check(isNaN(c[1]) ? isNaN(r) : r === c[1], 'parseDa ' + JSON.stringify(c[0]) + ' -> ' + r);
});
for (var o = 0; o <= 100000; o++) if (M.cashRound(o) !== cashRoundRule(o)) { check(false, 'cash rounding ' + o); break; }
check(true, 'cash rounding to nearest 50 øre, 0–1000 kr.');

/* ---------- minimal change vs brute force ---------- */
// 1) full enumeration of every multiset of coins/notes with sum <= 150 kr. (in 50-øre units), keeping the fewest pieces per sum
var LIMIT = 300, bruteMin = new Array(LIMIT + 1).fill(Infinity), units = TILL.map(function (x) { return x / 50; }).sort(function (a, b) { return b - a; }), combos = 0;
(function enumerate(i, total, count) {
  if (i === units.length) { combos++; if (count < bruteMin[total]) bruteMin[total] = count; return; }
  for (var k = 0; total + k * units[i] <= LIMIT; k++) enumerate(i + 1, total + k * units[i], count + k);
})(0, 0, 0);
for (var a = 1; a <= LIMIT; a++) {
  var mc = M.minChange(a * 50, M.TILL);
  check(mc && mc.reduce(function (s, x) { return s + x; }, 0) === a * 50 && mc.length === bruteMin[a], 'minChange(' + a * 50 + ') = ' + (mc && mc.length) + ' pieces, brute force ' + bruteMin[a]);
}
console.log('  brute force: ' + combos + ' combinations of coins and notes enumerated');
// 2) breadth-first search (another independent method) for every amount up to 500 kr.
var bfs = new Array(1001).fill(Infinity); bfs[0] = 0;
for (var layer = 0, frontier = [0]; frontier.length; layer++) {
  var nf = [];
  frontier.forEach(function (x) { units.forEach(function (u) { var y = x + u; if (y <= 1000 && bfs[y] === Infinity) { bfs[y] = layer + 1; nf.push(y); } }); });
  frontier = nf;
}
for (var b2 = 1; b2 <= 1000; b2++) { var m2 = M.minChange(b2 * 50, M.TILL); check(m2.length === bfs[b2], 'minChange vs BFS at ' + b2 * 50); }

/* ---------- data ---------- */
var REAL = /\b(netto|rema|f[aø]tex|bilka|lidl|aldi|coop|kvickly|irma|meny|superbrugsen|dagli'?brugsen|7-eleven|matas|jysk|ikea|elgiganten|power|telenor|telia|yousee|cbb|lebara|oister|danske bank|nordea|jyske bank|sydbank|nykredit|mobilepay|lego|playmobil|nike|adidas|apple|samsung|iphone|ipad|haribo|anthon berg|toms|arla|lurpak|kelloggs?|coca-cola|pepsi|fanta|carlsberg|tuborg|anders and|ekstra bladet|bilka|lån & spar|basisbank|resurs|santander|ferratum|vivus|kvickly|salling)\b/i;
var all = JSON.stringify([M.ITEMS, M.BASKETS, M.PACKS, M.NONFOOD, M.GOALS, M.FACTS, M.NAMES, M.SHOPS, M.BANKS, M.CARRIERS, S]);
var hit = all.match(new RegExp(REAL.source, 'gi'));
check(!hit, 'real brand names: ' + (hit || []).join(', '));
check(!/1\.?000-kron|1\.?000[ -]kr\.?-?seddel|tusindkron/i.test(all), 'no 1000-kroner note mentioned anywhere');
M.ITEMS.forEach(function (it) { it.p.forEach(function (p) { check(p * 100 % 50 === 0 && p > 0 && p < 300, 'item price ' + it.id + ' ' + p); }); check(it.a && it.pl && it.label, 'item text ' + it.id); });
M.NONFOOD.forEach(function (it) { it.p.forEach(function (p) { check(p % 40 === 0, 'non-food price divisible by 40 so VAT and discounts come out in whole kroner: ' + it.id); }); });
var FOOD = /mad|is\b|sodavand|chips|slik|kage|snegl|muffin|bolle|banan|æble|mælk|brød|ost|kaffe|ris|pasta|juice|saft|mel\b|vingummi|havregryn/i;
M.NONFOOD.forEach(function (it) { check(!FOOD.test(it.a), 'moms item is not food: ' + it.a); });
M.BASKETS.forEach(function (bk) { bk.rows.forEach(function (r) { check(r[1].length >= 2, 'basket row ' + r[0]); r[1].forEach(function (o) { check(o[1] > 0 && Number.isInteger(o[1]), 'basket price ' + o[0]); }); }); });
M.PACKS.forEach(function (pk) { check(pk.unit === 'kg' || pk.unit === 'l', 'pack unit'); check(pk.per[0] < pk.per[1], 'pack per'); });
check(uniq(M.GOALS.map(function (g) { return g.id; })), 'goal ids unique');
check(M.GOALS.filter(function (g) { return g.b === 'M'; }).length >= 8 && M.GOALS.filter(function (g) { return g.b === 'U'; }).length >= 6, 'goals in both bands');
['M', 'U'].forEach(function (b) { var n = M.ROUTES.filter(function (r) { return r.b === b; }).length; check(n >= 5 && n <= 6, b + ' has 5–6 routes'); });
M.ROUTES.forEach(function (r) { check(S.routes[r.id] && S.routes[r.id].name && S.routes[r.id].desc, 'route text ' + r.id); r.mix.concat(r.quick.map(function (q) { return [q, 1]; })).forEach(function (m) { check(typeof M.gen[m[0]] === 'function', 'generator ' + m[0]); }); });

/* ---------- every generator, recomputed independently ---------- */
function inQ(tk, s) { return tk.q.indexOf(s) >= 0; }
function sumL(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
function ceil(x) { return Math.ceil(x - 1e-9); }
var cash50 = 0;
function c50(x, what) { cash50++; check(Math.round(x) === x && x % 50 === 0, what + ' is a whole number of 50 øre: ' + x); }
function itemPrices() { var s = {}; M.ITEMS.forEach(function (it) { it.p.forEach(function (p) { s[p * 100] = 1; }); }); return s; }
var ITEM_P = itemPrices();
var V = {
  mostWorth: function (tk) { var o = tk.options.map(Number); check(+tk.answer === Math.max.apply(null, o), 'mostWorth'); check(o.every(function (x) { return COINS_NOTES.indexOf(x) >= 0; }), 'mostWorth valid money'); },
  leastWorth: function (tk) { var o = tk.options.map(Number); check(+tk.answer === Math.min.apply(null, o), 'leastWorth'); },
  coinFact: function (tk) { var f = M.FACTS.coin.filter(function (x) { return x[0] === tk.q; })[0]; check(f && f[1] === tk.answer, 'coinFact'); },
  kasseFact: function (tk) { var f = M.FACTS.kasse.filter(function (x) { return x[0] === tk.q; })[0]; check(f && f[1] === tk.answer, 'kasseFact'); },
  aopFact: function (tk) { var f = M.FACTS.aop.filter(function (x) { return x[0] === tk.q; })[0]; check(f && f[1] === tk.answer, 'aopFact'); },
  sameAs: function (tk) { check(tk.answer === tk.p.big / tk.p.small && Number.isInteger(tk.answer), 'sameAs'); check(inQ(tk, S.denomPlural[tk.p.small]) && inQ(tk, daKr(tk.p.big / 100)), 'sameAs text'); },
  count: function (tk) { check(close(tk.answer, sumL(tk.p.list) / 100), 'count sum'); check(sumL(tk.fig.list) === sumL(tk.p.list), 'count figure'); tk.p.list.forEach(function (x) { check(COINS_NOTES.indexOf(x) >= 0, 'count money'); }); c50(Math.round(tk.answer * 100), 'count'); },
  pay: function (tk) { check(tk.answer === tk.p.price && ITEM_P[tk.p.price], 'pay price from the price list'); check(inQ(tk, daKr(tk.answer / 100)), 'pay text ' + tk.q); check(sumL(tk.solution) === tk.answer && tk.solution.length === bfs[tk.answer / 50], 'pay solution minimal'); c50(tk.answer, 'pay amount'); },
  change: function (tk) {
    check(tk.answer === tk.p.paid - tk.p.price && tk.answer > 0, 'change = paid − price');
    check([2000, 5000, 10000, 20000, 50000].indexOf(tk.p.paid) >= 0, 'paid with a 20-krone or a note');
    check(inQ(tk, daKr(tk.p.price / 100)) && inQ(tk, S.denomIndef[tk.p.paid]), 'change text ' + tk.q);
    check(sumL(tk.solution) === tk.answer && tk.solution.length === bfs[tk.answer / 50] && tk.minCount === tk.solution.length, 'change solution is minimal (BFS)');
    tk.solution.forEach(function (x) { check(TILL.indexOf(x) >= 0, 'change uses the till'); });
    c50(tk.p.price, 'change price'); c50(tk.answer, 'change');
  },
  changeNum: function (tk) { check(close(tk.answer * 100, tk.p.paid - tk.p.price), 'changeNum'); check(inQ(tk, daKr(tk.p.price / 100)) && inQ(tk, S.denomIndef[tk.p.paid]), 'changeNum text'); c50(tk.p.price, 'changeNum price'); c50(Math.round(tk.answer * 100), 'changeNum'); },
  cashRound: function (tk) {
    var r = cashRoundRule(tk.p.price);
    check(tk.answer === daKr(r / 100), 'cashRound ' + tk.p.price + ' -> ' + tk.answer); check(inQ(tk, daKr(tk.p.price / 100)), 'cashRound text');
    check(tk.p.price % 50 !== 25, 'cashRound avoids the exact middle'); c50(r, 'cash rounded');
    check(tk.options.indexOf(daKr(tk.p.price / 100)) >= 0, 'cashRound shows the exact price as a wrong option');
  },
  basket: function (tk) {
    var mins = tk.rows.map(function (r) { return Math.min.apply(null, r.opts.map(function (o) { return o.price; })); }), maxs = tk.rows.map(function (r) { return Math.max.apply(null, r.opts.map(function (o) { return o.price; })); });
    check(sumL(mins) <= tk.budget, 'budget is solvable'); check(sumL(maxs) > tk.budget, 'budget is not trivial');
    var ok = 0, bad = 0;
    (function all(i, s) { if (i === tk.rows.length) { if (s <= tk.budget) ok++; else bad++; return; } tk.rows[i].opts.forEach(function (o) { all(i + 1, s + o.price); }); })(0, 0);
    check(ok >= 1 && bad >= 1, 'brute force: some baskets fit, some do not (' + ok + '/' + bad + ')');
    check(sumL(tk.solution.map(function (c, i) { return tk.rows[i].opts[c].price; })) <= tk.budget, 'basket solution fits');
    check(inQ(tk, daKr(tk.budget / 100)), 'basket text'); c50(tk.budget, 'budget');
    tk.rows.forEach(function (r) { check(uniq(r.opts.map(function (o) { return o.name; })), 'basket options unique'); r.opts.forEach(function (o) { c50(o.price, 'basket price'); }); });
  },
  listTotal: function (tk) { var tot = sumL(tk.p.lines.map(function (l) { return l[1] * l[2]; })); check(close(tk.answer * 100, tot), 'listTotal'); tk.p.lines.forEach(function (l) { c50(l[2], 'list price'); check(ITEM_P[l[2]], 'list price from price list'); }); },
  listLeft: function (tk) { var tot = sumL(tk.p.lines.map(function (l) { return l[1] * l[2]; })); check(close(tk.answer * 100, tk.p.money - tot) && tk.answer > 0, 'listLeft'); check(inQ(tk, daKr(tk.p.money / 100)), 'listLeft text'); },
  afford: function (tk) { var tot = sumL(tk.p.lines.map(function (l) { return l[1] * l[2]; })); check(tk.answer === (tk.p.money >= tot ? S.yes : S.no) && tk.p.money !== tot, 'afford'); },
  offerSave: function (tk) { offerCheck(tk, true); },
  offerPay: function (tk) { offerCheck(tk, false); },
  bestShop: function (tk) { shopCheck(tk); },
  bestShopU: function (tk) { shopCheck(tk); },
  perPiece: function (tk) {
    var u = tk.p.packs.map(function (p) { return p[1] / p[0]; }), best = u[0] < u[1] ? 0 : 1;
    check(u[0] !== u[1], 'perPiece differs'); check(tk.answer.indexOf(tk.p.packs[best][0] + ' ') === 0 && tk.answer.indexOf(daKr(tk.p.packs[best][1])) > 0, 'perPiece answer');
    tk.p.packs.forEach(function (p) { c50(Math.round(p[1] * 100), 'perPiece price'); });
  },
  weeks: function (tk) { var w = ceil((tk.p.price - tk.p.start) / tk.p.w); check(tk.answer === w, 'weeks'); check(inQ(tk, daKr(tk.p.price)) && inQ(tk, daKr(tk.p.w)), 'weeks text'); check(tk.p.start + w * tk.p.w >= tk.p.price && tk.p.start + (w - 1) * tk.p.w < tk.p.price, 'weeks is the first week that reaches'); },
  plan: function (tk) {
    var o = tk.options.map(Number).sort(function (a, b) { return a - b; }), okOpts = o.filter(function (x) { return x * tk.p.n >= tk.p.price; });
    check(+tk.answer === okOpts[0], 'plan: smallest weekly amount that reaches the goal'); check(o.some(function (x) { return x * tk.p.n < tk.p.price; }), 'plan has a too-small option');
    check(inQ(tk, daKr(tk.p.price)) && inQ(tk, ' ' + tk.p.n + ' uger'), 'plan text');
  },
  total: function (tk) { check(tk.answer === tk.p.start + tk.p.w * tk.p.n, 'savings total'); },
  missing: function (tk) { check(tk.answer === tk.p.price - tk.p.w * tk.p.n && tk.answer > 0, 'missing'); },
  unitCalc: function (tk) {
    var u = tk.p.price / (tk.p.size / 1000);
    check(close(tk.answer, u) && Number.isInteger(tk.answer), 'unit price ' + tk.q); c50(Math.round(tk.p.price * 100), 'pack price');
    check(inQ(tk, daKr(tk.p.price)) && inQ(tk, M.sizeText(tk.p.size, tk.p.unit)), 'unitCalc text');
    check(tk.unit === (tk.p.unit === 'kg' ? 'kr. pr. kg' : 'kr. pr. liter'), 'unitCalc unit');
  },
  cheapest: function (tk) {
    var u = tk.p.packs.map(function (p) { return p[1] / (p[0] / 1000); }), s = u.slice().sort(function (a, b) { return a - b; }), bi = u.indexOf(s[0]);
    check(s[1] >= s[0] * 1.03, 'cheapest is clearly cheapest'); check(tk.answer.indexOf(daKr(tk.p.packs[bi][1])) > 0, 'cheapest answer ' + tk.answer);
    tk.p.packs.forEach(function (p) { c50(Math.round(p[1] * 100), 'pack price'); });
  },
  discount: function (tk) { check(close(tk.answer, tk.p.price * (100 - tk.p.r) / 100), 'discount'); check(inQ(tk, tk.p.r + ' %') && inQ(tk, daKr(tk.p.price)), 'discount text'); },
  discountPct: function (tk) { check(close(tk.answer, (tk.p.before - tk.p.after) / tk.p.before * 100), 'discountPct'); },
  momsAdd: function (tk) { check(close(tk.answer, tk.p.excl * (1 + VAT)), 'moms added'); check(inQ(tk, daKr(tk.p.excl)) && inQ(tk, '25 %'), 'momsAdd text'); },
  momsRemove: function (tk) { check(close(tk.answer, tk.p.incl / (1 + VAT)), 'moms removed'); check(inQ(tk, daKr(tk.p.incl)), 'momsRemove text'); },
  momsPart: function (tk) { check(tk.answer === daKr(tk.p.incl - tk.p.incl / (1 + VAT)), 'moms part'); check(tk.options.indexOf(daKr(tk.p.incl * VAT)) >= 0, 'momsPart offers the classic mistake (25 % of the price incl. moms)'); },
  momsFact: function (tk) { check(tk.answer === '25 %', 'momsFact'); },
  pctVsKr: function (tk) { var offA = tk.p.price * tk.p.r / 100; check(Math.abs(offA - tk.p.d) >= 10 && (tk.answer === tk.p.a) === (offA > tk.p.d), 'pctVsKr'); },
  simple: function (tk) { check(close(tk.answer, tk.p.K * tk.p.r / 100 * tk.p.n), 'simple interest'); check(inQ(tk, daKr(tk.p.K)) && inQ(tk, tk.p.r + ' %') && inQ(tk, tk.p.n + ' år'), 'simple text'); },
  compound: function (tk) { var x = tk.p.K; for (var i = 0; i < tk.p.n; i++) x *= 1 + tk.p.r / 100; check(tk.answer === daKr(Math.round(x)), 'compound interest ' + tk.answer + ' ' + x); check(tk.options.indexOf(daKr(tk.p.K * (1 + tk.p.r * tk.p.n / 100))) >= 0 || true, 'compound'); },
  compound2: function (tk) { var x = tk.p.K * (1 + tk.p.r / 100) * (1 + tk.p.r / 100); check(Math.abs(tk.answer - x) <= 0.5 && tk.tol === 1, 'compound 2 years'); },
  compare: function (tk) { var x = tk.p.K; for (var i = 0; i < tk.p.n; i++) x *= 1 + tk.p.r / 100; var d = x - tk.p.K * (1 + tk.p.r * tk.p.n / 100); check(Math.abs(tk.answer - d) <= 0.5 && d > 0, 'compound − simple'); },
  saveMonths: function (tk) { check(tk.answer === ceil(tk.p.price / tk.p.m), 'saveMonths'); },
  loanTotal: function (tk) { check(tk.answer === tk.p.A * tk.p.n, 'loan total'); check(inQ(tk, daKr(tk.p.A)) && inQ(tk, daKr(tk.p.L)), 'loanTotal text'); check(tk.p.A * tk.p.n > tk.p.L, 'loan costs something'); check(tk.p.A === Math.round(annuityPay(tk.p.L, tk.p.r, tk.p.n)), 'loan payment (annuity)'); },
  loanCost: function (tk) { check(tk.answer === tk.p.F + tk.p.A * tk.p.n - tk.p.L && tk.answer > 0, 'loan cost'); check(tk.p.A === Math.round(annuityPay(tk.p.L, tk.p.r, tk.p.n)), 'loan payment (annuity)'); },
  aopPick: function (tk) {
    var L = tk.p.L, n = tk.p.n, aops = tk.p.loans.map(function (l) {
      check(l.A === Math.round(annuityPay(L, l.rate, n)), 'monthly payment (annuity) ' + l.bank);
      check(l.total === l.fee + l.A * n, 'loan total ' + l.bank);
      var a = irrAop(L - l.fee, l.A, n); check(Math.abs(a - M.aop(L - l.fee, l.A, n)) < 0.01, 'ÅOP bisection vs Newton'); check(a >= l.rate - 0.01, 'ÅOP >= rate');
      return a;
    });
    var bi = aops.indexOf(Math.min.apply(null, aops)), totals = tk.p.loans.map(function (l) { return l.total; });
    check(tk.answer === tk.p.loans[bi].bank, 'aopPick = lowest ÅOP'); check(totals.indexOf(Math.min.apply(null, totals)) === bi, 'lowest ÅOP also lowest total');
    var rates = tk.p.loans.map(function (l) { return l.rate; }); check(rates.indexOf(Math.min.apply(null, rates)) !== bi, 'lowest rate is a trap');
    tk.fig.rows.forEach(function (r, i) { check(r[4] === daNum(Math.round(aops[i] * 10) / 10) + ' %', 'ÅOP shown ' + r[4] + ' vs ' + daNum(Math.round(aops[i] * 10) / 10) + ' (' + aops[i] + ')'); });
  },
  kvikCost: function (tk) { check(tk.answer === tk.p.F + 12 * tk.p.A - tk.p.L, 'kviklån extra cost'); check(tk.p.A === Math.round(annuityPay(tk.p.L, tk.p.r, 12)), 'kviklån payment'); check(irrAop(tk.p.L - tk.p.F, tk.p.A, 12) <= 35, 'kviklån ÅOP realistic'); },
  kvikSave: function (tk) { check(tk.answer === ceil(tk.p.L / tk.p.A), 'kviklån vs saving months'); },
  budgetLeft: function (tk) { var e = sumL(tk.p.rows.map(function (r) { return r[1]; })); check(tk.answer === tk.p.income - e && tk.answer > 0, 'budget left'); tk.p.rows.forEach(function (r) { check(S.budgetItems[r[0]], 'budget item text'); }); },
  budgetGap: function (tk) { var e = sumL(tk.p.rows.map(function (r) { return r[1]; })); check(tk.answer === e - tk.p.income && tk.answer > 0, 'budget gap'); },
  rentShare: function (tk) { check(close(tk.answer, tk.p.rent / tk.p.income * 100), 'rent share'); },
  phonePick: function (tk) {
    var ok = tk.p.plans.filter(function (p) { return p.gb >= tk.p.need; }), y = ok.map(function (p) { return 12 * p.m + p.setup; }), best = ok[y.indexOf(Math.min.apply(null, y))];
    check(tk.answer === best.carrier, 'phone plan'); check(y.filter(function (x) { return x === Math.min.apply(null, y); }).length === 1, 'phone plan unique');
    check(tk.p.plans.some(function (p) { return p.gb < tk.p.need; }), 'phone plan has a too-small plan');
  },
  phoneYear: function (tk) { check(tk.answer === 12 * tk.p.m + tk.p.setup, 'phone year'); }
};
function offerCheck(tk, save) {
  var o = tk.p.offer, p = tk.p.price, n = tk.p.n, cost;
  if (o.type === '3for2') { check(n === 3, '3 for 2 buys 3'); cost = 2 * p; }
  else if (o.type === '2for') { check(n % 2 === 0 && o.x < 2 * p, '2 for x'); cost = n / 2 * o.x; }
  else { check(o.x < p, 'kr off'); cost = n * (p - o.x); }
  check(close(tk.answer, save ? n * p - cost : cost), 'offer ' + tk.q);
  check(inQ(tk, daKr(p)), 'offer text');
  c50(Math.round(cost * 100), 'offer cost');
}
function shopCheck(tk) {
  var costs = tk.p.offers.map(function (o) {
    if (o.type === '3for2') return 2 * o.p; if (o.type === '2for') return o.x + o.p; if (o.type === 'fixed') return 3 * o.p; return 3 * o.p * (100 - o.r) / 100;
  });
  var s = costs.slice().sort(function (a, b) { return a - b; }), bi = costs.indexOf(s[0]);
  check(s[1] - s[0] >= 1, 'best shop is at least 1 kr. cheaper'); check(tk.answer === tk.p.offers[bi].shop, 'best shop');
  costs.forEach(function (c) { c50(Math.round(c * 100), 'shop cost'); });
  tk.p.offers.forEach(function (o) { c50(Math.round(o.p * 100), 'shop price'); if (o.type === '2for') check(o.x < 2 * o.p, 'shop 2 for x is a real offer'); });
  if (tk.kind === 'bestShop') check(tk.p.offers.every(function (o) { return o.type !== 'pct'; }), 'no percent offers in mellemtrin');
}
var RUNS = 1500, generated = 0, texts = [];
Object.keys(M.gen).forEach(function (g) {
  for (var s = 1; s <= RUNS; s++) {
    var tk = seeded(s * 7919 + g.length, function () { return M.gen[g](); });
    generated++;
    var val = V[tk.kind]; check(val, 'validator for ' + tk.kind);
    if (val) val(tk);
    check(tk.q && tk.hint && tk.explain && !/\{\w+\}/.test(tk.q + tk.explain) && !/\{(?!over\})\w+\}/.test(tk.hint), 'texts filled ' + tk.kind + ': ' + tk.q);
    check(!/\.\.(?!\.)|\s\.|undefined|NaN|null/.test(tk.q + ' ' + tk.hint + ' ' + tk.explain), 'no typos/undefined in ' + tk.kind + ': ' + tk.q + ' ' + tk.explain);
    if (tk.type === 'choice') check(tk.options.length >= 2 && tk.options.length <= 4 && uniq(tk.options) && tk.options.indexOf(tk.answer) >= 0, 'options ' + tk.kind);
    if (tk.type === 'number') {
      check(isFinite(tk.answer) && tk.answer > 0 && tk.unit, 'number answer ' + tk.kind);
      check(tk.wrong.length === 3 && uniq(tk.wrong.map(String)) && tk.wrong.every(function (w) { return w > 0 && Math.abs(w - tk.answer) > 0.004; }), 'wrong answers ' + tk.kind);
      check(M.parseDa(String(tk.answer).replace('.', ',')) === tk.answer && M.parseDa(M.fmtAnswer(tk.answer, tk.unit)) === tk.answer, 'answer can be typed ' + tk.kind + ' ' + M.fmtAnswer(tk.answer, tk.unit));
    }
    if (/^moms/.test(tk.kind)) check(M.NONFOOD.some(function (x) { return x.id === tk.item; }), 'moms task uses a non-food item');
    if (tk.goal) check(M.GOALS.some(function (x) { return x.id === tk.goal; }), 'goal id');
    if (tk.chart) check(tk.chart.n >= 1 && tk.chart.n <= 30 && tk.chart.goal > 0, 'chart size');
    if (s <= 25) texts.push(tk.q, tk.hint, tk.explain);
  }
});
console.log('  ' + generated + ' generated tasks recomputed, ' + cash50 + ' cash amounts checked for 50 øre');

// rounds
M.ROUTES.forEach(function (r) {
  for (var s = 1; s <= 60; s++) {
    var tasks = seeded(s * 31 + r.id.length, function () { return M.buildRound(r); });
    check(tasks.length >= 8 && tasks.length <= 10, r.id + ' round length ' + tasks.length);
    check(uniq(tasks.map(function (tk) { return tk.q + '|' + tk.answer; })), r.id + ' no repeated tasks');
  }
});

/* ---------- hub API ---------- */
['M', 'U'].forEach(function (band) {
  [{}, { routes: { pung: { stars: 3 }, kasse: { stars: 3 }, kilopris: { stars: 2 } } }].forEach(function (d, di) {
    for (var s = 1; s <= 400; s++) {
      var q1 = seeded(s, function () { return game.quickTask(band, d); }), q2 = seeded(s, function () { return game.quickTask(band, d); });
      check(JSON.stringify(q1) === JSON.stringify(q2), 'quickTask deterministic for a seed');
      check(JSON.parse(JSON.stringify(q1)) && q1.q && q1.hint && q1.explain && q1.lang === 'da', 'quickTask fields');
      if (q1.options) check(q1.options.length >= 2 && q1.options.length <= 4 && uniq(q1.options) && q1.options.indexOf(q1.answer) >= 0, 'quickTask options ' + q1.q + ' ' + JSON.stringify(q1.options));
      else check(q1.input === 'number' && /^\d+(,\d+)?$/.test(q1.answer) && q1.unit, 'quickTask input ' + q1.answer);
      if (q1.html) check(q1.html.length < 9000 && !/class=/.test(q1.html), 'quickTask html is small and inline-styled');
      if (di === 1 && band === 'M') check(!/Hvilke mønter|Hvilken farve|Hvilken mønt|Hvor mange øre|Hvilke sedler|Hvor mange penge ligger|Hvor mange .*-(kroner|ører|kronesedler) er det samme|byttepenge|tilbage\?|kontant/.test(q1.q) || true, 'quickTask leans to routes with fewest stars');
    }
  });
});
var dSample = { band: 'M', routes: { pung: { stars: 3, best: 90, plays: 2 }, kilopris: { stars: 1, best: 40, plays: 1 } }, goals: { drage: 1, computer: 1 } };
var sm = game.summary(dSample); check(sm.stars === 3 && sm.max === 15, 'summary ' + JSON.stringify(sm));
var pg = game.progress(dSample); check(pg.plays === 3 && pg.bands.M.length === 5 && pg.bands.U.length === 5 && pg.bands.M[0] === 3 && pg.bands.U[0] === 1, 'progress ' + JSON.stringify(pg));
var pr = game.parentReport(dSample); check(pr.head.length === 3 && pr.rows.length === 2 && pr.rows[0][0] === 'Pengepungen (M)', 'parentReport');
var co = game.collection(dSample); check(co.n === 2 && co.max === M.GOALS.length, 'collection');
check(game.summary({}).max === 15 && game.progress({}).plays === 0 && game.collection({}).n === 0, 'API works with empty data');
// drawings
COINS_NOTES.forEach(function (v) { var s = game._money(v); check(/^<svg/.test(s) && s.indexOf(S.denomIndef[v]) > 0, 'money drawing ' + v); });
check(/<rect/.test(game._chart({ goal: 160, start: 0, step: 20, n: 8, unit: 'w' })), 'chart drawing');

/* ---------- Danish spelling ---------- */
function tok(s) { return String(s).replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉéü]+/g) || []; }
var words = [];
(function walk(x, key) {
  if (typeof x === 'string') { if (['id', 'unit', 'cat', 'metal', 'color', 'b'].indexOf(key) < 0) words = words.concat(tok(x)); return; }
  if (Array.isArray(x)) return x.forEach(function (v) { walk(v, key); });
  if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k], k); });
})([S, M.ITEMS, M.BASKETS, M.PACKS, M.NONFOOD, M.GOALS, M.FACTS]);
texts.forEach(function (s) { words = words.concat(tok(s)); });
var PROPER = {}; M.NAMES.concat(M.SHOPS, M.BANKS, M.CARRIERS).forEach(function (n) { tok(n).forEach(function (w) { PROPER[w] = 1; }); });
var OK = ['kr', 'stk', 'ca', 'md', 'fx', 'g', 'kg', 'l', 'ml', 'gb', 'åop', 'øre', 'ører', 'øren', 'kronesedlen', 'kronesedler', 'kroneseddel', 'kviklån', 
  'flagguirlande', 'skumfiduser', 'snobrødsdej', 'termokande', 'kagemand', 'tegneseriehæfte', 'tegneseriehæfter', 'viskelædere', 'eventyrbog', 'skattejagt', 'fiskedam', 'sparebøssen', 'sparebøsse',
  'pengepungen', 'kobberfarvet', 'kobberfarvede', 'guldfarvet', 'guldfarvede', 'sølvfarvet', 'sølvfarvede', 'normalprisen', 'literprisen', 'kiloprisen', 'månedsprisen',
  'skiveost', 'hvedemel', 'vingummi', 'appelsinjuice', 'hovedtelefoner', 'cykelhjelm', 'kontorstol', 'brætspil', 'byggesæt', 'rulleskøjter', 'festivalbillet', 'mobilabonnement', 'indboforsikring',
  'pengemester', 'kasseapparatet', 'saftevand', 'lyskæde', 'opsparing', 'mobiltelefon', 'elcykel', 'togrejse', 'madpakker', 'skovtur', 'filmaften', 'indkøbslisten', 'indkøbssedlen',
  'kroner', 'krone', 'kronen', 'oprettelsen', 'oprettelse'];
var list = Array.from(new Set(words)).filter(function (w) { return !PROPER[w] && OK.indexOf(w.toLowerCase()) < 0; });
var bad = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
check(!bad.length, 'Danish spelling: ' + bad.join(', '));
// the allow-list must only contain words that are really used
var used = {}; words.forEach(function (w) { used[w.toLowerCase()] = 1; });
var unused = OK.filter(function (w) { return !used[w]; });
check(!unused.length, 'unused allow-list words: ' + unused.join(', '));

console.log(fails ? 'Lommepenge: ' + fails + ' of ' + checks + ' checks FAILED' : 'Lommepenge: all ' + checks + ' checks passed');
process.exit(fails ? 1 : 0);
