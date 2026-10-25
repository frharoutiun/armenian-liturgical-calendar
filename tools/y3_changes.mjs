// Y3: list the canon parts whose hymns change when the tone-block selection is on (2027), with the first hymn's page and tone before/after
import { createCalendar } from '../engine/calendar.mjs';
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const cal = await createCalendar({ baseUrl: new URL('engine/', root).href, dataUrl: new URL('data/calendar/', root).href });
const snap = async (off) => { globalThis.__Y3_OFF = off; const m = new Map();
  for (let i = 0; i < 365; i++) { const iso = new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10); const r = await cal.resolveDay(iso);
    for (const p of r.canon.parts) m.set(iso + '|' + p.part, { mode: r.mode.armenian, part: p.part, n: p.hymns.length, ids: p.hymns.map((h) => h.hymnId).join(','), pages: [...new Set(p.hymns.map((h) => h.page))], modes: [...new Set(p.hymns.map((h) => h.mode))], from: p.from[0] ? String(p.from[0].title).replace(/\s+/g, ' ').trim().slice(0, 40) : '', gap: !!p.toneSeriesGap, sets: p.toneSets || 0 }); }
  return m; };
const before = await snap(true), after = await snap(false);
const out = [];
for (const [k, a] of after) { const b = before.get(k); if (b && b.ids !== a.ids) out.push({ key: k, mode: a.mode, part: a.part, from: a.from, before: { n: b.n, modes: b.modes, pages: b.pages.slice(0, 6) }, after: { n: a.n, modes: a.modes, pages: a.pages.slice(0, 6), gap: a.gap, sets: a.sets } }); }
fs.writeFileSync(process.argv[2] || 'y3_changes.json', JSON.stringify(out, null, 1));
console.log('changed part-days 2027:', out.length, 'gaps:', out.filter((o) => o.after.gap).length, 'filtered to the tone block:', out.filter((o) => !o.after.gap).length);
