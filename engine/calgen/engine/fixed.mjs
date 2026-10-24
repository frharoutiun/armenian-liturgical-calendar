// calgen/engine/fixed.mjs - the six fixed dominical feasts and their interplay with the day's own record(s).
// Rules transcribed from Hador 1 records 1, 31, 32, 116, 262, 336, 358, 389 (+ owner rulings R5/R6 in output/design/DECISIONS.md).
// See docs/notes/fixed_fasting.md for the plain-English account and rulebook/review/fixed_fasting.json for open questions.
// resolveFixed(ctx, t, dayClaims) -> { claims:[...], keep: null | [ordinals] }
//   keep = final ordinals of the day's base records (the integrator adds the fixed_feast records itself); null = integrator default (union).
export const meta = { id: 'fixed', description: 'six fixed feasts (Jan 6, Feb 14, Apr 7, Sep 8, Nov 21, Dec 9), Jan 5 eve, Feb 13 eve, interplay with the day' };

// Book pages: pdf page numbers (book page = pdf page + 448). pages verified against the page images unless noted.
export const FIXED = [
  { id: 'jan6', m: 1, d: 6, records: [1], stem: /Ծննդեան|Յայտնութ/, name: 'Nativity and Theophany of Christ', pages: [1], pages_note: 'record 1 start page not individually re-checked',
    sunday: { rule: 'R-FIX-JAN6-SUNDAY', records: [1], quote: 'Եթէ կիւրակէի հանդիպի, Իւղաբերից աւետարանն կարդասցեն, շարական ասասցեն զՆորաստեղծեալն, իսկ յայլում աւուր զԱրարչականն:' } },
  { id: 'feb14', m: 2, d: 14, records: [31, 32], stem: /Տեառնընդառաջ/, name: 'Presentation of the Lord (Teaunendaraj)', pages: [10, 11], eve: { m: 2, d: 13, records: [31, 32] } },
  { id: 'apr7', m: 4, d: 7, records: [116], stem: /Աւետեաց/, name: 'Annunciation', pages: [34, 35], eve: { m: 4, d: 6, records: [116] } },
  { id: 'sep8', m: 9, d: 8, records: [262], stem: /Ծննդեան/, name: 'Nativity of the Virgin', pages: [75, 76], pages_note: 'p.75 verified (heading); continuation on p.76 not re-checked', eve: { m: 9, d: 7, records: [262] },
    sunday: { rule: 'R-FIX-SEP8-SUNDAY', records: [262], quote: 'Երգ, ըստ պատշաճին՝ Արարչական. եւ եթէ կիւրակէ իցէ՝ Նորաստեղծեալ:' } },
  { id: 'nov21', m: 11, d: 21, records: [336], stem: /Ընծայման/, name: 'Presentation of the Virgin', pages: [93, 94], pages_note: 'UNVERIFIED approximate pdf pages', eve: { m: 11, d: 20, records: [336] },
    sunday: { rule: 'R-FIX-NOV21-SUNDAY', records: [336], quote: 'Արարչական, ըստ պատշաճին. եթէ ՚ի Կիւրակէի հանդիպիցի՝ Նորաստեղծեալ:' } },
  { id: 'dec9', m: 12, d: 9, records: [358], stem: /Յղութեան/, name: 'Conception of the Virgin', pages: [96, 97], pages_note: 'UNVERIFIED approximate pdf pages', eve: { m: 12, d: 8, records: [358] } },
];
// Jan 5: Nativity eve (Chragaluyts) - Hador 1 record 389; Hador 2 rows call the day "Ճրագալոյց Ծննդեան".
export const JAN5 = { id: 'jan5_eve', m: 1, d: 5, records: [389], stem: /Ճրագալոյց/, pages: [98], pages_note: 'p.98 heading verified' };

const ANN_PAGE = 35;
const Q = {
  A: 'Իսկ եթէ ՚ի Ծաղկազարդի հանդիպեսցի, կամ յաւագ Հինգշաբթին, կամ յաւագ Ուրբաթին, կամ ՚ի Շաբաթին, եւ կամ ՚ի Զատկին, յառաջ քան զօրհնութիւնն զԽորհուրդն անճառ քաղեա իւր սարօքն. եւ ապա զգիրքն եւ զաւետարանն կարդա. Զկնի Քարոզ, Սուրբ զաստուածածինն. Աղօթք, Ընկալ տէր. եւ ապա սկսեա զաւուր պատշաճն։',
  B: 'Եւ եթէ յաւուր Ղազարու շաբաթին, կամ յաւագ Երկուշաբթին, յերեքշաբթին, եւ կամ ՚ի Չորեքշաբթին հանդիպեսցի, յառաջ քան զօրհնութիւնն ՚ի տեղի պաշտամանն չորսին, զաւուր օրհնութիւնն հանդերձ իւր սարօքն քաղեա. զաւուր գիրք եւ աւետարանն կարդա. զերգն Ներսիսի եւ զՀոգւոցն ասա. եւ ապա սկսեա զտօն Աւետեացն կատարել, ասելով օրհնութիւն, Խորհուրդն անճառ, ըստ կարգին, եւ զայլսն։',
  C: 'Սոյնպէս արա եւ եթէ Յինանցն հանդիպեսցի։ Բայց զաւուր աւետարանն յետ Աւետեաց գրոյն եւ աւետարանին կարդա. ապա Կեցո։',
  D: 'Նոյնպէս եթէ յԱշխարհամատրան Կիւրակէին հանդիպեսցի, զկնի Աւետեաց աւետարանին զգիրսն եւ զաւետարանն անդաստանին կարդա, եւ անդաստան արա. եւ ապա զաւուր աւետարանն, եւ Նորաստեղծեալ եւ Կեցո։',
  E: 'Իսկ ՚ի ճաշուն եւ յերեկոյին սաղմոսք եւ գիրք եւ աւետարանք յարութեան են. իսկ համբարձին ՚ի չորեքշաբթի երեկոյին զԳալստեանն ասա, եւ յայլ աւուրսն զԱւետեացն, հանդերձ Մայր սուրբին։',
  FASTSUN: 'Եւ եթէ ՚ի պահոց կիւրակէի հանդիպիցի, զՆորաստեղծեալի երկու տունն ասա:',
  FEB13: 'Իսկ եթէ ՚ի յառաջաւորի պահոցն հանդիպի, եւ կամ թէ ՚ի մեծի պահոցն, ՚ի փետրուարի 13 ին, ՚ի ճաշու ժամուն զերիս Ողորմեայսն ըստ կարգի աւուրն ասասցեն. եւ զաւուր Գիրքն ընթեռնուցուն. ասասցեն զՀոգւոցն, եւ արձակեսցին. թողլով զԽոնարհեցոն եւ զԱպրեցո. Ապա յերեկոյին Խոնարհեցո եւ Ապրեցո եւ այլն ըստ վերոգրեալ խրատուն։',
  FEB13EVE: 'Ի փետրուարի 13 աւուր, յերեկոյին ասել նախ զԽոնարհեցո եւ զԱպրեցո: Լոյս զուարթ: Մեսեդի Գալստեան... Քարոզ՝ Ասասցուք: Սուրբ աստուած, որ եկիր եւ գալոց ես:',
  JAN5SUN: 'Իսկ եթէ ՚ի կիւրակէի հանդիպիցի, Մեծացուսցէ զմանկունքն ասա, եւ Իւղաբերից աւետարան կարդա:',
  R5: 'Owner ruling R5 (output/design/DECISIONS.md): fixed feasts replace everything on the days they fall',
};

const uniq = (a) => [...new Set(a)];

export function resolveFixed(ctx, t, dayClaims) {
  const { DAY, ymd, weekday } = ctx.core;
  const [, m, d] = ymd(t);
  const claims = [];
  const dayRecs = uniq((dayClaims || []).flatMap((c) => c.records || []));
  let keep = null;
  const e = Math.round((t - ctx.easter) / DAY); // Easter offset
  const isSunday = weekday(t) === 6;
  const rows = ctx.rows(t);
  const tm = ymd(t + DAY); // tomorrow (for eves)

  // ---- Eves (the book prescribes the preceding evening) ----
  for (const F of FIXED) {
    if (!F.eve || tm[1] !== F.m || tm[2] !== F.d) continue;
    if (F.id === 'feb14') {
      // WAVE 6 (zone 1): the eve is a LABEL (service direction), exactly like the eves of Apr 7 / Sep 8 / Nov 21 / Dec 9. Record 31 is headed "Feb 14 (eve: Feb 13)":
      // the feast's commemoration is Feb 14; Feb 13 keeps its own record and only its evening service is the feast's. (Previously kind 'overlay', which put the
      // feast's name and readings on Feb 13 as a second commemoration and doubled record 31 inside the year.)
      claims.push({ records: F.records, rows: [], rule: 'R-FIX-FEB13-EVE', kind: 'label', status: 'rule',
        basis: 'Hador 1 records 31/32 prescribe the evening service of Feb 13 (vespers, procession, blessing of the field) as the eve of Teaunendaraj; the day itself keeps its own record and its own commemoration (the feast is Feb 14).',
        source: { records: [31, 32], pages: [10, 11], quote: Q.FEB13EVE }, note: 'Both records carry eve instructions; 31 is the fuller text. They are two Hador 1 entries for the same feast.' });
      const inArach = inArachavorats(ctx, t), inLent = e >= -48 && e <= -1;
      if (inArach || inLent) claims.push({ records: [32], rows: [], rule: 'R-FIX-FEB13-FAST', kind: 'rubric', status: 'interpretation',
        basis: 'Feb 13 falls in the Arachavorats fast or Great Lent: at the noon hour only the three Voghormeayn, the day\'s reading and Hogevor are said and the Khonarhetso/Aprecho are omitted; they are said in the evening.',
        source: { records: [32], pages: [11], quote: Q.FEB13 }, alternatives: ['"ի մեծի պահոցն" read as the whole of Great Lent (Mon after Paregentan to Holy Saturday); only weekdays?'],
        note: 'There is a small-print note after record 32 on p.11 (right column) that is not legible in the scan; see review item FIX-Q3.' });
    } else {
      claims.push({ records: F.eve.records, rows: [], rule: 'R-FIX-EVE-' + F.id.toUpperCase(), kind: 'label', status: 'rule',
        basis: 'The record prescribes the preceding evening (nakhatonak, vespers of the feast) after the day\'s own service; the day itself is unchanged.',
        source: { records: F.records, pages: F.pages, quote: evQuote(ctx, F.records[0]) } });
    }
  }

  // ---- Jan 5: Nativity eve ----
  if (m === 1 && d === 5) {
    claims.push({ records: JAN5.records, rows: rows.filter((r) => JAN5.stem.test(r.text)).map((r) => r.id), rule: 'R-FIX-JAN5-EVE', kind: 'fixed_feast', status: 'rule',
      basis: 'Hador 2 names Jan 5 "Ճրագալոյց Ծննդեան Քրիստոսի" in every table; Hador 1 record 389 is its canon (liturgy of the eve, nakhatonak of Theophany after the dismissal). Base records of the day (Nativity-fast day) are left to the integrator default.',
      source: { records: [389], pages: JAN5.pages, quote: 'Իսկ յինն ժամուն՝ նշխար գործի: ... Պատարագի սրբասացութիւն՝ Բազմութիւնք: Եւ զկնի արձակման պատարագին սկսանիցին նախատօնակ առնել:' }, note: JAN5.pages_note });
    if (isSunday) claims.push({ records: [389], rows: [], rule: 'R-FIX-JAN5-SUNDAY', kind: 'rubric', status: 'rule',
      basis: 'If the eve falls on a Sunday: "Metsatsutse" for the children, and the Myrrh-bearers gospel is read.', source: { records: [389], pages: JAN5.pages, quote: Q.JAN5SUN } });
  }

  // ---- The six fixed feasts ----
  const F = FIXED.find((x) => x.m === m && x.d === d);
  if (F) {
    const matched = rows.filter((r) => F.stem.test(r.text));
    const base = { records: F.records, rows: matched.map((r) => r.id), kind: 'fixed_feast' };
    let status = 'rule', note = '';
    if (rows.length && !matched.length) { status = 'interpretation'; note = 'Hador 2 rows on this date do not name the feast: ' + rows.map((r) => r.text).join(' | '); }
    // WAVE 6 (zone 1): the old test /Բարեկենդան/ (capital Բ) missed the Taregir row "Բուն բարեկենդան։ — Տեառնընդառաջ" and the Sunday whose Barekendan is printed
    // only in the rubric (table Փ, Feb 14 = Arachavorats Barekendan). A Barekendan Sunday is recognised by the anchors, or by the printed row/rubric (case-insensitive).
    const AB = ctx.anchor('arachavorats_barekendan'), PPa = ctx.anchor('poon_paregentan');
    const barekendan = (AB != null && t === AB) || (PPa != null && t === PPa) || rows.some((r) => /բարեկենդան/iu.test(r.text) || (F.id === 'feb14' && /Առաջաւորաց\s+պահոցն/u.test(r.rubric || '')));
    // Feb 14 on a Sunday of the fast: the Taregir row itself names the Sunday together with the feast ("Կիր. Երկրորդ մեծի պահոց: Տեառնընդառաջ", "Հինգերորդ Կիւրակէ: Տեառնընդառաջ").
    const sundayNamedWithFeast = F.id === 'feb14' && isSunday && rows.some((r) => F.stem.test(r.text) && /(Կիր|Կիւր|Երկրորդ|Երրորդ|Չորրորդ|Հինգերորդ)/u.test(r.text.replace(F.stem, '')));
    const rubricFast = e >= -48 && e <= -1;

    if (F.id === 'apr7') {
      // p.35 (book p.483): explicit collision rules
      const caseA = [-7, -3, -2, -1, 0].includes(e), caseB = [-8, -6, -5, -4].includes(e), green = e === 14, easterTide = e >= 1 && e <= 49;
      const fastSunday = isSunday && [-42, -35, -28, -21, -14].includes(e);
      if (caseA) {
        keep = uniq([...F.records, ...dayRecs]);
        claims.push({ ...base, rule: 'R-FIX-ANN-HOLYWEEK-A', status: 'rule', note,
          basis: 'Annunciation on Palm Sunday / Holy Thursday / Holy Friday / Holy Saturday / Easter: before the day\'s Orhnutyun the whole canon "Khorhurdn anchar" with its sequence is sung, then its reading and gospel are read, then Surb Astvatsatsinn / Ynkal ter; then the day proceeds with its own proper as if it were not the Marian feast. Both the feast and the day\'s record are kept.',
          source: { records: [116], pages: [ANN_PAGE], quote: Q.A }, order: 'feast_canon_then_day', owner_ruling: 'R6' });
      } else if (caseB) {
        keep = uniq([...F.records, ...dayRecs]);
        claims.push({ ...base, rule: 'R-FIX-ANN-HOLYWEEK-B', status: 'rule', note,
          basis: 'Annunciation on Lazarus Saturday / Holy Monday / Tuesday / Wednesday: the day\'s own Orhnutyun (with its sequence), reading and gospel come first, with the hymn of Nerses and the requiem (Hogevor) said in the middle of the night hour; then the feast is performed with Orhnutyun "Khorhurdn anchar". Both are kept.',
          source: { records: [116], pages: [ANN_PAGE], quote: Q.B }, order: 'day_then_feast_canon', owner_ruling: 'R6', uncertain_reading: 'the phrase "ի տեղի պաշտամանն չորսին" is not clearly legible; see review FIX-Q1' });
      } else if (green) {
        keep = uniq([...F.records, ...dayRecs]);
        claims.push({ ...base, rule: 'R-FIX-ANN-GREEN', status: 'rule', note,
          basis: 'Annunciation on Green Sunday (Ashkharhamatran): after the Annunciation gospel, the reading and gospel of the Andastan (blessing of the fields) are read and the Andastan is performed; then the day\'s gospel, Norastegheal and Keco. Both are kept.',
          source: { records: [116, 124], pages: [ANN_PAGE], quote: Q.D }, order: 'feast_then_andastan_then_day', owner_ruling: 'R6' });
      } else if (easterTide) {
        keep = uniq([...F.records, ...dayRecs]);
        claims.push({ ...base, rule: 'R-FIX-ANN-EASTERTIDE', status: 'interpretation', note,
          basis: 'Annunciation in Eastertide (Hinants): treated as the Holy-Week-B procedure, except that the day\'s gospel is read after the Annunciation reading and gospel, then Keco. "Յինանց" is read as Eastertide (Owner vocabulary: Հինանց = Eastertide); the extent of the period is not stated.',
          source: { records: [116], pages: [ANN_PAGE], quote: Q.C }, alternatives: ['Hinants = a shorter period'], order: 'feast_then_day_gospel' });
        claims.push({ records: [116], rows: [], kind: 'rubric', rule: 'R-FIX-ANN-EASTERTIDE-HOURS', status: 'rule',
          basis: 'In Eastertide the noon and evening psalms, readings and gospels are those of the Resurrection; the evening Hambardzi is that of the Coming on Wednesday and that of the Annunciation on other days (with Mayr surb).',
          source: { records: [116], pages: [ANN_PAGE], quote: Q.E } });
      } else {
        if (fastSunday) {
          // WAVE 4 (audit E4): record 116 (p.483) says that if the feast falls on a Sunday of the fast, only the two stanzas of Norastegheal are said.
          // Norastegheal is the Sunday's own hymn, so the book itself keeps a part of the Sunday inside the feast's service: the Sunday record is kept
          // alongside 116, exactly as on Green Sunday (R-FIX-ANN-GREEN, where the Taregir row also names both). The book does not give the full order,
          // so the claim is an interpretation and the owner-ruling default (R5: feast replaces the day) is recorded as the alternative.
          keep = uniq([...F.records, ...dayRecs]);
          claims.push({ ...base, rule: 'R-FIX-ANN-FASTSUNDAY-KEEP', status: 'interpretation', note,
            basis: 'Annunciation on a Sunday of Great Lent: record 116 prescribes "only the two stanzas of Norastegheal" (the Sunday hymn is still said, shortened), so the Sunday record is kept together with the feast, consistent with Green Sunday. Owner ruling R5 (feast replaces the day) would drop the Sunday record; the book does not state the rest of the order.',
            source: { records: [116], pages: [ANN_PAGE], quote: Q.FASTSUN }, owner_ruling: 'R5', book_vs_owner_ruling: true,
            alternatives: ['R5 default: feast only (Sunday record dropped), two stanzas of Norastegheal still said'], review: 'FIX-Q10' });
          claims.push({ records: [116], rows: [], kind: 'rubric', rule: 'R-FIX-ANN-FASTSUNDAY', status: 'rule',
            basis: 'On a Sunday of the (Great Lent) fast, only two stanzas of Norastegheal are said.', source: { records: [116], pages: [ANN_PAGE], quote: Q.FASTSUN } });
        } else {
          // ordinary day: replaced (R5)
          keep = barekendan ? uniq([...F.records, ...dayRecs]) : [...F.records];
          claims.push({ ...base, rule: 'R-FIX-REPLACE', status: status === 'interpretation' ? status : 'owner_ruling', note: note + (barekendan ? ' Hador 2 row also names a Barekendan; its record is kept alongside.' : ''),
            basis: 'Annunciation on a day with no special rule on p.35: the feast replaces the day\'s own record (owner R5).', source: { records: [116], pages: [ANN_PAGE], quote: Q.R5 }, owner_ruling: 'R5' });
        }
      }
    } else {
      // Jan 6, Feb 14, Sep 8, Nov 21, Dec 9: the feast replaces the day's record (owner R5). The Hador 2 row of a Barekendan Sunday names both, so that record stays.
      const keepDay = barekendan || sundayNamedWithFeast;
      keep = keepDay ? uniq([...F.records, ...dayRecs]) : [...F.records];
      const why = barekendan ? 'The Hador 2 row (or the anchor) names a Barekendan together with the feast, so the Sunday record is kept alongside (interpretation).' : sundayNamedWithFeast ? 'The Hador 2 row names the Sunday of the fast together with the feast, so the Sunday record is kept alongside (interpretation).' : '';
      claims.push({ ...base, rule: 'R-FIX-REPLACE', status: keepDay || status === 'interpretation' ? 'interpretation' : 'owner_ruling', note: [note, why].filter(Boolean).join(' '),
        basis: `${F.name}: fixed feast on ${m}/${d}; it replaces the day's own record(s) (owner R5; the Hador 1 entry gives the full order of service).`,
        source: { records: F.records, pages: F.pages, quote: Q.R5 }, owner_ruling: 'R5', alternatives: keepDay ? ['feast only'] : undefined });
      if (F.sunday && isSunday) claims.push({ records: F.sunday.records, rows: [], kind: 'rubric', rule: F.sunday.rule, status: 'rule',
        basis: 'Sunday variant stated in the record (Norastegheal / Myrrh-bearers gospel).', source: { records: F.sunday.records, pages: F.pages, quote: F.sunday.quote } });
      if (F.id === 'sep8' && rubricFast === false && inCrossFast(ctx, t)) claims.push({ records: [263], rows: [], kind: 'rubric', rule: 'R-FIX-SEP8-CROSSFAST', status: 'interpretation',
        basis: 'Sep 8 falls inside the Cross fast. Record 263 says "no feasts in the Cross fast" but the Taregir rows themselves print "Պահք սուրբ Խաչին: Տօն Ծննդեան ..." on this date, and owner R5/R-A keep the six fixed feasts: the feast takes the day and the ferial Cross-fast records (264, 266 ...) are not shown for it.',
        source: { records: [262, 263], pages: [75], quote: 'Եւ ապա պահք սրբոյ Խաչին, յորս տօնք ոչ գոն:' } });
      if (F.id === 'jan6') {/* nothing else */}
    }
    if (F.id === 'feb14' && isSunday && sundayNamedWithFeast && !barekendan) claims.push({ records: [31, 32], rows: [], kind: 'rubric', rule: 'R-FIX-FEB14-SUNDAY-NAMED', status: 'interpretation',
      basis: 'Feb 14 on a Sunday of the fast: the Taregir row names the Sunday and the feast together, so both are kept (as on Green Sunday / Annunciation on a Sunday of the fast). Owner ruling R5 (feast replaces the day) would drop the Sunday record.', source: { records: [31, 32, 391], pages: [10, 11], table: ctx.tableAt(t).id, quote: rows.map((r) => r.text).join(' / ') }, owner_ruling: 'R5', book_vs_owner_ruling: true, alternatives: ['R5 default: feast only'] });
    else if (F.id === 'feb14' && isSunday && !barekendan) claims.push({ records: [31, 32], rows: [], kind: 'rubric', rule: 'R-FIX-FEB14-SUNDAYKEPT', status: 'needs_human_review',
      basis: 'Feb 14 on a Sunday (possible in Great Lent): the Taregir row names both (e.g. "Կիր. Երկրորդ մեծի պահոց: Տեառնընդառաջ"); Hador 1 gives no rule for the Sunday\'s own reading. Default applied: feast replaces the Sunday record.', source: { records: [31, 32, 391], pages: [10, 11] } });
  }
  // ---- WAVE 9: naming of a collision (docs/notes/collisions_labels.md) ----
  // The feast is the day's MAIN commemoration; the Sunday (of a fast) or the bare weekday / numbered season day carried by the day's own record is its SECONDARY label (names.mjs demotes it,
  // titles.mjs titles it as before). Derived from the books: Hador 1 record 50 (p.462, small print): from Bun Paregentan to Pentecost Sunday everything (feasts, Fathers' canons, tones) is fixed
  // "except Teaunendaraj and the Annunciation", i.e. these two feasts displace the Sunday's own arrangement; record 116 leaves the fast Sunday only the two stanzas of Norastegheal; the Taregir rows
  // and the printed headings put the Sunday / day-of-the-season name BEFORE the feast ("Կիր. Երկրորդ մեծի պահոց: Տեառնընդառաջ"). Where the book prescribes BOTH services in full (Annunciation on Palm Sunday,
  // Holy Week, Easter, Green Sunday, the Sundays of Eastertide: record 116 cases A-D) the day is NOT demoted: both stay main commemorations in the book's order.
  if (F) {
    const fastSundayE = isSunday && [-42, -35, -28, -21, -14].includes(e);
    const sundays = F.id !== 'apr7' || fastSundayE;
    claims.push({ records: F.records, rows: [], rule: 'R-FIX-SECONDARY-LABELS', kind: 'rubric', status: 'interpretation',
      secondary_labels: { feast_records: F.records, sundays, weekdays: true },
      basis: sundays ? `${F.name} takes the day: it is the main commemoration; the Sunday / Barekendan / season-day name of the day's own record is shown as its secondary label (the record stays on the day).`
        : `${F.name} on a day where record 116 (p.35) prescribes both services in full: both stay main commemorations; only a bare weekday / numbered Eastertide day is shown as a label.`,
      source: { records: [50, F.records[0]], pages: [ANN_PAGE, 14], quote: 'Այլեւ աստի մինչեւ ՚ի Հոգւոյ Գալստեան առաջին կիւրակէն՝ ամենայն եղեալքդ, այսինքն տօնք, հարցք, միջոցք, եւ ձայնք, են միշտ անշարժք, բաց ՚ի Տեառնընդառաջէն եւ յԱւետեաց տօնէն' },
      alternatives: ['both names as main commemorations (earlier engine behaviour)', 'feast only (owner R5 read literally)'], owner_decision: 'feast as main name, the Sunday as a small secondary label (2026-10-14)' });
  }
  // ---- WAVE 9: owner labels (additional, never a main commemoration, no readings) ----
  ownerLabels(ctx, t, e, m, d, claims);
  return { claims, keep };
}

// New Year (L-NEW-YEAR) and Remembrance of the Dead (L-REMEMBRANCE), decided by the owner 2026-10-06 in the earlier project; transcribed as owner_ruling labels with the book evidence where there is some.
// Remembrance of the Dead: the day after each of the five Tabernacle feasts. Record 110 prints «Երկուշաբաթի մեռելոց» for Easter Monday (the book states it: rule). For the four others
// (Jan 7, the Monday after Vardavar, Assumption Sunday, Exaltation Sunday) record 391 lists exactly these days among the days "kept as Sunday" (Nativity-Theophany 2nd day, the Mondays of Vardavar, the
// Mother of God and the Exaltation), which supports the day but not the words "of the dead": owner_ruling.
function ownerLabels(ctx, t, e, m, d, claims) {
  const { DAY } = ctx.core;
  const dayAfter = (n) => { const a = ctx.anchor(n); return a != null && t === a + DAY; };
  const mk = (rule, status, basis, quote, spec, records) => claims.push({ records: records || [], rows: [], rule, kind: 'label', status, basis, source: { records: records || [], pages: [], quote, owner_decision: spec.owner_decision }, commemoration_label: spec });
  if (m === 1 && d === 1) mk('R-OWNER-NEW-YEAR', 'owner_ruling', 'Jan 1 carries «Կաղանդ, Տարեմուտ» (New Year) as an additional label (owner decision L-NEW-YEAR, 2026-10-06). Neither Hador 1 nor Hador 2 mentions it; the printed calendars print it.', '', { armenian: 'Կաղանդ, Տարեմուտ', kind: 'new_year_label', owner_decision: 'L-NEW-YEAR' });
  const rem = { armenian: 'Յիշատակ մեռելոց', kind: 'remembrance_label', title_id: 'remembrance_of_the_dead', owner_decision: 'L-REMEMBRANCE' };
  if (e === 1) mk('R-LABEL-REMEMBRANCE-EASTER', 'rule', 'Easter Monday is «Երկուշաբաթի մեռելոց է» in Hador 1 record 110 (the Monday of the dead); owner decision L-REMEMBRANCE puts the same label on the day after each of the five Tabernacle feasts.', 'Երկուշաբաթի մեռելոց է', { ...rem, title_basis: 'record 110 heading' }, [110]);
  const owner = (what, rec391) => mk('R-LABEL-REMEMBRANCE-' + what, 'owner_ruling', `Day after the Tabernacle feast (${what.toLowerCase()}): remembrance of the dead (owner decision L-REMEMBRANCE, 2026-10-06). Record 391 lists this day among the days kept as Sunday; the books do not call it a day of the dead.`, rec391, rem, [391]);
  if (m === 1 && d === 7) owner('NATIVITY', 'Ծննդեան եւ Յայտնութեան երկրորդ եւ ութերորդ աւուրքն');
  if (dayAfter('vardavar')) owner('VARDAVAR', 'Վարդավառի, եւ Աստուածածնի, եւ Խաչվերացի երկուշաբթի աւուրքն');
  if (dayAfter('assumption')) owner('ASSUMPTION', 'Վարդավառի, եւ Աստուածածնի, եւ Խաչվերացի երկուշաբթի աւուրքն');
  if (dayAfter('exaltation')) owner('EXALTATION', 'Վարդավառի, եւ Աստուածածնի, եւ Խաչվերացի երկուշաբթի աւուրքն');
}

function evQuote(ctx, ord) {
  const r = ctx.H1.get(ord); const t = (r && r.rubrics_verbatim) || '';
  const i = t.indexOf('Յերեկոյին'); if (i >= 0) return t.slice(i, i + 120);
  return (r && r.rubrics_verbatim ? r.rubrics_verbatim.slice(0, 120) : '');
}
function inArachavorats(ctx, t) { const b = ctx.anchor('arachavorats_barekendan'); if (b == null) return false; const k = Math.round((t - b) / ctx.core.DAY); return k >= 1 && k <= 5; }
function inCrossFast(ctx, t) { const b = ctx.anchor('cross_barekendan'); if (b == null) return false; const k = Math.round((t - b) / ctx.core.DAY); return k >= 1 && k <= 5; }
