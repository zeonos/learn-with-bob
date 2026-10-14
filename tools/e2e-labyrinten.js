// End-to-end test of Labyrinten through the real UI: every cave in both bands solved with the keyboard, the arrow pad,
// taps and mirror clicks (3 stars), »Vis et skridt«, »Vis løsningen« after three tries, the sandbox and the badges.
// node tools/e2e-labyrinten.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/lb-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

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
    await p.click('a[href="#/spil/labyrinten"]');
    await p.waitForSelector('.lb-route');
    const cur = () => p.evaluate(() => { const s = Core.games.labyrinten._state(); if (!s) return null; const it = s.items[s.i]; return { kind: it.kind, i: s.i, n: s.items.length, cur: s.cur, q: it.q || null }; });
    const plan = () => p.evaluate(() => { const s = Core.games.labyrinten._state(), it = s.items[s.i]; if (it.kind === 'mirrors') return MAZE.mirrorSteps(it.lv, s.cur.s).map(x => x.mirror); return MAZE.solve(it.lv, s.cur.s).path; });
    const overflow = async (what) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); check(o <= 1, `${tag} ${what}: no sideways scroll (${o}px)`); };
    async function solveNow(c, how) {
      if (c.kind === 'route') { await p.click(`.lb-opts .oj-opt[data-i="${c.q.answer}"]`); await p.waitForSelector('.lb-next'); return; }
      const moves = await plan();
      if (c.kind === 'mirrors') { for (const m of moves) await p.click(`.lb-mirrors .mirror[data-m="${m}"]`); }
      else for (let k = 0; k < moves.length; k++) {
        const d = moves[k];
        if (how === 'pad' && k % 2 === 0) await p.click(`.lb-dbtn.d-${d}`);
        else await p.keyboard.press(KEY[d]);
        if (c.kind === 'ice') await p.waitForTimeout(80);
      }
      await p.waitForSelector('.lb-solved', { timeout: 6000 });
    }
    async function failThrice(c) {
      for (let k = 0; k < 3; k++) {
        if (c.kind === 'mirrors') await p.click('.lb-mirrors .mirror >> nth=0');
        else { const d = (await plan())[0]; await p.keyboard.press(KEY[d]); }
        await p.click('.lb-toolrow .btn:has-text("Start forfra")'); await p.waitForTimeout(100);
      }
      const show = p.locator('.lb-toolrow .btn:has-text("Vis løsningen")');
      check(await show.isEnabled(), `${tag} ${c.kind}: »Vis løsningen« unlocked after three tries`);
      await show.click(); await p.waitForTimeout(150);
      await p.click('.lb-toolrow .btn.primary'); await p.waitForTimeout(1200);
      await p.screenshot({ path: `${OUT}/${tag}-${c.kind}-solution.png`, fullPage: true });
      check(await p.locator('.lb-stephead').count() === 1, `${tag} ${c.kind}: the step is shown with its number`);
      const rest = p.locator('.lb-toolrow .btn:has-text("Vis resten")');
      if (await rest.count()) await rest.click();
      await p.waitForSelector('.lb-solved', { timeout: 15000 });
      check((await p.$$eval('.lb-solved-stars .star.on', x => x.length)) === 1, `${tag} ${c.kind}: the shown solution gives 1 star`);
    }
    async function oneStep(c) { // »Vis et skridt« after a while: pretend the time has passed
      await p.evaluate(() => { Core.games.labyrinten._state().cur.t0 = 0; });
      await p.click('.lb-toolrow .btn:has-text("Start forfra")');
      const b = p.locator('.lb-toolrow .btn:has-text("Vis et skridt")');
      check(await b.isEnabled(), `${tag} ${c.kind}: »Vis et skridt« lights up after a while`);
      await b.click(); await p.waitForTimeout(1200);
      check(await p.locator('.lb-explain .oj-rule').count() === 1, `${tag} ${c.kind}: the step is explained`);
      await solveNow(await cur());
      check((await p.$$eval('.lb-solved-stars .star.on', x => x.length)) === 2, `${tag} ${c.kind}: a shown step gives 2 stars`);
    }
    async function playRound(idx, rtag, mode) {
      await p.click(`.lb-route >> nth=${idx}`);
      await p.waitForSelector('.lb-board');
      for (let guard = 0; guard < 8; guard++) {
        const c = await cur(); if (!c) break;
        if (guard === 0) { await p.screenshot({ path: `${OUT}/${tag}-${rtag}-start.png`, fullPage: true }); await overflow(rtag); }
        if (mode === 'solution' && c.i === 0) await failThrice(c);
        else if (mode === 'step' && c.i === 0) await oneStep(c);
        else await solveNow(c, guard % 2 ? 'pad' : 'keys');
        if (guard === 0) await p.screenshot({ path: `${OUT}/${tag}-${rtag}-solved.png`, fullPage: true });
        const last = c.i === c.n - 1;
        await p.click(c.kind === 'route' ? '.lb-next' : '.lb-solved .btn.primary');
        if (last) break;
        await p.waitForSelector('.lb-board');
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/${tag}-${rtag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      const up = await p.locator('.rs-overlay .lb-lvlmsg').count();
      await p.click('.rs-overlay .btn.ghost');
      await p.waitForSelector('.lb-route');
      return { stars, up };
    }
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForTimeout(200);
      const n = await p.$$eval('.lb-route', x => x.length);
      check(n === 4, `${tag} four caves (${n})`);
      for (let r = 0; r < n; r++) {
        const mode = name === 'tablet' ? 'clean' : (band === 0 && r === 0) || (band === 1 && r === 3) ? 'solution' : (band === 0 && r === 1) || (band === 1 && r === 2) ? 'step' : 'clean';
        const res = await playRound(r, (band ? 'U' : 'M') + r, mode);
        if (mode === 'clean') { check(res.stars === 3, `${tag} ${band ? 'U' : 'M'} cave ${r}: ${res.stars} stars`); check(res.up === 1, `${tag} ${band ? 'U' : 'M'} cave ${r}: level goes up`); }
        else check(res.stars >= 1, `${tag} ${band ? 'U' : 'M'} cave ${r} (${mode}): ${res.stars} stars`);
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map.png`, fullPage: true });
      check(await p.locator('.lb-route.lit').count() === 4, `${tag} every played cave is lit`);
    }
    // a tap on a square in Bob's row walks there
    await p.click('.seg >> nth=0'); await p.click('.lb-route >> nth=0'); await p.waitForSelector('.lb-grid');
    const before = (await cur()).cur.s;
    const target = await p.evaluate(() => { const s = Core.games.labyrinten._state(), lv = s.items[s.i].lv, c = s.cur.s; let x = c.x; while (MAZE.tile(lv, x + 1, c.y) !== '#') x++; return [x, c.y]; });
    await p.click(`.lb-t[data-x="${target[0]}"][data-y="${target[1]}"]`); await p.waitForTimeout(300);
    const after = (await cur()).cur.s;
    check(target[0] === before.x || after.x === target[0], `${tag} a tap walks Bob along the corridor (${before.x} → ${after.x}, wanted ${target[0]})`);
    await p.click('.rs-iconbtn >> nth=0'); await p.click('.rs-overlay .btn.ghost'); await p.waitForSelector('.lb-route');
    // sandbox: the empty room with Bob and the exit can be checked, played and shared
    await p.click('text=Byg en labyrint'); await p.waitForSelector('.lb-sb-grid');
    await p.click('.lb-sb-tool >> nth=0');
    for (let y = 2; y <= 8; y++) await p.click(`.lb-sb-grid .lb-t[data-x="5"][data-y="${y}"]`); // a wall with a gap at the top
    await p.click('.lb-sandbox .btn.primary:has-text("Tjek labyrinten")'); await p.waitForTimeout(300);
    const code = await p.inputValue('.lb-sb-result .lb-sb-code');
    check(/^L11x11-/.test(code), `${tag} maze code made`);
    check(await p.locator('.lb-sb-result .badge-new').count() <= 1, `${tag} badge card`);
    await p.screenshot({ path: `${OUT}/${tag}-sandbox.png`, fullPage: true });
    await p.click('.lb-sb-result .btn.primary:has-text("Prøv den")'); await p.waitForSelector('.lb-grid');
    await solveNow(await cur()); await p.click('.lb-solved .btn.primary'); await p.waitForSelector('.lb-route');
    await p.click('text=Byg en labyrint'); await p.waitForSelector('.lb-sb-load');
    await p.fill('.lb-sb-load .lb-sb-code', 'L5x5-nonsense'); await p.click('.lb-sb-load .btn'); await p.waitForTimeout(200);
    check((await p.locator('.lb-sb-load p.muted').textContent()) !== '', `${tag} a bad code is refused`);
    await p.fill('.lb-sb-load .lb-sb-code', code); await p.click('.lb-sb-load .btn'); await p.waitForSelector('.lb-grid');
    await solveNow(await cur()); await p.click('.lb-solved .btn.primary'); await p.waitForSelector('.lb-route');
    const badges = await p.evaluate(() => Object.keys(Core.profile().badges || {}));
    check(badges.indexOf('labyrinten-1') >= 0 && badges.indexOf('gaademager') >= 0, `${tag} badges: ${badges.join(',')}`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Labyrinten e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
