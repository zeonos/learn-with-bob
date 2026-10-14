/*
 * Opfinderværkstedet – delene i værkstedet (OF_PARTS).
 * Værkstedet er et gitter med 8 felter på tværs og 6 felter i højden. Felt (c, r): c = 0 er længst til venstre,
 * r = 0 er øverst. Under række 5 er gulvet, og uden for gitteret er der vægge.
 * Hver del fylder ét felt. Vippen (arme + omdrejningspunkt), hejset (trisse, reb, kurv/motor, last) og spillet
 * (tandhjul med reb og spand) består af flere felter, som physics.js sætter sammen.
 * Banerne skrives som tekstkort (machines.js) med ét tegn pr. felt; ASCII nedenfor siger, hvilket tegn der er hvad.
 * Kan også hentes i node (tools/test-opfinder.js).
 */
(function (root) {
  'use strict';
  var COLS = 8, ROWS = 6;
  // turn: barnet kan vende delen; goal: et mål, når den står i en bane; actor: bevæger sig (kugle, lod)
  var KINDS = {
    wall: {}, ball: { actor: 1 }, weight: { actor: 1 }, push: {}, ramp: { turn: 1 }, domino: {}, spring: { turn: 1 },
    bell: { goal: 1 }, cup: { goal: 1 }, flower: { goal: 1 }, can: {}, button: {}, door: { goal: 1 }, friend: { goal: 1 },
    arm: {}, pivot: {}, gear: { gear: 1 }, crank: { gear: 1 }, dial: { gear: 1, goal: 1 }, winch: { gear: 1 }, wbucket: { goal: 1 },
    wheel: {}, rope: { pass: 1 }, slot: { pass: 1 }, basket: {}, motor: {}, load: { goal: 1 }, block: {}
  };
  // the characters in a level's map: [kind, direction]
  var ASCII = {
    '#': ['wall'], 'o': ['ball'], 'm': ['weight'], '>': ['push', 1], '<': ['push', -1], 'R': ['ramp', 1], 'L': ['ramp', -1], 'd': ['domino'],
    'S': ['spring', 1], 'Z': ['spring', -1], 'b': ['bell'], 'u': ['cup'], 'f': ['flower'], 'w': ['can', 1], 'W': ['can', -1], 'x': ['button'],
    'D': ['door'], 'F': ['friend'], '-': ['arm'], '^': ['pivot'], 'g': ['gear'], 'c': ['crank'], 'v': ['dial'], 'h': ['winch'], 'e': ['wbucket'],
    'O': ['wheel'], '|': ['rope'], 's': ['slot'], 'k': ['basket'], 'M': ['motor'], 'B': ['load']
  };
  // the sandbox (»Fri opfindelse«): the parts and their letters in a share code
  var SANDBOX = [
    { k: 'ball', ch: 'B' }, { k: 'push', d: 1, ch: 'P' }, { k: 'push', d: -1, ch: 'Q' }, { k: 'ramp', d: 1, ch: 'R' }, { k: 'ramp', d: -1, ch: 'L' },
    { k: 'domino', ch: 'D' }, { k: 'spring', d: 1, ch: 'S' }, { k: 'spring', d: -1, ch: 'Z' }, { k: 'wall', ch: 'W' }, { k: 'weight', m: 2, ch: 'M' },
    { k: 'bell', ch: 'G' }, { k: 'cup', ch: 'K' }, { k: 'can', d: 1, ch: 'V' }, { k: 'can', d: -1, ch: 'U' }, { k: 'flower', ch: 'F' }
  ];
  var SB_GOALS = ['bell', 'cup', 'flower'], SB_MAX = 24;
  var BALL_KG = 1; // a ball weighs 1 kg (it matters on the levers and in the baskets)

  function key(c, r) { return c + ',' + r; }
  function inside(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }
  function copy(o) { var x = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) x[k] = o[k]; return x; }

  // A level's fixed parts as a list of { k, c, r, d?, ...props from lv.at }.
  function parseMap(lv) {
    var out = [];
    for (var r = 0; r < ROWS; r++) {
      var row = lv.map[r] || '';
      for (var c = 0; c < COLS; c++) {
        var ch = row.charAt(c) || '.';
        if (ch === '.') continue;
        var a = ASCII[ch]; if (!a) throw new Error('Unknown map char ' + ch + ' in ' + lv.id);
        var p = { k: a[0], c: c, r: r, fixed: 1 };
        if (a[1]) p.d = a[1];
        var extra = (lv.at || {})[key(c, r)];
        if (extra) for (var x in extra) p[x] = extra[x];
        if (p.k === 'ball' && !p.m) p.m = BALL_KG;
        if ((p.k === 'crank' || p.k === 'dial' || p.k === 'winch') && !p.z) p.axle = 1; // an empty axle: a gear from the toolbox goes here
        if (p.goal === undefined && KINDS[p.k].goal && p.k !== 'dial') p.goal = 1;
        if (p.k === 'dial' && p.need !== undefined && p.goal === undefined) p.goal = 1;
        if (p.k === 'pivot' && (p.balance || p.want)) p.goal = 1;
        out.push(p);
      }
    }
    return out;
  }
  // The parts of a level with the child's placements: placed = [{ i: toolbox index, c, r, d }]
  function machine(lv, placed) {
    var parts = parseMap(lv);
    (placed || []).forEach(function (q) {
      var b = lv.box[q.i]; if (!b) return;
      var host = parts.filter(function (p) { return p.c === q.c && p.r === q.r; })[0];
      if (host && host.axle && !host.z && b.k === 'gear') { host.z = b.z; host.box = q.i; return; } // a gear on an empty axle
      if (host && host.k === 'slot' && b.k === 'block') { host.k = 'block'; host.n = b.n; host.box = q.i; return; } // a pulley block in its place
      var p = copy(b); p.c = q.c; p.r = q.r; p.box = q.i;
      if (KINDS[p.k].turn) p.d = q.d === -1 ? -1 : 1;
      if (p.k === 'ball' && !p.m) p.m = BALL_KG;
      parts.push(p);
    });
    return parts;
  }
  // Can toolbox part b go on (c, r) in this level (with the other placements)? Returns '' or a reason key.
  function canPlace(lv, placed, b, c, r, ignore) {
    if (!inside(c, r)) return 'outside';
    var fixed = parseMap(lv).filter(function (p) { return p.c === c && p.r === r; })[0];
    if (b.k === 'block') { if (!fixed || fixed.k !== 'slot') return 'blockSlot'; }
    else if (fixed && fixed.axle && b.k === 'gear') { /* a gear on an empty axle */ }
    else if (fixed) return fixed.k === 'slot' ? 'slotOnly' : fixed.axle ? 'axleGear' : fixed.k === 'rope' ? 'rope' : 'taken';
    for (var i = 0; i < (placed || []).length; i++) if (i !== ignore && placed[i].c === c && placed[i].r === r) return 'taken';
    return '';
  }

  var api = { COLS: COLS, ROWS: ROWS, KINDS: KINDS, ASCII: ASCII, SANDBOX: SANDBOX, SB_GOALS: SB_GOALS, SB_MAX: SB_MAX, BALL_KG: BALL_KG,
    key: key, inside: inside, copy: copy, parseMap: parseMap, machine: machine, canPlace: canPlace };
  root.OF_PARTS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
