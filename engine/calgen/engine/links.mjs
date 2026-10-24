// Integrator-owned loader. Row -> record links are DATA written by the link agents: rulebook/links_a.json (Hador 2 rows dated Jan-Jun) and
// rulebook/links_b.json (Jul-Dec), merged by tools/merge_links.py into rulebook/row_links.json. Schema (see docs/ENGINE_CONTRACT.md "Row links"):
// { "links": [ { "match": {"text": "<exact Hador 2 row text>", "months": [..]? , "weekdays": ["Sun"]?, "tables": ["TT-12"]? },
//                "records": [ordinals], "kind": "day"|"overlay", "rule": "R-LINK-..", "basis": "...", "source": {...}, "status": "rule|interpretation|needs_human_review" } ] }
export const meta = { id: 'links', description: 'Hador 2 row text -> Hador 1 records (book-stated references)' };
let idx = null;
function index(ctx) {
  if (idx && idx.src === ctx.rowLinks) return idx;
  const byText = new Map();
  for (const l of (ctx.rowLinks.links || [])) { const k = l.match.text; if (!byText.has(k)) byText.set(k, []); byText.get(k).push(l); }
  return (idx = { src: ctx.rowLinks, byText });
}
export function claimsFromRows(ctx, t, rows) {
  const { byText } = index(ctx), out = [], [, m] = ctx.core.ymd(t), wd = ctx.core.WD[ctx.core.weekday(t)], tid = ctx.tableAt(t).id;
  for (const r of rows) {
    const cands = (byText.get(r.text) || []).filter((l) => (!l.match.months || l.match.months.includes(m)) && (!l.match.weekdays || l.match.weekdays.includes(wd)) && (!l.match.tables || l.match.tables.includes(tid)));
    if (!cands.length) { out.push({ records: [], rows: [r.id], rule: 'R-LINK-NONE', basis: 'Hador 2 row has no recorded Hador 1 link yet', kind: 'rubric', status: 'needs_human_review', source: { table: tid, row: r.id } }); continue; }
    for (const l of cands) out.push({ records: l.records, rows: [r.id], rule: l.rule, basis: l.basis, source: l.source, status: l.status, kind: l.kind || 'day', note: l.note });
  }
  return out;
}
