// engine/anchors.mjs  (owner: anchors agent)  -- see docs/notes/anchors.md
// Canonical anchors DERIVED FROM THE HADOR 2 ROWS of the table in force (source-stated), cross-checked with the PROVISIONAL civil computation.
// Output: { <anchor name>: t|null, _sundays: [{t,name,family,ordinal,rowId,...}], _meta: {name:{basis,rowId,crossCheck}}, _findings: [...] }
export const meta = { id: 'anchors', description: 'Anchors from Hador 2 rows (Armenian keyword match on row.text), Sunday identities, civil cross-check' };

// ---- text helpers -------------------------------------------------------------------------------------------------------------
// Strip the optional leading weekday/tone decoration that some tables print before the Sunday name ("Կիր. ԲՁ. ", "Կիրակի ԱՁ. ", "Կիր. ").
export function stripPrefix(text) {
  return String(text).trim().replace(/^Կիր(?:\.|ակի)?\s*/u, '').replace(/^[ԱԲԳԴ][ՁԿ]\.?\s*/u, '').replace(/^[.:։,\s]+/u, '');
}
const ORD = [['Առաջին', 1], ['Երկրորդ', 2], ['Երրորդ', 3], ['Չորրորդ', 4], ['Հինգերորդ', 5], ['Վեցերորդ', 6], ['Եօթներորդ', 7], ['Ութերորդ', 8], ['Իններորդ', 9], ['Տասներորդ', 10], ['Մետասաներորդ', 11]];
export function parseOrdinal(s) { for (const [w, n] of ORD) if (s.startsWith(w)) return n; return null; }
const rx = (re) => new RegExp(re, 'iu');
const SUND = 6; // core.weekday: Mon=0..Sun=6

// ---- Armenian keyword matchers (exact rules documented in docs/notes/anchors.md) ---------------------------------------------
// each: {name, when(row,s,m,d,isSun) -> bool}; s = stripped text
const M = {
  jan6: (r, s, m, d) => m === 1 && d === 6 && rx('Ծն(?:ու|ն)ն?դ').test(s) && rx('Յայտնութ').test(s),
  arachavorats_barekendan: (r, s, m, d, sun) => sun && m <= 3 && rx('Բարեկենդան\\s+Առաջաւոր').test(s),
  poon_paregentan: (r, s, m, d, sun) => sun && m >= 2 && m <= 3 && rx('Բուն\\s+բարեկենդան').test(s),
  easter: (r, s, m, d, sun) => sun && m >= 3 && m <= 4 && /^Զատիկ/u.test(s),
  pentecost: (r, s, m, d, sun) => sun && m >= 5 && m <= 6 && rx('^(?:Տօն\\s+)?Գալ(?:ուստ|ստեան)\\s+Հոգւոյն').test(s),
  vardavar: (r, s, m, d, sun) => sun && m >= 6 && m <= 8 && /^Վարդավառ\s*$/u.test(s),
  vardavar_barekendan: (r, s, m, d, sun) => sun && m >= 6 && m <= 7 && rx('Բարեկենդան\\s+Վարդավառ').test(s),
  assumption_barekendan: (r, s, m, d, sun) => sun && m >= 7 && m <= 8 && rx('Բարեկենդան\\s+(?:(?:սուրբ|Ս\\.)\\s+)*Աստուածածն').test(s),
  assumption: (r, s, m, d, sun) => sun && m === 8 && rx('^(?:Սուրբ\\s+)?(?:Աստուածածնի\\s+)?Վերափոխումն').test(s),
  cross_barekendan: (r, s, m, d, sun) => sun && m >= 8 && m <= 9 && rx('Բարեկենդան\\s+(?:(?:սուրբ|սրբոյ|Ս\\.)\\s+)*Խաչ').test(s),
  exaltation: (r, s, m, d, sun) => sun && m === 9 && /^Խաչվերաց/u.test(s),
  varak_barekendan: (r, s, m, d, sun) => sun && m === 9 && rx('Բարեկենդան\\s+Վարագայ').test(s),
  advent_barekendan: (r, s, m, d, sun) => sun && m === 11 && rx('Բարեկենդան\\s+Յիսնակաց').test(s),
  james_barekendan: (r, s, m, d, sun) => sun && m === 12 && rx('Բարեկենդան\\s+(?:(?:սուրբ|Ս\\.)\\s+)*Յակոբայ').test(s),
};
// ascension is a Thursday row in Hador 2 ("Համբարձ...")
M.ascension = (r, s, m, d, sun, wd) => wd === 3 && m >= 4 && m <= 6 && rx('Համբարձ').test(s);
export const MATCHERS = M;
export const CANONICAL = ['jan6', 'arachavorats_barekendan', 'poon_paregentan', 'easter', 'ascension', 'pentecost', 'vardavar', 'assumption_barekendan', 'assumption', 'cross_barekendan', 'exaltation', 'advent_barekendan'];
export const EXTRA = ['vardavar_barekendan', 'varak_barekendan', 'james_barekendan'];

// ---- provisional civil computation (same formulas as ctx.mjs; used only if ctx.computed is absent) ----------------------------
function civil(ctx) {
  if (ctx.computed) return ctx.computed;
  const core = ctx.core, y = ctx.year, e = ctx.easter, D = core.DAY;
  const near = (m, d) => { const t = core.utc(y, m, d), k = (6 - core.weekday(t) + 7) % 7; return k <= 3 ? t + k * D : t + (k - 7) * D; };
  const as = near(8, 15), ex = near(9, 14); let adv = null;
  for (let d = 15; d <= 21; d++) if (core.weekday(core.utc(y, 11, d)) === 6) adv = core.utc(y, 11, d);
  return { jan6: core.utc(y, 1, 6), arachavorats_barekendan: e - 70 * D, poon_paregentan: e - 49 * D, easter: e, ascension: e + 39 * D, pentecost: e + 49 * D,
    vardavar: e + 98 * D, assumption_barekendan: as - 7 * D, assumption: as, cross_barekendan: ex - 7 * D, exaltation: ex, advent_barekendan: adv,
    vardavar_barekendan: e + 91 * D };
}

// ---- rows of the year in force (segment-aware) -------------------------------------------------------------------------------
export function yearRows(ctx) {
  // FINDING (see docs/notes/anchors.md): in each Hador 2 table the rows dated Jan 1-5 are printed at the END of the table (after Dec 31) and carry the
  // weekdays of the FOLLOWING civil year (e.g. TT-12 "1/1 Mon" = Jan 1 of the year after the table's Easter year). So civil Jan 1-5 of year Y are
  // governed by the Jan 1-5 rows of the table in force at the end of year Y-1 (the last segment of tablesForYear(Y-1)), and the rows Jan 1-5 of Y's own
  // table are NOT used for year Y. (Verified over 1583-4000: row weekday matches civil weekday 5040 times for the previous-year table, 75 times for the same table.)
  const core = ctx.core, out = [];
  const push = (r, tableId) => { const t = core.utc(ctx.year, r.m, r.d); out.push({ row: r, t, tableId, wd: core.weekday(t), s: stripPrefix(r.text), tail: r.m === 1 && r.d <= 5 }); };
  for (const seg of ctx.sel.segments) {
    for (const r of seg.table.rows) {
      const a = r.m * 100 + r.d;
      if (a < seg.from[0] * 100 + seg.from[1] || a > seg.to[0] * 100 + seg.to[1]) continue;
      if (r.m === 2 && r.d === 29 && !ctx.sel.leap) continue;
      if (r.m === 1 && r.d <= 5) continue;            // belongs to the previous table's tail, see above
      push(r, seg.table.id);
    }
  }
  const prev = core.tablesForYear(ctx.H2, ctx.year - 1), pt = prev.segments[prev.segments.length - 1].table;
  for (const r of pt.rows) if (r.m === 1 && r.d <= 5) push(r, pt.id);
  return out.sort((a, b) => a.t - b.t);
}

// ---- Sunday identity ---------------------------------------------------------------------------------------------------------
// Family hints printed in the row itself (used ONLY as a consistency check against the positional family).
function textFamilyHint(s) {
  if (rx('զկնի\\s+Ծննդեան').test(s)) return 'after_nativity';
  if (rx('զկնի\\s+Վարդավառ').test(s)) return 'after_vardavar';
  if (rx('զկնի\\s+Վերափոխ').test(s)) return 'after_assumption';
  if (rx('զկնի\\s+Խաչ').test(s)) return 'after_exaltation';
  if (rx('զկնի\\s+Հոգեգալստ').test(s) || rx('Սկիզբն\\s+Յարութեան').test(s)) return 'after_pentecost';
  if (rx('Յիսնակաց').test(s) && !rx('Բարեկենդան\\s+Յիսնակաց').test(s)) return 'advent';
  return null;
}
const ORDW = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh'];
const FAMNAME = { advent: 'Sunday of Advent', after_nativity: 'Sunday after Nativity', arachavorats_fast: 'Sunday of the Arachavorats fast', great_lent: 'Sunday of the Great Fast', easter_season: 'Sunday of Easter', after_pentecost: 'Sunday after Pentecost',
  after_vardavar: 'Sunday after Vardavar', after_assumption: 'Sunday after the Assumption', after_exaltation: 'Sunday after the Exaltation' };
const FAMILY_ORDER = ['advent', 'after_nativity', 'arachavorats_fast', 'great_lent', 'easter_season', 'after_pentecost', 'after_vardavar', 'after_assumption', 'after_exaltation'];

function sundayName(family, ordinal, flags) {
  if (flags.special) return flags.special;
  let n = ordinal ? `${ORDW[ordinal]} ${FAMNAME[family] || family}` : (FAMNAME[family] || family);
  if (family === 'advent' && ordinal) n = `${ORDW[ordinal]} Sunday of Advent`;
  if (flags.barekendan) n += ` (${flags.barekendan})`;
  return n;
}

function buildSundays(ctx, rows, A) {
  const core = ctx.core, W = 7 * core.DAY;
  const T = (n) => A[n];
  // positional family of a Sunday t, from the anchors actually in force
  const famOf = (t) => {
    if (t < T('jan6')) return 'advent';
    if (t === T('jan6')) return 'nativity';
    if (T('arachavorats_barekendan') != null && t <= T('arachavorats_barekendan')) return 'after_nativity';
    if (T('poon_paregentan') != null && t < T('poon_paregentan')) return 'arachavorats_fast';
    if (t === T('poon_paregentan')) return 'poon_paregentan';
    if (t < T('easter')) return 'great_lent';
    if (t === T('easter')) return 'easter';
    if (t < T('pentecost')) return 'easter_season';
    if (t === T('pentecost')) return 'pentecost';
    if (t < T('vardavar')) return 'after_pentecost';
    if (t < T('assumption')) return 'after_vardavar';
    if (t < T('exaltation')) return 'after_assumption';
    if (T('advent_barekendan') != null && t <= T('advent_barekendan')) return 'after_exaltation';
    return 'advent';
  };
  const list = [], findings = [];
  for (const x of rows) {
    if (x.wd !== SUND) continue;
    const { row: r, s, t } = x;
    let family = famOf(t), ord = parseOrdinal(s), ordBasis = ord ? 'row_text' : null;
    const flags = {};
    const hint = textFamilyHint(s);
    for (const [nm, tag] of [['arachavorats_barekendan', 'Barekendan of the Arachavorats fast'], ['assumption_barekendan', 'Barekendan of the Assumption fast'], ['cross_barekendan', 'Barekendan of the Holy Cross fast'],
      ['advent_barekendan', 'Barekendan of the Advent fast'], ['vardavar_barekendan', 'Barekendan of the Vardavar fast'], ['varak_barekendan', 'Barekendan of Varak Holy Cross'], ['james_barekendan', 'Barekendan of the St. James fast']]) {
      if (A[nm] === t) flags.barekendan = tag;
    }
    if (family === 'nativity') flags.special = 'Nativity and Theophany (on a Sunday)';
    else if (family === 'poon_paregentan') flags.special = 'Bun Barekendan (Poon Paregentan)';
    else if (family === 'easter') flags.special = 'Easter Sunday';
    else if (family === 'pentecost') flags.special = 'Pentecost (Descent of the Holy Spirit)';
    if (A.vardavar === t) { family = 'after_vardavar'; flags.special = 'Vardavar (Transfiguration)'; }
    if (A.assumption === t) { family = 'after_assumption'; flags.special = 'Assumption of the Mother of God'; }
    if (A.exaltation === t) { family = 'after_exaltation'; flags.special = 'Exaltation of the Holy Cross (Khachverats)'; }
    if (/^Ծաղկազարդ/u.test(s)) flags.special = 'Palm Sunday (Tsaghkazard)';
    if (/^Նոր\b/u.test(s)) flags.special = 'New Sunday';
    if (/^Միջին/u.test(s)) flags.label = 'Middle (Mijin) Sunday';
    if (hint && family !== hint && !['nativity', 'poon_paregentan', 'easter', 'pentecost'].includes(family))
      findings.push({ kind: 'family_conflict', year: ctx.year, table: x.tableId, rowId: r.id, date: [r.m, r.d], text: r.text, positional: family, textHint: hint });
    list.push({ t, name: null, family, ordinal: ord, ordinalBasis: ordBasis, rowId: r.id, table: x.tableId, armenian: r.text, flags, wdRow: r.wd });
  }
  // PATTERN (interpretation, 100% consistent with every explicit "Nth Sunday after Nativity" row in all 36 tables): the Nth Sunday after Nativity
  // falls on Jan 14+7(N-1) .. Jan 20+7(N-1); Sundays Jan 7-13 are not numbered. Used (a) to flag violations of the pattern by explicit rows, (b) to number rows whose text has no ordinal.
  const nthPattern = (t) => { const k = Math.floor((t - core.utc(ctx.year, 1, 14)) / W); return k >= 0 ? k + 1 : null; };
  for (const u of list) if (u.family === 'after_nativity') {
    const p = nthPattern(u.t);
    if (u.ordinal != null && u.ordinalBasis === 'row_text' && p !== u.ordinal) findings.push({ kind: 'nativity_ordinal_pattern_violation', year: ctx.year, table: u.table, rowId: u.rowId, stated: u.ordinal, pattern: p });
    if (u.ordinal == null && p != null) { u.ordinal = p; u.ordinalBasis = 'derived_pattern:Jan14+7(N-1)'; }
  }
  // derive missing ordinals inside one consecutive family group from explicit neighbours (never across families)
  for (const fam of FAMILY_ORDER) {
    // the January tail of the previous year's Advent (before Jan 6) is a separate run: never derive across the year boundary
    for (const tail of fam === 'advent' ? [true, false] : [false]) {
    const g = list.filter((u) => u.family === fam && (fam !== 'advent' || (u.t < T('jan6')) === tail));
    const ex = g.filter((u) => u.ordinal != null);
    for (let i = 1; i < ex.length; i++) {
      const dw = Math.round((ex[i].t - ex[i - 1].t) / W);
      if (ex[i].ordinal - ex[i - 1].ordinal !== dw) findings.push({ kind: 'ordinal_gap_inconsistent', year: ctx.year, family: fam, table: ex[i].table, rows: [ex[i - 1].rowId, ex[i].rowId], stated: [ex[i - 1].ordinal, ex[i].ordinal], weeksApart: dw });
    }
    if (!ex.length) continue;
    for (const u of g) if (u.ordinal == null) {
      const nb = ex.reduce((b, e) => (b == null || Math.abs(e.t - u.t) < Math.abs(b.t - u.t) ? e : b), null);
      const o = nb.ordinal + Math.round((u.t - nb.t) / W);
      if (o >= 1 && o <= 11) { u.ordinal = o; u.ordinalBasis = `derived_from_row:${nb.rowId}`; }
    }
    }
  }
  // a Barekendan Sunday of a family always carries the family's ordinal in the book; nothing else is inferred
  for (const u of list) { u.name = sundayName(u.family, u.ordinal, u.flags); if (u.flags.label) u.name += ` - ${u.flags.label}`; }
  return { list, findings };
}

// ---- main --------------------------------------------------------------------------------------------------------------------
export function buildAnchors(ctx) {
  const rows = yearRows(ctx), comp = civil(ctx), out = {}, metaOut = {}, findings = [];
  const names = [...CANONICAL, ...EXTRA];
  for (const nm of names) {
    const hits = rows.filter((x) => M[nm](x.row, x.s, x.row.m, x.row.d, x.wd === SUND, x.wd));
    const c = comp[nm] ?? null;
    if (hits.length) {
      const h = hits[0];
      out[nm] = h.t;
      metaOut[nm] = { basis: 'hador2_row', rowId: h.row.id, table: h.tableId, crossCheck: { computed: c, agrees: c == null ? null : c === h.t } };
      if (hits.length > 1) { metaOut[nm].ambiguousRows = hits.map((x) => x.row.id); findings.push({ kind: 'multiple_rows', year: ctx.year, anchor: nm, rows: hits.map((x) => x.row.id) }); }
      if (nm === 'easter' && h.t !== ctx.easter) findings.push({ kind: 'easter_row_vs_computus', year: ctx.year, table: h.tableId, rowId: h.row.id });
    } else {
      out[nm] = c;
      metaOut[nm] = { basis: 'computed_fallback', rowId: null, table: null, crossCheck: { computed: c, agrees: null } };
    }
    if (hits.length && c != null && c !== hits[0].t) findings.push({ kind: 'anchor_disagrees_with_civil_rule', year: ctx.year, anchor: nm, table: hits[0].tableId, rowId: hits[0].row.id, rowDate: hits[0].t, computed: c });
    if (hits.length && hits[0].row.wd !== ctx.core.WD[hits[0].wd] && nm !== 'jan6') findings.push({ kind: 'row_weekday_mismatch', year: ctx.year, anchor: nm, rowId: hits[0].row.id, rowWd: hits[0].row.wd, civilWd: ctx.core.WD[hits[0].wd] });
  }
  // Candidates (NEVER promoted to basis): when a Barekendan row is unlabeled in this table, report the unlabeled Sunday row that sits where the book puts it.
  const rowAt = (t) => rows.find((x) => x.t === t && x.wd === SUND);
  const cand = (nm, row, rule) => { if (metaOut[nm].basis === 'computed_fallback' && row) metaOut[nm].candidate = { rowId: row.row.id, t: row.t, text: row.row.text, rule, agreesWithComputed: row.t === metaOut[nm].crossCheck.computed }; };
  if (metaOut.assumption.basis === 'hador2_row') cand('assumption_barekendan', rowAt(out.assumption - 7 * ctx.core.DAY), 'Sunday row 7 days before the Assumption row');
  if (metaOut.exaltation.basis === 'hador2_row') cand('cross_barekendan', rowAt(out.exaltation - 7 * ctx.core.DAY), 'Sunday row 7 days before the Exaltation row');
  if (metaOut.advent_barekendan.basis === 'computed_fallback') cand('advent_barekendan', rows.find((x) => x.wd === SUND && x.row.m === 11 && [10, 11].includes(parseOrdinal(x.s))), 'Sunday row of Nov numbered Tenth/Eleventh');
  for (const x of rows) if (x.row.wd !== ctx.core.WD[x.wd]) findings.push({ kind: 'row_weekday_mismatch_any', year: ctx.year, table: x.tableId, rowId: x.row.id, date: [x.row.m, x.row.d], rowWd: x.row.wd, civilWd: ctx.core.WD[x.wd], tail: x.tail });
  // Leap-day carry (candidate only): when the computed Bun Barekendan is Feb 29, the early table (Easter+1) carries it on its Mar 1 row, which the segment split drops.
  if (metaOut.poon_paregentan.basis === 'computed_fallback' && ctx.sel.leap && metaOut.poon_paregentan.crossCheck.computed === ctx.core.utc(ctx.year, 2, 29)) {
    const et = ctx.sel.segments[0].table, r = et.rows.find((q) => q.m === 3 && q.d === 1 && M.poon_paregentan(q, stripPrefix(q.text), 3, 1, true));
    if (r) metaOut.poon_paregentan.candidate = { rowId: r.id, t: metaOut.poon_paregentan.crossCheck.computed, text: r.text, table: et.id, rule: 'early-table Mar 1 row read as Feb 29 (leap day)', agreesWithComputed: true };
  }
  // Misdated Easter row (candidate only): TT-30 prints "20. Կիր." with no month, which the table build read as Mar 20.
  if (metaOut.easter.basis === 'computed_fallback') {
    const bt = ctx.sel.segments[ctx.sel.segments.length - 1].table, r = bt.rows.find((q) => /^Զատիկ/u.test(stripPrefix(q.text)));
    if (r) metaOut.easter.candidate = { rowId: r.id, rowDate: [r.m, r.d], tableEaster: bt.easter, date_verbatim: r.date_verbatim, rule: 'row text names Easter but its m/d does not equal the table header Easter date (month missing in the print)', agreesWithComputed: bt.easter[0] === ctx.core.ymd(ctx.easter)[1] && bt.easter[1] === ctx.core.ymd(ctx.easter)[2] };
  }
  const { list, findings: f2 } = buildSundays(ctx, rows, out);
  out._sundays = list.map((u) => ({ t: u.t, name: u.name, family: u.family, ordinal: u.ordinal, rowId: u.rowId, ordinalBasis: u.ordinalBasis, table: u.table, armenian: u.armenian, barekendan: u.flags.barekendan || null, special: u.flags.special || null }));
  out._meta = metaOut;
  out._findings = [...findings, ...f2];
  return out;
}
