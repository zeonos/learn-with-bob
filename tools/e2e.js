// End-to-end test with Playwright: node tools/e2e.js [url] [outdir]
const { chromium } = require('playwright');
const path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../index.html');
const OUT = process.argv[3] || '/tmp/claude-0/shots';
const sizes = { desktop: [1280, 800], phone: [390, 844], tabletP: [768, 1024], tabletL: [1024, 768] };
const errors = [];
function check(cond, msg) { if (!cond) { errors.push('ASSERT ' + msg); console.log('ASSERT FAILED', msg); } }

(async () => {
  const browser = await chromium.launch();
  for (const [name, [w, h]] of Object.entries(sizes)) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: name !== 'desktop' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/manifest|Failed to load resource|CORS/i.test(m.text())) errors.push(name + ' console: ' + m.text()); });
    await p.goto(URL);
    // create profile
    await p.fill('#pname', 'Ida');
    await p.click('button.band-card >> nth=0');
    await p.screenshot({ path: `${OUT}/${name}-1-newprofile.png` });
    await p.click('button[type=submit]');
    await p.waitForSelector('.game-grid');
    await p.screenshot({ path: `${OUT}/${name}-2-hub.png` });
    await p.click('a[href="#/spil/regnestorm"]');
    await p.waitForSelector('.rs-worlds');
    await p.screenshot({ path: `${OUT}/${name}-3-map.png`, fullPage: true });
    // play world 1 (plus og minus)
    await p.click('.rs-world >> nth=0');
    await p.waitForSelector('.rs-cloud', { timeout: 5000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/${name}-4-play.png` });
    const st = () => p.evaluate(() => { const s = Core.games.regnestorm._state(); return s && { answer: s.prob && s.prob.answerText, wave: s.wave, locked: s.locked, attempt: s.attempt, over: s.over, text: s.prob && s.prob.text }; });
    async function typeAnswer(a) { for (const ch of a.replace('−', '-')) await p.keyboard.press(ch === ',' ? 'Comma' : ch === '-' ? 'Minus' : ch); }
    // wave 1: wrong answer → hint, then correct
    let s = await st();
    await typeAnswer('999999'); await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    check(await p.isVisible('.rs-card'), name + ' hint card visible after wrong answer');
    await p.screenshot({ path: `${OUT}/${name}-5-hint.png` });
    await typeAnswer(s.answer); await p.keyboard.press('Enter');
    await p.waitForTimeout(1200);
    // wave 2: wrong twice → solution
    s = await st();
    check(s.wave === 2, name + ' advanced to wave 2 (got ' + s.wave + ')');
    await typeAnswer('999999'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    await typeAnswer('999998'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${name}-6-solution.png` });
    check(await p.isVisible('.rs-card.solution'), name + ' solution card');
    await p.click('.rs-card .btn');
    await p.waitForTimeout(900);
    // remaining waves correctly, using the on-screen pad for one of them
    for (let guard = 0; guard < 30; guard++) {
      s = await st();
      if (!s || s.over) break;
      if (s.locked || !s.answer) { await p.waitForTimeout(300); continue; }
      if (guard === 1) {
        for (const ch of s.answer) await p.click(`.rs-key[data-key="${ch === '−' ? '-' : ch}"]`);
        await p.click('.rs-key[data-key="ok"]');
      } else { await typeAnswer(s.answer); await p.keyboard.press('Enter'); }
      if (s.wave === 10) await p.screenshot({ path: `${OUT}/${name}-7-boss.png` });
      await p.waitForTimeout(1000);
    }
    await p.waitForSelector('.rs-overlay', { timeout: 5000 });
    await p.waitForTimeout(1800);
    await p.screenshot({ path: `${OUT}/${name}-8-result.png` });
    const stars = await p.evaluate(() => Core.gameData('regnestorm').worlds.plusminus.stars);
    check(stars === 2, name + ' expected 2 stars, got ' + stars);
    // persisted?
    await p.click('text=Til kortet');
    await p.reload();
    await p.waitForSelector('.rs-worlds');
    const onStars = await p.$$eval('.rs-world >> nth=0', () => 0).catch(() => 0);
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('bobspil.v1')).progress);
    check(JSON.stringify(saved).includes('"plusminus"'), name + ' progress saved to localStorage');
    // Udskoling band, zen, decimal/negative pads
    await p.click('.seg >> nth=1');
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/${name}-9-map-u.png`, fullPage: true });
    await p.click('.rs-world >> nth=3'); // ligninger (negative)
    await p.waitForSelector('.rs-cloud'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${name}-10-ligninger.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/${name}-11-pause.png` });
    await p.click('text=Afslut banen');
    // parent page
    await p.goto(URL.split('#')[0] + '#/voksne');
    await p.waitForSelector('#gate');
    const q = await p.textContent('label[for=gate]');
    const m = q.match(/(\d+) · (\d+)/);
    await p.fill('#gate', String(m[1] * m[2])); await p.keyboard.press('Enter');
    await p.waitForSelector('table');
    await p.screenshot({ path: `${OUT}/${name}-12-parents.png`, fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'E2E OK – no errors');
  process.exit(errors.length ? 1 : 0);
})();
