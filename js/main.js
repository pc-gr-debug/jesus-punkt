/* Jesus Punkt — header, fullscreen nav, sermon carousel · no dependencies */
(function () {
  'use strict';

  /* page locale (set on <html lang> by the i18n build; German is the default) */
  var LANG = (document.documentElement.lang || 'de').slice(0, 2);
  var UI_I18N = {
    de: { open: 'Menü öffnen', close: 'Menü schließen', show: ' anzeigen',
          lbLabel: 'Flyer-Galerie', lbClose: 'Galerie schließen', lbPrev: 'Vorheriger Flyer', lbNext: 'Nächster Flyer' },
    en: { open: 'Open menu', close: 'Close menu', show: ' — show',
          lbLabel: 'Flyer gallery', lbClose: 'Close gallery', lbPrev: 'Previous flyer', lbNext: 'Next flyer' },
    uk: { open: 'Відкрити меню', close: 'Закрити меню', show: ' — показати',
          lbLabel: 'Галерея флаєрів', lbClose: 'Закрити галерею', lbPrev: 'Попередній флаєр', lbNext: 'Наступний флаєр' }
  };
  var UI = UI_I18N[LANG] || UI_I18N.de;

  /* ---------- Stable viewport-height unit ----------
     Safari's dvh/svh/vh all update the moment the toolbar animates, so any
     rule (or JS measurement) reading them mid-scroll jumps or desyncs from a
     sibling rule reading a different flavor. Freeze one pixel value in a
     --vh custom property instead, refreshed only on a real viewport change
     (width moves = rotation, not the chrome bar), and drive every
     full-height rule + the Werte scroll math from that single source. */
  var vhPx = window.innerHeight;
  function setVH() {
    vhPx = window.innerHeight;
    /* --vh = 1% of the viewport, so CSS's calc(var(--vh) * 100) reconstructs
       the full height — vhPx itself stays the full px figure for JS math */
    document.documentElement.style.setProperty('--vh', (vhPx * 0.01) + 'px');
  }
  setVH();
  (function () {
    var vw0 = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth !== vw0) {
        vw0 = window.innerWidth;
        setVH();
      }
    });
  })();

  /* ---------- Fixed header: solid once scrolled ---------- */
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Nav pill: sliding hover highlight ---------- */
  var pill = document.querySelector('.nav-pill');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (pill && !reduceMotion.matches) {
    var glider = document.createElement('span');
    glider.className = 'nav-pill__glider';
    glider.setAttribute('aria-hidden', 'true');
    pill.prepend(glider);

    var moveTo = function (link) {
      glider.style.left = link.offsetLeft + 'px';
      glider.style.width = link.offsetWidth + 'px';
    };
    var show = function (link) {
      if (!pill.classList.contains('has-glider')) {
        /* first entry: appear in place, no slide-in from 0 */
        glider.style.transition = 'none';
        moveTo(link);
        void glider.offsetWidth; /* flush so the next transition animates */
        glider.style.transition = '';
        pill.classList.add('has-glider');
      } else {
        moveTo(link);
      }
    };
    var hide = function () { pill.classList.remove('has-glider'); };

    pill.querySelectorAll('.nav-pill__link').forEach(function (link) {
      link.addEventListener('mouseenter', function () { show(link); });
      link.addEventListener('focus', function () { show(link); });
      link.addEventListener('blur', hide);
    });
    /* the language button glides like any other pill item — the glider targets
       its wrapper (a direct pill child), so offsetLeft is pill-relative */
    var langGlide = pill.querySelector('.nav-pill__lang');
    if (langGlide) {
      var langGlideBtn = langGlide.querySelector('.nav-pill__lang-btn');
      langGlideBtn.addEventListener('mouseenter', function () { show(langGlide); });
      langGlideBtn.addEventListener('focus', function () { show(langGlide); });
      langGlideBtn.addEventListener('blur', hide);
    }
    pill.addEventListener('mouseleave', hide);
  }

  /* ---------- Language dropdown in the nav pill ---------- */
  var langWrap = document.querySelector('.nav-pill__lang');
  if (langWrap) {
    var langBtn = langWrap.querySelector('.nav-pill__lang-btn');
    var langCode = langWrap.querySelector('.nav-pill__lang-code');
    if (langCode) langCode.textContent = LANG.toUpperCase();

    var setLangOpen = function (open) {
      langWrap.classList.toggle('is-open', open);
      langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    langBtn.addEventListener('click', function () {
      setLangOpen(!langWrap.classList.contains('is-open'));
    });
    langWrap.addEventListener('mouseenter', function () { setLangOpen(true); });
    langWrap.addEventListener('mouseleave', function () { setLangOpen(false); });
    document.addEventListener('click', function (e) {
      if (!langWrap.contains(e.target)) setLangOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setLangOpen(false);
    });
  }

  /* ---------- Appearance reveals (scroll-triggered, once) ---------- */
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    var revealTargets = document.querySelectorAll([
      '.section-head',
      '.hero__copy > div',
      '.hero__actions',
      '.page-hero__inner > div',
      /* dynamic slots reveal as blocks — data.js replaces their children. Two are
         excluded: the carousel track (its transform belongs to the carousel) and the
         Besondere-Events list, whose reveal transform would become the containing
         block for the sticky info column and flyer stack inside it. */
      '[data-ct]:not(.carousel__track):not(.highlights__list)',
      '.carousel',                       /* the track itself is owned by the carousel's inline transform */
      '.sermons__foot',
      '.groups__copy > div',
      '.highlights__head', /* Besondere Events: the blocks themselves must stay transform-free */
      '.info-card',
      '.card'
    ].join(', '));
    var revealDone = function (el) {
      el.classList.remove('reveal', 'is-in');
      el.style.removeProperty('--rv-d');
    };
    var io = new IntersectionObserver(function (entries) {
      var batches = []; /* siblings entering together stagger by parent */
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        var batch = null;
        for (var i = 0; i < batches.length; i++) {
          if (batches[i].parent === el.parentElement) batch = batches[i];
        }
        if (!batch) { batch = { parent: el.parentElement, n: 0 }; batches.push(batch); }
        var delay = batch.n++ * 70;
        el.style.setProperty('--rv-d', delay + 'ms');
        el.classList.add('is-in');
        setTimeout(function () { revealDone(el); }, delay + 700);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealTargets.forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* ---------- Werte wheel (pinned scroll section) ---------- */
  var werte = document.querySelector('.werte');
  if (werte && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var wheel = werte.querySelector('.wheel');
    var items = wheel ? Array.prototype.slice.call(wheel.querySelectorAll('.wheel__item')) : [];
    var panel = werte.querySelector('.werte__panel');
    var LINES_I18N = {
      de: [
        'Wir leben, was wir sagen.',
        'Wir sind am Puls der Zeit.',
        'Wir geben Gott unser Bestes, nachdem er sein Bestes für uns gegeben hat.',
        'Wir schaffen eine liebevolle „Welcome Home“-Atmosphäre.',
        'Die Freude an Gott ist unsere Stärke.',
        'Wir segnen, weil wir gesegnet sind.',
        'Wir lieben Menschen.'
      ],
      en: [
        'We live what we say.',
        'We keep our finger on the pulse of the times.',
        'We give God our best — after he gave his best for us.',
        'We create a loving “Welcome Home” atmosphere.',
        'The joy of the Lord is our strength.',
        'We bless because we are blessed.',
        'We love people.'
      ],
      uk: [
        'Ми живемо тим, що говоримо.',
        'Ми тримаємо руку на пульсі часу.',
        'Ми віддаємо Богові найкраще — адже Він віддав найкраще за нас.',
        'Ми створюємо атмосферу любові «Welcome Home».',
        'Радість у Господі — наша сила.',
        'Ми благословляємо, бо самі благословенні.',
        'Ми любимо людей.'
      ]
    };
    /* CMS-baked lines (deploy injects #werte-lines from data/content/werte.json) win
       over the built-in copy — local dev without the bake keeps working */
    var linesEl = document.getElementById('werte-lines');
    if (linesEl) {
      try { LINES_I18N = JSON.parse(linesEl.textContent); } catch (e) { /* keep built-in */ }
    }
    var LINES = LINES_I18N[LANG] || LINES_I18N.de;
    if (wheel && items.length === 7 && panel) {
      var numEl = panel.querySelector('.werte__panel-num');
      var nameEl = panel.querySelector('.werte__panel-name');
      var lineEl = panel.querySelector('.werte__panel-line p');
      var active = -1;
      var switchTimer;

      var applyPanel = function (idx) {
        numEl.textContent = '0' + (idx + 1);
        nameEl.textContent = items[idx].querySelector('.bubble__name').textContent;
        lineEl.textContent = LINES[idx];
      };

      /* phone close-ranks: the active bubble sits in the centre, the other six
         re-space to 60° so the ring stays complete (next value straight above).
         Angles are tracked unwrapped so every morph takes the shortest path. */
      var mqPhone = window.matchMedia('(max-width: 48rem)');
      var curAngles = items.map(function (_, i) { return i * 51.4286; });
      var applyAngles = function (idx) {
        items.forEach(function (it, i) {
          if (!mqPhone.matches) {
            it.style.removeProperty('--angle'); /* back to the CSS calc(--i * 51.4286deg) */
            curAngles[i] = i * 51.4286;
            return;
          }
          var k = (i - idx + 7) % 7;
          if (k === 0) return; /* active: centred via translateY(0), angle irrelevant */
          /* target = visual slot (k-1)·60° compensated for the current ring turn */
          var delta = ((k - 1) * 60 + idx * 51.4286 - curAngles[i]) % 360;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          curAngles[i] += delta;
          it.style.setProperty('--angle', curAngles[i] + 'deg');
        });
      };
      mqPhone.addEventListener('change', function () { if (active >= 0) applyAngles(active); });

      var setActive = function (idx) {
        if (idx === active) return;
        var isInit = active === -1;
        active = idx;
        wheel.style.setProperty('--wheel-turn', (-idx * 51.4286) + 'deg');
        items.forEach(function (it, i) {
          var dist = Math.min(Math.abs(i - idx), 7 - Math.abs(i - idx));
          it.style.setProperty('--d', dist); /* ring distance drives the ripple + falloff */
          it.classList.toggle('is-active', i === idx);
        });
        applyAngles(idx);
        if (isInit) { applyPanel(idx); return; } /* no crossfade dip on page load */
        panel.classList.add('is-switching');
        clearTimeout(switchTimer);
        switchTimer = setTimeout(function () {
          applyPanel(idx);
          panel.classList.remove('is-switching');
        }, 180);
      };

      /* uses the shared, frozen vhPx (set up above) so the runway math always
         agrees with the --vh value .werte's own CSS height is built from —
         no separate cache, no chance of the two drifting apart */
      var onWerteScroll = function () {
        var rect = werte.getBoundingClientRect();
        var runway = rect.height - vhPx;
        if (runway <= 0) { setActive(0); return; }
        var progress = Math.min(1, Math.max(0, -rect.top / runway));
        setActive(Math.min(6, Math.floor(progress * 7)));
      };
      window.addEventListener('scroll', onWerteScroll, { passive: true });
      onWerteScroll();

      /* tap a value to bring it into focus: jump the pinned scroll position
         into that value's segment — invisible while pinned, only the wheel turns */
      items.forEach(function (it, i) {
        it.setAttribute('role', 'button');
        it.setAttribute('tabindex', '0');
        it.setAttribute('aria-label', it.querySelector('.bubble__name').textContent + UI.show);
        var focusValue = function () {
          var rect = werte.getBoundingClientRect();
          var runway = rect.height - vhPx;
          if (runway <= 0) return;
          var top = rect.top + window.scrollY;
          window.scrollTo({ top: top + runway * ((i + 0.5) / 7), behavior: 'instant' });
        };
        it.addEventListener('click', focusValue);
        it.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusValue(); }
        });
      });
    }
  }

  /* ---------- Fullscreen slide-down navigation ---------- */
  var burger = document.getElementById('burger');
  var panel = document.getElementById('nav-panel');

  function setNav(open) {
    panel.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? UI.close : UI.open);
  }

  if (burger && panel) {
    burger.addEventListener('click', function () {
      setNav(!panel.classList.contains('is-open'));
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        setNav(false);
        burger.focus();
      }
    });
  }

  /* ---------- Flyer gallery (lightbox) ----------
     Any [data-gallery] button opens the flyers of its own block at its own index.
     The markup is built once, on demand, and reused. */
  (function () {
    var box = null, imgEl, countEl, prevBtn, nextBtn, dialog;
    var shots = [], at = 0, opener = null;

    function build() {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.hidden = true;
      box.innerHTML =
        '<div class="lightbox__backdrop"></div>' +
        /* the cross lives on the overlay, not inside the dialog, so it always sits
           in the screen corner and never lands on top of the flyer */
        '<button type="button" class="lightbox__close" aria-label="' + UI.lbClose + '">' +
          '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
          '<path d="M1 1l16 16M17 1L1 17" stroke="currentColor" stroke-width="1.6"/></svg>' +
        '</button>' +
        '<div class="lightbox__dialog" role="dialog" aria-modal="true" aria-label="' + UI.lbLabel + '" tabindex="-1">' +
          '<figure class="lightbox__figure"><img alt=""></figure>' +
          '<div class="lightbox__bar">' +
            '<button type="button" class="lightbox__btn lightbox__btn--prev" aria-label="' + UI.lbPrev + '">' +
              '<svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">' +
              '<path d="M9 2 L2 10 L9 18" stroke="currentColor" stroke-width="1.5"/></svg>' +
            '</button>' +
            '<span class="lightbox__counter" aria-live="polite"></span>' +
            '<button type="button" class="lightbox__btn lightbox__btn--next" aria-label="' + UI.lbNext + '">' +
              '<svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">' +
              '<path d="M2 2 L9 10 L2 18" stroke="currentColor" stroke-width="1.5"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(box);
      dialog = box.querySelector('.lightbox__dialog');
      imgEl = box.querySelector('.lightbox__figure img');
      countEl = box.querySelector('.lightbox__counter');
      prevBtn = box.querySelector('.lightbox__btn--prev');
      nextBtn = box.querySelector('.lightbox__btn--next');

      box.querySelector('.lightbox__backdrop').addEventListener('click', close);
      box.querySelector('.lightbox__close').addEventListener('click', close);
      prevBtn.addEventListener('click', function () { go(at - 1); });
      nextBtn.addEventListener('click', function () { go(at + 1); });

      /* swipe left/right on touch — the primary device for this site */
      var x0 = null, y0 = null;
      box.addEventListener('touchstart', function (e) {
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        var dy = e.changedTouches[0].clientY - y0;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(at + (dx < 0 ? 1 : -1));
        x0 = y0 = null;
      }, { passive: true });
    }

    /* Bildwechsel: erst das neue Bild laden, dann tauschen und in Laufrichtung
       einfliegen lassen — sonst steht für einen Moment ein leerer Rahmen da.
       `seq` verwirft Ladevorgänge, die ein schnellerer Wisch überholt hat. */
    var seq = 0;
    function go(i, animate) {
      if (i < 0 || i >= shots.length) return;
      var dir = i > at ? 1 : (i < at ? -1 : 0);
      at = i;
      countEl.textContent = (i + 1) + ' / ' + shots.length;
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === shots.length - 1;

      var token = ++seq, done = false;
      var show = function () {
        if (done || token !== seq) return;
        done = true;
        imgEl.src = shots[i].src;
        imgEl.alt = shots[i].alt || '';
        if (animate === false || !dir || reduceMotion.matches) return;
        imgEl.classList.remove('is-next', 'is-prev');
        void imgEl.offsetWidth; /* Reflow erzwingen, sonst startet die Animation nicht neu */
        imgEl.classList.add(dir > 0 ? 'is-next' : 'is-prev');
      };
      var pre = new Image();
      pre.onload = pre.onerror = show;
      pre.src = shots[i].src;
      if (pre.complete) show(); /* schon im Cache — kein Warten */
    }

    function open(list, i, from) {
      if (!box) build();
      shots = list;
      opener = from;
      box.dataset.single = shots.length < 2 ? 'true' : 'false';
      box.hidden = false;
      document.documentElement.classList.add('lightbox-open');
      go(i, false);
      /* focus the dialog, not a button: keeps the keyboard inside the overlay
         without lighting up a focus ring the moment it opens */
      dialog.focus();
    }

    function close() {
      if (!box || box.hidden) return;
      box.hidden = true;
      document.documentElement.classList.remove('lightbox-open');
      if (opener) opener.focus();
      opener = null;
    }

    /* delegated: the blocks are rendered by js/data.js after this runs */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-gallery]');
      if (!btn) return;
      var list;
      try { list = JSON.parse(btn.getAttribute('data-gallery')); } catch (err) { return; }
      if (!list || !list.length) return;
      e.preventDefault();
      open(list, Number(btn.getAttribute('data-index')) || 0, btn);
    });

    document.addEventListener('keydown', function (e) {
      if (!box || box.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
      else if (e.key === 'Tab') {
        /* keep focus inside the dialog while it is open */
        var f = [].slice.call(box.querySelectorAll('button:not([disabled])'))
          .filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  })();

  /* ---------- Besondere Events: vertical carousel scaling ----------
     While the next flyer slides up over the current one, the covered sheet shrinks
     and the incoming one grows back to full size. Scroll-driven in JS rather than
     with animation-timeline, so Safari behaves like every other effect here.

     The geometry is derived from layout values only (offsetHeight + the computed
     margin/top), never from getBoundingClientRect of the slides themselves — those
     already carry the scale we are about to set, which would feed back on itself.
     The transform sits on .hl-event__slide, the sticky element itself: that is safe,
     only a transform on an ANCESTOR would break sticky. */
  if (!reduceMotion.matches) {
    var MIN_SCALE = 0.88;
    var stacks = [];

    var collectStacks = function () {
      stacks = [].slice.call(document.querySelectorAll('.hl-event__stack'))
        .map(function (el) {
          return { el: el, slides: [].slice.call(el.querySelectorAll('.hl-event__slide')) };
        })
        .filter(function (st) { return st.slides.length > 1; });
    };

    var applyScales = function () {
      for (var s = 0; s < stacks.length; s++) {
        var st = stacks[s];
        var box = st.el.getBoundingClientRect(); /* the stack has no transform of its own */
        if (box.bottom < 0 || box.top > vhPx) continue; /* off-screen: nothing to update */

        var n = st.slides.length;
        var heights = [], tops = [], offset = 0;
        for (var i = 0; i < n; i++) {
          var slide = st.slides[i];
          var cs = getComputedStyle(slide);
          if (i > 0) offset += parseFloat(cs.marginTop) || 0; /* the dwell gap */
          var h = slide.offsetHeight || 1;
          var pin = parseFloat(cs.top) || 0;               /* resolved max()/calc() in px */
          var natural = box.top + offset;
          /* sticky: held at the pin once it would scroll past it, and never pushed
             beyond the bottom of its containing block */
          tops.push(Math.min(Math.max(natural, pin), box.bottom - h));
          heights.push(h);
          offset += h;
        }

        for (var j = 0; j < n; j++) {
          /* how far the successor has advanced across this sheet: 0 = still fully
             below it, 1 = exactly on top of it */
          var out = j < n - 1
            ? (tops[j] + heights[j] - tops[j + 1]) / heights[j]
            : 0;
          var into = j === 0
            ? 1  /* the first sheet starts at full size */
            : (tops[j - 1] + heights[j - 1] - tops[j]) / heights[j - 1];
          out = out < 0 ? 0 : (out > 1 ? 1 : out);
          into = into < 0 ? 0 : (into > 1 ? 1 : into);
          var scale = MIN_SCALE + (1 - MIN_SCALE) * (into - out);
          if (scale > 1) scale = 1;
          if (scale < MIN_SCALE) scale = MIN_SCALE;
          st.slides[j].style.setProperty('--s', scale.toFixed(4));
        }
      }
    };

    var ticking = false;
    var onHlScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { applyScales(); ticking = false; });
    };
    window.addEventListener('scroll', onHlScroll, { passive: true });
    window.addEventListener('resize', onHlScroll);
    /* js/data.js renders the blocks after this file runs — pick them up when they land */
    var hlList = document.querySelector('.highlights__list');
    if (hlList) {
      new MutationObserver(function () { collectStacks(); applyScales(); })
        .observe(hlList, { childList: true });
    }
    collectStacks();
    applyScales();
  }

  /* ---------- Carousels (full-bleed) — one init per .carousel[id] ---------- */
  function setupCarousel(carousel) {
    var track = carousel.querySelector('.carousel__track');
    var prevBtn = document.querySelector('[data-carousel-prev="' + carousel.id + '"]');
    var nextBtn = document.querySelector('[data-carousel-next="' + carousel.id + '"]');
    if (!track || !prevBtn || !nextBtn) return;
    var index = 0;

    function metrics() {
      var items = track.children;
      if (!items.length) return null;
      var itemW = items[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      // the track box equals the container width — overflow bleeds to the screen edge
      var usable = track.getBoundingClientRect().width;
      var perView = Math.max(1, Math.round((usable + gap) / (itemW + gap)));
      return { step: itemW + gap, max: Math.max(0, items.length - perView) };
    }

    function render() {
      var m = metrics();
      if (!m) return;
      index = Math.min(index, m.max);
      track.style.transform = 'translateX(' + (-index * m.step) + 'px)';
      prevBtn.disabled = index <= 0;
      nextBtn.disabled = index >= m.max;
    }

    prevBtn.addEventListener('click', function () { index = Math.max(0, index - 1); render(); });
    nextBtn.addEventListener('click', function () {
      var m = metrics();
      if (m) { index = Math.min(m.max, index + 1); render(); }
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 120);
    });

    carousel._render = render;
    render();
  }
  document.querySelectorAll('.carousel[id]').forEach(setupCarousel);
  window.JPCarousel = {
    refresh: function (track) {
      var c = track.closest('.carousel');
      if (c && c._render) c._render();
    }
  };

  /* ---------- custom form select (Thema, kontakt form) ---------- */
  (function () {
    var wrapper = document.getElementById('thema-select');
    if (!wrapper) return;

    var trigger = wrapper.querySelector('.form-select__trigger');
    var menu    = wrapper.querySelector('.form-select__menu');
    var valueEl = wrapper.querySelector('.form-select__value');
    var hidden  = wrapper.querySelector('input[type="hidden"]');
    var options = wrapper.querySelectorAll('.form-select__option');
    var placeholder = valueEl.textContent; /* captured before any preselect — stays translated */

    function open() {
      menu.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function close() {
      menu.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    function select(opt) {
      options.forEach(function (o) { o.removeAttribute('aria-selected'); });
      opt.setAttribute('aria-selected', 'true');
      valueEl.textContent = opt.textContent;
      valueEl.classList.remove('form-select__value--placeholder');
      /* the mail shows the label, not the slug */
      hidden.value = opt.textContent;
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.contains('open') ? close() : open();
    });
    options.forEach(function (opt) {
      opt.addEventListener('click', function () { select(opt); close(); });
    });
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    /* deep link from the Angebote cards: /kontakt/?thema=hochzeit */
    var thema = new URLSearchParams(location.search).get('thema');
    if (thema) {
      options.forEach(function (opt) {
        if (opt.getAttribute('data-value') === thema) select(opt);
      });
    }

    /* contact.js calls this after a successful send — form.reset() can't restore the widget */
    wrapper._reset = function () {
      options.forEach(function (o) { o.removeAttribute('aria-selected'); });
      valueEl.textContent = placeholder;
      valueEl.classList.add('form-select__value--placeholder');
      hidden.value = '';
      close();
    };
  })();

  /* ---------- Galleries (scroll-snap sliders) ---------- */
  document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
    var track = gallery.querySelector('.gallery__track');
    var prev = gallery.querySelector('[data-gallery-prev]');
    var next = gallery.querySelector('[data-gallery-next]');
    if (!track || !prev || !next) return;
    var behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    function step() {
      var item = track.firstElementChild;
      if (!item) return 0;
      return item.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: behavior }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: behavior }); });
    /* arrows only when there is something to scroll to (re-check on resize + data.js re-render) */
    function updateNav() {
      gallery.classList.toggle('gallery--no-scroll', track.scrollWidth - track.clientWidth <= 1);
    }
    updateNav();
    window.addEventListener('resize', updateNav);
    new MutationObserver(updateNav).observe(track, { childList: true });
  });
})();
