# Licences and attribution

* **Scripture (English), canonical books**: English Standard Version (ESV), copyright 2001 Crossway. It is NOT stored in this repository. The page fetches each passage
  in the reader's browser from the ACHR website's public scripture endpoint (`https://www.achrct.org/api/scripture`), which serves it under the church's own Crossway
  licence, together with the Crossway copyright notice (shown under every passage), reading introductions and a link to Crossway's human-read audio. Cached canonical RSVCE
  text that an earlier build contained was removed on 2026-10-24 (it remains in git history of this repo; history was deliberately not rewritten).
* **Scripture (English), Apocrypha/deuterocanon only** (Wisdom, Judith, Baruch, II Maccabees, Prayer of Azariah): RSVCE, copyright 1965, 1966 the Division of Christian Education of
  the National Council of the Churches of Christ in the United States of America. Used by permission. All rights reserved. Cached in `data/scripture/shards/`
  because the ESV has no Apocrypha, as on the ACHR site. `tools/check_publish.sh` fails the deploy if English appears in any canonical-book shard.
* **Scripture (Armenian)**: Arak29 (arak29.org), Classical Armenian Bible, 1895 Constantinople edition, via the Armenian Bible Society (Yerevan) 1997 reprint of the 1929 American Bible Society (Vienna) reprint.
  Stored as plain verse text only in `data/scripture/arak29/` (Arak29's morphology, glosses and footnote markup are not copied; raw pages are not in this repository). Used with permission (permission granted and confirmed by the project owner on 2026-10-25). The 1895 text itself is old; the edition and its digitisation are Arak29's, and are credited on the site.
* **Scripture (English beside chants)**: King James Version (public domain), taken from the parallel column of the same Arak29 pages (`data/calendar/chants_layer.json`).
* **Hymnal code, data and design**: frharoutiun/Armenian-Church-Tools (sharagan/), the owner's own work (vendored snapshot in vendor/krapar-upstream/).
* **Sharagnots text**: the 1888 Etchmiadzin Sharagnots (printed scan) and a typed Unicode text supplied by Fr Ghevond Ajemian (2026-10-20). Since 2026-10-24 the Unicode text is the displayed text of the supplement sections (our transcription is a secondary field); used with permission (permission granted and confirmed by the project owner on 2026-10-25), credited on the site.
* **Prayers by Fr Arshen** (where shown): attributed to him; used with his permission.
* **AI products** are labelled in the interface: hymn translations ("AI translation (Krapar Sharagnots)" for Krapar sections, the English published with that hymnal; "AI translation (Claude)" for the rest; one English per stanza, see docs/DATA.md), five non-biblical lections ("English translation: AI generated"),
  and audio (AI-generated speech, ElevenLabs).
* **Fonts**: GHEA Mariam and EB Garamond (SIL OFL), see fonts/.
