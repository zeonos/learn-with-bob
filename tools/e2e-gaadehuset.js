// End-to-end test of Gådehuset through the real UI: every room in both bands solved like a child would (3 stars),
// »Vis løsningen« after three tries, a half-done puzzle that is saved, the sandbox codes, the gallery and the badges.
// node tools/e2e-gaadehuset.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/gh-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of SIZES) {
    const tag = name;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Sofie'); await p.click('button[type=submit]');
    await p.click('a[href="#/spil/gaadehuset"]');
    await p.waitForSelector('.gh-route');
    const cur = () => p.evaluate(() => { const s = Core.games.gaadehuset._state(); if (!s) return null; const it = s.items[s.i]; return { kind: it.kind, pz: it.pz, cur: s.cur, i: s.i, n: s.items.length }; });
    const overflow = async (what) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); check(o <= 1, `${tag} ${what}: no sideways scroll (${o}px)`); };

    // solve the puzzle on screen like a child would
    async function solveNow(c) {
      if (c.kind === 'sudoku') {
        for (let i = 0; i < c.pz.puzzle.length; i++) if (!c.pz.puzzle[i] && c.cur.work.v[i] !== c.pz.solution[i]) {
          await p.click(`.gh-sd-cell >> nth=${i}`); await p.click(`.gh-padkey >> text="${c.pz.solution[i]}"`);
        }
      } else if (c.kind === 'nono') {
        const pic = await p.evaluate((id) => GH_PICS.find(x => x.id === id).rows, c.pz.pic);
        const W = pic[0].length;
        for (let y = 0; y < pic.length; y++) for (let x = 0; x < W; x++) if (pic[y][x] !== '.') await p.click(`.gh-ng-cell[data-i="${y * W + x}"]`);
      } else if (c.kind === 'logic') {
        const n = c.pz.n;
        for (let ci = 0; ci < c.pz.cats.length; ci++) for (let x = 0; x < n; x++) {
          const loc = p.locator('.gh-lg-cell').nth(ci * n * n + x * n + c.pz.ans[ci][x]);
          await loc.click(); await loc.click();
        }
      } else if (c.kind === 'river') {
        const plan = await p.evaluate((id) => { const P = RIVER.puzzle(id), r = RIVER.bfs(P, RIVER.start(P)); return r.path.map(ids => ids.map(x => { const it = RIVER.item(P, x); return it.name.replace(/^(et|en) /, '').replace(/^./, ch => ch.toUpperCase()) + (it.w ? ' ' + it.w + ' kg' : ''); })); }, c.pz.id);
        for (const trip of plan) {
          for (const label of trip) await p.locator('.gh-rv-bank .gh-rv-item:not([disabled])').filter({ hasText: label }).first().click();
          await p.click('.gh-rv-sail'); await p.waitForTimeout(800);
        }
      } else if (c.kind === 'hanoi') {
        const moves = await p.evaluate((n) => { let pos = HANOI.start(n), out = [], m; while ((m = HANOI.nextMove(pos))) { out.push([m.from, m.to]); pos = HANOI.move(pos, m.from, m.to); } return out; }, c.pz.n);
        for (const [a, b] of moves) { await p.click(`.gh-hn-peg >> nth=${a}`); await p.click(`.gh-hn-peg >> nth=${b}`); }
      } else if (c.kind === 'truth') {
        for (let i = 0; i < c.pz.n; i++) await p.locator('.gh-tf-card').nth(i).locator('.seg').nth(c.pz.answer[i] ? 0 : 1).click();
        await p.click('.gh-tf-go');
      }
      await p.waitForSelector('.gh-solved', { timeout: 5000 });
    }
    // three tries, then the step-by-step solution
    async function failThrice(c) {
      if (c.kind === 'sudoku') {
        const i = c.pz.puzzle.indexOf(0), wrongV = c.pz.solution[i] % c.pz.n + 1;
        await p.click(`.gh-sd-cell >> nth=${i}`); await p.click(`.gh-padkey >> text="${wrongV}"`);
        for (let k = 0; k < 3; k++) { await p.click('.gh-toolrow .btn:has-text("Tjek")'); await p.waitForTimeout(150); }
      } else if (c.kind === 'hanoi') {
        for (let k = 0; k < 3; k++) { await p.click('.gh-hn-peg >> nth=0'); await p.click('.gh-hn-peg >> nth=2'); await p.click('.gh-hn-peg >> nth=0'); await p.click('.gh-hn-peg >> nth=2'); await p.waitForTimeout(100); }
      } else if (c.kind === 'river') { // the farmer alone leaves the goat with the cabbage
        for (let k = 0; k < 3; k++) { await p.locator('.gh-rv-item').filter({ hasText: 'Bonden' }).first().click(); await p.click('.gh-rv-sail'); await p.waitForTimeout(1800); }
      }
      const c2 = await cur();
      check(c2.cur.tries >= 3, `${tag} ${c.kind}: three tries counted (${c2.cur.tries})`);
      const show = p.locator('.gh-toolrow .btn:has-text("Vis løsningen")');
      check(await show.isEnabled(), `${tag} ${c.kind}: »Vis løsningen« unlocked`);
      await show.click(); await p.waitForTimeout(200);
      await p.click('.gh-toolrow .btn.primary'); await p.waitForTimeout(900);
      await p.screenshot({ path: `${OUT}/${tag}-${c.kind}-solution.png`, fullPage: true });
      check(await p.locator('.gh-stephead').count() === 1, `${tag} ${c.kind}: step shown with its number`);
      const rest = p.locator('.gh-toolrow .btn:has-text("Vis resten")');
      if (await rest.count()) await rest.click();
      else for (let k = 0; k < 20 && !(await p.locator('.gh-solved').count()); k++) { const nb = p.locator('.gh-toolrow .btn.primary'); if (await nb.count()) await nb.click(); await p.waitForTimeout(900); }
      await p.waitForSelector('.gh-solved', { timeout: 8000 });
      check((await p.$$eval('.gh-solved-stars .star.on', x => x.length)) === 1, `${tag} ${c.kind}: the shown solution gives 1 star`);
    }
    async function playRound(idx, rtag, mode) {
      await p.click(`.gh-route >> nth=${idx}`);
      await p.waitForSelector('.gh-board');
      for (let guard = 0; guard < 6; guard++) {
        const c = await cur(); if (!c) break;
        if (guard === 0) { await p.screenshot({ path: `${OUT}/${tag}-${rtag}-start.png`, fullPage: true }); await overflow(rtag); }
        if (mode === 'solution' && c.i === 0) await failThrice(c); else await solveNow(c);
        if (guard === 0) await p.screenshot({ path: `${OUT}/${tag}-${rtag}-solved.png`, fullPage: true });
        const last = c.i === c.n - 1;
        await p.click('.gh-solved .btn.primary');
        if (last) break;
        await p.waitForSelector('.gh-board');
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/${tag}-${rtag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      const up = await p.locator('.rs-overlay .gh-lvlmsg').count();
      await p.click('.rs-overlay .btn.ghost');
      await p.waitForSelector('.gh-route');
      return { stars, up };
    }
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForTimeout(200);
      const n = await p.$$eval('.gh-route', x => x.length);
      check(n === 5, `${tag} five rooms (${n})`);
      for (let r = 0; r < n; r++) {
        const kinds = await p.evaluate((i) => { const d = Core.gameData('gaadehuset'); const list = Core.games.gaadehuset._routes.filter(x => x.b === (d.band || 'M')); return list[i].kind; }, r);
        const mode = (kinds === 'sudoku' || kinds === 'hanoi' || (kinds === 'river' && band === 1)) && name !== 'tablet' ? 'solution' : 'clean';
        const res = await playRound(r, (band ? 'U' : 'M') + r, mode);
        if (mode === 'clean') { check(res.stars === 3, `${tag} ${band ? 'U' : 'M'} room ${r} (${kinds}): ${res.stars} stars`); check(res.up === 1 || kinds === 'truth' && false || res.up === 1, `${tag} ${band ? 'U' : 'M'} room ${r}: level goes up`); }
        else check(res.stars >= 1, `${tag} ${band ? 'U' : 'M'} room ${r} (${kinds}) with the solution: ${res.stars} stars`);
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map.png`, fullPage: true });
    }
    // a half-done puzzle is saved
    await p.click('.seg >> nth=0'); await p.click('.gh-route >> nth=0'); await p.waitForSelector('.gh-sd');
    let c = await cur(); const e = c.pz.puzzle.indexOf(0);
    await p.click(`.gh-sd-cell >> nth=${e}`); await p.click(`.gh-padkey >> text="${c.pz.solution[e]}"`);
    await p.click('.rs-iconbtn >> nth=0'); await p.click('.rs-overlay .btn.ghost'); await p.waitForSelector('.gh-route');
    check(await p.locator('.gh-saved').count() === 1, `${tag} the map shows the saved puzzle`);
    await p.reload(); await p.waitForSelector('.gh-route');
    await p.click('.gh-route >> nth=0'); await p.waitForSelector('.gh-sd');
    c = await cur();
    check(c.cur.work.v[e] === c.pz.solution[e], `${tag} the saved puzzle comes back with the number in it`);
    await p.click('.rs-iconbtn >> nth=0'); await p.click('.rs-overlay .btn.ghost'); await p.waitForSelector('.gh-route');
    // sandbox: draw a picture, check it, play it, and load a sudoku code
    await p.click('text=Lav en gåde'); await p.waitForSelector('.gh-sb-grid');
    await p.click('.gh-sb-sizes .seg >> nth=0'); await p.waitForSelector('.gh-sb-grid');
    const heart = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (heart[y][x] !== '.') await p.click(`.gh-sb-cell[data-i="${y * 5 + x}"]`);
    await p.click('.gh-sandbox .btn.primary:has-text("Tjek gåden")'); await p.waitForTimeout(300);
    const code = await p.inputValue('.gh-sb-result .gh-sb-code');
    check(/^B5x5-/.test(code), `${tag} picture code made (${code})`);
    check(await p.locator('.gh-sb-result .badge-new').count() === 1, `${tag} the »Gådemager« badge is shown`);
    await p.screenshot({ path: `${OUT}/${tag}-sandbox.png`, fullPage: true });
    await p.click('.gh-sb-result .btn.primary:has-text("Prøv den")'); await p.waitForSelector('.gh-ng');
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (heart[y][x] !== '.') await p.click(`.gh-ng-cell[data-i="${y * 5 + x}"]`);
    await p.waitForSelector('.gh-solved'); await p.click('.gh-solved .btn.primary'); await p.waitForSelector('.gh-route');
    await p.click('text=Lav en gåde'); await p.waitForSelector('.gh-sb-load');
    await p.fill('.gh-sb-load .gh-sb-code', 'nonsense'); await p.click('.gh-sb-load .btn'); await p.waitForTimeout(200);
    check(await p.locator('.gh-sb-load p.muted').textContent() !== '', `${tag} a bad code is refused`);
    const sdCode = await p.evaluate(() => { const m = SUDOKU.make(4, 6, Math.random); return SUDOKU.toCode(4, m.puzzle); });
    await p.fill('.gh-sb-load .gh-sb-code', sdCode); await p.click('.gh-sb-load .btn'); await p.waitForSelector('.gh-sd');
    c = await cur(); await solveNow(c); await p.click('.gh-solved .btn.primary'); await p.waitForSelector('.gh-route');
    // gallery
    await p.click('text=Billedgalleri'); await p.waitForSelector('.gh-gal');
    const shown = await p.$$eval('.gh-gal li:not(.locked)', x => x.length);
    check(shown >= 3, `${tag} the gallery shows the solved pictures (${shown})`);
    await p.screenshot({ path: `${OUT}/${tag}-gallery.png`, fullPage: true });
    // badges
    const badges = await p.evaluate(() => Object.keys(Core.profile().badges || {}));
    check(badges.indexOf('gaademager') >= 0 && badges.indexOf('gaadehuset-1') >= 0, `${tag} badges earned: ${badges.join(',')}`);
    if (name !== 'tablet') check(badges.indexOf('staedig') < 0, `${tag} »Stædig« is not given for a shown solution`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Gådehuset e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
