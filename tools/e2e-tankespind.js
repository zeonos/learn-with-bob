// End-to-end test of Tankespind through the real UI: every floor in both bands, one second-try answer and one revealed answer,
// the level goes up after a good round, nothing scrolls sideways, progress is saved.
// node tools/e2e-tankespind.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/tk-shots';
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
    await p.click('a[href="#/spil/tankespind"]');
    await p.waitForSelector('.tk-route');
    const cur = () => p.evaluate(() => { const s = Core.games.tankespind._state(), t = s && s.tasks[s.i]; return t ? { i: s.i, answer: t.answer, n: (t.options || t.items).length, locked: s.locked, type: t.type } : null; });
    const levels = () => p.evaluate(() => JSON.stringify(Core.gameData('tankespind').lv || {}));
    async function playRound(idx, rtag, mode) { // mode: 'clean' | 'second' (one task on the 2nd try) | 'reveal' (one task wrong twice)
      await p.click(`.tk-route >> nth=${idx}`);
      await p.waitForSelector('.oj-task .oj-body');
      let done = false;
      for (let guard = 0; guard < 200; guard++) {
        const tk = await cur();
        if (!tk) break;
        if (tk.locked) {
          const cont = p.locator('.oj-feedback .tk-next');
          if (await cont.count()) {
            if (guard < 3 || (!done && mode !== 'clean')) await p.screenshot({ path: `${OUT}/${tag}-${rtag}-explain${tk.i}.png` });
            await cont.first().click();
          } else await p.waitForTimeout(150);
          continue;
        }
        if (mode !== 'clean' && tk.i === 1 && !done) {
          done = true;
          const wrong = [...Array(tk.n).keys()].filter(k => k !== tk.answer);
          await p.click(`.oj-task [data-i="${wrong[0]}"]`); await p.waitForTimeout(400);
          await p.screenshot({ path: `${OUT}/${tag}-${rtag}-hint.png` });
          check(await p.locator('.oj-feedback .oj-rule').count() === 1, `${tag} ${rtag} hint shown after a wrong answer`);
          if (mode === 'reveal') { await p.click(`.oj-task [data-i="${wrong[1]}"]`); await p.waitForTimeout(300); check(await p.locator('.oj-rule.final').count() === 1, `${tag} ${rtag} answer revealed`); continue; }
        }
        await p.click(`.oj-task [data-i="${tk.answer}"]`);
        await p.waitForTimeout(120);
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/${tag}-${rtag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      const up = await p.locator('.rs-overlay .tk-lvlmsg').count();
      await p.click('.rs-overlay .btn.ghost');
      await p.waitForSelector('.tk-route');
      return { stars, up };
    }
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForTimeout(200);
      const n = await p.$$eval('.tk-route', x => x.length);
      check(n === 6, `${tag} six floors (${n})`);
      for (let r = 0; r < n; r++) {
        const mode = r === 0 ? 'second' : r === 1 ? 'reveal' : 'clean';
        const before = JSON.parse(await levels());
        const res = await playRound(r, (band ? 'U' : 'M') + r, mode);
        const after = JSON.parse(await levels());
        const want = mode === 'clean' ? 3 : 2;
        check(res.stars >= want, `${tag} ${band ? 'U' : 'M'} floor ${r} (${mode}): ${res.stars} stars`);
        if (mode === 'clean') { check(res.up === 1, `${tag} ${band ? 'U' : 'M'} floor ${r}: level goes up`); check(Object.values(after).reduce((a, b) => a + b, 0) > Object.values(before).reduce((a, b) => a + b, 0), `${tag} level saved`); }
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map.png`, fullPage: true });
      const lvTxt = await p.$$eval('.tk-level', x => x.map(e => e.textContent));
      check(lvTxt.some(t => /Niveau 2/.test(t)), `${tag} map shows the new level`);
    }
    // a second round on a floor uses the higher level
    await p.click('.tk-route >> nth=2'); await p.waitForSelector('.oj-task .oj-body');
    const lvl = await p.evaluate(() => Core.games.tankespind._state().level);
    check(lvl >= 2, `${tag} next round is harder (level ${lvl})`);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 1, `${tag} no horizontal scroll (${overflow}px)`);
    // every task type fits the screen: render each type and look for sideways overflow in the task area
    const types = await p.evaluate(() => {
      const out = [], P = window.TK, st = Core.games.tankespind._state(), seen = {};
      P.ROUTES.forEach(r => { for (let l = r.min; l <= r.max; l++) for (let i = 0; i < 6; i++) { const t = P.make(r.kind, Math.random, l, r.b), k = t.type + (t.kind || '') + (t.mode || '') + l; if (!seen[k]) { seen[k] = 1; out.push(t); } } });
      st.tasks = out; st.i = 0; return out.length;
    });
    for (let i = 0; i < types; i++) {
      await p.evaluate((i) => { const st = Core.games.tankespind._state(); st.i = i; st.locked = false; }, i);
      await p.evaluate(() => Core.games.tankespind._show());
      const ov = await p.evaluate(() => { const w = document.querySelector('.oj-task-wrap'); return w.scrollWidth - w.clientWidth; });
      check(ov <= 1, `${tag} task ${i} fits sideways (${ov}px)`);
      if (name === 'phone' && i % 5 === 0) await p.screenshot({ path: `${OUT}/${tag}-type${i}.png` });
    }
    // progress survives a reload
    await p.reload(); await p.waitForTimeout(400);
    const kept = await p.evaluate(() => { const d = Core.gameData('tankespind'); return Object.keys(d.routes || {}).length >= 12 && Object.keys(d.lv || {}).length >= 12; });
    check(kept, `${tag} progress and levels saved`);
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Tankespind e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
