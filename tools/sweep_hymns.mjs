// Sweep a year (or range) of days through the engine and report hymn-resolution quality; optionally write the review queue.
//   node tools/sweep_hymns.mjs [year=2027] [--queue path.json] [--verbose]
import { createCalendar } from '../engine/calendar.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
const years = args.filter((a) => /^\d{4}$/.test(a)).map(Number); if (!years.length) years.push(2027);
const qi = args.indexOf('--queue'), queuePath = qi >= 0 ? args[qi + 1] : null;
const cal = await createCalendar({ baseUrl: new URL('engine/', root).href, dataUrl: new URL('data/calendar/', root).href });
const queue = new Map(); const summaries = []; const partQueue = new Map();
for (const year of years) {
const st = {}; const partSt = {}; let daysCanonComplete = 0; let days = 0, daysCertain = 0, daysNoHymn = 0, multiPage = 0; const bad = [];
for (let i = 0; i < ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365); i++) {
  const iso = new Date(Date.UTC(year, 0, 1 + i)).toISOString().slice(0, 10);
  const r = cal.resolveDay(iso); days++;
  const hs = r.hymns || []; if (!hs.length) daysNoHymn++;
  let complete = true;
  for (const p of r.canon.parts) {
    partSt[p.status] = (partSt[p.status] || 0) + 1;
    if (p.status === 'missing' || p.status === 'from_rubric') {
      complete = false;
      const prim = r.canon.canons.find((c) => c.role === 'primary'); const key = (prim ? prim.title.replace(/\s+/g, ' ').trim() : 'no feast canon located') + '|' + p.part;
      const q = partQueue.get(key) || { canon: prim ? prim.title.replace(/\s+/g, ' ').trim() : null, canonPage: prim ? prim.startPage : null, part: p.part, status: p.status, candidates: p.candidates, days: [] }; if (q.days.length < 5) q.days.push(iso); partQueue.set(key, q);
    }
  }
  if (complete) daysCanonComplete++;
  let ok = true;
  for (const h of hs) {
    st[h.status] = (st[h.status] || 0) + 1;
    if (!h.resolved) { ok = false; const k = (h.incipit || '') + '|' + (h.mode || '') + '|' + (h.type || ''); const q = queue.get(k) || { type: h.type, incipit: h.incipit, mode: h.mode, status: h.status, basis: h.basis, candidates: h.candidates, days: [], sources: new Set() }; if (q.days.length < 5) q.days.push(iso); q.sources.add(h.source); queue.set(k, q); }
    if ((h.links || []).length > 1) multiPage++;
  }
  if (hs.length && ok) daysCertain++; else if (hs.length) bad.push(iso);
}
const out = { year, days, daysNoHymn, daysWithHymns: days - daysNoHymn, daysEveryHymnResolved: daysCertain, daysWholeCanonLocated: daysCanonComplete, canonPartStatus: partSt, hymnStatus: st, multiPageLinks: multiPage, reviewItems: queue.size };
summaries.push(out); console.log(JSON.stringify(out));
}
if (queuePath) {
  const items = [...queue.values()].map((q) => ({ ...q, sources: [...q.sources].slice(0, 6) }));
  fs.writeFileSync(queuePath + '.tmp', JSON.stringify({ generated: new Date().toISOString(), years, summaries, distinctItems: items.length, items, missingParts: [...partQueue.values()] }, null, 1)); fs.renameSync(queuePath + '.tmp', queuePath);
}
