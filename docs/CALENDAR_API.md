# Calendar tab: UI contract

`calendar.js` (ES module) loads `engine/calendar.mjs` (`createCalendar()`, schema `liturgical-day/1.0`, see docs/ENGINE_API.md) and renders
`resolveDay(input)`: date, weekday, commemorations (Armenian + English with provenance), mode, fasting, readings (citation, service, flags),
chants, hymns (with links into the hymnal via `LCS.openByHymnId(hymnId)`), canons, unresolved/provisional items.
URL: `?tab=calendar&date=YYYY-MM-DD` (the hymnal keeps using the `#` fragment).

Optional hooks (set before or after load; all async-safe):
* `window.LCalendarHooks.readingBody(reading, day)` -> `Promise<string|HTMLElement|null>`: fills the slot under each reading (English scripture
  ESV loaded live from the ACHR endpoint (RSVCE cached for Apocrypha), Armenian Jashots text, audio player). `reading.citationKey` / `reading.citationEn` identify the passage.
* `window.LCalendarHooks.afterRender(day, rootElement)`: post-processing.
Hymnal API: `window.LCS.openHymn(section, stanzaIdx, verseIdx)`, `openByAnchor("AS-...")`, `openByHymnId("SH...")`, `ready` (promise), `anchorMap`.
Scan viewer: `window.ScanViewer.show(page, [col,line,col,line]?)`; deep link `?scan=168`.
