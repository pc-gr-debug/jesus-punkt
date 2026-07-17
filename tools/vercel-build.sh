#!/usr/bin/env bash
# Vercel build — mirrors the retired GitHub Pages workflow minus the /repo/ prefix step
# (root domain needs none). Output is the repo root, mutated in place.
set -uo pipefail

python3 tools/ct-events.py \
  || echo "WARN: ct-events failed — deploying with the checked-in snapshot"
python3 tools/yt-sermons.py \
  || echo "WARN: yt-sermons failed or YT_API_KEY/YT_PLAYLIST_ID not set — deploying with the mock fallback"

set -e
python3 tools/content-bake.py
python3 tools/i18n-build.py --origin https://jesus-punkt.de --patch-de
