// node tests/test_g2_rules.mjs : G2 rule-layer additions: collision of saint commemorations, Holy Saturday ruling, source-attested supplements, repaired printed numerals
import assert from 'node:assert/strict';
import { createCalendar } from '../engine/calendar.mjs';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok  -', name); };
const cal = await createCalendar();
const day = (d) => cal.resolveDay(d);
const keys = (r) => r.readings.map((x) => x.citationKey || x.citationEn);
const has = (r, re) => r.readings.some((x) => re.test(x.citationEn || ''));

ok('collision: of two saint commemorations on one day only the first one\'s readings are read (2026-10-27: Hipirichians kept, Severian dropped)', () => {
  const r = day('2026-10-27');
  assert.ok(has(r, /Proverbs 12:8-13/), keys(r).join(' | '));
  assert.ok(!has(r, /Proverbs 15:27/), keys(r).join(' | '));
  assert.ok((r.secondaryReadings || []).some((x) => /Proverbs 15:27/.test(x.citationEn || '')), 'the dropped readings are kept for transparency');
  assert.ok((r.secondaryReadings || []).every((x) => x.flags.includes('collision_secondary_commemoration')));
});
ok('collision: a commemoration without readings does not take the day (2027-11-18)', () => {
  const r = day('2027-11-18');
  assert.ok(r.readings.length > 0, 'readings of the first commemoration that has some');
});
ok('owner ruling: Holy Saturday Divine Liturgy has 1 Corinthians 15:1-11 and Matthew 28:1-20 (any year)', () => {
  for (const d of ['2027-03-27', '2028-04-15', '2031-04-12']) {
    const r = day(d);
    assert.equal(r.easterOffset, -1, d);
    assert.ok(has(r, /Corinthians 15:1-11/) && has(r, /Matthew 28:1-20/), d + ': ' + keys(r).join(' | '));
    const m = r.readings.find((x) => /Matthew 28:1-20/.test(x.citationEn || ''));
    assert.equal(m.service.class, 'jashoo');
  }
});
ok('supplements carry their basis: source attested vs learned from the reconciled tables', () => {
  const r = day('2026-11-02');   // Sons of Thunder family record: Ephesians 3:1-10 is attested by a Jashots record that also holds the record's other readings
  const s = r.readings.find((x) => x.supplement);
  assert.ok(s && s.supplement.basis, 'supplement with basis');
  const all = [];
  for (const d of ['2026-11-02', '2027-03-31', '2027-05-30', '2026-12-05']) for (const x of day(d).readings) if (x.supplement) all.push(x.supplement.basis);
  assert.ok(all.every((b) => b === 'source_attested' || b === 'learned_from_reconciled'), all.join(','));
});
ok('printed numerals misread by the digitisation are repaired from the page\'s incipit/end words (explicit, reviewed table)', () => {
  const want = { '2026-08-31': /Isaiah 44:24-26/, '2026-10-12': /Isaiah 18:7/, '2026-07-23': /Numbers 20:23-29/, '2026-11-23': /Song of Songs 8:14/, '2026-06-09': /Song of Songs 8:14/, '2026-01-11': /Thessalonians 4:12-17/ };
  for (const [d, re] of Object.entries(want)) {
    const r = day(d);
    assert.ok(r.readings.some((x) => re.test(x.citationEn || '') && (x.flags || []).includes('printed_typo_corrected')), d + ': ' + r.readings.map((x) => x.citationEn + '[' + (x.flags || []).join(',') + ']').join(' | '));
  }
});
console.log(n + ' tests ok');
