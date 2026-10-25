// Y2: the ode sub-headings and the eight tone sets of the generic Orhnutyun (Findikyan, Armenian Hymnography LS323, p.4, 10-11, 22-25).
import fs from 'fs';
import { createCalendar } from '../engine/calendar.mjs';
const root = decodeURIComponent(new URL('../', import.meta.url).pathname);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  -', m); };
const OM = JSON.parse(fs.readFileSync(root + 'data/calendar/ode_marks.json', 'utf8'));
const CP = JSON.parse(fs.readFileSync(root + 'data/calendar/canon_parts.json', 'utf8'));
const TONES = ['ԱՁ', 'ԱԿ', 'ԲՁ', 'ԲԿ', 'ԳՁ', 'ԳԿ', 'ԴՁ', 'ԴԿ'];
const ORDER = ['օրհ', 'նայ', 'զիհ', 'ծան', 'հաս', 'գիշ', 'եսա', 'օրհ', 'նեղ', 'տրլ'];
ok(OM.order.join() === ORDER.join() && OM.canticles.length === 10, 'ten canticles in the document\'s order');
// eight sets, tone = ordinal
const sets = {};
const pos = new Map(); let ip = 0; for (const cid of CP.order) for (const h of CP.canons[cid].hymns) pos.set(h.id, ip++);
for (const [id, s] of Object.entries(OM.set_tones)) (sets[s.set] ||= []).push(id);
for (const v of Object.values(sets)) v.sort((a, b) => pos.get(a) - pos.get(b));
ok(Object.keys(sets).length === 8, 'exactly eight tone sets');
ok(Object.values(OM.set_tones).every((s) => s.tone === TONES[s.set - 1]), 'set n is tone n (ԱՁ ԱԿ ԲՁ ԲԿ ԳՁ ԳԿ ԴՁ ԴԿ)');
const H = new Map(); for (const k of Object.values(CP.canons)) for (const h of k.hymns) H.set(h.id, h);
for (let n = 1; n <= 8; n++) {
  const hs = sets[n]; const st = hs.reduce((a, id) => a + H.get(id).stanza_ids.length, 0);
  ok(st >= 28 && st <= 36, `set ${n} (${TONES[n - 1]}) holds ${st} stanzas, about the 31 of a full Orhnutyun (9 odes x 3 + the last)`);
  ok(hs.every((id) => H.get(id).mode === TONES[n - 1]), `every hymn of set ${n} carries mode ${TONES[n - 1]} (index confusions corrected by the structure)`);
}
// odes appear in the document's order inside a set
for (let n = 1; n <= 8; n++) {
  const seq = sets[n].filter((id) => OM.marks[id]).map((id) => OM.marks[id].n);
  ok(seq.every((x, i) => i === 0 || x > seq[i - 1]), `set ${n}: ode numbers increase (${seq.join(',')})`);
}
// a printed label keeps its canticle
const sample = Object.entries(OM.marks).find(([, m]) => m.label === 'եսա' && m.basis === 'printed');
ok(sample && sample[1].ref === 'Is 38:10-20', 'եսա = Is 38:10-20 (Song of Hezekiah)');
// the day takes ONE set, its tone
const cal = await createCalendar({ baseUrl: new URL('../engine/', import.meta.url).href.replace('file://', 'file://'), dataUrl: new URL('../data/calendar/', import.meta.url).href });
const orh = async (d) => (await cal.resolveDay(d)).canon.parts.find((p) => p.part === 'orhnutyun');
for (const [d, tone] of [['2026-04-19', 'ԴՁ'], ['2026-04-21', 'ԱՁ'], ['2026-04-20', 'ԴԿ'], ['2026-04-17', 'ԳՁ']]) {
  const p = await orh(d);
  const tones = [...new Set(p.hymns.map((h) => h.odeSet && h.odeSet.tone))];
  const st = p.hymns.reduce((a, h) => a + h.stanzaIds.length, 0);
  ok(tones.length === 1 && tones[0] === tone && st >= 28 && st <= 36, `${d}: Orhnutyun = the ${tone} set only (${p.hymns.length} hymns, ${st} stanzas)`);
}
console.log(fails ? `${fails} FAILED` : 'all ode tests ok');
process.exit(fails ? 1 : 0);
