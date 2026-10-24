// BLOCK b01 - Hador 1 records ~0-50 (+389 eve): Nativity/Theophany octave, post-octave Sundays/Wednesdays/Fridays,
// Arachavorats Barekendan week-structure up to Bun Barekendan. Plain-English account: docs/notes/b01.md ; open questions: rulebook/review/b01.json
// Rules are functions of (civil date, weekday, anchors, Hador 2 rows). No year/date lookup tables.
export const meta = { id: 'b01_pre_lent', records: [0, 50], description: 'Octave of Nativity/Theophany; post-octave Sun/Wed/Fri; Arachavorats Barekendan to Bun Barekendan (also eve record 389)' };

import { claimsFromRows } from '../links.mjs';

const DAYMS = 86400000;
const UTC = (y, m, d) => Date.UTC(y, m - 1, d);

// Row texts of Hador 2 that are only generic day headings (they name no saint/feast), so a Hador 1 weekday record may still apply.
// A row that names a saint/feast belongs to engine/links.mjs; this block then does not claim a saint-slot (see R-B01-SAINT-SLOT-ROW).
// An EMPTY row text and the abbreviated weekday-fast headings ("Դշ. պահոց" = Wednesday fast, "Ուրբ./Չորեք.") also name nothing.
const GENERIC_ROW = /^($|Պահ|Կիրակ|Կիւրակ|Միջին|Բուն|Առաջին|Երկրորդ|Երրորդ|Չորրորդ|Հինգերորդ|Վեցերորդ|Եօթներորդ|Ապաշխարութեան|Յարութեան|Բարեկենդան|Դշ\.|Ուրբ|Չորեք)/;
const rowsAreGeneric = (rows) => rows.every((r) => GENERIC_ROW.test((r.text || '').trim()));

// Page evidence (pdf page = ../pages/page_NNN.png; book page = pdf + 448). Read from the images; records 0-4 pages are approximate (page 6 not inspected).
const PG = { octave: [6, 7], post: [7, 8], feasts: [8], saints: [9, 10], barekendan: [10], feb: [10, 11], week1: [11, 12], week2: [12, 13], week3: [12, 13], bun: [13, 14] };

function rec(ctx, o) { return ctx.H1.get(o); }
function src(ctx, ords, pages, extra) {
  const r = rec(ctx, ords[0]);
  return { records: ords, pages, quote: extra || [r && r.date_armenian, r && r.name_armenian].filter(Boolean).join(' | ') };
}
function claim(ctx, o) {
  const { ords, pages, rule, basis, status = 'rule', kind = 'day', note, alternatives, quote, exclusive, noReadings, commemoration_hint } = o;
  return { records: kind === 'day' ? ords : [], rows: [], rule, basis, source: src(ctx, ords, pages, quote), status, kind, ...(exclusive ? { exclusive: true } : {}), ...(noReadings ? { noReadings: true } : {}), ...(note ? { note } : {}), ...(alternatives ? { alternatives } : {}), ...(commemoration_hint ? { commemoration_hint } : {}) };
}

// Why the Sargis Saturday (Arachavorats Barekendan + 6) is not free: the Presentation (Feb 14, fixed) or the birth of John the Baptist (record 18, named by the Taregir row).
function sargisSaturdayTaken(ctx, t) {
  const [, m, d] = ctx.core.ymd(t);
  if (m === 2 && d === 14) return 'the Presentation of the Lord (Feb 14)';
  if (ctx.rows(t).some((r) => /Յովհաննու\s+Կարապետ|ծննդեան\s+սրբոյն\s+Յովհաննու/.test(r.text))) return 'the birth of John the Baptist (Hador 2 row)';
  return null;
}

// Which Vardavar block the Taregir rows of this Mon-Sat week name (Mon/Tue/Thu): 'A' = week of record 217, 'B' = week of record 224, null = neither/both.
function weekBlock(ctx, t, weekday, DAY) {
  const mon = t - weekday(t) * DAY, found = new Set();
  for (const k of [0, 1, 3]) { const tt = mon + k * DAY; for (const c of claimsFromRows(ctx, tt, ctx.rows(tt))) for (const o of c.records || []) found.add(o); }
  const A = [218, 219, 221].some((o) => found.has(o)), B = [225, 226, 228].some((o) => found.has(o));
  return A && !B ? 'A' : B && !A ? 'B' : null;
}


// WAVE 6 (zone 1): table cross-reference rubric. A Hador 2 table may print only its First Sunday after the octave and then say
// "Տես ՚ի տարեգիրն Ճ մինչեւ յԱռաջաւորաց Բարեկենդանն, պահելով զչափսդ" = "see Taregir Ճ until the Barekendan of Arachavorats, keeping its measures"
// (table Մ, Easter 10 April, row 16 January; the only such rubric among the 36 tables). The referenced table (found by its LETTER) has the same Sunday
// structure with its dates one day earlier (Easter 9 April): its row on civil date t-shift, the same weekday, is read as the row of date t.
// The shift is the difference of the two tables' Easter dates (printed in each table header), not a stored constant.
const SEE_TABLE = /Տես\s*[՚'՛ʼ]?\s*ի\s+տարեգիրն\s+(\S)\s+մինչեւ\s+յԱռաջաւորաց\s+Բարեկենդանն/u;
function seeTableRows(ctx, t, AB) {
  const { ymd, WD, weekday, utc, DAY } = ctx.core, cur = ctx.tableAt(t);
  if (AB == null || t >= AB || ctx.rows(t).length) return null;
  const rr = (cur.rows || []).find((r) => SEE_TABLE.test(r.rubric || ''));
  if (!rr) return null;
  const [y] = ymd(t); if (t <= utc(y, rr.m, rr.d)) return null;
  const letter = SEE_TABLE.exec(rr.rubric)[1];
  const src = ctx.H2.tables.find((x) => x.letter === letter && !x.leap_table);
  if (!src) return null;
  const shift = Math.round((utc(2001, cur.easter[0], cur.easter[1]) - utc(2001, src.easter[0], src.easter[1])) / DAY);
  const [, m, d] = ymd(t - shift * DAY), wd = WD[weekday(t)];
  const rows = src.rows.filter((r) => r.m === m && r.d === d && r.wd === wd);
  return rows.length ? { rows, src, shift, rubric: rr.rubric, rowId: rr.id } : null;
}

export function place(ctx, t) {
  const { ymd, weekday, DAY } = ctx.core;
  const [y, m, d] = ymd(t), wd = weekday(t), out = [];
  const AB = ctx.anchor('arachavorats_barekendan'), PP = ctx.anchor('poon_paregentan');
  const jan13 = UTC(y, 1, 13);
  const rows = ctx.rows(t);
  // Wed/Fri 'ferial' records are withheld when the Taregir names a saint/feast on that day (links.mjs claims it), except on the fixed dates Jan 6-13 and Feb 14 where fixed.mjs decides.
  const ferialOK = (m === 2 && d === 14) || !rows.length || rowsAreGeneric(rows);

  // ---- (1) Eve of Nativity/Theophany, Jan 5 : record 389 -------------------------------------------------------------------
  if (m === 1 && d === 5) {
    out.push(claim(ctx, { ords: [389], pages: [], rule: 'R-B01-EVE-JAN5', status: 'rule',
      basis: 'Record 389 is the canon of the Lamp-lighting (Chragaluyts) of Nativity/Theophany, i.e. the eve; the feast itself is Jan 6, so the eve is the civil Jan 5 (Hador 2 shows a row "Chragaluyts of the Nativity" on Jan 5 in every table). Page of record 389 is only extractor-inferred (pdf 96-100), not checked.' }));
    if (wd === 6) out.push(claim(ctx, { ords: [389], pages: [], kind: 'label', rule: 'R-B01-EVE-ON-SUNDAY', status: 'rule',
      basis: 'The eve rubric says: if the eve falls on a Sunday, say the Metsatsutsé (Մեծացուսցէ զմանկունքն) and read the Myrrh-bearers gospel (Իւղաբերից աւետարան).',
      quote: 'Իսկ եթէ \'ի կիւրակէի հանդիպիցի, Մեծացուսցէ զմանկունքն ասա, եւ Իւղաբերից աւետարան կարդա' }));
  }

  // ---- (2) Jan 6 feast and its octave (fixed civil dates Jan 6..13) ---------------------------------------------------------
  if (m === 1 && d === 6) {
    out.push(claim(ctx, { ords: [1], pages: [6], rule: 'R-B01-JAN6', status: 'rule',
      basis: 'Record 1 is the canon of Theophany and the Nativity of Christ, assigned to "the day of Theophany" (Jan 6; Hador 2 row "Nativity and Theophany" in every table). Record 0 is only the frontispiece illustration of the section (no liturgical content) and is not claimed.' }));
    if (wd === 6) out.push(claim(ctx, { ords: [1], pages: [6], kind: 'label', rule: 'R-B01-JAN6-ON-SUNDAY', status: 'rule',
      basis: 'The canon says: if the feast falls on a Sunday, read the Myrrh-bearers gospel and sing the shagan Noraststeghyal; on any other day the Ararchakan.',
      quote: 'Եթէ կիւրակէի հանդիպի, Իւղաբերից աւետարանն կարդասցեն, շարական ասասցեն զՆորաստեղծեալն, իսկ յայլում աւուր զԱրարչականն' }));
  }
  if (m === 1 && d >= 7 && d <= 13) {
    const o = d - 5; // Jan 7 = 2nd day (record 2) ... Jan 13 = 8th day (record 8)
    out.push(claim(ctx, { ords: [o], pages: PG.octave, rule: 'R-B01-OCTAVE', status: 'rule',
      basis: `The feast lasts eight days (Jan 6 = day 1): records 2..8 are the second..eighth days (Jan 7..13); record ${o} is day ${d - 5 + 0} of the sequence "${rec(ctx, o).name_armenian}". Hador 2 rows name Jan 11 "sixth", Jan 12 "seventh", Jan 13 "eighth day of the Nativity" in the tables where they appear. Octave days are tied to the civil date, not to the weekday.` }));
    if (wd === 6) out.push(claim(ctx, { ords: [o], pages: PG.octave, kind: 'label', rule: 'R-B01-OCTAVE-ON-SUNDAY', status: 'needs_human_review',
      basis: 'A Sunday inside the octave: the book gives no separate Sunday record for Jan 7-12 (the "first Sunday after the octave", record 9, is by its title after the octave). The octave-day record is claimed and no Sunday head; whether anything of the ordinary Sunday is added is unresolved.', note: 'see review R-B01-Q1' }));
    if (AB != null && t > AB) out.push(claim(ctx, { ords: [o], pages: [12], kind: 'label', rule: 'R-B01-OCTAVE-IN-FAST', status: 'interpretation',
      basis: 'The octave day falls inside the Arachavorats fast (after its Barekendan Sunday). The small-print note before the Sargis record (book p.460, read from the page image; not in the extraction) says that in tables of letter A the octave takes two days into the fast and in letter B one day, "the fast is not to be loosened": the octave record still applies, the fast remains.',
      quote: 'յորժամ գիր տարւոյն Ա լինիցի, ութօրեակ Ծննդեան Քրիստոսի զերկու օրն \'ի պահոցս առնու (page image, approximate)' }));
  }

  // ---- (3) After the octave, up to Arachavorats Barekendan: Sundays / Wednesdays / Fridays -----------------------------------
  if (AB != null && t > jan13 && t < AB && (wd === 6 || wd === 2 || wd === 4)) {
    const first = (target) => jan13 + (((target - weekday(jan13) + 7) % 7) || 7) * DAY;
    const n = Math.round((t - first(wd)) / (7 * DAY)) + 1;
    const SEQ = { 6: [9, 12, 15], 2: [10, 13, 16], 4: [11, 14, 17] }[wd];
    const nm = { 6: 'Sunday', 2: 'Wednesday', 4: 'Friday' }[wd];
    if (n <= 3) {
      if (wd !== 6 && !ferialOK) return out;
      out.push(claim(ctx, { ords: [SEQ[n - 1]], pages: PG.post, rule: 'R-B01-POST-OCTAVE-' + nm.toUpperCase(),
        status: wd === 6 ? 'rule' : 'interpretation',
        basis: `Records 9-17 are titled "First/Second/Third Sunday, Wednesday, Friday after the octave"; this is the ${n}${['st', 'nd', 'rd'][n - 1]} ${nm} after Jan 13 and before the Barekendan of Arachavorats, so record ${SEQ[n - 1]} applies (Sundays are counted by Sunday, Wednesdays by Wednesday, Fridays by Friday, from the end of the octave).`,
        ...(wd === 6 ? {} : { alternatives: ['count the Wednesday/Friday as the one of the week following the nth Sunday (differs only when the first Wed/Fri precede the first Sunday)'], note: 'see review R-B01-Q2' }) }));
    } else if (wd === 6) {
      // 4th Sunday after the octave (only when the Taregir shows four Sundays before the Arachavorats Barekendan).
      out.push(claim(ctx, { ords: [217], pages: [8], rule: 'R-B01-FOURTH-SUNDAY', status: 'interpretation',
        basis: 'Hador 1 has only three Sundays after the octave. Record 17 (Friday of the third week) says: if the Taregir needs a fourth Sunday, see after the second Sunday of Vardavar ("զկնի Վարդավառի երկրորդ կիւրակէն"). That is record 217 (Երկրորդ Կիւրակէ զկնի Վարդավառին) with its week 218-223; the Hador 2 tables label this Sunday "Չորրորդ".',
        quote: 'Եթէ աստ ըստ ցուցանելոյ տարեգրոյն Չորրորդ կիւրակէ հարկաւորեսցի, տես զկնի Վարդավառի երկրորդ կիւրակէն',
        alternatives: ['record 224 (third Sunday after Vardavar)'], note: 'see review R-B01-Q3',
        commemoration_hint: { kind: 'sunday', armenian: 'Չորրորդ Կիւրակէ զկնի ութօրէից', borrowed_hymnody: true, basis: 'Record 217 ("Երկրորդ Կիւրակէ զկնի Վարդավառին") is only borrowed for the readings/hymns of this Sunday (record 17: «տես զկնի Վարդավառի երկրորդ կիւրակէն»); the Sunday itself is the fourth after the octave (Hador 2 row: «Չորրորդ»).' } }));
      out[out.length - 1].source.records = [17, 217];
    } else if (ferialOK) {
      // Wednesday/Friday of the 4th or later week after the octave. Records 10-17 stop at three weeks. The Taregir fills the 4th week with a week "after
      // Vardavar" and names that week's saints on Mon/Tue/Thu (records 218/219/221 = the week of 217, or 225/226/228 = the week of 224). The ferial Wed/Fri
      // belong to the same weekly block (Hador 1 lists each Vardavar week as Sun, Mon saint, Tue saint, Wed ferial, Thu saint, Fri ferial).
      const blk = weekBlock(ctx, t, weekday, DAY);
      const FER = { A: { 2: 220, 4: 222 }, B: { 2: 227, 4: 229 } };
      if (blk) out.push(claim(ctx, { ords: [FER[blk][wd]], pages: [8], rule: 'R-B01-FOURTH-WEEK-FERIAL', status: 'interpretation',
        basis: `This is the ${n}th ${nm} after the octave; Hador 1 provides three. The Hador 2 rows of this week name the saints of the Vardavar week of record ${blk === 'A' ? '217 (218, 219, 221)' : '224 (225, 226, 228)'}, so the ${nm} ferial of that same block (record ${FER[blk][wd]}) is taken. Rubrics of records 17 and 229 direct the borrowing from the weeks after Vardavar.`,
        quote: 'Եթէ աստ ըստ ցուցանելոյ տարեգրոյն Չորրորդ կիւրակէ հարկաւորեսցի, տես զկնի Վարդավառի երկրորդ կիւրակէն', note: 'see review R-B01-Q3' }));
      else out.push(claim(ctx, { ords: [], pages: [8], rule: 'R-B01-FOURTH-WEEK-FERIAL', status: 'needs_human_review', kind: 'day',
        basis: `This is the ${n}th ${nm} after the octave and the week's Mon/Tue/Thu rows do not name one Vardavar block; left unresolved.`, note: 'see review R-B01-Q3' }));
    }
  }


  // ---- (3b) rows read from the referenced table (see seeTableRows) -------------------------------------------------------------
  if (AB != null && t > jan13 && t < AB) {
    const bor = seeTableRows(ctx, t, AB);
    if (bor) for (const c of claimsFromRows(ctx, t, bor.rows)) {
      out.push({ ...c, rows: [], rule: 'R-B01-SEE-TABLE', status: c.status === 'needs_human_review' ? 'needs_human_review' : 'interpretation',
        basis: `This table prints no row here and refers to Taregir ${bor.src.letter} (${bor.src.id}) "until the Barekendan of Arachavorats"; its row "${bor.rows[0].text.slice(0, 60)}" (${bor.src.id} ${bor.rows[0].m}/${bor.rows[0].d}) is read ${bor.shift} day(s) later, on the same weekday. Link: ${c.rule}.`,
        source: { records: c.records, pages: (c.source && c.source.pages) || [], quote: bor.rubric, table: bor.src.id, row: bor.rows[0].id, link_rule: c.rule },
        note: 'referenced table found by its printed letter; shift = difference of the two tables\' Easter dates' });
    }
  }

  // ---- (4) Arachavorats Barekendan .. Bun Barekendan: a fixed 21-day structure counted from the Barekendan Sunday ----------------
  if (AB != null && t >= AB && PP != null && t <= PP) {
    const off = Math.round((t - AB) / DAY);
    const saintSlot = (ords, pages, label) => {
      if (rows.length && !rowsAreGeneric(rows)) return; // the Taregir names something on this day: links.mjs claims it (R-B01-SAINT-SLOT-ROW)
      out.push(claim(ctx, { ords, pages, rule: 'R-B01-SLOT-' + label, status: rows.length ? 'interpretation' : 'rule',
        basis: `Day +${off} after the Arachavorats Barekendan Sunday: the book's sequence assigns record ${ords.join('+')} (${rec(ctx, ords[0]).name_armenian}) to this weekday; no Hador 2 row names another observance on this date.` }));
    };
    switch (off) {
      case 0: out.push(claim(ctx, { ords: [30], pages: PG.barekendan, rule: 'R-B01-AB-SUNDAY', exclusive: true, basis: 'Barekendan of Arachavorats: the Sunday given by the Hador 2 table (anchor arachavorats_barekendan = Easter-70).' })); break;
      case 1: case 2: case 3: case 4:
        out.push(claim(ctx, { ords: [33], pages: [11], kind: 'label', rule: 'R-B01-AB-FASTDAYS', status: 'rule', noReadings: true,
          basis: 'The four days Mon-Thu after the Barekendan: "and then the fast of Arachavorats, feasts are not" (heading) and "in the four days of this fast" only the Hartz are said and no readings are appointed ("ընթերցմունք ոչ գոն"); no commemoration record applies.',
          quote: 'Ի չորս աւուրսն այս պահոց, Հարց գողղմինն ասա... ընթերցմունք ոչ գոն' }));
        break;
      case 5: if (ferialOK) out.push(claim(ctx, { ords: [33], pages: PG.week1, rule: 'R-B01-AB-FRIDAY-JONAH', basis: 'The Friday of the fast is the remembrance of the prophet Jonah (record 33).' })); break;
      case 6: if (!(m === 2 && d === 14)) saintSlot([34], PG.week1, 'SARGIS-SAT'); break;
      case 7: out.push(claim(ctx, { ords: [35], pages: PG.week1, rule: 'R-B01-SUN-AFTER-SARGIS', basis: 'Sunday following the Sargis Saturday (second Sunday of the Arachavorats cycle), record 35.' })); break;
      case 8: {
        const why = sargisSaturdayTaken(ctx, AB + 6 * DAY);
        if (why && (!rows.length || rowsAreGeneric(rows) || rows.some((r) => /Ատով|Սարգ/.test(r.text)))) {
          out.push(claim(ctx, { ords: [34, 36], pages: PG.week1, rule: 'R-B01-SARGIS-MOVED-MONDAY', status: 'owner_ruling',
            basis: `The Sargis Saturday (day +6) is taken by ${why}; the Sargis group (record 34) then moves to the following Monday together with Atomyants (record 36). Owner finding of 2026-10-13 (checked by the owner in printed Etchmiadzin calendars of 2008, 1976, 1981, 1987); Hador 1 gives no wording for it. Hador 2 rows on this Monday, when they name both, say the same.` }));
        } else saintSlot([36], PG.week2, 'MON-ATOMYANTS');
        break;
      }
      case 9: saintSlot([37], PG.week2, 'TUE-SUKIASANTS'); break;
      case 10: if (ferialOK) out.push(claim(ctx, { ords: [38], pages: PG.week2, rule: 'R-B01-WED-WEEK2', basis: 'Wednesday of the second week, record 38 ("Wednesday (fast)").' })); break;
      case 11: saintSlot([39], PG.week2, 'THU-VOSKEANTS'); break;
      case 12: if (ferialOK) out.push(claim(ctx, { ords: [40, 41], pages: PG.week2, rule: 'R-B01-FRI-WEEK2', basis: 'Friday of the second week: record 40 (Friday, Hartz Hangstean) with its page-break continuation 41 holding its readings (one Friday, two extracted records).' })); break;
      case 13: saintSlot([42], PG.week2, 'SAT-ISAAC'); break;
      case 14: out.push(claim(ctx, { ords: [43], pages: PG.week2, rule: 'R-B01-SUN-WEEK3', basis: 'Sunday of the third week (record 43; the tables call it the Middle Sunday).' })); break;
      case 15: saintSlot([44], PG.week3, 'MON-MARK'); break;
      case 16: saintSlot([45], PG.week3, 'TUE-LEVONDIANTS'); break;
      case 17: if (ferialOK) out.push(claim(ctx, { ords: [46], pages: PG.week3, rule: 'R-B01-WED-WEEK3', basis: 'Wednesday of the third week, record 46 ("Wednesday of repentance").' })); break;
      case 18: saintSlot([47], PG.week3, 'THU-VARDANANTS'); break;
      case 19: if (ferialOK) out.push(claim(ctx, { ords: [48], pages: PG.week3, rule: 'R-B01-FRI-WEEK3', basis: 'Friday of the third week, record 48 ("Friday of repentance").' })); break;
      case 20: saintSlot([49], PG.bun, 'SAT-150'); break;
      case 21: out.push(claim(ctx, { ords: [50], pages: PG.bun, rule: 'R-B01-BUN-SUNDAY', basis: 'Bun Barekendan (Poon Paregentan): the Sunday given by the Hador 2 table (anchor poon_paregentan = Easter-49), 21 days after the Arachavorats Barekendan.' })); break;
      default: break;
    }
  }

  // ---- (5) Feb 13: eve of the Presentation (record 31 gives the eve service; Feb 14 itself is a fixed feast, resolved by fixed.mjs) ----
  if (m === 2 && d === 13) {
    out.push(claim(ctx, { ords: [31], pages: PG.feb, kind: 'label', rule: 'R-B01-FEB13-EVE', status: 'rule',
      basis: 'Record 31 prescribes the eve service on Feb 13 (Khonarhetso, Apretso, Metsetsi of the Advent, procession with cross and gospel); record 32 adds that if the feast falls in the Arachavorats fast or in Great Lent the Zhamamut on Feb 13 is the ordinary fast one (Voghormeayn) and the evening service as written. The feast of Feb 14 itself is claimed by the fixed-feast module.',
      quote: 'Ի փետրուարի 13 աւուր, յերեկոյին ասել նախ զԽոնարհեցո եւ զԱպրեցո' }));
  }
  return out;
}
