// Match an engine reading (liturgical-day/1.0 `reading.passage`) to a citation in the scripture cache (data/scripture/index.json).
// Pure functions, shared by the browser (day-extras.js) and the node tests.
export function normBook(name) {
  let s = String(name || '').trim().toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[.’']/g, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(iii|ii|i|1st|2nd|3rd|first|second|third)\s+/, (m, r) => ({ iii: '3', ii: '2', i: '1', '1st': '1', '2nd': '2', '3rd': '3', first: '1', second: '2', third: '3' }[r.trim()] + ' '));
  s = s.replace(/^([123])\s*/, '$1 ');
  s = s.replace(/\s+/g, '');
  const alias = { wisdomofsolomon: 'wisdom', songofsongs: 'songofsolomon', songofsolomon: 'songofsolomon', '1kingdoms': '1samuel', '2kingdoms': '2samuel', '3kingdoms': '1kings', '4kingdoms': '2kings' };
  return alias[s] || s;
}
const KEY = /^(.+)\|(\d+):(\d+)-(\d+):(\d+)$/;
export function buildLookup(citations) {
  const m = new Map();
  for (const k of Object.keys(citations)) {
    const x = KEY.exec(k);
    if (!x) continue;
    m.set(`${normBook(x[1])}|${x[2]}:${x[3]}-${x[4]}:${x[5]}`, k);
  }
  return m;
}
export function segmentsOf(passage) {
  if (!passage || !passage.book) return [];
  const segs = passage.segments && passage.segments.length ? passage.segments : [{ ch1: passage.ch1, v1: passage.v1, ch2: passage.ch2, v2: passage.v2 }];
  return segs.map((s) => ({ book: passage.book, ch1: s.ch1, v1: s.v1, ch2: s.ch2, v2: s.v2 }));
}
// -> [{segment, key|null}] one per passage segment (key is the cache key if present)
export function findCitations(lookup, passage) {
  return segmentsOf(passage).map((s) => {
    if (s.v1 == null || s.v2 == null) return { segment: s, key: null };
    return { segment: s, key: lookup.get(`${normBook(s.book)}|${s.ch1}:${s.v1}-${s.ch2}:${s.v2}`) || null };
  });
}
export function bibleGatewayUrl(passage) {
  const segs = segmentsOf(passage);
  if (!segs.length) return null;
  const q = segs.map((s) => `${s.book} ${s.ch1}${s.v1 != null ? ':' + s.v1 : ''}${(s.ch2 !== s.ch1 || (s.v2 != null && s.v2 !== s.v1)) ? '-' + (s.ch2 !== s.ch1 ? s.ch2 + ':' : '') + (s.v2 != null ? s.v2 : '') : ''}`).join('; ');
  return 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(q) + '&version=RSVCE';
}
