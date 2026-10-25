// engine/readings.mjs -- deterministic parser for the Scripture-reading strings printed in Hador 1.
// Works ONLY from the Armenian verbatim text (never from the stored `citations`). See docs/notes/readings.md.
// Plain ES module, no dependencies.

// ---------- Armenian alphabetic numerals ----------
const NUMVAL = {
  Ա: 1, Բ: 2, Գ: 3, Դ: 4, Ե: 5, Զ: 6, Է: 7, Ը: 8, Թ: 9,
  Ժ: 10, Ի: 20, Լ: 30, Խ: 40, Ծ: 50, Կ: 60, Հ: 70, Ձ: 80, Ղ: 90,
  Ճ: 100, Մ: 200, Յ: 300, Ն: 400, Շ: 500, Ո: 600, Չ: 700, Պ: 800, Ջ: 900,
};
/** Armenian numeral -> integer, or null when the letters are not a well-formed numeral (place values must not increase). */
export function armNum(s) {
  if (!s) return null;
  const u = s.toUpperCase();
  let total = 0, prevPlace = Infinity;
  for (const ch of u) {
    const v = NUMVAL[ch]; if (!v) return null;
    const place = v >= 100 ? 3 : v >= 10 ? 2 : 1; // 3 hundreds, 2 tens, 1 units
    if (place >= prevPlace) return null; // place values must strictly decrease
    prevPlace = place; total += v;
  }
  return total;
}

// ---------- the book table (every form attested in Hador 1; see docs/notes/readings.md) ----------
// cat: gospel | acts | epistle (Pauline) | catholic epistle | prophet | old testament
// numbers: allowed book-number prefixes (Armenian ա./բ./գ./դ.). maxCh: chapters in the book (range check only).
const B = (id, en, hy, cat, maxCh, aliases, extra = {}) => ({ id, en, hy, cat, maxCh, aliases, ...extra });
export const BOOKS = [
  B('MAT', 'Matthew', 'Մատթէոս', 'gospel', 28, ['մատթ', 'մատթէոս', 'մատթէոսի']),
  B('MRK', 'Mark', 'Մարկոս', 'gospel', 16, ['մարկ', 'մարկոս', 'մարկոսի']),
  B('LUK', 'Luke', 'Ղուկաս', 'gospel', 24, ['ղուկ', 'ղուկաս', 'ղուկասու']),
  B('JHN', 'John', 'Յովհաննէս', 'gospel', 21, ['յովհ', 'յովհաննէս', 'յովհաննու']),
  B('ACT', 'Acts', 'Գործք Առաքելոց', 'acts', 28, ['գործք', 'գործք առաքելոց']),
  B('ROM', 'Romans', 'Հռովմայեցիս', 'epistle', 16, ['հռոմ', 'հռով']),
  B('1CO', '1 Corinthians', 'Ա. Կորնթացիս', 'epistle', 16, ['կորն', 'կորնթացիս'], { num: 1 }),
  B('2CO', '2 Corinthians', 'Բ. Կորնթացիս', 'epistle', 13, ['կորն', 'կորնթացիս'], { num: 2 }),
  B('GAL', 'Galatians', 'Գաղատացիս', 'epistle', 6, ['գաղ', 'գաղա', 'գաղատ', 'գաղատացիս']),
  B('EPH', 'Ephesians', 'Եփեսացիս', 'epistle', 6, ['եփես', 'եփեսացիս']),
  B('PHP', 'Philippians', 'Փիլիպպեցիս', 'epistle', 4, ['փիլիպ', 'փիլիպպեցիս']),
  B('COL', 'Colossians', 'Կողոսացիս', 'epistle', 4, ['կողոս', 'կողոսացիս']),
  B('1TH', '1 Thessalonians', 'Ա. Թեսաղոնիկեցիս', 'epistle', 5, ['թես', 'թեսաղոնիկեցիս'], { num: 1 }),
  B('2TH', '2 Thessalonians', 'Բ. Թեսաղոնիկեցիս', 'epistle', 3, ['թես', 'թեսաղոնիկեցիս'], { num: 2 }),
  B('1TI', '1 Timothy', 'Ա. Տիմոթէոս', 'epistle', 6, ['տիմ', 'տիմոթէոս'], { num: 1 }),
  B('2TI', '2 Timothy', 'Բ. Տիմոթէոս', 'epistle', 4, ['տիմ', 'տիմոթէոս'], { num: 2 }),
  B('TIT', 'Titus', 'Տիտոս', 'epistle', 3, ['տիտ', 'տիտոս']),
  B('HEB', 'Hebrews', 'Եբրայեցիս', 'epistle', 13, ['եբր', 'եբրա', 'եբրայ', 'եբրս', 'եբրայեցիս']),
  B('JAS', 'James', 'Կաթուղիկե Յակոբոսի', 'catholic epistle', 5, ['յակոբ', 'յակոբու'], { catholic: true }),
  B('1PE', '1 Peter', 'Ա. Պետրոս', 'catholic epistle', 5, ['պետ', 'պետր', 'պետրոս', 'պետրոսի'], { num: 1 }),
  B('2PE', '2 Peter', 'Բ. Պետրոս', 'catholic epistle', 3, ['պետ', 'պետր', 'պետրոս', 'պետրոսի'], { num: 2 }),
  B('1JN', '1 John', 'Ա. Յովհաննու', 'catholic epistle', 5, ['յովհ', 'յովհաննու', 'յովհաննէս'], { num: 1 }),
  B('2JN', '2 John', 'Բ. Յովհաննու', 'catholic epistle', 1, ['յովհ', 'յովհաննու', 'յովհաննէս'], { num: 2 }),
  B('3JN', '3 John', 'Գ. Յովհաննու', 'catholic epistle', 1, ['յովհ', 'յովհաննու', 'յովհաննէս'], { num: 3 }),
  B('JUD', 'Jude', 'Յուդա', 'catholic epistle', 1, ['յուդա', 'յուդայ']),
  B('GEN', 'Genesis', 'Ծննդոց', 'old testament', 50, ['ծննդոց']),
  B('EXO', 'Exodus', 'Ելից', 'old testament', 40, ['ելից']),
  B('LEV', 'Leviticus', 'Ղեւտացւոց', 'old testament', 27, ['ղեւտացւոց']),
  B('NUM', 'Numbers', 'Թուոց', 'old testament', 36, ['թուոց']),
  B('DEU', 'Deuteronomy', 'Երկրորդ Օրինաց', 'old testament', 34, ['երկրորդ օրինաց', 'օրի', 'օրինաց'], { nameNumber: 2 }),
  B('JOS', 'Joshua', 'Յեսու', 'old testament', 24, ['յեսու', 'յեսուայ']),
  B('1SA', '1 Samuel (Armenian: 1 Kingdoms, Ա. Թագաւորաց)', 'Ա. Թագաւորաց', 'old testament', 31, ['թագ', 'թագաւորաց'], { num: 1 }),
  B('2SA', '2 Samuel (Armenian: 2 Kingdoms, Բ. Թագաւորաց)', 'Բ. Թագաւորաց', 'old testament', 24, ['թագ', 'թագաւորաց'], { num: 2 }),
  B('1KI', '1 Kings (Armenian: 3 Kingdoms, Գ. Թագաւորաց)', 'Գ. Թագաւորաց', 'old testament', 22, ['թագ', 'թագաւորաց'], { num: 3 }),
  B('2KI', '2 Kings (Armenian: 4 Kingdoms, Դ. Թագաւորաց)', 'Դ. Թագաւորաց', 'old testament', 25, ['թագ', 'թագաւորաց'], { num: 4 }),
  B('2CH', '2 Chronicles (Armenian: Բ. Մնացորդաց)', 'Բ. Մնացորդաց', 'old testament', 36, ['մնացորդաց'], { num: 2 }),
  B('2MA', '2 Maccabees', 'Բ. Մակաբայեցւոց', 'old testament', 15, ['մակաբ'], { num: 2 }),
  B('EST', 'Esther', 'Եսթեր', 'old testament', 10, ['եսթերայ']),
  B('JDT', 'Judith', 'Յուդիթ', 'old testament', 16, ['յուդիթայ']),
  B('JOB', 'Job', 'Յոբ', 'old testament', 42, ['յոբայ', 'յովբայ']),
  B('PRO', 'Proverbs', 'Առակք', 'old testament', 31, ['առակ', 'առակաց']),
  B('WIS', 'Wisdom of Solomon', 'Իմաստութիւն Սողոմոնի', 'old testament', 19, ['առակ իմաս', 'առակ իմաստ', 'առակ իմաստութ', 'առակ իմաստութեան', 'առակաց իմաստութեան', 'իմաս', 'իմաստ', 'իմաստութիւն']),
  B('ECC', 'Ecclesiastes', 'Ժողովող', 'old testament', 12, ['ժողովողի']),
  B('SNG', 'Song of Songs', 'Երգ երգոց', 'old testament', 8, ['երգ երգոց']),
  B('ISA', 'Isaiah', 'Եսայի', 'prophet', 66, ['եսայ', 'եսայի', 'եսայեայ']),
  B('JER', 'Jeremiah', 'Երեմիա', 'prophet', 52, ['երեմ', 'երեմիա', 'երեմիայ']),
  B('BAR', 'Baruch', 'Բարուք', 'prophet', 6, ['բարուք', 'երեմ բարուք', 'երեմիայ բարուք']),
  B('LAM', 'Lamentations', 'Ողբք Երեմիայի', 'prophet', 5, ['երեմ ողբոց']),
  B('EZK', 'Ezekiel', 'Եզեկիէլ', 'prophet', 48, ['եզեկ', 'եզեկիէլ', 'եզեկիէլի']),
  B('DAN', 'Daniel', 'Դանիէլ', 'prophet', 14, ['դանիէլ', 'դանիէլի']),
  B('HOS', 'Hosea', 'Ովսէ', 'prophet', 14, ['ովսէ']),
  B('JOL', 'Joel', 'Յովէլ', 'prophet', 3, ['յովել', 'յովէլ', 'յովելեայ']),
  B('AMO', 'Amos', 'Ամովս', 'prophet', 9, ['ամովս']),
  B('OBA', 'Obadiah', 'Աբդիու', 'prophet', 1, ['աբդիու']),
  B('JON', 'Jonah', 'Յովնան', 'prophet', 4, ['յովնան']),
  B('MIC', 'Micah', 'Միքիա', 'prophet', 7, ['միքիա', 'միքիայ']),
  B('NAM', 'Nahum', 'Նաւում', 'prophet', 3, ['նաւում', 'նաւումայ']),
  B('ZEP', 'Zephaniah', 'Սոփոնիա', 'prophet', 3, ['սոփոնիա']),
  B('ZEC', 'Zechariah', 'Զաքարիա', 'prophet', 14, ['զաք', 'զաքար', 'զաքարիա', 'զաքարիայ']),
  B('MAL', 'Malachi', 'Մաղաքիա', 'prophet', 4, ['մաղաք', 'մաղաքիա']),
];

// ---------- the words of the printed heads that are NOT book names ----------
// service words: map ONLY words the book uses.
export const SERVICE_WORDS = {
  'առաւօտու': 'Morning', 'առաւօտեան': 'Morning',          // "of the morning"
  'ճաշու': 'Jashoo',                                        // "of the Jashoo" (the Jashoo/Liturgy-hour readings)
  'յերեկոյին': 'Evening', 'յերեկոյի': 'Evening', 'երեկոյեան': 'Evening', // "of the evening"
  'արձակման': 'Dismissal',                                  // "of the dismissal"
  'գիշերային': 'Night',                                     // "of the night"
};
export const KIND_WORDS = { 'աւետարան': 'gospel', 'աւետ': 'gospel', 'առաքեալն': 'apostle', 'առաքեալ': 'apostle', 'մարգարէ': 'prophet', 'մարգարէի': 'prophet', 'ընթերցուածք': 'reading', 'ընթերցուած': 'reading' };
const FILLER = new Set(['ըստ', 'գիրք', 'դարձեալ']);              // "according to", "Book (of)", "again/also"
const QUALIFIER_WORDS = new Set(['թափորի', 'թափօրի', 'սեղանի', 'վրայ', 'հանգստեան', 'անդաստանի', 'արեւելեան', 'արեւմտեան', 'հիւսիսային', 'հարաւային', 'իւղաբերից', 'խաչելութեան', 'մահ', 'դաւթի', 'առաջին']);
const SEQ_WORDS = { 'առաջին': 1 };                               // "first" (e.g. "Յերեկոյին առաջին աւետարան")
const CATH_WORDS = new Set(['կաթ', 'կաթուղիկեայց']);

const NUM_TOKEN = /^[Ա-Թա-թ]$/;
const bookKey = (s) => s.toLowerCase();

function norm(s) {
  return s.replace(/․|‧/g, '.').replace(/[–—−]/g, '-').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------- reference tail:  CH. V [- [CH.] V] [, V [- V]] ----------
const CHV = '(?:([Ա-Ֆ]{1,4})\\.?\\s*)?';
const SEG = new RegExp('^\\s*' + CHV + '(\\d+)([ա-ֆ])?\\s*(?:-\\s*' + CHV + '(\\d+)([ա-ֆ])?)?\\s*(?:,|$)');
const INC = new RegExp('^\\s*([Ա-Ֆ]{1,4})\\.?\\s*(\\d+)\\.\\s*(.*?)[.,]?\\s*վ\\.?\\s*(?:([Ա-Ֆ]{1,4})\\.?\\s*)?(\\d+)\\.?\\s*(.*?)\\s*[:։]?\\s*$');
// incipit and end words joined by a dash instead of the end marker վ: "ԿԱ. 10. Ցնծասցէ անձն իմ - ԿԲ. 3. Աստուծոյ քո" (Isaiah 61:10-62:3, Romans 15:30-16:2)
const INC2 = new RegExp('^\\s*([Ա-Ֆ]{1,4})\\.?\\s*(\\d+)\\.\\s+([^\\d\\-]{3,}?)\\s+-\\s*([Ա-Ֆ]{1,4})\\.?\\s*(\\d+)\\.\\s*([^\\d]+?)\\s*[:։]?\\s*$');
const INC1 = new RegExp('^\\s*([Ա-Ֆ]{1,4})\\.?\\s*(\\d+)\\.\\s+([^\\d]+?)\\s*[:։]?\\s*$');
function parseTail(tail, flags) {
  let im = INC.exec(tail);
  if (im) {
    const c1 = armNum(im[1]); const c2 = im[4] ? armNum(im[4]) : c1; if (c1 == null || c2 == null) return { error: 'bad chapter numeral in incipit form' };
    flags.push('incipit_and_end_words_printed');
    return { segs: [{ ch1: c1, v1: +im[2], ch2: c2, v2: +im[5], v1_suffix: null, v2_suffix: null, start_words: im[3].trim(), end_words: im[6].trim() }] };
  }
  im = INC2.exec(tail);
  if (im && armNum(im[1]) != null && armNum(im[4]) != null) {
    flags.push('incipit_and_end_words_printed');
    return { segs: [{ ch1: armNum(im[1]), v1: +im[2], ch2: armNum(im[4]), v2: +im[5], v1_suffix: null, v2_suffix: null, start_words: im[3].trim(), end_words: im[6].trim() }] };
  }
  im = INC1.exec(tail);
  if (im && armNum(im[1]) != null) { flags.push('incipit_words_printed_no_end'); return { segs: [{ ch1: armNum(im[1]), v1: +im[2], ch2: null, v2: null, v1_suffix: null, v2_suffix: null, start_words: im[3].trim() }] }; }
  tail = tail.trim();
  if (/(\.{2,}|…)\s*$/.test(tail)) { flags.push('ellipsis_after_start'); tail = tail.replace(/\s*-?\s*(\.{2,}|…)\s*$/, ''); }
  tail = tail.replace(/[.\s]+$/, '');
  let rest = tail.replace(/[։:;]\s*$/, '').replace(/\s*վ\.?$/, () => { flags.push('end_marker_v'); return ''; }).trim();
  const segs = []; let prevCh = null;
  while (rest.length) {
    const m = SEG.exec(rest); if (!m) return { error: 'cannot parse reference tail near: ' + rest };
    const [all, c1s, v1s, v1x, c2s, v2s, v2x] = m;
    let c1 = c1s ? armNum(c1s) : prevCh; if (c1s && c1 == null) return { error: 'bad chapter numeral ' + c1s };
    if (c1 == null) return { error: 'verse without chapter' };
    let c2 = c1, v2 = null;
    if (v2s != null) { v2 = +v2s; if (c2s) { c2 = armNum(c2s); if (c2 == null) return { error: 'bad chapter numeral ' + c2s }; } }
    segs.push({ ch1: c1, v1: +v1s, ch2: v2s != null ? c2 : null, v2, v1_suffix: v1x || null, v2_suffix: v2x || null });
    prevCh = v2s != null ? c2 : c1;
    rest = rest.slice(all.length).trim();
    if (all.trim().endsWith(',') && !rest.length) { flags.push('trailing_comma'); }
  }
  return { segs };
}

// ---------- the head ----------
function lookupBook(nameKey, num, catholic) {
  const cands = BOOKS.filter((b) => b.aliases.includes(nameKey));
  if (!cands.length) return { error: 'unknown book name: ' + nameKey };
  let pick = cands;
  if (cands.some((b) => b.num != null) || cands.length > 1) {
    pick = cands.filter((b) => (b.num ?? null) === (num ?? null));
    // catholic marker without number: James / Jude
    if (!pick.length) pick = cands.filter((b) => b.num == null);
  }
  if (cands.length === 1 && cands[0].nameNumber != null) pick = cands;
  if (!pick.length) return { error: `book "${nameKey}" with number ${num} not in table` };
  if (pick.length > 1) return { error: 'ambiguous book ' + nameKey };
  return { book: pick[0] };
}

// A string may hold several readings joined by commas (Good Friday: "... Եսայ. Գ. 9 - 15, Փիլիպ. Բ. 5 - 11"). Split only where a book head follows the comma.
const FIRSTWORDS = new Set(BOOKS.flatMap((b) => b.aliases.map((a) => a.split(' ')[0])).concat(Object.keys(KIND_WORDS), Object.keys(SERVICE_WORDS), [...CATH_WORDS]));
export function splitCompound(verbatim) {
  const s = norm(verbatim); const cuts = []; const re = /,\s*/g; let m;
  while ((m = re.exec(s))) {
    const after = s.slice(m.index + m[0].length).split(/\s+/).map((w) => bookKey(w.replace(/[.՝:,]+$/, '')));
    const w0 = after[0]; const ok = FIRSTWORDS.has(w0) || (NUM_TOKEN.test(w0.toUpperCase()) && w0.length === 1 && FIRSTWORDS.has(after[1] || ''));
    if (ok && /\d/.test(s.slice(cuts.length ? cuts[cuts.length - 1][1] : 0, m.index))) cuts.push([m.index, m.index + m[0].length]);
  }
  if (!cuts.length) return [verbatim];
  const parts = []; let prev = 0; for (const [a, b] of cuts) { parts.push(s.slice(prev, a)); prev = b; } parts.push(s.slice(prev));
  const pm = /^.*?ընթերցուած\.?\s+/.exec(parts[0]); // shared prefix like "Խաչելութեան Ե. ընթերցուած."
  return parts.map((x, i) => (i > 0 && pm ? pm[0] + x : x));
}
/** Like parseReading but returns an ARRAY (one element per reading inside a compound string). */
export function parseReadings(verbatim) {
  const parts = splitCompound(verbatim);
  return parts.map((x, i) => { const p = parseReading(x); if (parts.length > 1) { p.compound = { index: i, of: parts.length, whole_verbatim: verbatim }; p.flags.push('compound_string_split'); } return p; });
}
/** Parse one printed reading string. Never throws; returns {status:'unparsed', reason} when it cannot. */
export function parseReading(verbatim, opts = {}) {
  const out = { verbatim, status: 'unparsed', service: null, service_source: null, kind: null, kind_printed: null, book: null, book_hy: null, book_id: null, ch1: null, v1: null, ch2: null, v2: null, end: null, end_source: null, segments: [], qualifiers: [], flags: [], reason: null };
  const flags = out.flags;
  if (typeof verbatim !== 'string' || !verbatim.trim()) { out.reason = 'empty string'; return out; }
  let s = norm(verbatim);
  // brackets = alternative / editorial reading
  let bracketText = null;
  s = s.replace(/\[([^\]]*)\]/g, (_, t) => { bracketText = t; return ' '; }).replace(/\s+/g, ' ').trim();
  // parentheses: trailing service marker or qualifier
  const paren = [];
  s = s.replace(/\(([^)]*)\)/g, (_, t) => { paren.push(t.trim()); return ' '; }).replace(/\s+/g, ' ').trim();
  let service = null, serviceSrc = null;
  for (const p of paren) { if (p.includes('...')) { const [a, ...b] = p.split('...'); out.start_words = a.trim(); out.end_words = b.join('...').trim(); flags.push('incipit_and_end_words_in_parentheses'); continue; } const sv = SERVICE_WORDS[bookKey(p)]; if (sv) { service = sv; serviceSrc = 'parenthesis'; } else out.qualifiers.push('(' + p + ')'); }
  // hour: "Ժամու 10-ին"
  const hm = /Ժամու\s+(\d+)\s*-\s*ին/.exec(s); if (hm) { out.hour = +hm[1]; s = s.replace(hm[0], ' ').replace(/\s+/g, ' ').trim(); out.qualifiers.push(hm[0]); flags.push('hour_qualifier_not_interpreted'); }
  // split head / tail at the first "numeral[.] digit"
  const cm = /(?<![Ա-Ֆա-ֆ])([Ա-Ֆ]{1,4})\.?\s*(\d+)/.exec(s);
  let head, tail;
  if (cm) { head = s.slice(0, cm.index); tail = s.slice(cm.index); }
  else {
    const only = /(?<![Ա-Ֆա-ֆ])([Ա-Ֆ]{1,4})\.?\s*[։:]?$/.exec(s);
    if (only && armNum(only[1]) != null && s.slice(0, only.index).trim().length > 2) { head = s.slice(0, only.index); tail = null; out.ch1 = armNum(only[1]); flags.push('chapter_only'); }
    else { out.reason = 'no chapter/verse found'; return out; }
  }
  // head tokens
  const toks = head.replace(/[՝,;։:]/g, ' ').replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  let hasGospelWord = false, number = null, ordinal = null; const name = []; let catholic = false, kindPrinted = null, sequence = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i], k = bookKey(t);
    if (SERVICE_WORDS[k]) { if (!service) { service = SERVICE_WORDS[k]; serviceSrc = 'printed word ' + t; } else if (service !== SERVICE_WORDS[k]) flags.push('two_service_words'); continue; }
    if (KIND_WORDS[k]) { const kk = KIND_WORDS[k]; if (kk === 'gospel') hasGospelWord = true; kindPrinted = kindPrinted && kindPrinted !== t ? kindPrinted : t; if (!out._kk) out._kk = kk; continue; }
    if (SEQ_WORDS[k]) { sequence = SEQ_WORDS[k]; continue; }
    if (FILLER.has(k)) { if (k === 'դարձեալ') flags.push('darjeal_again'); continue; }
    if (QUALIFIER_WORDS.has(k)) { out.qualifiers.push(t); continue; }
    if (CATH_WORDS.has(k)) { catholic = true; continue; }
    if (NUM_TOKEN.test(t)) {
      const nxt = toks[i + 1] && bookKey(toks[i + 1]);
      if (nxt && (KIND_WORDS[nxt] === 'reading')) { ordinal = armNum(t); continue; }
      if (number != null) { out.reason = 'two number tokens in head'; return out; }
      number = armNum(t); continue;
    }
    name.push(k);
  }
  delete out._kk;
  if (!name.length && bracketText == null) { out.reason = 'no book name in head'; return out; }
  const resolve = (nameTokens, num) => lookupBook(nameTokens.join(' '), num, catholic);
  // a printed Gospel word + number => the number numbers the reading (e.g. night gospels), not a book
  let useNum = number;
  let r = resolve(name, useNum);
  if (hasGospelWord && number != null) { const r2 = resolve(name, null); if (r2.book && r2.book.cat === 'gospel') { r = r2; useNum = null; ordinal = number; flags.push('number_is_reading_ordinal'); } }
  if (r.error && number != null) { const r2 = resolve(name, null); if (r2.book && r2.book.nameNumber == null) { /* leave error */ } }
  if (r.error) { out.reason = r.error; return out; }
  const bk = r.book;
  if (bk.nameNumber != null) { if (number != null && number !== bk.nameNumber) { out.reason = 'number does not fit book name'; return out; } if (number != null) flags.push('number_is_part_of_book_name'); }
  // numbered book printed without its number
  if (bk.num == null && number != null && !hasGospelWord && bk.nameNumber == null) flags.push('number_on_unnumbered_book');
  const numberedFamily = BOOKS.filter((b) => b.aliases.some((a) => bk.aliases.includes(a)) && b.num != null);
  out.book_id = bk.id; out.book = bk.en; out.book_hy = bk.hy; out.category = bk.cat;
  out.book_printed = [...(number != null ? [`${number}`] : []), ...name].join(' ');
  if (bk.num != null) out.book_number = bk.num;
  out.kind_printed = kindPrinted; out.kind = bk.cat;
  if (kindPrinted) {
    const kk = KIND_WORDS[bookKey(kindPrinted)];
    const okMap = { gospel: ['gospel'], apostle: ['epistle', 'acts', 'catholic epistle'], prophet: ['prophet'], reading: null };
    // printed "Առաքեալն" before Proverbs etc. is not seen in the book; flag any mismatch
    if (okMap[kk] && !okMap[kk].includes(bk.cat)) flags.push('printed_kind_vs_book_mismatch:' + kk + '/' + bk.cat);
  }
  if (bk.id === 'WIS') flags.push('wisdom_printed_with_Առակ_head'); else if (bk.id === 'PRO' && !/իմաս/.test(name.join(' '))) flags.push('proverbs_by_bare_Առակ');
  if (name.join(' ') === 'առակաց իմաստութեան') flags.push('doubtful_book_name');
  if (bk.id === 'PHP') flags.push('Փիլիպ_taken_as_Philippians');
  if (number == null && bk.num == null && numberedFamily.length && (catholic || out.kind_printed === 'Առաքեալն') && bk.cat === 'gospel') { out.reason = 'numbered epistle printed without its number'; out.status = 'unparsed'; return out; }
  if (ordinal != null) out.ordinal = ordinal;
  if (sequence != null) out.sequence = sequence;
  if (catholic) out.catholic_marker = true;
  if (bracketText != null) { out.bracket = bracketText; const bn = bracketText.replace(/[՝,;։:.]/g, ' ').split(/\s+/).filter(Boolean).map(bookKey); const br = lookupBook(bn.join(' '), null, false); out.alternatives = [{ source: 'bracket', verbatim: bracketText, book: br.book ? br.book.en : null }]; flags.push('bracketed_alternative'); }
  // service
  out.service = service; out.service_source = service ? serviceSrc : 'not printed in the string';
  // tail
  if (tail != null) {
    const pt = parseTail(tail, flags); if (pt.error) { out.reason = pt.error; out.status = 'unparsed'; return out; }
    out.segments = pt.segs; const f = pt.segs[0], l = pt.segs[pt.segs.length - 1];
    out.ch1 = f.ch1; out.v1 = f.v1;
    if (l.v2 != null) { out.ch2 = l.ch2; out.v2 = l.v2; } else if (pt.segs.length > 1) { out.ch2 = l.ch1; out.v2 = l.v1; flags.push('multi_segment'); }
    if (pt.segs.some((x) => x.v1_suffix || x.v2_suffix)) flags.push('verse_letter_suffix');
  }
  // end handling
  if (out.v2 == null) {
    out.end = null; out.end_source = 'not printed in Hador 1';
    out.status = tail == null ? 'chapter_only' : 'start_only';
    if (tail != null) flags.push('single_verse_or_start_only');
  } else {
    out.end = { ch: out.ch2, v: out.v2 }; out.end_source = 'printed'; out.status = 'complete';
    if (out.ch2 < out.ch1 || (out.ch2 === out.ch1 && out.v2 < out.v1)) flags.push('end_before_start');
  }
  for (const c of [out.ch1, out.ch2]) if (c != null && c > bk.maxCh) { flags.push('chapter_beyond_book:' + c + '>' + bk.maxCh); break; }
  if (out.ch1 === 0 || out.v1 === 0) flags.push('zero_in_reference');
  return out;
}

// ---------- psalms / mesedi / alleluia strings (lighter parse; text kept verbatim) ----------
const SVC_RE = /(?<![Ա-Ֆա-ֆ])(Առաւօտու|Առաւօտեան|Ճաշու|Յերեկոյին|Յերեկոյի|Երեկոյեան|Արձակման|Ջրօրհնեաց)(?![Ա-Ֆա-ֆ])/gi;
const quoteStrip = (x) => (x || '').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim().replace(/^[,.:՝\s]+|[,.։:\s]+$/g, '');
const PWORD = /^(?:Մեսեդիք|Մեսեդի|Մեսեդ|Մեսե|Սաղմոս|Սաղ)\.?\s*[,՝:]?\s*/i;

/** kind: 'psalm' | 'mesedi' | 'alleluia'. Returns items [{service, occasion?, psalm_number, incipit, kc_incipit, pokh_incipit, verbatim, flags}].
 *  Service words are taken wherever they occur in the string (the book prints several services in one string). */
export function parseChant(verbatim, kind) {
  if (typeof verbatim !== 'string' || !verbatim.trim()) return [];
  const s = norm(verbatim);
  const cuts = []; let m; SVC_RE.lastIndex = 0;
  while ((m = SVC_RE.exec(s))) cuts.push({ i: m.index, w: m[1] });
  const segs = []; let prev = 0, prevW = null;
  for (const c of cuts) { if (c.i > prev) segs.push({ w: prevW, t: s.slice(prev, c.i) }); else if (c.i === prev && prevW) { /* two markers back to back: keep first only */ } prev = c.i; prevW = c.w; }
  segs.push({ w: prevW, t: s.slice(prev) });
  const items = [];
  for (const sg of segs) {
    let t = sg.t.trim(); if (!t) continue;
    const it = { kind, service: null, psalm_number: null, incipit: null, kc_incipit: null, pokh_incipit: null, verbatim: t.replace(/[\s։]+$/, ''), flags: [] };
    if (sg.w) {
      const k = bookKey(sg.w); t = t.slice(sg.w.length).trim();
      if (SERVICE_WORDS[k]) { it.service = SERVICE_WORDS[k]; it.service_printed = sg.w; } else { it.occasion = sg.w; }
      const ord = /^առաջին\s*/i.exec(t); if (ord) { it.sequence = 1; t = t.slice(ord[0].length); }
    }
    t = t.replace(/^[,.:՝։\s]+/, '');
    t = t.replace(/^Ալէ(?:լուք|լուիա)?\.?\s*/, '');
    let had = false;
    for (let g = 0; g < 2; g++) { const pm = PWORD.exec(t); if (pm) { had = true; t = t.slice(pm[0].length); } }
    const nm = /^([Ա-Ֆ]{1,4})[.,]\s*/.exec(t);
    if (nm) { const n = armNum(nm[1]); if (n != null && n >= 1 && n <= 151) { it.psalm_number = n; t = t.slice(nm[0].length); } else it.flags.push('psalm_numeral_unreadable'); }
    else if (/^[Ա-Ֆ]{1,4}\s*\(/.test(t)) it.flags.push('numeral_in_unusual_form');
    const kc = /(?:^|\s)կց\.\s*(.*?)(?=(?:\s*[,.։]?\s*փոխ[.՝])|$)/.exec(t);
    const pk = /փոխ[.՝]\s*(.*)$/.exec(t);
    if (kc) it.kc_incipit = quoteStrip(kc[1]);
    if (pk) it.pokh_incipit = quoteStrip(pk[1]);
    if (!kc && !pk) it.incipit = quoteStrip(t) || null;
    else { const lead = quoteStrip(t.replace(/(?:^|\s)կց\..*$/, '').replace(/փոխ[.՝].*$/, '')); if (lead) it.incipit = lead; }
    if (kind !== 'alleluia' && !had && it.psalm_number == null) it.flags.push('no_psalm_word_or_number');
    if (kind === 'psalm' && it.psalm_number == null && had) it.flags.push('psalm_number_not_printed');
    if (kind === 'mesedi' && /(^|\s)[աբգ]\.\s*[«"]/.test(t)) it.flags.push('numbered_list_of_mesedi_not_split');
    items.push(it);
  }
  return items;
}

// ---------- record-level helpers ----------
/** All parsed readings of the given Hador 1 record ordinals. Each item carries `ordinal` (record) and `index` (position in the record). */
export function readingsForRecords(ctx, ordinals) {
  const out = [];
  for (const o of ordinals || []) {
    const rec = ctx.H1.get(o); if (!rec) continue;
    (rec.readings || []).forEach((rd, i) => parseReadings(rd.reading_verbatim).forEach((p) => out.push({ ordinal: o, index: i, name_armenian: rec.name_armenian, ...p })));
    // Scripture the digitisation left in `readings_unparsed` (e.g. «Մարգարէ Զաք. Գ. 7 - Դ. 9» on the feast of the prophet Zechariah): the same parser
    // reads it; anything that is not a scripture reference (psalm titles, «Մահ Զաքարիայ» rubrics, «տե՛ս ի Ճաշոցն» pointers) is left out, as before.
    (rec.readings_unparsed || []).forEach((txt, j) => {
      for (const p of parseReadings(txt)) {
        if (!p.book_id || p.ch1 == null || p.v1 == null || !['complete', 'start_only'].includes(p.status)) continue;
        out.push({ ordinal: o, index: (rec.readings || []).length + j, name_armenian: rec.name_armenian, from_unparsed: true, ...p, flags: [...(p.flags || []), 'from_readings_unparsed'] });
      }
    });
  }
  return out;
}
/** psalm / mesedi / alleluia strings of the given records, parsed lightly. */
export function chantsForRecords(ctx, ordinals) {
  const out = [];
  for (const o of ordinals || []) {
    const rec = ctx.H1.get(o); if (!rec) continue;
    for (const [field, kind] of [['psalm_verbatim', 'psalm'], ['mesedi_verbatim', 'mesedi'], ['alleluia_verbatim', 'alleluia']]) {
      if (rec[field]) for (const it of parseChant(rec[field], kind)) out.push({ ordinal: o, field, ...it });
    }
  }
  return out;
}
/** View helper: given a resolved day (engine/day.mjs output: .records, .overlays arrays of ordinals), return {records:{ordinal: readings}, ...} grouped per record. */
export function parsedReadings(ctx, day) {
  const ords = [...new Set([...(day.records || []), ...(day.overlays || [])])];
  const res = { date: day.date ?? null, items: [] };
  for (const o of ords) res.items.push({ ordinal: o, role: (day.records || []).includes(o) ? 'day' : 'overlay', readings: readingsForRecords(ctx, [o]), chants: chantsForRecords(ctx, [o]) });
  return res;
}
