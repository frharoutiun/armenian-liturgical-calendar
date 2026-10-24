# Armenian Liturgical Calendar and Sharagnots (site)

Static site (GitHub Pages ready). Tabs: **Hymnal** (the Krapar Sharagnots hymnal, search, concordance, transliteration, phrase links,
scripture reference mode, extended with the Unicode-anchored 1888 Sharagnots and a scan-page viewer) and **Calendar** (type any date: commemorations,
mode, fasting, readings, hymns, from the calgen rules engine).

Run locally:   `./run.sh`   then open http://localhost:4190/        (do not open index.html as a file: it loads JSON)
Rebuild data:  `python3 tools/build_data.py && python3 tools/apply_patches.py`
Tests:         `python3 -m unittest tests.test_hymnal_data`
Docs:          `docs/DATA.md` (data combination rules), `docs/ENGINE_API.md` (calendar engine), `docs/CALENDAR_API.md` (hooks)

Credits: hymnal code, data and design by frharoutiun/Armenian-Church-Tools (sharagan/); fonts GHEA Mariam and EB Garamond (OFL, see fonts/).
AI translations are labelled "AI translation (Claude)". Scripture: RSV with attribution.

Live site: https://frharoutiun.github.io/armenian-liturgical-calendar/   (GitHub Pages, repo frharoutiun/armenian-liturgical-calendar)
Redeploy:  `tools/deploy.sh "message"` (tests + publish check + push + live verification). Scripture audio is in a separate repository
(frharoutiun/armenian-liturgical-audio), referenced by `window.LC_AUDIO_BASE` in day-extras.js. See docs/LICENSES.md and status.html.
Calendar tab extras (day-extras.js): cached RSVCE + Armenian Jashots text per reading, audio player, AI hymn translations; scripture-match.mjs maps readings to cache keys.
