// Reviewed TITLES of commemorations (naming layer). Owner: the titles agent (wave 8).  Pure functions of the rulebook data + the engine's own day facts.
//
// WHAT IT DOES
//   The engine decides WHAT is commemorated from the Hador books (engine/names.mjs gives the book's own heading).  This layer decides how the commemoration is TITLED:
//   the reviewed Armenian and English titles (rulebook/titles.json) replace the book-derived heading for display; the heading is kept as `book_heading`.
//   It never changes placement, readings, hymns, fasts or rank.  The only commemoration it adds is the owner-ruled Genocide label on April 24.
//
// DATA (rulebook/titles.json, rulebook/title_map.json) is imported as JSON modules; if the import is unavailable the naming layer degrades to the book headings (names.mjs catches the failure).
//
// OUTPUT per commemoration item: item.title = {
//   title_id, armenian (reviewed), english (reviewed | composed | null), english_status: 'sourced' | 'composed_from_reviewed_components' | 'none',
//   book_heading, book_name_status: 'identical' | 'known_variant' | 'differs' | 'not_compared',
//   mapping: { mode, basis, status },
//   composition: { components_standard:[ids], components_present:[ids], change_kind: 'standard' | 'nominal' | 'substantial', note },
//   display_armenian, display_english, display_english_status, display_marker: null | 'combined' | 'composition_differs'
// }
//   change_kind:  standard    = the book prints the reviewed wording;
//                 nominal     = same commemoration (same components), different wording / spelling / epithet;
//                 substantial = the SET of components differs: saints combined into one commemoration (registered combination) or the book names a different set of saints than the reviewed title.
import { makeCtx } from './ctx.mjs';
import { fastingFor } from './fasting.mjs';

// All state is built by initTitles(TITLES, MAP) (data loaded by the rulebook loader: rulebook/titles.json, rulebook/title_map.json); nothing is built at import time.
// Before initTitles has been called, annotate() leaves the items untouched (book headings, no reviewed titles).
let S = null;
export function initTitles(TITLES, MAP) {
  if (!TITLES || !MAP) return false;
  if (S && S.TITLES === TITLES && S.MAP === MAP) return true;      // idempotent
  S = {
    TITLES, MAP, ALIAS: TITLES.meta.aliases || {}, BY_ID: new Map(TITLES.titles.map((t) => [t.title_id, t])),
    FAMILY_ORDER: MAP.series.family_order, SKIP_SUNDAY: new Set(MAP.series.skip_on_sunday),
    COMBOS: MAP.combos.filter((c) => c.status !== 'rejected').sort((a, b) => b.parts.length - a.parts.length || (a.combined < b.combined ? -1 : 1)),
    NS: MAP.series.nativity_sundays, FAMILY_KEYWORDS: MAP.series.family_keywords, NO_NS_FROM: MAP.series.no_nativity_sundays_from_easter_offset,
    DISPLACE: new Set(MAP.series.sunday_displaced_by), ADV_END: MAP.series.advent_sundays_end, WDFAST: MAP.weekday_fast,
  };
  return true;
}
export const titlesReady = () => !!S;
export const titleById = (id) => (S ? S.BY_ID.get(S.ALIAS[id] || id) || null : null);
export const titleCount = () => (S ? S.BY_ID.size : 0);
export const genocideRule = () => (S ? S.MAP.genocide : null);

// ------------------------------------------------------------------------------------------------------------- English
/** reviewed English of a title: {english, status}. Group titles whose published names are listed per saint are composed ("A, B and C"), flagged. */
export function englishOf(t) {
  if (!t) return { english: null, status: 'none' };
  if (t.english_status === 'sourced' && t.english) return { english: t.english, status: 'sourced' };
  if (t.english_status === 'owner_supplied' && t.english) return { english: t.english, status: 'owner_supplied' };
  if (t.english_status === 'sourced_components' && (t.english_components || []).length) {
    const n = t.english_components;
    return { english: n.length === 1 ? n[0] : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1], status: 'composed_from_reviewed_components' };
  }
  return { english: null, status: 'none' };
}
/** English of a combined commemoration: the combined title's own reviewed English, else the parts' reviewed English joined with 'and' (only when every part has one). */
export function englishOfCombination(combined, parts) {
  const own = englishOf(combined);
  if (own.english) return own;
  const eng = parts.map(englishOf);
  if (eng.length && eng.every((e) => e.english)) return { english: eng.map((e) => e.english).join(' and '), status: 'composed_from_reviewed_components' };
  return { english: null, status: 'none' };
}

// ------------------------------------------------------------------------------------------------------------- day facts
const DAYMS = 86400000;
const prevCtx = new WeakMap();
function ctxPrev(ctx) {
  if (!prevCtx.has(ctx)) prevCtx.set(ctx, makeCtx({ H2: ctx.H2, H1: ctx.H1, H1list: ctx.H1list, rowLinks: ctx.rowLinks }, ctx.year - 1));
  return prevCtx.get(ctx);
}
function anchorTime(ctx, name) {
  if (name.endsWith('@prev')) return ctxPrev(ctx).anchor(name.slice(0, -5));
  return ctx.anchor(name);
}
const dateParts = (day) => day.date.split('-').map(Number);
const pad = (n) => String(n).padStart(2, '0');

/** The day's SERIES titles (numbered days, Sundays of a season, fast days, Barekendan, Holy Week days), computed from the engine's anchors.
 *  -> [{title_id, kind, family, order, via}] (all candidates; Sundays are narrowed by season precedence in pickSeries). */
export function seriesCandidates(ctx, day) {
  const [y, m, d] = dateParts(day), t = ctx.core.utc(y, m, d), out = [], seen = new Set();
  const isSun = day.weekday === 'Sun';
  const push = (id, via) => {
    const tt = titleById(id); if (!tt || seen.has(tt.title_id)) return;
    if (isSun && S.SKIP_SUNDAY.has(tt.title_id)) return;
    if (tt.family === 'nativity_sundays' && day.easterOffset >= S.NO_NS_FROM) return;     // from Bun Paregentan on the Sundays belong to Great Lent
    if (tt.family === 'advent' && tt.kind === 'sunday' && m === S.ADV_END.month && d >= S.ADV_END.day) return;
    seen.add(tt.title_id); out.push({ title_id: tt.title_id, kind: tt.kind, family: tt.family || null, order: tt.family ? (S.FAMILY_ORDER[tt.family] ?? -1) : -1, via });
  };
  for (const [anchor, tbl] of Object.entries(S.MAP.series.tables)) {
    if (anchor === 'civil') { for (const id of tbl[pad(m) + '-' + pad(d)] || []) push(id, { anchor: 'civil', offset: pad(m) + '-' + pad(d) }); continue; }
    const a = anchorTime(ctx, anchor); if (a == null) continue;
    const off = Math.round((t - a) / DAYMS);
    for (const id of tbl[String(off)] || []) push(id, { anchor, offset: off });
  }
  // n-th Sunday after the octave of the Nativity
  if (isSun) { const j = ctx.anchor(S.NS.anchor); if (j != null) { const k = Math.round((t - j) / DAYMS); if (k >= S.NS.first_offset) { const n = Math.floor((k - S.NS.first_offset) / S.NS.step); if (n < S.NS.titles.length) push(S.NS.titles[n], { anchor: S.NS.anchor, offset: k, rule: 'nth Sunday after the octave' }); } } }
  return out;
}
const best = (c) => c.reduce((b, x) => (!b || x.order > b.order ? x : b), null);
const bestAll = (c) => { const b = best(c); return b ? c.filter((x) => x.order === b.order) : []; };
/** season families named by the item's own heading (a plain keyword of the book wording: «զկնի Վարդավառին», «Յիսնակաց» ...) */
export function familyHints(heading) { return Object.entries(S.FAMILY_KEYWORDS).filter(([, ws]) => ws.some((w) => String(heading || '').includes(w))).map(([f]) => f); }
/** choose among candidates of the wanted kinds (in preference order); the season named by the heading wins, else the most recently begun season. */
export function pickSeries(cands, kinds, hints) {
  for (const k of kinds) {
    let sub = cands.filter((c) => c.kind === k); if (!sub.length) continue;
    if (hints && hints.length) { const h = sub.filter((c) => hints.includes(c.family)); if (h.length) sub = h; }
    return best(sub);
  }
  return null;
}

// ------------------------------------------------------------------------------------------------------------- mapping of one item
const KINDS_FOR_ITEM = { sunday: ['sunday'], numbered_day: ['day', 'holy_week', 'sunday'], ferial: ['day', 'holy_week'], fast_weekday: ['day', 'holy_week'], feast_weekday: ['holy_week', 'day'], dominical_feast: ['commemoration', 'day'], other: ['day'] };
const BAREKENDAN = /[Բբ]արեկենդան/;
/** Hador 1 records that name a FEAST on a Sunday (the record's own heading is not an ordinal Sunday): record -> reviewed feast title. */
const SUNDAY_FEAST_HEADINGS = {
  312: { title_id: 'discovery_of_the_holy_cross', basis: 'Hador 1 record 312, heading «Խաչգիւտ է» (date line «Եօթներորդ Կիւրակէ»); Hador 2 prints «Եօթներորդ ... Գիւտ Խաչ» on that Sunday in 21 of 35 tables (TT-01 «Եօթներորդ Կիւրակէ: Գիւտ Խաչի տօն է»)' },
};

function mapItem(ctx, day, item, cands, all = []) {
  const src = item.source || {};
  const rec = src.parent_record != null ? src.parent_record : src.record;
  const r = rec != null ? S.MAP.records[String(rec)] : null;
  // WAVE 9: a label item that arrives with its reviewed title id (remembrances, eve-of-fast labels filled from the fast's start) is titled directly.
  if (item.title_id) { const tt = titleById(item.title_id); if (tt) return { id: tt.title_id, mode: 'label_title', basis: item.title_basis || 'label with a reviewed title', status: item.status === 'owner_ruling' ? 'owner_ruling' : 'derived_single_evidence' }; }
  // a demoted Sunday / weekday (secondary label of a fixed feast) is titled exactly like a main item of its kind
  if (item.role === 'label' && !item.demoted_by) {
    if (item.kind !== 'barekendan_label') return { id: null, mode: 'label_without_title', basis: 'ordinal / fast / eve labels carry no reviewed title', status: 'rule' };
    const eves = cands.filter((c) => c.kind === 'eve');
    const words = S.MAP.labels.barekendan.corroboration_words;
    const low = item.armenian.toLowerCase();
    const hints = familyHints(item.armenian);
    const ok = eves.filter((c) => (words[c.title_id] || []).some((w) => low.includes(w)) || (c.family && hints.includes(c.family)));
    if (ok.length === 1) return { id: ok[0].title_id, mode: 'series', basis: 'constant_offset_from_engine_anchor+label_wording', status: 'derived_single_evidence', via: ok[0].via };
    return { id: null, mode: 'label_uncorroborated', basis: eves.length ? 'the day has an eve title but the label wording does not corroborate it' : 'no eve title on this day', status: 'needs_human_review' };
  }
  if (r && r.mode === 'fixed') return { id: r.title_id, mode: 'record', basis: r.match_basis, status: r.status, rec: r };
  if (r && (r.mode === 'ambiguous' || r.mode === 'unmapped')) return { id: null, mode: r.mode, basis: r.match_basis || r.reason || '', status: 'needs_human_review', alternatives: r.alternatives };
  if (src.row && !r && item.rule === 'R-NAME-H2-ROW') {
    const rr = S.MAP.rows[src.text]; if (rr && rr.titles.length === 1) return { id: rr.titles[0], mode: 'row', basis: rr.match_basis, status: rr.status };
    return { id: null, mode: 'row_unmapped', basis: 'Hador 2 row text has no unique reviewed title', status: 'needs_human_review' };
  }
  // WAVE 14 (R-TITLE-SUNDAY-FEAST-HEADING): a Sunday whose Hador 1 record is headed by a FEAST name (not by an ordinal Sunday) is named by that feast in addition to the ordinal Sunday heading.
  // Record 312: heading «Խաչգիւտ է» under the date line «Եօթներորդ Կիւրակէ» (the seventh Sunday after the Cross); the 21 Hador 2 rows of that Sunday read «Եօթներորդ ... Գիւտ Խաչ(ի տօն է)».
  if (item.rule === 'R-NAME-SUNDAY' && rec != null && SUNDAY_FEAST_HEADINGS[rec]) { const f = SUNDAY_FEAST_HEADINGS[rec]; if (titleById(f.title_id)) return { id: f.title_id, mode: 'record_feast_on_sunday', basis: f.basis, status: 'rule' }; }
  // movable / generic item: titled from the day's facts
  let kinds = KINDS_FOR_ITEM[item.kind] || [];
  // WAVE 14 (R-TITLE-SUNDAY-OCCASION): record 381 «Կիրակի ի մէջ աւագ տօնից պատահեալ» is a SUNDAY (Hador 2 prints the ordinal «Վեցերորդ» on these dates): titled by the day's Sunday series like record 388
  // (only when no other main item of the day is a Sunday: on the fifth Sunday record 372 already names it and record 381 only supplies readings)
  if (item.kind === 'ferial' && day.weekday === 'Sun' && !all.some((x) => x !== item && x.role === 'main' && x.kind === 'sunday')) kinds = ['sunday'];
  if (item.kind === 'sunday' && BAREKENDAN.test(item.armenian)) kinds = ['eve', 'sunday'];
  const pick = kinds.length ? pickSeries(cands, kinds, item.kind === 'sunday' ? familyHints(item.armenian) : null) : null;
  if (pick) return { id: pick.title_id, mode: 'series', basis: pick.via.rule || 'constant_offset_from_engine_anchor', status: 'derived_single_evidence', via: pick.via };
  if ((item.kind === 'fast_weekday' || (item.kind === 'ferial' && day.fast && day.fast.status === 'fast')) && S.WDFAST[day.weekday]) return { id: S.WDFAST[day.weekday], mode: 'weekday_fast', basis: 'Wednesday/Friday fast (the engine names the day a fasting weekday) outside every numbered series', status: 'derived_single_evidence' };
  return { id: null, mode: 'no_reviewed_title', basis: 'ordinary weekday or day with no reviewed title', status: 'rule' };
}

// ------------------------------------------------------------------------------------------------------------- normalised wording
const keyOf = (s) => String(s || '').toLowerCase().replace(/և/g, 'եւ').replace(/[՚'՝։:.,;()\[\]—–\-`․՛՜]/g, ' ').replace(/\s+/g, ' ').trim();
const ids = (comps) => (comps || []).map((c) => c.id);

function makeTitleBlock(item, mp, series) {
  const t = mp.id ? titleById(mp.id) : null;
  const book = (mp.rec && mp.rec.book_heading) || item.armenian;
  const eng = englishOf(t);
  const blk = {
    title_id: t ? t.title_id : null, armenian: t ? t.armenian : null, english: eng.english, english_status: eng.status,
    book_heading: item.book_heading || item.armenian, book_name_status: 'not_compared',
    mapping: { mode: mp.mode, basis: mp.basis, status: mp.status, ...(mp.via ? { via: mp.via } : {}), ...(mp.alternatives ? { alternatives: mp.alternatives } : {}) },
    composition: { components_standard: ids(t && t.components), components_present: [], change_kind: 'standard', note: '' },
    display_armenian: t ? t.armenian : item.armenian, display_english: eng.english, display_english_status: eng.status, display_marker: null,
  };
  if (!t) { blk.composition.change_kind = 'standard'; blk.composition.note = 'no reviewed title: the book heading is displayed'; blk.display_english = null; blk.display_english_status = 'none'; return blk; }
  const r = mp.rec;
  if (r) {
    const same = item.armenian === r.book_heading;
    blk.book_name_status = same ? r.wording : 'differs';
    blk.composition.components_present = ids(r.composition && r.composition.present_components ? r.components_book : []);
    const rel = r.composition ? r.composition.relation : 'not_applicable';
    if (rel === 'subset' || rel === 'superset' || rel === 'different') {
      blk.composition.change_kind = 'substantial'; blk.display_marker = 'composition_differs';
      blk.composition.note = 'the book heading names a different set of saints than the reviewed title (missing from the heading: ' + (r.composition.missing_from_book_heading || []).join(', ') + '; extra in the heading: ' + (r.composition.extra_in_book_heading || []).join(', ') + ')';
      blk.display_armenian = t.armenian + ' [' + item.armenian + ']';
    } else blk.composition.change_kind = (same && r.wording === 'identical') ? 'standard' : 'nominal';
    if (blk.composition.change_kind === 'nominal') blk.composition.note = 'same components, different wording';
  } else {
    blk.book_name_status = keyOf(item.armenian) === keyOf(t.armenian) ? 'identical' : 'differs';
    blk.composition.change_kind = blk.book_name_status === 'identical' ? 'standard' : 'nominal';
    if (blk.composition.change_kind === 'nominal') blk.composition.note = 'same day / series position; the book words it differently (or prints only the weekday)';
  }
  return blk;
}

// ------------------------------------------------------------------------------------------------------------- the Genocide label (owner ruling)
function genocideItem(day) {
  const G = S.MAP.genocide;
  const [, m, d] = dateParts(day);
  if (m !== G.month || d !== G.day) return null;
  const t = titleById(G.title_id); if (!t) return null;
  const eng = englishOf(t);
  return {
    armenian: t.armenian, kind: 'label', role: 'label', source: { owner_ruling: G.source }, rule: G.rule, status: G.status,
    basis: 'Owner ruling (' + G.source + '): the Armenian Genocide remembrance is an additional label every April 24; no special readings; every variable (readings, hymns, tone, fast, rank) comes from the primary feast of the day.',
    no_readings: true,
    title: { title_id: t.title_id, armenian: t.armenian, english: eng.english, english_status: eng.status, book_heading: null, book_name_status: 'not_compared', mapping: { mode: 'owner_ruling', basis: G.source, status: 'owner_ruling' },
      composition: { components_standard: [], components_present: [], change_kind: 'standard', note: 'additional label; takes no readings' }, display_armenian: t.armenian, display_english: eng.english, display_english_status: eng.status, display_marker: null },
  };
}

// ------------------------------------------------------------------------------------------------------------- WAVE 9 labels (docs/notes/collisions_labels.md)
/** R-LABEL-EVE-OF-FAST: the day before the first day of a fast carries the reviewed "Eve of the fast of X" title (owner decision L-EVE-OF-FAST, 2026-10-06), unless the day already shows it
 *  (Hador 2 prints "Բարեկենդան X պահոց" in most tables; the Sunday record itself can be the Barekendan). Basis in the books: every Hador 1 record that ends "Եւ ապա պահք X" (161, 182, 203, 231, 278, 359, 382)
 *  puts the fast on the days that follow. The date comes from the series table; the label is added only when the ENGINE's own fasting rules make the next day a fast day (otherwise no label). */
function fillEveLabels(ctx, day, items, cands) {
  const [y, m, d] = dateParts(day), t = ctx.core.utc(y, m, d);
  const have = new Set(items.filter((x) => x.title && x.title.title_id).map((x) => x.title.title_id));
  for (const c of cands.filter((x) => x.kind === 'eve')) {
    if (have.has(c.title_id)) continue;
    const tt = titleById(c.title_id); if (!tt) continue;
    let nf = null; try { nf = fastingFor(ctx, t + DAYMS, { records: [], overlays: [], hador2Rows: ctx.rows(t + DAYMS) }); } catch (e) { nf = null; }
    // Pentecost: fasting.mjs leaves the extent of the Elijah fast open, but Hador 1 record 161 says «Եւ ապա պահք Եղիական ... հինգ աւուրք շաբաթիս՝ պահք են անլուծանելի»: the Monday after Pentecost is its first day.
    const elijah = c.title_id === 'eve_of_fast_of_prophet_elijah' && ctx.anchor('pentecost') === t;
    if (!elijah && (!nf || nf.status !== 'fast')) continue;
    const e = englishOf(tt);
    items.push({ armenian: tt.armenian, kind: 'barekendan_label', role: 'label', source: { owner_ruling: 'L-EVE-OF-FAST (2026-10-06)', series: c.via }, rule: 'R-LABEL-EVE-OF-FAST', status: 'rule_derived', no_readings: true,
      basis: 'The next day is the first day of a fast period (the engine\'s fasting rules, or record 161 for the Elijah fast): the day before it is the eve of that fast (owner label decision L-EVE-OF-FAST). Hador 1 states the fast after the Sunday/eve record with the formula "Եւ ապա պահք ...".',
      title: { title_id: tt.title_id, armenian: tt.armenian, english: e.english, english_status: e.status, book_heading: null, book_name_status: 'not_compared', mapping: { mode: 'label_eve_fill', basis: 'series offset + next-day fast verdict', status: 'rule_derived', via: c.via },
        composition: { components_standard: [], components_present: [], change_kind: 'standard', note: 'additional label' }, display_armenian: tt.armenian, display_english: e.english, display_english_status: e.status, display_marker: null } });
    have.add(c.title_id);
  }
}
/** Holy Week names that the earlier reviewed schema carries for the same day but the Hador 1 heading does not print (the heading is the weekday).  Shown as `title.also_published_as`; never a second commemoration. */
const HOLY_WEEK_ALSO = {
  great_tuesday: [{ title_id: 'ten_virgins', status: 'book_heading', basis: 'Hador 1 record 97 heading: «Աւագ Երեքշաբաթի (Յիշատակ տասն կուսանացն)»' }],
  great_thursday: [{ title_id: 'last_supper', status: 'interpretation', basis: 'the book heading is only «Աւագ Հինգշաբաթի»; the lections of record 101 are the institution of the Lord\'s Supper (1 Corinthians 11:23-32, Matthew 26:17-30) and record 102 is the foot-washing: the reviewed schema names that «Յիշատակ վերջին ընթրեաց»' }],
  great_friday: [{ title_id: 'passion_crucifixion_burial', status: 'rule_derived', basis: 'Hador 1 records 103-105 are headed «Կարգ խաչելութեան» and «Կարգ թաղմանն Քրիստոսի Աստուծոյ» (the crucifixion and the burial)' }],
};
function addAlsoPublished(items) {
  for (const it of items) {
    if (!it.title || !it.title.title_id || it.role !== 'main') continue;
    const L = HOLY_WEEK_ALSO[it.title.title_id]; if (!L) continue;
    it.title.also_published_as = L.map((a) => { const t = titleById(a.title_id), e = englishOf(t); return t ? { title_id: t.title_id, armenian: t.armenian, english: e.english, english_status: e.status, status: a.status, basis: a.basis } : null; }).filter(Boolean);
  }
}

// ------------------------------------------------------------------------------------------------------------- main entry
/** annotate(ctx, day, items): adds item.title to every commemoration item, merges registered combinations, adds the Genocide label on April 24.
 *  Returns the (mutated) array; `items.series` / the first main item's title.day_series list the day's series titles (context, not commemorations). */
export function annotate(ctx, day, items) {
  if (!S || !day || !day.date || !ctx || !ctx.anchor) return items;      // synthetic days (unit tests) carry no date: nothing to title
  const cands = seriesCandidates(ctx, day);
  const maps = items.map((it) => mapItem(ctx, day, it, cands, items));
  items.forEach((it, i) => { it.title = makeTitleBlock(it, maps[i]); });
  // WAVE 9: the same label title is shown once per day (a Hador 2 row label and a block label, or a demoted Sunday, can all name the Barekendan of one fast): the book-printed label stays,
  // a demoted Sunday duplicate or a later one is dropped and listed under `also_from` of the survivor.
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]; if (it.role !== 'label' || !it.title || !it.title.title_id) continue;
    const same = (x, k) => k !== i && x.role === 'label' && x.title && x.title.title_id === it.title.title_id;
    const j = items.findIndex((x, k) => same(x, k) && (it.demoted_by ? !x.demoted_by : k < i));
    const j2 = j >= 0 ? j : (it.demoted_by ? items.findIndex((x, k) => same(x, k) && k < i) : -1);
    if (j2 >= 0) { (items[j2].also_from = items[j2].also_from || []).push({ rule: it.rule, source: it.source }); items.splice(i, 1); maps.splice(i, 1); }
  }
  // registered combinations: every part present as a distinct main/overlay item -> the day is named by the combined title (substantial change)
  const present = items.map((it, i) => ({ it, i, id: it.role !== 'label' ? it.title.title_id : null })).filter((x) => x.id);
  const used = new Set();
  for (const cb of S.COMBOS) {
    const idx = cb.parts.map((p) => present.find((x) => x.id === p && !used.has(x.i)));
    if (idx.some((x) => !x)) continue;
    const head = idx.slice().sort((a, b) => a.i - b.i)[0];
    const ct = titleById(cb.combined), parts = cb.parts.map(titleById), eng = englishOfCombination(ct, parts);
    const union = [...new Set(parts.flatMap((p) => ids(p.components)))];
    for (const x of idx) {
      used.add(x.i);
      const own = x.it.title;
      own.combination = { combined_title_id: cb.combined, role: x.i === head.i ? 'head' : 'member', members: idx.map((y) => y.i), match_basis: cb.match_basis, status: cb.status };
      own.composition = { components_standard: own.composition.components_standard, components_present: union, change_kind: 'substantial', note: 'saints combined into one commemoration this year (registered combination)' };
      if (x.i === head.i) {
        own.standard_title_id = own.title_id; own.title_id = ct.title_id; own.armenian = ct.armenian; own.english = eng.english; own.english_status = eng.status;
        own.display_armenian = ct.armenian; own.display_english = eng.english; own.display_english_status = eng.status; own.display_marker = 'combined';
      } else { own.suppressed_by_combination = true; own.display_marker = 'combined'; }
    }
  }
  const g = genocideItem(day);
  if (g) items.push(g);
  fillEveLabels(ctx, day, items, cands);
  addAlsoPublished(items);
  // the day's series titles (context)
  const ser = [], addS = (p) => { if (!p || ser.some((s) => s.title_id === p.title_id)) return; const t = titleById(p.title_id), e = englishOf(t); ser.push({ title_id: t.title_id, kind: p.kind, armenian: t.armenian, english: e.english, english_status: e.status, via: p.via }); };
  const displaced = items.some((x) => x.role !== 'label' && x.title && S.DISPLACE.has(x.title.title_id));
  for (const kinds of [['sunday'], ['eve'], ['day', 'holy_week']]) { if (displaced && kinds[0] === 'sunday') continue; const sub = cands.filter((c) => kinds.includes(c.kind)); bestAll(sub).forEach(addS); }
  if (!ser.some((s) => s.kind === 'day' || s.kind === 'holy_week') && ((day.fast && day.fast.status === 'fast') || items.some((x) => x.kind === 'fast_weekday')) && S.WDFAST[day.weekday] && day.weekday !== 'Sun') { const t = titleById(S.WDFAST[day.weekday]), e = englishOf(t); ser.push({ title_id: t.title_id, kind: 'weekday_fast', armenian: t.armenian, english: e.english, english_status: e.status, via: { rule: 'fast Wednesday/Friday outside every numbered series' } }); }
  items.series = ser;
  const firstMain = items.find((x) => x.role === 'main');
  if (firstMain && firstMain.title) firstMain.title.day_series = ser;
  return items;
}
