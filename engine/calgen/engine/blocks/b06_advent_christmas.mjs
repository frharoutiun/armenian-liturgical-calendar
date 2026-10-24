// BLOCK b06 - Hador 1 records 337-392: the Hisnakats (Advent) fast, the four feast days before the Nativity fast, the
// Nativity/Theophany fast Dec 30 - Jan 4, and the volume's end-matter. Plain-English account: docs/notes/b06.md ; open questions: rulebook/review/b06.json
// Rules are functions of (civil date, weekday, advent_barekendan anchor, Hador 2 rows). No year/date lookup tables.
// Not claimed here: Jan 5 eve (record 389, owned by b01), Nov 21 (336) and Dec 9 (358) (fixed.mjs), records 390-392 (not date-placed).
export const meta = { id: 'b06_advent_christmas', records: [337, 392], description: 'Advent (Hisnakats) fast Sundays/weeks, four feast days Dec 23-29, Nativity fast Dec 30-Jan 4; end-matter 390-392 classified, not placed' };

// ---- Hador 1 record tables (ordinals verified against rulebook/src_hador1_records.json) ----
const WEEK0 = { 0: 337, 1: 338, 2: 339, 3: 340, 4: 341, 5: 342 };                 // Mon..Sat after the Barekendan Sunday (weekday index Mon=0)
const SUNDAY = { 1: 343, 2: 350, 3: 357, 4: 365, 5: 372 };                         // 1st..5th Sunday of Hisnakats
// Vol I weekly layout after the n-th Sunday (weekday index Mon=0 .. Sat=5). Week 5 has only Mon/Tue.
const WEEKS = {
  1: { 0: 344, 1: 345, 2: 346, 3: 347, 4: 348, 5: 349 },
  2: { 0: 351, 1: 352, 2: 353, 3: 354, 4: 355, 5: 356 },
  3: { 0: 359, 1: 360, 2: 361, 3: 362, 4: 363, 5: 364 },
  4: { 0: 366, 1: 367, 2: 368, 3: 369, 4: 370, 5: 371 },
  5: { 0: 373, 1: 374 },
};
const FEAST4 = [375, 376, 377, 378];                                               // "first..fourth feast" before the fast
const SKIP = { 2: 379, 4: 380 };                                                    // Wed, Fri between the great feasts (Sunday handled separately)
const FASTDAY = [382, 383, 384, 385];                                               // first..fourth day of the Nativity fast (counted on Mon-Thu)
const FAST_FRI = 386, FAST_SAT = 387, FAST_SUN = 388, SUN_IN_FEASTS = 381;

const GENERIC_ROW = /^(Պահ|Կիրակ|Կիւրակ|Միջին|Բուն|Առաջին|Երկրորդ|Երրորդ|Չորրորդ|Հինգերորդ|Վեցերորդ|Եօթներորդ|Ապաշխարութեան|Յարութեան|Բարեկենդան|Չորեքշաբ|Ուրբաթ|Կիր\.)/;
const stripPrefix = (s) => (s || '').trim().replace(/^(Բշ|Գշ|Դշ|Եշ|Ուր|Շբ|Կիր)\.\s*/, '').replace(/^[Ա-Ֆ]{2}\.\s*/, '');   // some tables print "Բշ. ԱԿ." (weekday, tone) before the text
const rowsAreGeneric = (rows) => rows.every((r) => { const t = stripPrefix(r.text).replace(/^\[|\]$/g, '').trim(); return t === '' || /^[Ա-Ֆ]{2}\.?$/.test(t) || GENERIC_ROW.test(t); });   // empty text / bare tone = a hymn-only row

// pdf pages (page_NNN.png; printed page = pdf + 448). 374-388 read from the images (pp.96-97 = printed 544-545). 337-373 are the extractor's inferred range 91-95 (not inspected).
const PAGES = (o) => (o >= 337 && o <= 373 ? [91, 92, 93, 94, 95] : o >= 374 && o <= 378 ? [96] : o >= 379 && o <= 388 ? [97] : []);

function claim(ctx, o) {
  const { ords, rule, basis, status = 'rule', kind = 'day', note, alternatives, quoteRec, commemoration_hint } = o;
  const r = ctx.H1.get(quoteRec ?? ords[0]);
  const q = o.quote ?? (r ? (r.date_armenian && r.date_armenian !== r.name_armenian ? r.name_armenian + ' (' + r.date_armenian + ')' : r.name_armenian) : '');
  return { records: kind === 'day' ? ords : [], rows: [], rule, basis, source: { records: ords, pages: PAGES(ords[0] ?? quoteRec), quote: q }, status, kind, ...(note ? { note } : {}), ...(alternatives ? { alternatives } : {}), ...(commemoration_hint ? { commemoration_hint } : {}) };
}

// Four feast days: the first four days on/after Dec 23 that are not Wed, Fri or Sun. Returns [t1..t4].
export function feastDays(ctx, y) {
  const { utc, weekday, DAY } = ctx.core, out = [];
  for (let t = utc(y, 12, 23); out.length < 4; t += DAY) { const w = weekday(t); if (w !== 2 && w !== 4 && w !== 6) out.push(t); }
  return out;
}


// A saint record is "relocated" when a Hador 2 row on ANOTHER day of the fast already names its first saint (printed relocations/merges, e.g. Abgar pulled to the Tuesday after the 2nd Sunday,
// Indos and Domna merged on the Monday after the 1st Sunday). The record is then not repeated on its natural weekday. Names are matched by the first 5 letters of the record's first named saint.
// helper kept for the review note above
const NOT_A_NAME = /^(Սրբ|Հայրապ|Կուսան|Եպիսկ|Քահան|Վկայ|Հարց|Չորեք|Ուրբաթ|Երկուշ|Երեք|Հինգշ|Շաբաթ|Պահ|Աստուածատ)/;
export function savedStem(ctx, rec) {
  const r = ctx.H1.get(rec); if (!r || r.kind === 'ferial_day' || /^(Չորեքշաբ|Ուրբաթ)/.test(r.name_armenian)) return null;
  for (const w of r.name_armenian.split(/[\s,՝:.\-—]+/)) if (w.length >= 5 && /^[Ա-Ֆ]/.test(w) && !NOT_A_NAME.test(w)) return w.slice(0, 5);
  return null;
}
function relocatedElsewhere(ctx, rec, t, from, to) {
  const st = savedStem(ctx, rec); if (!st) return false;
  const { DAY } = ctx.core;
  for (let x = from; x <= to; x += DAY) if (x !== t && ctx.rows(x).some((r) => r.text.includes(st) && !/Բարեկենդան/.test(r.text) && !GENERIC_ROW.test(stripPrefix(r.text)))) return true;
  return false;
}

export function place(ctx, t) {
  const out = placeInner(ctx, t), { ymd, weekday, utc } = ctx.core, [y, m, d] = ymd(t), wd = weekday(t);
  // Wed/Fri before the first feast day with no Vol I weekday record left (week 5 has only Mon/Tue): the "Wed/Fri among the feasts" record is used (interpretation).
  if (m === 12 && d >= 23 && d <= 29 && (wd === 2 || wd === 4) && !out.some((c) => c.kind === 'day') && t < feastDays(ctx, y)[0]) {
    out.push(claim(ctx, { ords: [SKIP[wd]], rule: 'R-B06-FEAST-SKIP-PRE', status: 'interpretation', quote: 'Ի մէջ աւագ տօնից պատահեալ չորեքշաբթի և ուրբաթի և կիրակի՝ յառաջ քան զՅայտնութեան պահսն, են սոքա',
      basis: `This ${wd === 2 ? 'Wednesday' : 'Friday'} falls just before the first of the four feast days and the Vol I weeks of Hisnakats have no weekday record left for it (week 5 has only Monday and Tuesday); the Wednesday/Friday record of the feast days (${SKIP[wd]}) is used.` }));
  }
  return out;
}

function placeInner(ctx, t) {
  const { ymd, weekday, DAY, utc } = ctx.core;
  const [y, m, d] = ymd(t), wd = weekday(t), out = [];
  const C = (o) => claim(ctx, o);
  const rows = ctx.rows(t);

  // ---------------- Nativity fast: Dec 30 - Jan 4 (Jan 5 belongs to b01) ----------------
  if ((m === 12 && d >= 30) || (m === 1 && d <= 4)) {
    const fy = m === 12 ? y : y - 1, start = utc(fy, 12, 30);
    const ord = [], q = 'Եւ ապա պահք Ծննդեան և Յայտնութեանն Քրիստոսի Աստուծոյ մերոյ. և տօնք ոչ լինին:';
    if (wd === 6) return [C({ ords: [FAST_SUN], rule: 'R-B06-FAST-SUN', status: 'rule', quote: 'Կիրակի Պահոց Ծննդեան և Յայտնութեան (Ի Կիւրակէն, որ ՚ի մէջ Յայտնութեան պահոցն հանդիպիցի)',
      basis: 'Record 388 is "the Sunday that falls in the middle of the Theophany fast". Every Sunday from Dec 30 to Jan 4 is inside the fast (Hador 2 calls them "Sixth/Seventh Sunday: fast").' })];
    if (wd === 4) return [C({ ords: [FAST_FRI], rule: 'R-B06-FAST-FRI', status: 'rule', basis: 'Record 386 is the Friday of the Nativity fast; it is assigned to the Friday inside the fast (Dec 30 - Jan 4).' })];
    if (wd === 5) return [C({ ords: [FAST_SAT], rule: 'R-B06-FAST-SAT', status: 'rule', basis: 'Record 387 (Basil, Gregory of Nyssa, Sylvester, Ephrem) is "the Saturday of the fast"; assigned to the Saturday inside the fast (Dec 30 - Jan 4).' })];
    let n = 0; for (let x = start; x <= t; x += DAY) { const w = weekday(x); if (w <= 3) n++; }
    ord.push(FASTDAY[n - 1]);
    const late = weekday(start) >= 4;                                              // Dec 30 itself is Fri/Sat/Sun
    // wave 12 (H1D-NATIVITY-FAST-NUMBERING decided from the text): the book has exactly FOUR numbered records («Յառաջնում / Յերկրորդում / Յերրորդում / Ի չորրորդում աւուր Ծննդեան պահոց», 382-385)
    // and names the other three days of the week by their weekday (386 «Ի յՈւրբաթի», 387 «Ի պահոց Շաբաթ օրն», 388 «Ի Կիւրակէն»). The fast Dec 30 - Jan 4 holds at most four Mon-Thu days, so the
    // ordinals count the ordinary Mon-Thu days of the fast and no «fifth/sixth day» heading exists. The day is therefore named by the ordinal of the record it reads (n), never by a calendar-day count.
    const LET = ['Ա', 'Բ', 'Գ', 'Դ'][n - 1];
    out.push(C({ ords: ord, rule: late ? 'R-B06-FAST-DAY-AFTER-WEEKEND' : 'R-B06-FAST-DAY', status: late ? 'interpretation' : 'rule', quote: q,
      ...(LET ? { commemoration_hint: { kind: 'numbered_day', armenian: `${LET}. օր Պահոց Ծննդեան և Յայտնութեան`, borrowed_hymnody: false, basis: `The ${n}-th Mon-Thu day of the Nativity fast (records 382-385: «Յառաջնում / Յերկրորդում / Յերրորդում / Ի չորրորդում աւուր Ծննդեան պահոց»); Friday, Saturday and Sunday have their own records (386-388).` } } : {}),
      ...(late ? { note: 'Dec 30 is Fri/Sat/Sun: the Mon-Thu days are numbered from the first Mon-Thu day of the fast (the four numbered records cover exactly the Mon-Thu days; decided from the text, wave 12).' } : {}),
      basis: `Records 382-385 are the first to fourth Mon-Thu days of the fast and Friday, Saturday, Sunday have their own records (386-388): this is the ${n}-th Mon-Thu day counted from Dec 30, record ${ord[0]}.` }));
    return out;
  }

  // ---------------- The four feast days and Wed/Fri/Sun among them: Dec 23-29 ----------------
  const firstFeast = m === 12 && d >= 23 && d <= 29 ? feastDays(ctx, y)[0] : null, pre = firstFeast != null && t < firstFeast;   // pre: before the first feast day the weeks of the fast continue
  if (m === 12 && d >= 23 && d <= 29 && !(pre && !feastDays(ctx, y).includes(t))) {
    const fd = feastDays(ctx, y), idx = fd.indexOf(t);
    const q374 = 'Իսկ յառաջ քան զյայտնութեան պահսն չորս օր համարեա առանց չորեքշաբթի եւ ուրբաթու եւ կիւրակէի, ըստ ցուցման Տարեգրոյն, յորս կատարիցես զաւագ տօնսն';
    if (idx >= 0) {
      out.push(C({ ords: [FEAST4[idx]], rule: 'R-B06-FEAST4', status: 'interpretation', quote: q374,
        basis: `Four great feasts (David and James; Stephen; Peter and Paul; the Sons of Thunder) fall on four days before the Theophany fast, "nearly without Wednesday, Friday and Sunday". They are placed on the first four non-Wed/Fri/Sun days from Dec 23: this is feast number ${idx + 1} (record ${FEAST4[idx]}).`,
        note: 'The book says "according to the Taregir"; the Dec 23 starting point is read from the Hador 2 rows (see review b06-Q1).' }));
      if (d === 29) out.push(C({ ords: [378], kind: 'label', rule: 'R-B06-NATIVITY-BAREKENDAN', status: 'interpretation', quote: 'Յակոբայ եւ Յովհաննու: Բարեկենդան Ծննդեան պահոցն',
        basis: 'Hador 2 labels Dec 29 "Barekendan of the Nativity fast" in every table (on the fourth feast when it falls on Dec 29, otherwise on the Wed/Fri/Sun that day).' }));
      return out;
    }
    if (wd === 2 || wd === 4) out.push(C({ ords: [SKIP[wd]], rule: 'R-B06-FEAST-SKIP', status: 'rule', quote: 'Ի մէջ աւագ տօնից պատահեալ չորեքշաբթի և ուրբաթի և կիրակի՝ յառաջ քան զՅայտնութեան պահսն, են սոքա',
      basis: `Records 379-381 are the Wednesday, Friday and Sunday that fall among the great feasts before the fast. This is a ${wd === 2 ? 'Wednesday' : 'Friday'} in Dec 23-29 that is not one of the four feast days.` }));
    else if (wd === 6) {
      // A Sunday after the first feast day is a Sunday "among the great feasts" (record 381), whether Hador 2 calls it the Fifth (Dec 24-26) or the Sixth (Dec 27-29) Sunday.
      out.push(C({ ords: [SUN_IN_FEASTS], rule: d <= 26 ? 'R-B06-SUN5-AMONG-FEASTS' : 'R-B06-SUN6-FEASTS', status: 'interpretation', quote: 'Կիրակի ի մէջ աւագ տօնից պատահեալ',
        basis: `This Sunday (Dec ${d}) falls after the first of the four feast days: record 381, "Sunday among the great feasts".` + (d <= 26 ? ' Hador 2 prints it as the Fifth Sunday of Hisnakats; its own record 372 is not read (the Sunday among the feasts has its own readings).' : ''),
        note: 'Hador 2 prints only the ordinal here; see review b06-Q5.' }));
      if (d <= 26) out.push(C({ ords: [372], kind: 'label', rule: 'R-B06-SUN5-LABEL', status: 'interpretation', quoteRec: 372, basis: 'Also the Fifth Sunday of Hisnakats by count (Hador 2 prints the ordinal); record 372 is shown as a label only.' }));
    } else { out.push(C({ ords: [], kind: 'label', rule: 'R-B06-FEAST-GAP', status: 'needs_human_review', quote: q374, basis: 'Day in Dec 23-29 that is neither a feast day nor Wed/Fri/Sun: should not occur; flagged.' })); }
    return out;
  }

  // ---------------- Sundays 5 (Dec 20-22) ----------------
  if (m === 12 && d >= 20 && d <= 22 && wd === 6) {   // (before the first feast day)
    return [C({ ords: [SUNDAY[5]], rule: 'R-B06-SUN5', status: 'rule', quote: 'Հինգերորդ Կիւրակէ Յիսնակաց',
      basis: 'The only Sunday in Dec 20-26 is the fifth Sunday after the Barekendan of Hisnakats.' })];
  }

  // ---------------- Hisnakats fast proper: after the Barekendan Sunday up to Dec 22 ----------------
  const B = ctx.anchor('advent_barekendan');
  if (B == null || weekday(B) !== 6 || t <= B || (m === 12 && d > 22 && !pre) || m < 11) return out;
  const dt = Math.round((t - B) / DAY), n = Math.floor(dt / 7), dow = dt % 7;      // n = Sundays elapsed; dow 0 = the Sunday itself
  const k = Math.round((B - utc(ymd(B)[0], 11, 15)) / DAY);                       // 0 = Barekendan on Nov 15 (longest fast) .. 6 = Nov 21
  const fixedDay = (m === 11 && d === 21) || (m === 12 && d === 9);                // Presentation / Conception: boundary with fixed.mjs

  if (dow === 0) {                                                                // a Sunday
    if (n >= 1 && n <= 5) out.push(C({ ords: [SUNDAY[n]], rule: 'R-B06-SUN' + n, status: 'rule', quoteRec: SUNDAY[n],
      basis: `The ${n}${['st', 'nd', 'rd', 'th'][n - 1]} Sunday of the Hisnakats fast = Barekendan Sunday + ${7 * n} days (Hador 2 prints this ordinal on the same Sunday in every table). On Dec 9 the Conception feast is added by fixed.mjs.` }));
    return out;
  }
  const wi = dow - 1;                                                             // Mon=0..Sat=5
  if (n === 0) {                                                                  // first week of the fast
    if (fixedDay) { out.push(C({ ords: [WEEK0[wi]], kind: 'label', rule: 'R-B06-FIXED-COLLISION', status: 'interpretation', alternatives: [{ records: [WEEK0[wi]], what: 'weekday record displaced by the fixed feast' }],
      basis: `Fixed feast on ${d}/${m} falls on a weekday of the first fast week; fixed.mjs decides. The weekday record ${WEEK0[wi]} is only the candidate: the printed tables keep the day a fast day and, when the displaced record is the Saturday saint 342, relocate it by a printed row (merged with 356).` })); return out; }
    if (rows.length === 0 || rowsAreGeneric(rows)) out.push(C({ ords: [WEEK0[wi]], rule: 'R-B06-WK0', status: wi === 5 ? 'interpretation' : 'rule', quoteRec: WEEK0[wi],
      basis: `Records 337-342 are the Monday..Saturday after the Barekendan of Hisnakats (the first week of the fast; Mon-Fri are fast days). This is day +${dt}, a ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][wi]}.`,
      ...(wi === 5 ? { note: 'Some tables merge or move the Saturday saints (see review b06-Q2).' } : {}) }));
    return out;
  }
  if (n < 1 || n > 5 || !(WEEKS[n] && WEEKS[n][wi] != null)) return out;
  const rec = WEEKS[n][wi];
  if (fixedDay) { out.push(C({ ords: [rec], kind: 'label', rule: 'R-B06-FIXED-COLLISION', status: 'interpretation', alternatives: [{ records: [rec] }],
    basis: `Fixed feast (${d}/${m}) takes this day; fixed.mjs decides. Vol I weekday record ${rec} is only the candidate. Hador 2 relocates displaced SAINT records by printed rows on an earlier weekday (360, 359, 354); displaced ferial Wed/Fri records (361, 355, 370) are not relocated by any table.` })); return out; }
  // Monday after the 1st Sunday is record 344 in every table (explicitly or merged with later saints).
  if (n === 1 && wi === 0) { out.push(C({ ords: [344], rule: 'R-B06-WK1-MON', status: 'interpretation', quoteRec: 344,
    basis: 'Monday after the first Sunday of Hisnakats is the virgins Juliane and Vasiliskouhi (record 344) in all 35 tables (in some merged with later saints).' })); return out; }
  if (rows.length && !rowsAreGeneric(rows)) return out;                           // Hador 2 names the saints of this day: engine/links.mjs claims them
  // Wave 10: the wave-9 rule C6 (a saint printed merged on a Monday is not repeated on his own Vol I day; TT-26 Indos+Domna, Nov 27 and Dec 21) was REVERTED: no note in either Hador
  // says so; the table rows as printed plus Vol I order give both days (owner: 'keep both days'; docs/notes/literal_fidelity.md). review b06-Q11 stays open as information.
  // Every other day of weeks 1-5 that Hador 2 leaves without a named saint row: the book says "see the rest in Volume I in order, keeping the order of the place"
  // (Hador 2 rubric printed on the Monday-after-1st-Sunday / 2nd-Sunday rows of the shorter-fast tables). Read as: the day takes the Vol I record of its own weekday
  // in its own week (week n = after the n-th Sunday of Hisnakats). Cross-check over all 7 Barekendan dates (Nov 15..21) x 5 tables each (35 tables): every saint row printed by
  // Hador 2 is either this very record or a printed relocation/merge of a saint whose natural day was taken (see docs/notes/b06.md, "Short fasts"); no free day's natural record is
  // relocated elsewhere by a row. Interpretation, not a quoted rule.
  out.push(C({ ords: [rec], rule: k === 0 ? 'R-B06-WEEKS-LONGEST' : 'R-B06-WEEKS-VOL1-ORDER', status: 'interpretation', quoteRec: rec,
    quote: 'Եւ զայլսն ըստ կարգին տես յԱռաջին հատորն մինչեւ ՚ի վերջն, պահելով զկարգ տեղւոյս (Hador 2, Երկրորդ Կիրակի row)',
    basis: `Day with no named Hador 2 saint: Vol I order is followed ("keeping the order of the place"): week ${n} after the ${n}${['st', 'nd', 'rd', 'th', 'th'][n - 1]} Sunday of Hisnakats, ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wi]} = record ${rec}.` + (k === 0 ? ' (Barekendan Nov 15: the longest fast, the Vol I layout fits the calendar exactly.)' : ` (Barekendan is Nov ${15 + k}: the fast is shorter than the Vol I layout; Hador 2 prints the merges/moves on the days that differ, this day is not one of them.)`) }));
  return out;
}
