/* Jesus Punkt — data layer · renders data-ct slots from mock JSON.
   Live ChurchTools swap: change the URL map below only. */
(function () {
  'use strict';

  /* Site root derived from this script's own URL — works at a domain root,
     under a project-page prefix (…github.io/<repo>/), and locally. */
  var BASE = new URL('..', document.currentScript.src).pathname;

  var URLS = {
    /* events are LIVE: fetched from the public ChurchTools calendars at deploy
       (tools/ct-events.py, daily cron in pages.yml); mock stays the fallback */
    events: BASE + 'data/ct/events.json',
    eventsFallback: BASE + 'data/mock/events.json',
    flyer: BASE + 'data/ct/flyer.json',
    flyerFallback: BASE + 'data/mock/flyer.json',
    /* sermons: fetched at deploy from the YouTube playlist (tools/yt-sermons.py,
       daily cron in pages.yml) once YT_API_KEY + YT_PLAYLIST_ID are set; mock stays the fallback */
    sermons: BASE + 'data/ct/sermons.json',
    sermonsFallback: BASE + 'data/mock/sermons.json',
    termine: BASE + 'data/content/termine.json', /* CMS-managed dates merged into the CT calendar */
    highlights: BASE + 'data/content/highlights.json', /* CMS-managed "Besondere Events" blocks */
    groups: BASE + 'data/content/hauskreise.json', /* CMS-managed incl. enabled-toggle */
    team: BASE + 'data/content/team.json', /* CMS-managed (photos need explicit consent — never from CT) */
    galerie: BASE + 'data/content/galerie.json', /* CMS-managed gallery photos (gemeindeleben) */
    ausfall: BASE + 'data/content/ausfall.json' /* a cancelled date: popup, flyer notice, calendar filter */
  };

  /* events are real now — use the real clock (kept overridable for demos) */
  var NOW = null;
  function now() { return NOW || new Date(); }

  /* page locale (set on <html lang> by the i18n build; German is the default) */
  var LANG = (document.documentElement.lang || 'de').slice(0, 2);
  var LOCALE = { de: 'de-DE', en: 'en-GB', uk: 'uk-UA' }[LANG] || 'de-DE';
  /* page links stay inside the current locale tree (/en/…, /uk/…) */
  var PAGE_BASE = BASE + (LANG === 'de' ? '' : LANG + '/');

  /* dynamic content we control: recurring event types + their standard meta lines.
     Custom German titles pass through untranslated — the events happen in German. */
  var I18N = {
    en: {
      badge: 'Save the date',
      empty: 'No events on the calendar this month — have a look at the next one.',
      titles: { 'Gottesdienst': 'Sunday service', 'Elevate Jugend': 'Elevate youth night', 'Gebet': 'Prayer', 'Hauskreis-Abend': 'Home group night' },
      metas: {
        'Kruseshofer Str. 20 · vor Ort und im Livestream': 'Kruseshofer Str. 20 · on site and via livestream',
        'Für Jugendliche zwischen 13 und 29 Jahren': 'For teens and young adults aged 13–29',
        'Gemeinsames Gebet · alle sind willkommen': 'Praying together · everyone is welcome',
        'In Wohnzimmern in ganz Neubrandenburg': 'In living rooms all over Neubrandenburg'
      },
      meetings: {
        'dienstags · 19:30': 'Tuesdays · 19:30',
        'mittwochs · 19:30': 'Wednesdays · 19:30',
        'donnerstags · 19:30': 'Thursdays · 19:30',
        'montags · 19:00': 'Mondays · 19:00',
        'freitags · 20:00': 'Fridays · 20:00'
      }
    },
    uk: {
      badge: 'Збережи дату',
      empty: 'У цьому місяці подій у календарі немає — загляньте в наступний.',
      titles: { 'Gottesdienst': 'Богослужіння', 'Elevate Jugend': 'Молодіжка Elevate', 'Gebet': 'Молитва', 'Hauskreis-Abend': 'Домашня група' },
      metas: {
        'Kruseshofer Str. 20 · vor Ort und im Livestream': 'Kruseshofer Str. 20 · наживо та в трансляції',
        'Für Jugendliche zwischen 13 und 29 Jahren': 'Для молоді від 13 до 29 років',
        'Gemeinsames Gebet · alle sind willkommen': 'Спільна молитва · запрошуємо всіх',
        'In Wohnzimmern in ganz Neubrandenburg': 'У домівках по всьому Нойбранденбургу'
      },
      meetings: {
        'dienstags · 19:30': 'щовівторка · 19:30',
        'mittwochs · 19:30': 'щосереди · 19:30',
        'donnerstags · 19:30': 'щочетверга · 19:30',
        'montags · 19:00': 'щопонеділка · 19:00',
        'freitags · 20:00': 'щопʼятниці · 20:00'
      }
    }
  };
  /* CMS-managed strings (Besondere Events, Termine von Hand) are German-first like
     the rest of the markup. On /en/ and /uk/ we look them up in the very dictionary
     the i18n build uses — an entry translates, no entry keeps German. Same contract
     as the static pages, no second place to maintain translations. */
  var DICT = null;
  function loadDict() {
    if (LANG === 'de') return Promise.resolve(null);
    return getJSON(BASE + 'data/i18n/' + LANG + '.json')
      .then(function (d) { DICT = d; return d; })
      .catch(function () { return null; }); /* German fallback, never a broken page */
  }
  function trText(str) {
    if (!DICT || !str) return str;
    return DICT[String(str).replace(/\s+/g, ' ').trim()] || str;
  }

  /* curated map first (the recurring ChurchTools events), then the page dictionary
     (free-text titles/metas from the CMS), then German */
  /* labels this file renders into markup (main.js keeps its own set for the nav) */
  var UI = ({
    de: { enlarge: ' — vergrößern', close: 'Hinweis schließen' },
    en: { enlarge: ' — enlarge', close: 'Close notice' },
    uk: { enlarge: ' — збільшити', close: 'Закрити повідомлення' }
  })[LANG] || { enlarge: ' — vergrößern', close: 'Hinweis schließen' };

  function trTitle(t) { return (I18N[LANG] && I18N[LANG].titles[t]) || trText(t); }
  function trMeta(m) { return (I18N[LANG] && I18N[LANG].metas[m]) || trText(m); }
  function trMeeting(m) { return (I18N[LANG] && I18N[LANG].meetings[m]) || m; }

  var WD = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });
  var DM = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' });
  var MY = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
  var TIME = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });

  function fmtWeekdayDate(d) {
    var wd = WD.format(d).replace('.', '');
    var dm = DM.format(d).replace(/\.$/, '');
    return wd + ' ' + dm; /* "So 12. Jul" */
  }
  function fmtTime(d) { return TIME.format(d); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function eventRowHTML(ev, highlight, href) {
    var d = new Date(ev.start);
    var inner =
      '<div class="event-row__when">' +
        '<div><span class="event-row__time">' + fmtTime(d) + '</span></div>' +
        '<div><span class="event-row__date">' + fmtWeekdayDate(d) + '</span></div>' +
      '</div>' +
      '<div class="event-row__body">' +
        '<div><h3 class="event-row__title">' + esc(trTitle(ev.title)) + '</h3></div>' +
        '<div><p class="event-row__meta">' + esc(trMeta(ev.meta)) + '</p></div>' +
      '</div>';
    var cls = 'event-row' + (highlight ? ' event-row--highlight' : '');
    return href
      ? '<li><a class="' + cls + '" href="' + href + '">' + inner + '</a></li>'
      : '<li><div class="' + cls + '">' + inner + '</div></li>';
  }

  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' → ' + r.status);
      return r.json();
    });
  }

  /* ---------- calendar: ChurchTools + the dates kept by hand in the CMS ----------
     Two jobs in one pass:
     1. ChurchTools serves the same Gottesdienst from two public calendars, so every
        Sunday arrives twice — identical (start, title) pairs collapse to one.
     2. data/content/termine.json adds events ChurchTools does not carry. A manual
        entry is DROPPED when ChurchTools already has that title on that day, so a
        date can never end up listed twice. */
  function sameTitle(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }
  function mergeEvents(ct, manual) {
    var out = [], seen = Object.create(null);
    ((ct && ct.events) || []).forEach(function (e) {
      var key = e.start + '|' + String(e.title).trim().toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(e);
    });
    ((manual && manual.events) || []).forEach(function (m, i) {
      if (!m || m.enabled === false || !m.date || !m.title) return;
      var clash = out.some(function (e) {
        return e.start.slice(0, 10) === m.date && sameTitle(e.title, m.title);
      });
      if (clash) return; /* ChurchTools wins — it is the calendar of record */
      out.push({
        id: 'cms-' + m.date + '-' + i,
        start: m.date + 'T' + (m.time || '00:00') + ':00',
        type: m.type || 'sonstiges',
        title: m.title,
        meta: m.meta || ''
      });
    });
    out.sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    return { events: out };
  }

  /* ---------- homepage: exactly 3 next events ---------- */
  function renderHomeEvents(data) {
    var slot = document.querySelector('[data-ct="events"]:not([data-calendar])');
    if (!slot) return;
    var upcoming = data.events
      .filter(function (e) { return new Date(e.start) >= now(); })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    var service = upcoming.filter(function (e) { return e.type === 'gottesdienst'; })[0];
    var others = upcoming.filter(function (e) { return e !== service && e.type !== 'gottesdienst'; }).slice(0, 2);
    if (!service && !others.length) return;
    var rows = [];
    if (service) rows.push(eventRowHTML(service, true, PAGE_BASE + 'events/'));
    others.forEach(function (e) { rows.push(eventRowHTML(e, false, PAGE_BASE + 'events/')); });
    slot.innerHTML = rows.join('');
  }

  /* ---------- events page: month slider + agenda ---------- */
  function initCalendar(data) {
    var slot = document.querySelector('[data-ct="events"][data-calendar]');
    var label = document.getElementById('cal-label');
    var prev = document.getElementById('cal-prev');
    var next = document.getElementById('cal-next');
    if (!slot || !label || !prev || !next) return;

    var events = data.events.slice().sort(function (a, b) {
      return new Date(a.start) - new Date(b.start);
    });
    if (!events.length) return;
    /* only the next upcoming event gets the accent — not every Gottesdienst */
    var nextEvent = events.filter(function (e) { return new Date(e.start) >= now(); })[0];
    function monthKey(d) { return d.getFullYear() * 12 + d.getMonth(); }
    var first = new Date(events[0].start);
    var last = new Date(events[events.length - 1].start);
    var minM = monthKey(first), maxM = monthKey(last);
    var cur = Math.min(Math.max(monthKey(now()), minM), maxM);

    function render() {
      var y = Math.floor(cur / 12), m = cur % 12;
      var lbl = MY.format(new Date(y, m, 1));
      label.textContent = lbl.charAt(0).toUpperCase() + lbl.slice(1); /* uk months come lowercase */
      prev.disabled = cur <= minM;
      next.disabled = cur >= maxM;
      var monthEvents = events.filter(function (e) {
        var d = new Date(e.start);
        return d.getFullYear() === y && d.getMonth() === m;
      });
      if (!monthEvents.length) {
        var msg = (I18N[LANG] && I18N[LANG].empty) || 'In diesem Monat stehen keine Termine im Kalender — schau gern im nächsten Monat vorbei.';
        slot.innerHTML = '<li><div class="calendar__empty"><p>' + msg + '</p></div></li>';
        return;
      }
      slot.innerHTML = monthEvents.map(function (e) {
        return eventRowHTML(e, e === nextEvent, null);
      }).join('');
    }
    prev.addEventListener('click', function () { if (cur > minM) { cur--; render(); } });
    next.addEventListener('click', function () { if (cur < maxM) { cur++; render(); } });
    render();
  }

  /* ---------- sermons (carousel tracks on any page) ---------- */
  function renderSermons(data) {
    document.querySelectorAll('[data-ct="sermons"]').forEach(function (track) {
      track.innerHTML = data.sermons.map(function (s) {
        return (
          '<li class="carousel__item">' +
            '<a class="card" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
              '<div class="card__media" aria-hidden="true">' +
                (s.thumb ? '<img src="' + esc(s.thumb) + '" alt="" loading="lazy">' : '') +
              '</div>' +
              '<div class="card__body">' +
                '<div><span class="card__date">' + esc(s.date) + '</span></div>' +
                '<div class="card__group">' +
                  '<div><h3 class="card__title">' + esc(s.title) + '</h3></div>' +
                  '<div><p class="card__meta">' + esc(s.speaker) + '</p></div>' +
                '</div>' +
              '</div>' +
            '</a>' +
          '</li>'
        );
      }).join('');
      if (window.JPCarousel) window.JPCarousel.refresh(track);
    });
  }

  /* ---------- flyer ---------- */
  function renderFlyer(data, ausfall) {
    if (ausfall) {
      var day = new Date(ausfall.date + 'T12:00:00');
      var when = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(day) + ', ' +
                 new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit' }).format(day);
      document.querySelectorAll('[data-ct="flyer"]').forEach(function (slot) {
        slot.classList.add('flyer-card--cancelled');
        slot.removeAttribute('aria-label'); /* the notice text itself is the label now */
        slot.innerHTML =
          '<div class="flyer-cancel">' +
            '<div><span class="flyer-cancel__date">' + esc(when.charAt(0).toUpperCase() + when.slice(1)) + '</span></div>' +
            '<div><p class="flyer-cancel__title">' + esc(trText(ausfall.title)) + '</p></div>' +
          '</div>';
      });
    } else if (data.url) {
      document.querySelectorAll('[data-ct="flyer"] img').forEach(function (img) {
        img.src = BASE + String(data.url).replace(/^\//, '');
        img.alt = data.alt;
      });
    }
    renderSpecialFlyers(data.special || []);
  }

  /* ---------- special flyers (long-notice events, "Flyer <Eventname>" in CT) ---------- */
  function renderSpecialFlyers(specials) {
    var badge = (I18N[LANG] && I18N[LANG].badge) || 'Vormerken';
    document.querySelectorAll('[data-ct="special-flyers"]').forEach(function (grid) {
      if (!specials.length) return;
      var onEventsPage = !!grid.closest('#besondere-events');
      grid.innerHTML = specials.map(function (s) {
        var img =
          '<span class="special-card__badge">' + esc(badge) + '</span>' +
          '<img src="' + BASE + esc(String(s.url).replace(/^\//, '')) + '" alt="' + esc(s.alt || s.title) + '" loading="lazy">';
        var label = '<div class="special-card__label-cover"><span class="special-card__label">' + esc(s.title) + '</span></div>';
        return onEventsPage
          ? '<article class="special-card"><div class="flyer-card flyer-card--adaptive">' + img + '</div>' + label + '</article>'
          : '<a class="special-card" href="' + PAGE_BASE + 'events/#besondere-events"><div class="flyer-card flyer-card--adaptive">' + img + '</div>' + label + '</a>';
      }).join('');
    });
    /* the sections (and their zig strips) ship hidden — one toggle for all */
    document.querySelectorAll('[data-ct-section="special-flyers"]').forEach(function (el) {
      el.hidden = !specials.length;
    });
  }

  /* ---------- Besondere Events: CMS blocks + ChurchTools specials ----------
     One block = an info column (marker-highlighted title + detail lines) beside a
     stack of flyers. Sides alternate per block (CSS nth-child); several flyers of
     one block slide over each other on scroll (CSS sticky) while the info column
     stays pinned. A ChurchTools "Flyer <Eventname>" special becomes a block with
     just a title and its one flyer, so that convention keeps working here. */
  function highlightBlocks(cms, specials) {
    var blocks = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    if (cms && cms.enabled !== false) {
      (cms.events || []).forEach(function (b) {
        if (!b || b.enabled === false) return;
        /* "until" lets a block retire itself — nobody has to remember to delete it */
        if (b.until && new Date(b.until + 'T23:59:59') < today) return;
        var flyers = (b.flyers || []).filter(function (f) { return f && f.image; });
        if (!b.title && !flyers.length) return;
        blocks.push({
          title: b.title || '',
          details: (b.details || []).filter(Boolean),
          link: b.link || '',
          linkLabel: b.link_label || '',
          flyers: flyers
        });
      });
    }
    (specials || []).forEach(function (sp) {
      if (!sp || !sp.url) return;
      blocks.push({
        title: sp.title || '',
        details: [],
        link: '',
        linkLabel: '',
        flyers: [{ image: sp.url, alt: sp.alt || sp.title }]
      });
    });
    return blocks;
  }

  function highlightHTML(b) {
    /* one gallery per block — every sheet is a button that opens it at its own index
       (js/main.js reads data-gallery/data-index; without JS the flyers simply stay
       pictures, which is the correct no-JS result) */
    var gallery = esc(JSON.stringify(b.flyers.map(function (f) {
      return { src: BASE + String(f.image).replace(/^\//, ''), alt: trText(f.alt || b.title) };
    })));
    var slides = b.flyers.map(function (f, n) {
      var alt = esc(trText(f.alt || b.title));
      return (
        '<div class="hl-event__slide" style="--i: ' + n + '">' +
          '<button type="button" class="flyer-card flyer-card--sheet"' +
            ' data-gallery="' + gallery + '" data-index="' + n + '"' +
            ' aria-label="' + alt + UI.enlarge + '">' +
            '<img src="' + esc(BASE + String(f.image).replace(/^\//, '')) + '"' +
              ' alt="' + alt + '" loading="lazy" decoding="async">' +
            /* always visible, never hover-only: on touch there is no hover to
               reveal that the flyer opens a gallery */
            '<span class="flyer-card__zoom" aria-hidden="true">' +
              '<svg width="15" height="15" viewBox="0 0 15 15" fill="none">' +
              '<circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.6"/>' +
              '<path d="M10.5 10.5 L14 14M6.5 4.3v4.4M4.3 6.5h4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
              '</svg>' +
            '</span>' +
          '</button>' +
        '</div>'
      );
    }).join('');
    var details = b.details.map(function (d) {
      return '<li class="hl-event__detail"><div><span>' + esc(trText(d)) + '</span></div></li>';
    }).join('');
    var external = /^https?:/i.test(b.link);
    var cta = b.link
      ? '<div class="hl-event__cta"><a class="textlink" href="' + esc(b.link) + '"' +
          (external ? ' target="_blank" rel="noopener"' : '') + '>' +
          esc(trText(b.linkLabel || b.link)) + ' <span class="textlink__arrow">\u2192</span></a></div>'
      : '';
    return (
      '<article class="hl-event">' +
        '<div class="hl-event__info"><div class="hl-event__sticky">' +
          (b.title
            ? '<div class="hl-event__title-cover"><h3 class="hl-event__title">' +
                '<span class="hl hl--wrap">' + esc(trText(b.title)) + '</span></h3></div>'
            : '') +
          (details ? '<ul class="hl-event__details">' + details + '</ul>' : '') +
          cta +
        '</div></div>' +
        '<div class="hl-event__media"><div class="hl-event__stack">' + slides + '</div></div>' +
      '</article>'
    );
  }

  function renderHighlights(cms, specials) {
    var list = document.querySelector('[data-ct="highlights"]');
    if (!list) return;
    var blocks = highlightBlocks(cms, specials);
    list.innerHTML = blocks.map(highlightHTML).join('');
    /* the section ships hidden — nothing to show means it stays that way */
    document.querySelectorAll('[data-ct-section="highlights"]').forEach(function (el) {
      el.hidden = !blocks.length;
    });
  }

  /* ---------- groups ---------- */
  function renderGroups(data) {
    /* the toggle runs BOTH ways: switching Hauskreise back on in the CMS has to
       un-hide the sections again, not just stop hiding them (the deploy bake does
       the same server-side; this covers local dev and stale deploys) */
    var on = data.enabled !== false && Array.isArray(data.groups) && data.groups.length > 0;
    document.querySelectorAll('[data-section-flag="hauskreise"]').forEach(function (el) {
      el.hidden = !on;
    });
    if (!on) return;
    document.querySelectorAll('[data-ct="groups"]').forEach(function (list) {
      var href = list.closest('#hauskreise') ? '#hauskreise' : PAGE_BASE + 'gemeindeleben/#hauskreise';
      list.innerHTML = data.groups.map(function (g) {
        return (
          '<li><a class="kg-row" href="' + href + '">' +
            '<div class="kg-row__info">' +
              '<div><h3 class="kg-row__name">' + esc(g.name) + '</h3></div>' +
              '<div><p class="kg-row__meta">' + esc(trMeeting(g.meeting)) + '</p></div>' +
            '</div>' +
            '<div class="kg-row__arrow" aria-hidden="true">' +
              '<svg width="62" height="12" viewBox="0 0 62 12" fill="none"><path d="M0 6h59.5M55 1.5 60.5 6 55 10.5" stroke="currentColor" stroke-width="2"/></svg>' +
            '</div>' +
          '</a></li>'
        );
      }).join('');
    });
  }

  /* ---------- team ---------- */
  function initials(name) {
    return name.split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
  }
  function photoHTML(person, extraClass) {
    return (
      '<div class="team-photo' + (extraClass ? ' ' + extraClass : '') + '">' +
        (person.photo
          ? '<img src="' + esc(BASE + String(person.photo).replace(/^\//, '')) + '" alt="' + esc(person.name) + '" loading="lazy">'
          : '<span class="team-photo__initials">' + initials(person.name) + '</span>') +
      '</div>'
    );
  }
  function chipsHTML(roles) {
    if (!roles || !roles.length) return '';
    return '<div class="role-chips">' + roles.map(function (r) {
      return '<span class="role-chip">' + esc(r) + '</span>';
    }).join('') + '</div>';
  }
  /* two groups, equal cards — a person's group (leitung | personal) is CMS-assigned */
  function renderTeam(data) {
    ['leitung', 'personal'].forEach(function (group) {
      var track = document.querySelector('[data-ct="team-' + group + '"]');
      if (!track) return;
      var people = data.people.filter(function (p) { return (p.group || 'personal') === group; });
      if (!people.length) return; /* keep the static fallback cards */
      track.innerHTML = people.map(function (p) {
        return (
          '<li><div class="team-card">' +
            photoHTML(p, null) +
            '<div class="team-card__body">' +
              '<div><span class="team-card__name">' + esc(p.name) + '</span></div>' +
              chipsHTML(p.roles) +
            '</div>' +
          '</div></li>'
        );
      }).join('');
    });
  }

  /* ---------- galleries (gemeindeleben, CMS-managed) ---------- */
  function renderGalleries(data) {
    Object.keys(data).forEach(function (key) {
      var track = document.querySelector('[data-ct="galerie-' + key + '"]');
      var images = data[key];
      if (!track || !Array.isArray(images) || !images.length) return; /* keep the static fallback */
      var items = images.map(function (img) {
        return '<div class="gallery__item"><img src="' + esc(img.image) + '" alt="' + esc(img.alt || '') + '" loading="lazy"></div>';
      });
      /* pad to four tiles with the design's alternating placeholders */
      for (var i = images.length; i < 4; i++) {
        var tint = (i - images.length) % 2 === 0 ? ' gallery__item--tint' : '';
        items.push('<div class="gallery__item' + tint + '" aria-hidden="true"></div>');
      }
      track.innerHTML = items.join('');
    });
  }

  /* ---------- cancelled date (data/content/ausfall.json) ----------
     Active from now until the end of that day, then it switches itself off.
     ChurchTools may still list the date, so the calendar filter lives here. */
  var ausfallP = null;
  function loadAusfall() {
    if (!ausfallP) {
      ausfallP = getJSON(URLS.ausfall).then(function (a) {
        if (!a || a.enabled === false || !/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) return null;
        var t = now();
        var today = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
        return today <= a.date ? a : null;
      }).catch(function () { return null; });
    }
    return ausfallP;
  }
  function dropCancelled(d, a) {
    if (!a) return d;
    return { events: d.events.filter(function (e) {
      return !(e.start.slice(0, 10) === a.date && (!a.type || e.type === a.type));
    }) };
  }

  /* popup on entry — on every page load while the date is active */
  function showAusfallPopup(a) {
    var opener = document.activeElement;
    var box = document.createElement('div');
    box.className = 'notice';
    box.innerHTML =
      '<div class="notice__backdrop"></div>' +
      '<div class="notice__dialog" role="alertdialog" aria-modal="true" aria-labelledby="notice-h" aria-describedby="notice-p" tabindex="-1">' +
        '<button type="button" class="notice__close" aria-label="' + esc(UI.close) + '">' +
          '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
          '<path d="M1 1l16 16M17 1L1 17" stroke="currentColor" stroke-width="1.6"/></svg>' +
        '</button>' +
        '<div><h2 class="h2 notice__title" id="notice-h">' + esc(trText(a.title)) + '</h2></div>' +
        '<div><p class="notice__text" id="notice-p">' + esc(trText(a.text)) + '</p></div>' +
        '<div class="notice__actions"><button type="button" class="btn btn--primary btn--lg notice__ok">' + esc(trText(a.button || 'Verstanden')) + '</button></div>' +
      '</div>';
    document.body.appendChild(box);
    document.documentElement.classList.add('lightbox-open'); /* the sanctioned overlay scroll lock */
    var dialog = box.querySelector('.notice__dialog');
    dialog.focus();

    function close() {
      box.remove();
      document.documentElement.classList.remove('lightbox-open');
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus) opener.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') {
        var f = box.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    box.querySelector('.notice__backdrop').addEventListener('click', close);
    box.querySelector('.notice__close').addEventListener('click', close);
    box.querySelector('.notice__ok').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
  }

  /* ---------- boot: fetch only what the page needs ---------- */
  function boot() {
    Promise.all([loadAusfall(), loadDict()]).then(function (res) {
      if (res[0]) showAusfallPopup(res[0]);
    });
    if (document.querySelector('[data-ct="events"]')) {
      Promise.all([
        getJSON(URLS.events).catch(function () { return getJSON(URLS.eventsFallback); }),
        /* dates kept by hand are optional — a missing file is not an error */
        getJSON(URLS.termine).catch(function () { return { events: [] }; }),
        loadAusfall(),
        loadDict()
      ]).then(function (res) {
        var d = dropCancelled(mergeEvents(res[0], res[1]), res[2]);
        renderHomeEvents(d);
        initCalendar(d);
      }).catch(function (e) { console.warn('[data] events:', e.message); });
    }
    /* flyer feed serves two slots: the weekly flyer card and the ChurchTools
       specials that join the Besondere-Events blocks — fetch it once for both */
    var wantsFlyer = !!document.querySelector('[data-ct="flyer"], [data-ct="special-flyers"]');
    var wantsHighlights = !!document.querySelector('[data-ct="highlights"]');
    if (wantsFlyer || wantsHighlights) {
      Promise.all([
        getJSON(URLS.flyer)
          .catch(function () { return getJSON(URLS.flyerFallback); })
          .catch(function () { return {}; }),
        wantsHighlights ? getJSON(URLS.highlights).catch(function () { return {}; })
                        : Promise.resolve({}),
        loadAusfall(),
        loadDict()
      ]).then(function (res) {
        if (wantsFlyer) renderFlyer(res[0], res[2]);
        if (wantsHighlights) renderHighlights(res[1], res[0].special || []);
      }).catch(function (e) { console.warn('[data] flyer/highlights:', e.message); });
    }
    if (document.querySelector('[data-ct="sermons"]')) {
      getJSON(URLS.sermons)
        .catch(function () { return getJSON(URLS.sermonsFallback); })
        .then(renderSermons)
        .catch(function (e) { console.warn('[data] sermons:', e.message); });
    }
    if (document.querySelector('[data-ct="groups"]')) {
      getJSON(URLS.groups).then(renderGroups).catch(function (e) { console.warn('[data] groups:', e.message); });
    }
    if (document.querySelector('[data-ct="team-leitung"], [data-ct="team-personal"]')) {
      getJSON(URLS.team).then(renderTeam).catch(function (e) { console.warn('[data] team:', e.message); });
    }
    if (document.querySelector('[data-ct^="galerie-"]')) {
      getJSON(URLS.galerie).then(renderGalleries).catch(function (e) { console.warn('[data] galerie:', e.message); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
