#!/usr/bin/env python3
"""Fetch the latest sermons from a YouTube playlist into data/ct/sermons.json.

Same pattern as tools/ct-events.py: runs at deploy (plus the daily cron in
pages.yml), no client-side API key, no CORS problem. Output shape ==
data/mock/sermons.json (the documented contract); js/data.js falls back to
the mock, then to the static markup, if this file is missing.

Needs two GitHub Actions repo secrets:
  YT_API_KEY      — Google Cloud API key with the YouTube Data API v3 enabled
  YT_PLAYLIST_ID  — the "Streams" (or Uploads) playlist to pull from

Speaker convention (docs/churchtools-integration.md): first line of the video
description reads "Name · Rolle" — anything else and the field stays empty,
with the speaker name parsed from the title as the fallback.

Titles are free-form team uploads; the real playlist mixes every variant of
"{Titel} - {Datum} - {Sprecher} - Gottesdienst - Jesus Punkt Neubrandenburg":
the date is sometimes before the speaker and sometimes after, written as
28.06.26 / 14.06.2026 / 10. 08. 25 / 12 01 2025; the channel suffix appears
as "Jesus Punkt", "Jesus Punkt NB", "JP NB" or the typo "Jeus Punkt"; series
uploads put the sermon title AFTER the date ("Predigtserie: Finanzen -
02.02.2025 - Der Segen des Zehnten - …"). parse_video_title() therefore
splits the raw title into segments and classifies each one (date / speaker /
service type / channel / title) instead of assuming a fixed order. The date
in the title is the day the sermon was preached, not YouTube's publishedAt
(uploads lag) — it wins whenever present and valid.

Usage:
  python3 tools/yt-sermons.py             writes data/ct/sermons.json
  python3 tools/yt-sermons.py --selftest  runs the parser against real
                                          playlist titles (no network, no key)
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

API = "https://www.googleapis.com/youtube/v3/playlistItems"
FETCH = 25   # fetch more than we show — playlist order is not strictly chronological
LIMIT = 9
BERLIN = ZoneInfo("Europe/Berlin")
MONTHS_DE = [
    "", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
]

# Split on dashes that have whitespace on at least one side (protects in-word
# hyphens and dotted dates), or on runs of 2+ spaces (some titles use no dashes).
SEGMENT_SPLIT_RE = re.compile(r"\s+-+\s*|\s*-+\s+|\s{2,}")
# 28.06.26 · 14.06.2026 · 10. 08. 25 · 12 01 2025 · 19.04.26. (trailing dot)
DATE_RE = re.compile(r"(\d{1,2})[.\s]+(\d{1,2})[.\s]*(\d{4}|\d{2})(?!\d)")
CHANNEL_RE = re.compile(r"(je?sus|jeus)\s*punkt|neubrandenburg|^jp(\s+nb)?$|^nb$", re.IGNORECASE)
SERVICE_TYPE_RE = re.compile(r"^gottesdiens?t?e?$", re.IGNORECASE)  # incl. "Gottesdiens" typo
SPEAKER_PREFIX_RE = re.compile(r"^(gast)?(prediger(in)?|sprecher(in)?|pastor(in)?)\s+", re.IGNORECASE)
SERIES_PREFIX_RE = re.compile(r"^predigtserie\b", re.IGNORECASE)
NAME_TOKEN_RE = re.compile(r"^[A-ZÄÖÜ][\w.äöüß-]*$")
NAME_CONNECTORS = {"und", "&", "van", "von", "de"}


def format_german_date(dt: datetime) -> str:
    return f"{dt.day:02d}. {MONTHS_DE[dt.month]} {dt.year}"


def _parse_date(segment: str) -> tuple[datetime | None, str]:
    """Find a plausible sermon date in a segment; return (date, leftover text)."""
    for m in DATE_RE.finditer(segment):
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if year < 100:
            year += 2000
        if not (1 <= month <= 12 and 1 <= day <= 31 and 2015 <= year <= 2035):
            continue
        try:
            dt = datetime(year, month, day, tzinfo=BERLIN)
        except ValueError:
            continue
        leftover = (segment[:m.start()] + " " + segment[m.end():]).strip(" .-")
        return dt, leftover
    return None, segment


def _is_name(segment: str) -> bool:
    """Heuristic: 2–6 tokens, all capitalized words or connectors, no digits/colons."""
    if re.search(r"[\d:,!?]", segment):
        return False
    tokens = segment.split()
    if not 2 <= len(tokens) <= 6:
        return False
    caps = 0
    for tok in tokens:
        if tok.lower() in NAME_CONNECTORS:
            continue
        if not NAME_TOKEN_RE.match(tok):
            return False
        caps += 1
    return caps >= 2


def parse_video_title(raw_title: str) -> tuple[str, datetime | None, str]:
    """Classify title segments into (clean title, sermon date, speaker)."""
    raw_title = (raw_title or "").strip()
    segments = [s.strip(" .-") for s in SEGMENT_SPLIT_RE.split(raw_title)]
    segments = [s for s in segments if s]

    # Locate the date segment
    date_idx, sermon_date, date_leftover = None, None, ""
    for i, seg in enumerate(segments):
        dt, leftover = _parse_date(seg)
        if dt:
            date_idx, sermon_date, date_leftover = i, dt, leftover
            break

    if date_idx is None:
        # No date: still drop channel/type tails, keep the rest as title
        title_parts = [s for s in segments if not CHANNEL_RE.search(s) and not SERVICE_TYPE_RE.match(s)]
        return " - ".join(title_parts) or raw_title, None, ""

    pre = segments[:date_idx]
    post = segments[date_idx + 1:]
    if date_leftover:  # e.g. "19.04.26. Philipp Strauch" — name glued to the date
        post.insert(0, date_leftover)

    speaker = ""
    title_extra = []
    for seg in post:
        if CHANNEL_RE.search(seg) or SERVICE_TYPE_RE.match(seg):
            continue
        stripped = SPEAKER_PREFIX_RE.sub("", seg)
        if stripped != seg and stripped:            # "Gastprediger X" — unambiguous
            speaker = speaker or stripped
        elif not speaker and _is_name(seg):
            speaker = seg
        else:
            title_extra.append(seg)

    # Speaker may sit before the date: "Taufgottesdienst - Bernhard Röckle - 14.06.2026"
    if pre:
        stripped = SPEAKER_PREFIX_RE.sub("", pre[-1])
        if stripped != pre[-1] and stripped:
            speaker = speaker or stripped
            pre = pre[:-1]
        elif not speaker and len(pre) >= 2 and _is_name(pre[-1]):
            speaker = pre[-1]
            pre = pre[:-1]

    title_parts = [s for s in pre if not CHANNEL_RE.search(s)] + title_extra
    # "Predigtserie: Finanzen - <date> - Der Segen des Zehnten" → keep the real title
    if len(title_parts) > 1 and SERIES_PREFIX_RE.match(title_parts[0]):
        title_parts = title_parts[1:]

    title = " - ".join(title_parts).strip(" .-")
    return title or raw_title, sermon_date, speaker


def extract_speaker(description: str) -> str:
    first_line = (description or "").strip().splitlines()[0].strip() if description else ""
    return first_line if " · " in first_line else ""


# Real titles from the live playlist (fetched 2026-07) — the parser must keep
# handling every one of these shapes. Run: python3 tools/yt-sermons.py --selftest
SELFTEST_CASES = [
    ("Lebenswasser in heißen Tagen - 28.06.26 - Loni Steidt -Gottesdienst - Jesus Punkt Neubrandenburg",
     "Lebenswasser in heißen Tagen", "2026-06-28", "Loni Steidt"),
    ("Schaf müsste man sein - 21.06.26 - Annette Dwornik - Jesus Punkt Neubrandenburg",
     "Schaf müsste man sein", "2026-06-21", "Annette Dwornik"),
    ("Taufgottesdienst - Bernhard Röckle - 14.06.2026 - Jesus Punkt Neubrandenburg",
     "Taufgottesdienst", "2026-06-14", "Bernhard Röckle"),
    ("Ihr werdet Kraft empfangen - 24.05.26 - Philipp Strauch - Jesus Punkt Neubrandenburg - Gottesdienst",
     "Ihr werdet Kraft empfangen", "2026-05-24", "Philipp Strauch"),
    ("Urlaub bei Gott - 03.05.2026 - Nathanael Böcher - Gottesdienst Jesus Punkt Neubrandenburg",
     "Urlaub bei Gott", "2026-05-03", "Nathanael Böcher"),
    ("Gott nah sein - 16.04.26 - Prediger Claus Wittnebel - Gottesdienst - Jesus Punkt Neubrandenburg",
     "Gott nah sein", "2026-04-16", "Claus Wittnebel"),
    ("Geheiltes Herz - Befreites Leben - 10.05.26 - Philipp Strauch - Gottesdienst- Jesus Punkt",
     "Geheiltes Herz - Befreites Leben", "2026-05-10", "Philipp Strauch"),
    ("Wenn wir vor Gott kapitulieren - 19.04.26. Philipp Strauch - Gottesdienst - Jesus Punkt",
     "Wenn wir vor Gott kapitulieren", "2026-04-19", "Philipp Strauch"),
    ("Woran hältst du dich fest? - 12.04.26 - Philipp Strauch -Jesus Punkt Neubrandenburg",
     "Woran hältst du dich fest?", "2026-04-12", "Philipp Strauch"),
    ("Gottesdienst - 29.03.2026 - Gastsprecher Marc Strunk - Jesus Punkt Neubrandenburg",
     "Gottesdienst", "2026-03-29", "Marc Strunk"),
    ("Warten lohnt sich - Gastprediger Joshua Damm - 01.02.26 - Gottesdienst - Jesus Punkt Neubrandenburg",
     "Warten lohnt sich", "2026-02-01", "Joshua Damm"),
    ("Jesus - der Eckstein - 27.07.2025 - Philipp Strauch - Gottesdienst - Jesus Punkt Neubrandenburg",
     "Jesus - der Eckstein", "2025-07-27", "Philipp Strauch"),
    ("Familiengottesdienst   20 07 2025   Royal Rangers   Jesus Punkt Neubrandenburg",
     "Familiengottesdienst", "2025-07-20", "Royal Rangers"),
    ("Erst den Balken sehen - Warum Urteilen bei uns selbst beginnt - 10. 08. 25 - Philipp Strauch - JP NB",
     "Erst den Balken sehen - Warum Urteilen bei uns selbst beginnt", "2025-08-10", "Philipp Strauch"),
    ("Gesunde Geistliche Entwicklung - 14.09.25 - Philipp Strauch - Gottesdienst - Jeus Punkt - NB",
     "Gesunde Geistliche Entwicklung", "2025-09-14", "Philipp Strauch"),
    ("Familie, Gottes Model - 17.08.2025 - Jürgen und Magdalena Damm - Gottesdienst - Jesus Punkt NB",
     "Familie, Gottes Model", "2025-08-17", "Jürgen und Magdalena Damm"),
    ("Versöhnung - 10.11.2024 - Gastsprecher Johann & Susanne Scharf - Jesus Punkt Neubrandenburg",
     "Versöhnung", "2024-11-10", "Johann & Susanne Scharf"),
    ("Missionsgottesdienst - Christine Lauterbach und Ulrike Keulerz - 18.05.25 - Jesus Punkt",
     "Missionsgottesdienst", "2025-05-18", "Christine Lauterbach und Ulrike Keulerz"),
    ("Predigtserie: Finanzen - 02.02.2025 - Der Segen des Zehnten - Philipp Strauch - Jesus Punkt NB",
     "Der Segen des Zehnten", "2025-02-02", "Philipp Strauch"),
    ("Predigtserie: Finanzen - 09.02.2025 - Wie man ein fröhlicher Geber wird - Philipp Strauch",
     "Wie man ein fröhlicher Geber wird", "2025-02-09", "Philipp Strauch"),
    ("Prüft Alles! - 26.01. 25 - Günther Seidt - Jesus Punkt Neubrandenburg",
     "Prüft Alles!", "2025-01-26", "Günther Seidt"),
    ("Gebet, Wen oder Was es verändert - 12 01 2025",
     "Gebet, Wen oder Was es verändert", "2025-01-12", ""),
    ("Sich fallen lassen: Der Mut, auf Gott zu vertrauen - Annette Dwornik -01.12.24 - Jesus Punkt NB",
     "Sich fallen lassen: Der Mut, auf Gott zu vertrauen", "2024-12-01", "Annette Dwornik"),
    ("Wertschätzung- Philipp Strauch- 06.04.25 -  Gottesdienst - Jesus Punkt Neubrandenburg",
     "Wertschätzung", "2025-04-06", "Philipp Strauch"),
    ("Sei ein Macher - Philipp Strauch - 29.06.2025 - Gottesdienst - Jesus Punkt Neubrandenburg",
     "Sei ein Macher", "2025-06-29", "Philipp Strauch"),
    ("Jünger machen Jünger - 01.06.2025 - Philipp Strauch - Gottesdiens",
     "Jünger machen Jünger", "2025-06-01", "Philipp Strauch"),
    ("Ein Titel ohne Datum - Jesus Punkt Neubrandenburg",
     "Ein Titel ohne Datum", None, ""),
]


def selftest() -> int:
    failures = 0
    for raw, want_title, want_date, want_speaker in SELFTEST_CASES:
        title, date, speaker = parse_video_title(raw)
        got_date = date.strftime("%Y-%m-%d") if date else None
        if (title, got_date, speaker) != (want_title, want_date, want_speaker):
            failures += 1
            print(f"FAIL: {raw}\n  want ({want_title!r}, {want_date!r}, {want_speaker!r})"
                  f"\n  got  ({title!r}, {got_date!r}, {speaker!r})", file=sys.stderr)
    total = len(SELFTEST_CASES)
    print(f"yt-sermons selftest: {total - failures}/{total} passed")
    return 1 if failures else 0


def main() -> int:
    api_key = os.environ.get("YT_API_KEY")
    playlist_id = os.environ.get("YT_PLAYLIST_ID")
    if not api_key or not playlist_id:
        print("yt-sermons: YT_API_KEY / YT_PLAYLIST_ID not set — skipping, mock stays the fallback", file=sys.stderr)
        return 1

    params = {
        "part": "snippet",
        "playlistId": playlist_id,
        "maxResults": str(FETCH),
        "key": api_key,
    }
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.load(resp)

    sermons = []
    for item in payload.get("items", []):
        snippet = item.get("snippet", {})
        video_id = snippet.get("resourceId", {}).get("videoId")
        published = snippet.get("publishedAt")
        if not video_id or not published:
            continue
        thumbs = snippet.get("thumbnails", {})
        thumb = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url")

        title, sermon_date, title_speaker = parse_video_title(snippet.get("title", ""))
        display_date = sermon_date or datetime.fromisoformat(published.replace("Z", "+00:00")).astimezone(BERLIN)
        speaker = extract_speaker(snippet.get("description", "")) or title_speaker

        sermons.append((display_date, {
            "date": format_german_date(display_date),
            "title": title,
            "speaker": speaker,
            "thumb": thumb,
            "url": f"https://youtu.be/{video_id}",
        }))

    if not sermons:
        print("yt-sermons: playlist returned 0 videos — refusing to overwrite", file=sys.stderr)
        return 1

    sermons.sort(key=lambda pair: pair[0], reverse=True)
    sermons = [entry for _, entry in sermons]
    now = datetime.now(timezone.utc)
    out = Path(__file__).resolve().parent.parent / "data" / "ct" / "sermons.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "_source": f"YouTube playlist {playlist_id}, fetched {now:%Y-%m-%dT%H:%MZ}",
                "sermons": sermons[:LIMIT],
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    print(f"yt-sermons: wrote {min(len(sermons), LIMIT)} sermons → {out.relative_to(out.parent.parent.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(selftest() if "--selftest" in sys.argv else main())
