#!/usr/bin/env python3
"""Build status.html and docs/STATUS.md from the data files (counts, coverage, AI-labelled content, licences, build time)."""
import json, os, datetime, html, subprocess
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(p, d=None):
    try:
        return json.load(open(os.path.join(SITE, p), encoding="utf-8"))
    except Exception:
        return d
cov = load("data/scripture/coverage.json", {})
rep = load("data/build-report.json", {})
ai = load("data/ai-en.json", {"items": {}})
audio_n = None
au = os.environ.get("LC_AUDIO_INDEX")
if au and os.path.exists(au):
    a = json.load(open(au)); audio_n = a.get("clip_count")
ai_n = len((ai or {}).get("items") or {})
now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
try:
    commit = subprocess.check_output(["git", "-C", SITE, "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL).decode().strip()
except Exception:
    commit = "n/a"
en_pct = cov.get("english_pct", 0); hy_pct = cov.get("armenian_pct", 0)
rows = [
  ("Calendar engine (any date, 1583-9999)", "Complete: runs in your browser from the calgen rules of the Tonatsoyts. Rules not yet demonstrated are labelled provisional; open questions are shown (Lenten Saturdays, the Elijah / St Gregory fast days)."),
  ("Hymnal (Krapar Sharagnots + scan supplement)", f"{rep.get('krapar_sections','?')} verified Krapar sections plus {rep.get('supplement_sections','?')} supplement sections from the 1888 Sharagnots ({rep.get('anchored_stanzas','?')} stanzas), each with a button to the printed scan page."),
  ("English scripture (RSVCE)", f"{en_pct}% of {cov.get('citations','?')} cached citations so far; the rest fill in as a rate-limited fetch completes. Where missing, a link to BibleGateway is shown."),
  ("Armenian reading text (Jashots)", f"{hy_pct}% of citations; AI-assisted transcription of the printed Jashots, proofreading in progress."),
  ("AI English translations of hymns", f"{ai_n} stanzas translated so far (labelled 'AI translation (Claude)', not reviewed by a person)."),
  ("Scripture audio", ("%s clips (AI-generated speech)" % audio_n) if audio_n else "Hosted in a separate repository; readings without a clip show 'audio pending'."),
]
ai_labelled = [
  "Hymn English translations: 'AI translation (Claude)'.",
  "Five non-biblical lections: 'English translation: AI generated'.",
  "All scripture audio: AI-generated speech (ElevenLabs).",
  "Armenian Jashots and Sharagnots text: AI-assisted transcription of the printed scans, checked against a typed Unicode text; the printed scan is the source of truth.",
]
sources = [
  "Calendar rules: the Tonatsoyts (Hador 1 and 2), implemented as the calgen rules engine. English commemoration names: published forms (Vemkar / ACHR) where available, otherwise 'composed' and marked.",
  "Hymnal: frharoutiun/Armenian-Church-Tools (Krapar Sharagnots) and the Unicode text of the 1888 Etchmiadzin Sharagnots supplied by Fr Ghevond Ajemian, anchored to our scan of the printed book.",
  "Scripture: Revised Standard Version, Catholic Edition (RSVCE), via BibleGateway, as on achrct.com. Armenian: Jashots (Ճաշոց).",
  "Transliteration: the parish Maroon Book convention (TR).",
]
limits = [
  "Some calendar rules are provisional or open; 30% of days have readings that match the published lists only partly. Treat the day page as a working reference, not an official ordo.",
  "Some hymns appointed by the Tonatsoyts link only ambiguously or not at all to the Sharagnots; they are labelled.",
  "Scan highlights are estimates and can be a few lines off.",
  "English scripture text and audio for some readings are still being added.",
]
lic = "Scripture quotations from the Revised Standard Version of the Bible, Catholic Edition, copyright 1965, 1966 the Division of Christian Education of the National Council of the Churches of Christ in the United States of America. Used by permission. All rights reserved."
li = lambda xs: "<ul>" + "".join("<li>%s</li>" % html.escape(x) for x in xs) + "</ul>"
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>About and status | Armenian liturgical calendar</title><link rel="stylesheet" href="sharagan.css"><link rel="stylesheet" href="site-ext.css"></head>
<body><main class="app"><header class="hymnal-header"><div class="ornament">֍</div><h1 class="hymnal-title">About &amp; status</h1>
<p class="hymnal-subtitle"><a href="./">&larr; Back to the calendar and hymnal</a></p></header>
<section class="panel"><h2>What is here</h2><table class="status-table" style="width:100%;border-collapse:collapse">
{"".join("<tr><th style='text-align:left;vertical-align:top;padding:6px 10px 6px 0'>%s</th><td style='padding:6px 0'>%s</td></tr>" % (html.escape(a), html.escape(b)) for a, b in rows)}</table></section>
<section class="panel"><h2>AI-generated and machine-assisted content</h2>{li(ai_labelled)}</section>
<section class="panel"><h2>Sources</h2>{li(sources)}</section>
<section class="panel"><h2>Known limitations</h2>{li(limits)}</section>
<section class="panel"><h2>Scripture licence</h2><p>{html.escape(lic)}</p></section>
<p class="footer-note">Build {html.escape(now)} (commit {html.escape(commit)}). Questions or corrections: frharoutiun@gmail.com.</p></main></body></html>'''
open(os.path.join(SITE, "status.html"), "w", encoding="utf-8").write(page)
md = ["# Status (generated)", "", "Build %s, commit %s" % (now, commit), ""] + ["- **%s**: %s" % r for r in rows] + ["", "## AI-generated content"] + ["- " + x for x in ai_labelled] + ["", "## Limitations"] + ["- " + x for x in limits]
open(os.path.join(SITE, "docs", "STATUS.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
print("status built", now, commit)
