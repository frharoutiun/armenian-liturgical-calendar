// node tests/test_calendar.mjs  (no framework; exits non-zero on failure)
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCalendar, parseCivilDate, SCHEMA, intervals, overlapFraction, normBook } from '../engine/calendar.mjs';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok  -', name); };
const cal = await createCalendar();

ok('civil date parsing: ISO, US, object, Date (local civil fields)', () => {
  assert.deepEqual(parseCivilDate('2027-03-28'), { y: 2027, m: 3, d: 28, iso: '2027-03-28' });
  assert.equal(parseCivilDate('3/28/2027').iso, '2027-03-28');
  assert.equal(parseCivilDate({ y: 2027, m: 3, d: 28 }).iso, '2027-03-28');
  assert.equal(parseCivilDate(new Date(2027, 2, 28, 23, 59)).iso, '2027-03-28');   // local civil date, late evening does not roll over
  assert.equal(parseCivilDate(new Date(2027, 2, 28, 0, 1)).iso, '2027-03-28');
});
ok('invalid dates are errors, never guesses', () => {
  for (const bad of ['2027-02-29', '2027-13-01', '27-3-28', '', 'Easter', '1582-10-04', '10000-01-01', null]) assert.ok(parseCivilDate(bad).error, String(bad));
  assert.equal(parseCivilDate('2028-02-29').iso, '2028-02-29');
  const r = cal.resolveDay('2027-02-30'); assert.equal(r.schema, SCHEMA); assert.ok(r.error);
});
ok('record contract: required fields present', () => {
  const r = cal.resolveDay('2027-03-28');
  for (const k of ['schema', 'date', 'weekday', 'mode', 'commemorations', 'fasting', 'readings', 'chants', 'hymns', 'canons', 'unresolved', 'provenance', 'status', 'provisional', 'easter', 'easterOffset']) assert.ok(k in r, k);
  assert.equal(r.schema, 'liturgical-day/1.0');
  assert.equal(r.weekday, 'Sun'); assert.equal(r.easter, '2027-03-28'); assert.equal(r.easterOffset, 0);
  assert.equal(r.mode.armenian, 'ԱՁ');
});
ok('Easter 2027: the Resurrection, a feast day (no fast), readings and hymns present', () => {
  const r = cal.resolveDay('2027-03-28');
  assert.match(r.commemorations[0].english, /Resurrection/); assert.equal(r.commemorations[0].englishStatus, 'sourced');
  assert.equal(r.fasting.status, 'feast'); assert.ok(r.readings.length >= 10); assert.ok(r.hymns.length >= 10);
  assert.ok(r.readings.every((x) => x.verbatimArmenian && x.service && x.service.class));
});
ok('Nativity/Theophany Jan 6: Hador 1 feast, linked hymns, no invented content', () => {
  const r = cal.resolveDay('2030-01-06');
  assert.match(r.commemorations[0].english, /Nativity and Theophany/);
  assert.ok(r.hymns.some((h) => h.status === 'linked_high' && h.links[0].hymnId));
  for (const h of r.hymns) if (h.status === 'unlinked') assert.equal(h.links.length, 0);
});
ok('owner fasting rulings: pre-Lent Wed/Fri fast; Jan 5 never fast; Lenten Saturday provisional', () => {
  assert.equal(cal.resolveDay('2027-01-15').fasting.status, 'fast');            // Friday before Lent
  for (const y of [2026, 2027, 2028, 2029, 2030, 2031]) assert.notEqual(cal.resolveDay(`${y}-01-05`).fasting.status, 'fast', `${y}-01-05`);
  const sat = cal.resolveDay('2027-02-13'); assert.equal(sat.weekday, 'Sat');
  if (sat.fasting.rule === 'R-FAST-LENT-SATURDAY') { assert.equal(sat.fasting.provisional, true); assert.ok(sat.fasting.openQuestions.length); }
});
ok('weekday correctness across centuries (civil arithmetic, no time zone)', () => {
  const known = [['1583-01-01', 'Sat'], ['1600-02-29', 'Tue'], ['1900-01-01', 'Mon'], ['2000-02-29', 'Tue'], ['2024-02-29', 'Thu'], ['9999-12-31', 'Fri']];
  for (const [d, w] of known) assert.equal(cal.resolveDay(d).weekday, w, d);
});
ok('every day of a leap year and a common year resolves without throwing', () => {
  let nd = 0;
  for (const y of [2024, 2025]) for (let m = 1; m <= 12; m++) for (let d = 1; d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); d++) { const r = cal.resolveDay({ y, m, d }); assert.ok(r.date && r.mode && r.fasting); nd++; }
  assert.equal(nd, 731);
});
ok('deterministic: same input twice, identical output', () => {
  assert.equal(JSON.stringify(cal.resolveDay('2031-11-11')), JSON.stringify(cal.resolveDay('2031-11-11')));
});
ok('passage overlap helper: split vs merged ranges and book name variants', () => {
  const merged = { book: 'Luke', ch1: 2, v1: 8, ch2: 2, v2: 20 }, a = { book: 'Luke', ch1: 2, v1: 8, ch2: 2, v2: 14 }, b = { book: 'Luke', ch1: 2, v1: 15, ch2: 2, v2: 20 };
  assert.ok(overlapFraction(intervals(a), intervals(merged)) === 1);
  assert.ok(overlapFraction(intervals(merged), intervals(a)) < 1);
  assert.equal(normBook('I Corinthians'), normBook('1 Corinthians')); assert.equal(normBook('II Kings'), normBook('2 Kings (Armenian: 4 Kingdoms, Դ. Թագաւորաց)'));
  void b;
});
ok('unresolved is explicit: unlinked hymns are listed, not hidden', () => {
  const r = cal.resolveDay('2027-03-28');
  for (const h of r.hymns) if (['unlinked', 'ambiguous'].includes(h.status)) assert.ok(r.unresolved.some((u) => u.field === 'hymn_link' && u.reason.includes(h.incipit)));
});
ok('time-zone independence: identical output under America/New_York, UTC and Pacific/Auckland', () => {
  const dates = ['2027-03-28', '2026-12-31', '2028-02-29', '2030-01-06', '2027-11-07'];
  const script = `import {createCalendar} from '${new URL('../engine/calendar.mjs', import.meta.url).href}'; const c=await createCalendar(); console.log(JSON.stringify(${JSON.stringify(dates)}.map(d=>c.resolveDay(d))));`;
  const outs = ['America/New_York', 'UTC', 'Pacific/Auckland'].map((tz) => { const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: tz }, encoding: 'utf-8', maxBuffer: 1 << 28 }); assert.equal(r.status, 0, r.stderr); return r.stdout; });
  assert.equal(outs[0], outs[1]); assert.equal(outs[0], outs[2]);
});
ok('bundle size fits GitHub Pages comfortably (engine + rulebook + data < 40 MB)', () => {
  const dir = (p) => { let t = 0; for (const f of fs.readdirSync(p, { withFileTypes: true })) { const q = `${p}/${f.name}`; t += f.isDirectory() ? dir(q) : fs.statSync(q).size; } return t; };
  const root = fileURLToPath(new URL('..', import.meta.url));
  const mb = (dir(root + 'engine') + dir(root + 'data/calendar')) / 1e6; console.log('      engine+rulebook+data/calendar =', mb.toFixed(1), 'MB'); assert.ok(mb < 40);
});
console.log(`\n${n} tests passed`);
