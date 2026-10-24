// Gathers, over several years of days, which part of its canon the Tonatsoyts assigns to each Sharagnots hymn it names
// (type Հարց -> Harts, Ճաշու -> Jashoo, Համբարձի -> Hampartsi ...). Used to find part boundaries inside canons whose book labels are missing.
//   node tools/build_canon_marks.mjs [years...]   -> data/calendar/canon_marks.json
import { createCalendar } from '../engine/calendar.mjs';
import { partsOfType } from '../engine/canon.mjs';
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const years = process.argv.slice(2).map(Number).filter(Boolean); if (!years.length) years.push(2026, 2027, 2028, 2029);
const cal = await createCalendar({ baseUrl: new URL('engine/', root).href, dataUrl: new URL('data/calendar/', root).href });
const acc = {};
for (const year of years) for (let i = 0; i < 366; i++) {
  const d = new Date(Date.UTC(year, 0, 1 + i)); if (d.getUTCFullYear() !== year) break;
  const r = cal.resolveDay(d.toISOString().slice(0, 10));
  for (const h of r.hymns) {
    if (!h.resolved || h.status !== 'linked_exact' || (h.candidates && h.candidates.length)) continue;   // only openings printed in exactly one place
    const ps = partsOfType(h.type); if (!ps.length) continue;
    const e = ((acc[h.resolved.sectionId] ||= {})[h.resolved.hymnId] ||= { parts: {}, n: 0, exact: 0, types: {} });
    e.parts[ps[0]] = (e.parts[ps[0]] || 0) + 1; e.n++; if (h.status === 'linked_exact') e.exact++; e.types[h.type] = (e.types[h.type] || 0) + 1;
    if (ps.length > 1) { e.also = ps.slice(1); }
  }
}
const marks = {}; let n = 0;
for (const [cid, hs] of Object.entries(acc)) for (const [hid, e] of Object.entries(hs)) {
  const best = Object.entries(e.parts).sort((a, b) => b[1] - a[1])[0];
  // only marks the rubric repeats consistently
  if (e.parts && Object.keys(e.parts).length > 1 && best[1] < 0.7 * e.n) continue;
  (marks[cid] ||= {})[hid] = { part: best[0], n: e.n, exact: e.exact, ...(e.also ? { also: e.also } : {}) }; n++;
}
const out = { schema: 'canon-marks/1.0', source: 'Tonatsoyts Hador 1/2 hymn types resolved by engine/hymns.mjs over ' + years.join(','), years, marks };
fs.writeFileSync('data/calendar/canon_marks.json.tmp', JSON.stringify(out)); fs.renameSync('data/calendar/canon_marks.json.tmp', 'data/calendar/canon_marks.json');
console.log(JSON.stringify({ canons: Object.keys(marks).length, marks: n }));
