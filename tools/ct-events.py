#!/usr/bin/env python3
"""Fetch upcoming events from the public ChurchTools calendars into data/ct/events.json.

The jp.church.tools instance exposes its public calendars (2 "Öffentlicher Kalender",
3 "Kinder & Jugend") to anonymous readers, so no token is needed. Runs at deploy
(plus a daily cron in pages.yml) — the site never fetches ChurchTools directly
(no CORS on the API). Output shape == data/mock/events.json (the documented contract);
js/data.js falls back to the mock, then to the static markup, if this file is missing.

Usage: python3 tools/ct-events.py  (writes data/ct/events.json; exits non-zero on failure)
"""
from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = "https://jp.church.tools/api"
FALLBACK_CALENDAR_IDS = [2, 3]  # public calendars as of 2026-07 — used if discovery fails
DAYS_AHEAD = 90
BERLIN = ZoneInfo("Europe/Berlin")

# CT appointment titles → the site's canonical event types/titles/metas
# (these exact strings drive the en/uk translation maps in js/data.js — keep in sync)
KNOWN = [
    ("gottesdienst", "gottesdienst", "Gottesdienst", "Kruseshofer Str. 20 · vor Ort und im Livestream"),
    ("elevate", "jugend", "Elevate Jugend", "Für Jugendliche zwischen 13 und 29 Jahren"),
    ("gebet", "gebet", "Gebet", "Gemeinsames Gebet · alle sind willkommen"),
    ("hauskreis", "hauskreis", "Hauskreis-Abend", "In Wohnzimmern in ganz Neubrandenburg"),
]


def classify(raw_title: str, subtitle: str | None) -> tuple[str, str, str]:
    low = raw_title.lower()
    for needle, ctype, title, meta in KNOWN:
        if needle in low:
            return ctype, title, meta
    return "sonstiges", raw_title.strip(), (subtitle or "").strip()


SPECIAL_MAX = 3  # long-notice flyers shown at once (events page + home strip)


def extract_flyer(payload: dict, out_dir: Path, now: datetime) -> None:
    """Flyer convention: the team sets an IMAGE on an appointment in a public calendar.
    · "Flyer" (bare title) or the next Gottesdienst → the current weekly flyer.
    · "Flyer <Eventname>" → a long-notice special event; it shows for the whole
      duration of its carrier appointment (start–end = the promotion window) in the
      "Besondere Events" section, max SPECIAL_MAX, soonest first.
    (data/mock/flyer.json stays the fallback when nothing is found)."""
    def img_url(base):
        img = base.get("image")
        if isinstance(img, dict):
            return img.get("fileUrl") or img.get("url") or img.get("imageUrl")
        if isinstance(img, str) and img.startswith("http"):
            return img
        return None

    def download(url: str, stem: str) -> str | None:
        req = urllib.request.Request(url, headers={"Accept": "image/*"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            ctype = resp.headers.get("Content-Type", "")
        ext = {"image/png": ".png", "image/webp": ".webp"}.get(ctype.split(";")[0], ".jpg")
        (out_dir / f"{stem}{ext}").write_bytes(data)
        print(f"ct-events: {stem}{ext} downloaded ({len(data) // 1024} KB)")
        return f"data/ct/{stem}{ext}"

    candidates, specials = [], []
    for item in payload.get("data", []):
        base = item.get("appointment", {}).get("base", {})
        calc = item.get("calculated", {})
        url = img_url(base)
        if not url:
            continue
        raw_title = (base.get("title") or "").strip()
        low = raw_title.lower()
        if low.startswith("flyer") and low.removeprefix("flyer").strip(" -–·:"):
            # "Flyer Sommerfest" → special event "Sommerfest"
            name = raw_title[len("flyer"):].strip(" -–·:")
            specials.append((calc.get("startDate") or "", url, name))
        else:
            rank = 0 if "flyer" in low else (1 if "gottesdienst" in low else 2)
            candidates.append((rank, calc.get("startDate") or "", url, raw_title or "Flyer"))
    if not candidates and not specials:
        print("ct-events: no appointment image found — flyer keeps its fallback")
        return

    out: dict = {"updated": f"{now:%Y-%m-%dT%H:%M:%SZ}", "special": []}
    if candidates:
        candidates.sort()
        _, _, url, title = candidates[0]
        out["url"] = download(url, "flyer-aktuell")
        out["alt"] = f"Aktueller Flyer: {title}"

    seen = {out.get("url")}
    specials.sort()  # soonest promotion window first
    for i, (_, url, name) in enumerate(specials[:SPECIAL_MAX], start=1):
        path = download(url, f"flyer-special-{i}")
        if path in seen:
            continue
        seen.add(path)
        out["special"].append({"url": path, "title": name, "alt": f"Flyer: {name}"})

    (out_dir / "flyer.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    print(f"ct-events: flyer.json written ({len(out['special'])} special)")


def discover_public_calendars() -> list[int]:
    """All calendars the instance exposes anonymously — a calendar made public in
    ChurchTools appears on the site automatically, no code change needed."""
    req = urllib.request.Request(f"{BASE}/calendars", headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.load(resp)
        ids = [c["id"] for c in payload.get("data", []) if c.get("isPublic") and not c.get("isPrivate")]
        if ids:
            return sorted(ids)
        print("ct-events: calendar discovery returned none — using fallback list", file=sys.stderr)
    except Exception as exc:
        print(f"ct-events: calendar discovery failed ({exc}) — using fallback list", file=sys.stderr)
    return FALLBACK_CALENDAR_IDS


def main() -> int:
    now = datetime.now(timezone.utc)
    calendar_ids = discover_public_calendars()
    params = [("calendar_ids[]", str(i)) for i in calendar_ids] + [
        ("from", now.date().isoformat()),
        ("to", (now + timedelta(days=DAYS_AHEAD)).date().isoformat()),
    ]
    url = f"{BASE}/calendars/appointments?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.load(resp)

    events = []
    for item in payload.get("data", []):
        base = item.get("appointment", {}).get("base", {})
        calc = item.get("calculated", {})
        start_utc = calc.get("startDate") or base.get("startDate")
        if not start_utc:
            continue
        start = (
            datetime.fromisoformat(start_utc.replace("Z", "+00:00"))
            .astimezone(BERLIN)
            .replace(tzinfo=None)
        )
        ctype, title, meta = classify(base.get("title", ""), base.get("subtitle"))
        events.append({
            "id": f"ct-{base.get('id')}-{start:%Y%m%d}",
            "start": start.isoformat(),
            "type": ctype,
            "title": title,
            "meta": meta,
        })

    if not events:
        print("ct-events: API returned 0 events — refusing to overwrite", file=sys.stderr)
        return 1

    events.sort(key=lambda e: e["start"])
    out = Path(__file__).resolve().parent.parent / "data" / "ct" / "events.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        extract_flyer(payload, out.parent, now)
    except Exception as exc:  # flyer is best-effort — never fail the events fetch over it
        print(f"ct-events: flyer extraction failed ({exc}) — fallback stays", file=sys.stderr)
    out.write_text(
        json.dumps(
            {
                "_source": f"jp.church.tools calendars {calendar_ids}, fetched {now:%Y-%m-%dT%H:%MZ}",
                "events": events,
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    print(f"ct-events: wrote {len(events)} events → {out.relative_to(out.parent.parent.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
