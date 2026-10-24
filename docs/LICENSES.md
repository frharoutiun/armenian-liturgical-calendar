# Licences and attribution

* **Scripture (English), canonical books**: English Standard Version (ESV), copyright 2001 Crossway. It is NOT stored in this repository. The page fetches each passage
  in the reader's browser from the ACHR website's public scripture endpoint (`https://www.achrct.org/api/scripture`), which serves it under the church's own Crossway
  licence, together with the Crossway copyright notice (shown under every passage), reading introductions and a link to Crossway's human-read audio. Cached canonical RSVCE
  text that an earlier build contained was removed on 2026-10-24 (it remains in git history of this repo; history was deliberately not rewritten).
* **Scripture (English), Apocrypha/deuterocanon only** (Wisdom, Judith, Baruch, II Maccabees, Prayer of Azariah): RSVCE, copyright 1965, 1966 the Division of Christian Education of
  the National Council of the Churches of Christ in the United States of America. Used by permission. All rights reserved. Cached in `data/scripture/shards/`
  because the ESV has no Apocrypha, as on the ACHR site. `tools/check_publish.sh` fails the deploy if English appears in any canonical-book shard.
* **Hymnal code, data and design**: frharoutiun/Armenian-Church-Tools (sharagan/), the owner's own work (vendored snapshot in vendor/krapar-upstream/).
* **Sharagnots text**: the 1888 Etchmiadzin Sharagnots (printed scan) and a typed Unicode text supplied by Fr Ghevond Ajemian (2026-10-20).
* **Prayers by Fr Arshen** (where shown): attributed to him; used with his permission.
* **AI products** are labelled in the interface: hymn translations ("AI translation (Claude)"), five non-biblical lections ("English translation: AI generated"),
  and audio (AI-generated speech, ElevenLabs).
* **Fonts**: GHEA Mariam and EB Garamond (SIL OFL), see fonts/.
