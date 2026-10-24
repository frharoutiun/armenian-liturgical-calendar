// node tests/test_scripture_match.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normBook, buildLookup, findCitations, bibleGatewayUrl } from '../scripture-match.mjs';
import { createCalendar } from '../engine/calendar.mjs';
assert.equal(normBook('II Corinthians'), '2corinthians');
assert.equal(normBook('2 Corinthians'), '2corinthians');
assert.equal(normBook('2 Kings (Armenian: 4 Kingdoms, Դ. Թագաւորաց)'), '2kings');
assert.equal(normBook('Wisdom of Solomon'), 'wisdom');
const idx = JSON.parse(readFileSync(new URL('../data/scripture/index.json', import.meta.url))).citations;
const lk = buildLookup(idx);
const cal = await createCalendar();
let n = 0, hit = 0;
for (const iso of ['2027-03-28', '2026-12-25', '2028-02-29', '1999-04-11', '2040-10-14', '2100-01-06']) {
  const d = cal.resolveDay(iso);
  assert.ok(!d.error, iso);
  assert.ok(d.commemorations.length >= 1 || d.status !== 'placed', iso + ' has no commemoration');
  for (const r of d.readings || []) { n++; if (findCitations(lk, r.passage).every((x) => x.key)) hit++; }
  for (const r of d.readings || []) assert.ok(bibleGatewayUrl(r.passage).startsWith('https://www.biblegateway.com/'));
}
assert.ok(hit / n > 0.9, `cache match rate ${hit}/${n}`);
console.log('scripture-match tests ok', hit + '/' + n);
