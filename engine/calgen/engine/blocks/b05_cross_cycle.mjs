// Block b05: the Holy Cross cycle, Hador 1 records 261-335 (336 = Nov 21 is a fixed feast, left to engine/fixed.mjs; 262 = Sept 8, same).
// Sunday numbering is the book's: Exaltation (Khachverats) Sunday = 1st Sunday after the Cross (record 270); the Sunday before it is the
// Barekendan of the Cross (record 261); the last Sunday before the Hisnakats (Advent) fast is the 10th (7-week interval) or the 11th (8-week interval).
// Which of the two is read from the Hador 2 table in force (the ordinal word printed on the Barekendan-of-Hisnakats row), never from civil counting.
export const meta = { id: 'b05_cross_cycle', records: [261, 336], description: 'Holy Cross Barekendan, Exaltation octave, Sundays 2-11 after the Cross with weekly blocks' };

const SUNDAY_HEAD = { 1: 270, 2: 277, 3: 284, 4: 291, 5: 298, 6: 305, 7: 312, 8: 319, 9: 326, 10: 333, 11: 335 };
const GENERIC = /^\[?((Բշ|Գշ|Դշ|Եշ|Ուր|Շբ|Կիր)\.\s*)?([Ա-Ֆ]{2}\.?\s*)?((Չորեքշաբ\S*|Ուրբաթ\S*|Պահոց|Պահք|Ապաշխարութեան)\s*)*\]?\s*[։:.]?\s*$/;   // bare weekday / fast / hymn-only rows (no saint named)
const ORD_WORD = { 'Տասներորդ': 10, 'Մետասաներորդ': 11 };

// Page ranges: verified by eye: 269 plate = pdf p.78; 270 = pdf pp.79-80 (book pp.527-528). Others are the extractor's inferred ranges (approximate).
const PAGES = [[261, 268, [76, 77]], [269, 269, [78]], [270, 276, [79, 81]], [277, 283, [81, 82]], [284, 312, [82, 86]], [313, 335, [86, 91]]];
export const pagesOf = (o) => { for (const [a, b, p] of PAGES) if (o >= a && o <= b) return p; return []; };

function src(ctx, recs, quoteRec) {
  recs = recs.slice();
  const r = ctx.H1.get(quoteRec ?? recs[0]); if (!recs.length && quoteRec != null) recs = [quoteRec];
  return { records: recs, pages: pagesOf(recs[0] ?? quoteRec), quote: r ? (r.date_armenian && r.date_armenian !== r.name_armenian ? r.name_armenian + ' (' + r.date_armenian + ')' : r.name_armenian) : '' };
}

// Interval length read from the table in force: ordinal word printed on the Sunday row of the Barekendan of the Hisnakats fast.
export function tableCycleLength(ctx, adv) {
  const D = ctx.core.DAY;
  for (const t of [adv, adv - 7 * D, adv + 7 * D]) {                      // normally the first; the others only if an anchor is off by a week
    for (const r of ctx.rows(t)) {
      if (r.wd !== 'Sun') continue;
      for (const [w, n] of [['Մետասաներորդ', 11], ['Տասներորդ', 10]]) if (r.text.includes(w) || r.text.toLowerCase().includes(w.toLowerCase())) return { n, row: r, at: t };
    }
  }
  return null;
}

export function cycleOf(ctx) {
  const ex = ctx.anchor('exaltation'), adv = ctx.anchor('advent_barekendan');
  if (ex == null || adv == null) return null;
  const D = ctx.core.DAY, civilN = Math.round((adv - ex) / D / 7) + 1;
  const tab = tableCycleLength(ctx, adv);
  const cb = ctx.anchor('cross_barekendan') ?? ex - 7 * D;
  if (cb !== ex - 7 * D) { ctx.note('b05: cross_barekendan anchor is not Exaltation-7; no b05 claims'); return null; }
  if (tab && tab.at !== adv) { ctx.note('b05: table row with the 10th/11th ordinal is not on the advent_barekendan anchor date'); return null; }
  if (tab && tab.n !== civilN) { ctx.note(`b05: table says ${tab.n} Sundays but anchors span ${civilN}; no b05 claims`); return null; }
  if (civilN !== 10 && civilN !== 11) return null;
  return { ex, adv, cb, N: tab ? tab.n : civilN, fromTable: !!tab, row: tab && tab.row };
}

const C = (ctx, t, recs, rule, basis, status, extra = {}) => ({ records: recs, rows: [], rule, basis, source: src(ctx, recs, extra.quoteRec), status, kind: extra.kind || 'day', ...(extra.note ? { note: extra.note } : {}), ...(extra.alternatives ? { alternatives: extra.alternatives } : {}), ...(extra.quote ? { source: { ...src(ctx, recs, extra.quoteRec), quote: extra.quote } } : {}) });

export function place(ctx, t) {
  const cy = cycleOf(ctx); if (!cy) return [];
  const D = ctx.core.DAY, { ex, adv, cb, N } = cy;
  if (t < cb || t > adv) return [];
  const status = cy.fromTable ? 'rule' : 'interpretation';
  const has = (...o) => o.every((x) => ctx.H1.has(x));
  const out = [];
  const dt = Math.round((t - cb) / D);                      // days since the Barekendan Sunday
  const wk = Math.floor(dt / 7), dow = dt % 7;              // wk 0 = Barekendan week; wk n = week after the n-th Sunday; dow 0 = Sunday .. 6 = Saturday
  const rule = (s) => 'R-B05-' + s;

  // --- Barekendan of the Cross week (records 261, 263-268) ---
  if (wk === 0) {
    if (dow === 0) { if (has(261)) out.push(C(ctx, t, [261], rule('CROSS-BAREKENDAN-SUNDAY'), 'The Sunday before Exaltation Sunday is the Barekendan Sunday of the Cross (record 261).', 'rule')); }
    else if (dow <= 5) {
      const rec = 262 + dow; if (has(rec)) {
        out.push(C(ctx, t, [rec], rule('CROSS-FAST-WEEKDAY'), 'Monday-Friday of the week before Exaltation are the days of the fast of the Holy Cross (records 263-267, in book order Mon..Fri).', 'rule'));
        if (dow === 1) out.push(C(ctx, t, [], rule('CROSS-FAST-RUBRIC'), 'Record 263 states that the fast of the Holy Cross follows and that during it feasts do not occur.', 'rule', { kind: 'rubric', quoteRec: 263, quote: 'Եւ ապա պահք սրբոյ Խաչին, յորս տօնք ոչ գոն:' }));
      }
    } else if (has(268)) out.push(C(ctx, t, [268], rule('CROSS-CHURCH-DEDICATION-SAT'), 'Saturday before Exaltation: Feast of the Holy Church at the dedication of the Holy Cross (record 268).', 'rule'));
    return out;
  }

  // --- Sunday heads ---
  if (dow === 0) {
    if (wk >= 1 && wk <= N && SUNDAY_HEAD[wk] != null) {
      const sn = wk; let rec = SUNDAY_HEAD[sn];
      if (sn === N) rec = N === 10 ? 333 : 335;
      if (sn === 10 && N === 11) rec = 333;
      if (has(rec)) out.push(C(ctx, t, [rec], rule('SUNDAY-' + sn), `This is Sunday number ${sn} after the Holy Cross, counted from Exaltation Sunday = 1 (book's own ordinal; the table in force has ${N} such Sundays before the Hisnakats fast${cy.fromTable ? '' : ' [taken from civil counting: table row missing]'}).`, sn === N ? status : 'rule', { quoteRec: rec }));
      if (sn === 2) out.push(C(ctx, t, [], rule('VARAK-BAREKENDAN'), 'Record 278 (the Monday after the 2nd Sunday) says the fast of Varak Holy Cross begins then, so the 2nd Sunday is the Barekendan of the Varak fast; 17 of the 35 Hador 2 tables print this label on that Sunday (e.g. "Երկրորդ Կիրակի. Բարեկենդան Վարագայ Խաչին"), the others print no row.', 'rule', { kind: 'label', quoteRec: 278, quote: 'Երկրորդ Կիրակի. Բարեկենդան Վարագայ Խաչին (Hador 2); Եւ ապա պահք Վարագայ սրբոյ Խաչին. Բայց տօնք լինին (record 278)' }));
      if (sn === N) out.push(C(ctx, t, [], rule('HISNAKATS-BAREKENDAN-MARK'), N === 10 ? 'Record 333: with a 7-week interval the 10th Sunday is the Barekendan of the Hisnakats fast.' : 'Record 333: with an 8-week interval the 11th Sunday is the Barekendan of the Hisnakats fast.', status, { kind: 'label', quoteRec: 333, quote: 'եթէ միջոցիս ուտիքն եօթն շաբաթ իցէ, այս տասներորդ կիւրակէս լինի բարեկենդան Յիսնակաց պահոցն միշտ: Իսկ եթէ ութն շաբաթ իցէ ... կոչի Մետասաներորդ կիւրակէ, և բարեկենդան Յիսնակաց պահոցն' }));
    }
    return out;
  }

  // --- weekdays after Sunday number n (n = wk) ---
  const n = wk;
  if (n < 1 || n >= N) return out;                          // week after the last Sunday (Barekendan of Hisnakats) belongs to the Hisnakats block (b06)
  const head = SUNDAY_HEAD[n];
  if (n === 7) {
    const r = [313, 314, 315, 318, 317, 334], r8 = [313, 314, 315, 316, 317, 318];
    if (N === 10) {
      const ids = dow === 2 ? [[314, 316]] : [[r[dow - 1]]];
      const recs = ids[0];
      if (has(...recs)) out.push(C(ctx, t, recs, rule('WEEK7-SHORT-INTERVAL'), 'Week after the 7th Sunday when the interval is 7 weeks: Severian is celebrated with the Hyperichians (Tue), John Chrysostom on Thursday, All Saints on Saturday; other days as listed (record 313 rubric).', status, { quoteRec: 313, quote: 'եթէ եօթն շաբաթ լինիցի, զՍեւերիանոսն ընդ Հիպերիքեանցն տօնեսցես. եւ ՚ի հինգշաբաթի օրն զՅովհան Ոսկեբերանն, եւ ՚ի շաբաթի օրն զտօն Ամենայն սրբոց տօնեցես անպատճառ' }));
    } else if (has(r8[dow - 1])) out.push(C(ctx, t, [r8[dow - 1]], rule('WEEK7-LONG-INTERVAL'), 'Week after the 7th Sunday when the interval is 8 weeks: the feasts are kept as listed in the book, one per weekday (record 313 rubric).', status, { quoteRec: 313, quote: 'Յորժամ ուտիք միջոցիս ութն շաբաթ լինիցի, ըստ կարգին որպէս եդեալք են տօնք այս շաբաթուս, այդպէս տօնեսցես' }));
    return out;
  }
  if (n === 10) {                                           // only reached when N === 11: the added week
    if (dow === 6) { if (has(334)) out.push(C(ctx, t, [334], rule('ADDED-WEEK-ALL-SAINTS'), 'With an 8-week interval one week with its feasts is added after the 10th Sunday; its Saturday is the Feast of All Saints (record 333 rubric, record 334).', status, { quoteRec: 334, quote: 'աստ յաւելու շաբաթ մի տօնիւք հանդերձ, որոյ շաբաթի օրն կատարի Տօն ամենայն սրբոց' })); }
    else {
      const named = ctx.rows(t).some((r) => !GENERIC.test(r.text.trim()));
      if (named) return out;     // a named Hador 2 saint row governs that day (claimed by engine/links.mjs); some tables name different saints on these days (review b05-03)
      const rec = 254 + dow; // Mon 255, Tue 256, Wed 257, Thu 258, Fri 259: the weekday records of the week after the Barekendan-of-the-Cross-eve Sunday (b04 records)
      // Thursday 258 (Abraham, Khoren, Cosmas, Damian, Astvatsatur) carries no readings: its own rubric says "Զպատճէնն սոցա ՚ի վերջն, նախ քան զառաջ տօնսն տեսցես" = "see their text at the end, before the first feasts",
      // i.e. records 373 (Abraham, Khoren, Cosmas, Damian) and 374 (Astvatsatur), which sit right before the four feasts (375). So the Thursday takes 258 + 373 + 374.
      const recs = rec === 258 ? [258, 373, 374] : [rec];
      if (has(...recs)) out.push(C(ctx, t, recs, rule('ADDED-WEEK-REPEAT'), 'The "feasts" of the added week (8-week interval) are read as the repeat of the weekday feasts of records 255-259, which record 258 says are copied again at the end; the Hador 2 rows of the 8-week tables show these same commemorations (Andrew the general, Adrian...). Interpretation: record 333 does not name them.' + (rec === 258 ? ' Thursday 258 has no readings of its own: the readings are those of 373 and 374 (record 258 rubric).' : ''), 'interpretation', { quoteRec: 258, quote: 'Զպատճէնն սոցա ՚ի վերջն, նախ քան զառաջ տօնսն տեսցես:', alternatives: ['no commemoration records in the added week (only generic weekday)'] }));
    }
    return out;
  }
  if (head == null || n > 9) return out;
  const rec = head + dow;
  if (!has(rec)) return out;
  const basis = n === 1 ? 'Week of the Exaltation (record 270): Mon Feast of the Cross, Tue-Thu Feast of the Church, Fri-Sat Feast of the Cross, in book order (records 271-276).' : `Mon-Sat after Sunday ${n} after the Cross: the weekly block that follows the Sunday head in the book (records ${head + 1}-${head + 6}).`;
  out.push(C(ctx, t, [rec], rule(n === 1 ? 'EXALTATION-OCTAVE' : 'WEEKDAY-BLOCK-' + n), basis, 'rule'));
  if (n === 2 && dow === 1) out.push(C(ctx, t, [], rule('VARAK-FAST-RUBRIC'), 'Record 278: the fast of Varak Holy Cross begins here, but feasts occur. Extent of the fast is not stated (see review b05-02).', 'needs_human_review', { kind: 'rubric', quoteRec: 278, quote: 'Եւ ապա պահք Վարագայ սրբոյ Խաչին. Բայց տօնք լինին:' }));
  return out;
}
