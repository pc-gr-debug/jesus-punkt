// One-off interaction verification for the 2026-07 fix round (run from tools/)
const puppeteer = require('puppeteer-core');

const BASE = 'http://localhost:8000';
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  /* ---------- homepage: glider + wheel + carousel ---------- */
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  // glider exists and follows hover
  await page.hover('.nav-pill__link[href="/events/"]');
  await new Promise(r => setTimeout(r, 400));
  let g = await page.evaluate(() => {
    const el = document.querySelector('.nav-pill__glider');
    const pill = document.querySelector('.nav-pill');
    const link = document.querySelector('.nav-pill__link[href="/events/"]');
    return el && {
      visible: pill.classList.contains('has-glider'),
      left: parseFloat(el.style.left), width: parseFloat(el.style.width),
      expectLeft: link.offsetLeft, expectWidth: link.offsetWidth,
    };
  });
  check('glider appears on hover at hovered link', !!g && g.visible && Math.abs(g.left - g.expectLeft) < 2 && Math.abs(g.width - g.expectWidth) < 2, JSON.stringify(g));

  await page.hover('.nav-pill__link[href="/kontakt/"]');
  await new Promise(r => setTimeout(r, 400));
  let g2 = await page.evaluate(() => {
    const el = document.querySelector('.nav-pill__glider');
    const link = document.querySelector('.nav-pill__link[href="/kontakt/"]');
    return { left: parseFloat(el.style.left), expectLeft: link.offsetLeft };
  });
  check('glider slides to next hovered link', Math.abs(g2.left - g2.expectLeft) < 2, JSON.stringify(g2));

  await page.hover('.header__logo');
  await new Promise(r => setTimeout(r, 300));
  const gGone = await page.evaluate(() => !document.querySelector('.nav-pill').classList.contains('has-glider'));
  check('glider fades out on nav leave', gGone);

  // header scrolled state: no full-width strip, pill gets surface
  await page.evaluate(() => window.scrollTo(0, 400));
  await new Promise(r => setTimeout(r, 300));
  const hdr = await page.evaluate(() => {
    const h = document.querySelector('.header');
    const pill = document.querySelector('.nav-pill');
    return {
      scrolled: h.classList.contains('is-scrolled'),
      headerBg: getComputedStyle(h).backgroundColor,
      pillBg: getComputedStyle(pill).backgroundColor,
    };
  });
  check('scrolled header stays transparent, pill strengthens',
    hdr.scrolled && (hdr.headerBg === 'rgba(0, 0, 0, 0)' || hdr.headerBg === 'transparent') && hdr.pillBg.includes('0.88'),
    JSON.stringify(hdr));

  // homepage events: 3 rows, first highlighted Gottesdienst
  const evRows = await page.evaluate(() => {
    const rows = document.querySelectorAll('[data-ct="events"] .event-row');
    return {
      n: rows.length,
      firstHl: rows[0] && rows[0].classList.contains('event-row--highlight'),
      firstTitle: rows[0] && rows[0].querySelector('.event-row__title').textContent,
    };
  });
  check('home shows 3 events, Gottesdienst first + highlighted',
    evRows.n === 3 && evRows.firstHl && /Gottesdienst/.test(evRows.firstTitle), JSON.stringify(evRows));

  // Werte wheel: scroll through the runway, active index + turn must step
  const werteData = await page.evaluate(async () => {
    const werte = document.querySelector('.werte');
    const wheel = werte.querySelector('.wheel');
    const out = [];
    document.documentElement.style.scrollBehavior = 'auto'; /* defeat smooth scroll for deterministic sampling */
    const top = werte.offsetTop;
    const runway = werte.offsetHeight - window.innerHeight;
    for (const frac of [0.05, 0.5, 0.95]) {
      window.scrollTo(0, top + runway * frac);
      window.dispatchEvent(new Event('scroll'));
      await new Promise(r => setTimeout(r, 550));
      const active = [...wheel.querySelectorAll('.wheel__item')].findIndex(i => i.classList.contains('is-active'));
      out.push({
        frac, active,
        turn: wheel.style.getPropertyValue('--wheel-turn'),
        sticky: Math.abs(werte.querySelector('.werte__sticky').getBoundingClientRect().top) < 2,
        panelName: werte.querySelector('.werte__panel-name').textContent,
      });
    }
    return out;
  });
  const [w1, w2, w3] = werteData;
  check('wheel pins and starts at value 1', w1.sticky && w1.active === 0 && w1.panelName === 'Authentisch', JSON.stringify(w1));
  check('wheel mid-runway shows middle value', w2.active === 3 && w2.turn === '-154.2858deg' && w2.panelName === 'Gastfreundlich', JSON.stringify(w2));
  check('wheel end shows value 7', w3.active === 6 && w3.panelName === 'Wertschätzend', JSON.stringify(w3));

  // carousel: next advances the track
  const car = await page.evaluate(async () => {
    document.querySelector('[data-carousel-next="sermons-carousel"]').scrollIntoView({ block: 'center' });
    const track = document.querySelector('#sermons-carousel .carousel__track');
    const before = track.style.transform;
    document.querySelector('[data-carousel-next="sermons-carousel"]').click();
    await new Promise(r => setTimeout(r, 500));
    const prevBtn = document.querySelector('[data-carousel-prev="sermons-carousel"]');
    return { before, after: track.style.transform, prevEnabled: !prevBtn.disabled, items: track.children.length };
  });
  check('home carousel advances via data-attribute buttons',
    car.before !== car.after && car.prevEnabled && car.items === 6, JSON.stringify(car));

  /* ---------- events page: calendar ---------- */
  await page.goto(BASE + '/events/', { waitUntil: 'networkidle0' });
  const cal0 = await page.evaluate(() => ({
    label: document.getElementById('cal-label').textContent,
    prevDisabled: document.getElementById('cal-prev').disabled,
    nextDisabled: document.getElementById('cal-next').disabled,
    rows: document.querySelectorAll('[data-calendar] .event-row').length,
  }));
  check('calendar opens on Juli 2026, prev disabled', cal0.label === 'Juli 2026' && cal0.prevDisabled && !cal0.nextDisabled && cal0.rows === 7, JSON.stringify(cal0));

  const cal2 = await page.evaluate(async () => {
    document.getElementById('cal-next').click();
    document.getElementById('cal-next').click();
    await new Promise(r => setTimeout(r, 100));
    return {
      label: document.getElementById('cal-label').textContent,
      nextDisabled: document.getElementById('cal-next').disabled,
      rows: document.querySelectorAll('[data-calendar] .event-row').length,
    };
  });
  check('calendar steps to September, next disabled at range end', cal2.label === 'September 2026' && cal2.nextDisabled && cal2.rows === 6, JSON.stringify(cal2));

  const sermonsEv = await page.evaluate(() => document.querySelectorAll('#predigten-carousel .carousel__item').length);
  check('events page sermon carousel rendered from JSON', sermonsEv === 6, 'items=' + sermonsEv);

  /* ---------- gemeindeleben: galleries ---------- */
  await page.goto(BASE + '/gemeindeleben/', { waitUntil: 'networkidle0' });
  const gal = await page.evaluate(async () => {
    const gallery = document.querySelector('[data-gallery]');
    const track = gallery.querySelector('.gallery__track');
    const before = track.scrollLeft;
    gallery.querySelector('[data-gallery-next]').click();
    await new Promise(r => setTimeout(r, 700));
    return { before, after: track.scrollLeft, galleries: document.querySelectorAll('[data-gallery]').length };
  });
  check('gallery slides on arrow click (2 galleries present)', gal.after > gal.before && gal.galleries === 2, JSON.stringify(gal));

  /* ---------- team page render ---------- */
  await page.goto(BASE + '/ueber-uns/', { waitUntil: 'networkidle0' });
  const team = await page.evaluate(() => ({
    cards: document.querySelectorAll('[data-ct="team"] .team-card').length,
    leadChips: document.querySelectorAll('[data-ct="team-lead"] .role-chip').length,
    names: [...document.querySelectorAll('.team-card__name')].map(n => n.textContent),
  }));
  check('team renders 9 unique cards + lead with 3 role chips',
    team.cards === 9 && team.leadChips === 3 && new Set(team.names).size === 9, JSON.stringify({ cards: team.cards, leadChips: team.leadChips }));

  /* ---------- mobile: burger menu ---------- */
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  const burger = await page.evaluate(async () => {
    document.getElementById('burger').click();
    await new Promise(r => setTimeout(r, 600));
    return {
      open: document.querySelector('.nav-panel').classList.contains('is-open'),
      locked: document.documentElement.classList.contains('menu-open'),
      digits: document.querySelectorAll('.nav-panel__num').length,
      links: document.querySelectorAll('.nav-panel__link').length,
    };
  });
  check('burger opens fullscreen menu, no digits, scroll locked',
    burger.open && burger.locked && burger.digits === 0 && burger.links === 6, JSON.stringify(burger));

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));
  const burgerClose = await page.evaluate(() => !document.documentElement.classList.contains('menu-open'));
  check('menu closes + unlocks on Escape', burgerClose);

  /* ---------- console noise ---------- */
  const realErrors = errors.filter(e => !/favicon/.test(e));
  check('no console errors/warnings across pages', realErrors.length === 0, realErrors.join(' | ').slice(0, 300));

  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
