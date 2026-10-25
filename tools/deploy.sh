#!/bin/sh
# Redeploy the site to GitHub Pages (frharoutiun/armenian-liturgical-calendar).
#   tools/deploy.sh ["commit message"]
# Does: sanitise the scripture attribution note, rebuild the status page, run all tests, run the publish check (no secrets,
# no oversized files), commit, push, wait for the Pages build and verify the live URL. Switches the gh account to frharoutiun
# for the push and restores the previously active account afterwards. Never touches any other repository.
set -u
cd "$(dirname "$0")/.." || exit 2
REPO=frharoutiun/armenian-liturgical-calendar
URL=https://frharoutiun.github.io/armenian-liturgical-calendar
MSG="${1:-Update site data}"
BEFORE=$(gh auth status 2>&1 | awk '/Logged in to github.com account/{u=$7} /Active account: true/{print u}')
restore() { [ -n "$BEFORE" ] && [ "$BEFORE" != "frharoutiun" ] && gh auth switch -u "$BEFORE" >/dev/null 2>&1; }
trap restore EXIT
python3 - <<'PY'
import json
p='data/scripture/attribution.json'
try:
    d=json.load(open(p)); d['english']['licence_flag']="Copyrighted text, shown with attribution. See docs/LICENSES.md."; json.dump(d,open(p,'w'),ensure_ascii=False)
except Exception as e: print("attribution sanitise skipped:", e)
PY
python3 tools/build_status.py || exit 1
echo "== tests"; node tests/test_calendar.mjs >/dev/null || { echo "calendar tests FAILED"; exit 1; }
node tests/test_hymns.mjs >/dev/null || { echo "hymn tests FAILED"; exit 1; }
node tests/test_scripture_match.mjs || { echo "scripture-match tests FAILED"; exit 1; }
python3 -m unittest tests.test_hymnal_data 2>&1 | tail -1 | grep -q OK || { echo "hymnal data tests FAILED"; exit 1; }
python3 -m unittest tests.test_stanza_fixes 2>&1 | tail -1 | grep -q OK || { echo "stanza fix tests FAILED"; exit 1; }
python3 -m unittest tests.test_mode_evidence 2>&1 | tail -1 | grep -q OK || { echo "mode evidence tests FAILED"; exit 1; }
git add -A
./tools/check_publish.sh || exit 1
if git diff --cached --quiet; then echo "nothing to commit"; else
  git -c user.name=frharoutiun -c user.email=209838125+frharoutiun@users.noreply.github.com commit -q -m "$MSG

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" || exit 1
fi
gh auth switch -u frharoutiun >/dev/null 2>&1
git push origin main || { echo "push FAILED"; exit 1; }
echo "== waiting for Pages build"
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  s=$(gh api repos/$REPO/pages/builds/latest --jq .status 2>/dev/null); echo "  $s"
  [ "$s" = built ] && break; [ "$s" = errored ] && { echo "Pages build errored"; exit 1; }; sleep 30
done
echo "== verify"; ok=1
for p in "" status.html data/scripture/index.json data/calendar/readings_index.json engine/calendar.mjs; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$URL/$p"); echo "  $p -> $c"; [ "$c" = 200 ] || ok=0
done
[ $ok = 1 ] && echo "LIVE: $URL/" || { echo "verification FAILED"; exit 1; }
