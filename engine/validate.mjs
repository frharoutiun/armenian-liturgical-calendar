// Validation + conservative repair of parsed Hador 1 citations.
// The book prints chapter and verse as Armenian numerals; the digitised numerals confuse a few look-alike letters (Գ 3 / Դ 4, Ե 5 / Է 7), which
// produces impossible references (a verse beyond the chapter's last verse, a range that runs backwards). A reference is repaired ONLY when
// (1) it is impossible as printed, (2) exactly ONE single-numeral look-alike substitution makes it valid, and (3) the change is recorded in `flags`
// as numeral_repair with the original value. Ambiguous or unfixable references are left untouched and flagged `invalid_reference`.
import { BOOKS } from './calgen/engine/readings.mjs';
const CONFUSE = { 3: [4], 4: [3], 5: [7], 7: [5] };   // unit digit look-alikes (Գ/Դ, Ե/Է)

function maxVerse(CV, book, ch) { const b = CV && CV.books && CV.books[book]; const v = b && b[ch]; return typeof v === 'number' ? v : null; }

function valid(CV, book, s) {
  const { ch1, v1, ch2, v2 } = s;
  if (ch1 == null) return true;
  const c2 = ch2 == null ? ch1 : ch2;
  if (c2 < ch1) return false;
  if (v1 != null && v2 != null && c2 === ch1 && v2 < v1) return false;
  for (const [c, v] of [[ch1, v1], [c2, v2 != null ? v2 : (c2 === ch1 ? v1 : null)]]) {
    if (v == null) continue;
    const mx = maxVerse(CV, book, c);
    if (mx != null && v > mx) return false;
  }
  return true;
}
function variants(n) {
  if (n == null) return [];
  const u = n % 10, t = n - u, out = [];
  for (const alt of CONFUSE[u] || []) out.push(t + alt);
  return out;
}
const FIELDS = ['ch1', 'v1', 'ch2', 'v2'];
export function repairSegment(CV, book, s) {
  if (valid(CV, book, s)) return { seg: s, status: 'ok' };
  const cands = [];
  const sameChapter = s.ch2 == null || s.ch2 === s.ch1;     // one chapter printed once: a look-alike error changes it for the whole range
  for (const f of FIELDS) {
    if (sameChapter && f === 'ch2') continue;
    for (const alt of variants(s[f])) {
      const t = { ...s, [f]: alt };
      if (sameChapter && f === 'ch1' && s.ch2 != null) t.ch2 = alt;
      if (valid(CV, book, t)) cands.push({ field: f, from: s[f], to: alt, seg: t });
    }
  }
  if (cands.length === 1) return { seg: cands[0].seg, status: 'repaired', change: { field: cands[0].field, from: cands[0].from, to: cands[0].to } };
  return { seg: s, status: cands.length ? 'ambiguous' : 'invalid', candidates: cands.map((c) => ({ field: c.field, from: c.from, to: c.to })) };
}
// r: engine parse record. Returns a clone with repaired numerals (flags + repair note) or r itself when nothing changed.
export function repairReading(CV, bookName, r) {
  if (!r || r.ch1 == null) return r;
  const segs = r.segments && r.segments.length > 1 ? r.segments : null;
  const flags = [...(r.flags || [])];
  let changed = false; const notes = [];
  const fix = (s) => {
    const res = repairSegment(CV, bookName, s);
    if (res.status === 'repaired') { changed = true; notes.push(res.change); flags.push('numeral_repair'); return { ...s, ...res.seg }; }
    if (res.status === 'ambiguous' || res.status === 'invalid') { flags.push('invalid_reference'); changed = true; }
    return s;
  };
  const top = fix({ ch1: r.ch1, v1: r.v1, ch2: r.ch2, v2: r.v2 });
  const out = { ...r, ch1: top.ch1, v1: top.v1, ch2: top.ch2, v2: top.v2 };
  if (segs) out.segments = segs.map((s) => ({ ...s, ...fix({ ch1: s.ch1, v1: s.v1, ch2: s.ch2, v2: s.v2 }) }));
  if (!changed) return r;
  out.flags = [...new Set(flags)];
  if (notes.length) out.numeralRepair = notes;
  return out;
}

// ---- book repair: the chapter is beyond the book's last chapter (Mark 26, 2 Peter 4) ----
// Candidates: (1) the book the printer put in square brackets as the correction (« Մարկոսի [Մատթէոսի] ԻԶ. »), (2) the other numbered book of the same
// family (1 / 2 Peter, 1 / 2 / 3 John, ...). Applied only when exactly one candidate makes the reference valid; recorded as book_repair.
function byEn(name) { return BOOKS.find((b) => b.en === name) || null; }
export function repairBook(CV, r) {
  if (!r || !r.flags || !r.flags.some((f) => String(f).startsWith('chapter_beyond_book'))) return r;
  const cur = BOOKS.find((b) => b.id === r.book_id); if (!cur) return r;
  const cands = [];
  const seen = new Set([cur.id]);
  const push = (b, why) => { if (!b || seen.has(b.id)) return; seen.add(b.id); cands.push({ b, why }); };
  for (const a of r.alternatives || []) push(byEn(a.book), 'bracketed correction');
  if (cur.num != null) for (const b of BOOKS) if (b.num != null && b.aliases.some((x) => cur.aliases.includes(x))) push(b, 'same numbered family');
  const top = { ch1: r.ch1, v1: r.v1, ch2: r.ch2, v2: r.v2 };
  const ok = cands.filter(({ b }) => {
    const chs = [r.ch1, r.ch2].filter((c) => c != null);
    if (chs.some((c) => c > b.maxCh)) return false;
    return valid(CV, bookKeyEn(b), top);
  });
  if (ok.length !== 1) return r;
  const { b, why } = ok[0];
  const flags = [...new Set([...(r.flags || []).filter((f) => !String(f).startsWith('chapter_beyond_book')), 'book_repair'])];
  return { ...r, book: b.en, book_hy: b.hy, book_id: b.id, kind: b.cat, category: b.cat, flags, bookRepair: { from: cur.en, to: b.en, why } };
}
export function bookKeyEn(b) { return b.en.replace(/\s*\(.*$/, '').replace('Wisdom of Solomon', 'Wisdom').replace('Song of Solomon', 'Song of Songs'); }

export function bookByNormalizedName(name) { return BOOKS.find((b) => bookKeyEn(b) === name) || null; }
export function passageOverlap(a, b) {   // same book, verse ranges intersect
  if (a.book !== b.book) return false;
  const iv = (t) => [t.ch1 * 1000 + (t.v1 || 0), (t.ch2 != null ? t.ch2 : t.ch1) * 1000 + (t.v2 != null ? t.v2 : (t.v1 != null ? t.v1 : 999))];
  const x = iv(a), y = iv(b); return x[0] <= y[1] && y[0] <= x[1];
}
