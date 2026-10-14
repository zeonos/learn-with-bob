// Builds verdensrejsen/maps.js from Natural Earth (public domain) and GeoNames (CC BY 4.0) data.
// Needs: mapshaper (npm i -g mapshaper) and the source files in NE_DIR (see README in tools).
// Run: NE_DIR=/path/to/ne node tools/build-verdensrejsen.js
'use strict';
var fs = require('fs'), path = require('path'), execFileSync = require('child_process').execFileSync;
var NE = process.env.NE_DIR || '/home/claude/ne';
var OUT = path.join(__dirname, '..', 'verdensrejsen', 'maps.js');
var P = require(path.join(__dirname, '..', 'verdensrejsen', 'places.js'));

function ms(args) { // run mapshaper, return parsed GeoJSON
  try {
    var out = execFileSync('mapshaper', ['-i', args[0], '-quiet'].concat(args.slice(1)).concat(['-o', 'format=geojson', '-']), { maxBuffer: 1 << 30, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (e) { console.error('mapshaper failed:', args.join(' '), '\n', e.stderr || e.message); throw e; }
}
function r1(n) { return Math.round(n * 10) / 10; }

/* ---------- projections (all maps are 1000 units wide) ---------- */
function equirect(bbox, latc) {
  var k = Math.cos(latc * Math.PI / 180), w = (bbox[2] - bbox[0]) * k, h = bbox[3] - bbox[1], s = 1000 / w;
  return { type: 'eq', lon0: bbox[0], lat1: bbox[3], k: k, s: s, W: 1000, H: Math.round(h * s),
    f: function (lon, lat) { return [(lon - bbox[0]) * k * s, (bbox[3] - lat) * s]; } };
}
function equalEarth() {
  var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
  function raw(lon, lat) {
    var l = lon * Math.PI / 180, p = lat * Math.PI / 180, t = Math.asin(M * Math.sin(p)), t2 = t * t, t6 = t2 * t2 * t2;
    return [l * Math.cos(t) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))), t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))];
  }
  var xmax = raw(180, 0)[0], ymax = raw(0, 90)[1], s = 1000 / (2 * xmax);
  return { type: 'ee', s: s, W: 1000, H: Math.round(2 * ymax * s), f: function (lon, lat) { var p = raw(lon, lat); return [(p[0] + xmax) * s, (ymax - p[1]) * s]; } };
}

/* ---------- geometry → compact rings ---------- */
function rings(geom, proj, closed) {
  var out = [];
  function ring(coords) {
    var flat = [], lx = null, ly = null;
    coords.forEach(function (c) { var p = proj.f(c[0], c[1]), x = r1(p[0]), y = r1(p[1]); if (x !== lx || y !== ly) { flat.push(x, y); lx = x; ly = y; } });
    if (flat.length >= (closed ? 6 : 4)) out.push(flat);
  }
  if (!geom) return out;
  if (geom.type === 'Polygon') geom.coordinates.forEach(ring);
  else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(function (pg) { pg.forEach(ring); });
  else if (geom.type === 'LineString') ring(geom.coordinates);
  else if (geom.type === 'MultiLineString') geom.coordinates.forEach(ring);
  return out;
}
function centroidOf(rs) { // a point well inside the largest ring (pole of inaccessibility, grid search) – for labels, plane targets and tests
  var f = rs.reduce(function (a, b) { return ringArea(b) > ringArea(a) ? b : a; }, rs[0]);
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (var i = 0; i < f.length; i += 2) { x0 = Math.min(x0, f[i]); x1 = Math.max(x1, f[i]); y0 = Math.min(y0, f[i + 1]); y1 = Math.max(y1, f[i + 1]); }
  var best = [f[0], f[1]], bd = -1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, h = y1 - y0;
  for (var it = 0; it < 4; it++) {
    for (var gx = 0; gx <= 24; gx++) for (var gy = 0; gy <= 24; gy++) {
      var p = [cx - w / 2 + w * gx / 24, cy - h / 2 + h * gy / 24];
      if (!pointIn(p, [f]) || !pointIn(p, rs)) continue;
      var d = edgeDist(p, rs); if (d > bd) { bd = d; best = p; }
    }
    cx = best[0]; cy = best[1]; w /= 4; h /= 4;
  }
  return [r1(best[0]), r1(best[1])];
}
function ringArea(f) { var a = 0; for (var i = 0; i < f.length; i += 2) { var j = (i + 2) % f.length; a += f[i] * f[j + 1] - f[j] * f[i + 1]; } return Math.abs(a / 2); }
function edgeDist(p, rs) {
  var best = Infinity;
  rs.forEach(function (f) {
    for (var i = 0; i < f.length; i += 2) {
      var j = (i + 2) % f.length, ax = f[i], ay = f[i + 1], dx = f[j] - ax, dy = f[j + 1] - ay, l = dx * dx + dy * dy;
      var u = l ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l)) : 0, x = ax + u * dx - p[0], y = ay + u * dy - p[1];
      best = Math.min(best, Math.sqrt(x * x + y * y));
    }
  });
  return best;
}
function lineMid(rs) { var f = rs.reduce(function (a, b) { return b.length > a.length ? b : a; }, []), i = Math.floor(f.length / 4) * 2; return [f[i], f[i + 1]]; }
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

var maps = {};
var POP = JSON.parse(fs.readFileSync(path.join(NE, 'ne_10m_populated_places_simple.geojson'), 'utf8')).features.map(function (f) { return f.properties; });
var CAPS = {};
POP.forEach(function (p) { if (p.featurecla === 'Admin-0 capital') { if (!CAPS[p.adm0_a3] || p.pop_max > CAPS[p.adm0_a3].pop_max) CAPS[p.adm0_a3] = p; } });
var GEO = JSON.parse(fs.readFileSync(path.join(NE, 'cities.json'), 'utf8')).filter(function (c) { return c.country === 'DK'; });

/* ---------- Denmark ---------- */
(function () {
  var bbox = [7.9, 54.45, 15.3, 57.85], proj = equirect(bbox, 56.2);
  var land = ms([path.join(NE, 'ne_10m_admin_0_countries.geojson'), '-filter-fields', 'ADM0_A3', '-filter', '"DNK,DEU,SWE".indexOf(ADM0_A3) > -1', '-clip', 'bbox=' + bbox.join(','), '-explode', '-simplify', 'interval=250', 'keep-shapes']);
  var islands = {}, bg = [];
  land.features.forEach(function (f) {
    var rs = rings(f.geometry, proj, true); if (!rs.length) return;
    if (f.properties.ADM0_A3 !== 'DNK') { bg.push(rs); return; }
    var c = centroidOf(rs), name = null;
    P.islands.forEach(function (is) { if (pointIn(proj.f(is.lon, is.lat), rs)) name = is.id; });
    if (!name) name = 'dk-other';
    (islands[name] = islands[name] || []).push.apply(islands[name], rs);
  });
  P.islands.forEach(function (is) { if (!islands[is.id]) throw new Error('island not found in data: ' + is.id); });
  var towns = P.towns.map(function (t) {
    var g = t.geo ? GEO.filter(function (c) { return c.name === t.geo; })[0] : null;
    var lat = g ? +g.lat : t.lat, lon = g ? +g.lng : t.lon;
    if (!(lat > 54 && lat < 58 && lon > 8 && lon < 15.3)) throw new Error('town coords missing: ' + t.id);
    var p = proj.f(lon, lat);
    return { id: t.id, x: r1(p[0]), y: r1(p[1]), lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4 };
  });
  maps.dk = { proj: { type: 'eq', lon0: bbox[0], lat1: bbox[3], k: proj.k, s: proj.s }, W: proj.W, H: proj.H, bg: bg,
    land: Object.keys(islands).map(function (id) { return { id: id, r: islands[id], c: centroidOf(islands[id]) }; }), points: towns };
})();

/* ---------- Norden & Europe (50m) ---------- */
function regional(key, bbox, latc, ids, pointIds) {
  var proj = equirect(bbox, latc);
  var fc = ms([path.join(NE, 'ne_50m_admin_0_countries.geojson'), '-filter-fields', 'ADM0_A3', '-clip', 'bbox=' + bbox.join(','), '-simplify', 'interval=2500', 'keep-shapes']);
  var land = [], bg = [];
  fc.features.forEach(function (f) {
    var id = f.properties.ADM0_A3, rs = rings(f.geometry, proj, true); if (!rs.length) return;
    if (ids.indexOf(id) >= 0) land.push({ id: id, r: rs, c: centroidOf(rs) }); else bg.push(rs);
  });
  ids.forEach(function (id) { if (!land.some(function (l) { return l.id === id; })) throw new Error(key + ': country not in data ' + id); });
  var points = pointIds.map(function (id) {
    var c = CAPS[id] || (P.extraCapitals[id] && { latitude: P.extraCapitals[id].lat, longitude: P.extraCapitals[id].lon });
    if (!c) throw new Error('no capital for ' + id);
    var p = proj.f(c.longitude, c.latitude);
    return { id: 'cap-' + id, x: r1(p[0]), y: r1(p[1]), lat: Math.round(c.latitude * 1e4) / 1e4, lon: Math.round(c.longitude * 1e4) / 1e4 };
  });
  maps[key] = { proj: { type: 'eq', lon0: bbox[0], lat1: bbox[3], k: proj.k, s: proj.s }, W: proj.W, H: proj.H, bg: bg, land: land, points: points };
}
regional('norden', [-56, 54, 33, 76.5], 64, P.nordenIds, P.nordenCapitals);
regional('europe', [-25, 34, 45, 71.5], 52, Object.keys(P.europe), Object.keys(P.europe).filter(function (id) { return P.europe[id].cap; }));

/* ---------- World ---------- */
(function () {
  var proj = equalEarth();
  var fc = ms([path.join(NE, 'ne_110m_admin_0_countries.geojson'), '-filter-fields', 'ADM0_A3,POP_EST,POP_YEAR,CONTINENT', '-simplify', 'interval=15000', 'keep-shapes']);
  var land = [], meta = {};
  fc.features.forEach(function (f) {
    var id = f.properties.ADM0_A3, rs = rings(f.geometry, proj, true); if (!rs.length) return;
    land.push({ id: id, r: rs, c: centroidOf(rs) });
    meta[id] = { pop: f.properties.POP_EST, year: f.properties.POP_YEAR, cont: f.properties.CONTINENT };
  });
  var regions = ms([path.join(NE, 'ne_110m_geography_regions_polys.geojson'), '-filter-fields', 'NAME,FEATURECLA', '-simplify', 'interval=40000', 'keep-shapes']).features;
  var continents = P.continents.map(function (c) {
    var rs = []; regions.forEach(function (f) { if (c.ne.indexOf(f.properties.NAME) >= 0) rs = rs.concat(rings(f.geometry, proj, true)); });
    if (!rs.length) throw new Error('continent missing ' + c.id);
    return { id: c.id, r: rs, c: centroidOf(rs) };
  });
  var marine = ms([path.join(NE, 'ne_110m_geography_marine_polys.geojson'), '-filter-fields', 'name', '-simplify', 'interval=40000', 'keep-shapes']).features;
  var seas = P.seas.map(function (s) {
    var rs = []; marine.forEach(function (f) { if (s.ne.indexOf(f.properties.name) >= 0) rs = rs.concat(rings(f.geometry, proj, true)); });
    if (!rs.length) throw new Error('sea missing ' + s.id);
    return { id: s.id, r: rs, c: centroidOf(rs) };
  });
  var r50 = ms([path.join(NE, 'ne_50m_geography_regions_polys.geojson'), '-filter-fields', 'NAME,FEATURECLA', '-filter', 'FEATURECLA=="Range/mtn" || FEATURECLA=="Desert"', '-simplify', 'interval=20000', 'keep-shapes']).features;
  var ranges = P.ranges.map(function (g) {
    var rs = []; r50.forEach(function (f) { if (g.ne.indexOf(f.properties.NAME) >= 0) rs = rs.concat(rings(f.geometry, proj, true)); });
    if (!rs.length) throw new Error('range missing ' + g.id);
    return { id: g.id, r: rs, c: centroidOf(rs) };
  });
  var rv = ms([path.join(NE, 'ne_50m_rivers_lake_centerlines.geojson'), '-filter-fields', 'name', '-simplify', 'interval=15000']).features;
  var rivers = P.rivers.map(function (g) {
    var rs = []; rv.forEach(function (f) { if (g.ne.indexOf(f.properties.name) >= 0) rs = rs.concat(rings(f.geometry, proj, false)); });
    if (!rs.length) throw new Error('river missing ' + g.id);
    return { id: g.id, r: rs, c: lineMid(rs) };
  });
  var caps = Object.keys(P.world).filter(function (id) { return P.world[id].cap; }).map(function (id) {
    var c = CAPS[id]; if (!c) throw new Error('no world capital ' + id);
    var p = proj.f(c.longitude, c.latitude);
    return { id: 'cap-' + id, x: r1(p[0]), y: r1(p[1]) };
  });
  maps.world = { proj: { type: 'ee' }, W: proj.W, H: proj.H, bg: [], land: land, continents: continents, seas: seas, ranges: ranges, rivers: rivers, points: caps, meta: meta };
})();

// population facts for countries used in the game (from Natural Earth, with year)
var fifty = JSON.parse(fs.readFileSync(path.join(NE, 'ne_50m_admin_0_countries.geojson'), 'utf8')).features;
var facts = {};
fifty.forEach(function (f) { var p = f.properties; facts[p.ADM0_A3] = { pop: p.POP_EST, year: p.POP_YEAR, cont: p.CONTINENT }; });
maps.facts = facts;
// check capitals in data match the Danish list (English name in Natural Earth vs. expected)
var capCheck = {};
Object.keys(P.europe).concat(Object.keys(P.world)).forEach(function (id) { if (CAPS[id]) capCheck[id] = CAPS[id].name; });
maps.capCheck = capCheck;

var js = '/* Kortdata til Verdensrejsen. Lavet af tools/build-verdensrejsen.js ud fra Natural Earth (public domain) og GeoNames (CC BY 4.0). Ret ikke i hånden. */\n' +
  '(function (root) { var M = ' + JSON.stringify(maps) + ';\n root.VR_MAPS = M; if (typeof module !== "undefined" && module.exports) module.exports = M; })(typeof window !== "undefined" ? window : this);\n';
fs.writeFileSync(OUT, js);
console.log('Wrote ' + OUT + ' (' + Math.round(js.length / 1024) + ' KB)');
Object.keys(maps).forEach(function (k) { if (maps[k].land) console.log(k, maps[k].W + 'x' + maps[k].H, 'land ' + maps[k].land.length, 'points ' + (maps[k].points || []).length); });
