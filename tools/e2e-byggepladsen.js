// End-to-end test of Byggepladsen through the real UI: every route in both bands, the sandbox, the projects and the daily task.
// NODE_PATH=$(npm root -g) node tools/e2e-byggepladsen.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/bp-shots';
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
    await p.click('a[href="#/spil/byggepladsen"]');
    await p.waitForSelector('.bp-route');
    const noScroll = async (where) => {
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(o <= 1, `${tag} no horizontal scroll on ${where} (${o}px)`);
    };
    await noScroll('map');
    const cur = () => p.evaluate(() => {
      const s = Core.games.byggepladsen._state(), t = s && s.tasks[s.i];
      if (!t) return null;
      return { type: t.type, kind: t.kind, answer: t.answer, options: t.options, solutions: t.solutions, given: t.given, W: t.W, H: t.H, i: s.i, n: s.tasks.length, locked: s.locked };
    });
    const click = sel => p.click(sel, { force: true });
    async function solve(tk, wrong) {
      if (tk.type === 'fence') {
        let a = tk.answer;
        if (wrong) { // a pen that does not fit the task
          outer: for (let ww = 1; ww <= 8; ww++) for (let hh = 1; hh <= 6; hh++) if (!tk.solutions.some(s => s[0] === ww && s[1] === hh)) { a = [0, 0, ww, hh]; break outer; }
        }
        await click(`.bp-hit[data-p="${a[0]},${a[1]}"]`); await click(`.bp-hit[data-p="${a[2]},${a[3]}"]`);
        await click('.bp-check');
      } else if (tk.type === 'cells') {
        let keys = tk.answer.slice();
        if (wrong) { const taken = new Set(tk.answer.concat(tk.given.map(c => c.join(',')))); for (let x = 0; x < tk.W && keys.length === tk.answer.length; x++) for (let y = 0; y < tk.H; y++) if (!taken.has(x + ',' + y)) { keys = [x + ',' + y]; break; } }
        for (const k of keys) await click(`.bp-hit[data-c="${k}"]`);
        await click('.bp-check');
      } else if (tk.type === 'point') {
        const [x, y] = tk.answer.split(',').map(Number);
        await click(`.bp-hit[data-p="${wrong ? (x + 1) % 9 : x},${y}"]`);
        await click('.bp-check');
      } else if (tk.type === 'number') {
        await p.fill('.bp-input', wrong ? '9999' : tk.answer);
        await p.press('.bp-input', 'Enter');
      } else {
        const v = wrong ? tk.options.find(o => o !== tk.answer) : tk.answer;
        await click(`.bp-body [data-v="${v}"]`);
      }
    }
    async function playRound(routeIdx, rtag, wrongOn) {
      await p.click(`.bp-route >> nth=${routeIdx}`);
      await p.waitForSelector('.bp-body');
      let shot = false, n = 0;
      for (let guard = 0; guard < 200; guard++) {
        const tk = await cur();
        if (!tk) break;
        const cont = p.locator('.oj-feedback .btn.primary');
        if (tk.locked) { if (await cont.count() && await cont.first().isVisible()) { if (rtag && n < 2 && !shot) { await p.screenshot({ path: `${OUT}/${tag}-${rtag}-ok${n}.png` }); } n++; await cont.first().click(); } else await p.waitForTimeout(150); continue; }
        if (wrongOn === tk.i && !shot) {
          shot = true;
          await solve(tk, true); await p.waitForTimeout(500);
          await p.screenshot({ path: `${OUT}/${tag}-${rtag}-wrong.png` });
          const hint = await p.$$eval('.oj-feedback .oj-rule', x => x.length);
          check(hint >= 1, `${tag} ${rtag} shows a hint after a wrong answer`);
          if (tk.type === 'cells') await click('.bp-side .btn.ghost'); // clear the wrong cell
          continue;
        }
        if (n === 0 && routeIdx >= 0) await p.screenshot({ path: `${OUT}/${tag}-${rtag}-task.png` });
        await solve(tk, false);
        await p.waitForTimeout(tk.kind === 'netPick' || tk.kind === 'netOpp' ? 900 : 120);
      }
      await p.waitForSelector('.rs-overlay', { timeout: 8000 });
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/${tag}-${rtag}-result.png` });
      const stars = await p.$$eval('.rs-result-stars .star.on', x => x.length);
      await p.click('.rs-overlay .btn.ghost');
      await p.waitForSelector('.bp-route');
      return stars;
    }
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band); await p.waitForTimeout(200);
      const n = await p.$$eval('.bp-route', x => x.length);
      check(n === 6, `${tag} band ${band} has 6 routes (${n})`);
      for (let r = 0; r < n; r++) {
        const WRONG = { M0: 1, M1: 2, U2: 0, U4: 1 }, wrongOn = WRONG[(band ? 'U' : 'M') + r] === undefined ? -1 : WRONG[(band ? 'U' : 'M') + r]; // fence, cells, net and number tasks get one wrong answer first
        const stars = await playRound(r, (band ? 'U' : 'M') + r, wrongOn);
        check(stars >= (wrongOn >= 0 ? 2 : 3), `${tag} ${band ? 'U' : 'M'} route ${r}: ${stars} stars`);
      }
      await p.screenshot({ path: `${OUT}/${tag}-${band ? 'U' : 'M'}-map.png`, fullPage: true });
      const done = await p.$$eval('.bp-route .star.on', x => x.length);
      check(done >= n * 3 - 1, `${tag} map shows the stars (${done})`);
    }
    // hub API
    const api = await p.evaluate(() => {
      const g = Core.games.byggepladsen, d = Core.gameData('byggepladsen');
      const q1 = Core.seeded(7, () => g.quickTask('M', {})), q2 = Core.seeded(7, () => g.quickTask('M', {})), q3 = Core.seeded(11, () => g.quickTask('U', d));
      return { sum: g.summary(d), prog: g.progress(d), col: g.collection(d), rep: g.parentReport(d), same: JSON.stringify(q1) === JSON.stringify(q2), q3: q3 };
    });
    check(api.sum.max === 18 && api.sum.stars >= 17, `${tag} summary ${JSON.stringify(api.sum)}`);
    check(api.prog.plays === 12 && api.prog.bands.M.length === 6 && api.prog.bands.U.length === 6, `${tag} progress ${JSON.stringify(api.prog)}`);
    check(api.col.n === 12 && api.col.max === 12, `${tag} collection ${JSON.stringify(api.col)}`);
    check(api.rep.rows.length === 12 && api.rep.head.length === 3, `${tag} parent report`);
    check(api.same && api.q3 && api.q3.q && (api.q3.options ? api.q3.options.indexOf(api.q3.answer) >= 0 : api.q3.input === 'number'), `${tag} quickTask works`);
    // projects (collection screen)
    await p.click('.bp-projects-btn');
    await p.waitForSelector('.bp-projects');
    await p.screenshot({ path: `${OUT}/${tag}-projects.png`, fullPage: true });
    const built = await p.$$eval('.bp-project.done', x => x.length);
    check(built === 12, `${tag} all 12 projects built (${built})`);
    await noScroll('projects');
    await p.click('.topbar .btn.ghost'); await p.waitForSelector('.bp-route');
    // sandbox
    await p.click('.bp-sandbox-btn'); await p.waitForSelector('.bp-sandbox .bp-hit');
    for (const k of ['2,2', '3,2', '3,3']) await click(`.bp-hit[data-c="${k}"]`);
    let live = await p.textContent('.bp-live');
    check(/Areal: 3 m²/.test(live) && /Omkreds: 8 m/.test(live), `${tag} sandbox live numbers: ${live}`);
    await p.click('.bp-sandbox .switch'); await click('.bp-hit[data-c="0,0"]');
    live = await p.textContent('.bp-live');
    check(/Areal: 5 m²/.test(live), `${tag} sandbox mirror adds two blocks: ${live}`);
    await p.screenshot({ path: `${OUT}/${tag}-sandbox.png`, fullPage: true });
    await noScroll('sandbox');
    const visited = await p.evaluate(() => !!(Core.profile().visits || {})['byggepladsen:sandbox']);
    check(visited, `${tag} sandbox visit recorded`);
    // progress survives a reload
    await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(400);
    const kept = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('bobspil.v1')); return JSON.stringify(d).indexOf('byggepladsen') >= 0 && JSON.stringify(d).indexOf('sandbox') >= 0; });
    check(kept, `${tag} progress saved`);
    // horizontal scroll on every kind of play screen
    await p.goto(URL + '#/hjem'); await p.goto(URL + '#/spil/byggepladsen'); await p.waitForSelector('.bp-route');
    for (const band of [0, 1]) {
      await p.click('.seg >> nth=' + band);
      for (let r = 0; r < 6; r++) {
        await p.click(`.bp-route >> nth=${r}`); await p.waitForSelector('.bp-body');
        await noScroll('play ' + band + r);
        await p.click('.rs-hud .rs-iconbtn'); await p.click('.rs-overlay .btn.ghost'); await p.waitForSelector('.bp-route');
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Byggepladsen e2e: all good (' + SIZES.map(s => s[0]).join(', ') + ')');
  process.exit(errors.length ? 1 : 0);
})();
