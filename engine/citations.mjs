// English citation derived from the parsed passage itself (book + chapter:verse), for passages the Jashots index has no entry for.
// The Jashots index only knows passages observed in the 2001-2040 lectionary tables; a rules engine must name ANY passage Hador 1 prints
// (e.g. the opening Wisdom / Song of Songs reading), so the citation is composed from the parse when the index is silent.
const SHORT = { 'Wisdom of Solomon': 'Wisdom', 'Song of Solomon': 'Song of Songs' };
export function bookEn(book) {
  if (!book) return null;
  const b = String(book).replace(/\s*\(.*\)\s*$/, '').trim();   // '1 Samuel (Armenian: 1 Kingdoms, ...)' -> '1 Samuel'
  return SHORT[b] || b;
}
function one(b, s) {
  const { ch1, v1, ch2, v2 } = s;
  if (ch1 == null) return null;
  if (v1 == null) return ch2 != null && ch2 !== ch1 ? `${b} ${ch1}-${ch2}` : `${b} ${ch1}`;
  if (ch2 != null && ch2 !== ch1) return `${b} ${ch1}:${v1}-${ch2}:${v2}`;
  return v2 != null && v2 !== v1 ? `${b} ${ch1}:${v1}-${v2}` : `${b} ${ch1}:${v1}`;
}
// r: engine parse record {book, ch1, v1, ch2, v2, segments?}
export function citationEnglish(r) {
  const b = bookEn(r && r.book); if (!b) return null;
  const segs = r.segments && r.segments.length > 1 ? r.segments : null;
  if (segs) {
    const parts = segs.map((s) => one(b, s)).filter(Boolean);
    return parts.length ? parts.join(' + ') : null;
  }
  return one(b, r);
}
