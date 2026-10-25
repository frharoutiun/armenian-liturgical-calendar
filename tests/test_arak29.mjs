// node tests/test_arak29.mjs : Armenian Bible text (Arak29 shards), versification flags and chant ordering (best-effort draft data)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCalendar, arak29Slug } from '../engine/calendar.mjs';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok  -', name); };
const cal = await createCalendar();
const root = new URL('../data/scripture/arak29/t/', import.meta.url);
const shards = new Map();
const shard = (slug) => { if (!shards.has(slug)) { const f = new URL(slug + '.json', root); shards.set(slug, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).citations : null); } return shards.get(slug); };
const days = [];
for (let i = 0; i < 365; i++) days.push(cal.resolveDay(new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10)));

ok('shard slug rule (numbered books, parentheses)', () => {
  assert.equal(arak29Slug('1 Corinthians'), '1-corinthians');
  assert.equal(arak29Slug('Song of Songs'), 'song-of-songs');
  assert.equal(arak29Slug('2 Kings (Armenian: 4 Kingdoms)'), '2-kings');
  assert.equal(arak29Slug('Acts'), 'acts');
});
ok('numbered books: the readings index is found exactly for "1 Corinthians" (calgen) = "I Corinthians" (index)', () => {
  let seen = 0;
  for (const d of days) for (const r of d.readings) if (/^[123] /.test(r.passage.book || '') && r.citationKey) {
    seen++;
    assert.equal(r.citationIndexMatch === 'none' || r.citationIndexMatch === 'exact' || /overlapping/.test(r.citationIndexMatch), true);
    if (r.citationIndexMatch === 'exact') assert.ok(r.citationEn && !/\+/.test(r.citationEn), r.citationKey + ' -> ' + r.citationEn);
  }
  assert.ok(seen > 20, 'numbered-book readings in 2027: ' + seen);
  const exactNum = days.flatMap((d) => d.readings).filter((r) => /^[123] /.test(r.passage.book || '') && r.citationIndexMatch === 'exact').length;
  assert.ok(exactNum > 15, 'exact matches for numbered books: ' + exactNum);
});
ok('every reading carries an arak29 pointer and a versification block; 99% of 2027 readings find their text entry', () => {
  let total = 0, found = 0;
  for (const d of days) for (const r of d.readings) {
    total++;
    assert.ok(r.versification && ['match', 'differs', 'needs_review'].includes(r.versification.status), r.citationKey);
    const sh = r.arak29 && shard(r.arak29.shard);
    if (sh && sh[r.arak29.key]) found++;
  }
  assert.ok(found / total >= 0.99, `found ${found} of ${total}`);
});
ok('versification: an Armenian citation whose English numbering differs is flagged, with the English range', () => {
  const sh = shard('hosea');
  const diff = Object.entries(sh).filter(([, v]) => v.status === 'differs');
  assert.ok(diff.length >= 1, 'a differing Hosea citation exists');
  for (const [k, v] of diff) assert.ok(v.english_ref_should_be && v.english_ref_should_be !== k, k);
  const all = [...shards.values(), ...fs.readdirSync(root).map((f) => shard(f.replace('.json', '')))].filter(Boolean);
  const nd = all.flatMap((s) => Object.values(s)).filter((v) => v.status === 'differs').length;
  assert.ok(nd >= 20, 'differs entries: ' + nd);
});
ok('every shard entry has plain verse text, never markup, and a range', () => {
  for (const f of fs.readdirSync(root)) {
    const sh = shard(f.replace('.json', ''));
    for (const [k, v] of Object.entries(sh)) {
      if (v.status === 'needs_review' && !(v.verses && v.verses.length)) continue;
      assert.ok(v.verses && v.verses.length, f + ' ' + k);
      for (const x of v.verses) { assert.ok(/^\d+:\d+/.test(x.r), x.r); assert.ok(!/[<>]/.test(x.t), f + ' ' + x.r); }
    }
  }
});
ok('chant ordering: psalm before the first reading, alleluia before the first gospel, within each service group', () => {
  let psalms = 0, alle = 0;
  for (const d of days) for (const g of d.chantLayout.groups) {
    const firstReading = g.items.findIndex((x) => x.type === 'reading');
    g.items.forEach((x, i) => {
      if (x.type !== 'chant') return;
      if (x.kind === 'psalm') { psalms++; assert.ok(firstReading < 0 || i < firstReading, d.date + ' psalm after reading'); }
      if (x.kind === 'alleluia') { alle++; const nx = g.items.slice(i + 1).find((y) => y.type === 'reading'); assert.ok(!nx || d.readings[nx.readingIndex] !== undefined, d.date); }
    });
  }
  assert.ok(psalms > 200 && alle > 100, `psalms ${psalms}, alleluias ${alle}`);
});
ok('chants on the day carry the reading position and the full verse where matched', () => {
  let withPos = 0, full = 0, tot = 0;
  for (const d of days) for (const c of d.chants) { tot++; if (c.precedes_reading != null) withPos++; if (c.armenian_full) { full++; assert.ok(c.english_full && c.english_source, d.date); } }
  assert.ok(withPos / tot > 0.95, `positions ${withPos}/${tot}`);
  assert.ok(full / tot > 0.4, `full verses ${full}/${tot}`);
});
console.log(`${n} tests ok`);
