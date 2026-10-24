// Learn which service (Jashoo / Matins / ...) a Hador 1 reading belongs to, from the 2001-2040 lectionary tables:
// for every date, join the engine's readings (record ordinal + passage) with the FINAL readings for that date.
// Output data/calendar/record_service.json: "ordinal|passage" -> [[class,label,count],...]. Year-independent.
// node tools/build_service_table.mjs
import fs from 'node:fs';
import { createCalendar, intervals, overlapFraction, normBook } from '../engine/calendar.mjs';
const PROJ = process.env.DIGI || '/Users/frharoutiun/Documents/Church/Coding/06 - Donatsooyts Digitization';
const cal = await createCalendar();
const table = new Map();
let joined = 0, engineOnly = 0;
for (let y = 2001; y <= 2040; y++) {
  const fin = JSON.parse(fs.readFileSync(`${PROJ}/output/final/readings/FINAL_by_date/${y}.json`, 'utf-8'));
  const byDate = new Map(fin.days.map((d) => [d.date, d]));
  for (const [date, fd] of byDate) {
    const svc = fd.services || {}, fl = [];
    const add = (cls, label, rs) => { for (const r of rs || []) if (r.citation) fl.push({ b: normBook(r.citation.book), iv: intervals(r.citation), cls, label }); };
    add('jashoo', 'Divine Liturgy (Synaxis)', svc.jashoo);
    for (const o of svc.other || []) add('other', o.service_label || 'other', o.readings);
    add('unclassified', 'unclassified', svc.unclassified);
    const r = cal.resolveDay(date);
    for (const rd of r.readings) {
      const A = intervals(rd.passage);
      let best = null, bf = 0.5;
      for (const f of fl) if (f.b === normBook(rd.passage.book)) { const o = Math.max(overlapFraction(A, f.iv), overlapFraction(f.iv, A)); if (o >= bf) { bf = o; best = f; } }
      const cls = best && [best.cls, best.label];
      if (!cls) { engineOnly++; continue; }
      joined++;
      const key = `${rd.recordOrdinal}|${rd.citationKey}`;
      const m = table.get(key) || new Map();
      const kk = cls.join('|'); m.set(kk, (m.get(kk) || 0) + 1); table.set(key, m);
    }
  }
}
const out = {};
for (const [k, m] of table) out[k] = [...m].map(([c, n]) => [...c.split('|'), n]).sort((a, b) => b[2] - a[2]);
fs.writeFileSync(new URL('../data/calendar/record_service.json', import.meta.url), JSON.stringify({ schema: 'record-service/1.0', source: 'engine readings joined to output/final/readings/FINAL_by_date 2001-2040', joined, engineOnly, keys: out }));
console.log(JSON.stringify({ keys: Object.keys(out).length, joined, engineOnly }));
