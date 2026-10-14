// Screenshot every Regnestorm world at a given level: node tools/gallery.js <level> <viewport WxH> <outdir>
const { chromium } = require('playwright');
const path = require('path');
const level = +(process.argv[2] || 5), [W, H] = (process.argv[3] || '390x844').split('x').map(Number), OUT = process.argv[4] || '/tmp/claude-0/gallery';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.evaluate(() => { Core.createProfile('Test', '#6BB8E0', 'M'); });
  for (const band of ['M', 'U']) {
    const ids = await p.evaluate(b => Regn.bands[b].map(t => t.id), band);
    for (let i = 0; i < ids.length; i++) {
      await p.evaluate(([band, ids, level]) => { const d = Core.gameData('regnestorm'); d.band = band; d.topics = d.topics || {}; ids.forEach(id => d.topics[id] = { level, recent: [], answered: 0, firstTry: 0 }); Core.save(); }, [band, ids, level]);
      await p.goto('file://' + path.resolve(__dirname, '../index.html') + '#/hjem');
      await p.goto('file://' + path.resolve(__dirname, '../index.html') + '#/spil/regnestorm');
      await p.waitForSelector('.rs-world');
      await p.click(`.rs-world >> nth=${i}`);
      await p.waitForSelector('.rs-cloud'); await p.waitForTimeout(900);
      await p.screenshot({ path: `${OUT}/${band}${i + 1}-${ids[i]}-a.png` });
      // wrong answer → hint
      await p.keyboard.press('9'); await p.keyboard.press('9'); await p.keyboard.press('9'); await p.keyboard.press('9'); await p.keyboard.press('9'); await p.keyboard.press('Enter');
      await p.waitForTimeout(700);
      await p.screenshot({ path: `${OUT}/${band}${i + 1}-${ids[i]}-b-hint.png` });
    }
  }
  await b.close();
  console.log(errs.length ? errs.join('\n') : 'gallery ok');
})();
