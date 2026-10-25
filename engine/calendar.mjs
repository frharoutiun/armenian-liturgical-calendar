// Armenian liturgical calendar: browser + node API. Wraps the calgen rules engine (engine/calgen) and links its output to
// the Jashots readings index and the Sharagnots hymn index (data/calendar/*.json).
//
//   const cal = await createCalendar();            // browser: fetches ./calgen/rulebook/* and ../data/calendar/*
//   const day = cal.resolveDay('2027-03-28');      // any civil date, years 1583-9999; or {y,m,d}; a Date is read as its LOCAL civil date
//
// Dates are civil dates (no clock, no time zone): a typed date never shifts, whatever the viewer's zone.
import { initEngine, resolveDay as engineResolveDay } from './calgen/engine/day.mjs';
import * as core from './calgen/engine/core.mjs';
import { loadRulebook } from './calgen/engine/ctx.mjs';
import { createHymnResolver } from './hymns.mjs';
import { refineCanonParts, assembleCanon } from './canon.mjs';
import { interleave } from '../chant-order.mjs';

export const SCHEMA = 'liturgical-day/1.0';
export const MIN_YEAR = 1583, MAX_YEAR = 9999;

// ---------- civil date parsing ----------
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export function parseCivilDate(input) {
  let y, m, d;
  if (input instanceof Date) { y = input.getFullYear(); m = input.getMonth() + 1; d = input.getDate(); }
  else if (input && typeof input === 'object') ({ y, m, d } = input);
  else {
    const s = String(input ?? '').trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s), us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; } else if (us) { m = +us[1]; d = +us[2]; y = +us[3]; }
    else return { error: 'Type a date as YYYY-MM-DD (or M/D/YYYY).' };
  }
  if (![y, m, d].every(Number.isInteger)) return { error: 'The date is not a whole-number year, month and day.' };
  if (y < MIN_YEAR || y > MAX_YEAR) return { error: `The calendar covers years ${MIN_YEAR} to ${MAX_YEAR}.` };
  if (m < 1 || m > 12 || d < 1 || d > dim(y, m)) return { error: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} is not a real date.` };
  return { y, m, d, iso: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

// Shard name of the Armenian Bible text for a book (data/scripture/arak29/t/<slug>.json); the same rule builds the files.
export function arak29Slug(book) {
  return String(book || '').replace(/\s*\(.*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------- loaders ----------
async function makeLoader(base) {
  const isFile = base.protocol === 'file:';
  const fs = isFile ? await import('node:fs/promises') : null;
  const { fileURLToPath } = isFile ? await import('node:url') : {};
  return async (rel) => {
    const u = new URL(rel, base);
    if (isFile) return JSON.parse(await fs.readFile(fileURLToPath(u), 'utf-8'));
    const r = await fetch(u);
    if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
    return r.json();
  };
}

// ---------- matching helpers ----------
export function armKey(s) {
  s = String(s || '').toLowerCase().replace(/[^ա-և]/g, '');
  return s.replace(/ը/g, '').replace(/ու/g, 'ւ').replace(/և/g, 'եւ');
}
export function citeKey(c) {
  if (!c || !c.book) return null;
  const a = c.v1 != null ? `${c.ch1}:${c.v1}` : `${c.ch1}`;
  let b = '';
  if (c.ch2 != null && c.ch2 !== c.ch1) b = c.v2 != null ? `-${c.ch2}:${c.v2}` : `-${c.ch2}`;
  else if (c.v2 != null && c.v2 !== c.v1) b = `-${c.v2}`;
  return `${c.book} ${a}${b}`;
}
// Book names differ between sources (I/1 Corinthians, 2 Kings (Armenian: 4 Kingdoms...)): compare on a normalised name.
export function normBook(b) {
  return String(b || '').replace(/\s*\(.*$/, '').trim().toLowerCase().replace(/^iii\s/, '3 ').replace(/^ii\s/, '2 ').replace(/^i\s/, '1 ');
}
// A passage as one or more [start,end] positions on a line (chapter*1000+verse); sources split or merge ranges differently, so compare by overlap.
export function intervals(c) {
  if (!c || !c.book) return [];
  const segs = c.segments && c.segments.length ? c.segments : [c];
  const out = [];
  for (const g of segs) {
    if (g.ch1 == null) continue;
    const a = g.ch1 * 1000 + (g.v1 ?? 1), ch2 = g.ch2 ?? g.ch1, b = ch2 * 1000 + (g.v2 ?? 999);
    out.push([a, Math.max(a, b)]);
  }
  return out;
}
export function overlapFraction(A, B) {            // share of A covered by B
  let tot = 0, cov = 0;
  for (const [a0, a1] of A) { tot += a1 - a0 + 1; for (const [b0, b1] of B) { const lo = Math.max(a0, b0), hi = Math.min(a1, b1); if (hi >= lo) cov += hi - lo + 1; } }
  return tot ? Math.min(1, cov / tot) : 0;
}
export function samePassage(c1, c2, min = 0.5) {
  if (normBook(c1.book) !== normBook(c2.book)) return false;
  const A = intervals(c1), B = intervals(c2);
  return overlapFraction(A, B) >= min || overlapFraction(B, A) >= min;
}
const MODE_ALIASES = { 'ԱՁ': 'ԱՁ', 'ԱԿ': 'ԱԿ' };
const normMode = (m) => String(m || '').replace(/[^Ա-Ֆա-և]/g, '').toUpperCase();

const CLASS_LABEL = { jashoo: 'Divine Liturgy (Synaxis, Jashoo)', other: 'Other service', unclassified: 'Unclassified' };

export async function createCalendar(opts = {}) {
  const base = opts.baseUrl ? new URL(opts.baseUrl) : new URL('./', import.meta.url);
  const dataBase = opts.dataUrl ? new URL(opts.dataUrl) : new URL('../data/calendar/', import.meta.url);
  const loadRb = await makeLoader(new URL('./calgen/rulebook/', base));
  const loadData = await makeLoader(dataBase);
  await initEngine();
  const rb = await loadRulebook(loadRb);
  const [readingsIdx, hymnIdx, recCanons, recService, hymnOpenings, canonParts, canonMarks, chantsLayer, versif] = await Promise.all([
    loadData('readings_index.json').catch(() => ({ keys: {} })), loadData('hymn_index.json').catch(() => ({ hymns: [], sections: [] })), loadData('record_canons.json').catch(() => ({ records: {} })),
    loadData('record_service.json').catch(() => ({ keys: {} })), loadData('hymn_openings.json').catch(() => ({ rows: [] })), loadData('canon_parts.json').catch(() => ({ canons: {} })), loadData('canon_marks.json').catch(() => ({ marks: {} })),
    loadData('chants_layer.json').catch(() => ({ chants: {}, lookup: {} })), loadData('versification.json').catch(() => ({ map: {} })),
  ]);
  const refinedCanons = refineCanonParts(canonParts, canonMarks.marks);
  const idxByBook = new Map(), idxNorm = new Map();
  for (const [k, e] of Object.entries(readingsIdx.keys || {})) {
    const m = /^(.*?) (\d+(?::\d+)?(?:-\d+(?::\d+)?)?)$/.exec(k); if (!m) continue;
    const cm = /^(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?$/.exec(m[2]); if (!cm) continue;
    const ch1 = +cm[1], v1 = cm[2] != null ? +cm[2] : null; let ch2 = ch1, v2 = v1;
    if (cm[3] != null) { if (cm[4] != null) { ch2 = +cm[3]; v2 = +cm[4]; } else v2 = +cm[3]; }
    const cit = { book: m[1], ch1, v1, ch2, v2 };
    const b = normBook(m[1]); if (!idxByBook.has(b)) idxByBook.set(b, []);
    idxByBook.get(b).push({ key: k, e, iv: intervals(cit) });
    idxNorm.set(b + ' ' + m[2], e);   // 'I Corinthians' (index) and '1 Corinthians' (calgen) are the same book
  }
  function indexEntry(r) {
    const k = citeKey(r);
    if (k && readingsIdx.keys[k]) return { exact: true, entries: [readingsIdx.keys[k]] };
    const nk = k && normBook(r.book) + ' ' + k.slice(String(r.book).length + 1);
    if (nk && idxNorm.has(nk)) return { exact: true, entries: [idxNorm.get(nk)] };
    const A = intervals(r), list = idxByBook.get(normBook(r.book)) || [];
    const hit = list.filter((x) => overlapFraction(A, x.iv) >= 0.5 || overlapFraction(x.iv, A) >= 0.5).sort((a, b) => b.e.n - a.e.n).slice(0, 4);
    return hit.length ? { exact: false, entries: hit.map((x) => x.e) } : null;
  }
  const sectionById = new Map((hymnIdx.sections || []).map((s) => [s.id, s]));
  const hymnResolver = createHymnResolver(hymnIdx, hymnOpenings);

  // One entry per hymn the day appoints. The Hador 1 record and the Hador 2 row often name the same hymn: merge those.
  function hymnsFromResolution(list) {
    const merged = new Map(), order = [];
    for (const h of list) {
      const k = h.resolved ? 'H:' + h.resolved.hymnId : 'U:' + armKey(h.incipit) + '|' + normMode(h.mode) + '|' + h.status;
      if (merged.has(k)) { const m = merged.get(k); if (!m.sources.includes(h.source)) m.sources.push(h.source); continue; }
      const link = h.resolved ? [{ hymnId: h.resolved.hymnId, sectionId: h.resolved.sectionId, sectionTitle: h.resolved.sectionTitle, incipit: h.resolved.incipit, mode: h.resolved.mode, pages: [h.resolved.page], category: null }] : [];
      const o = { source: h.source, sources: [h.source], type: h.type, incipit: h.incipit, mode: h.mode, status: h.status, resolved: h.resolved, candidates: h.candidates, basis: h.basis, confidence: h.confidence, links: link, note: h.resolved ? '' : h.basis };
      merged.set(k, o); order.push(o);
    }
    return order;
  }
  function sharagnotsGroups(hymns) {
    const groups = new Map();
    for (const h of hymns) if (h.resolved) {
      const g = groups.get(h.resolved.sectionId) || { sectionId: h.resolved.sectionId, sectionTitle: h.resolved.sectionTitle, sectionPage: h.resolved.sectionPage, sectionKind: h.resolved.sectionKind, hymns: [] };
      g.hymns.push({ hymnId: h.resolved.hymnId, incipit: h.resolved.incipit, mode: h.resolved.mode, type: h.type, page: h.resolved.page, status: h.status });
      groups.set(h.resolved.sectionId, g);
    }
    return [...groups.values()].sort((x, y) => (x.sectionPage || 0) - (y.sectionPage || 0));
  }

  function serviceFor(reading) {
    const k = citeKey(reading);
    const ie = indexEntry(reading), e = ie && ie.entries[0];
    if (reading.service) {
      const lab = ({ Jashoo: ['jashoo', 'Divine Liturgy (Synaxis)'], Morning: ['other', 'Matins (Morning)'], Evening: ['other', 'Vespers (Evening)'], Night: ['other', 'Night'], Dismissal: ['other', 'Dismissal'] })[reading.service];
      return { class: lab ? lab[0] : 'other', label: lab ? lab[1] : reading.service, basis: 'service printed with the citation in Hador 1', share: 1, confident: true, level: 'printed' };
    }
    const rs = k && recService.keys[`${reading.ordinal}|${k}`];
    if (rs) {
      const tot = rs.reduce((a, c) => a + c[2], 0), top = rs[0], share = top[2] / tot;
      return { class: top[0], label: top[1], basis: `observed ${top[2]} of ${tot} appearances of this passage under this Hador 1 record in the 2001-2040 lectionary tables`, share: Math.round(share * 100) / 100, confident: share >= 0.8 && tot >= 2, alternatives: rs.slice(1, 3).map((c) => ({ class: c[0], label: c[1], n: c[2] })), level: 'record+passage' };
    }
    if (!e) return { class: 'unknown', label: 'service not determined', basis: 'this passage is not in the Jashots index', share: null };
    const top = e.classes[0], share = top[2] / e.n;
    const cls = top[0];
    return { class: cls, label: top[1], basis: `observed ${top[2]} of ${e.n} appearances of this passage in the 2001-2040 lectionary tables`, share: Math.round(share * 100) / 100, confident: share >= 0.8, alternatives: e.classes.slice(1, 3).map((c) => ({ class: c[0], label: c[1], n: c[2] })) };
  }

  function versifView(k, r) {
    const v = k && versif.map && versif.map[k];
    const multi = !!(r.segments && r.segments.length > 1);
    if (!v) return { status: 'match', note: multi ? 'compound citation: verse numbers not compared segment by segment' : null, compound: multi };
    return { status: v.status, englishRefShouldBe: v.english_ref_should_be || null, armenianPrinted: v.armenian_printed || null, note: v.note || v.reason || null, compound: multi };
  }
  function readingView(r, role) {
    const k = citeKey(r), ie = indexEntry(r), e = ie && ie.entries[0];
    return {
      verbatimArmenian: r.verbatim, passage: { book: r.book, ch1: r.ch1, v1: r.v1, ch2: r.ch2, v2: r.v2, segments: r.segments }, citationKey: k, citationEn: e ? (ie.exact ? e.citation_en : ie.entries.map((x) => x.citation_en).join(' + ')) : null, citationIndexMatch: ie ? (ie.exact ? 'exact' : 'overlapping passages (the tables split or merge the range differently)') : 'none', book: r.book || null, bookHy: r.book_hy || null, kind: r.kind || null, recordOrdinal: r.ordinal, role: role || null,
      qualifiers: r.qualifiers || [], status: r.status, endPrinted: r.end_source === 'printed', flags: r.flags || [], needsPageCheck: !!(r.flags && r.flags.length) || !!r.reason, reason: r.reason || null,
      service: serviceFor(r),
      // Armenian Bible text (Arak29, 1895) is looked up in this shard by this key; versification is the Armenian-vs-English numbering check
      arak29: k ? { shard: arak29Slug(r.book), key: k } : null,
      versification: versifView(k, r),
      jashots: ie && ie.entries.some((x) => x.chains.length) ? { chains: ie.entries.flatMap((x) => x.chains), introEn: e.intro_en, introHy: e.intro_hy, exact: ie.exact, source: 'FINAL readings tables (Jashots catalog chain ids)' } : null,
    };
  }

  function resolve(input) {
    const p = typeof input === 'string' || input instanceof Date || (input && typeof input === 'object') ? parseCivilDate(input) : { error: 'No date given.' };
    if (p.error) return { schema: SCHEMA, error: p.error };
    const t = core.utc(p.y, p.m, p.d);
    const day = engineResolveDay(rb, t);
    const unresolved = [];
    const items = (day.parsed && day.parsed.items) || [];
    const readings = [], chants = [];
    for (const it of items) {
      for (const r of it.readings || []) readings.push(readingView(r, it.role));
      for (const c of it.chants || []) chants.push({ recordOrdinal: it.ordinal, role: it.role, kind: c.kind, service: c.service, verbatim: c.verbatim, incipit: c.incipit, psalm: c.psalm_number, flags: c.flags || [] });
    }
    // Full-verse chants (W9 layer) and their place before the reading they introduce (psalm > 1st reading > mesedi > 2nd reading > alleluia > gospel)
    const layout = interleave({ readings, chants }, chantsLayer);
    for (const g of layout.groups) for (const it of g.items) {
      if (it.type !== 'chant' || !it.chant) continue;
      const c = it.chant, lay = it.layerKey && chantsLayer.chants[it.layerKey];
      const segs = (lay && lay.segments) || [];
      const seg = segs.find((x) => x.status === 'matched') || segs.find((x) => x.status === 'ambiguous') || null;
      Object.assign(c, {
        precedes_reading: it.precedes_reading_index, precedes_reading_key: it.precedes_reading, service_order: it.service_order, group: g.id, order_basis: it.order_basis, order_rule: it.order_rule,
        layerKey: it.layerKey || null, segments: segs,
        armenian_full: seg ? seg.armenian_full : null, english_full: seg ? seg.english_full : null, english_source: seg ? seg.english_source : null,
        refs: seg ? [seg.armenian_ref, seg.english_ref_kjv && 'English numbering: ' + seg.english_ref_kjv].filter(Boolean) : [],
        review_status: it.review_status === 'needs_review' || (seg && seg.review_status === 'needs_review') || (seg && seg.status === 'ambiguous') ? 'needs_review' : (seg ? 'auto_accepted' : 'no_full_verse'),
      });
    }
    const hymnsRaw = [];
    for (const o of [...day.records, ...day.overlays]) { const rec = rb.H1.get(o); for (const h of (rec && rec.hymns) || []) hymnsRaw.push({ source: `hador1 #${o}`, type: h.canon_type, incipit: h.incipit, mode: h.mode_verbatim }); }
    for (const row of day.hador2Rows) for (const h of row.hymns || []) hymnsRaw.push(typeof h === 'string' ? { source: `hador2 ${row.id}`, type: '', incipit: h, mode: '' } : { source: `hador2 ${row.id}`, type: h.type, incipit: h.incipit, mode: h.mode });
    const canons = [];
    for (const o of [...day.records, ...day.overlays]) {
      const rec = rb.H1.get(o);
      for (const c of (rec && recCanons.records[rec.id]) || []) canons.push({ recordOrdinal: o, canonTitle: c.canon_title, confidence: c.confidence, reviewStatus: c.review_status, method: c.method, sectionIds: c.sections, sections: c.sections.map((id) => sectionById.get(id)).filter(Boolean).map((s) => ({ id: s.id, title: s.title, pages: s.pages })), mapped: c.mapped });
    }
        const nameList = [...day.records, ...day.overlays].map((o) => (rb.H1.get(o) || {}).name_armenian).concat(day.hador2Rows.map((r) => r.text), (day.commemorations || []).map((c) => c.armenian)).filter(Boolean);
    const hr = hymnResolver.resolve(hymnsRaw, { names: nameList });
    const hymns = hymnsFromResolution(hr.hymns);
    const comms = (day.commemorations || []).map((c) => {
      const tt = c.title || {};
      return {
        armenian: tt.display_armenian || c.armenian, bookHeadingArmenian: c.armenian, english: tt.display_english || tt.english || null,
        englishStatus: tt.display_english ? tt.display_english_status || null : (tt.english ? tt.english_status || null : null),
        englishProvenance: (tt.display_english_status || tt.english_status) === 'sourced' ? 'published English name (Vemkar / ACHR sources)' : ((tt.display_english_status || tt.english_status) ? 'composed from the components, not a published name' : 'none'),
        role: c.role, kind: c.kind, recordOrdinal: c.source && c.source.record, rule: c.rule, ruleStatus: c.status, basis: c.basis, qualifier: c.qualifier || [], series: (tt.day_series || []).map((s) => ({ armenian: s.armenian, english: s.english, englishStatus: s.english_status })),
      };
    });
    const f = day.fast;
    const OPEN = [];
    if (f && f.rule === 'R-FAST-LENT-SATURDAY') OPEN.push('Lenten Saturdays: the rules engine records them as not fast days (owner ruling kept as is), but the 2001-2040 lectionary tables and the ACHR feed treat them as fast days. This is an open question.');
    if (f && (f.from_block || /elijah|gregory|\u0535\u0572\u056b\u0561|\u0533\u0580\u056b\u0563\u0578\u0580/i.test(f.name || ''))) OPEN.push('Fast days of Elijah / St Gregory the Illuminator in the Pentecost season: whether and when they apply is an open question; shown as provisional.');
    const fasting = f ? { status: f.status, label: ({ fast: 'Fast day', feast: 'Feast day', not_fast: 'Not a fast day' })[f.status] || f.status, name: f.name || null, extent: f.extent || null, rule: f.rule, ruleStatus: f.rule_status, basis: f.basis, provisional: ['interpretation', 'needs_human_review'].includes(f.rule_status) || !f.rule_status || OPEN.length > 0, openQuestions: OPEN } : { status: 'unknown', label: 'Not determined', provisional: true, basis: 'no rule in the rulebook decides this day', openQuestions: [] };
    if (!comms.length) unresolved.push({ field: 'commemorations', reason: day.unresolved_reason || 'no commemoration name could be derived' });
    if (!readings.length) unresolved.push({ field: 'readings', reason: day.noReadings ? day.noReadings.basis : 'no readings are appointed or none could be resolved' });
    if (!hymns.length && !canons.length) unresolved.push({ field: 'hymns', reason: 'the book names no hymns for this day, and no canon is linked' });
    for (const h of hymns) if (h.status === 'unlinked' || h.status === 'ambiguous') unresolved.push({ field: 'hymn_link', reason: `${h.incipit}: ${h.note}` });
    for (const r of readings) if (r.service.class === 'unknown') unresolved.push({ field: 'reading_service', reason: `${r.verbatimArmenian}: ${r.service.basis}` });
    const needsReview = comms.some((c) => c.ruleStatus === 'needs_human_review');
    return {
      schema: SCHEMA, generated_by: 'calgen (draft) + readings/hymn links', date: day.date, weekday: day.weekday, year: p.y, civil: { y: p.y, m: p.m, d: p.d },
      easter: core.iso(core.easter(p.y)), easterOffset: day.easterOffset,
      mode: { number: day.mode.number, armenian: day.mode.armenian, since: day.mode.since, basis: 'computed from the eight-week mode cycle' },
      table: day.table, status: day.status, provisional: needsReview || fasting.provisional,
      commemorations: comms, fasting, readings, chants, chantLayout: layout, hymns, canons, sharagnots: sharagnotsGroups(hymns), canon: assembleCanon(refinedCanons, hr, { weekday: day.weekday, modeArmenian: day.mode && day.mode.armenian, easterOffset: day.easterOffset, fastStatus: f && f.status }),
      labels: day.labels || [], annotations: day.annotations || [], unresolved,
      provenance: { claims: (day.claims || []).map((c) => ({ rule: c.rule, status: c.status, kind: c.kind, records: c.records, pages: c.source && c.source.pages })), records: day.records, overlays: day.overlays, hador2Rows: day.hador2Rows.map((r) => r.id), easterRule: day.easterRule },
    };
  }
  return { resolveDay: resolve, parseCivilDate, rulebook: rb, MIN_YEAR, MAX_YEAR };
}
