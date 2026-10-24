// Compare engine output with the 2001-2040 lectionary tables (FINAL_by_date) per field.
// Fast, names and reading sets are OUT-OF-SAMPLE for the engine (the engine reads only the books);
// the service class column uses a table learned from the same data, so that one is IN-SAMPLE and reported separately.
// node tools/validate_vs_final.mjs  -> validation/report.json + validation/REPORT.md
import fs from 'node:fs';
import { createCalendar, citeKey, armKey, intervals, overlapFraction, normBook } from '../engine/calendar.mjs';
const PROJ = process.env.DIGI || '/Users/frharoutiun/Documents/Church/Coding/06 - Donatsooyts Digitization';
const cal = await createCalendar();
const WIN = ['2026-10-23', '2027-12-31'];
const acc = () => ({ n: 0, agree: 0, examples: [], kinds: {} });
const S = { all: {}, feed: {} };
for (const k of Object.keys(S)) S[k] = { fast: acc(), name_hy: acc(), name_en: acc(), readings_exact: acc(), readings_eng_superset: acc(), readings_final_superset: acc(), readings_any_overlap: acc(), service: acc() };
const rec = (a, ok, ex, kind) => { a.n++; if (ok) a.agree++; else { a.kinds[kind || 'x'] = (a.kinds[kind || 'x'] || 0) + 1; if (a.examples.length < 40) a.examples.push(ex); } };
const norm = (s) => armKey(String(s || '').replace(/\([^)]*\)/g, ''));
const fastOf = (s) => (s === 'fast' ? 'fast' : 'no-fast');
for (let y = 2001; y <= 2040; y++) {
  const fin = JSON.parse(fs.readFileSync(`${PROJ}/output/final/readings/FINAL_by_date/${y}.json`, 'utf-8'));
  for (const fd of fin.days) {
    const r = cal.resolveDay(fd.date);
    const groups = fd.date >= WIN[0] && fd.date <= WIN[1] ? ['all', 'feed'] : ['all'];
    const fl = []; const addf = (cls, label, rs) => { for (const x of rs || []) if (x.citation) fl.push({ b: normBook(x.citation.book), iv: intervals(x.citation), k: citeKey(x.citation), cls, label }); };
    const sv = fd.services || {}; addf('jashoo', 'Divine Liturgy (Synaxis)', sv.jashoo); for (const o of sv.other || []) addf('other', o.service_label, o.readings); addf('unclassified', '', sv.unclassified);
    for (const g of groups) {
      const T = S[g];
      rec(T.fast, fastOf(r.fasting.status) === fastOf(fd.fast_status), { date: fd.date, engine: r.fasting.status, final: fd.fast_status, rule: r.fasting.rule }, `${r.fasting.status}->${fd.fast_status}`);
      const fnames = (fd.commemorations || []).map((c) => norm(c.name_hy)).filter(Boolean), enames = r.commemorations.map((c) => norm(c.armenian) + '|' + norm(c.bookHeadingArmenian)).join('|');
      const hy = fnames.length ? fnames.some((n) => n.length > 4 && enames.includes(n)) || r.commemorations.some((c) => fnames.some((n) => n.includes(norm(c.armenian)) && norm(c.armenian).length > 6)) : null;
      if (hy !== null) rec(T.name_hy, hy, { date: fd.date, engine: r.commemorations.map((c) => c.armenian), final: (fd.commemorations || []).map((c) => c.name_hy) });
      const fen = (fd.commemorations || []).map((c) => (c.name_en || '').toLowerCase()).filter(Boolean), een = r.commemorations.map((c) => (c.english || '').toLowerCase());
      if (fen.length) rec(T.name_en, fen.some((n) => een.includes(n)), { date: fd.date, engine: r.commemorations.map((c) => c.english), final: (fd.commemorations || []).map((c) => c.name_en) });
      if (!fd.no_readings) {
        const cover = (X, Y) => X.filter((x) => !Y.some((y) => y.b === x.b && Math.max(overlapFraction(x.iv, y.iv), overlapFraction(y.iv, x.iv)) >= 0.5));
        const E = r.readings.map((x) => ({ b: normBook(x.passage.book), iv: intervals(x.passage), k: x.citationKey, x })), F = [...fl];
        const engineOnly = cover(E, F), finalOnly = cover(F, E);
        const ex = { date: fd.date, engineOnly: engineOnly.map((e) => e.k), finalOnly: finalOnly.map((e) => e.k) };
        const eq = !engineOnly.length && !finalOnly.length;
        rec(T.readings_exact, eq, ex, eq ? '' : (engineOnly.length === E.length && finalOnly.length === F.length ? 'disjoint' : (engineOnly.length && finalOnly.length ? 'both_differ' : engineOnly.length ? 'engine_extra' : 'engine_missing')));
        rec(T.readings_eng_superset, !finalOnly.length, ex);
        rec(T.readings_final_superset, !engineOnly.length, ex);
        rec(T.readings_any_overlap, E.length === 0 && F.length === 0 || engineOnly.length < E.length, ex);
        for (const x of r.readings) { const f = F.find((y) => y.b === normBook(x.passage.book) && Math.max(overlapFraction(intervals(x.passage), y.iv), overlapFraction(y.iv, intervals(x.passage))) >= 0.5); if (f) rec(T.service, (f.cls === 'jashoo') === (x.service.class === 'jashoo'), { date: fd.date, key: x.citationKey, engine: x.service.label, final: f.cls + ': ' + f.label }, `${x.service.class}->${f.cls}`); }
      }
    }
  }
}
const pct = (a) => (a.n ? Math.round((1000 * a.agree) / a.n) / 10 : null);
const summ = {};
for (const g of Object.keys(S)) summ[g] = Object.fromEntries(Object.entries(S[g]).map(([k, a]) => [k, { n: a.n, agree: a.agree, pct: pct(a), kinds: a.kinds }]));
fs.mkdirSync(new URL('../validation/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../validation/report.json', import.meta.url), JSON.stringify({ generated: 'validate_vs_final.mjs', note: 'fast, names and reading sets are out-of-sample; service class is in-sample (table learned from the same tables)', summary: summ, examples: Object.fromEntries(Object.entries(S.all).map(([k, a]) => [k, a.examples])) }, null, 1));
let md = '# Engine vs 2001-2040 lectionary tables\n\nFast, names and reading sets: out-of-sample. Service class: in-sample (learned from the same tables).\n\n| field | all days 2001-2040 | feed window 2026-10-23..2027-12-31 |\n|---|---|---|\n';
for (const k of Object.keys(S.all)) md += `| ${k} | ${summ.all[k].agree}/${summ.all[k].n} (${summ.all[k].pct}%) | ${summ.feed[k].agree}/${summ.feed[k].n} (${summ.feed[k].pct}%) |\n`;
md += '\nDisagreement kinds (all days):\n';
for (const k of Object.keys(S.all)) md += `- ${k}: ${JSON.stringify(summ.all[k].kinds)}\n`;
fs.writeFileSync(new URL('../validation/REPORT.md', import.meta.url), md);
console.log(md);
