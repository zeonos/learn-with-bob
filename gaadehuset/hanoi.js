/*
 * Hanois tårn. Discs are numbered 1 (smallest) to n. pos[d] = the peg (0, 1, 2) disc d is on.
 * next() gives the best move from any position, so tips and the step-by-step solution work wherever the child is.
 */
(function (root) {
  'use strict';
  function start(n) { var pos = [null]; for (var d = 1; d <= n; d++) pos.push(0); return pos; }
  function best(n) { return Math.pow(2, n) - 1; }
  function top(pos, peg) { for (var d = 1; d < pos.length; d++) if (pos[d] === peg) return d; return 0; }
  function stack(pos, peg) { var out = []; for (var d = pos.length - 1; d >= 1; d--) if (pos[d] === peg) out.push(d); return out; } // bottom to top
  function canMove(pos, from, to) { var a = top(pos, from), b = top(pos, to); return a > 0 && from !== to && (b === 0 || b > a); }
  function move(pos, from, to) { var p = pos.slice(); p[top(pos, from)] = to; return p; }
  function done(pos, target) { for (var d = 1; d < pos.length; d++) if (pos[d] !== target) return false; return true; }
  // best next move to get discs 1..k onto target: { d, from, to, parent } (parent = the bigger disc that has to move later)
  function next(pos, k, target, parent) {
    if (k === 0) return null;
    if (pos[k] === target) return next(pos, k - 1, target, parent);
    var aux = 3 - pos[k] - target, m = next(pos, k - 1, aux, { d: k, to: target });
    if (m) return m;
    return { d: k, from: pos[k], to: target, parent: parent };
  }
  function nextMove(pos, target) { return next(pos, pos.length - 1, target === undefined ? 2 : target, null); }
  function movesLeft(pos, target) { var n = 0, p = pos.slice(), m; while ((m = nextMove(p, target))) { p = move(p, m.from, m.to); if (++n > 5000) break; } return n; }
  var api = { start: start, best: best, top: top, stack: stack, canMove: canMove, move: move, done: done, nextMove: nextMove, movesLeft: movesLeft };
  root.HANOI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
