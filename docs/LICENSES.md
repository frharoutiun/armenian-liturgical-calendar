# Licences and attribution

* **Scripture (English)**: Revised Standard Version of the Bible, Catholic Edition (RSVCE), copyright 1965, 1966 the Division of Christian Education of
  the National Council of the Churches of Christ in the United States of America. Used by permission. All rights reserved. The text is the same RSVCE that
  the ACHR site (achrct.com) requests from BibleGateway; it is cached here so the static site needs no live fetch. The owner explicitly chose to embed the
  cached text (2026-10-24). The project guard `tools/publish_check.py` (digitization project) normally blocks RSV text from builds; it was overridden
  knowingly for this owner decision. To take the English text down: rebuild the scripture cache with `--no-english` (see data/scripture/README.md) and redeploy.
  The ESV (Crossway) is not cached or stored.
* **Hymnal code, data and design**: frharoutiun/Armenian-Church-Tools (sharagan/), the owner's own work (vendored snapshot in vendor/krapar-upstream/).
* **Sharagnots text**: the 1888 Etchmiadzin Sharagnots (printed scan) and a typed Unicode text supplied by Fr Ghevond Ajemian (2026-10-20).
* **Prayers by Fr Arshen** (where shown): attributed to him; used with his permission.
* **AI products** are labelled in the interface: hymn translations ("AI translation (Claude)"), five non-biblical lections ("English translation: AI generated"),
  and audio (AI-generated speech, ElevenLabs).
* **Fonts**: GHEA Mariam and EB Garamond (SIL OFL), see fonts/.
