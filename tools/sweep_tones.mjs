// Y3: tone-mix sweep. For every day of the given years and every canon part, count the distinct tones among the part's hymns:
// a part showing several tones' hymns means the engine took a whole by-tone series instead of the day's own tone block.
//   node tools/sweep_tones.mjs 2026 2027 [--out path.json]
import { createCalendar } from '../engine/calendar.mjs';
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
const years = args.filter((a) => /^\d{4}$/.test(a)).map(Number); if (!years.length) years.push(2027);
const oi = args.indexOf('--out'), outPath = oi >= 0 ? args[oi + 1] : null;
if (process.env.Y3_OFF) globalThis.__Y3_OFF = true;   // baseline: engine without the tone-block selection
const cal = await createCalendar({ baseUrl: new URL('engine/', root).href, dataUrl: new URL('data/calendar/', root).href });
const res = { years: {}, mixedParts: {}, examples: [] };
for (const year of years) {
  const st = { days: 0, parts: 0, mixedParts: 0, wrongToneParts: 0, stanzasInMixed: 0, allLocated: 0, toneGap: 0 };
  const n = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
  for (let i = 0; i < n; i++) {
    const iso = new Date(Date.UTC(year, 0, 1 + i)).toISOString().slice(0, 10);
    const r = await cal.resolveDay(iso); st.days++;
    const dm = r.mode && r.mode.armenian;
    if (r.canon.summary.allPartsLocated) st.allLocated++;
    for (const p of r.canon.parts) {
      if (!p.hymns || !p.hymns.length) continue;
      st.parts++;
      const modes = new Set(p.hymns.map((h) => h.mode).filter(Boolean));
      const stanzas = p.hymns.reduce((a, h) => a + ((h.stanzaIds || []).length), 0);
      if (p.toneSeriesGap) st.toneGap++;
      if (modes.size >= 3 && !p.hymns.some((h) => h.namedByRubric)) {
        st.mixedParts++; st.stanzasInMixed += stanzas;
        const k = p.part + '|' + (p.from[0] ? String(p.from[0].title).replace(/\s+/g, ' ').trim().slice(0, 50) : '');
        res.mixedParts[k] = (res.mixedParts[k] || 0) + 1;
        if (res.examples.length < 12) res.examples.push({ date: iso, part: p.part, dayMode: dm, modes: [...modes], stanzas });
      }
    }
  }
  res.years[year] = st;
}
console.log(JSON.stringify(res.years, null, 1));
console.log('top mixed (part|canon):', JSON.stringify(Object.entries(res.mixedParts).sort((a, b) => b[1] - a[1]).slice(0, 15), null, 0));
if (outPath) fs.writeFileSync(outPath, JSON.stringify(res, null, 1));
