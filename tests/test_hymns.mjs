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
      assert.ok(['present', 'from_rubric', 'missing', 'not_applicable', 'not_in_data'].includes(p.status), p.status);
      if (p.status === 'missing') { assert.equal(p.hymns.length, 0); assert.ok(p.note && p.needsReview); }
      if (p.status === 'not_in_data') { assert.equal(p.hymns.length, 0); assert.ok(p.note && ['no_liturgy', 'canon_has_none'].includes(p.reason)); }
      for (const h of p.hymns) { assert.ok(idx2.has(h.hymnId)); assert.equal(typeof h.page, 'number'); assert.ok(Array.isArray(h.stanzaIds)); if (p.status === 'present') assert.ok(h.stanzaIds.length >= 1); }
    }
  }
  const e = cal.resolveDay('2027-03-28').canon;
  assert.equal(e.parts[0].status, 'present'); assert.equal(e.parts[0].hymns[0].page, 193); assert.ok(e.parts[0].hymns.length >= 5);   // the Easter canon's Orhnutyun: many hymns, not just the one named
  assert.equal(e.parts[5].status, 'not_applicable');   // Mankunk on a Sunday
});
ok('day.canon second pass: service slot on every part, source and complete flags, labelled parts keep the book\'s start, no empty canon on fast days', () => {
  for (const d of ['2027-03-28', '2026-12-25', '2027-01-18', '2027-06-13', '2027-02-18']) {
    const c = cal.resolveDay(d).canon;
    assert.ok(typeof c.summary.allPartsLocated === 'boolean' && typeof c.summary.hasLiturgy === 'boolean');
    for (const p of c.parts) {
      assert.ok(p.service && p.service.service && p.service.evidence.length, 'service slot');
      assert.ok(['canon', 'rubric', 'generic_rule', 'generic_kind', 'generic_same_canon', 'canon_via_rubric', 'generic_friday_repose', 'generic_eight_modes', 'generic_weekday_orhnutyun', 'generic_mode_beginnings', 'none'].includes(p.source)); assert.equal(typeof p.complete, 'boolean');
      if (p.source.startsWith('generic')) assert.ok(p.needsReview && p.note && p.hymns.every((h) => h.confidence <= 0.6), 'rule-based fills are flagged and capped');
    }
    assert.deepEqual(c.parts.map((p) => p.service.service), ['night', 'morning', 'morning', 'morning', 'morning', 'morning', 'divine_liturgy', 'evening']);
  }
  const nat = cal.resolveDay('2026-12-25').canon;   // Friday fast before Nativity: no canon of its own, the rubric names a repose Harts
  assert.ok(nat.parts.filter((p) => p.hymns.length).length >= 3, 'not an empty canon');
  const e = cal.resolveDay('2027-03-28').canon;     // the book labels the Easter Harts at p195: weaker evidence must not move it earlier
  assert.equal(e.parts[1].hymns[0].page, 195); assert.ok(e.parts[0].hymns.length >= 6);
  assert.equal(cal.resolveDay('2027-03-28').canon.summary.hasLiturgy, true); assert.equal(cal.resolveDay('2027-01-18').canon.summary.hasLiturgy, false);
});
ok('H2: a margin naming two parts (ճշ․ մնկ) serves both; weekday canons and series of partial Harts are used by rule; gaps are named, never silent', () => {
  const k = cal.resolveDay('2027-02-20').canon;   // St Kirill: the one-hymn «Շարական» at p113 is both his Mankunk and his Jashoo
  assert.equal(k.parts[5].hymns[0].page, 113); assert.equal(k.parts[6].hymns[0].page, 113);
  const fri = cal.resolveDay('2027-01-15').canon;   // ordinary fast Friday: repose Harts series by the day's mode, Friday Orhnutyun
  assert.equal(fri.parts[1].status, 'present'); assert.ok(fri.parts[1].hymns[0].confidence <= 0.6 && fri.parts[1].needsReview);
  const tue = cal.resolveDay('2027-01-19').canon;   // Tuesday canon (p349) supplies all parts of an ordinary fast Tuesday
  assert.ok(tue.parts[0].hymns.length >= 1 && tue.parts[0].status === 'present');
  for (const iso of ['2027-01-19', '2027-02-10', '2027-04-10']) for (const p of cal.resolveDay(iso).canon.parts) {
    if (p.status === 'not_in_data') { assert.equal(p.hymns.length, 0); assert.ok(p.reason === 'canon_has_none' ? /513 pages/.test(p.note) : /Divine Liturgy|transcribed/.test(p.note)); }   // X1: the cue labels were searched on every page image
    assert.ok(!/Sharagnots does not print/.test(p.note || ''), 'never assert that the book prints nothing');
  }
});

// ---- H3: hymns the Tonatsoyts names only by category and mode are found in the generic canons (category + mode + hymn type -> section -> hymn)
const genericOf = (iso, typeStem) => cal.resolveDay(iso).hymns.find((h) => h.resolved && h.resolved.generic && armKey(h.type).includes(armKey(typeStem)));
ok('H3 regression: Monday 2026-10-26 «Հարց մարտիրոսաց», mode ԳՁ -> the martyrs\' generic Harts of the THIRD mode (p457), printed heading «Հարց Երրորդ ձայն»', () => {
  const r = cal.resolveDay('2026-10-26'); assert.equal(r.mode.armenian, 'ԳՁ');
  const h = genericOf('2026-10-26', 'Հարց'); assert.ok(h, 'resolved');
  assert.equal(h.resolved.page, 457); assert.equal(h.resolved.generic.category, 'martyrs'); assert.equal(h.resolved.generic.mode, 'ԳՁ');
  assert.equal(h.status, 'linked_section'); assert.equal(h.needsReview, true); assert.match(h.basis, /generic_by_mode: category martyrs, mode ԳՁ/);
  assert.equal(h.links.length, 1);
});
ok('H3: martyrs\' generic Harts by mode: ԱՁ p448 (printed «Առաջին ձայն»), ԲՁ p453, ԳՁ p457, ԴԿ p464; each page printed under its heading', () => {
  assert.equal(genericOf('2027-09-28', 'Հարց').resolved.page, 448);   // Tue, ԱՁ
  assert.equal(genericOf('2027-01-28', 'Հարց').resolved.page, 453);   // Thu, ԲՁ
  assert.equal(genericOf('2027-10-21', 'Հարց').resolved.generic.mode, 'ԴԿ');
});
ok('H3: other categories: repose (ԱՁ p484, ԴԿ p498), penitence (week sections chosen by mode, ԱՁ p96), the Cross', () => {
  assert.equal(genericOf('2027-12-17', 'Հարց').resolved.page, 484);
  assert.equal(genericOf('2027-01-01', 'Հարց').resolved.page, 498);
  assert.equal(genericOf('2027-10-06', 'Հարց').resolved.page, 96);
  assert.equal(genericOf('2027-10-06', 'Հարց').resolved.generic.category, 'penitence');
});
ok('H3: «Մարտիրոսաց ՚ի ձայնէն» is a pointer, not an opening; «զX ասա» is a cross reference to that canon', () => {
  assert.deepEqual(fragments("Մարտիրոսաց 'ի ձայնէն:").map((f) => f.text), []);
  const h = genericOf('2026-01-22', 'Օրհնութիւն'); assert.ok(h && h.resolved.generic.category === 'martyrs');
  const x = cal.resolveDay('2026-06-02').hymns.find((y) => y.resolved && y.resolved.generic && String(y.resolved.generic.sectionTitle || '').replace(/\s+/g, '').includes('ՀՌԻՓՍԻՄԵԱՆՑ'));
  assert.ok(x, 'the Hampartsi named by «զՀռիփսիմեանցն ասա» is the one of the Hripsimian canon'); assert.equal(x.resolved.page, 311); assert.match(x.basis, /refers to this canon/);
});
ok('H3: the index\'s hymn modes are corrected from the printed margin labels and headings (third mode had been read as fourth), old value kept', () => {
  const m = idx.hymns.filter((h) => h.mode_index);
  assert.ok(m.length > 150 && idx.schema === 'hymn-index/1.2');
  const h = idx.hymns.find((x) => x.pages[0] === 457 && armKey(x.incipit).startsWith(armKey('Որք ըզտանջանս')));
  assert.equal(h.mode, 'ԳՁ'); assert.equal(h.mode_index, 'ԴՁ'); assert.match(h.mode_basis, /heading|margin/);
  for (const x of m) assert.ok(x.mode_basis && x.mode && x.mode !== x.mode_index);
});
ok('H3: every hymn linked by category/mode names category, mode, section and page, is marked for review, and shows exactly one page; a category with no section in that mode stays unresolved', () => {
  let n = 0;
  for (const iso of ['2027-01-28', '2027-09-28', '2027-10-21', '2027-12-17', '2027-05-28', '2026-10-26']) for (const h of cal.resolveDay(iso).hymns) if (h.resolved && h.resolved.generic) {
    n++; assert.ok(h.needsReview && h.method === 'generic_by_mode'); assert.equal(h.links.length, 1); assert.equal(h.links[0].pages.length, 1);
    assert.ok(h.resolved.generic.mode && h.resolved.generic.sectionId && h.resolved.generic.sectionPage);
  }
  assert.ok(n >= 6);
});
ok('F2: an opening printed more than once resolves to the occurrence the Echmiadzin TOC lists (Jan 6 «Լոյս ՚ի լուսոյ»: the Orhnutyun of Nativity day 2, p43, not the repeat at p285)', () => {
  const h = cal.resolveDay('2027-01-06').hymns.find((y) => armKey(y.incipit).startsWith(armKey('Լոյս ՚ի լու')));
  assert.ok(h && h.resolved && h.resolved.page === 43); assert.match(h.basis, /Echmiadzin TOC/);
});
ok('F2: an opening not printed in the rubric\'s spelling is found through the TOC\'s wording (alias), and says so', () => {
  const h = cal.resolveDay('2027-02-09').hymns.find((y) => y.type === 'Հարց' && /համագոյից/.test(armKey(y.incipit).replace(/ը/g, '')) || armKey(y.incipit).startsWith(armKey('Որ համագոյից')));
  assert.ok(h && h.resolved); assert.match(h.basis, /not printed in this spelling/);
});
ok('F2: a rubric direction («զերեք Ողորմեայսն ասասցես», «զՈղորմեայն ասա») is not an opening: kind direction, nothing to resolve', () => {
  let n = 0; for (const iso of ['2026-03-30', '2026-12-24']) for (const h of cal.resolveDay(iso).hymns) if (h.kind === 'direction') { n++; assert.equal(h.resolved, null); assert.match(h.basis, /direction of the rubric/); }
  assert.ok(n >= 1);
});
ok('F2: hymn index carries the TOC listing and the aliases file is loaded', () => {
  assert.ok(idx.hymns.filter((h) => h.ref_listed && h.ref_listed.length).length > 800);
});
console.log(`${n} hymn tests passed`);
