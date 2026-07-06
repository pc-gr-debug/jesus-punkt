// Screenshot the site at exact viewport widths via CDP
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const shots = JSON.parse(process.argv[2] || '[]');
  for (const s of shots) {
    const page = await browser.newPage();
    await page.setViewport({ width: s.w, height: s.h || 900, deviceScaleFactor: s.dpr || 1, isMobile: s.w < 600, hasTouch: s.w < 600 });
    await page.goto(s.url, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 300));
    if (s.js) await page.evaluate(s.js);
    if (s.js) await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(__dirname, s.out), fullPage: s.full !== false });
    // report layout health
    const m = await page.evaluate(() => ({
      iw: window.innerWidth,
      sw: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    }));
    console.log(s.out, JSON.stringify(m));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
