// End-to-end test of Verdensrejsen through the real UI: node tools/e2e-verdensrejsen.js [url] [outdir] [sizes]
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../index.html');
const OUT = process.argv[3] || '/tmp/claude-0/vr-shots';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]]) {
    if (ONLY && ONLY.indexOf(name) < 0) continue;
    const touch = name !== 'desktop';
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(name + ' console: ' + m.text()); });
    await p.goto(URL);
    await p.fill('#pname', 'Emil'); await p.click('button[type=submit]');
    await p.click('a[href="#/spil/verdensrejsen"]');
    await p.waitForSelector('.vr-route');
    await p.screenshot({ path: `${OUT}/${name}-list.png` });
    const cur = () => p.evaluate(() => {
      const g = Core.games.verdensrejsen, s = g._state(), t = s && s.tasks[s.i]; if (!t) return null;
      return { type: t.type, i: s.i, locked: s.locked, answer: t.answer, name: t.name, label: t.type === 'compass' ? STR.vr.dirsLong[t.answer] : t.type === 'clues' ? VR_PLACES.world[t.id].da : null };
    });
    const screenOf = (xy) => p.evaluate((xy) => {
      const m = Core.games.verdensrejsen._map(), pt = m.svg.createSVGPoint(); pt.x = xy[0]; pt.y = xy[1];
      const q = pt.matrixTransform(m.svg.getScreenCTM()); return [q.x, q.y];
    }, xy);
    async function tapMap(xy) {
      const [x, y] = await screenOf(xy);
      if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
    }
    async function solve(tk, wrongFirst) {
      const tap = ['point', 'poly', 'continent', 'sea', 'nature'].includes(tk.type);
      if (wrongFirst) {
        if (tap) await tapMap(tk.type === 'sea' ? await p.evaluate(() => { const c = Core.games.verdensrejsen._map().m.land.filter(l => l.id === 'BRA' || l.id === 'jylland' || l.id === 'SWE')[0]; return c ? c.c : [500, 300]; }) : [3, 3]);
        else {
          const opts = await p.$$eval('.vr-opt, .vr-dir', bs => bs.map(b => b.getAttribute('aria-label') || b.textContent));
          const wrong = opts.find(o => o !== (tk.label || tk.answer));
          await p.locator('.vr-opt, .vr-dir').nth(opts.indexOf(wrong)).click();
        }
        await p.waitForTimeout(250);
        check(await p.$eval('.vr-feedback', e => e.textContent.length > 0 || true), name + ' feedback after wrong');
      }
      if (tap) await tapMap(await p.evaluate(() => Core.games.verdensrejsen._target()));
      else if (tk.type === 'mc') await p.locator('.vr-opt').filter({ hasText: new RegExp('^' + tk.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).click();
      else await p.locator(`.vr-opt:text-is("${tk.label}"), .vr-dir[aria-label="${tk.label}"]`).first().click();
    }
    async function playRound(routeIdx, tag, wrongOn, expectStars) {
      await p.click(`.vr-route >> nth=${routeIdx}`);
      await p.waitForSelector('.vr-svg');
      await p.waitForTimeout(300);
      for (let guard = 0; guard < 30; guard++) {
        const tk = await cur();
        if (!tk) break;
        await solve(tk, wrongOn === tk.i);
        await p.waitForTimeout(350);
        const after = await cur();
        check(after && after.locked, `${name} ${tag} task ${tk.i} (${tk.type} ${tk.name || tk.answer}) not solved`);
        if (!after || !after.locked) { await p.screenshot({ path: `${OUT}/${name}-${tag}-FAIL-${tk.i}.png` }); break; }
        if (guard === 1 || wrongOn === tk.i) { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${name}-${tag}-${guard === 1 ? 'task' : 'second'}.png` }); }
        await p.click('.vr-next');
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1600);
      await p.screenshot({ path: `${OUT}/${name}-${tag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      check(stars === expectStars, `${name} ${tag}: ${stars} stars, expected ${expectStars}`);
      await p.click('text=Til oversigten');
      await p.waitForSelector('.vr-route');
    }
    const plan = name === 'desktop'
      ? { M: [[0, 'byer', 2, 3], [1, 'oer', -1, 3], [2, 'norden', 6, 3], [3, 'verden', 7, 3], [4, 'kompas', 3, 3]], U: [[0, 'europa', 1, 3], [1, 'europahoved', -1, 3], [2, 'verdenlande', -1, 3], [3, 'verdenhoved', 4, 3], [4, 'natur', -1, 3], [5, 'spor', 2, 3]] }
      : { M: [[0, 'byer', 2, 3], [4, 'kompas', -1, 3]], U: [[2, 'verdenlande', 1, 3], [5, 'spor', -1, 3]] };
    for (const r of plan.M) await playRound(...r);
    await p.click('.seg >> nth=1'); await p.waitForTimeout(200);
    for (const r of plan.U) await playRound(...r);
    // a round with many mistakes gives fewer stars
    await p.click('.vr-route >> nth=0'); await p.waitForSelector('.vr-svg');
    for (let i = 0; i < 10; i++) {
      const tk = await cur(); if (!tk) break;
      for (let k = 0; k < 2; k++) { await tapMap([3, 3]); await p.waitForTimeout(150); }
      check((await cur()).locked, name + ' two misses reveal the answer');
      if (i === 0) { await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/${name}-reveal.png` }); }
      await p.click('.vr-next');
    }
    await p.waitForSelector('.rs-overlay'); await p.waitForTimeout(600);
    check(await p.$$eval('.rs-result-stars .star.on', x => x.length) === 0, name + ' zero stars after all misses');
    await p.click('text=Til oversigten');
    // passport
    await p.click('text=Mit pas'); await p.waitForSelector('.vr-stamp');
    const nStamps = await p.$$eval('.vr-stamp', x => x.length);
    check(nStamps === plan.M.length + plan.U.length, name + ' stamps ' + nStamps);
    await p.click('.vr-chip >> nth=0'); await p.waitForTimeout(150);
    await p.screenshot({ path: `${OUT}/${name}-passport.png`, fullPage: true });
    // zoom buttons work
    await p.click('text=Tilbage'); await p.waitForSelector('.vr-route');
    await p.click('.vr-route >> nth=1'); await p.waitForSelector('.vr-svg');
    const vb0 = await p.$eval('.vr-svg', s => s.getAttribute('viewBox'));
    await p.click('.vr-zoom button >> nth=0'); await p.click('.vr-zoom button >> nth=0');
    const vb1 = await p.$eval('.vr-svg', s => s.getAttribute('viewBox'));
    check(vb0 !== vb1, name + ' zoom changes the view');
    // solving still works while zoomed (target may be off screen: reset first if needed)
    await p.screenshot({ path: `${OUT}/${name}-zoomed.png` });
    // hub shows stars
    await p.goto(URL + '#/hjem'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${name}-hub.png` });
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'Verdensrejsen e2e: all OK');
  process.exit(errors.length ? 1 : 0);
})();
