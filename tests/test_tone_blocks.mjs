// Y3: canons printed BY TONE give a day only the block of its own tone (never the whole series, never silently another tone);
// feast canons whose hymns merely carry different tones keep all their hymns.
import { createCalendar } from '../engine/calendar.mjs';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const cal = await createCalendar({ baseUrl: new URL('engine/', root).href, dataUrl: new URL('data/calendar/', root).href });
const part = (r, name) => r.canon.parts.find((p) => p.part === name);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. Easter+14 Sunday (tone ԴՁ): Harts / Metsatsutse / Voghormya hold only tone ԴՁ hymns, not 49-95 stanzas of three tones
{ const r = await cal.resolveDay('2026-04-19');
  for (const name of ['harts', 'metsatsutse', 'voghormya']) { const p = part(r, name); ok(p.hymns.length > 0, name + ' located'); ok(p.hymns.every((h) => h.mode === 'ԴՁ'), name + ' only the day\'s tone'); }
  ok(part(r, 'orhnutyun').hymns.every((h) => h.mode === 'ԴՁ'), 'Orhnutyun set of the day\'s tone (Y2)'); }

// 2. a tone-series canon without a block for the day's tone: stated gap, no other tone's hymns from that canon
{ let gapDay = null;
  for (let i = 0; i < 365 && !gapDay; i++) { const iso = new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10); const r = await cal.resolveDay(iso);
    const p = r.canon.parts.find((x) => x.toneSeriesGap); if (p) gapDay = { iso, r, p }; }
  ok(gapDay, 'a day with a tone-series gap exists in 2027');
  const g = gapDay.p.toneSeriesGap;
  ok(!gapDay.p.tonesPrinted && g.tonesPrinted.length >= 2 && !g.tonesPrinted.includes(g.dayTone), 'the day\'s tone is not among the tones the canon prints');
  ok(/no .* for this day's tone/.test(gapDay.p.note), 'the gap is stated in the note');
  ok(!gapDay.p.hymns.some((h) => h.canonId === g.canonId), 'nothing from that canon is shown in its place'); }

// 3. across 2027: a part taken from a tone series never mixes tones (blocks carry toneSet)
{ let blocks = 0;
  for (let i = 0; i < 365; i++) { const iso = new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10); const r = await cal.resolveDay(iso);
    for (const p of r.canon.parts) { const ts = p.hymns.filter((h) => h.toneSet); if (!ts.length) continue; blocks++;
      assert.ok(ts.every((h) => h.toneSet.tone === ts[0].toneSet.tone && h.mode === h.toneSet.tone || h.toneSet.tone === ts[0].toneSet.tone), iso + ' ' + p.part + ' mixes tones'); } }
  ok(blocks > 100, 'tone blocks selected on many part-days: ' + blocks); }

// 4. a feast canon (Ascension) keeps all its hymns of different tones
{ const r = await cal.resolveDay('2026-05-14'); const p = part(r, 'harts');
  ok(p.hymns.length >= 5, 'Ascension Harts hymns kept (' + p.hymns.length + ')'); ok(new Set(p.hymns.map((h) => h.mode)).size >= 2, 'Ascension Harts keep several tones'); }

console.log('tone-block tests ok ' + n + '/' + n);
