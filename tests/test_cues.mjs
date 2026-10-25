// node tests/test_cues.mjs  End-of-canon cue lines «Ճաշու: …» / «Համբարձի: …» (data/calendar/cue_lines.json, engine/cues.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCalendar } from '../engine/calendar.mjs';
import { applyCueLines } from '../engine/cues.mjs';

let n = 0;
const ok = async (name, fn) => { await fn(); n++; console.log('ok  -', name); };
const root = new URL('../', import.meta.url);
const cues = JSON.parse(fs.readFileSync(new URL('data/calendar/cue_lines.json', root)));
const canons = JSON.parse(fs.readFileSync(new URL('data/calendar/canon_parts.json', root))).canons;
const cal = await createCalendar();

await ok('eight cues on six pages; each names a hymn of its own canon whose opening agrees with the printed cue', () => {
  assert.equal(cues.cues.length, 8);
  assert.deepEqual([...new Set(cues.cues.map((c) => c.page))].sort((a, b) => a - b), [337, 340, 352, 362, 369, 372]);
  assert.deepEqual(cues.audit.pages_with_label, [337, 340, 352, 362, 369, 372]);
  for (const c of cues.cues) {
    const k = canons[c.canonId]; assert.ok(k, c.id);
    const h = k.hymns.find((x) => x.id === c.target.hymnId); assert.ok(h, c.id + ' hymn in canon');
    assert.ok(h.stanza_ids.includes(c.target.stanzaId), c.id + ' stanza in hymn');
    assert.equal(c.target.incipitAgrees, true, c.id);
    assert.match(c.printed_method, /unreviewed/); assert.equal(c.review_status, 'unreviewed');
    assert.ok(['jashoo', 'hampartsi'].includes(c.part));
  }
});
await ok('applyCueLines: the named hymn also serves the cued part; its own part is kept; nothing is added twice', () => {
  const synth = { X: { hymns: [{ id: 'H1', part: 'voghormya', stanza_ids: ['a'] }, { id: 'H2', part: 'der_hergnits', stanza_ids: ['b'] }] } };
  const cl = { cues: [{ canonId: 'X', part: 'jashoo', label: 'Ճաշու', labelHy: 'Ճաշու:', printed: 'x', page: 1, review_status: 'unreviewed', target: { hymnId: 'H1' } }] };
  const out = applyCueLines(synth, cl);
  assert.deepEqual(out.X.hymns[0].also, ['jashoo']); assert.equal(out.X.hymns[0].part, 'voghormya'); assert.equal(out.X.hymns[0].cues.length, 1);
  assert.equal(out.X.hymns[1].also, undefined); assert.equal(synth.X.hymns[0].also, undefined, 'input not mutated');
  // the part already has its own hymn (p337: the cue is held as its own stanza): the cue is attached to it, nothing is marked twice
  const synth2 = { X: { hymns: [{ id: 'H1', part: 'metsatsutse' }, { id: 'J', part: 'jashoo' }] } };
  const out2 = applyCueLines(synth2, { cues: [{ ...cl.cues[0], target: { hymnId: 'H1' } }] });
  assert.equal(out2.X.hymns[0].also, undefined); assert.equal(out2.X.hymns[1].cues.length, 1);
});
await ok('a day on the Tuesday canon (p349-352): Jashoo is «Որ հաստատեցեր բանիւ» with its printed cue (p352)', async () => {
  const d = await cal.resolveDay('2027-01-12');
  const j = d.canon.parts.find((p) => p.part === 'jashoo');
  assert.equal(j.status, 'present');
  const h = j.hymns.find((x) => x.cues && x.cues.length); assert.ok(h, 'a hymn with the cue');
  assert.match(h.incipit, /Որ հաստատեցեր բանիւ/); assert.equal(h.cues[0].page, 352); assert.equal(h.cues[0].label, 'Ճաշու');
});
await ok('both cues of the Discovery of the Cross canon (p372): Jashoo and Hampartsi found on a day that uses it', async () => {
  let found = null;
  for (let i = 0; i < 365 && !found; i++) {
    const iso = new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10);
    const d = await cal.resolveDay(iso);
    const parts = (d.canon && d.canon.parts) || [];
    const j = parts.find((p) => p.part === 'jashoo'), hp = parts.find((p) => p.part === 'hampartsi');
    const jc = j && j.hymns.some((h) => (h.cues || []).some((c) => c.page === 372)), hc = hp && hp.hymns.some((h) => (h.cues || []).some((c) => c.page === 372));
    if (jc && hc) found = iso;
  }
  assert.ok(found, 'a 2027 day with both p372 cues');
});
await ok('a canon with no cue keeps its not_in_data part, and the note says the labels were searched on all pages', async () => {
  let seen = 0;
  for (let i = 0; i < 365 && !seen; i++) {
    const iso = new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10);
    const d = await cal.resolveDay(iso);
    for (const p of (d.canon && d.canon.parts) || []) if (p.status === 'not_in_data' && p.reason === 'canon_has_none') { assert.match(p.note, /513 pages/); assert.ok(!(p.hymns || []).length); seen++; break; }
  }
  assert.ok(seen);
});
console.log(n + ' cue tests ok');
