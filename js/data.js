/* Jesus Punkt — data layer · renders data-ct slots from mock JSON.
   Live ChurchTools swap: change the URL map below only. */
(function () {
  'use strict';

  /* Site root derived from this script's own URL — works at a domain root,
     under a project-page prefix (…github.io/<repo>/), and locally. */
  var BASE = new URL('..', document.currentScript.src).pathname;

  var URLS = {
    events: BASE + 'data/mock/events.json',
    flyer: BASE + 'data/mock/flyer.json',
    sermons: BASE + 'data/mock/sermons.json',
    groups: BASE + 'data/mock/groups.json',
    team: BASE + 'data/mock/team.json'
  };

  /* "now" for mock data — keeps the demo deterministic while the JSON is static.
     Set to null to use the real clock once live data is wired up. */
  var NOW = new Date('2026-07-06T12:00:00');
  function now() { return NOW || new Date(); }

  var WD = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
  var DM = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' });
  var MY = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
  var TIME = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

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
        '<div><h3 class="event-row__title">' + esc(ev.title) + '</h3></div>' +
        '<div><p class="event-row__meta">' + esc(ev.meta) + '</p></div>' +
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
    if (service) rows.push(eventRowHTML(service, true, BASE + 'events/'));
    others.forEach(function (e) { rows.push(eventRowHTML(e, false, BASE + 'events/')); });
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
    function monthKey(d) { return d.getFullYear() * 12 + d.getMonth(); }
    var first = new Date(events[0].start);
    var last = new Date(events[events.length - 1].start);
    var minM = monthKey(first), maxM = monthKey(last);
    var cur = Math.min(Math.max(monthKey(now()), minM), maxM);

    function render() {
      var y = Math.floor(cur / 12), m = cur % 12;
      label.textContent = MY.format(new Date(y, m, 1));
      prev.disabled = cur <= minM;
      next.disabled = cur >= maxM;
      var monthEvents = events.filter(function (e) {
        var d = new Date(e.start);
        return d.getFullYear() === y && d.getMonth() === m;
      });
      if (!monthEvents.length) {
        slot.innerHTML = '<li><div class="calendar__empty"><p>In diesem Monat stehen keine Termine im Kalender — schau gern im nächsten Monat vorbei.</p></div></li>';
        return;
      }
      slot.innerHTML = monthEvents.map(function (e) {
        return eventRowHTML(e, e.type === 'gottesdienst', null);
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
    document.querySelectorAll('[data-ct="flyer"] img').forEach(function (img) {
      img.src = BASE + String(data.url).replace(/^\//, '');
      img.alt = data.alt;
    });
  }

  /* ---------- groups ---------- */
  function renderGroups(data) {
    document.querySelectorAll('[data-ct="groups"]').forEach(function (list) {
      var href = list.closest('#hauskreise') ? '#hauskreise' : BASE + 'gemeindeleben/#hauskreise';
      list.innerHTML = data.groups.map(function (g) {
        return (
          '<li><a class="kg-row" href="' + href + '">' +
            '<div class="kg-row__info">' +
              '<div><h3 class="kg-row__name">' + esc(g.name) + '</h3></div>' +
              '<div><p class="kg-row__meta">' + esc(g.meeting) + '</p></div>' +
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
          ? '<img src="' + esc(person.photo) + '" alt="' + esc(person.name) + '" loading="lazy">'
          : '<span class="team-photo__initials">' + initials(person.name) + '</span>') +
      '</div>'
    );
  }
  function chipsHTML(roles) {
    return '<div class="role-chips">' + roles.map(function (r) {
      return '<span class="role-chip">' + esc(r) + '</span>';
    }).join('') + '</div>';
  }
  function renderTeam(data) {
    var lead = document.querySelector('[data-ct="team-lead"]');
    var grid = document.querySelector('[data-ct="team"]');
    if (!grid) return;
    var featured = data.people.filter(function (p) { return p.featured; })[0];
    var rest = data.people.filter(function (p) { return p !== featured; });
    if (lead && featured) {
      lead.innerHTML =
        '<div class="lead-card">' +
          photoHTML(featured, 'team-photo--lead') +
          '<div class="lead-card__body">' +
            '<div><span class="lead-card__name">' + esc(featured.name) + '</span></div>' +
            chipsHTML(featured.roles) +
            (featured.note ? '<div class="lead-card__note"><p>' + esc(featured.note) + '</p></div>' : '') +
          '</div>' +
        '</div>';
    }
    grid.innerHTML = rest.map(function (p) {
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
  }

  /* ---------- boot: fetch only what the page needs ---------- */
  function boot() {
    if (document.querySelector('[data-ct="events"]')) {
      getJSON(URLS.events).then(function (d) {
        renderHomeEvents(d);
        initCalendar(d);
      }).catch(function (e) { console.warn('[data] events:', e.message); });
    }
    if (document.querySelector('[data-ct="flyer"]')) {
      getJSON(URLS.flyer).then(renderFlyer).catch(function (e) { console.warn('[data] flyer:', e.message); });
    }
    if (document.querySelector('[data-ct="sermons"]')) {
      getJSON(URLS.sermons).then(renderSermons).catch(function (e) { console.warn('[data] sermons:', e.message); });
    }
    if (document.querySelector('[data-ct="groups"]')) {
      getJSON(URLS.groups).then(renderGroups).catch(function (e) { console.warn('[data] groups:', e.message); });
    }
    if (document.querySelector('[data-ct="team"]')) {
      getJSON(URLS.team).then(renderTeam).catch(function (e) { console.warn('[data] team:', e.message); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
