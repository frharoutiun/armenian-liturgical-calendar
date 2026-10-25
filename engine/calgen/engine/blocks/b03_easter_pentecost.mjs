// Block b03: Hador 1 records 118-168 (Easter season after Nor Kiraki, Ascension, Pentecost, Pentecost week, 1st Sunday of the Resurrection).
// Rules are functions of (Easter, offset in days from Easter). No calendar-date tables. See docs/notes/b03.md.
//
// BOOK LOGIC (pdf pp.35-54 = book pp.483-502): after the Sunday head record the book lists Monday..Saturday, then the next Sunday.
// Easter = 1st Sunday, Nor Kiraki = 2nd (rec.117, owned by b02), Green = "Երրորդ Կիւրակէ" (3rd, +14), Red = 4th (+21),
// Finding of the Cross = 5th (+28), 6th (+35), then Thursday Ascension (+39, "Հինգշաբաթ ... քառասներորդ օր ՚ի Զատկէն"),
// 7th Sunday = Second Palm Sunday (+42), Pentecost (+49), Pentecost week, 1st Sunday of the Resurrection (+56).
export const meta = { id: 'b03_easter_pentecost', records: [118, 168], description: 'Easter season after Nor Kiraki through the first Sunday after Pentecost (rec. 118-168)' };

const DAY = 86400000;
// pdf page numbers below are 1-based PDF pages (book page = pdf + 448)

// offset -> [record, pdf pages, rule, basis, quote, status]
const SUN = 'Կիւրակէ';
const T = new Map();
const put = (off, rec, pages, rule, basis, quote, status = 'rule') => T.set(off, { rec, pages, rule, basis, quote, status });

// Week after Nor Kiraki: Mon..Fri are the "series" records 118-122, Saturday is 123.
const w2 = [[118, 'Երկուշաբաթի յետ Կրկնազատկի', [35, 36]], [119, 'Երեքշաբաթի յետ Կրկնազատկի', [36]], [120, 'Չորեքշաբաթի յետ Կրկնազատկի', [36]], [121, 'Հինգշաբաթի յետ Կրկնազատկի', [36]], [122, 'Ուրբաթ յետ Կրկնազատկի', [36, 37]]];
w2.forEach(([rec, q, pg], i) => put(8 + i, rec, pg, 'R-B03-W2-DAY', 'Mon-Fri after Nor Kiraki (the Sunday Easter+7): the book lists them as days 2-6 of the Kirknazatik week, in order.', q));
put(13, 123, [37], 'R-B03-W2-SAT', 'Saturday before the third Sunday; it follows the Friday record in the book.', 'Շաբաթ. Հմբ. ԴՅ. Թագաւոր գոլով քո');
const wk = (sunOff, sunRec, sunQ, sunPg, sunRule, sunBasis, feria) => {
  put(sunOff, sunRec, sunPg, sunRule, sunBasis, sunQ);
  feria.forEach(([rec, pg], i) => put(sunOff + 1 + i, rec, pg, sunRule + '-WEEK', 'Weekday of the week that follows this Sunday head; the book lists Monday..Saturday after the Sunday in order.', 'Երկուշաբաթ ... Շաբաթ'));
};
wk(14, 124, 'Երրորդ Կիւրակէ, որ ասի Աշխարհամատրան', [37], 'R-B03-SUN3-GREEN', 'Third Sunday of the Resurrection (Easter=1st, Nor Kiraki=2nd), the Sunday Easter+14 (Green Sunday, Աշխարհամատրան).', [[125, [37]], [126, [37, 38]], [127, [38]], [128, [38]], [129, [38]], [130, [38]]]);
wk(21, 131, 'Չորրորդ Կիւրակէ (Կարմիր Կիւրակէ)', [38, 39], 'R-B03-SUN4-RED', 'Fourth Sunday (Red Sunday), Easter+21.', [[132, [39]], [133, [39]], [134, [39]], [135, [39]], [136, [39, 40]], [137, [40]]]);
wk(28, 138, 'Հինգերորդ կիւրակէ. տօն է Երեւման սրբոյ Խաչին', [40], 'R-B03-SUN5-CROSS', 'Fifth Sunday, Easter+28: "Feast of the Appearing of the Holy Cross" (Finding of the Cross).', [[139, [40]], [140, [41]], [141, [41]], [142, [41]], [143, [41]], [144, [41]]]);
wk(35, 145, 'Վեցերորդ կիրակէ', [42], 'R-B03-SUN6', 'Sixth Sunday, Easter+35.', [[146, [42]], [147, [42]], [148, [42]]]);
// Thursday = Ascension (the extractor tag "Sat"/"Ինգշաբաթ" on rec.150 is wrong: the printed head is "Հինգշաբաթ", pdf 45).
put(39, 150, [45, 46], 'R-B03-ASCENSION', 'Ascension is a THURSDAY: the Thursday that is the fortieth day from Easter (Easter+39). The extractor weekday tag on rec.150 (Sat) is an error.', 'Հինգշաբաթ, տօն Համբարձման Քրիստոսի ՚ի յերկինս, որ է քառասներորդ օր ՚ի Զատկէն');
put(40, 151, [46], 'R-B03-FRI-START-FASTS', 'Friday after Ascension (Easter+40) is headed "Beginning of the fasts".', 'Ուրբաթ. սկիզբն պահոց');
put(41, 152, [46], 'R-B03-SAT-AFTER-ASC', 'Saturday after Ascension (Easter+41); follows the Friday record.', 'Շաբաթ');
put(42, 153, [46, 47], 'R-B03-SUN7-PALM2', 'Seventh Sunday, "called Second Palm Sunday" (Երկրորդ Ծաղկազարդ), Easter+42.', 'Եօթներորդ կիրակէ, որ ասի Երկրորդ Ծաղկազարդ');
[154, 155, 156, 157, 158].forEach((rec, i) => put(43 + i, rec, rec === 158 ? [47, 48] : [47], 'R-B03-SUN7-PALM2-WEEK', 'Mon-Fri after the seventh Sunday, in book order.', 'Երկուշաբաթ ... Ուրբաթ'));
put(48, 159, [48], 'R-B03-SAT-FULFILMENT', 'Saturday before Pentecost: "fulfilment of the order of the Resurrection dispensations and gospels".', 'Լրումն է կարգի տնօրինականացն Յարութեան եւ աւետարանացն');
put(49, 161, [51, 52], 'R-B03-PENTECOST', 'Pentecost: Sunday, the fiftieth day from Easter (Easter+49).', 'Հոգւոյն սրբոյ գալստեան կիւրակէ, որ ասի Պենտէկոստէ, յիսներորդ օր ՚ի Զատկէն');
[162, 163, 164, 165, 166, 167].forEach((rec, i) => put(50 + i, rec, rec <= 163 ? [52] : rec === 167 ? [53, 54] : [53], 'R-B03-PENTECOST-WEEK', 'The six days after Pentecost (Mon-Sat), in book order.', 'Երկուշաբաթ ... Շաբաթ (յետ Հոգեգալստեան)'));
put(56, 168, [54], 'R-B03-SUN-1-RESURRECTION', 'First Sunday of the Resurrection (after Pentecost), Easter+56.', 'Առաջին կիրակէ յարութեան');

const OFF_MIN = 8, OFF_MAX = 56;

export function place(ctx, t) {
  const off = Math.round((t - ctx.easter) / DAY);
  if (off < OFF_MIN || off > OFF_MAX) return [];
  const e = T.get(off);
  if (!e) return [];
  // Cross-check with the Hador 2 derived anchors (information only; never overrides the book's weekday structure).
  if (off === 39) { const a = ctx.anchor('ascension'); if (a != null && a !== t) ctx.note('b03: ascension anchor differs from Easter+39'); }
  if (off === 49) { const a = ctx.anchor('pentecost'); if (a != null && a !== t) ctx.note('b03: pentecost anchor differs from Easter+49'); }
  const out = [{ records: [e.rec], rows: [], rule: e.rule, basis: e.basis, source: { records: [e.rec], pages: e.pages, quote: e.quote }, status: e.status, kind: 'day',
    note: 'Easter' + (off >= 0 ? '+' : '') + off }];
  // Page evidence (pdf 48 = printed p.496, viewed): the heading is "Շաբաթ." and "Լրումն է կարգի տնօրինականացն Յարութեան եւ աւետարանացն" is a rubric sentence before "ահ. ԳՁ"; the day's commemoration is the plain Saturday.
  if (off === 48) out[0].commemoration_hint = { borrowed_hymnody: false, kind: 'weekday', armenian: null, basis: 'Printed heading is the weekday word "Շաբաթ."; "Լրումն է կարգի ..." is a rubric (the Resurrection order of readings is completed), not a feast name (page image pdf 48).' };
  if (off === 39) out.push({ records: [160], rows: [], rule: 'R-B03-PLATE-ASCENSION', basis: 'Full-page decorative plate captioned with the Ascension psalm verse; it is a frontispiece image, not liturgical content. Shown as a label on Ascension.',
    source: { records: [160], pages: [50], quote: 'Համբարձաւ Աստուած օրհնութեամբ, եւ Տէր մեր ձայնիւ փողոյ' }, status: 'interpretation', kind: 'label',
    note: 'The plates for Pentecost (pdf 44) and Ascension (pdf 50) are printed swapped relative to their canons (pdf 45 / 51); captions decide the assignment.' });
  if (off === 49) out.push({ records: [149], rows: [], rule: 'R-B03-PLATE-PENTECOST', basis: 'Full-page decorative plate of the descent of the Spirit; frontispiece image, not liturgical content. Shown as a label on Pentecost.',
    source: { records: [149], pages: [44], quote: 'Այսօր ցնդան Առաքեալք, զարդարեալք ՚ի շնորհաց Հոգւոյն Սրբոյ' }, status: 'interpretation', kind: 'label' });
  if (off === 8) out.push({ records: [118], rows: [], rule: 'R-B03-GOSPEL-CYCLE', basis: 'From this Monday the four Gospels are read in order (Luke morning, John at the sixth-hour service, Matthew at first evening, Mark at the dismissal) until Pentecost, as far as the Passion discourses.',
    source: { records: [118], pages: [35, 36], quote: 'Այսօր սկիզբն արա ընթեռնուլ զչորս գլուխ աւետարանսն կարգաւ ... մինչեւ ՚ի Հոգեգալուստն' }, status: 'rule', kind: 'rubric' });
  if (off >= 40 && off <= 48) out.push({ records: [151], rows: [], rule: 'R-B03-PSALM-46', basis: 'From the Friday after Ascension until Pentecost the first psalm at morning and at evening is Psalm 46 (ԽԶ); the evening dismissal is "Համբարձէք իշխանք". Whether the day of Pentecost itself is included is not stated ("until the coming of the Spirit"): Pentecost is excluded here.',
    source: { records: [151], pages: [46], quote: 'Մինչեւ ՚ի Հոգւոյ Գալուստն առաւօտեան եւ երեկոյին առաջին սաղմոսն այս է. իսկ երեկոյեան արձակմանն՝ Համբարձէք իշխանք' }, status: 'interpretation', kind: 'rubric',
    alternatives: ['range includes Pentecost day (+49)'] });
  // Elijah fast. Book: record 161 (pdf 51-52, book p.499-500) "Եւ ապա պահք Եղիական ... Յայս վեց աւուրս՝ սուրբն Ներսէս Շնորհալին կարգեաց տօնել զտօն Հոգւոյն Սրբոյ գալստեան ... Բայց հինգ աւուրք շաբաթիս՝ պահք են անլուծանելի";
  // every Hador 2 table prints on the Pentecost row "Բարեկենդան Եղիական պահոց" (Pentecost = Barekendan of the Elijah fast; 35/36 tables).
  // The book says FIVE of the six days Mon-Sat are unbreakable fasts but does not name them. Reading: Mon-Fri (the same five-day Mon-Fri shape as every other Barekendan fast, Saturday never a fast day
  // in the Resurrection season); alternative Tue-Sat. Status interpretation, listed in review B03-Q2. A day-level claim with a machine-readable `fast` field is emitted for fasting.mjs / the integrator.
  if (off === 49) out.push({ records: [161], rows: [], rule: 'R-B03-ELIJAH-FAST', basis: 'Pentecost is the Barekendan of the Elijah fast ("Եւ ապա պահք Եղիական"; Hador 2 row: "Բարեկենդան Եղիական պահոց"). Five of the six following days (Mon-Sat, records 162-167) are unbreakable fasts: Monday to Friday, by the book\'s own parallel formula (wave 12: every Barekendan fast of Hador 1 is the five weekday-titled records Mon-Fri, the Saturday has its own record and heading; records 162-166 Mon-Fri, 167 the Saturday).',
    source: { records: [161], pages: [51, 52], quote: 'Եւ ապա պահք Եղիական ... Բայց հինգ աւուրք շաբաթիս՝ պահք են անլուծանելի' }, status: 'interpretation', kind: 'rubric',
    fast: null, note: 'wave 12: decided from the parallel formulas of the two Hadors; dialog H1D-ELIJAH-FAST-DAYS closed' });
  if (off >= 50 && off <= 54) out.push({ records: [161], rows: [], rule: 'R-B03-ELIJAH-FAST-DAY', basis: 'Day of the Elijah fast (Monday to Friday of Pentecost week): record 161 says five days of this week are unbreakable fasts; the printed calendars 2013-2026 print «Պահք» on every one of these days (18 of 18 Monday/Tuesday/Thursday days, 8 yearly printed calendars) and on neither Saturday nor Sunday (K2, 2026-10-25), which settles the reading Mon-Fri.',
    source: { records: [161], pages: [51, 52], quote: 'Բայց հինգ աւուրք շաբաթիս՝ պահք են անլուծանելի', validated_against_print: '2013-2026 printed calendars: 18 of 18 days print a fast name' }, status: 'rule', kind: 'rubric',
    fast: { status: 'fast', unbreakable: true, name: 'Elijah fast (Եղիական պահք)', extent: 'Mon-Fri after Pentecost' } });
  return out;
}
