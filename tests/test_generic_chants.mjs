// C1 regression: the owner's example "this Monday would be ԳՁ մարտիրոսաց" (2026-10-26): martyrs + mode ԳՁ.
import fs from 'node:fs';
import assert from 'node:assert';
import { resolveGeneric } from '../generic-chants.mjs';
import { createCalendar } from '../engine/calendar.mjs';
const root = decodeURIComponent(new URL('../', import.meta.url).pathname);
globalThis.fetch = async (u) => { const p = decodeURIComponent(String(u).replace('file://', '')); const b = fs.readFileSync(p); return { ok: true, json: async () => JSON.parse(b), text: async () => b.toString() }; };
const table = JSON.parse(fs.readFileSync(root + 'data/calendar/generic_chants.json', 'utf8'));
const layer = JSON.parse(fs.readFileSync(root + 'data/calendar/chants_layer.json', 'utf8'));
let n = 0; const ok = (m) => { n++; console.log('ok  - ' + m); };
const cal = await createCalendar({ baseUrl: 'file://' + root + 'engine/', dataUrl: 'file://' + root + 'data/calendar/' });
const day = await cal.resolveDay('2026-10-26');
assert.equal(day.mode.armenian, 'ԳՁ'); ok('2026-10-26 is mode ԳՁ');
const ch = day.chants.find((c) => c.kind === 'alleluia' && /մարտիրոսաց/.test(c.verbatim));
assert(ch, 'martyrs alleluia chant present'); ok('the day carries the martyrs alleluia rubric');
const seg = (ch.segments || []).find((s) => s.status === 'generic');
assert(seg && seg.generic.category === 'martyrs'); ok('the layer marks it as a generic martyrs rubric, not an incipit');
const r = resolveGeneric(seg.generic, { mode: day.mode.armenian, weekday: day.weekday, fasting: day.fasting, recordOrdinal: ch.recordOrdinal, commemorations: day.commemorations.map((c) => c.armenian) }, table);
assert.equal(r.status, 'resolved');
assert.equal(r.entries[0].armenian_full, 'Վասն քո մեռանիմք զօրհանապազ, համարեցաք որպէս զոչխար ի զենումն:'); ok('martyrs + ԳՁ resolves to the Zhamagirk verse «Վասն քո մեռանիմք…»');
assert.equal(r.entries[0].page, 259); ok('Zhamagirk page 259');
assert.equal(r.entries[0].english_ref_kjv, 'Ps 44:22'); assert(/killed all the day long/.test(r.entries[0].english_full)); ok('English paired through Arak29 (Psalm 44:22 KJV)');
assert.equal(r.review_status, 'auto_accepted'); assert(/mode ԳՁ, p\.259/.test(r.provenance)); ok('provenance: ' + r.provenance);
// every mode resolves for each family with a full table; unresolved cases say why
for (const [fam, modes] of [['alleluia/martyrs', ['ԱՁ', 'ԱԿ', 'ԲՁ', 'ԲԿ', 'ԳՁ', 'ԳԿ', 'ԴԿ']], ['alleluia/fast_days', ['ԱՁ', 'ԴԿ']], ['alleluia/resurrection', ['ԲՁ', 'ԴԿ']], ['mesedi/resurrection', ['ԱՁ', 'ԴՁ']]]) {
  const [kind, category] = fam.split('/');
  for (const m of modes) assert.equal(resolveGeneric({ kind, category }, { mode: m }, table).status, 'resolved', fam + ' ' + m);
}
ok('all listed family/mode pairs resolve');
const miss = resolveGeneric({ kind: 'alleluia', category: 'martyrs' }, { mode: 'ԴՁ' }, table);
assert.equal(miss.status, 'unresolved'); assert(/no entry for mode ԴՁ/.test(miss.why)); ok('martyrs ԴՁ is absent from the typed Zhamagirk and says so');
assert.equal(resolveGeneric({ kind: 'alleluia', category: 'martyrs' }, {}, table).why, 'mode not determined'); ok('no mode: "mode not determined", no guess');
assert.equal(resolveGeneric({ kind: 'alleluia', category: 'by_day' }, { mode: 'ԳՁ', weekday: 'Mon' }, table).why, 'category not determined'); ok('no category: "category not determined", no guess');
const bare = resolveGeneric({ kind: 'alleluia', category: 'by_day', by_record: { 7: { category: 'fast_days', method: 'title_pattern', confidence: 0.8, alternatives: [], why: 'x', record_name: 'Չորեքշաբաթ պահոց' } } }, { mode: 'ԲԿ', recordOrdinal: 7 }, table);
assert.equal(bare.status, 'resolved'); assert.equal(bare.review_status, 'needs_review'); ok('bare "ի ձայնէն" on a fast day resolves via the commemoration title and is flagged for review');
console.log('\n' + n + ' tests passed');
