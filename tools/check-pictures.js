// Checks the Malebilleder pictures: node tools/check-pictures.js [preview.png]
// Every picture must be solvable one line at a time (no guessing), use only the palette, and have a Danish name.
// With a file name it also draws all pictures into one PNG for a visual check (needs python3 with Pillow).
'use strict';
global.window = global;
var N = require('../gaadehuset/nonogram.js');
require('../gaadehuset/pictures.js');
var P = window.GH_PICS, execFileSync = require('child_process').execFileSync, fs = require('fs');
var fails = 0;
function bad(msg) { fails++; console.log('FAIL', msg); }
var ids = {}, sizes = { M: {}, U: {} };
P.forEach(function (p) {
  if (!/^[a-z0-9-]+$/.test(p.id) || ids[p.id]) bad('id ' + p.id); ids[p.id] = 1;
  if (p.b !== 'M' && p.b !== 'U') bad('band ' + p.id);
  var H = p.rows.length, W = p.rows[0].length;
  if (p.rows.some(function (r) { return r.length !== W; })) bad('rows differ in length ' + p.id);
  if (p.rows.join('').split('').some(function (c) { return c !== '.' && !N.PAL[c]; })) bad('unknown colour letter ' + p.id);
  var okSize = p.b === 'M' ? W >= 5 && W <= 8 && H >= 5 && H <= 8 : W >= 9 && W <= 12 && H >= 9 && H <= 12;
  if (!okSize) bad('size ' + W + 'x' + H + ' ' + p.id);
  sizes[p.b][W + 'x' + H] = (sizes[p.b][W + 'x' + H] || 0) + 1;
  var g = N.grid(p), emptyRows = g.filter(function (r) { return r.every(function (v) { return !v; }); }).length;
  var emptyCols = g[0].filter(function (_, x) { return g.every(function (r) { return !r[x]; }); }).length;
  if (emptyRows + emptyCols > 1) bad('more than one empty line ' + p.id);
  var c = N.check(p);
  if (!c.ok) bad('not solvable line by line ' + p.id);
  if (c.filled < W * H * 0.25 || c.filled > W * H * 0.8) bad('too empty or too full (' + c.filled + '/' + W * H + ') ' + p.id);
  if (!p.name || !/^(en|et) /.test(p.name)) bad('name must start with en/et: ' + p.id);
});
var words = Array.from(new Set(P.map(function (p) { return p.name; }).join(' ').split(/[^A-Za-zæøåÆØÅé]+/).filter(Boolean)));
var unknown = execFileSync('hunspell', ['-d', 'da_DK', '-l', '-i', 'utf-8'], { input: words.join('\n'), encoding: 'utf8' }).split('\n').filter(Boolean);
if (unknown.length) bad('Danish spelling: ' + unknown.join(', '));
console.log('M:', P.filter(function (p) { return p.b === 'M'; }).length, JSON.stringify(sizes.M), ' U:', P.filter(function (p) { return p.b === 'U'; }).length, JSON.stringify(sizes.U));

var out = process.argv[2];
if (out) {
  var tmp = out + '.json';
  fs.writeFileSync(tmp, JSON.stringify({ pal: N.PAL, pics: P }));
  execFileSync('python3', ['-c', [
    'import json,sys', 'from PIL import Image, ImageDraw',
    'd=json.load(open(sys.argv[1])); pal=d["pal"]; pics=d["pics"]; S=14; cols=6; cw=12*S+20; ch=12*S+40',
    'rows=(len(pics)+cols-1)//cols; im=Image.new("RGB",(cols*cw,rows*ch),"#FFF8E8"); dr=ImageDraw.Draw(im)',
    'for i,p in enumerate(pics):',
    '  ox=(i%cols)*cw+10; oy=(i//cols)*ch+6',
    '  for y,r in enumerate(p["rows"]):',
    '    for x,c in enumerate(r):',
    '      col=pal.get(c,"#FFFFFF") if c!="." else "#EEE6D6"',
    '      dr.rectangle([ox+x*S,oy+y*S,ox+x*S+S-1,oy+y*S+S-1],fill=col,outline="#D8CBB0")',
    '  dr.text((ox,oy+len(p["rows"])*S+4),p["id"]+" "+p["b"],fill="#000")',
    'im.save(sys.argv[2])'].join('\n'), tmp, out]);
  fs.unlinkSync(tmp);
  console.log('Wrote', out);
}
console.log(fails ? fails + ' problems' : 'All ' + P.length + ' pictures are fine');
process.exit(fails ? 1 : 0);
