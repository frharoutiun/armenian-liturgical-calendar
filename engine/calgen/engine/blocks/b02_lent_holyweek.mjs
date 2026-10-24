// BLOCK b02: Hador 1 records 51-117 = Great Lent (first Monday .. 40th day), Saturdays of the saints, Lazarus Saturday,
// Palm Sunday, Holy Week (incl. multi-service days), Easter, Easter Monday of the departed, Hinants days, New Sunday (Krknazatik).
// Placement is a pure function of (Poon Paregentan anchor, Easter, civil date). No date/year table. See docs/notes/b02.md.
// Record 50 (Bun Barekendan Sunday) belongs to b01; record 116 (Annunciation, fixed Apr 7) is left to engine/fixed.mjs; 118+ is b03.
export const meta = { id: 'b02_lent_holyweek', records: [51, 117], description: 'Great Lent, Holy Week, Easter and the Hinants days to New Sunday (records 51-117 except 116)' };

const D = 86400000;
const SRC_QUOTE = (ctx, o) => { const r = ctx.H1.get(o); return r ? `${r.date_armenian ?? ''} | ${r.name_armenian}` : ''; };

// Approximate pdf pages of each record (pdf page = book page - 448). Verified by viewing pdf 10,11,14-23,25,27,28,31,32;
// the others are interpolated and marked in docs/notes/b02.md.
const PAGES = {
  51: [14, 15], 52: [15], 53: [15], 54: [15], 55: [15], 56: [15], 57: [15], 58: [15], 59: [15], 60: [16], 61: [16], 62: [16], 63: [16], 64: [16], 65: [16], 66: [16], 67: [16], 68: [16], 69: [16], 70: [16, 17], 71: [17],
  72: [17], 73: [17], 74: [17], 75: [17], 76: [17], 77: [17], 78: [17], 79: [17], 80: [17], 81: [17], 82: [18], 83: [18], 84: [18], 85: [18], 86: [18], 87: [18], 88: [18], 89: [18], 90: [18], 91: [18], 92: [18], 93: [19],
  94: [19, 20], 95: [20, 21], 96: [21, 22], 97: [22], 98: [22], 99: [22, 23], 100: [23], 101: [23, 24], 102: [24, 25], 103: [25, 26, 27], 104: [27], 105: [27], 106: [27, 28], 107: [28, 29, 30], 108: [31], 109: [31, 32],
  110: [32], 111: [32, 33], 112: [33], 113: [33], 114: [33], 115: [33], 117: [33, 34],
};
const pages = (recs) => [...new Set(recs.flatMap((o) => PAGES[o] || []))];

// ---- the book's sequence, expressed as offsets -------------------------------------------------------------------------
// base 'pp' = Poon Paregentan / Bun Barekendan Sunday (record 50, ctx.anchor('poon_paregentan')), base 'e' = Easter Sunday.
// Day N of Great Lent = pp + N (Monday = day 1; the book numbers days 2-5, 8-12, 15-19 in its headings: «Բ. օր Մեծի Պահոց» ...).
const LENT_WEEKDAYS = [[51, 52, 53, 54, 55], [58, 59, 60, 61, 62], [65, 66, 67, 68, 69], [73, 74, 75, 76, 77], [80, 81, 82, 83, 84], [87, 88, 89, 90, 91]];
const LENT_SATS = [[56], [63], [70, 71], [78], [85]];        // Saturdays of weeks 1..5 (pp+6, +13, +20, +27, +34)
const LENT_SUNDAYS = { 7: 57, 14: 64, 21: 72, 28: 79, 35: 86 }; // 2nd..6th Sunday of Great Lent
const SAINT_KEYS = { 56: ['Թէոդոր'], 63: ['Կիւրղ'], 70: ['Յովհաննու Երուսաղ', 'Օձնեց', 'Տաթեւ'], 78: ['Քառասն', 'Սեբաստի'], 85: ['վիրապ', 'Լուսաւորչին մերոյ սոսկալի'] };
// fixed feasts that can fall inside Lent (owner ruling: six fixed feasts only; the other four lie outside Great Lent)
const FIXED_IN_LENT = [[2, 14, 'Candlemas (Teaṙnĕndaraj), record 31/32'], [4, 7, 'Annunciation, record 116']];

export const COLLISIONS = [
  { id: 'R-B02-COLLIDE-IMMOVABLE', status: 'rule', text: 'From Bun Barekendan until the first Sunday after Pentecost all feasts, hymn-sets (hartsk), middle-sets (mijotsk) and tones stay fixed, EXCEPT Candlemas (Feb 14) and Annunciation (Apr 7).', source: { records: [50], pages: [14], quote: 'Այլեւ աստի մինչեւ ՚ի Հոգւոյ Գալստեան առաջին կիւրակէն՝ ամենայն եղեալքդ, այսինքն տօնք, հարցք, միջոցք, եւ ձայնք, են միշտ անշարժք, բաց ՚ի Տեառնընդառաջէն եւ յԱւետեաց տօնէն' } },
  { id: 'R-B02-COLLIDE-ANNUNCIATION-SUNDAY', status: 'rule', text: 'Annunciation on a Sunday of Great Lent: the Annunciation canon is sung and the two verses of Norastegheal are said (record 116). Details of the other collisions (Holy Week, Easter week, Green Sunday) are owner ruling R6 and belong to engine/fixed.mjs.', source: { records: [116], pages: [33], quote: 'Եւ եթէ ՚ի պահոց կիւրակէի հանդիպիցի, զՆորաստեղծեալի երկու տունն ասա' } },
  { id: 'R-B02-COLLIDE-SATURDAY-SAINT', status: 'needs_human_review', text: 'If Candlemas or Annunciation falls on a Saturday that carries a saint of Lent, the book says nothing in Hador 1 about moving that saint. Hador 2 rows show different Saturday saints in tables TT-01 and TT-32. The block marks such Saturdays unresolved.', source: { records: [31, 32, 116], pages: [], quote: '' } },
];

// ---- helpers ---------------------------------------------------------------------------------------------------------
function norm(s) { return (s || '').replace(/[՚-՟’']/g, '').replace(/եւ/g, 'և'); }
function h2SaintsOn(ctx, t) {   // which of the Lent-Saturday saints a Hador 2 row on this date names
  const named = new Set();
  for (const r of ctx.rows(t)) for (const [rec, keys] of Object.entries(SAINT_KEYS)) if (keys.some((k) => norm(r.text).includes(norm(k)))) named.add(+rec);
  return named;
}
function fixedHit(ctx, t) { const [, m, d] = ctx.core.ymd(t); return FIXED_IN_LENT.find((f) => f[0] === m && f[1] === d) || null; }

function mk(ctx, recs, rule, basis, status, extra = {}) {
  const quote = extra.quote ?? recs.map((o) => SRC_QUOTE(ctx, o)).filter(Boolean).join(' || ');
  const { quote: _q, ...rest } = extra;
  return { records: recs, rows: [], rule, basis, status, kind: 'day', source: { records: recs, pages: pages(recs), quote }, ...rest };
}

export function place(ctx, t) {
  const E = ctx.easter, PP = ctx.anchor('poon_paregentan') ?? (E - 49 * D);
  if (PP !== E - 49 * D) ctx.note('b02: Poon Paregentan anchor differs from Easter-49; Lent block follows the anchor, Holy Week follows Easter');
  const out = [];
  const pk = Math.round((t - PP) / D), ek = Math.round((t - E) / D);   // days since PP / Easter

  // ---------------- Great Lent proper: pp+1 .. pp+41 ----------------------------------------------------------------
  if (pk >= 1 && pk <= 41) {
    const wk = Math.floor((pk - 1) / 7), dow = (pk - 1) % 7;  // dow 0..4 Mon-Fri, 5 Sat, 6 Sun
    if (dow <= 4 && wk <= 5) {
      const rec = LENT_WEEKDAYS[wk][dow];
      const series = { family: 'day:great lent', ordinal: pk };
      if (rec === 51) out.push(mk(ctx, [51], 'R-B02-LENT-FIRST-MONDAY', 'The first Monday after Bun Barekendan is the first day of Great Lent (the book calls it «Առաջին երկուշաբաթ օրն պահոց»); the days that follow are numbered from it.', 'rule', { series, quote: 'Առաջին երկուշաբաթ օրն պահոց' }));
      else out.push(mk(ctx, [rec], 'R-B02-LENT-WEEKDAY', `Weekday record in the Great Lent sequence: day ${pk} of Great Lent (Monday to Friday of lent-week ${wk + 1}); counted from the Monday after Bun Barekendan, taken in the book's order with the Sundays and Saturdays skipped.`, 'rule', { series }));
    } else if (dow === 5 && wk <= 4) {
      const recs = LENT_SATS[wk], lead = recs[0];
      const fx = fixedHit(ctx, t), named = h2SaintsOn(ctx, t);
      // earlier collision this Lent?
      // A displaced saint counts as ABSORBED when a Hador 2 row on a later Saturday (before this one) names it: the Taregir itself then shows where it went
      // (table TT-01: Cyril of Jerusalem joins the next Saturday's Johns), and the Saturdays after that keep the book's order.
      let earlier = false, absorbedBy = null; const displaced = [];
      for (let w = 0; w < wk; w++) if (fixedHit(ctx, PP + (6 + 7 * w) * D)) {
        const lost = LENT_SATS[w][0]; let found = null;
        for (let w2 = w + 1; w2 < wk && !found; w2++) if (h2SaintsOn(ctx, PP + (6 + 7 * w2) * D).has(lost)) found = w2;
        if (found == null) { earlier = true; displaced.push(...LENT_SATS[w]); } else absorbedBy = absorbedBy ?? found;
      }
      if (named.size && !named.has(lead)) {
        out.push(mk(ctx, [], 'R-B02-LENT-SAT-SAINT', 'A Hador 2 row on this Saturday names a different Lent saint than the sequence of Hador 1 gives here; the block leaves the Saturday unresolved.', 'needs_human_review', { alternatives: [{ records: recs, why: 'Hador 1 order of Saturday saints' }, { records: [...named], why: 'saint named by the Hador 2 row' }], note: 'see review b02 R-B02-Q-SAT-SAINT-SHIFT', source: { records: recs, pages: pages(recs), quote: recs.map((o) => SRC_QUOTE(ctx, o)).join(' || ') } }));
      } else if (earlier && !fx) {
        // WAVE 6 (zone 1): the Saturday saints are assigned by POSITION (the Saturday after the n-th Sunday of Lent, book order 56, 63, 70+71, 78, 85). A fixed feast on an
        // earlier Saturday takes only that civil day; Taregir TT-01 shows what the book does with the displaced saint (it joins the NEXT Saturday's group, row of Feb 21:
        // Cyril + the Johns) and then the Saturdays after it keep their own saints (Feb 28 = 78, Mar 7 = 85). So the positional record is placed; whether the displaced
        // saint is ALSO named here is not printed in a table without a row, so it is recorded as an alternative, not claimed.
        out.push(mk(ctx, recs, 'R-B02-LENT-SAT-SAINT', `Saturday of lent-week ${wk + 1}: positional saint of the book's sequence. A fixed feast took an earlier Saturday of this Lent (displaced record ${displaced.join('+')}); the Taregir row of this Saturday does not name the displaced saint, so the sequence is not shifted.`, 'interpretation', { series: { family: 'saturday:great lent', ordinal: wk + 1 }, alternatives: [{ records: [...displaced, ...recs], why: 'the displaced saint also joins this Saturday (as the TT-01 row of the next Saturday does)' }], note: 'see review b02 R-B02-Q-SAT-SAINT-SHIFT' }));
      } else if (absorbedBy != null && !fx) {
        out.push(mk(ctx, recs, 'R-B02-LENT-SAT-ABSORBED', `Saturday of lent-week ${wk + 1}. A fixed feast took an earlier Saturday of this Lent, but the Hador 2 row of Saturday ${absorbedBy + 1} names the displaced saint, so the Taregir has absorbed it there; this Saturday keeps the book's order.`, 'interpretation', { series: { family: 'saturday:great lent', ordinal: wk + 1 }, alternatives: ['leave unresolved (the book states no general shift rule)'], note: 'see review b02 R-B02-Q-SAT-SAINT-SHIFT' }));
      } else if (fx) {
        out.push(mk(ctx, recs, 'R-B02-LENT-SAT-SAINT', `Saturday saint of lent-week ${wk + 1}, but a fixed feast (${fx[2]}) falls on this civil day; fixed.mjs decides who takes the day, the book does not move the saint.`, 'interpretation', { series: { family: 'saturday:great lent', ordinal: wk + 1 }, note: 'fixed feast collision: ' + fx[2] }));
      } else {
        out.push(mk(ctx, recs, 'R-B02-LENT-SAT-SAINT', `Saturday of lent-week ${wk + 1}: the saint(s) the book assigns to this Saturday of Great Lent (the sequence is read in book order, one record per Saturday after the Sunday records).`, named.size ? 'rule' : 'rule', { series: { family: 'saturday:great lent', ordinal: wk + 1 }, note: named.size ? 'Hador 2 row on this date names the same saint' : undefined }));
      }
    } else if (dow === 5 && wk === 5) {   // pp+41 Lazarus Saturday
      out.push(mk(ctx, [92, 93], 'R-B02-LAZARUS-SAT', 'The Saturday before Palm Sunday is the remembrance of the raising of Lazarus. Records 92 and 93 are the two halves of one Saturday (92 opens it, 93 continues with the readings).', 'rule', { quote: 'Շաբաթ. Յիշատակ է յարութեանն Ղազարու', note: 'records 92 and 93 both carry the heading; page 19 continues the text of 92 without a new heading' }));
    } else if (dow === 6 && LENT_SUNDAYS[pk]) {
      const rec = LENT_SUNDAYS[pk];
      out.push(mk(ctx, [rec], 'R-B02-LENT-SUNDAY', `Sunday number ${pk / 7 + 1} of Great Lent (Bun Barekendan counts as the first); the book orders them: second (Արտաքսման), third (Անառակին), fourth (Տնտեսի), fifth (Դատաւորի), sixth (Գալստեան).`, 'rule', { series: { family: 'sunday:great lent', ordinal: pk / 7 + 1 } }));
    }
  }

  // ---------------- Palm Sunday and Holy Week to Easter-1 -----------------------------------------------------------
  if (ek === -7) out.push(mk(ctx, [94, 95], 'R-B02-PALM-SUNDAY', 'Palm Sunday (Ծաղկազարդ) is the Sunday before Easter; record 94 is the Canon of the Entry into Jerusalem with the Gate-opening (Dռնբացէք) beginning, record 95 continues with the Gate-opening on the evening of the same Sunday.', 'rule', { quote: 'Ծաղկազարդի Կիւրակէ', note: 'record 95 is a continuation of 94 on the same civil day (evening)' }));
  else if (ek === -6) out.push(mk(ctx, [96], 'R-B02-HOLYWEEK-MON', 'Great Monday (Աւագ Երկուշաբաթ), the day after Palm Sunday.', 'rule'));
  else if (ek === -5) out.push(mk(ctx, [97], 'R-B02-HOLYWEEK-TUE', 'Great Tuesday (Աւագ Երեքշաբաթ), remembrance of the ten virgins.', 'rule'));
  else if (ek === -4) out.push(mk(ctx, [98], 'R-B02-HOLYWEEK-WED', 'Great Wednesday (Աւագ Չորեքշաբաթ).', 'rule'));
  else if (ek === -3) out.push(mk(ctx, [99, 100, 101, 102], 'R-B02-HOLYWEEK-THU', 'Great Thursday (Աւագ Հինգշաբաթ) is one day with four services recorded separately: the morning (99), the Release of the Penitents at the third hour (100), the sixth-hour service and Divine Liturgy (101) and the tenth-hour Foot-washing (102).', 'rule', { quote: 'Իսկ ՚ի յերրորդում ժամու ժողովեսցին ՚ի դուռն եկեղեցւոյն վասն արձակելոյ զապաշխարողսն', note: 'multi-record day: 100-102 are continuations of 99' }));
  else if (ek === -2) out.push(mk(ctx, [103, 104, 105], 'R-B02-HOLYWEEK-FRI', 'Great Friday (Աւագ Ուրբաթ): the night vigil, morning and crucifixion services (103), the seventh and eighth hours (104) and the Burial service at the tenth hour (105) are one day.', 'rule', { quote: 'Աւագ Ուրբաթ. Կարգ գիշերային հսկման, առաւօտեան եւ խաչելութեան', note: 'multi-record day. The night vigil is held on the evening of Thursday by the clock, but the book heads it Friday' }));
  else if (ek === -1) out.push(mk(ctx, [106, 107], 'R-B02-HOLYWEEK-SAT', 'Great Saturday (Աւագ Շաբաթ): the night and morning services (106) and the Easter-eve lamp-lighting Ճրագալոյց (107, ninth hour on the same Saturday).', 'rule', { quote: 'Ճրագալոյց Սրբոյ Զատկի', note: 'multi-record day' }));

  // ---------------- Easter and the Hinants days ---------------------------------------------------------------------
  else if (ek === 0) out.push(mk(ctx, [108, 109], 'R-B02-EASTER', 'Easter Sunday (Սուրբ Զատիկ), computed by the owner-ruled Gregorian computus. Record 108 is the feast heading (title page only), 109 the Easter Canon.', 'rule', { quote: 'Զատկի կիւրակէ. Ի գիշերին հսկումն է' }));
  else if (ek === 1) out.push(mk(ctx, [110], 'R-B02-EASTER-MONDAY', 'The Monday after Easter is Monday of the departed (Երկուշաբաթի մեռելոց), the book names it directly after the Easter canon.', 'rule', { quote: 'Երկուշաբաթի մեռելոց է' }));
  else if (ek >= 2 && ek <= 5) out.push(mk(ctx, [111 + (ek - 2)], 'R-B02-HINANTS-WEEKDAY', `Tuesday to Friday of Easter week (Յինանց): the four weekday records follow Easter Monday in book order (here ${['Tuesday', 'Wednesday', 'Thursday', 'Friday'][ek - 2]}).`, 'rule'));
  else if (ek === 6) out.push(mk(ctx, [115], 'R-B02-HINANTS-SAT', 'Saturday of Easter week: the remembrance of the beheading of St John the Baptist is placed here by the book, with «everything of the Resurrection».', 'rule', { quote: 'Իւր սարօքն. եւ ամենայն ինչ յարութեան է' }));
  else if (ek === 7) out.push(mk(ctx, [117], 'R-B02-NEW-SUNDAY', 'New Sunday (Նոր Կիւրակէ, Կրկնազատիկ) is the Sunday after Easter.', 'rule', { quote: 'Նոր կիւրակէ. որ եւ ասի Կրկնազատիկ' }));

  // At most one claim per date from this block by construction (the branches are disjoint except the Lent range, which ends at pp+42).
  return out.filter((c) => c);
}
