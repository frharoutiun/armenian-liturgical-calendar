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
corpus = load("data/corpus.json", [])
_items = (ai or {}).get("items") or {}
krapar_en_n = sum(1 for sec in corpus for st in sec.get("stanzas", []) for v in st.get("verses", []) if v.get("en"))
# stanzas that show our Claude translation: no Krapar English and a translation exists
ai_n = sum(1 for sec in corpus for st in sec.get("stanzas", []) for v in st.get("verses", []) if not v.get("en") and v.get("a") in _items)
now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
try:
    commit = subprocess.check_output(["git", "-C", SITE, "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL).decode().strip()
except Exception:
    commit = "n/a"
en_pct = cov.get("english_pct", 0); hy_pct = cov.get("armenian_pct", 0)
rows = [
  ("Calendar engine (any date, 1583-9999)", "Complete: runs in your browser from the calgen rules of the Tonatsoyts. Rules not yet demonstrated are labelled provisional; open questions are shown (Lenten Saturdays, the Elijah / St Gregory fast days)."),
  ("Hymnal (Krapar Sharagnots + scan supplement)", f"{rep.get('krapar_sections','?')} verified Krapar sections plus {rep.get('supplement_sections','?')} supplement sections from the 1888 Sharagnots ({rep.get('anchored_stanzas','?')} stanzas), each with a button to the printed scan page."),
  ("English scripture", "Canonical books: ESV, loaded live in your browser from the ACHR website's scripture service (Crossway text under the church's licence; not stored on this site), with the same reading introductions and human-read Crossway audio. If that service is unreachable a link to BibleGateway is shown. Apocrypha (Wisdom, Judith, Baruch, Maccabees, Prayer of Azariah): RSVCE cached here."),
  ("Armenian reading text", "Primary: the Armenian Bible (Classical Armenian, 1895 Constantinople edition) from Arak29, matched verse by verse to the readings of the Tonatsoyts. Each reading shows a numbering check against the English (agree / differs / needs review). The Jashots transcription (AI-assisted, from the printed page) stays as a second layer because the lectionary wording sometimes differs from the Bible text."),
  ("Chants (psalm, mesedi, alleluia)", "Shown as full verses in Armenian (Arak29) with the English verse (KJV, public domain) and placed before the reading each introduces (psalm, first reading, mesedi, second reading, alleluia, gospel). The placement follows the owner's rule of the Jashots order and verse matching is automatic: items marked needs review are not confirmed."),
  ("Sharagnots text", "Krapar sections: the verified Krapar text. Supplement sections: the typed Unicode edition prepared by Fr Ghevond Ajemian, checked against the printed scan, with word corrections that the scan proved; stanzas without a Unicode counterpart show our own transcription and are labelled 'transcription only, not yet proofread'."),
  ("AI English translations of hymns", f"One English per stanza, never reviewed by a person: {krapar_en_n} Krapar stanzas show the English published with the Krapar Sharagnots (labelled 'AI translation (Krapar Sharagnots)'); {ai_n} scan-supplement stanzas carry 'AI translation (Claude)' (shown only where there is no Krapar English)."),
  ("Reading audio", "Works as on achrct.org: one Listen control per reading plays the short spoken introduction (and the Gospel caption; never chapter and verse), then the human-read ESV audio from Crossway; Apocrypha passages use our own AI-generated speech. 'Listen to all readings' plays the day's readings in order. The introductions are AI-generated speech (%s clips, ElevenLabs)." % audio_n if audio_n else "Hosted in a separate repository."),
]
ai_labelled = [
  "Hymn English translations: 'AI translation (Krapar Sharagnots)' for Krapar sections, 'AI translation (Claude)' elsewhere; one English per stanza.",
  "Five non-biblical lections: 'English translation: AI generated'.",
  "Audio: the short spoken introductions and the Apocrypha passages are AI-generated speech (ElevenLabs); the canonical passages are the human-read ESV recording from Crossway (esv.org), as on achrct.org.",
  "Jashots page transcription (second layer) and unproofread Sharagnots stanzas: AI-assisted transcription of the printed scans; the printed scan is the source of truth.",
  "Chant and reading matching (Armenian verse to English verse, chant to Bible verse, service order) is automatic and is marked 'needs review' where it is not certain.",
  "Hymn-to-page links and the parts of each day's canon: resolved by rules from the Tonatsoyts and the structure of the Sharagnots; parts filled from generic sections by mode, weekday or season are marked 'to be confirmed'.",
]
sources = [
  "Calendar rules: the Tonatsoyts (Hador 1 and 2), implemented as the calgen rules engine. English commemoration names: published forms (Vemkar / ACHR) where available, otherwise 'composed' and marked.",
  "Hymnal: frharoutiun/Armenian-Church-Tools (Krapar Sharagnots) and the Unicode text of the 1888 Etchmiadzin Sharagnots supplied by Fr Ghevond Ajemian (used with permission), anchored to our scan of the printed book.",
  "English scripture: English Standard Version via the ACHR website's scripture service (as on achrct.org); RSVCE (BibleGateway) for the Apocrypha only; King James Version (public domain) beside chants.",
  "Armenian scripture: Arak29 (arak29.org), Classical Armenian Bible, 1895 Constantinople edition, via the Armenian Bible Society (Yerevan) 1997 reprint; plain verse text only (Arak29's morphology and glosses are not reproduced); used with permission. Jashots (Ճաշոց) transcription as second layer.",
  "Transliteration: the parish Maroon Book convention (TR).",
]
badges = [
  "This site is a working draft built from the Tonatsoyts, Jashots and Sharagnots; nothing here is an official ordo.",
  "Green 'Verse numbers agree': the Armenian verses and the English passage cover the same verses.",
  "Amber 'Numbering differs': the Armenian Bible numbers the verses differently; the Armenian range and the English range it corresponds to are both shown.",
  "Red 'Numbering not confirmed (needs review)': the pairing could not be settled with certainty; the English follows the printed citation and may not cover exactly the same verses.",
  "'review' chips on chants and 'to be confirmed' on hymns and canon parts: matched or placed by a rule or a fuzzy match that no person has checked. A hymn that cannot be settled shows no page number instead of several.",
  "'transcription only, not yet proofread' on a stanza: no Unicode text was found for it; the text is our own transcription of the scan.",
]
limits = [
  "Some calendar rules are provisional or open; 30% of days have readings that match the published lists only partly. Treat the day page as a working reference, not an official ordo.",
  "Some hymns appointed by the Tonatsoyts link only ambiguously or not at all to the Sharagnots; they are labelled.",
  "Scan highlights are estimates and can be a few lines off.",
  "This is a draft. Items marked 'needs review' (numbering, chant verses, hymn pages, canon parts) are not confirmed; unresolved hymns show no page rather than several.",
  "Armenian and English verse numbering differ in places (for example in the Psalms, Isaiah, Jeremiah, Daniel, Hosea, Joel). The site shows a numbering badge on every reading; compound citations are not compared segment by segment, and a few verses the ESV omits or numbers differently from the KJV are noted.",
  "English scripture text and audio for some readings are still being added; the Hymnal AI translations were made from an earlier text of the Sharagnots and some differ in wording from the Unicode text now shown.",
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
<section class="panel"><h2>Draft status and what the badges mean</h2>{li(badges)}</section>
<section class="panel"><h2>Known limitations</h2>{li(limits)}</section>
<section class="panel"><h2>Scripture licence</h2><p>{html.escape(lic)}</p></section>
<p class="footer-note">Build {html.escape(now)} (commit {html.escape(commit)}). Questions or corrections: frharoutiun@gmail.com.</p></main></body></html>'''
open(os.path.join(SITE, "status.html"), "w", encoding="utf-8").write(page)
md = ["# Status (generated)", "", "Build %s, commit %s" % (now, commit), ""] + ["- **%s**: %s" % r for r in rows] + ["", "## AI-generated content"] + ["- " + x for x in ai_labelled] + ["", "## Limitations"] + ["- " + x for x in limits]
open(os.path.join(SITE, "docs", "STATUS.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
print("status built", now, commit)
