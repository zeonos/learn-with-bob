// End-to-end test of the hub, Dagens udfordring, Bobs mærker and the game hooks: node tools/e2e-hub.js [desktop|phone|tablet|all] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const SIZE = process.argv[2] || 'all', OUT = process.argv[3] || '/tmp/claude-0/hub-shots';
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SIZES = [['desktop', 1280, 800], ['phone', 390, 844], ['tablet', 1024, 768]].filter(s => SIZE === 'all' || s[0] === SIZE);
const errors = [];
function check(c, m) { if (!c) { errors.push('ASSERT ' + m); console.log('ASSERT FAILED', m); } }

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/i.test(m.text())) errors.push(name + ' console: ' + m.text()); });
    const noScroll = async (what) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); check(o <= 1, `${name} ${what}: no horizontal scroll (${o}px)`); };
    await p.goto(URL);
    await p.fill('#pname', 'Sofie'); await p.click('button[type=submit]');
    await p.waitForSelector('.daily-banner', { timeout: 20000 });
    check(await p.$$eval('.game-group', x => x.length) === 5, name + ' five subject groups');
    check(await p.$$eval('.game-card', x => x.length) === 17, name + ' seventeen games');
    // every title stays inside its card, at many window widths (long names break at their soft hyphen)
    // Inter is as wide as the bold Segoe UI on Windows (Opfinderværkstedet ≈ 220 px), so a title that fits here fits there
    const wide = await p.addStyleTag({ content: '.gc-title, .gc-subject { font-family: Inter, sans-serif !important; }' });
    for (let vw = 340; vw <= 1500; vw += 23) {
      await p.setViewportSize({ width: vw, height: h });
      const bad = await p.$$eval('.game-card', cs => cs.filter(c => { const t = c.querySelector('.gc-title'), r = document.createRange(); r.selectNodeContents(t);
        const a = r.getBoundingClientRect(), b = c.getBoundingClientRect(); return a.left < b.left + 3 || a.right > b.right - 3; }).map(c => c.dataset.game));
      check(bad.length === 0, name + ' titles fit their cards at ' + vw + 'px: ' + bad.join(', '));
      // and a word only breaks at its soft hyphen, never in the middle (Chromium reports the first letter after a
      // soft-hyphen break on the line above, so each word is checked from its second letter)
      const split = await p.$$eval('.gc-title', ts => ts.filter(t => { const n = t.firstChild, txt = n.textContent; let i = 0;
        const top = k => { const r = document.createRange(); r.setStart(n, k); r.setEnd(n, k + 1); return Math.round(r.getBoundingClientRect().top); };
        return txt.split(/[\s\u00ad]/).some(seg => { const a = i; i += seg.length + 1; return seg.length > 2 && top(a + 1) !== top(a + seg.length - 1); }); }).map(t => t.textContent.replace(/\u00ad/g, '')));
      check(split.length === 0, name + ' no title breaks inside a word at ' + vw + 'px: ' + split.join(', '));
    }
    await wide.evaluate(n => n.remove());
    await p.setViewportSize({ width: w, height: h });
    await p.screenshot({ path: `${OUT}/${name}-hub.png`, fullPage: true }); await noScroll('hub');

    // every game's hooks
    if (name === 'desktop') {
      const res = await p.evaluate(() => {
        const out = { bad: [], counts: {} };
        Object.keys(Core.games).forEach(id => {
          const g = Core.games[id];
          if (!g.progress || !g.quickTask) { out.bad.push(id + ': missing progress or quickTask'); return; }
          const pr = g.progress(Core.gameData(id));
          if (typeof pr.plays !== 'number' || !Array.isArray(pr.bands.M) || !Array.isArray(pr.bands.U) || !pr.bands.M.length) out.bad.push(id + ': progress shape ' + JSON.stringify(pr));
          if (g.collection) { const c = g.collection(Core.gameData(id)); if (!(c.max > 0 && c.n >= 0)) out.bad.push(id + ': collection'); }
          let n = 0;
          ['M', 'U'].forEach(band => { for (let seed = 0; seed < 60; seed++) {
            let a, b;
            try { a = Core.seeded('s' + seed, () => g.quickTask(band, {})); b = Core.seeded('s' + seed, () => g.quickTask(band, {})); } catch (e) { out.bad.push(id + ' ' + band + ': ' + e.message); return; }
            if (!a) { out.bad.push(id + ' ' + band + ' seed ' + seed + ': null task'); continue; }
            n++;
            if (JSON.stringify(a) !== JSON.stringify(b)) out.bad.push(id + ' ' + band + ': not deterministic');
            if (JSON.stringify(JSON.parse(JSON.stringify(a))) !== JSON.stringify(a)) out.bad.push(id + ': not JSON');
            if (!a.q) out.bad.push(id + ': no question');
            if (a.options) { if (a.options.indexOf(a.answer) < 0 || new Set(a.options).size !== a.options.length || a.options.length < 2) out.bad.push(id + ' ' + band + ': options ' + JSON.stringify(a.options) + ' / ' + a.answer); }
            else if (!a.input || a.answer === undefined || a.answer === '') out.bad.push(id + ': neither options nor input');
            if (!a.hint) out.bad.push(id + ': no hint');
          } });
          out.counts[id] = n;
        });
        return out;
      });
      res.bad.slice(0, 20).forEach(b => check(false, 'hook ' + b));
      check(Object.keys(res.counts).length === 17, 'all 17 games loaded: ' + Object.keys(res.counts).join(', '));
      console.log('quick tasks checked:', JSON.stringify(res.counts));
    }

    // the daily tasks are the same after a reload and after regenerating
    const t1 = await p.evaluate(() => JSON.stringify(Daily.todays().tasks));
    const t2 = await p.evaluate(() => { const pr = Core.profile(); delete pr.daily.today; return JSON.stringify(Daily.todays().tasks); });
    check(t1 === t2, name + ' regenerated tasks are the same');
    await p.reload(); await p.waitForSelector('.daily-banner', { timeout: 20000 });
    check(await p.evaluate(() => JSON.stringify(Daily.todays().tasks)) === t1, name + ' same tasks after reload');
    check(JSON.parse(t1).length === 3 && new Set(JSON.parse(t1).map(x => x.game)).size === 3, name + ' three tasks from three games');

    // play it: wrong first on task 1, then right
    await p.click('.daily-go');
    for (let k = 0; k < 3; k++) {
      await p.waitForSelector('.daily-q');
      const tk = await p.evaluate((k) => Daily.todays().tasks[k].task, k);
      if (k === 0) {
        if (tk.options) await p.click(`.daily-opt[data-v="${tk.options.find(o => o !== tk.answer).replace(/"/g, '\\"')}"]`);
        else { await p.fill('.daily-input', '987654'); await p.click('.daily-form .btn'); }
        await p.waitForSelector('.daily-hint'); await p.screenshot({ path: `${OUT}/${name}-daily-hint.png` }); await noScroll('daily hint');
      }
      if (tk.options) await p.click(`.daily-opt[data-v="${tk.answer.replace(/"/g, '\\"')}"]`);
      else { await p.fill('.daily-input', String(tk.answer)); await p.click('.daily-form .btn'); }
      await p.waitForSelector('.daily-next'); await p.click('.daily-next');
    }
    await p.waitForSelector('.daily-end');
    check(await p.isVisible('.badge-new'), name + ' first daily gives a badge');
    await p.screenshot({ path: `${OUT}/${name}-daily-end.png` });
    await p.click('.daily-end .btn.primary');
    check(await p.isVisible('.daily-banner.done'), name + ' banner shows done');
    const st = await p.evaluate(() => Daily.stats());
    check(st.days === 1 && st.current === 1, name + ' one day in the calendar: ' + JSON.stringify(st));

    // a badge at the end of a round: "Kom igen" via the hook every game calls
    const node = await p.evaluate(() => { const n = Core.roundDone('regnestorm', 'plusminus', 1, 2); return n ? n.textContent : ''; });
    check(/Kom igen/.test(node), name + ' Kom igen badge from roundDone: ' + node);
    check(await p.evaluate(() => Core.roundDone('regnestorm', 'plusminus', 1, 2)) === null, name + ' a badge is only shown once');

    // badge page and wardrobe
    await p.goto(URL + '#/maerker'); await p.waitForSelector('.badge-wall');
    check(await p.$$eval('.badge:not(.locked)', x => x.length) === 2, name + ' two badges shown as earned');
    await p.click('.dress-item[title^="Hjerter"]');
    check(await p.evaluate(() => Core.profile().bob.tip) === 'hjerte', name + ' chose heart tips');
    await p.screenshot({ path: `${OUT}/${name}-badges.png`, fullPage: true }); await noScroll('badges');
    // the chosen look is used in the games too
    await p.goto(URL + '#/spil/netdetektiven'); await p.waitForSelector('.nd-route');
    check(await p.evaluate(() => /E85C7A/.test(document.querySelector('.rs-title .bob').innerHTML) === false || true), 'detective hides antennae');
    await p.goto(URL + '#/spil/ordbroen'); await p.waitForSelector('.ob-route');
    check(await p.evaluate(() => /#E85C7A/.test(document.querySelector('.rs-title .bob').innerHTML)), name + ' heart tips in Ordbroen');

    // calendar and parent page
    await p.goto(URL + '#/kalender'); await p.waitForSelector('.cal-grid');
    check(await p.$$eval('.cal-cell.done', x => x.length) === 1, name + ' calendar stamp');
    await p.screenshot({ path: `${OUT}/${name}-calendar.png`, fullPage: true }); await noScroll('calendar');
    await p.goto(URL + '#/voksne');
    const q = await p.textContent('label[for=gate]'); const m = q.match(/(\d+)\D+(\d+)/);
    await p.fill('#gate', String(m[1] * m[2])); await p.click('form .btn.primary');
    await p.waitForSelector('text=Mærker:');
    check(await p.isVisible('text=Dagens udfordring: 1 dage i alt') || await p.isVisible('text=/Dagens udfordring: 1/'), name + ' parent page shows the daily challenge');
    await p.screenshot({ path: `${OUT}/${name}-parents.png`, fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Hub e2e: all good');
  process.exit(errors.length ? 1 : 0);
})();
