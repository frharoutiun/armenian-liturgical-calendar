// Block b04: Hador 1 records 168-260 - Resurrection Sundays 1-6 after Pentecost, Vardavar (Transfiguration) and the Sundays after it,
// the Fast of the Assumption (Barekendan + fast week), the nine days of the Assumption, and the Sundays/weeks after the Mother of God
// up to (not including) the Barekendan of the Cross (record 261 = b05). Record 262 (Sep 8) is a fixed feast (fixed.mjs).
// Which week-count applies is read from the Hador 2 table in force ("Միջոց ուտիքն N շաբաթ" on the Vardavar / Assumption rows), never from a civil count.
export const meta = { id: 'b04_summer_assumption', records: [168, 260], description: 'Sundays after Pentecost, Vardavar weeks, Assumption fast, nine days of the Assumption, weeks after the Mother of God' };

const D = 86400000;
const WORDS = { 'մի': 1, 'երկու': 2, 'երեք': 3, 'չորս': 4, 'հինգ': 5, 'վեց': 6, 'եօթն': 7, 'ութ': 8 };
const ORD = { 'երկրորդ': 2, 'երրորդ': 3, 'չորրորդ': 4, 'հինգերորդ': 5, 'վեցերորդ': 6, 'եօթներորդ': 7, 'ութերորդ': 8 };
const RESUR_HEADS = [168, 175, 182, 189, 196, 203];        // Sundays P+7 .. P+42
const PG = { resur: [56, 61], vard: [61, 66], fast: [66, 70], assump: [71, 73], after: [72, 74] };   // APPROXIMATE pdf pages (only pdf 57 and 72 visually checked)
const Q = {
  resur: 'Զաստի մինչեւ ՚ի Վարդավառի երրորդ Կիւրակէն՝ միշտ անշարժ են ամենայն եղեալքդ (rec 168)',
  vard: 'Տե՛ս յԱռաջին հատորն մինչեւ յերրորդ շաբաթու ուրբաթ օրն ... ՚ի շաբաթ օրն եկ աստ (Hador 2, Vardavar row)',
  eph: 'Ի բարեկենդանի շաբաթ օրն միշտ տօն է՝ Եփեսոսի սուրբ ժողովոյն երկու հարիւր հայրապետացն (rec 230)',
  nine: 'Եւ այսպէս երիցս անգամ կրկնեա զերիս պատկերս՝ որ լինի ինն օր՝ ըստ սահմանադրութեան սրբոյն Ներսեսի Կլայեցւոյ (rec 241, p.520)',
  sun46: 'Եթէ աստ ըստ ցուցանելոյ տարեգրոյն չորրորդ կիւրակէ հարկաւորեսցի՝ տես զկնի ութօրէից երկրորդ կիւրակէն ... (rec 229)',
};

const stripPrefix = (s) => (s || '').replace(/^(Կիր|Շբ|Բշ|Գշ|Դշ|Եշ|Ուրբ)\.\s*/, '').replace(/^[ԱԲԳԴ][ՁԿ]\.?\s*/, '').trim();
const WDAY = '(?:երկուշաբ\\S*|երեքշաբ\\S*|չորեքշաբ\\S*|հինգշաբ\\S*|ուրբաթ\\S*|շաբաթ\\S*|շաբթ\\S*)';
// generic weekday rows: a bare weekday, 'պահոց', 'պահք', or '<weekday> պահոց' (TT-04/TT-05 print 'Չորեքշաբթի պահոց')
const GENERIC = new RegExp('^(?:' + WDAY + '(?:\\s+(?:պահոց|պահք))?|պահոց\\S*|պահք(?:\\s+սուրբ\\s+աստուածածնի)?)[\\s.:։]*$', 'i');
// A Hador 2 row that names an observance (a saint/feast) on a weekday: the row-link agents place it; this block then stays silent that day.
function namedRow(rows) { return rows.some((r) => { const x = stripPrefix(r.text).replace(/\s+/g, ' '); return x && !GENERIC.test(x); }); }


// BORROWED ROWS (book: Hador 2 TT-02 and TT-03, Vardavar row). TT-02: "Միջոց ուտիքն վեց շաբաթ է: Զամենայն որպէսն միջոյն՝ մինչեւ ՚ի սուրբ Խաչն, տես ՚ի Ա տարեգիրն, միայն զամսամիւտն միով իւրով աւելի կալ".
// TT-03: "Միջոց ուտիքն վեց շաբաթ է: Զամենայն որպէսն տես ՚ի Ա տարեգիրն մինչեւ ՚ի յԱստուածածնի բարեկենդանն, միայն զամսամիւտն երկու թուով աւելի կալ".
// i.e. these two tables print no saint rows in the six-week interval and send the reader to Taregir A (= TT-01, Easter 22 March, the same six-week interval, the same Sunday structure) with the
// dates one (TT-02) / two (TT-03) days later. The TT-01 row on civil date (t - shift) is therefore read as the row of date t. (Reading of "Ա տարեգիր" as TT-01: interpretation; the "month-end" clause is not modelled: review b04-tt02-tt03-borrow.)
const BORROW = { 'TT-02': 1, 'TT-03': 2 };
function borrowedRows(ctx, t, V, AB) {
  const tid = ctx.tableAt(t).id, shift = BORROW[tid];
  if (!shift || V == null || AB == null || !(t > V && t < AB) || ctx.rows(t).length) return null;
  const src = ctx.H2.tables.find((x) => x.id === 'TT-01'); if (!src) return null;
  const [, m, d] = ctx.core.ymd(t - shift * D), wd = ctx.core.WD[ctx.core.weekday(t)];
  const rows = src.rows.filter((r) => r.m === m && r.d === d && r.wd === wd);
  return rows.length ? { rows, shift, tid } : null;
}
function borrowedClaims(ctx, bor) {
  const out = [], vrow = ctx.rows(ctx.anchor('vardavar')).find((r) => r.rubric) || {};
  for (const r of bor.rows) {
    const cands = (ctx.rowLinks.links || []).filter((l) => l.match.text === r.text && (!l.match.months || l.match.months.includes(r.m)) && (!l.match.weekdays || l.match.weekdays.includes(r.wd)) && (!l.match.tables || l.match.tables.includes('TT-01')));
    if (!cands.length) { out.push({ records: [], rows: [], rule: 'R-B04-BORROW-TT01', basis: `Row of Taregir A (TT-01) read for ${bor.tid} (${bor.shift} day(s) later) has no recorded Hador 1 link`, source: { records: [], pages: [], quote: vrow.rubric || '', table: 'TT-01', row: r.id }, status: 'needs_human_review', kind: 'label' }); continue; }
    for (const l of cands) out.push({ records: l.records, rows: [], rule: 'R-B04-BORROW-TT01', basis: `${bor.tid} prints no rows here and refers to Taregir A (TT-01); TT-01 row "${r.text.slice(0, 60)}" (TT-01 ${r.m}/${r.d}) is read ${bor.shift} day(s) later. Link: ${l.rule}.`,
      source: { records: l.records, pages: (l.source && l.source.pages) || [], quote: vrow.rubric || '', table: 'TT-01', row: r.id, link_rule: l.rule }, status: 'interpretation', kind: l.kind || 'day', alternatives: l.alternatives, note: 'borrowed from TT-01; see review b04-tt02-tt03-borrow' });
  }
  return out;
}

function rubricWeeks(rows) {
  for (const r of rows) { const m = /Միջոց ուտիքն\s+(\S+)\s+շաբաթ/.exec(r.rubric || ''); if (m && WORDS[m[1]] != null) return WORDS[m[1]]; }
  return null;
}
function rowOrdinal(rows) {
  for (const r of rows) { const w = stripPrefix(r.text).split(/[\s.:։\[]/)[0].toLowerCase(); if (ORD[w]) return ORD[w]; }
  return null;
}

function claim(ctx, rule, records, basis, pages, quote, status = 'rule', extra = {}) {
  return { records, rows: [], rule, basis, source: { records, pages: [...pages], pages_note: 'approximate; verify against page images', quote }, status, kind: 'day', ...extra };
}

// The week-counts in force for this year. Returns {N, N2, status, notes}
function counts(ctx) {
  if (ctx._b04) return ctx._b04;
  const V = ctx.anchor('vardavar'), AB = ctx.anchor('assumption_barekendan'), A = ctx.anchor('assumption'), CB = ctx.anchor('cross_barekendan');
  const out = { V, AB, A, CB, N: null, N2: null, nStatus: 'rule', n2Status: 'rule', notes: [] };
  const pick = (rub, ord, civil, label) => {         // table rubric vs table Sunday ordinal vs civil count
    const o = ord != null ? ord : null;
    if (rub != null && (o == null || o === rub)) { if (civil != null && civil !== rub) { out.notes.push(`${label}: table rubric says ${rub} weeks but anchors give ${civil}`); return [rub, 'needs_human_review']; } return [rub, 'rule']; }
    if (rub != null && o != null && o !== rub) {
      if (civil === o) { out.notes.push(`${label}: table rubric says ${rub} weeks but the table's own Sunday ordinal and the anchors agree on ${o} (internal inconsistency in Hador 2)`); return [o, 'interpretation']; }
      out.notes.push(`${label}: rubric ${rub} vs ordinal ${o} vs anchors ${civil}`); return [rub, 'needs_human_review'];
    }
    if (o != null) return [o, civil != null && civil !== o ? 'needs_human_review' : 'interpretation'];
    if (civil != null) { out.notes.push(label + ': no table ordinal/rubric; civil count used'); return [civil, 'interpretation']; }
    return [null, 'needs_human_review'];
  };
  if (V != null) {
    const ordr = AB != null ? rowOrdinal(ctx.rows(AB)) : null;
    [out.N, out.nStatus] = pick(rubricWeeks(ctx.rows(V)), ordr != null ? ordr - 1 : null, AB != null ? Math.round((AB - V) / D / 7) : null, 'Vardavar->Assumption fast');
  }
  if (A != null) {
    const ordr = CB != null ? rowOrdinal(ctx.rows(CB)) : null;
    [out.N2, out.n2Status] = pick(rubricWeeks(ctx.rows(A)), ordr != null ? ordr - 1 : null, CB != null ? Math.round((CB - A) / D / 7) : null, 'Assumption->Cross fast');
  }
  return (ctx._b04 = out);
}

// Which Vol. I record stands for the j-th Sunday after Vardavar (j = 4..): rec 229 (+ rec 17 reciprocal): 4th -> 'second Sunday after the octave' (12), 5th -> 'third' (15);
// if a 6th is also needed: first/second/third after the octave (9, 12, 15) take places 4, 5, 6.
function lateSunday(N, j) {
  const needed = N; // Sundays 2..N are ordinary Sundays; Barekendan itself is Sunday N+1
  if (needed <= 5) return { 4: 12, 5: 15 }[j] ?? null;
  if (needed === 6) return { 4: 9, 5: 12, 6: 15 }[j] ?? null;
  return null;
}
// COMMEMORATION vs HYMNODY (wave 6). A Vol. I record borrowed for a displaced Sunday/weekday (rec 229, rec 17) supplies the readings and hymns only. The festal
// commemoration of that day is what Hador 2 prints on it: the ordinal Sunday after Vardavar ("Չորրորդ", "Հինգերորդ", ...; rec 17 words it "Չորրորդ կիւրակէ ... զկնի Վարդավառի")
// or, on a Wednesday/Friday with no row, the bare fasting weekday. The claim therefore carries `commemoration_hint` for the naming layer (engine/names.mjs); `records` stay the hymnody source.
const ORD_WORD = { 2: 'Երկրորդ', 3: 'Երրորդ', 4: 'Չորրորդ', 5: 'Հինգերորդ', 6: 'Վեցերորդ', 7: 'Եօթներորդ' };
const hint = (o) => ({ borrowed_hymnody: true, ...o });
const LATE_FERIALS = { 9: [10, 11], 12: [13, 14], 15: [16, 17] };      // Wed, Fri records that go with the Sunday head

export function place(ctx, t) {
  const out = [];
  const P = ctx.anchor('pentecost'); if (P == null) return out;
  const c = counts(ctx), { V, AB, A } = c;
  const wd = ctx.core.weekday(t);                      // Mon=0..Sun=6
  let rows = ctx.rows(t);
  const bor = borrowedRows(ctx, t, V, AB);
  if (bor) rows = bor.rows;
  const named = namedRow(rows);
  const rec = (o) => (ctx.H1.has(o) ? o : null);
  if (bor && named) { const bc = borrowedClaims(ctx, bor); if (bc.length) return bc; }

  // 1. Resurrection Sundays 1-6 after Pentecost and their weeks (always exactly 7 weeks Pentecost -> Vardavar)
  if (V != null && t >= P + 7 * D && t < V) {
    const off = Math.round((t - P) / D), k = Math.floor(off / 7), r = off % 7, head = RESUR_HEADS[k - 1];
    if (k === 3 && r <= 5) out.push({ records: [182], rows: [], rule: r === 0 ? 'R-B04-GREGORY-FAST' : 'R-B04-GREGORY-FAST-DAY', kind: 'rubric', status: 'rule',
      basis: r === 0 ? 'Third Sunday after Pentecost: "Եւ ապա պահք սրբոյն Գրիգորի Լուսաւորչին մերոյ, բայց տօնք լինին" = then follows the fast of St Gregory the Illuminator, but feasts are kept.' : 'Day of the fast of St Gregory the Illuminator (Monday to Friday after the third Sunday after Pentecost; feasts are kept on it).',
      source: { records: [182], pages: [57], quote: 'Եւ ապա պահք սրբոյն Գրիգորի Լուսաւորչին մերոյ, բայց տօնք լինին:' }, fast: r === 0 ? null : { status: 'fast', feasts_allowed: true, name: 'Fast of St Gregory the Illuminator', extent: 'Mon-Fri after the 3rd Sunday after Pentecost' },
      note: 'the book names the fast but not its days; Mon-Fri by the shape of the other Barekendan fasts, CONFIRMED by the printed directories 2013-2026 (K2): «Պահք» is printed on every one of these days (18 of 18 Monday/Tuesday/Thursday days) and on neither Saturday nor Sunday' });
    // The day whose record ends «Եւ ապա պահք X» is the Barekendan (eve) of the fast X: Hador 2 prints exactly this label wherever the book uses the formula (Pentecost -> Elijah fast, 22+10 rows; the Monday after the 2nd
    // Sunday after the Cross -> Varak, 11+ rows; the Monday after the 3rd Sunday of Hisnakats -> Jacob of Nisibis, 19+ rows; the Nativity fast); for the Gregory fast Hador 2 prints no label, the formula is the book's own.
    if (k === 3 && r === 0) out.push({ records: [], rows: [], rule: 'R-B04-GREGORY-BAREKENDAN', kind: 'label', status: 'interpretation', label_text: 'Բարեկենդան պահոց սրբոյն Գրիգորի Լուսաւորչին',
      basis: 'The record of the 3rd Sunday after Pentecost closes with «Եւ ապա պահք սրբոյն Գրիգորի Լուսաւորչին մերոյ»: by the book\'s own use of this formula (Pentecost/Elijah, Varak, Jacob of Nisibis, Nativity fast) the day is the Barekendan of that fast.',
      source: { records: [182], pages: [57], quote: 'Եւ ապա պահք սրբոյն Գրիգորի Լուսաւորչին մերոյ, բայց տօնք լինին:' } });
    // WAVE 9 (owner choice 2026-10-14, derived in docs/notes/collisions_labels.md): the first Sunday after Pentecost carries «Յիշատակ Եղիայի մարգարէին» as an additional label.
    // Evidence: record 168 appoints four lections that are all Elijah's (3 Kingdoms 18:29-..., 4 Kingdoms 2:1-..., James 5:16-..., Luke 4:25-...), the week before it is "պահք Եղիական" (rec 161), and Hador 1
    // words the corresponding Jonah day outright in the heading (rec 33 «Յիշատակ է Յովնանու մարգարէին») with one Jonah lection. Hador 2 and the Hador 1 heading never say it, so it is an interpretation.
    if (k === 1 && r === 0) out.push({ records: [168], rows: [], rule: 'R-B04-ELIJAH-REMEMBRANCE', kind: 'label', status: 'interpretation',
      commemoration_label: { armenian: 'Յիշատակ Եղիայի մարգարէին', kind: 'remembrance_label', title_id: 'remembrance_of_prophet_elijah', title_basis: 'reviewed title of the earlier schema; Armenian wording identical to the label' },
      basis: 'First Sunday after Pentecost: all four lections of record 168 are about the prophet Elijah and the preceding fast is called the Elijah fast; read as the remembrance of the Prophet Elijah (interpretation: no Hador heading or row says so).',
      source: { records: [168, 161, 33], pages: PG.resur, quote: 'Եւ ապա պահք Եղիական' }, alternatives: ['no label (nothing in Hador 1/2 names it)'] });
    if (head) {
      if (r === 0) out.push(claim(ctx, 'R-B04-RESUR-SUNDAY', [head], `Sunday ${k} of the Resurrection Sundays (${k} week(s) after Pentecost): the book's Sunday head record ${head}.`, PG.resur, Q.resur));
      else if (!named) out.push(claim(ctx, 'R-B04-RESUR-WEEK', [head + r], `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r - 1]} after Resurrection Sunday ${k}: the weekly block that follows Sunday head ${head} in the book.`, PG.resur, 'weekly block after rec ' + head));
    }
    return out;
  }
  if (V == null || AB == null || c.N == null) return out;
  const N = c.N, ns = c.nStatus;
  const wk = (t - V) / D;
  // 2. Vardavar and the weeks after it up to the Barekendan of the Assumption fast
  if (t >= V && t < AB) {
    const w = Math.floor(wk / 7), r = wk % 7;
    const satBefore = t === AB - D;
    if (satBefore) { if (!named) out.push(claim(ctx, 'R-B04-EPHESUS-SAT', [230], 'The Saturday before the Barekendan of the Assumption fast is always the feast of the Council of Ephesus.', PG.vard, Q.eph, ns)); return out; }
    if (w === 0) {
      const R = [210, 211, 212, 213, 214, 215, 216];
      if (r === 0) out.push(claim(ctx, 'R-B04-VARDAVAR', [210], 'Vardavar (Transfiguration) Sunday, Easter+98: canon of the Transfiguration.', PG.vard, 'ԿԱՆՈՆ ՊԱՅԾԱՌԱԿԵՐՊՈՒԹԵԱՆՆ ... (ՎԱՐԴԱՎԱՌ) (rec 210)', ns));
      else if (!named) out.push(claim(ctx, 'R-B04-VARDAVAR-WEEK', [R[r]], 'Day ' + (r + 1) + ' of the Transfiguration week (Vol. I order).', PG.vard, 'rec ' + R[r], ns));
      return out;
    }
    if (w === 1 || w === 2) {
      const head = w === 1 ? 217 : 224, base = head;
      // Vol. I weekdays run Mon..Fri (Sat is the Ephesus rule above, or a Hador 2 row 'come here on Saturday')
      if (r === 0) out.push(claim(ctx, 'R-B04-VARDAVAR-SUNDAY', [head], `${w + 1}${w === 1 ? 'nd' : 'rd'} Sunday after Vardavar (table ordinal ${w + 1}): Sunday head ${head}.`, PG.vard, Q.vard, ns));
      else if (r <= 5 && !named) out.push(claim(ctx, 'R-B04-VARDAVAR-WEEK', [base + r], 'Weekday after the Sunday head ' + head + ' (Vol. I order). Hador 2 note: Vol. I is used through the Friday of the third (or second) week.', PG.vard, Q.vard, ns));
      else if (r === 6 && w === 1 && N >= 3 && !named) out.push(claim(ctx, 'R-B04-VARDAVAR-WEEK', [223], 'Saturday after the 2nd Sunday after Vardavar (Vol. I order), when the table has at least 3 intervening weeks.', PG.vard, 'rec 223', ns));
      else if (r === 6 && w === 2 && N >= 4) { /* table row governs ('on Saturday come here') */ }
      return out;
    }
    // w >= 3 : weeks displaced from the post-Theophany-octave Sundays
    if (r === 0) {
      const head = lateSunday(N, w + 1);
      if (head) out.push(claim(ctx, 'R-B04-LATE-SUNDAY', [head], `Sunday ${w + 1} after Vardavar (table has ${N} intervening weeks): Vol. I record ${head} (a Sunday 'after the octave'), per the instruction under the Friday of week 3.`, [56, 66], Q.sun46, ns === 'rule' ? 'interpretation' : ns, { commemoration_hint: hint({ kind: 'sunday', armenian: `${ORD_WORD[w + 1]} Կիւրակէ զկնի Վարդավառին`, basis: `Hador 2 prints the ordinal "${ORD_WORD[w + 1]}" on this Sunday; record ${head} is only the borrowed hymnody/readings (rec 229).` }), note: "reading of 'ութօրէից' as the octave of the Nativity/Theophany; see review b04-late-sundays" }));
      else out.push({ records: [], rows: [], rule: 'R-B04-LATE-SUNDAY', basis: 'no Sunday record designated for this ordinal', source: { records: [229], pages: [66], quote: Q.sun46 }, status: 'needs_human_review', kind: 'label', note: `Sunday ${w + 1} after Vardavar` });
    } else if ((r === 3 || r === 5) && !named) {                 // Wed, Fri (r counted from the Sunday = 0)
      const head = lateSunday(N, w + 1);
      if (head) out.push(claim(ctx, 'R-B04-LATE-FERIAL', [LATE_FERIALS[head][r === 3 ? 0 : 1]], 'Wednesday/Friday of a displaced week: the Wed/Fri record that goes with the Sunday head ' + head + '.', [56, 66], 'rec ' + head, 'interpretation', { commemoration_hint: hint({ kind: 'weekday', armenian: null, basis: 'Wednesday/Friday of a displaced week: Hador 2 prints no observance; the commemoration is the bare (fasting) weekday. The Vol. I record is borrowed hymnody/readings only.' }) }));
    }
    return out;
  }
  // 3. Barekendan of the Assumption fast, fast week, Shoghakat Saturday
  if (t >= AB && t <= AB + 6 * D) {
    const r = Math.round((t - AB) / D);
    if (r === 0) out.push(claim(ctx, 'R-B04-AB-SUNDAY', [231], 'Barekendan of the Fast of the Assumption (Sunday; table ordinal ' + (N + 1) + ').', PG.fast, 'Կիւրակէին՝ որ է բարեկենդան սուրբ Աստուածածնի պահոցն (rec 231)', ns, { commemoration_hint: ({ borrowed_hymnody: false, kind: 'sunday_ordinal', armenian: `${ORD_WORD[N + 1]} Կիւրակէ զկնի Վարդավառին`, basis: `Hador 2 prints the ordinal "${ORD_WORD[N + 1]}" with the Barekendan on this Sunday (Vardavar counts as the 1st).` }) }));
    else if (!named || r === 1) out.push(claim(ctx, 'R-B04-AB-WEEK', [231 + r], r === 6 ? 'Saturday before the Assumption: canon of the Shoghakat (Holy Etchmiadzin).' : 'Fast day of the Assumption fast (Vol. I order).', PG.fast, 'rec ' + (231 + r), ns));
    return out;
  }
  // 4. Nine days of the Assumption, then the weeks after the Mother of God
  if (A == null) return out;
  const a = Math.round((t - A) / D);
  if (a < 0) return out;
  if (a <= 8) {
    if (a <= 2) out.push(claim(ctx, 'R-B04-ASSUMPTION', [239 + a], `Day ${a + 1} of the Assumption (Sunday + 2 days).`, PG.assump, 'rec ' + (239 + a)));
    if (a === 7) out.push({ records: [], rows: [], rule: 'R-B04-ASSUMPTION-SUNDAY-2', kind: 'label', status: 'interpretation', basis: 'The Sunday inside the nine days (Assumption+7) is the SECOND Sunday after the Mother of God: record 247 calls Assumption+14 "Երրորդ Կիւրակէ զկնի սուրբ Աստուածածնին", so the Assumption Sunday counts as the first. The book has no record of its own for it; its hymnody is the nine-day cycle form (rule R-B04-ASSUMPTION-NINE).',
      source: { records: [247], pages: [72], quote: 'Երրորդ Կիւրակէ զկնի սուրբ Աստուածածնին' }, commemoration_hint: { borrowed_hymnody: false, kind: 'sunday_ordinal', armenian: 'Երկրորդ Կիւրակէ զկնի սուրբ Աստուածածնին', basis: 'counted from rec 247 (third Sunday at Assumption+14)' } });
    if (a > 2 && !named) out.push(claim(ctx, 'R-B04-ASSUMPTION-NINE', [239 + (a % 3)], `Day ${a + 1} of the nine days: repeats the form of day ${(a % 3) + 1}.`, PG.assump, Q.nine, 'interpretation', { note: 'which of the three forms repeats on which day (day 4 = day 1, ...) is the natural reading of "thrice the three forms"' }));
    return out;
  }
  const N2 = c.N2, s2 = c.n2Status;
  if (a === 9 && !named) out.push(claim(ctx, 'R-B04-AFTER-NINE', [242], 'Tuesday after the nine days of the Assumption: Joachim and Anna.', PG.after, 'Երեքշաբաթ. զկնի ինն աւուրց Վերափոխման սուրբ Աստուածածնի (rec 242)'));
  else if (a >= 10 && a <= 13 && !named) out.push(claim(ctx, 'R-B04-AFTER-WEEK', [233 + a], 'Weekday in the first week after the nine days (Vol. I order).', PG.after, 'rec ' + (233 + a)));
  else if (a === 14) out.push(claim(ctx, 'R-B04-AFTER-SUNDAY', [247], '3rd Sunday after the Mother of God (Assumption Sunday counted as the 1st): finding of the Belt.', PG.after, 'Երրորդ Կիւրակէ զկնի սուրբ Աստուածածնին (rec 247)'));
  else if (a >= 15 && a <= 20 && !named) out.push(claim(ctx, 'R-B04-AFTER-WEEK', [233 + a], 'Weekday in the week of the 3rd Sunday after the Mother of God (Vol. I order); the Saturday is the Council of Nicaea.', PG.after, 'rec ' + (233 + a)));
  else if (a === 21) out.push(claim(ctx, 'R-B04-AFTER-SUNDAY', [254], '4th Sunday after the Mother of God. If the table has 3 weeks this Sunday is also the Barekendan of the Cross (rec 261, b05).', PG.after, 'Չորրորդ Կիւրակէ զկնի սուրբ Աստուածածնին (rec 254); Hador 2: Տե՛ս յԱռաջին հատորն մինչև ՚ի չորրորդ Կիւրակէն', N2 == null ? 'needs_human_review' : s2));
  else if (a >= 22 && a <= 27 && N2 === 4 && !named) out.push(claim(ctx, 'R-B04-AFTER-WEEK', [233 + a], 'Weekday in the week of the 4th Sunday after the Mother of God (only when the table has 4 weeks; the Saturday is the Birth of the Virgin or Nicaea by the table).', PG.after, 'rec ' + (233 + a) + '; ' + 'Զի յայս շաբաթ օրս յայսց երկուց տօնից մինն տօնի ՚ի հարկէ՝ ըստ ցուցման տարեգրոյն (rec 260)', s2));
  return out.filter((x) => x.records.length === 0 || x.records.every((o) => rec(o) != null));
}
