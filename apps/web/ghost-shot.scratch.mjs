// Drive a real drag on the demand curve and capture the ghost.
import { chromium } from '@playwright/test';

const url = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'networkidle' });
await page.locator('.kg-container svg').waitFor();

// the demand curve's transparent drag hit-area
const dragPath = page.locator('.kg-container path[class^="dragPath"]').first();
const box = await dragPath.boundingBox();
console.log('dragPath box', box);

// grab a point on the curve and pull it down
const startX = box.x + box.width * 0.45;
const startY = box.y + box.height * 0.45;

await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move(startX, startY + 60, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(300);

const geom = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.kg-container svg *').forEach(el => {
    const t = el.tagName;
    if (t === 'line') out.push({ t, cls: el.getAttribute('class'), x1: el.getAttribute('x1'), y1: el.getAttribute('y1'), x2: el.getAttribute('x2'), y2: el.getAttribute('y2'), stroke: el.getAttribute('stroke'), style: el.getAttribute('style') });
    if (t === 'path' && (el.getAttribute('class')||'').startsWith('path-')) out.push({ t, cls: el.getAttribute('class'), d: (el.getAttribute('d')||'').slice(0,80), style: el.getAttribute('style') });
  });
  return out;
});
console.log('GEOM', JSON.stringify(geom, null, 1));

const state = await page.evaluate(() => {
  const el = document.querySelector('.kg-container');
  const paths = Array.from(document.querySelectorAll('.kg-container path[class^="path-"]'))
    .map(p => ({ cls: p.getAttribute('class'), style: p.getAttribute('style'), display: (p.closest('g[class^="rootElement"]')||{}).getAttribute ? p.closest('g[class^="rootElement"]').getAttribute('style') : null }));
  return { paths, dragPaths: document.querySelectorAll('.kg-container path[class^="dragPath"]').length };
});
console.log(JSON.stringify(state, null, 1));

const dashed = await page.locator('.kg-container path[style*="10,10"]').count();
const arrows = await page.locator('.kg-container line[marker-end]').count();
console.log('dashed ghost paths:', dashed, '| arrows:', arrows);
console.log('errors:', errors);

// identify whatever is drawing at the horizontal line's location
const wide = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.kg-container svg line, .kg-container svg path').forEach(el => {
    const b = el.getBBox ? el.getBBox() : null;
    if (b && b.width > 300 && b.height < 5) {
      out.push({ tag: el.tagName, cls: el.getAttribute('class'), bbox: {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)},
                 stroke: el.getAttribute('stroke'), style: el.getAttribute('style'),
                 d: (el.getAttribute('d')||'').slice(0,120),
                 parentClass: el.parentElement && el.parentElement.getAttribute('class') });
    }
  });
  return out;
});
console.log('WIDE', JSON.stringify(wide, null, 1));

const probe = await page.evaluate(() => {
  const svg = document.querySelector('.kg-container svg');
  const r = svg.getBoundingClientRect();
  const hits = [];
  for (let f = 0.1; f < 1; f += 0.1) {
    const x = r.left + r.width * f;
    for (let y = r.top; y < r.top + r.height; y += 2) {
      const el = document.elementFromPoint(x, y);
      if (el && el.tagName === 'path' && (el.getAttribute('class')||'').startsWith('path-')) {
        hits.push({ f: f.toFixed(1), y: Math.round(y - r.top), cls: el.getAttribute('class') });
      }
    }
  }
  return hits.slice(0, 40);
});
console.log('HITS', JSON.stringify(probe));

await page.screenshot({ path: 'screenshots/p5-ghost-after-drag.png' });
await page.locator('.kg-container').screenshot({ path: 'screenshots/p5-ghost-zoom.png' });
await browser.close();
