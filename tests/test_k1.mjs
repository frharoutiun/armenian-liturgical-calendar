// K1: (1) every visible chant segment has English or an explicit explanation; (2) the hand-reviewed chant resolutions;
// (3) the ESV/KJV note on chants; (4) the Armenian text of every reading the engine emits (allowlist of the three documented gaps);
// (5) printed typos that cannot exist are corrected through the explicit table, never asked from the ESV service.
import fs from 'fs';
import { createCalendar } from '../engine/calendar.mjs';
import { esvNote } from '../chants-english.mjs';
const root = decodeURIComponent(new URL('../', import.meta.url).pathname);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  -', m); };
const layer = JSON.parse(fs.readFileSync(root + 'data/calendar/chants_layer.json', 'utf8'));
const CE = JSON.parse(fs.readFileSync(root + 'data/calendar/chants_english.json', 'utf8'));
const ent = CE.entries;

// (1) the page's own rule (calendar.js renderChantSeg): noise is hidden, generic segments are served by the generic table, the rest must say something
const eng = (x) => x && (x.esv_lookup || x.ai_translation || x.kjv_text || x.explanation);
const bare = [];
for (const [k, c] of Object.entries(layer.chants)) c.segments.forEach((s, i) => {
  if (!s.status || s.status === 'empty' || s.status === 'generic') return;
  let e = ent[k + '|' + i];
  if (e && e.incipit && s.incipit && e.incipit !== s.incipit) e = null;
  if (e && e.noise) return;
  const has = (e && (eng(e) || (e.pieces && e.pieces.every((p) => eng(p) || p.alternatives)))) || (s.status === 'matched' && s.english_full);
  if (!has) bare.push(k + '|' + i + ' ' + s.incipit);
});
ok(bare.length === 0, 'no visible chant segment is left without English or an explanation (' + bare.length + ')' + (bare.length ? ': ' + bare.slice(0, 5).join('; ') : ''));
ok(Object.values(ent).every((e) => !e.pieces || e.pieces.every((p) => p.esv_lookup || p.kjv_text || p.ai_translation)), 'every piece of a list segment is resolved, a rubric or a composed text');

// (2) hand-reviewed resolutions
const e1 = ent['CH-0197bf6f3a|0'];
ok(e1 && e1.esv_lookup === 'Psalm 86:2' && e1.armenian_source === 'zhamagirk' && e1.sung_differs && /Save your servant/.test(e1.ai_translation), '«Կեցո զծառայս» = Ps 85:2 (ESV Psalm 86:2) in the Zhamagirk wording, AI translation of the sung words');
ok(ent['CH-d32d5b8d3a|4'] && ent['CH-d32d5b8d3a|4'].esv_lookup === 'Psalm 110:3', '«Ի վայելչութիւն» (printed ՃԹ) = Ps 109:3 (ESV Psalm 110:3)');
ok(ent['CH-a64b21e85a|2'] && ent['CH-a64b21e85a|2'].esv_lookup === 'Psalm 103:1', '«Օրհնեա անձն իմ» in the series from Ճ = Ps 102:1 (ESV Psalm 103:1)');
ok(['CH-68e5d027bf|0', 'CH-360f3fc953|4', 'CH-a7c0b6790e|1', 'CH-dbc13bc310|2'].every((k) => ent[k] && ent[k].esv_lookup === 'Psalm 99:5'), '«Բարձր արարէք» = Ps 98:5 (ESV Psalm 99:5) everywhere it was left open');
ok(['CH-35067e3614|2', 'CH-6f0d3e7517|1', 'CH-7ed69c9804|1'].map((k) => ent[k].esv_lookup).join() === 'Psalm 136:1,Psalm 138:1,Psalm 111:1', '«Խոստովան» takes the number of the psalm after the printed one (135, 137, 110)');
const rub = Object.values(ent).filter((e) => e.rubric);
ok(rub.length >= 5 && rub.every((e) => e.ai_translation && !/[Ա-֏]/.test(e.ai_translation) && !e.esv_lookup), 'printed directions are marked as rubrics, carry a labelled AI translation and no verse (' + rub.length + ')');
const unres = ent['CH-7da096c2eb|0'], unres2 = ent['CH-960800dd80|0'];
ok(unres && unres.explanation && unres.alternatives.includes('Ps 144:5') && !unres.esv_lookup && unres2 && unres2.explanation && !unres2.esv_lookup, 'the two openings no source reproduces say so and list candidates without deciding');
const g = CE.generic['alleluia/martyrs|ԴԿ|0'];
ok(g && g.esv_lookup === 'Psalm 34:19-20' && g.armenian_ref.startsWith('Ps 33:20'), 'generic martyrs Alleluia ԴԿ = Ps 33:20-21 (ESV Psalm 34:19-20)');
ok(Object.values(ent).every((e) => !e.ai_translation || !/[Ա-֏]/.test(e.ai_translation)), 'no Armenian script in any AI translation');

// (3) notes where the ESV differs from the KJV
ok(/omits/.test(esvNote('Acts 8:37')) && /omits/.test(esvNote('Matthew 17:21')), 'ESV omission note for Acts 8:37 and Matthew 17:21');
ok(/Psalm 145:13/.test(esvNote('Psalm 145:13')) && esvNote('Psalm 23:1') === '', 'ESV extra line in Psalm 145:13 noted; an ordinary psalm verse gets no note');

// (4) + (5) the engine's readings
globalThis.fetch = async (u) => { const p = String(u).replace('file://', ''); const b = fs.readFileSync(decodeURIComponent(p)); return { ok: true, json: async () => JSON.parse(b), text: async () => b.toString() }; };
const cal = await createCalendar({ baseUrl: 'file://' + root + 'engine/', dataUrl: 'file://' + root + 'data/calendar/' });
const shards = new Map();
const shard = (s) => { if (!shards.has(s)) { try { shards.set(s, JSON.parse(fs.readFileSync(root + 'data/scripture/arak29/t/' + s + '.json', 'utf8')).citations); } catch (e) { shards.set(s, null); } } return shards.get(s); };
const ALLOW = new Set(['John 13:12', 'Wisdom of Solomon 7:31-8:21', 'Esther 10:9']);   // documented in K1_REPORT.md: open-ended print with no table range; start verse beyond the chapter; Esther 10 is not in Arak29
const missing = new Set(); let n = 0; const keysOn = {};
for (let d = new Date('2026-10-25T00:00:00Z'); d <= new Date('2027-12-31T00:00:00Z'); d = new Date(d.getTime() + 86400000)) {
  const iso = d.toISOString().slice(0, 10); const r = await cal.resolveDay(iso);
  keysOn[iso] = r.readings.map((x) => x.citationKey);
  for (const rd of r.readings) {
    n++;
    const a = rd.arak29, sh = a && shard(a.shard), e = sh && sh[a.key];
    if (!(e && e.verses && e.verses.length)) missing.add(rd.citationKey);
  }
}
const bad = [...missing].filter((k) => !ALLOW.has(k));
ok(n > 1500, 'engine readings checked (' + n + ')');
ok(bad.length === 0, 'every reading of 2026-10-25..2027-12-31 has Armenian text except the documented three' + (bad.length ? ': ' + bad.join('; ') : ' (missing: ' + [...missing].join('; ') + ')'));
const on = async (iso) => (await cal.resolveDay(iso)).readings.map((x) => x.citationKey);
const k0831 = await on('2026-08-31'), k1012 = await on('2026-10-12'), k1123 = await on('2026-11-23');
ok(k0831.includes('Isaiah 44:24-26') && !k0831.includes('Isaiah 24:24-26'), 'printed «ԻԴ. 24-26» is corrected to Isaiah 44:24-26 (2026-08-31)');
ok(k1012.includes('Isaiah 18:7') && !k1012.includes('Isaiah 12:7'), 'printed «ԺԲ. 7» is corrected to Isaiah 18:7 (2026-10-12)');
ok(k1123.includes('Song of Songs 8:14') && !k1123.includes('Song of Songs 4:14-24'), 'printed «Դ. 14 … վ. 24» (Փախիր եղբօրորդի) is corrected to Song of Songs 8:14 (2026-11-23)');
const mk = shard('mark') && shard('mark')['Mark 10:1'];
ok(mk && mk.english_ref_should_be === 'Mark 10:1-12' && mk.verses.length === 12 && /lectionary tables/.test(mk.end_basis || ''), 'open-ended «Mark 10:1» reads 10:1-12 (range from the lectionary tables) and asks the ESV for the whole range');
console.log(fails ? 'FAILED ' + fails : 'K1 tests ok');
process.exit(fails ? 1 : 0);
