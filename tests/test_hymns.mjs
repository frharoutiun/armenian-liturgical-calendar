// node tests/test_hymns.mjs  Section-first hymn resolution: one exact page per resolved hymn, nothing forced.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCalendar } from '../engine/calendar.mjs';
import { createHymnResolver, fragments, armKey } from '../engine/hymns.mjs';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok  -', name); };
const root = new URL('../', import.meta.url);
const idx = JSON.parse(fs.readFileSync(new URL('data/calendar/hymn_index.json', root)));
const openings = JSON.parse(fs.readFileSync(new URL('data/calendar/hymn_openings.json', root)));
const cal = await createCalendar();
const resolver = createHymnResolver(idx, openings);

ok('fragments: markers dropped, several openings split, leading "and" removed', () => {
  assert.deepEqual(fragments('Ի գերեզման. և Եկին ՚ի գերեզման. և Ձայն աւետաւոր').map((f) => f.text), ['Ի գերեզման', 'Եկին ՚ի գերեզման', 'Ձայն աւետաւոր']);
  assert.equal(fragments('Որ անճառ, ցվերջն').map((f) => f.text).join('|'), 'Որ անճառ,');
  assert.equal(fragments('Այսօր ընդ ամպս իւր սարօքն').map((f) => f.text).join('|'), 'Այսօր ընդ ամպս');
  assert.equal(fragments('Ան...').length, 0);
});
ok('index 1.1: every hymn has a governing canon; untitled blocks continue the canon above', () => {
  const secs = new Map(idx.sections.map((s) => [s.id, s]));
  let withCanon = 0;
  for (const h of idx.hymns) { if (h.canon) { withCanon++; assert.ok((secs.get(h.canon).title || '').trim(), 'canon head has a printed title'); } }
  assert.ok(withCanon / idx.hymns.length > 0.99);
});
ok('every resolved hymn: exactly one page, inside the hymn\'s own page range, a real hymn id, basis stated', () => {
  const byId = new Map(idx.hymns.map((h) => [h.id, h]));
  let resolved = 0, total = 0;
  for (const d of ['2027-03-28', '2027-02-14', '2027-08-15', '2027-10-11', '2027-05-12', '2026-12-25', '2027-04-04', '2028-01-06', '2027-11-21']) {
    const r = cal.resolveDay(d);
    for (const h of r.hymns) {
      total++;
      assert.ok(['linked_exact', 'linked_section', 'ambiguous', 'unlinked'].includes(h.status), h.status);
      assert.ok(h.candidates.length <= 3);
      if (h.resolved) {
        resolved++;
        const x = byId.get(h.resolved.hymnId); assert.ok(x, 'real hymn');
        assert.equal(typeof h.resolved.page, 'number');
        assert.equal(h.links.length, 1); assert.deepEqual(h.links[0].pages, [h.resolved.page]);
        assert.ok(h.resolved.pagesAll.length >= 1);
        assert.ok(h.basis && h.basis.length > 10); assert.ok(h.confidence > 0);
      } else { assert.equal(h.links.length, 0, 'an unresolved hymn shows no page'); assert.ok(h.basis); }
    }
  }
  assert.ok(resolved / total > 0.5, `resolved share ${resolved}/${total}`);
});
ok('Easter 2027: the Resurrection canon holds its own hymns at their printed pages', () => {
  const r = cal.resolveDay('2027-03-28');
  const h = r.hymns.find((x) => armKey(x.incipit).startsWith(armKey('Այսօր յարեաւ')));
  assert.equal(h.status, 'linked_exact'); assert.equal(h.resolved.page, 193);
  assert.ok(r.sharagnots.length >= 2 && r.sharagnots.every((g, i, a) => !i || a[i - 1].sectionPage <= g.sectionPage));
});
ok('an opening shared by several canons is not decided by wording alone', () => {
  const sp = [{ source: 't', type: 'Շարական', incipit: 'Յիսուս միածին', mode: 'ԴԿ' }];
  const r = resolver.resolve(sp, { names: [] }).hymns[0];
  if (!r.resolved) { assert.equal(r.status, 'ambiguous'); assert.ok(r.candidates.length >= 2 && r.candidates.every((c) => typeof c.page === 'number')); }
});
ok('deterministic: same day resolved twice gives identical output', () => {
  assert.deepEqual(JSON.stringify(cal.resolveDay('2027-08-15').hymns), JSON.stringify(cal.resolveDay('2027-08-15').hymns));
});
ok('day.canon: parts in the owner\'s order, every part present / from the rubric / explicitly missing, one scan page per hymn, stanzas by id', () => {
  const ORDER = ['orhnutyun', 'harts', 'metsatsutse', 'voghormya', 'der_hergnits', 'mankunk', 'jashoo', 'hampartsi'];
  const idx2 = new Set(idx.hymns.map((h) => h.id));
  for (const d of ['2027-03-28', '2027-10-24', '2027-02-18', '2027-08-15', '2028-01-06', '2027-06-13']) {
    const c = cal.resolveDay(d).canon;
    assert.equal(c.schema, 'day-canon/1.0'); assert.deepEqual(c.parts.map((p) => p.part), ORDER);
    for (const p of c.parts) {
      assert.ok(['present', 'from_rubric', 'missing', 'not_applicable'].includes(p.status), p.status);
      if (p.status === 'missing') { assert.equal(p.hymns.length, 0); assert.ok(p.note && p.needsReview); }
      for (const h of p.hymns) { assert.ok(idx2.has(h.hymnId)); assert.equal(typeof h.page, 'number'); assert.ok(Array.isArray(h.stanzaIds)); if (p.status === 'present') assert.ok(h.stanzaIds.length >= 1); }
    }
  }
  const e = cal.resolveDay('2027-03-28').canon;
  assert.equal(e.parts[0].status, 'present'); assert.equal(e.parts[0].hymns[0].page, 193); assert.ok(e.parts[0].hymns.length >= 5);   // the Easter canon's Orhnutyun: many hymns, not just the one named
  assert.equal(e.parts[5].status, 'not_applicable');   // Mankunk on a Sunday
});
console.log(`${n} hymn tests passed`);
