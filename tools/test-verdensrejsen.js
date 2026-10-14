// Verdensrejsen: checks places, map data and Danish names. Run: node tools/test-verdensrejsen.js  (needs hunspell + hunspell-da)
'use strict';
global.window = global;
require('../shared/strings-da.js'); require('../verdensrejsen/strings-da.js');
var P = require('../verdensrejsen/places.js'), M = require('../verdensrejsen/maps.js'), S = window.STR.vr;
var execFileSync = require('child_process').execFileSync;
var fails = 0;
function check(ok, msg) { if (!ok) { fails++; console.log('FAIL', msg); } }

function pointIn(pt, rs) {
  var inside = false;
  rs.forEach(function (f) {
    for (var i = 0, j = f.length - 2; i < f.length; j = i, i += 2) {
      var xi = f[i], yi = f[i + 1], xj = f[j], yj = f[j + 1];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
    }
  });
  return inside;
}
function landAt(m, p) { for (var i = 0; i < m.land.length; i++) if (pointIn(p, m.land[i].r)) return m.land[i].id; return null; }
function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
function km(a, b) {
  var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
  var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}
function unproject(m, x, y) { var pr = m.proj; return { lon: x / (pr.k * pr.s) + pr.lon0, lat: pr.lat1 - y / pr.s }; }

// --- Danish towns: every town has a point, it lies on Danish land, and the projection round-trips
P.towns.forEach(function (tw) {
  var p = byId(M.dk.points, tw.id);
  check(p, 'town ' + tw.id + ' has no point'); if (!p) return;
  check(km(unproject(M.dk, p.x, p.y), p) < 1, 'town ' + tw.id + ' projection round-trip');
  check(p.lat > 54.5 && p.lat < 57.8 && p.lon > 8 && p.lon < 15.2, 'town ' + tw.id + ' outside Denmark');
});
// known positions (rough, from the map of Denmark): north-south and east-west order
function tp(id) { return byId(M.dk.points, id); }
check(tp('skagen').lat > tp('aalborg').lat && tp('aalborg').lat > tp('aarhus').lat && tp('aarhus').lat > tp('kolding').lat, 'Jutland north-south order');
check(tp('esbjerg').lon < tp('kolding').lon && tp('odense').lon < tp('kobenhavn').lon && tp('kobenhavn').lon < tp('roenne').lon, 'west-east order');
check(km(tp('kobenhavn'), { lat: 55.676, lon: 12.568 }) < 5, 'København position');
check(km(tp('aarhus'), { lat: 56.157, lon: 10.211 }) < 5, 'Aarhus position');
check(km(tp('odense'), { lat: 55.403, lon: 10.402 }) < 5, 'Odense position');

// independent reference positions (rounded, from standard atlases): every town within 4 km
var REF = { aalborg: [57.05, 9.92], esbjerg: [55.47, 8.45], randers: [56.46, 10.04], kolding: [55.49, 9.47], horsens: [55.86, 9.85], vejle: [55.71, 9.54],
  roskilde: [55.64, 12.08], herning: [56.14, 8.97], silkeborg: [56.17, 9.55], naestved: [55.23, 11.76], fredericia: [55.57, 9.75], viborg: [56.45, 9.40],
  koege: [55.46, 12.18], holstebro: [56.36, 8.62], slagelse: [55.40, 11.35], hilleroed: [55.93, 12.30], soenderborg: [54.91, 9.79], svendborg: [55.06, 10.61],
  hjoerring: [57.46, 9.98], frederikshavn: [57.44, 10.54], helsingoer: [56.03, 12.61], ribe: [55.33, 8.76], skagen: [57.72, 10.58], roenne: [55.10, 14.70],
  nykoebing: [54.77, 11.87], thisted: [56.96, 8.69], haderslev: [55.25, 9.49], aabenraa: [55.04, 9.42], toender: [54.93, 8.86], grenaa: [56.42, 10.88],
  kalundborg: [55.68, 11.09], ringkoebing: [56.09, 8.24], hirtshals: [57.59, 9.96], skive: [56.57, 9.03], nakskov: [54.83, 11.13], billund: [55.73, 9.11] };
Object.keys(REF).forEach(function (id) { var p = tp(id); check(km(p, { lat: REF[id][0], lon: REF[id][1] }) < 4, 'town ' + id + ' position'); });

// --- islands: label point is on the island, and the island's reference point falls inside the polygon
P.islands.forEach(function (is) {
  var l = byId(M.dk.land, is.id); check(l, 'island ' + is.id + ' missing'); if (!l) return;
  check(landAt(M.dk, l.c) === is.id, 'island ' + is.id + ' label point not on the island');
});
check(P.islands.length === M.dk.land.length, 'dk land count');

// --- regional maps: countries and capitals
function regional(key, src, ids) {
  var m = M[key];
  ids.forEach(function (id) {
    var l = byId(m.land, id); check(l, key + ' land ' + id + ' missing'); if (!l) return;
    check(landAt(m, l.c) === id, key + ' ' + id + ' label point not inside');
    if (src[id].cap) {
      var c = byId(m.points, 'cap-' + id); check(c, key + ' capital point ' + id); if (!c) return;
      check(c.x >= 0 && c.x <= m.W && c.y >= 0 && c.y <= m.H, key + ' capital ' + id + ' outside map');
    }
  });
}
regional('norden', P.norden, P.nordenIds);
regional('europe', P.europe, Object.keys(P.europe));
// capitals on the Norden map lie in their own country (or within 15 km of it: coastal capitals)
P.nordenIds.forEach(function (id) {
  var c = byId(M.norden.points, 'cap-' + id), at = landAt(M.norden, [c.x, c.y]);
  check(at === id || at === null, 'norden capital ' + id + ' lies in ' + at);
});

// --- capital names: our Danish names vs. Natural Earth's English names (expected differences listed)
var EXPECTED = {
  BEL: 'Brussels', GRC: 'Athens', ITA: 'Rome', POL: 'Warsaw', PRT: 'Lisbon', ROU: 'Bucharest', RUS: 'Moscow', SRB: 'Belgrade', CZE: 'Prague',
  AUT: 'Vienna', UKR: 'Kiev', EGY: 'Cairo', DZA: 'Algiers', ETH: 'Addis Ababa', SAU: 'Riyadh', IRN: 'Tehran', MNG: 'Ulaanbaatar',
  KAZ: 'Nur-Sultan', USA: 'Washington, D.C.', MEX: 'Mexico City', CUB: 'Havana', COL: 'Bogota', BRA: 'Brasilia', ISL: 'Reykjavik', DNK: 'Copenhagen',
  KOR: 'Seoul', IRQ: 'Baghdad', SDN: 'Khartoum', PHL: 'Manila', VNM: 'Hanoi', CYP: 'Nicosia', NLD: 'Amsterdam', CHE: 'Bern'
};
var allCountries = Object.assign({}, P.world, P.europe);
Object.keys(M.capCheck).forEach(function (id) {
  var ne = M.capCheck[id].replace(/\s+/g, ' '), da = allCountries[id].cap; if (!da) return;
  var same = ne.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === (da || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  check(same || EXPECTED[id] === ne || ne.indexOf(da) >= 0, 'capital ' + id + ': ours "' + da + '", Natural Earth "' + ne + '"');
});
Object.keys(allCountries).forEach(function (id) { if (allCountries[id].cap) check(M.capCheck[id] || P.extraCapitals[id], 'capital ' + id + ' not cross-checked'); });
// Lex names that must stay as they are (spot checks against the Danish lists)
[['KAZ', 'Astana'], ['UKR', 'Kyiv'], ['MNG', 'Ulan Bator'], ['ETH', 'Addis Abeba'], ['NLD', 'Amsterdam'], ['DZA', 'Algier'], ['IRN', 'Teheran'], ['IND', 'New Delhi']]
  .forEach(function (x) { check(allCountries[x[0]].cap === x[1], 'capital ' + x[0] + ' should be ' + x[1]); });

// --- world map
var W = M.world;
Object.keys(P.world).forEach(function (id) {
  var l = byId(W.land, id); check(l, 'world land ' + id + ' missing'); if (!l) return;
  check(landAt(W, l.c) === id, 'world ' + id + ' label point not inside');
  if (P.world[id].cap) check(byId(W.points, 'cap-' + id), 'world capital ' + id);
  check(W.meta[id] && W.meta[id].pop > 0 && W.meta[id].cont, 'world meta ' + id);
});
P.continents.forEach(function (c) {
  var g = byId(W.continents, c.id); check(g, 'continent ' + c.id); if (!g) return;
  check(pointIn(g.c, g.r), 'continent ' + c.id + ' label point not inside');
  check(S.continents[c.cont] === c.da, 'continent name ' + c.id);
});
P.seas.forEach(function (s) {
  var g = byId(W.seas, s.id); check(g, 'sea ' + s.id); if (!g) return;
  check(pointIn(g.c, g.r) && !landAt(W, g.c), 'sea ' + s.id + ' label point not in open water');
});
P.ranges.forEach(function (r) { var g = byId(W.ranges, r.id); check(g && g.r.length, 'range ' + r.id); if (g) check(landAt(W, g.c), 'range ' + r.id + ' label point not on land'); });
P.rivers.forEach(function (r) { var g = byId(W.rivers, r.id); check(g && g.r.length, 'river ' + r.id); });
// sanity: a few places are where they should be
function wl(id) { return byId(W.land, id).c; }
check(wl('NOR')[1] < wl('DEU')[1] && wl('DEU')[1] < wl('EGY')[1] && wl('EGY')[1] < wl('ZAF')[1], 'world north-south order');
check(wl('USA')[0] < wl('FRA')[0] && wl('FRA')[0] < wl('IND')[0] && wl('IND')[0] < wl('JPN')[0], 'world west-east order');
var nile = byId(W.rivers, 'nilen'); check(nile.r.some(function (f) { for (var i = 0; i < f.length; i += 2) if (landAt(W, [f[i], f[i + 1]]) === 'EGY') return true; return false; }), 'Nile runs through Egypt');
var alps = byId(W.ranges, 'alperne'); check(['CHE', 'AUT', 'ITA', 'FRA', 'DEU'].indexOf(landAt(W, alps.c)) >= 0, 'Alps label point in an Alpine country, got ' + landAt(W, alps.c));
var sahara = byId(W.ranges, 'sahara'); check(['DZA', 'LBY', 'EGY', 'NER', 'MLI', 'TCD', 'MRT', 'SDN'].indexOf(landAt(W, sahara.c)) >= 0, 'Sahara in North Africa');

// --- clues: every clue country is on the world map, has facts, and the clue does not name the country or capital
Object.keys(P.clues).forEach(function (id) {
  var c = P.world[id] || P.europe[id];
  check(P.world[id], 'clue country ' + id + ' must be in the world list'); if (!c) return;
  check(M.facts[id] && M.facts[id].pop > 0, 'clue facts ' + id);
  check(P.clues[id].indexOf(c.da) < 0 && (!c.cap || P.clues[id].indexOf(c.cap) < 0), 'clue for ' + id + ' gives the answer away');
  check(/[.!?]$/.test(P.clues[id]), 'clue ' + id + ' punctuation');
});
check(Object.keys(P.clues).filter(function (id) { return P.world[id]; }).length >= 14, 'enough clue countries');

// --- compass: enough distinct well-defined pairs exist for every direction
var counts = [0, 0, 0, 0, 0, 0, 0, 0];
P.towns.forEach(function (a) { P.towns.forEach(function (b) {
  if (a === b) return; var pa = tp(a.id), pb = tp(b.id), dx = pb.x - pa.x, dy = pb.y - pa.y; if (Math.hypot(dx, dy) < 130) return;
  var ang = Math.atan2(dx, -dy) * 180 / Math.PI; if (ang < 0) ang += 360; var s = Math.round(ang / 45) % 8;
  if (Math.min(Math.abs(ang - s * 45), Math.abs(ang - 360)) <= 12) counts[s]++;
}); });
counts.forEach(function (n, i) { check(n >= 5, 'compass direction ' + S.dirs[i] + ' has only ' + n + ' pairs'); });
// a real-world compass check: Skagen is north of Aarhus, København east of Odense
check(tp('skagen').y < tp('aarhus').y && tp('kobenhavn').x > tp('odense').x, 'compass sanity');

// --- routes
P.routes.forEach(function (r) { check(r.b === 'M' || r.b === 'U', 'route band ' + r.id); check(M[r.map], 'route map ' + r.id); });
['M', 'U'].forEach(function (b) { check(P.routes.filter(function (r) { return r.b === b; }).length >= 5, 'routes in band ' + b); });

// --- Danish spelling of every name and clue
var NAMES = ['Bob', 'kr', 'Rocky', 'Mountains', 'Fuji', 'Giza', 'Taj', 'Mahal', 'Machu', 'Picchu', 'Chichén', 'Itzá', 'Akropolis', 'Sagrada', 'Família', 'Brandenburger', 'Tor', 'Ringenes', 'Big', 'Ben', 'Lex', 'Natural', 'Earth', 'GeoNames', 'ca', 'mio', 'mia'];
var words = [];
function add(text) { (String(text).replace(/\{\w+\}/g, ' ').match(/[A-Za-zÆØÅæøåÉéáíóúÍÁ]+/g) || []).forEach(function (w) { if (NAMES.indexOf(w) < 0) words.push(w); }); }
// place names: checked against the dictionary in a separate list, since many foreign names are not in a Danish dictionary
var placeWords = [];
function addPlace(text) { (String(text).match(/[A-Za-zÆØÅæøåÉéáíóúÍÁ]+/g) || []).forEach(function (w) { placeWords.push(w); }); }
Object.keys(P.clues).forEach(function (id) { add(P.clues[id]); });
P.routes.forEach(function (r) { add(r.name); add(r.desc); });
(function walk(o) { if (typeof o === 'string') add(o); else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (k !== 'continents') walk(o[k]); }); })(S);
[].concat(P.towns, P.islands, P.continents, P.seas, P.ranges, P.rivers).forEach(function (x) { addPlace(x.da); });
Object.keys(allCountries).forEach(function (id) { addPlace(allCountries[id].da); if (allCountries[id].cap) addPlace(allCountries[id].cap); });
function unknown(list) {
  list = Array.from(new Set(list)); if (!list.length) return [];
  return execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
}
var u = unknown(words.filter(function (w) { return placeWords.indexOf(w) < 0; }));
check(!u.length, 'unknown words in texts/clues: ' + u.join(', '));
var up = unknown(placeWords);
console.log('Place names not in the Danish dictionary (foreign names, checked against Lex by hand): ' + up.length);
console.log('  ' + up.join(', '));

console.log(fails ? fails + ' FAILURES' : 'Verdensrejsen data: all checks passed (' + P.towns.length + ' towns, ' + P.islands.length + ' islands, ' + Object.keys(allCountries).length + ' countries, ' + Object.keys(P.clues).length + ' clues)');
process.exit(fails ? 1 : 0);
