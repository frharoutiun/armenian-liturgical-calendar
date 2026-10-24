// calgen/engine/fasting.mjs - fasting status of a day, from the book (Hador 1 record rubrics/titles, Hador 2 row flags) and owner rulings.
// fastingFor(ctx, t, day) -> null | { status:'fast'|'feast'|'not_fast', rule, rule_status:'rule'|'owner_ruling'|'interpretation'|'needs_human_review', basis, source, note?, alternatives? }
// NOTE: `status` is the fasting state (the day.mjs fallback uses status:'fast'); `rule_status` is the evidence status of the rule.
// null = "no fasting rule resolved" (never guessed).
import { FIXED, JAN5 } from './fixed.mjs';
export const meta = { id: 'fasting', description: 'fasting from record titles, Hador 2 flags, named fasts and owner rulings' };

// Switches for owner rulings that the owner said may change ("If I change my mind, I will let you make the change later", answers.json F-C2).
export const OPTIONS = { lentSaturdayFast: false, holyThursdayDominical: false };

const mk = (status, rule, rule_status, basis, source, extra) => ({ status, rule, rule_status, basis, source, ...(extra || {}) });
const fixedFeastOn = (m, d) => FIXED.find((f) => f.m === m && f.d === d);
function opt(ctx, k) { return ctx && ctx.opts && ctx.opts[k] !== undefined ? ctx.opts[k] : OPTIONS[k]; }

// wave 12 (H1D-LOCAL-SUNDAY-DAYS decided from the wording of record 391): the universal list is introduced by «են սոքա» ("these are": a rule); the last sentence «Իսկ ՚ի տեղիս տեղիս սովոր են
// կիւրակէ պահել նաեւ ՚ի Հրեշտակապետաց տօնի շաբաթ օրն, Թադէոսի եւ Սանդխտոյ տօնի օրն, սուրբ Լուսաւորչի ՚ի Վիրապն մտից եւ ելից աւուրսն, եւ Վարդանանց եւ Թարգմանչաց տօնից աւուրսն» says
// «in various places they are ACCUSTOMED» (սովոր են): a local custom, not a rule of the calendar. The fasting status is NOT changed; the day carries a `local_custom` mark so that it is shown.
export const LOCAL_SUNDAY_RECORDS = { 325: 'Archangels (Saturday)', 216: 'Thaddeus and Sandukht', 85: "Illuminator's entry into the pit", 174: "Illuminator's exit from the pit", 47: 'Vardanants', 193: 'Translators', 297: 'Translators' };
export function fastingFor(ctx, t, day) {
  const r = fastingForCore(ctx, t, day);
  const loc = day && Array.isArray(day.records) ? day.records.filter((o) => LOCAL_SUNDAY_RECORDS[o]) : [];
  if (r && loc.length) return { ...r, local_custom: { records: loc, names: loc.map((o) => LOCAL_SUNDAY_RECORDS[o]), quote: 'Իսկ ՚ի տեղիս տեղիս սովոր են կիւրակէ պահել նաեւ ...', basis: 'record 391: kept like a Sunday in some places by custom («սովոր են»); not a rule of the calendar, fasting status unchanged' } };
  return r;
}
function fastingForCore(ctx, t, day) {
  const { DAY, ymd, weekday } = ctx.core;
  const [, m, d] = ymd(t), wd = weekday(t), e = Math.round((t - ctx.easter) / DAY);
  const isSun = wd === 6, isSat = wd === 5, isWed = wd === 2, isFri = wd === 4;
  const anc = (n) => ctx.anchor(n);
  const off = (n) => { const a = anc(n); return a == null ? null : Math.round((t - a) / DAY); };
  const ancNote = (n) => (ctx.anchors && ctx.anchors[n] != null ? null : `anchor "${n}" is the provisional civil computation (not yet derived from Hador 2 rows)`);
  const prov = (names, extra) => { const n = names.map(ancNote).filter(Boolean); return n.length ? { ...(extra || {}), note: n.join('; ') } : extra; };
  const rows = ctx.rows(t);

  // 1. The six fixed feasts are never fast days (owner R-A / R5; Hador 1 record 391 lists the Mother-of-God feasts and Teaunendaraj among the "Sunday-kept" days).
  const F = fixedFeastOn(m, d);
  if (F) return mk('feast', 'R-FAST-FIXED-FEAST', 'owner_ruling', `${F.name} is one of the six fixed feasts: never a fast day, even inside a fast (owner ruling R-A; HR-011-RC007 "mark Feb 14 during fasting periods as a feast"). Hador 2 prints fast=true on this row in some tables; the owner ruling overrides it.`,
    { records: F.records, quote: 'Խրատ վասն կիւրակէ պահելոյ աւուրց (record 391): ... Տեառնընդառաջի ... Աւետեաց ... Սուրբ Աստուածածնի երից տօնից աւուրքն․ այսինքն՝ Յղութեանն, եւ Ծննդեանն, եւ Ընծայմանն։', owner: 'R-A / R5 / HR-011-RC007 / H7' });

  // 1b. wave 12 (H1C-A05): Hador 1 printed p.460 (pdf 12, small print): when the year-letter is Ա the octave of the Nativity takes two days into the Arachavorats fast, when it is Բ one day;
  // the Nativity feast is kept (service, liturgy) on them «բայց պահք են անլուծանելի». The specific rule beats the record 391 list (Jan 13). Physical form: Jan 12 / Jan 13 inside
  // the Monday-Friday Arachavorats fast (Ա: Barekendan Jan 11 -> Jan 12 and 13; Բ: Barekendan Jan 12 -> Jan 13). The commemoration (records 7, 8) is unchanged.
  if (m === 1 && (d === 12 || d === 13)) {
    const k = off('arachavorats_barekendan');
    if (k != null && k >= 1 && k <= 5) return mk('fast', 'R-FAST-NATIVITY-OCTAVE-IN-ARACHAVORATS', 'rule', `${d === 12 ? 'Seventh' : 'Eighth'} day of the Nativity octave falls inside the Arachavorats fast: the Nativity feast is kept with service and liturgy, but these days are unbreakable fasts (Hador 1 p.460 small print). This specific rule overrides the record 391 "kept like Sunday" list.`,
      prov(['arachavorats_barekendan'], { records: [8, 33], pages: [12], quote: 'ութօրեակ Ծննդեան Քրիստոսի երկու օր ՚ի պահոցս առնու. եւ թէ Բ լինիցի գիր տարւոյն՝ զմի օր առնու ՚ի պահոցս, յորս թէպէտ պաշտամամբ եւ պատարագօք Ծննդեան տօն կատարին, բայց պահք են անլուծանելի', feast_kept: true }));
  }

  // 2. Days kept as Sundays (record 391): never fasting.
  const dom = dominicalDay(ctx, t, e, m, d, off);
  if (dom) return dom;

  // 3. Great Lent and Holy Week (Easter is computed by the Gregorian computus, owner decision).
  if (e >= -48 && e <= 0) {
    if (e === 0) return mk('feast', 'R-FAST-EASTER', 'owner_ruling', 'Easter Sunday is a feast (owner R-C).', { owner: 'R-C' });
    if (e === -1) return mk('feast', 'R-FAST-HOLYSAT', 'owner_ruling', 'Holy Saturday is treated as a feast day (owner R-C).', { owner: 'R-C' });
    if (e === -7) return mk('feast', 'R-FAST-PALM', 'owner_ruling', 'Palm Sunday is a feast (owner R-C).', { owner: 'R-C' });
    if (e === -8) return mk('feast', 'R-FAST-LAZARUS', 'owner_ruling', 'Lazarus Saturday is a feast (owner R-C).', { owner: 'R-C' });
    if (e >= -6 && e <= -2) {
      if (e === -3 && opt(ctx, 'holyThursdayDominical')) return mk('feast', 'R-FAST-HOLYTHU-DOMINICAL', 'rule', 'Record 391 lists Holy Thursday among the days kept as Sunday.', { records: [391] });
      return mk('fast', 'R-FAST-HOLYWEEK', 'owner_ruling', 'Holy Week Monday to Friday are fast days (owner R-B).',
        { owner: 'R-B', note: e === -3 ? 'Record 391 ("Աւագ հինգշաբթի") lists Holy Thursday among the days kept as Sunday; the owner ruling is applied (review FAST-Q1).' : undefined });
    }
    if (isSun) return mk('not_fast', 'R-FAST-LENT-SUNDAY', 'owner_ruling', 'Sundays of Great Lent are not fast days (owner R-E; answers F-C2).', { owner: 'R-E / F-C2' });
    if (isSat) {
      if (opt(ctx, 'lentSaturdayFast')) return mk('fast', 'R-FAST-LENT-SATURDAY', 'owner_ruling', 'Saturdays of Great Lent are fast days (switch lentSaturdayFast on).', { owner: 'R-F' });
      return mk('not_fast', 'R-FAST-LENT-SATURDAY', 'owner_ruling', 'Saturdays of Great Lent are not marked as fast days (answers F-C2, 2026-10-05: "let\'s not mark the Saturday of lent as fasting either. If I change my mind, I will let you make the change later"). Switchable via OPTIONS.lentSaturdayFast (the brief called this R-F).', { owner: 'F-C2 / R-F', alternatives: ['fast'] });
    }
    return mk('fast', 'R-FAST-GREATLENT', 'rule', 'Great Lent: every weekday from the Monday after Bun Paregentan to the Friday before Holy Saturday is a fast day. Hador 1 titles 51-53 "Առաջին երկուշաբաթ օրն պահոց (Մեծի Պահոց)", "Բ. օր Մեծի Պահոց"; Hador 2 rows flag the Great Lent days.',
      { records: [51, 52, 53], pages: null, quote: 'Առաջին երկուշաբաթ օրն պահոց (Մեծի Պահոց)' });
  }

  // 4. Arachavorats fast: Monday-Friday after its Barekendan Sunday (Hador 1 record 33 "Ուրբաթ (Առաջաւորաց պահոց)"; Hador 2 rows "Պահք Առաջաւորաց").
  { const k = off('arachavorats_barekendan');
    if (k != null && k >= 1 && k <= 5) return mk('fast', 'R-FAST-ARACHAVORATS', 'rule', 'Arachavorats fast: Monday to Friday after the Barekendan Sunday (records 33; Hador 2 rows marked fast on these days). The Saturday is St Sargis.', prov(['arachavorats_barekendan'], { records: [33], quote: 'Ուրբաթ (Առաջաւորաց պահոց)' })); }

  // 5. Weekly fasts that run Monday-Friday after a Barekendan Sunday.
  const wk = [
    ['vardavar', (() => { const a = anc('vardavar'); return a == null ? null : a - 7 * DAY; })(), 'R-FAST-VARDAVAR', 'Fast of Vardavar (Transfiguration)', [203, 204], 'Եւ ապա պահք Վարդավառի, բայց տօնք ոչ լինին:', ['vardavar']],
    ['assumption', anc('assumption_barekendan'), 'R-FAST-ASSUMPTION', 'Fast of the Assumption of the Mother of God', [231, 232], 'Եւ ապա պահք Վերափոխման սրբուհւոյ Աստուածածնին, յորում տօնք ոչ գոն։', ['assumption_barekendan']],
    ['cross', anc('cross_barekendan'), 'R-FAST-CROSS', 'Fast of the Holy Cross (before Exaltation)', [261, 263], 'Եւ ապա պահք սրբոյ Խաչին, յորս տօնք ոչ գոն:', ['cross_barekendan']],
    ['varag', (() => { const a = anc('exaltation'); return a == null ? null : a + 7 * DAY; })(), 'R-FAST-VARAG', 'Fast of Varag Cross (after Exaltation)', [277, 278], 'Եւ ապա պահք Վարագայ սրբոյ Խաչին. Բայց տօնք լինին:', ['exaltation']],
    ['james', (() => { const a = anc('advent_barekendan'); return a == null ? null : a + 21 * DAY; })(), 'R-FAST-JAMES', 'Fast of St James of Nisibis (3rd Sunday of Hisnak)', [357, 359], 'Եւ ապա պահք սրբոյն Յակոբայ Մծբնայ հայրապետին, բայց տօնք լինին։', ['advent_barekendan']],
    ['hisnak', anc('advent_barekendan'), 'R-FAST-HISNAK', 'First week of the Hisnak (Advent) fast', [336, 337], 'Երկուշաբաթ պահոց [Յիսնակաց] ... Ուրբաթ պահոց', ['advent_barekendan']],
  ];
  for (const [, base, rule, title, recs, quote, names] of wk) {
    if (base == null) continue;
    const k = Math.round((t - base) / DAY);
    if (k >= 1 && k <= 5) return mk('fast', rule, 'interpretation', `${title}: Monday to Friday after its Barekendan Sunday (Hador 1 ${recs.join(', ')}: records of these weekdays are titled "պահոց"). The five-day extent is read from the weekday-titled records; the Saturday is not part of it.`, prov(names, { records: recs, quote }));
  }

  // 6. Nativity (Christmas-Theophany) fast: Dec 30 - Jan 4 (records 382-388; Hador 2 rows "Պահք Ծննդեան" on Dec 30, "Պահոց" Dec 31 - Jan 4); Jan 5 is the eve (liturgy at the ninth hour).
  if ((m === 12 && d >= 30) || (m === 1 && d <= 5)) {
    const src = { records: [382, 383, 384, 385, 386, 387, 388, 389], quote: 'Եւ ապա պահք Ծննդեան և Յայտնութեանն Քրիստոսի Աստուծոյ մերոյ. և տօնք ոչ լինին:' };
    // OR-35 (owner 2026-10-23): Jan 5 (the eve, Chragaluyts) is never a fasting day, on any weekday (supersedes the earlier interpretation R-FAST-NATIVITY-EVE = fast).
    if (m === 1 && d === 5) return mk('not_fast', 'R-FAST-NATIVITY-EVE-NOT-FAST', 'owner_ruling', 'Jan 5, the eve of the Nativity/Theophany (Chragaluyts), is never a fasting day (owner ruling 2026-10-23, OR-35). Hador 2 rows do not flag it as a fast; record 389 only fixes the hour of the eve liturgy.', { records: [389], quote: 'Իսկ յինն ժամուն՝ նշխար գործի', owner: 'OR-35 / FAST-Q3', alternatives: ['fast (the earlier interpretation)'] });
    if (isSun) return null; // review FAST-Q3
    return mk('fast', 'R-FAST-NATIVITY', 'rule', 'Fast of the Nativity and Theophany: Dec 30 to Jan 4 (record 382 "Ա. օր Պահոց Ծննդեան և Յայտնութեան"; Hador 2 rows flagged fast).', src);
  }

  // 7. Wednesdays and Fridays after the Ascension (owner R-D; record 151 "Սկիզբն պահոց" on the Friday after Ascension; records 257/259/280/282/287/289 title Wed/Fri "պահոց"/"(Պահք)").
  if (e >= 1 && e <= 39 && (isWed || isFri)) return mk('not_fast', 'R-FAST-WEDFRI-EASTERTIDE', 'interpretation', 'Wednesdays and Fridays between Easter and the Ascension are not fast days: the Wednesday/Friday fast only begins on the Friday after Ascension (record 151 "Սկիզբն պահոց").', { records: [151], quote: 'Սկիզբն պահոց', owner: 'R-D (implied)' });
  if (e >= 40 && (m < 12 || (m === 12 && d <= 29)) && ctx.core.ymd(ctx.easter)[0] === ctx.core.ymd(t)[0] && (isWed || isFri)) {
    const ex = off('exaltation'), as = off('assumption');
    if (ex != null && ex >= 1 && ex <= 6) return mk('not_fast', 'R-FAST-EXALTATION-OCTAVE', 'owner_ruling', 'Wednesday/Friday of the Exaltation octave are not fast days (owner R-C; records 273 and 275 are titled feasts "Տօն է Եկեղեցւոյ / Խաչի").', prov(['exaltation'], { records: [273, 275], owner: 'R-C' }));
    if (as != null && as >= 0 && as <= 8) return mk('not_fast', 'R-FAST-ASSUMPTION-NINEDAYS', 'owner_ruling', 'Wednesday/Friday inside the nine days of the Assumption are not fast days (owner R9: "we treat them as feast days during this period").', prov(['assumption'], { records: [241], owner: 'R9' }));
    return mk('fast', 'R-FAST-WEDFRI', 'owner_ruling', 'Wednesdays and Fridays after the Ascension are fast days again (owner R-D; record 151 "Սկիզբն պահոց"; records 257, 259, 280, 282, 287, 289, 339, 341 are Wednesday/Friday titled "պահոց"/"(Պահք)"). Extent (until Dec 29) is an interpretation; see review FAST-Q2.',
      { records: [151, 257, 259], quote: 'Սկիզբն պահոց', owner: 'R-D', alternatives: ['Wed/Fri fast only where a record says so (owner R9)'] });
  }

  // 8. Hador 2 row flag as a fallback (Sundays with a flagged row are not trusted: the Barekendan Sunday rows are flagged in some tables).
  // A row whose text names a Barekendan («Բարեկենդան ... պահոց» = the Barekendan OF the fast) is the joyful eve, never itself a fast day: the extractor's fast flag came from the word «պահոց» in the name
  // (owner rule: the Paregentan/Barekendan day is never a fasting day, only the weekdays that follow it).
  const fastRows = rows.filter((r) => r.fast && !/արեկենդան/i.test(r.text || ''));
  if (fastRows.length) {
    if (isSun) return null;
    const r = fastRows[0];
    return mk('fast', 'R-FAST-H2ROW', 'rule', 'Hador 2 row is marked as a fast day ("Պահոց"/"Պահք").', { rows: [r.id], quote: r.text });
  }

  // 9. OR-34 (owner 2026-10-23): ordinary Wednesdays and Fridays are fast days all year. Reached only by the pre-Lent ones (Jan 6 .. before Bun Paregentan) that nothing above claimed:
  // the fixed feasts (step 1), the dominical days (2), the Arachavorats and Nativity fasts (4, 6) and Hador 2 flagged rows (8) were already settled. Wed/Fri after Easter keep steps 3 and 7.
  // The octave of the Nativity/Theophany (Jan 8-12, between the dominical 7th/13th days) is a feast period: a Wed/Fri there is not fast (OR-34 "outside feast periods"; the days are titled feasts, record 8 "Գ օր Ս. Ծննդեան" etc.). An Arachavorats fast overlapping it was already settled above.
  if ((isWed || isFri) && m === 1 && d >= 8 && d <= 12) return mk('not_fast', 'R-FAST-WEDFRI-NATIVITY-OCTAVE', 'interpretation', 'Wednesday/Friday inside the Nativity/Theophany octave (Jan 8-12) are feast-period days, not fast days (reading of owner ruling OR-34, "outside feast periods").', { records: [8], owner: 'OR-34', alternatives: ['fast'] });
  if ((isWed || isFri) && e < -49) return mk('fast', 'R-FAST-WEDFRI-PRELENT', 'owner_ruling', 'Ordinary Wednesdays and Fridays are fasting days (owner ruling 2026-10-23, OR-34); applied to the Wed/Fri between Theophany and Great Lent that no other rule or feast claims.', { owner: 'OR-34 / FAST-Q2', records: [151], alternatives: ['null (left unresolved)'] });
  return null;
}

function dominicalDay(ctx, t, e, m, d, off) {
  const D = ctx.core.DAY;
  const R = (basis, extra) => mk('feast', 'R-FAST-DOMINICAL', 'rule', 'Record 391 lists this day among those kept as Sunday ("կիւրակէ պահելի"): ' + basis + ' Owner H7: "dominical days - never fasting".', { records: [391], quote: 'Ծննդեան եւ Յայտնութեան երկրորդ եւ ութերորդ աւուրքն։ Տեառնընդառաջի եւ Աւագ հինգշաբթի աւուրքն։ Աւետեաց եւ Համբարձման տօնական աւուրքն։ ... Վարդավառի, եւ Աստուածածնի, եւ Խաչվերացի երկուշաբաթի աւուրքն։', owner: 'H7', ...(extra || {}) });
  if (m === 1 && d === 7) return R('second day of the Nativity/Theophany.');
  if (m === 1 && d === 13) return R('eighth day of the Nativity/Theophany.');
  if (e === 39) return R('Ascension.');
  const v = off('vardavar'), a = off('assumption'), x = off('exaltation');
  if (v === 1) return R('Monday of Vardavar.', { note: 'anchor vardavar is the Easter+98 computation' });
  if (a === 1) return R('Monday of the Assumption.', { note: ctx.anchors && ctx.anchors.assumption != null ? undefined : 'anchor "assumption" provisional' });
  if (x === 1) return R('Monday of the Exaltation.', { note: ctx.anchors && ctx.anchors.exaltation != null ? undefined : 'anchor "exaltation" provisional' });
  return null;
}
