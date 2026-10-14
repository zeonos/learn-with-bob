// Draws every unlockable look for Bob into a PNG for a visual check: node tools/looks-gallery.js [out.png]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.evaluate(() => {
    document.body.innerHTML = ''; document.body.style.background = '#fff';
    const box = document.createElement('div'); box.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:8px;font:12px sans-serif';
    Object.keys(Bob.looks).forEach(cat => Bob.looks[cat].forEach(id => {
      const look = {}; look[cat] = id;
      const d = document.createElement('div'); d.style.cssText = 'width:120px;text-align:center';
      d.innerHTML = Bob.svg({ expression: 'hello', size: 140, look }) + '<br>' + cat + ': ' + id; box.appendChild(d);
    }));
    const d = document.createElement('div'); d.style.cssText = 'width:120px;text-align:center';
    d.innerHTML = Bob.svg({ expression: 'cheering', size: 140, look: { bow: 'stribet', wings: 'regnbue', tip: 'stjerne', hat: 'krone', extra: 'medalje' } }) + '<br>alt på én gang'; box.appendChild(d);
    document.body.appendChild(box);
  });
  await p.screenshot({ path: process.argv[2] || '/tmp/claude-0/looks.png', fullPage: true });
  await b.close();
})();
