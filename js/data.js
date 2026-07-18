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
    groups: BASE + 'data/content/hauskreise.json', /* CMS-managed incl. enabled-toggle */
    team: BASE + 'data/content/team.json', /* CMS-managed (photos need explicit consent — never from CT) */
    galerie: BASE + 'data/content/galerie.json' /* CMS-managed gallery photos (gemeindeleben) */
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
  function trTitle(t) { return (I18N[LANG] && I18N[LANG].titles[t]) || t; }
  function trMeta(m) { return (I18N[LANG] && I18N[LANG].metas[m]) || m; }
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
  function renderFlyer(data) {
    if (data.url) {
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

  /* ---------- groups ---------- */
  function renderGroups(data) {
    if (data.enabled === false) {
      /* no Hauskreise right now: hide the flagged sections (deploy bake does the
         same server-side; this covers local dev and stale deploys) */
      document.querySelectorAll('[data-section-flag="hauskreise"]').forEach(function (el) {
        el.hidden = true;
      });
      return;
    }
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

  /* ---------- boot: fetch only what the page needs ---------- */
  function boot() {
    if (document.querySelector('[data-ct="events"]')) {
      getJSON(URLS.events)
        .catch(function () { return getJSON(URLS.eventsFallback); })
        .then(function (d) {
          renderHomeEvents(d);
          initCalendar(d);
        }).catch(function (e) { console.warn('[data] events:', e.message); });
    }
    if (document.querySelector('[data-ct="flyer"]')) {
      getJSON(URLS.flyer)
        .catch(function () { return getJSON(URLS.flyerFallback); })
        .then(renderFlyer).catch(function (e) { console.warn('[data] flyer:', e.message); });
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
