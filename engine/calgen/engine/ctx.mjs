// Integrator-owned. Builds the per-year context handed to every rule module.
import * as core from './core.mjs';
let buildAnchors = () => ({});
try { ({ buildAnchors } = await import('./anchors.mjs')); } catch (e) { if (typeof process !== 'undefined' && process.env && process.env.CALGEN_STRICT === '1') throw e; }

export async function loadRulebook(load) {            // load(name) -> parsed JSON; name relative to rulebook/
  const [H2, H1raw, links] = await Promise.all([load('hador2.json'), load('src_hador1_records.json'), load('row_links.json').catch(() => ({ links: [] }))]);
  // Optional overlay of page-evidenced corrections to the digitized Hador 1 text (rulebook/h1_corrections.json); the source copy is never edited.
  const corr = await load('h1_corrections.json').catch(() => ({ corrections: [] }));
  const byOrd = new Map(); for (const c of corr.corrections || []) { if (!byOrd.has(c.ordinal)) byOrd.set(c.ordinal, []); byOrd.get(c.ordinal).push(c); }
  const H1 = new Map(H1raw.feasts.map((r) => {
    const cs = byOrd.get(r.ordinal); if (!cs) return [r.ordinal, r];
    const o = { ...r, corrections_applied: [] };
    for (const c of cs) { if (c.set) Object.assign(o, c.set); o.corrections_applied.push({ id: c.id, evidence: c.evidence, pdf_page: c.pdf_page, status: c.status }); }
    return [r.ordinal, o];
  }));
  // Optional reviewed-titles data (rulebook/titles.json, title_map.json): engine/titles.mjs initTitles(); absent -> book headings
  const titles = await load('titles.json').catch(() => null), titleMap = await load('title_map.json').catch(() => null);
  return { H2, H1, H1list: [...H1.values()], rowLinks: links, titles, titleMap };
}

// PROVISIONAL civil-date computations of the named anchors (fallback only; engine/anchors.mjs derives them from Hador 2 rows first and cross-checks these).
// Sunday nearest a date: the Sunday within +-3 days. Names are the canonical anchor names of docs/ENGINE_CONTRACT.md.
function computedAnchors(core, y, e) {
  const D = core.DAY, nearestSunday = (m, d) => { const t = core.utc(y, m, d), k = (6 - core.weekday(t) + 7) % 7; return k <= 3 ? t + k * D : t + (k - 7) * D; };
  const assumption = nearestSunday(8, 15), exaltation = nearestSunday(9, 14);
  let adv = null; for (let d = 15; d <= 21; d++) if (core.weekday(core.utc(y, 11, d)) === 6) adv = core.utc(y, 11, d);
  return { jan6: core.utc(y, 1, 6), arachavorats_barekendan: e - 70 * D, poon_paregentan: e - 49 * D, easter: e, ascension: e + 39 * D, pentecost: e + 49 * D,
    vardavar: e + 98 * D, assumption_barekendan: assumption - 7 * D, assumption, cross_barekendan: exaltation - 7 * D, exaltation, advent_barekendan: adv };
}

export function makeCtx(rb, year) {
  const easter = core.easter(year), sel = core.tablesForYear(rb.H2, year);
  const notes = [];
  const ctx = {
    year, easter, sel, H1: rb.H1, H1list: rb.H1list, H2: rb.H2, rowLinks: rb.rowLinks, core, notes,
    rows: (t) => core.tableAndRows(rb.H2, t).rows,                       // civil Jan 1-5 come from the previous year's table (R-TABLE-JAN1-5)
    tableAt: (t) => core.tableAndRows(rb.H2, t).table,
    note: (msg) => notes.push(msg), anchors: {},
    anchor: (name) => (ctx.anchors[name] ?? ctx.computed[name] ?? null),
  };
  try { ctx.anchors = buildAnchors(ctx) || {}; } catch (e) { if (typeof process !== 'undefined' && process.env && process.env.CALGEN_STRICT === '1') throw e; notes.push('anchors failed: ' + e); }
  return ctx;
}
