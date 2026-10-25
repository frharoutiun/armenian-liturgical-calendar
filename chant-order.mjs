// chant-order.mjs (W9) - places each psalm / mesedi / alleluia immediately BEFORE the reading it introduces, per service group.
// Input : day  = engine resolveDay() result ({readings[], chants[]}), layer = data/calendar/chants_layer.json
// Output: { groups: [ { id, class, label, items: [ {type:'chant'|'reading', order, ...} ] } ], unplaced: [] }
// Rule (owner model of the Jashots): Psalm > 1st reading > Meseti > 2nd reading > Alleluia > Gospel.
//   psalm   -> before the first reading of its service group
//   mesedi  -> before the first apostolic reading (Acts, Catholic letters, Paul); when that reading is the group's first reading the mesedi follows the psalm
//   alleluia-> before the first gospel reading
// Placement is by RULE, not read from a Jashots record: order_basis 'rule'; review_status 'needs_review' whenever a fallback position was needed.
const GOSPELS = new Set(['Matthew', 'Mark', 'Luke', 'John']);
const APOSTLE = new Set(['Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation']);
function rtype(r) {
  const b = ((r.passage && r.passage.book) || '').replace(/\s*\(.*$/, '').replace(/^I{1,3} /, (m) => ({ 'I ': '1 ', 'II ': '2 ', 'III ': '3 ' })[m]);
  if (GOSPELS.has(b)) return 'gospel';
  if (APOSTLE.has(b)) return 'apostle';
  return 'ot';
}
const SERVICE_GROUP = { Jashoo: 'jashoo', Morning: 'morning', Evening: 'evening', Dismissal: 'dismissal' };

export function lookupChant(layer, c) {
  const k = layer && layer.lookup && layer.lookup[c.recordOrdinal + '|' + c.verbatim];
  return k && layer.chants ? layer.chants[k] || null : null;
}

export function interleave(day, layer) {
  const groups = new Map();
  const gid = (r) => {
    const s = r.service || {};
    const id = s.class === 'jashoo' ? 'jashoo' : (s.label ? 'svc:' + s.label : 'other');
    if (!groups.has(id)) groups.set(id, { id, class: s.class || 'other', label: s.label || (id === 'jashoo' ? 'Divine Liturgy (Jashoo)' : 'Other readings'), readings: [], chants: [] });
    return id;
  };
  (day.readings || []).forEach((r, i) => groups.get(gid(r)).readings.push({ r, i }));
  const unplaced = [];
  const main = groups.has('jashoo') ? 'jashoo' : [...groups.keys()][0];
  for (const c of day.chants || []) {
    const g = SERVICE_GROUP[c.service] ? (SERVICE_GROUP[c.service] === 'jashoo' ? 'jashoo' : [...groups.keys()].find((k) => k.toLowerCase().includes(SERVICE_GROUP[c.service])) || main) : main;
    if (!g || !groups.has(g)) { unplaced.push({ chant: c, why: 'no reading group on this day' }); continue; }
    groups.get(g).chants.push({ c, layer: lookupChant(layer, c) });
  }
  const out = [];
  for (const g of groups.values()) {
    const rs = g.readings, items = [];
    const firstIdx = (t) => rs.findIndex((x) => rtype(x.r) === t);
    const before = new Map(); // reading position -> chants placed before it
    const put = (pos, ch, rule, review) => { const a = before.get(pos) || []; a.push({ ...ch, rule, review }); before.set(pos, a); };
    for (const ch of g.chants) {
      const k = ch.c.kind;
      if (k === 'psalm') put(0, ch, 'psalm before first reading', false);
      else if (k === 'mesedi') {
        const a = firstIdx('apostle');
        if (a > 0) put(a, ch, 'mesedi before the apostolic reading (after the first reading)', false);
        else if (a === 0) put(0, ch, 'mesedi placed before the apostolic reading, which is the first reading of the group (position not explicit)', true);
        else put(Math.min(1, Math.max(0, rs.length - 1)), ch, 'no apostolic reading in this group: placed before the second reading (position not explicit)', true);
      } else if (k === 'alleluia') {
        const gi = firstIdx('gospel');
        if (gi >= 0) put(gi, ch, 'alleluia before the gospel', false);
        else put(rs.length, ch, 'no gospel in this group: alleluia placed last (position not explicit)', true);
      } else unplaced.push({ chant: ch.c, why: 'unknown chant kind' });
    }
    let order = 0;
    const emitChants = (pos) => (before.get(pos) || []).forEach((x) => items.push({ type: 'chant', order: ++order, kind: x.c.kind, service_order: order, precedes_reading: pos < rs.length ? rs[pos].r.citationKey : null,
      precedes_reading_index: pos < rs.length ? rs[pos].i : null, chant: x.c, verbatim: x.c.verbatim, psalm: x.c.psalm, layerKey: x.layer ? x.layer.key : null, order_basis: 'rule', order_rule: x.rule, review_status: x.review ? 'needs_review' : 'rule_applied' }));
    rs.forEach((x, p) => { emitChants(p); items.push({ type: 'reading', order: ++order, service_order: order, readingIndex: x.i, citationKey: x.r.citationKey }); });
    emitChants(rs.length);
    if (!rs.length && g.chants.length) g.chants.forEach((x) => unplaced.push({ chant: x.c, why: 'group has no readings' }));
    out.push({ id: g.id, class: g.class, label: g.label, items });
  }
  out.sort((a, b) => (a.id === 'jashoo' ? -1 : b.id === 'jashoo' ? 1 : 0));
  return { groups: out, unplaced };
}
