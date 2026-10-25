// C1: how many "X ՚ի ձայնէն" generic chants a year has and how many resolve to a Zhamagirk generic verse. usage: node tools/sweep_generic_chants.mjs 2027
import fs from 'node:fs';
import { resolveGeneric } from '../generic-chants.mjs';
import { createCalendar } from '../engine/calendar.mjs';
const root = decodeURIComponent(new URL('../', import.meta.url).pathname);
globalThis.fetch = async (u) => { const p = decodeURIComponent(String(u).replace('file://', '')); const b = fs.readFileSync(p); return { ok: true, json: async () => JSON.parse(b), text: async () => b.toString() }; };
const table = JSON.parse(fs.readFileSync(root + 'data/calendar/generic_chants.json', 'utf8'));
const year = +process.argv[2] || 2027;
const cal = await createCalendar({ baseUrl: 'file://' + root + 'engine/', dataUrl: 'file://' + root + 'data/calendar/' });
const rows = []; const tally = {};
for (let i = 0; i < (year % 4 === 0 && (year % 100 || year % 400 === 0) ? 366 : 365); i++) {
  const d = new Date(Date.UTC(year, 0, 1 + i)).toISOString().slice(0, 10);
  const day = cal.resolveDay(d);
  for (const c of day.chants || []) {
    const seg = (c.segments || []).find((s) => s.status === 'generic');
    if (!seg) continue;
    const r = resolveGeneric(seg.generic, { mode: day.mode && day.mode.armenian, weekday: day.weekday, fasting: day.fasting, recordOrdinal: c.recordOrdinal, commemorations: (day.commemorations || []).map((x) => x.armenian) }, table);
    const key = r.status === 'resolved' ? 'resolved/' + r.review_status : 'unresolved: ' + r.why;
    tally[key] = (tally[key] || 0) + 1;
    rows.push({ date: d, weekday: day.weekday, mode: day.mode && day.mode.armenian, kind: c.kind, rubric: c.verbatim, category: r.inputs.category, basis: r.inputs.category_basis, status: r.status, review: r.review_status, page: r.entries && r.entries[0] && r.entries[0].page, verse: r.entries && r.entries[0] && r.entries[0].armenian_full, why: r.why || null, commemoration: r.inputs.commemoration });
  }
}
const outp = process.argv[3];
if (outp) fs.writeFileSync(outp, JSON.stringify(rows, null, 1));
console.log(year, 'generic chants:', rows.length, JSON.stringify(tally, null, 1));
