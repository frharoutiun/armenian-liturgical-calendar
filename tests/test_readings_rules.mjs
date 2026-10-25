// node tests/test_readings_rules.mjs : rule-layer fixes for the readings (citation composed from the parse, numeral/book repair, supplements, Zechariah)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCalendar } from '../engine/calendar.mjs';
import { repairSegment } from '../engine/validate.mjs';
import { citationEnglish } from '../engine/citations.mjs';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok  -', name); };
const cal = await createCalendar();
const CV = JSON.parse(fs.readFileSync(new URL('../data/calendar/chapter_verses.json', import.meta.url), 'utf8'));
const day = (d) => cal.resolveDay(d);
const cites = (r) => r.readings.map((x) => x.citationEn);

ok('citation composed from the parse when the Jashots index is silent (Wisdom opening reading)', () => {
  assert.equal(citationEnglish({ book: 'Wisdom of Solomon', ch1: 3, v1: 1, ch2: 3, v2: 8 }), 'Wisdom 3:1-8');
  assert.equal(citationEnglish({ book: '1 Samuel (Armenian: 1 Kingdoms, Ա. Թագաւորաց)', ch1: 6, v1: 18, ch2: 7, v2: 2 }), '1 Samuel 6:18-7:2');
  const r = day('2026-10-31');
  assert.ok(cites(r).includes('Wisdom 3:1-8'), cites(r).join(' | '));
  const w = r.readings.find((x) => x.citationEn === 'Wisdom 3:1-8');
  assert.equal(w.service.class, 'jashoo');
});
ok('numeral repair: only an impossible reference, one look-alike substitution, recorded', () => {
  const rep = (b, s) => repairSegment(CV, b, s);
  assert.deepEqual(rep('Acts', { ch1: 3, v1: 13, ch2: 3, v2: 31 }).seg, { ch1: 4, v1: 13, ch2: 4, v2: 31 });
  assert.deepEqual(rep('Ezekiel', { ch1: 4, v1: 16, ch2: 4, v2: 19 }).seg, { ch1: 3, v1: 16, ch2: 3, v2: 19 });
  assert.deepEqual(rep('Exodus', { ch1: 17, v1: 27, ch2: 16, v2: 1 }).seg, { ch1: 15, v1: 27, ch2: 16, v2: 1 });
  assert.equal(rep('Acts', { ch1: 4, v1: 13, ch2: 4, v2: 31 }).status, 'ok');                 // valid references are never touched
  assert.equal(rep('Isaiah', { ch1: 45, v1: 16, ch2: 45, v2: 26 }).status, 'invalid');        // no unique look-alike repair: flagged, not changed
});
ok('book repair: bracketed correction (Mark 26 -> Matthew) and numbered family (2 Peter 4 -> 1 Peter)', () => {
  let m = 0, p = 0;
  for (const d of ['2026-04-02', '2027-03-25']) { const r = day(d); if (r.readings.some((x) => x.citationEn && /^Matthew 26:17-30/.test(x.citationEn))) m++; }
  for (const d of ['2026-05-02']) { const r = day(d); if (r.readings.some((x) => x.flags.includes('book_repair'))) p++; }
  assert.ok(m >= 1, 'Matthew 26:17-30 on Holy Thursday');
  assert.ok(p >= 1, '2 Peter 4 repaired to 1 Peter');
});
ok('Hador 1 readings_unparsed scripture is read: Zechariah 3:7-4:9 on the feast of the prophet Zechariah', () => {
  const r = day('2026-06-30');
  assert.ok(cites(r).some((c) => /^Zechariah 3:7/.test(c)), cites(r).join(' | '));
});
ok('record supplements: the Sons of Thunder record gets its Acts / Catholic epistle / Gospel (year independent)', () => {
  for (const d of ['2026-12-29', '2031-12-29', '2050-12-29']) {
    const r = day(d);
    if (!r.commemorations.some((c) => /Որոտման/.test(c.armenian || ''))) continue;
    const c = cites(r).join(' | ');
    assert.ok(/Acts 12:1-11/.test(c) && /John 21:20-25/.test(c), d + ': ' + c);
    const s = r.readings.find((x) => x.flags.includes('lectionary_table_supplement'));
    assert.ok(s && s.supplement && s.supplement.daysTotal >= 2, 'supplement provenance');
  }
});
console.log(n + ' tests ok');
