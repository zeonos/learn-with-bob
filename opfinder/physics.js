/*
 * Opfinderværkstedet – maskinens regler (OF_PHYS). Ingen fri fysik: alt sker felt for felt i små skridt (»tik«),
 * så den samme maskine altid gør det samme. tools/test-opfinder.js har sin egen udgave af reglerne og tjekker,
 * at de to er enige.
 *
 * REGLERNE
 * Tik 1: hver skubber (>, <) puffer til feltet foran sig. Håndsving og motorer uden knap starter.
 * Hvert tik: først det, der var sat til at ske nu (væltende dominobrikker, vand, tandhjul og hejs, der bliver færdige),
 * så flytter kugler og lodder sig ét felt (i rækkefølge), og til sidst ser vipperne efter, om de skal tippe.
 * Maskinen stopper, når et tik går uden at noget sker, og intet venter. Højst 200 tik.
 *
 * Kugle og lod (»aktører«):
 *  - Står kuglen i en rampe, triller den ud af rampens lave side (vandret, ét felt), og dens retning bliver rampens.
 *  - Ellers falder den ét felt, hvis feltet under er tomt (også reb og en væltet dominobrik), en rampe (kun kugler),
 *    en kop (kun kugler) eller en kurv. Den beholder sin retning, mens den falder lodret.
 *  - Lander den på noget, sker der det samme som ved et puf fra oven: klokken ringer, knappen trykkes, vandkanden vælter.
 *  - En kugle med retning triller ét felt til siden. Er feltet tomt, triller den ind. En rampe kommer kuglen kun ind i
 *    oppefra: fra siden er rampens høje ende en væg (og den lave ende et skråt stykke op ad), så der stopper den. Ellers puffer den til feltet og stopper (en kugle får fart; en dominobrik vælter;
 *    en klokke ringer; en knap trykkes; en vandkande vælter). Uden for gitteret er der væg.
 *  - Kommer en kugle (trillende eller faldende) til feltet lige over en fjeder, kaster fjederen den: to felter skråt op
 *    i fjederens retning. Er der noget i vejen, puffer kuglen til det og falder ned derfra.
 *  - En kugle eller et lod i en kop eller en kurv bliver liggende.
 *  - Lodder triller aldrig, og fjedre kaster dem ikke.
 * Dominobrik: vælter ét tik efter et puf fra siden og puffer så til feltet på den anden side.
 * Vandkande: vælter ved et puf; tikket efter løber vandet lige ned fra tuden, til det rammer noget (en blomst får vand).
 * Vippe: armene tæller felter fra omdrejningspunktet. Det, der ligger oven på en arm, trækker med vægt · afstand.
 *  Lodder og kugler, der ligger oven på hinanden, trykker sammen.
 *  Vippen starter vandret (eller skæv, hvis banen siger det). Trækker den ene side mere end den anden, tipper vippen
 *  til den side (også tilbage igen); er siderne lige, bliver den stående. Når den tipper, puffer den høje ende opad til
 *  feltet over sig (en kugle der bliver kastet to felter skråt op mod den anden side), og den lave ende puffer til
 *  feltet under sig. En vippe med »balance« skal stå vandret til sidst med lige meget på begge sider; en vippe med
 *  »want« skal ende med at hælde til den side.
 * Tandhjul: tandhjul i nabofelter (vandret/lodret) griber ind i hinanden. Drejer et hjul med z1 tænder t gange, drejer
 *  nabohjulet med z2 tænder t · z1/z2 gange den modsatte vej. Kan et hjul ikke få én bestemt fart og retning, låser det hele.
 *  Spillet (h) hejser sin spand 1 felt pr. omgang med uret; mod uret bliver rebet bare slapt.
 * Hejs med trisse: med n bærende rebparter skal der kun trækkes last/n, men rebet skal trækkes n gange så langt.
 *  Kurv: falder der nok vægt i kurven (vægt · n > last), synker kurven til bunds, og lasten kommer fald/n op.
 *  Motor: kan trække F kg og har R m reb. Last/n > F: motoren er for svag. Ellers hejses lasten op til målet,
 *  med mindre rebet slipper op først (R/n < målet).
 * Knap: trykkes, når noget puffer til den, lander på den eller triller op på den. Den tænder det, den er forbundet til
 *  (en dør, et håndsving eller en motor).
 */
(function (root) {
  'use strict';
  var P = root.OF_PARTS || (typeof require === 'function' ? require('./parts.js') : null);
  var COLS = P.COLS, ROWS = P.ROWS, MAXT = 200, GEAR_T = 4, MOTOR_T = 4, EPS = 1e-9;

  function idx(c, r) { return r * COLS + c; }
  function inside(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }
  function near(a, b) { return Math.abs(a - b) < EPS; }

  /* ---------- building a world from a list of parts ---------- */
  function build(list) {
    var W = { grid: new Array(COLS * ROWS), parts: [], actors: [], levers: [], rigs: [], winches: [], cranks: [], trains: [], names: {}, problems: [] };
    list.forEach(function (p0) {
      var p = P.copy(p0);
      if (!inside(p.c, p.r)) { W.problems.push('outside'); return; }
      if (P.KINDS[p.k] && P.KINDS[p.k].actor) {
        W.actors.push({ k: p.k, c: p.c, r: p.r, m: p.m || P.BALL_KG, dx: 0, falling: false, done: false, hop: null, held: -1, src: p, id: W.actors.length });
        if (W.grid[idx(p.c, p.r)]) W.problems.push('overlap');
        return;
      }
      if (W.grid[idx(p.c, p.r)] || W.actors.some(function (a) { return a.c === p.c && a.r === p.r; })) { W.problems.push('overlap'); return; }
      p.ix = W.parts.length; W.grid[idx(p.c, p.r)] = p; W.parts.push(p);
      if (p.name) W.names[p.name] = p;
    });
    var at = function (c, r) { return inside(c, r) ? W.grid[idx(c, r)] : null; };
    W.parts.forEach(function (p) {
      if (p.k === 'pivot') { // a lever: the arms are the '-' cells on both sides
        var L = { pc: p.c, pr: p.r, left: 0, right: 0, state: p.start || 0, start: p.start || 0, flips: [], t: -1, pivot: p, goal: !!p.balance };
        while (at(p.c - L.left - 1, p.r) && at(p.c - L.left - 1, p.r).k === 'arm') { L.left++; at(p.c - L.left, p.r).lever = L; }
        while (at(p.c + L.right + 1, p.r) && at(p.c + L.right + 1, p.r).k === 'arm') { L.right++; at(p.c + L.right, p.r).lever = L; }
        p.lever = L; W.levers.push(L);
      }
      if (p.k === 'wheel' && at(p.c + 1, p.r) && at(p.c + 1, p.r).k === 'wheel') { // a hoist: two wheel cells, the load hangs below one of them
        var rig = { rw: p.r, n: 1, state: 0, mass: 0, rise: 0, drop: 0, t0: -1, t1: -1, done: false, max: 0 };
        [p.c, p.c + 1].forEach(function (c) {
          for (var r = p.r + 1; r < ROWS; r++) {
            var q = at(c, r); if (!q) break;
            if (q.k === 'load') { rig.cl = c; rig.rl = r; rig.load = q; q.rig = rig; break; }
            if (q.k === 'basket' || q.k === 'motor') { rig.cp = c; rig.rp = r; rig.pull = q; q.rig = rig; break; }
            if (q.k === 'slot' || q.k === 'block') { rig.slot = q; q.rig = rig; }
            else if (q.k !== 'rope') break;
          }
        });
        at(p.c + 1, p.r).rig = rig; p.rig = rig;
        if (rig.load && rig.pull) {
          var blk = rig.slot && rig.slot.k === 'block' ? rig.slot : null;
          rig.n = blk ? blk.n : 1;
          rig.max = rig.rl - rig.rw - 1 - (rig.slot ? 1 : 0);
          W.rigs.push(rig);
        }
      }
      if (p.k === 'winch') { // the bucket hangs in the same column below the winch
        for (var r2 = p.r + 1; r2 < ROWS; r2++) { var q2 = at(p.c, r2); if (!q2) break; if (q2.k === 'wbucket') { p.bucket = q2; q2.winch = p; q2.max = r2 - p.r - 1; q2.rise = 0; break; } if (q2.k !== 'rope') break; }
        W.winches.push(p);
      }
      if (p.k === 'crank') { if (p.T === undefined) p.T = 1; W.cranks.push(p); }
      if (P.KINDS[p.k].gear && !p.z && !p.axle) p.z = 20;
    });
    // a crank or a motor that a button is linked to waits for the button; the others start at once
    W.parts.forEach(function (p) { if (p.k === 'button' && p.link && W.names[p.link]) W.names[p.link].linked = 1; });
    return W;
  }

  /* ---------- running a machine ---------- */
  // opts.trace: keep a snapshot of every tick (positions of the balls and weights) and the events for the story line
  function run(list, opts) {
    opts = opts || {};
    var W = build(list), trace = !!opts.trace, t = 0, sched = [], act = false, evs = [], snaps = [], tickEv = null;
    function at(c, r) { return inside(c, r) ? W.grid[idx(c, r)] : null; }
    function actorAt(c, r) { for (var i = 0; i < W.actors.length; i++) { var a = W.actors[i]; if (!a.done && a.c === c && a.r === r) return a; } return null; }
    function emit(e) { act = true; if (trace) { e.t = t; tickEv.push(e); } }
    function later(dt, fn) { sched.push({ t: t + dt, fn: fn }); }
    function passable(p) { return !p || P.KINDS[p.k].pass || (p.k === 'domino' && p.state === 2); }
    function empty(c, r) { return inside(c, r) && passable(at(c, r)) && !actorAt(c, r); }

    // a push into cell (c, r) in direction d (d = 0: from above or below)
    function hit(c, r, d, by) {
      if (!inside(c, r)) return;
      var a = actorAt(c, r);
      if (a) { if (a.k === 'ball' && d) { a.dx = d; a.held = t; a.hop = null; a.rest = false; emit({ e: 'pushBall', c: c, r: r, d: d, by: by }); } return; }
      var p = at(c, r); if (!p) return;
      if (p.k === 'domino' && d) knock(p, d);
      else if (p.k === 'bell') ring(p);
      else if (p.k === 'button') press(p);
      else if (p.k === 'can') tipCan(p);
    }
    function knock(p, d) {
      if (p.state) return;
      p.state = 1; p.fd = d; p.kt = t;
      later(1, function () { p.state = 2; p.ft = t; emit({ e: 'domino', c: p.c, r: p.r, d: d }); hit(p.c + d, p.r, d, 'domino'); });
    }
    function ring(p) {
      if (p.rung !== undefined) return;
      p.rung = t; emit({ e: 'ring', c: p.c, r: p.r });
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var f = at(p.c + o[0], p.r + o[1]); if (f && f.k === 'friend' && f.awake === undefined) { f.awake = t; emit({ e: 'friend', c: f.c, r: f.r }); } });
    }
    function press(p) {
      if (p.pressed !== undefined) return;
      p.pressed = t; emit({ e: 'button', c: p.c, r: p.r });
      var q = p.link ? W.names[p.link] : null; if (!q) return;
      if (q.k === 'door' && q.open === undefined) { q.open = t; emit({ e: 'door', c: q.c, r: q.r }); }
      else if (q.k === 'crank') startCrank(q, 'button');
      else if (q.k === 'motor') startMotor(q);
    }
    function tipCan(p) {
      if (p.tipped !== undefined) return;
      p.tipped = t; emit({ e: 'can', c: p.c, r: p.r, d: p.d });
      later(1, function () {
        var sc = p.c + p.d, r = p.r;
        p.wt = t;
        if (!inside(sc, r)) { p.water = null; emit({ e: 'waterWall', c: p.c, r: p.r }); return; }
        var rr = r; while (inside(sc, rr) && passable(at(sc, rr))) rr++;
        p.water = [sc, r, rr];
        var q = at(sc, rr);
        if (!q) emit({ e: 'waterFloor', c: sc, r: rr - 1 });
        else if (q.k === 'flower') { if (q.watered === undefined) q.watered = t; emit({ e: 'flower', c: sc, r: rr }); }
        else emit({ e: 'splash', c: sc, r: rr, k: q.k });
      });
    }
    // gears: find the speed and direction of every gear that meshes with the crank
    function startCrank(cr, by) {
      if (cr.on) return;
      cr.on = t;
      if (!cr.z) { emit({ e: 'crankEmpty', c: cr.c, r: cr.r }); return; }
      var list = [cr], q = 0, jam = null;
      cr.turns = cr.T; cr.dir = 1;
      while (q < list.length && !jam) {
        var g = list[q++];
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) {
          if (jam) return;
          var n = at(g.c + o[0], g.r + o[1]); if (!n || !P.KINDS[n.k].gear || !n.z) return;
          var want = g.turns * g.z / n.z, wd = -g.dir;
          if (list.indexOf(n) >= 0) { if (!near(n.turns, want) || n.dir !== wd) jam = n; return; }
          n.turns = want; n.dir = wd; list.push(n);
        });
      }
      if (jam) { list.forEach(function (g) { g.turns = 0; }); cr.jam = t; emit({ e: 'jam', c: jam.c, r: jam.r }); return; }
      var tr = { t0: t, t1: t + GEAR_T, gears: list }; W.trains.push(tr);
      list.forEach(function (g) { g.train = tr; });
      emit({ e: 'crank', c: cr.c, r: cr.r, T: cr.T, by: by });
      later(GEAR_T, function () {
        list.forEach(function (g) {
          if (g.k === 'dial') emit({ e: 'dial', c: g.c, r: g.r, turns: g.turns, dir: g.dir });
          if (g.k === 'winch' && g.bucket) {
            var b = g.bucket;
            if (g.dir < 0) { b.rise = 0; emit({ e: 'winchWrong', c: g.c, r: g.r }); }
            else if (g.turns > b.max + EPS) { b.rise = b.max; b.crash = 1; emit({ e: 'winchCrash', c: b.c, r: b.r, rise: g.turns }); }
            else { b.rise = g.turns; emit({ e: 'winch', c: b.c, r: b.r, rise: g.turns }); }
          }
        });
      });
    }
    function rigFinish(rig) {
      rig.done = true;
      emit({ e: rig.rise >= rig.load.need - EPS ? 'rigUp' : rig.pull.k === 'motor' ? 'ropeShort' : 'rigLow', c: rig.load.c, r: rig.load.r, rise: rig.rise, n: rig.n, rope: rig.rise * rig.n });
    }
    function startMotor(m) {
      var rig = m.rig; if (!rig || rig.state) return;
      var pull = rig.load.m / rig.n;
      if (pull > m.F + EPS) { rig.state = 3; rig.t0 = t; emit({ e: 'motorWeak', c: m.c, r: m.r, pull: pull, F: m.F, n: rig.n, m: rig.load.m }); return; }
      rig.state = 1; rig.rise = Math.min(rig.load.need, m.R / rig.n, rig.max); rig.drop = 0; rig.t0 = t; rig.t1 = t + MOTOR_T;
      emit({ e: 'motor', c: m.c, r: m.r, pull: pull, n: rig.n });
      later(MOTOR_T, function () { rigFinish(rig); });
    }
    function basketGets(p, a) {
      var rig = p.rig; if (!rig || !rig.load || !rig.pull) return;
      rig.mass += a.m;
      if (rig.state) return;
      if (rig.mass * rig.n > rig.load.m + EPS) {
        var D = 0; while (empty(rig.cp, rig.rp + D + 1)) D++;
        if (!D) { emit({ e: 'rigStuck', c: p.c, r: p.r }); return; }
        rig.state = 1; rig.drop = D; rig.rise = Math.min(D / rig.n, rig.max); rig.t0 = t; rig.t1 = t + D;
        emit({ e: 'basketDown', c: p.c, r: p.r });
        later(D, function () { rigFinish(rig); });
      } else emit({ e: 'rigLight', c: p.c, r: p.r, m: rig.mass, n: rig.n, load: rig.load.m });
    }

    /* the balls and the weights */
    function stop(a, what) { a.dx = 0; emit({ e: 'stop', c: a.c, r: a.r, what: what, k: a.k }); }
    function arrive(a, how) {
      var p = at(a.c, a.r);
      if (p && (p.k === 'cup' || p.k === 'basket')) {
        a.done = true; a.falling = false; a.dx = 0; a.hop = null; p.got = p.got || []; p.got.push(t);
        emit({ e: p.k, c: a.c, r: a.r, k: a.k });
        if (p.k === 'basket') basketGets(p, a);
        return;
      }
      if (p && p.k === 'ramp') { a.rest = false; emit({ e: 'ramp', c: a.c, r: a.r, d: p.d, k: a.k }); return; }
      emit({ e: how, c: a.c, r: a.r, d: a.dx, k: a.k, minor: 1 });
      var b = at(a.c, a.r + 1);
      if (b && b.k === 'button' && how === 'roll') press(b);
      if (a.k === 'ball' && b && b.k === 'spring') { a.hop = { d: b.d, n: 0 }; a.falling = false; emit({ e: 'spring', c: b.c, r: b.r, d: b.d }); }
    }
    function roll(a, d) {
      var c = a.c + d, r = a.r;
      if (!inside(c, r)) { stop(a, 'edge'); return; }
      var o = actorAt(c, r);
      if (o) { if (o.k === 'ball') { o.dx = d; o.held = t; o.hop = null; o.rest = false; emit({ e: 'pushBall', c: c, r: r, d: d, by: 'ball' }); } stop(a, o.k); return; }
      var p = at(c, r);
      if (passable(p)) { a.c = c; arrive(a, 'roll'); return; } // a ramp is entered only from above: from the side its high end is a wall
      hit(c, r, d, a.k); stop(a, p.k);
    }
    function land(a) {
      var b = at(a.c, a.r + 1);
      emit({ e: 'land', c: a.c, r: a.r, on: b ? b.k : 'floor', k: a.k, minor: !b || ['bell', 'button', 'can'].indexOf(b.k) < 0 ? 1 : 0 });
      if (b) hit(b.c, b.r, 0, a.k);
    }
    function hopStep(a) {
      var h = a.hop, c = a.c + h.d, r = a.r - 1;
      if (empty(c, r)) {
        a.c = c; a.r = r; h.n++;
        emit({ e: 'fly', c: c, r: r, k: a.k, minor: 1 });
        if (h.n >= 2) { a.hop = null; a.dx = h.d; a.falling = true; var b = at(a.c, a.r + 1); if (b && b.k === 'spring') { a.hop = { d: b.d, n: 0 }; a.falling = false; emit({ e: 'spring', c: b.c, r: b.r, d: b.d }); } }
        return;
      }
      a.hop = null; a.dx = 0; a.falling = true;
      hit(c, r, h.d, a.k);
      emit({ e: 'stop', c: a.c, r: a.r, what: inside(c, r) ? ((at(c, r) || actorAt(c, r) || {}).k || 'wall') : 'edge', k: a.k });
    }
    function moveActor(a) {
      if (a.done || a.held === t) return;
      if (a.hop) { hopStep(a); return; }
      var here = at(a.c, a.r);
      if (here && here.k === 'ramp') { if (a.rest) return; a.dx = here.d; a.falling = false; roll(a, here.d); if (!a.dx) a.rest = true; return; }
      var b = at(a.c, a.r + 1), free = inside(a.c, a.r + 1) && !actorAt(a.c, a.r + 1) &&
        (passable(b) || b.k === 'basket' || ((b.k === 'cup' || b.k === 'ramp') && a.k === 'ball'));
      if (free) { a.r++; a.falling = true; arrive(a, 'fall'); return; }
      if (a.falling) { a.falling = false; land(a); return; }
      if (a.k === 'ball' && a.dx) roll(a, a.dx);
    }
    // what lies on a lever arm cell: the actors stacked on it
    function stack(c, r) { var m = 0, a; while ((a = actorAt(c, r))) { m += a.m; r--; } return m; }
    function moments(L) {
      var l = 0, r = 0, i;
      for (i = 1; i <= L.left; i++) l += stack(L.pc - i, L.pr - 1) * i;
      for (i = 1; i <= L.right; i++) r += stack(L.pc + i, L.pr - 1) * i;
      return { l: l, r: r };
    }
    function checkLevers() {
      W.levers.forEach(function (L) {
        var m = moments(L); if (near(m.l, m.r)) return;
        var s = m.r > m.l ? 1 : -1, up = s > 0 ? L.pc - L.left : L.pc + L.right, dn = s > 0 ? L.pc + L.right : L.pc - L.left;
        if (s === L.state) return;
        L.flips.push([t, s]); L.state = s; L.t = t; L.ml = m.l; L.mr = m.r;
        emit({ e: 'lever', c: L.pc, r: L.pr, s: s, l: m.l, rr: m.r });
        for (var c = L.pc - L.left; c <= L.pc + L.right; c++) { var o = actorAt(c, L.pr - 1); if (o) { o.dx = 0; o.hop = null; } }
        var a = actorAt(up, L.pr - 1);
        if (a && a.k === 'ball') { a.hop = { d: s, n: 0 }; a.held = t; emit({ e: 'catapult', c: up, r: L.pr - 1, d: s }); }
        else hit(up, L.pr - 1, s, 'lever');
        hit(dn, L.pr + 1, s, 'lever');
      });
    }
    function snap() { if (trace) snaps.push(W.actors.map(function (a) { return [a.c, a.r, a.done ? 1 : 0]; })); }

    tickEv = []; snap(); evs.push(tickEv);
    var idle = 0, last = 0;
    for (t = 1; t <= MAXT; t++) {
      act = false; tickEv = [];
      if (t === 1) {
        W.parts.forEach(function (p) { if (p.k === 'push') { emit({ e: 'push', c: p.c, r: p.r, d: p.d }); hit(p.c + p.d, p.r, p.d, 'push'); } });
        W.cranks.forEach(function (p) { if (!p.linked) startCrank(p, 'start'); });
        W.rigs.forEach(function (rig) { if (rig.pull.k === 'motor' && !rig.pull.linked) startMotor(rig.pull); });
      }
      var now = sched.filter(function (s) { return s.t === t; });
      sched = sched.filter(function (s) { return s.t !== t; });
      now.forEach(function (s) { s.fn(); });
      W.actors.forEach(moveActor);
      checkLevers();
      snap(); evs.push(tickEv);
      if (act || sched.length) { last = t; idle = 0; } else if (++idle >= 1) break;
    }
    var loop = t > MAXT;
    W.levers.forEach(function (L) { var m = moments(L); L.endL = m.l; L.endR = m.r; });
    if (trace) { snaps.length = last + 1; evs.length = last + 1; }
    var goals = goalState(W);
    return { ok: !loop && goals.length > 0 && goals.every(function (g) { return g.ok; }), goals: goals, ticks: last, loop: loop, W: W, snaps: snaps, events: evs, problems: W.problems };
  }

  // every goal of the machine and whether it was reached
  function goalState(W) {
    var out = [];
    W.parts.forEach(function (p) {
      if (!p.goal) return;
      var ok = false;
      if (p.k === 'bell') ok = p.rung !== undefined;
      else if (p.k === 'cup') ok = !!(p.got && p.got.length);
      else if (p.k === 'flower') ok = p.watered !== undefined;
      else if (p.k === 'door') ok = p.open !== undefined;
      else if (p.k === 'friend') ok = p.awake !== undefined;
      else if (p.k === 'dial') ok = p.turns !== undefined && near(p.turns, p.need) && (!p.want || p.dir === p.want);
      else if (p.k === 'wbucket') ok = !p.crash && near(p.rise || 0, p.need);
      else if (p.k === 'load') ok = !!(p.rig && p.rig.done && p.rig.rise >= p.need - EPS);
      else if (p.k === 'pivot' && p.want) ok = p.lever.state === p.want;
      else if (p.k === 'pivot') { var L = p.lever; ok = L.state === 0 && near(L.endL, L.endR) && L.endL > 0; }
      out.push({ k: p.k, c: p.c, r: p.r, ok: ok });
    });
    return out;
  }
  // the gear numbers without running: { gears: [{c, r, z, turns, dir}], jam }
  function gearPlan(list) {
    var res = run(list), W = res.W;
    return { jam: W.cranks.some(function (c) { return c.jam !== undefined; }), gears: W.parts.filter(function (p) { return P.KINDS[p.k].gear; }).map(function (g) { return { k: g.k, c: g.c, r: g.r, z: g.z, turns: g.turns || 0, dir: g.dir || 0 }; }) };
  }

  /* ---------- »Fri opfindelse«: the child's own machine and its share code (O1-…) ---------- */
  // list = [{ k, d?, c, r }] (only the sandbox parts in P.SANDBOX). The code is 'O1-' + a letter, a column and a row per part.
  function sbEntry(k, d) { for (var i = 0; i < P.SANDBOX.length; i++) { var e = P.SANDBOX[i]; if (e.k === k && (e.d || 0) === (d || 0)) return e; } return null; }
  function sbMachine(list) {
    return list.map(function (q) { var e = sbEntry(q.k, q.d), p = { k: q.k, c: q.c, r: q.r, fixed: 1 }; if (e.d) p.d = e.d; if (e.m) p.m = e.m; if (q.k === 'ball') p.m = P.BALL_KG; if (P.SB_GOALS.indexOf(q.k) >= 0) p.goal = 1; return p; });
  }
  function sbValid(list) {
    if (!Array.isArray(list) || !list.length || list.length > P.SB_MAX) return false;
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      if (!q || !sbEntry(q.k, q.d) || !inside(q.c, q.r) || q.c !== Math.floor(q.c) || q.r !== Math.floor(q.r) || seen[q.c + ',' + q.r]) return false;
      seen[q.c + ',' + q.r] = 1;
    }
    return true;
  }
  function sbHasGoal(list) { return list.some(function (q) { return P.SB_GOALS.indexOf(q.k) >= 0; }); }
  function sbToCode(list) {
    return 'O1-' + list.slice().sort(function (a, b) { return a.r - b.r || a.c - b.c; }).map(function (q) { return sbEntry(q.k, q.d).ch + q.c + q.r; }).join('');
  }
  // strict: only known parts, inside the grid, no two in one cell, at most SB_MAX parts. Returns the list or null.
  function sbFromCode(code) {
    var s = String(code === undefined || code === null ? '' : code).replace(/\s+/g, '').toUpperCase();
    if (s.length > 3 + 3 * P.SB_MAX) return null;
    var m = /^O1-((?:[A-Z][0-7][0-5]){1,24})$/.exec(s); if (!m) return null;
    var list = [], ok = true;
    m[1].match(/[A-Z][0-7][0-5]/g).forEach(function (x) {
      var e = P.SANDBOX.filter(function (y) { return y.ch === x.charAt(0); })[0];
      if (!e) { ok = false; return; }
      var q = { k: e.k, c: +x.charAt(1), r: +x.charAt(2) }; if (e.d) q.d = e.d;
      list.push(q);
    });
    return ok && sbValid(list) ? list : null;
  }
  // check a machine: { ok, why: 'invalid' | 'goal' | 'fail' | '', res }
  function sbCheck(list) {
    if (!sbValid(list)) return { ok: false, why: 'invalid', res: null };
    if (!sbHasGoal(list)) return { ok: false, why: 'goal', res: null };
    var res = run(sbMachine(list));
    return { ok: res.ok, why: res.ok ? '' : 'fail', res: res };
  }

  var api = { run: run, build: build, gearPlan: gearPlan, MAXT: MAXT, GEAR_T: GEAR_T, MOTOR_T: MOTOR_T,
    sandbox: { machine: sbMachine, valid: sbValid, toCode: sbToCode, fromCode: sbFromCode, check: sbCheck, entry: sbEntry } };
  root.OF_PHYS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
