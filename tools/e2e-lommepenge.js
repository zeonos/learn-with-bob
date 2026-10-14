// End-to-end test of Lommepenge through the real UI: plays every route in both bands to the result dialog.
// NODE_PATH=$(npm root -g) node tools/e2e-lommepenge.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/lp-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of SIZES) {
    const tag = name + '-lp';
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Sofie'); await p.click('button[type=submit]');
    await p.click('a[href="#/spil/lommepenge"]');
    await p.waitForSelector('.lp-route');
    await p.screenshot({ path: `${OUT}/${tag}-map-start.png` });
    const cur = () => p.evaluate(() => {
      const s = Core.games.lommepenge._state(), t = s && s.tasks[s.i];
      if (!t) return null;
      return { type: t.type, kind: t.kind, answer: t.answer, options: t.options, solution: t.solution, rows: t.rows && t.rows.length, budget: t.budget, i: s.i, n: s.tasks.length, locked: s.locked };
    });
    const overflow = () => p.evaluate(() => {
      const d = document.documentElement.scrollWidth - document.documentElement.clientWidth, wrap = document.querySelector('.oj-task-wrap');
      const inner = [...document.querySelectorAll('.lp-fig, .lp-fig > div, .lp-chart, .lp-tray, .lp-bopts')].map(e => e.scrollWidth - e.clientWidth);
      return Math.max(d, wrap ? wrap.scrollWidth - wrap.clientWidth : 0, ...inner);
    });
    const kinds = {};
    async function solve(tk, wrong) {
      if (tk.type === 'choice') { const v = wrong ? tk.options.find(o => o !== tk.answer) : tk.answer; await p.click(`.oj-opt[data-v="${v.replace(/"/g, '\\"')}"]`); return; }
      if (tk.type === 'number') { await p.fill('.lp-input', wrong ? '99999' : String(tk.answer).replace('.', ',')); await p.click('.lp-check'); return; }
      if (tk.type === 'pay' || tk.type === 'change') {
        if (await p.locator('.lp-cashbtns .btn.ghost').isEnabled()) await p.click('.lp-cashbtns .btn.ghost'); // clear what is on the counter
        const seq = wrong ? [tk.answer === 50 ? 100 : 50] : tk.solution;
        for (const v of seq) await p.click(`.lp-coinbtn[data-v="${v}"]`);
        await p.click('.lp-cashbtns .btn.primary'); return;
      }
      if (tk.type === 'basket') {
        const sol = await p.evaluate((wrong) => {
          const t = Core.games.lommepenge._state().tasks[Core.games.lommepenge._state().i];
          return wrong ? t.rows.map(r => r.opts.map(o => o.price).indexOf(Math.max(...r.opts.map(o => o.price)))) : t.solution;
        }, wrong);
        for (let r = 0; r < sol.length; r++) await p.click(`.lp-prod[data-r="${r}"][data-o="${sol[r]}"]`);
        await p.click('.lp-meter + .row .btn.primary'); return;
      }
      throw new Error('unknown task type ' + tk.type);
    }
    async function playRound(routeIdx, rtag, wrongOn) {
      await p.click(`.lp-route >> nth=${routeIdx}`);
      await p.waitForSelector('.lp-task .oj-body');
      let wrongDone = false, shots = 0;
      for (let guard = 0; guard < 200; guard++) {
        const tk = await cur();
        if (!tk) break;
        const cont = p.locator('.oj-feedback .btn.primary');
        if (tk.locked) { if (await cont.count()) await cont.first().click(); else await p.waitForTimeout(200); continue; }
        const ov = await overflow();
        check(ov <= 1, `${tag} ${rtag} task ${tk.i} (${tk.kind}) horizontal overflow ${ov}px`);
        if (!kinds[tk.kind]) { kinds[tk.kind] = 1; await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/${tag}-${rtag}-${tk.kind}.png` }); }
        if (wrongOn === tk.i && !wrongDone) {
          wrongDone = true;
          await solve(tk, true); await p.waitForTimeout(700);
          await p.screenshot({ path: `${OUT}/${tag}-${rtag}-wrong.png` });
          const hint = await p.$$eval('.oj-feedback .oj-rule', x => x.map(e => e.textContent).join(' '));
          check(tk.options && tk.options.length === 2 ? true : hint.length > 10, `${tag} ${rtag} hint after the first wrong answer (${tk.kind}): ${hint}`);
          if (tk.type === 'number') await p.waitForTimeout(500);
          continue;
        }
        await solve(tk, false);
        await p.waitForTimeout(250);
        if (shots < 1 && rtag.endsWith('0')) { shots++; await p.screenshot({ path: `${OUT}/${tag}-${rtag}-answered.png`, fullPage: false }); }
        const ok = await p.evaluate(() => { const s = Core.games.lommepenge._state(); return s.locked && s.results[s.results.length - 1] > 0; });
        check(ok, `${tag} ${rtag} task ${tk.i} (${tk.kind}) accepted the right answer`);
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/${tag}-${rtag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      await p.click('.rs-overlay .btn.ghost');
      await p.waitForSelector('.lp-route');
      return stars;
    }
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForTimeout(200);
      const n = await p.$$eval('.lp-route', x => x.length);
      check(n >= 5, `${tag} band ${band} has ${n} routes`);
      for (let r = 0; r < n; r++) {
        const wrongOn = (band === 0 && r <= 2) || (band === 1 && r === 0) ? 1 : -1; // hints in Pengepungen, Kassen, Indkøbslisten and the first U route
        const stars = await playRound(r, (band ? 'U' : 'M') + r, wrongOn);
        check(stars >= (wrongOn >= 0 ? 2 : 3), `${tag} ${band ? 'U' : 'M'} route ${r}: ${stars} stars`);
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map.png`, fullPage: true });
      const done = await p.$$eval('.lp-route .star.on', x => x.length);
      check(done >= n * 3 - 2, `${tag} map shows the stars (${done})`);
      check(await overflow() <= 1, `${tag} map no horizontal scroll`);
    }
    console.log(tag + ' task kinds seen: ' + Object.keys(kinds).length + ' (' + Object.keys(kinds).join(', ') + ')');
    check(Object.keys(kinds).length >= 40, `${tag} saw most task kinds (${Object.keys(kinds).length})`);
    // collection
    await p.click('button:has-text("Sparebøssen")');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${tag}-collection.png`, fullPage: true });
    const items = await p.$$eval('main li', x => x.length), got = await p.$$eval('main li.got', x => x.length);
    check(items >= 8 && got >= 3, `${tag} collection has entries (${items}, reached ${got})`);
    check(await overflow() <= 1, `${tag} collection no horizontal scroll`);
    // hub API in the browser
    const api = await p.evaluate(() => { const g = Core.games.lommepenge, d = Core.gameData('lommepenge'); return { s: g.summary(d), pr: g.progress(d), c: g.collection(d), q: Core.seeded(5, () => g.quickTask('U', d)) }; });
    check(api.s.stars >= 13 && api.pr.plays === 10 && api.c.n === got && api.q.q, `${tag} hub API ${JSON.stringify(api.s)} ${JSON.stringify(api.pr)}`);
    // progress survives a reload
    await p.reload(); await p.waitForTimeout(400);
    const kept = await p.evaluate(() => JSON.stringify(localStorage).indexOf('lommepenge') >= 0);
    check(kept, `${tag} progress saved`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Lommepenge e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
