// Integrator-owned. Collects claims from every rule module, applies fixed-feast logic, returns an explainable day.
import * as core from './core.mjs';
import { readingsForRecords, parsedReadings } from './readings.mjs';
let commemorationsFor = null, initTitles = null;
try { ({ commemorationsFor } = await import('./names.mjs')); ({ initTitles } = await import('./titles.mjs')); } catch (e) { if (typeof process !== 'undefined' && process.env && process.env.CALGEN_STRICT === '1') throw e; }
import { makeCtx } from './ctx.mjs';
// Modules are loaded dynamically so one agent's broken file cannot crash the others (set CALGEN_STRICT=1 to make errors fatal).
const STRICT = typeof process !== 'undefined' && process.env && process.env.CALGEN_STRICT === '1';
export const MODULE_ERRORS = [];
const BLOCK_NAMES = ['b01_pre_lent', 'b02_lent_holyweek', 'b03_easter_pentecost', 'b04_summer_assumption', 'b05_cross_cycle', 'b06_advent_christmas'];
export const BLOCKS = [];
let M = null;
async function tryImport(path, name) { try { return await import(path); } catch (e) { if (STRICT) throw e; MODULE_ERRORS.push({ module: name, error: String(e) }); return {}; } }
export async function initEngine() {
  if (M) return M;
  const anchors = await tryImport('./anchors.mjs', 'anchors'); const h2 = await tryImport('./h2rules.mjs', 'h2rules');
  const links = await tryImport('./links.mjs', 'links'); const fixed = await tryImport('./fixed.mjs', 'fixed'); const fasting = await tryImport('./fasting.mjs', 'fasting');
  for (const n of BLOCK_NAMES) { const m = await tryImport('./blocks/' + n + '.mjs', n); if (m.place) BLOCKS.push(m); }
  M = { h2, links, fixed, fasting }; return M;
}
function safe(name, fn, dflt) { try { return fn(); } catch (e) { if (STRICT) throw e; MODULE_ERRORS.push({ module: name, error: String(e) }); return dflt; } }

const ctxCache = new Map();
export function ctxFor(rb, year) { const k = rb; let m = ctxCache.get(k); if (!m) ctxCache.set(k, (m = new Map())); if (!m.has(year)) m.set(year, makeCtx(rb, year)); return m.get(year); }

// A block claim may carry a `fast` object (e.g. the Elijah or Gregory fasts, stated in Hador 1 rubrics); used when fasting.mjs has no verdict for the date.
// K2: closing rule of the fasting chain. Every fasting period of the Tonatsoyts is enumerated by fasting.mjs (Great Lent and Holy Week, Arachavorats, Nativity, Hisnak, James, Cross, Varag, Vardavar, Assumption,
// Elijah, Gregory, the Wednesdays and Fridays) and Sundays are never fast days; a day that none of these (nor a block claim, nor a Hador 2 fast row) claims is not a fast day.
// Verified: of the 1,112 such days in the 8 printed directories (2013-2026) none prints a fast name; of 7,452 such days in 2001-2040 the reconciled feed marks 7,449 not fast (the other 3, 2036-08-04/05/07, are an
// artefact of that feed: the Taregir row of 2036 puts the Assumption fast on Aug 11-15, see output/site_build/K2_REPORT.md).
export const NO_FAST_PERIOD = { status: 'not_fast', rule: 'R-FAST-NONE', rule_status: 'rule', basis: 'No fasting period of the Tonatsoyts and no Wednesday/Friday rule applies to this day, and no row of the Taregir marks it as a fast: not a fast day.', source: { verified_against: 'printed directories 2013-2026 (1,112 such days, none prints a fast name); reconciled feed 2001-2040 (7,449 of 7,452 not fast)' } };
function claimFast(claims) {
  const c = claims.find((x) => x.fast && x.fast.status);
  return c ? { status: c.fast.status, basis: c.basis, rule: c.rule, rule_status: c.status, source: c.source, name: c.fast.name, extent: c.fast.extent, from_block: c.block } : null;
}

// STRUCTURAL status: a claim marked `rule` must carry an Armenian quote from the book as its basis. Placement that follows only from the book's own ORDER of
// records (e.g. 'weekly block after record 203') has no single quotable sentence; it is reported as `structural` (book order), never presented as a quoted rule.
const hasArmenian = (q) => typeof q === 'string' && /[\u0531-\u0587]/.test(q);
function normalizeStatus(c) {
  if (c.status === 'rule' && c.kind !== 'label' && !hasArmenian(c.source && c.source.quote)) return { ...c, status: 'structural', status_original: 'rule' };
  return c;
}

export function resolveDay(rb, t) {
  if (!M) throw new Error('call await initEngine() first');
  if (initTitles && rb.titles && rb.titleMap) initTitles(rb.titles, rb.titleMap);      // reviewed titles (idempotent)
  const year = core.ymd(t)[0], ctx = ctxFor(rb, year);
  const rows = ctx.rows(t), claims = [];
  const norm = (c) => normalizeStatus(c);
  for (const b of BLOCKS) for (const c of safe(b.meta.id, () => b.place(ctx, t) || [], [])) claims.push(norm({ ...c, block: b.meta.id }));
  for (const c of safe('links', () => (M.links.claimsFromRows ? M.links.claimsFromRows(ctx, t, rows) : []) || [], [])) claims.push(norm({ ...c, block: 'links' }));
  const annotations = safe('h2rules', () => (M.h2.tableAnnotations ? M.h2.tableAnnotations(ctx, t) : []) || [], []);
  // Binding leap-year counsels (Hador 2 preface, annotation effect leap_substitution): the printed row is replaced as the counsel states.
  // Applied only when the counsel is not flagged needs_human_review and its record lists are known; otherwise the row's links stand and the annotation is shown.
  for (const a of annotations) {
    const e = a.effect;
    if (!e || e.type !== 'leap_substitution' || a.status === 'needs_human_review' || !e.remove_records || !e.celebrate_records) continue;
    for (let i = claims.length - 1; i >= 0; i--) if (claims[i].block === 'links' && (claims[i].rows || []).includes(e.replaced_row_id)) claims.splice(i, 1);
    claims.push({ records: e.celebrate_records, rows: [e.replaced_row_id], rule: 'R-H2R-LEAP-SUBSTITUTION', basis: a.basis, source: a.source, status: a.status, kind: 'day', block: 'h2rules', note: 'replaces the printed row: removed records ' + JSON.stringify(e.remove_records) });
  }
  // A block claim marked `exclusive` (the book names the day's record outright, e.g. record 30 on the Barekendan Sunday) overrides the generic
  // row-links of kind 'day' on the same date: a Hador 2 row text such as a numbered-Sunday ordinal must not add a second head record.
  if (claims.some((c) => c.exclusive && c.kind === 'day')) for (let i = claims.length - 1; i >= 0; i--) if (claims[i].block === 'links' && claims[i].kind === 'day') { claims[i].superseded = true; claims.splice(i, 1); }
  const dayClaims = claims.filter((c) => c.kind === 'day');
  const fx = safe('fixed', () => (M.fixed.resolveFixed ? M.fixed.resolveFixed(ctx, t, dayClaims) : null) || { claims: [], keep: null }, { claims: [], keep: null });
  for (const c of fx.claims) claims.push(norm({ ...c, block: 'fixed' }));
  const base = fx.keep ?? dayClaims.flatMap((c) => c.records);
  const records = [...new Set([...(fx.claims.filter((c) => c.kind === 'fixed_feast').flatMap((c) => c.records)), ...base])];
  const overlays = [...new Set(claims.filter((c) => c.kind === 'overlay').flatMap((c) => c.records))];
  const labels = claims.filter((c) => c.kind === 'label');
  const noReadings = labels.find((c) => c.noReadings) || null;
  const day = {
    date: core.iso(t), weekday: core.WD[core.weekday(t)], easterOffset: Math.round((t - ctx.easter) / core.DAY), mode: core.modeOfDay(t),
    table: { id: ctx.tableAt(t).id, letter: ctx.tableAt(t).letter }, hador2Rows: rows, annotations,
    records, overlays, labels, claims,
    status: records.length || rows.length ? 'placed' : (noReadings ? 'no_readings_appointed' : 'unresolved'),
    unresolved_reason: records.length || rows.length ? null : (noReadings ? 'the book appoints no readings and no commemoration for this day (' + noReadings.rule + ')' : 'no rule in the rulebook claims this date yet'),
    noReadings: noReadings ? { rule: noReadings.rule, basis: noReadings.basis, source: noReadings.source } : null,
  };
  day.easterRule = { rule: 'R-EASTER', status: 'owner_ruling', basis: 'Easter is computed by the Gregorian computus (owner ruling). The book\'s own Easter table (Hador 2, pdf p.189) is a Julian-style index and is used only for its leap-year letter pairs.' };
  day.toneCheck = rows.filter((r) => r.tone).map((r) => ({ row: r.id, printed: r.tone, computed: day.mode.armenian, agree: r.tone === day.mode.armenian }));
  day.readings = safe('readings', () => readingsForRecords(ctx, [...records, ...overlays]), []);
  day.parsed = safe('readings', () => parsedReadings(ctx, day), null);
  day.fast = safe('fasting', () => (M.fasting.fastingFor ? M.fasting.fastingFor(ctx, t, day) : null), null) || claimFast(claims) || (rows.some((r) => r.fast && !/արեկենդան/i.test(r.text || '')) ? { status: 'fast', basis: 'Hador 2 row marked as a fast day (printed Պահոց/պահք in the row; a Barekendan row is never itself a fast)', rule: 'R-FAST-H2ROW', rule_status: 'rule', source: { table: ctx.tableAt(t).id, rows: rows.filter((r) => r.fast && !/արեկենդան/i.test(r.text || '')).map((r) => r.id), quote: rows.filter((r) => r.fast && !/արեկենդան/i.test(r.text || '')).map((r) => r.text).join(' / ') } } : null)
    || NO_FAST_PERIOD;
  day.commemorations = commemorationsFor ? safe('names', () => commemorationsFor(ctx, day), []) : [];
  return day;
}
