# Calendar engine API (W4)

```js
import { createCalendar } from './engine/calendar.mjs';
const cal = await createCalendar();          // browser: fetches engine/calgen/rulebook/* and data/calendar/*; node: reads files
const day = cal.resolveDay('2027-03-28');    // 'YYYY-MM-DD', 'M/D/YYYY', {y,m,d}, or a Date (read as its LOCAL civil date). Years 1583-9999.
```
A typed date is a civil date: no clock, no time zone, so it never shifts (tested under America/New_York, UTC, Pacific/Auckland).
Invalid input returns `{schema, error}`; nothing is guessed.

## Record (`schema: liturgical-day/1.0`)
`date, weekday, year, civil, easter, easterOffset, mode{number,armenian,since}, table, status('placed'|'unresolved'|'no_readings_appointed'), provisional`
- `commemorations[]`: `armenian, bookHeadingArmenian, english, englishStatus('sourced'|'composed'|null), englishProvenance, role, kind, recordOrdinal, rule, ruleStatus, series[]`. `sourced` = a published English name (Vemkar / ACHR); `composed` = built from components, not a published name.
- `fasting`: `status, label, rule, ruleStatus, basis, provisional, openQuestions[]` (Lenten Saturdays and the Elijah / St Gregory fast days are flagged as open questions).
- `readings[]`: `verbatimArmenian` (Hador 1), `passage` {book,ch,v}, `citationKey`, `citationEn`, `citationIndexMatch('exact'|'overlapping...'|'none')`, `service{class,label,basis,share,confident,alternatives,level}`, `jashots{chains[{chain_id,pdf_pages,printed_page}],introEn,introHy}`, `flags`, `needsPageCheck`.
  Service class is printed in Hador 1 when present; otherwise learned from the 2001-2040 tables per (Hador 1 record, passage) and flagged `confident:false` when ambiguous.
- `chants[]`: psalm / meseti / alleluia lines from Hador 1.
- `hymns[]`: `source('hador1 #n'|'hador2 id'), type, incipit, mode, status('linked_high'|'linked_medium'|'ambiguous'|'unlinked'), links[{hymnId, sectionId, sectionTitle, pages, modeAgrees, inDayCanon}], method, note`. Candidates for `ambiguous` are not a decision.
- `canons[]`: canon-level links from Hador 1 records to Sharagnots sections (`mapped:false` when the canon title has no section match).
- `unresolved[]`: every field the engine could not settle, with the reason. `provenance`: the claims (rule id, status, records, pages) behind the day.

## Data (data/calendar, rebuilt by tools/)
`readings_index.json` (passage -> Jashots chain ids, pages, intro lines, service observations), `record_service.json` (record|passage -> service), `hymn_index.json` (Sharagnots hymns by incipit key), `record_canons.json`.
Rebuild: `python3 tools/build_calendar_data.py && node tools/build_service_table.mjs`. Check: `node tests/test_calendar.mjs`, `node tools/validate_vs_final.mjs`.
