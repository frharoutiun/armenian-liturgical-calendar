// Commemoration NAMES (the festal name of a day). Pure functions of the rulebook data (Hador 1 records, Hador 2 rows) + the resolved day.
// Owner of this file: the names agent. The integrator calls `commemorationsFor(ctx, day)` and stores the result in `day.commemorations`.
//
// WHAT THE BOOK DOES (page evidence in docs/notes/names.md and rulebook/commemoration_names.json):
//   Hador 1 prints, for each day:  <HEADING>.  ահ. <tone> <Օրհնութիւն incipit>: Հարց <tone> <incipit>: Մեծ./Մկք./Համբ. ... Ճաշու սաղ. ... [readings]
//   The HEADING (the commemoration) is ONLY the weekday word for an ordinary weekday ("Չորեքշաբաթ."), or the weekday + a saint/feast,
//   or an ordinal Sunday ("Երրորդ կիւրակէ մեծի պահոց."), or a numbered day ("Երկրորդ աւուր"). Everything after "ահ."/"Հարց"/"Մեծ."/"Մկք."/"Համբ."/"Ճաշու"/
//   "Սաղ."/"Առաք."/"Ալէ."/"Աւետ." is hymnody, psalms or readings, never part of the commemoration. "Հարց ապաշխարութեան" / "Հարց հանգստեան" are
//   Hymn types (Wed / Fri of the fasting-weekday cycle), not names. The extractor's `name_armenian` mixed them in.
//   The owner's form for a fasting weekday is "Չորեքշաբաթ (Պահք)": the book's heading word + the fast marker.

// Reviewed titles layer (engine/titles.mjs): optional; when its data cannot be loaded the book headings are displayed unchanged.
let TITLES = null;
try { TITLES = await import('./titles.mjs'); } catch (e) { if (typeof process !== 'undefined' && process.env && process.env.CALGEN_STRICT === '1') throw e; }
export const WEEKDAY_NOM = { Mon: 'Երկուշաբաթ', Tue: 'Երեքշաբաթ', Wed: 'Չորեքշաբաթ', Thu: 'Հինգշաբաթ', Fri: 'Ուրբաթ', Sat: 'Շաբաթ', Sun: 'Կիրակի' };
const STEM = { 'Երկուշաբ': 'Երկուշաբաթ', 'Երեքշաբ': 'Երեքշաբաթ', 'Չորեքշաբ': 'Չորեքշաբաթ', 'Հինգշաբ': 'Հինգշաբաթ', 'Ուրբ': 'Ուրբաթ', 'Շաբ': 'Շաբաթ' };
export const FAST_MARK = '(Պահք)';
export const HYMN_WORDS = ['Հարց', 'Օրհնութիւն', 'Մեծացուսցէ', 'Մանկունք', 'Համբարձի', 'Շարական', 'Քարոզ', 'Աղօթք', 'Մեսեդի', 'Ապաշխարութեան', 'Հանգստեան'];

const WD_RE = /^(Աւագ\s+)?(Երկուշաբ|Երեքշաբ|Չորեքշաբ|Հինգշաբ|Ուրբ|Շաբ)(?:աթ|թ)(ի)?(?=$|[\s.։:(\[,])/;
// hymn-type phrases that the extractor put into the name (parenthetical or alone)
const HYMN_PAREN_RE = /^(Հարց\s+)?(ապաշխարութեան|հանգստեան)(\s*\/\s*(ապաշխարութեան|հանգստեան))?$/i;
const FAST_PAREN_RE = /^(Պահք|պահոց|Մեծի Պահոց)$/;
const SEASON_PAREN_RE = /^(Հինանց|Յինանց|Զկնի .+|զկնի .+)$/;
const lc = (s) => s.toLowerCase();

export function weekdayOf(s) { const m = WD_RE.exec(s || ''); return m ? { holy: !!m[1], nom: STEM[m[2]], genitive: !!m[3], len: m[0].length } : null; }
const parens = (s) => { const out = []; const re = /\(([^()]*)\)|\[([^\[\]]*)\]/g; let m; while ((m = re.exec(s))) out.push((m[1] ?? m[2]).trim()); return out; };
const stripParens = (s) => s.replace(/\([^()]*\)|\[[^\[\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => s.split(/\s+/).filter(Boolean);

// normalised matching key (separate from the verbatim Armenian)
export function keyOf(s) {
  return lc(String(s || '')).replace(/և/g, 'եւ').replace(/[՚'՝։:.,;()\[\]—–-]/g, ' ').replace(/\b(եւայլն|եւ այլն|եւն|ևն)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Page evidence: records whose printed heading was read on the page image (pdf page numbers; the printed number = pdf page + 448).
// heading = how the book prints the heading word(s) (verbatim, from the viewed image).
export const PAGE_EVIDENCE = (() => {
  const E = {}, add = (ords, page, heading) => { for (const o of ords) E[o] = { page, heading: typeof heading === 'function' ? heading(o) : heading }; };
  add([34, 35, 36, 37, 38, 39, 40, 41], 12, null);
  add([52, 53, 54, 55, 56, 57, 58, 59], 15, null);
  add([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70], 16, null);
  add([97, 98, 99], 22, null);
  add([110], 32, 'Երկուշաբաթի մեռելոց է');
  add([111, 112, 113, 114], 33, null);
  add([115, 116], 34, null);
  add([118], 35, null);
  add([119, 120, 121, 122], 36, null);
  add([159], 48, null);
  add([211, 212, 213, 214], 64, null);
  add([234, 235, 236, 237], 68, null);
  add([239], 71, 'ՍՈՒՐԲ ԱՍՏՈՒԱԾԱԾՆԻ ՎԵՐԱՓՈԽՄԱՆ ԿԻՒՐԱԿԷ');
  add([242, 243, 244, 245, 246, 247], 73, null);
  add([2, 3, 4], 6, null);
  add([82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92], 18, null);
  add([94], 19, 'Ծաղկազարդի Կիւրակէ');
  add([169, 170, 171, 172, 173], 55, null);
  add([174, 175], 56, null);
  add([375, 376, 377, 378], 96, null);
  add([263, 264, 265, 266, 267, 268], 76, null);
  add([164, 165, 166], 53, null);
  add([210], 63, 'ՎԱՐԴԱՎԱՌԻ ԿԻՒՐԱԿԷ');
  add([389], 98, null);
  // printed headings (bare weekday words) for the weekday-form records read
  const bare = { 263: 'Երկուշաբաթ պահոց', 264: 'Երեքշաբաթ', 265: 'Չորեքշաբաթ', 266: 'Հինգշաբաթ', 267: 'Ուրբաթ', 164: 'Չորեքշաբաթ', 165: 'Հինգշաբաթ', 166: 'Ուրբաթ', 38: 'Չորեքշաբաթ', 40: 'Ուրբաթ', 46: 'Չորեքշաբաթ', 213: 'Չորեքշաբաթ', 234: 'Չորեքշաբաթ', 236: 'Ուրբաթ', 243: 'Չորեքշաբաթ', 245: 'Ուրբաթ',
    53: 'Չորեքշաբաթ', 55: 'Ուրբաթ', 67: 'Չորեքշաբաթ', 69: 'Ուրբաթ', 98: 'Աւագ Չորեքշաբաթ', 99: 'Աւագ Հինգշաբաթ', 97: 'Աւագ Երեքշաբաթ',
    111: 'Երեքշաբաթի', 112: 'Չորեքշաբաթի', 113: 'Հինգշաբաթի', 114: 'Ուրբաթ', 235: 'Հինգշաբաթ', 211: 'Երկրորդ աւուրն', 212: 'Երրորդ աւուրն', 2: 'Երկրորդ աւուր առաւօտուն', 3: 'Երրորդ աւուր', 4: 'Չորրորդ աւուր' };
  for (const [o, h] of Object.entries(bare)) if (E[o]) E[o].heading = h;
  return E;
})();

const ORD_DAY_RE = /^(Երկրորդ|Երրորդ|Չորրորդ|Հինգերորդ|Վեցերորդ|Եօթներորդ|Ութերորդ)\s+(օր|աւուր)(?=$|[\s(\[])/;
const NUM_DAY_RE = /^[Ա-Ժ]{1,2}\.\s*օր(?=$|[\s(\[])/;
const SUNDAY_RE = /(Կիւրակէ|կիւրակէ|Կիրակի|կիրակի)/;
const SAINT_START_RE = /^(Տօն է\s+)?(Սրբոյն|Սրբոց|Սրբոցն|սրբոյն|սրբոց|Սուրբ ժողով|Յիշատակ|Տօն սրբոյն|Տօն սրբոց|Տօն է սրբոյն|Տօն է սրբոց|Ամենայն սրբոց|Բարսղի|Լրումն)/;
const DOMINICAL_RE = /(Տեառն|Քրիստոս|Աստուածածն|Կուս|Խաչ|Եկեղեցւ|Էջմիածն|Շողակաթ|Յայտնութ|Ծնունդ|Ծննդ|Համբարձ|Յարութ|Հոգւոյ|Հոգեգալ|Պայծառ|Վարդավառ|Տեառնընդառաջ|Աւետ|Վերափոխ|Տապանակ|Ծաղկազարդ|Զատիկ|Զատկ|Ճրագալոյց|Կրկնազատիկ|Գօտ|Տփոյ|Ընծայ|Յղութ|Թլփատ)/;

// Canon sections whose first printed line (the heading of the feast) was read on the page image: the extractor kept only the title or part of the line.
const CANON_FIRST_LINE = { 94: 'Ծաղկազարդի Կիւրակէ', 210: 'Վարդավառի Կիւրակէ' }; // 94: p.19 first line "Ծաղկազարդի Կիւրակէ." under the title "Կանոն Գալստեան Քրիստոսի Աստուծոյ մերոյ յաւանակաւ յԵրուսաղէմ" // p.63: "ՎԱՐԴԱՎԱՌԻ ԿԻՒՐԱԿԷ." under the title "ԿԱՆՈՆ ՊԱՅԾԱՌԱԿԵՐՊՈՒԹԵԱՆՆ ՔՐԻՍՏՈՍԻ ԱՍՏՈՒԾՈՅ ՄԵՐՈՅ Ի ԹԱԲՈՐ ԼԵՐԻՆՆ"
function splitTitleSection(name) {
  // canon heading: "Կանոն <genitive title> (<optional full feast phrase>)" ; "։ <Տօն ...>" tail = the printed first line of the feast.
  let n = name.replace(/^(Կանոն|ԿԱՆՈՆ)\s+/, '');
  const tail = /։\s+(.+)$/.exec(n);
  if (tail) return { main: tail[1].trim(), qualifier: [n.slice(0, tail.index).trim()], via: 'R-NAME-CANON-TAIL' };
  const ps = parens(n), base = stripParens(n);
  if (ps.length && words(ps[0]).length >= 3 && !/Կարգ/.test(ps[0])) return { main: ps[0], qualifier: [base], via: 'R-NAME-CANON-PAREN' };
  return { main: base, qualifier: ps, via: 'R-NAME-CANON-STRIP' };
}

// a parenthetical that glosses the day with a saint ("(Յիշատակ Սրբոյն Ստեփաննոսի ...)") is not part of the printed heading (p.6: "Երկրորդ աւուր"): kept in `qualifier`
const dropGloss = (s) => s.replace(/\s*\(Յիշատակ[^()]*\)/g, '').trim();
const dropHymnParens = (s) => s.replace(/\s*[\(\[]([^()\[\]]*)[\)\]]/g, (m, p) => (HYMN_PAREN_RE.test(p.trim()) ? '' : m)).replace(/\s+/g, ' ').trim();
// Heading as printed, for records whose page was viewed and whose heading is simply the weekday word (or the saint/feast phrase that follows it).
function headingFor(o, date) {
  if (['fast_weekday', 'ferial', 'numbered_day'].includes(o.kind)) { const w = weekdayOf(date); return w ? w.nom : (o.commemoration_armenian || null); }
  return o.commemoration_armenian ?? null;
}
// A feast that falls on an ordinal Sunday: the book's heading is "<ordinal Sunday>. <feast>" (p.73 rec 247: "Երրորդ կիւրակէ զկնի սուրբ Աստուածածնին: Տօն գիւտի Գօտւոյ ..."). The extractor
// put the ordinal Sunday part into `date_armenian`; it is the Sunday's own name and is emitted as a separate Sunday commemoration in front of the feast.
function sundayHeading(rec, cleaned) {
  const d = stripParens(rec.date_armenian || '');
  if (!d || !/(Կիւրակէ|կիւրակէ|Կիրակի|կիրակի)/.test(d) || words(d).length < 2 || /^(Զկնի|Ի )/.test(d)) return {};
  const nk = (x) => keyOf(x).replace(/(.)\1/g, '$1');
  if (nk(cleaned).includes(nk(d))) return {};
  if (/^Կիրակի \(/.test(rec.date_armenian || '') && words(d).length < 2) return {};
  return { sunday_heading: d.replace(/\s+/g, ' ') };
}
// Classify one Hador 1 record. Returns the names-table row.
// Scribal slips of the extraction in a NAME that the page shows differently (page-read; the source record file is never edited).
export const NAME_FIXES = { 277: { to: 'Երկրորդ Կիւրակէ զկնի սրբոյ Խաչին', page: 82, why: 'p.82 (printed 530), foot of the right column: the heading line is «Երկրորդ կիւրակէ զկնի սրբոյ Խաչին։ ահ. Յարութեան։ Հարց ԳՁ. Որ եկիր կամաւ հօր»; «ահ. Յարութեան» is the hymn line (Օրհնութիւն «Յարութեան») printed after the heading, not a second name. The extraction took it as the name «Կիւրակէ Յարութեան».' }, 35: { to: 'Կիրակէ', page: 12, why: 'p.12 (printed 460): the heading is the bare word "Կիւրակէ." followed by the hymn list; the parenthetical "(զկնի Ս. Սարգսի)" is an extractor gloss that is not printed. The Sunday is not numbered by the book (the Ծանիր rubric only says it follows the first Sunday after the Nativity and the Barekendan Sunday).' }, 375: { to: 'Սրբոցն՝ Դաւթի մարգարէին եւ Յակոբայ առաքելոյն', page: 96, why: 'p.96 prints "Առաջին տօն Սրբոցն Դաւթի մարգարէին եւ Յակոբայ առաքելոյն" (plural, two saints); the extraction has the singular "Սրբոյն"' } };
export function classifyHador1(rec, idToOrd) {
  const fix = NAME_FIXES[rec.ordinal];
  const name = fix ? fix.to : rec.name_armenian, date = rec.date_armenian || '', ord = rec.ordinal;
  const ev = PAGE_EVIDENCE[ord] || null;
  const base = { ordinal: ord, extracted_name: rec.name_armenian ?? null, ...(fix ? { name_fix: { from: rec.name_armenian, to: fix.to, page: fix.page, why: fix.why } } : {}), book_heading_verbatim: ev ? ev.heading : null, hymn_info_found_in_name: [], qualifier: [], pages: ev ? [ev.page] : [] };
  const done = (o, rule, basis, status) => ({ ...base, ...o, rule, basis, status: ev && status === 'rule_derived' && o.commemoration_armenian !== undefined && !['continuation', 'numbered_day', 'plate', 'rubric_only'].includes(o.kind) ? 'page_confirmed' : status, ...(ev && ev.heading == null ? { book_heading_verbatim: headingFor(o, date) } : {}) });
  const hymns = [], quals = [];
  const sortParens = (s) => { for (const p of parens(s)) { if (HYMN_PAREN_RE.test(p)) hymns.push(p); else quals.push(p); } };

  // rubric-only / plate / continuation
  if (name && /^(Աւարտ|Խրատ|Սակաւ ինչ)/.test(name)) return done({ kind: 'rubric_only', commemoration_armenian: null }, 'R-NAME-RUBRIC-ONLY', 'The record is a rubric or preface (printed advice), not the commemoration of a day.', 'rule_derived');
  if (/^Պատկերազարդ/.test(rec.rubrics_verbatim || '')) return done({ kind: 'plate', commemoration_armenian: null }, 'R-NAME-PLATE', 'The record is an illustrated plate that precedes the feast; it carries no heading of its own.', 'rule_derived');
  if (rec.kind === 'continuation') {
    const parent = idToOrd.get(rec.continues_feast_id) ?? null;
    return done({ kind: 'continuation', commemoration_armenian: null, continues_ordinal: parent }, 'R-NAME-CONTINUATION', 'The record continues the previous record (same day); the commemoration is the parent record\'s. The "(շարունակութիւն)" and the rite title ("Կարգ ...") are not commemorations.', 'rule_derived');
  }
  // Holy Thursday service titles that sit under the Holy-week day named in the date line
  if (name && /^(Ճաշու ժամ|Կարգ )/.test(name) && /^Աւագ/.test(date)) {
    const w = weekdayOf(date);
    if (w) return done({ kind: 'feast_weekday', commemoration_armenian: `Աւագ ${w.nom}`, service_title: name }, 'R-NAME-SERVICE-UNDER-HOLYDAY', 'A rite title ("Կարգ ...", "Ճաշու ժամ ...") is a service of the Holy-week day named in the date line; the commemoration is "Աւագ <weekday>".', 'rule_derived');
  }
  // canons: strip the hymnographic word "Կանոն"
  if (rec.kind === 'canon_feast') {
    const c = splitTitleSection(name);
    if (CANON_FIRST_LINE[ord]) { c.main = CANON_FIRST_LINE[ord]; c.qualifier = [stripParens(name.replace(/^(Կանոն|ԿԱՆՈՆ)\s+/, ''))]; c.via = 'R-NAME-CANON-FIRSTLINE'; }
    else if (/^Ճրագալուցի\s/.test(c.main)) { c.main = c.main.replace(/^Ճրագալուցի/, 'Ճրագալոյց'); c.via = 'R-NAME-CANON-EVE'; }
    const eve = c.via === 'R-NAME-CANON-EVE';
    const res = done({ kind: 'dominical_feast', commemoration_armenian: c.main, qualifier: c.qualifier.filter(Boolean), canon_title: name, hymn_info_found_in_name: ['Կանոն'], ...sundayHeading(rec, c.main) }, c.via,
      '"Կանոն" (canon) is the name of the hymn set printed under the section title; the commemoration is the feast named in the title / on the first printed line.', 'rule_derived');
    if (eve) res.status = 'rule_derived';
    return res;
  }
  // weekday-form: bare weekday headings (also when the extractor wrote a hymn type or a fast/season label as the name)
  const nm = name ?? '';
  const nameIsHymnOnly = !name || /^Հարց(\s|$)/.test(nm);
  let w = null;
  if (nameIsHymnOnly) w = weekdayOf(date);
  else if (!/մեռելոց|ի մէջ/.test(nm) && !/^Առաջին /.test(nm)) w = weekdayOf(nm);
  const restAfter = w && !nameIsHymnOnly ? stripParens(nm.slice(w.len)) : '';
  const rite = w && !nameIsHymnOnly && /^[.։]\s*\S/.test(restAfter) ? restAfter.replace(/^[.։]\s*/, '') : null;
  if (w && (nameIsHymnOnly || rite || /^(|օր|պահոց|պահոց սրբոյ Խաչին|Մեծի Պահոց|Զատկի|զկնի .+)$/.test(restAfter))) {
    if (!nameIsHymnOnly) { sortParens(nm); if (restAfter && !rite) quals.push(restAfter); } else if (name) { hymns.push(nm); }
    const fastMarked = /Պահք|պահոց|Պահոց|ապաշխարութեան|Ապաշխարութեան|հանգստեան|Հանգստեան/.test(nm) || /պահոց/i.test(date);
    const holy = w.holy, easter = ord >= 110 && ord <= 114;
    const kind = holy || easter ? 'feast_weekday' : (fastMarked ? 'fast_weekday' : 'ferial');
    const o = { kind, commemoration_armenian: (holy ? 'Աւագ ' : '') + w.nom, weekday: w.nom, hymn_info_found_in_name: hymns, qualifier: quals.filter((q) => !HYMN_PAREN_RE.test(q)) };
    if (rite) { o.service_title = rite; o.qualifier = o.qualifier.filter((q) => q !== rite); }
    if (kind === 'fast_weekday') o.fast_form = `${w.nom} ${FAST_MARK}`;
    if (kind === 'ferial') o.fast_form = `${w.nom} ${FAST_MARK}`;
    return done(o, 'R-NAME-WEEKDAY-HEADING', 'The book heads an ordinary weekday with the weekday word only; the extractor appended hymn types (Հարց ապաշխարութեան / հանգստեան), fast labels (Պահք, պահոց) or season labels. Those are removed from the commemoration; on a fasting day the owner\'s form "<weekday> (Պահք)" is used.', 'rule_derived');
  }
  // ordinary-week weekday with ordinal or special occasion wording: keep the book's words
  if ((/^(Առաջին|Երկրորդ|Երրորդ)\s+(չորեքշաբաթ|ուրբաթ|երկուշաբաթ)/.test(nm) && !/օրն/.test(nm)) || /ի մէջ աւագ տօնից/.test(nm) || /մեռելոց/.test(nm)) {
    sortParens(nm);
    const needs = /ի մէջ աւագ տօնից/.test(nm) || /^(Առաջին|Երկրորդ|Երրորդ)\s+(չորեքշաբաթ|ուրբաթ|երկուշաբաթ)/.test(nm);
    return done({ kind: /մեռելոց/.test(nm) ? 'feast_weekday' : 'ferial', commemoration_armenian: stripParens(nm), hymn_info_found_in_name: hymns, qualifier: quals },
      'R-NAME-WEEKDAY-OCCASION', 'Weekday with an occasion wording in the heading ("Monday of the dead", "first Wednesday after the octave", "between the great feasts"); the words are kept verbatim.', needs ? 'needs_human_review' : 'rule_derived');
  }
  // Easter-season days after Nor Kiraki (records 118-122): the page headings are the plain weekday words ("Երկուշաբաթի.", "Երեքշաբաթ.", ... pdf 35-36, printed 483-484); the extractor
  // wrote "Բ. օր Զատկի (Երկուշաբաթի յետ Կրկնազատկի)", a number that counts from Nor Kiraki and is NOT the day of the Easter octave count the printed calendars use. Named by the weekday.
  if (/^[Բ-Զ]\.\s*օր Զատկի \(/.test(nm) && weekdayOf(date)) {
    const wk = weekdayOf(date);
    return done({ kind: 'feast_weekday', commemoration_armenian: wk.nom, weekday: wk.nom, hymn_info_found_in_name: [], qualifier: [nm] }, 'R-NAME-EASTER-SEASON-WEEKDAY',
      'The book heads the weekdays after Nor Kiraki with the weekday word only (pdf 35-36); the numbered form is the extractor\'s, kept as a qualifier.', 'page_confirmed');
  }
  // numbered days
  if (ORD_DAY_RE.test(nm) || NUM_DAY_RE.test(nm) || /^Առաջին երկուշաբաթ օրն/.test(nm) || /^Ուրբաթ Պահոց Ծննդեան/.test(nm)) {
    sortParens(nm);
    return done({ kind: 'numbered_day', commemoration_armenian: dropGloss(dropHymnParens(nm)), hymn_info_found_in_name: hymns, qualifier: quals }, 'R-NAME-NUMBERED-DAY',
      'Numbered day of a feast octave or fast ("Երկրորդ աւուր", "Գ. օր Մեծի Պահոց"). In Great Lent the printed heading is just the weekday word (pp.15, 16, 18); the day number is the series label the extractor/engine carries, kept as the name until the owner decides (neither the numbered label nor "(Պահք)" is printed in the book).', /^[Ա-Ժ]{1,2}\.\s*օր Մեծի Պահոց/.test(nm) ? 'needs_human_review' : 'rule_derived');
  }
  // sundays
  const strip = nm.replace(/^(Նախ՝|Ապա)\s+/, '');
  sortParens(strip);
  const keepParens = !quals.length || true;
  const cleaned = stripParens(strip) || strip;
  if (SUNDAY_RE.test(nm) || rec.weekday === 'Sun' && !SAINT_START_RE.test(nm) && !/^Տօն/.test(nm)) {
    // "<Sunday>. Բարեկենդան <fast>" is a Sunday plus the Barekendan label of the next fast; a name that is only the Barekendan label is the label (the Sunday itself is named by the date line)
    const bk = /^(.+?)\s*[.։]\s*(Բարեկենդան .+)$/.exec(stripParens(strip));
    if (bk) return done({ kind: 'sunday', commemoration_armenian: bk[1].trim(), label_tail: bk[2].trim(), hymn_info_found_in_name: hymns, qualifier: quals, ...sundayHeading(rec, bk[1]) }, 'R-NAME-SUNDAY-BAREKENDAN', 'Sunday name followed by the Barekendan label of the coming fast; the label is shown separately.', 'rule_derived');
    if (/^Բարեկենդան /.test(strip) && sundayHeading(rec, strip).sunday_heading) return done({ kind: 'sunday', commemoration_armenian: stripParens(strip), label_only: true, hymn_info_found_in_name: hymns, qualifier: quals, ...sundayHeading(rec, strip) }, 'R-NAME-BAREKENDAN-LABEL', 'The record name is the Barekendan label of the coming fast; the Sunday itself is named by the printed ordinal heading, so the label is listed after it as a label.', 'rule_derived');
    return done({ kind: 'sunday', commemoration_armenian: words(stripParens(strip)).length < 2 ? dropHymnParens(strip) : stripParens(strip), hymn_info_found_in_name: hymns, qualifier: quals, ...sundayHeading(rec, stripParens(strip)) }, 'R-NAME-SUNDAY',
      'Ordinal or named Sunday: the printed heading is the Sunday\'s name ("Երրորդ կիւրակէ մեծի պահոց"); popular names in parentheses are kept as qualifiers.', 'rule_derived');
  }
  let kind;
  if (/^Սկիզբն պահոց/.test(strip)) kind = 'other';
  else if (SAINT_START_RE.test(strip)) kind = (/(,| եւ | և |^Սրբոց)/.test(strip) ? 'saints_group' : 'saint');
  else if (DOMINICAL_RE.test(strip)) kind = 'dominical_feast';
  else kind = /(,| եւ )/.test(strip) ? 'saints_group' : 'saint';
  if (/^Սրբ/.test(strip) && /(Սրբոց|Սրբոցն)/.test(strip.slice(0, 8))) kind = 'saints_group';
  if (/^Սրբոյն [^,]*$/.test(strip) && !/ եւ /.test(strip)) kind = 'saint';
  const alt = ord === 260;
  return done({ kind, commemoration_armenian: cleaned, hymn_info_found_in_name: hymns, qualifier: quals, ...sundayHeading(rec, cleaned) }, 'R-NAME-FEAST-OR-SAINT',
    'Saint / feast heading printed after the weekday word; kept verbatim (hymn-type parentheticals removed).', alt ? 'needs_human_review' : 'rule_derived');
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Hador 2 row text -> parts
const MONTHS = /^(Յունուար|Փետրուար|Մարտ|Ապրիլ|Մայիս|Յունիս|Յուլիս|Օգոստոս|Սեպտեմբեր|Հոկտեմբեր|Նոյեմբեր|Դեկտեմբեր)\s*[:։]\s*/;
const WDABBR = /^(Կիրակի|Կիր|Բշ|Գշ|Դշ|Եշ|Ուր|Շբ)\.?\s+/;
const TONE = /^[ԱԲԳԴ][ՁԿ]\.?\s*/;
const ORDINAL = '(Առաջին|Երկրորդ|Երրորդ|Չորրորդ|Հինգերորդ|Վեցերորդ|Եօթներորդ|Ութերորդ|Իններորդ|Տասներորդ|Մետասաներորդ)'; // «Միջին» (Hador 2 counsel 5, p.104) only marks the hymn rule up to the middle Sunday of Barekendan: never a name or label (owner ruling OR-06)
const ORD_ONLY = new RegExp('^\\[?' + ORDINAL + '\\]?(\\s+(\\[?(կիւրակէ|կիրակի|Կիւրակէ|Կիրակի)\\]?|\\[(կիւրակէ|կիրակի)[^\\]]*\\]))?(\\s+(Յիսնակաց|զկնի [^,:։]+|\\[[^\\]]+\\]))?$');
const FASTLBL = /^(\[?(Պահոց|Պահք)\]?|Պահք\s+[^:։]+|Պահոց\s*\[.*|(Երկուշաբթի|Երեքշաբթի|Չորեքշաբթի|Հինգշաբթի|Ուրբաթ|Շաբաթ)\s+պահոց)$/;
const END_ETC = /(,?\s*(եւայլն|եւ այլն|եւն|ևն)\.?)\s*$/;
const FEAST_KW = /(Տօն|Տեառնընդառաջ|Զատիկ|Գալուստ|Ճրագալոյց|Վերափոխումն|Վարդավառ|Խաչվերաց|Համբարձ|Ծննդեան|Ծնունդ|Յայտնութ|Աւետեաց|յարութ|Յարութ|Գիւտ Խաչ|Սկիզբն|Ընծայման|Յղութեան|Վարագայ|Թլփատութ|Բուն բարեկենդան)/;

export function splitRowText(text) {
  const raw = String(text ?? '');
  const parts = [];
  let rest = raw.trim();
  const push = (armenian, role, extra = {}) => {
    const a = armenian.replace(/^[\s—–-]+/, '').replace(/[\s,.։:—–-]+$/, '').trim(); if (!a) return;
    const o = { armenian: a, role, ...extra };
    if (role === 'saint' || role === 'feast') { const nm = a.replace(END_ETC, '').split(/,\s*|\s+(?:եւ|և)\s+/).map((x) => x.trim()).filter(Boolean); o.names = nm; o.key = keyOf(a); }
    parts.push(o);
  };
  let m;
  if ((m = MONTHS.exec(rest))) { push(m[0].replace(/[:։]\s*$/, ''), 'other', { detail: 'month_prefix' }); rest = rest.slice(m[0].length); }
  if ((m = WDABBR.exec(rest))) { push(m[1], 'other', { detail: 'weekday_abbreviation' }); rest = rest.slice(m[0].length); }
  if ((m = TONE.exec(rest))) { push(m[0].replace(/\.?\s*$/, ''), 'other', { detail: 'tone_code' }); rest = rest.slice(m[0].length); }
  if (!rest) return parts;
  // segment separators: dash lists, colon/danda, and ". " after a lone label word
  let segs = rest.split(/\s+[—–-]\s+|\.\s+[—–-]\s+|\s*[։:]\s+/);
  const out = [];
  for (const s0 of segs) {
    let s = s0.trim().replace(/^[—–-]\s*/, ''); if (!s) continue;
    // WAVE 14: «Սկիզբն յարութեան կիւրակէից» («beginning of the Resurrection Sundays») is printed in the Hador 2 row of the first Sunday after Pentecost in all 35 tables: a series LABEL of that Sunday (never a second feast)
    const sk = /^(.+?)[\s.,։:]+((?:Սկիզբն|սկիզբն)\s+[Յյ]արութեան\s+[Կկ]ի[ւ]?րակէից)$/.exec(s);
    if (sk) { out.push(sk[1].trim()); s = sk[2]; }
    const dotsplit = /^(Պահոց|Պահք|Առաջին|Երկրորդ|Երրորդ|Չորրորդ|Հինգերորդ|Վեցերորդ|Եօթներորդ|Ութերորդ|Իններորդ|Տասներորդ|Կիրակի|Վեցերորդ կիրակի|Վեցերորդ Կիրակի)\s*[.,]\s+(.+)$/.exec(s);
    if (dotsplit) { out.push(dotsplit[1]); s = dotsplit[2]; }
    const slash = /^(Ապաշխարութեան)\s*\/\s*(Պահոց)$/.exec(s);
    if (slash) { out.push(slash[1], slash[2]); continue; }
    const ordFast = /^(.+?)[\s.,]+(պահոց|Պահք|Պահոց)$/.exec(s);
    if (ordFast && ORD_ONLY.test(ordFast[1].trim())) { out.push(ordFast[1].trim(), ordFast[2]); continue; }
    out.push(s);
  }
  for (let s of out) {
    const lead = /^(և|եւ)\s+/.exec(s); const rawSeg = s; if (lead) s = s.slice(lead[0].length);
    const extra = { raw: rawSeg }; if (lead) extra.lead_conjunction = true;
    const etc = END_ETC.test(s);
    if (/^Ապաշխարութեան$/.test(s)) push(s, 'hymn_info', { ...extra, detail: 'hymn type Հարց ապաշխարութեան (printed in the text column by the book/extractor)' });
    else if (/^(Բուն բարեկենդան|Բուն Բարեկենդան)$/.test(s)) push(s, 'feast', extra);
    else if (/^(Սկիզբն|սկիզբն)\s+[Յյ]արութեան\s+[Կկ]ի[ւ]?րակէից$/.test(s)) push(s, 'series_label', extra);
    else if (/^\[?(Բարեկենդան|բարեկենդան)/.test(s) || /Բարեկենդան (Եղիական|Ծննդեան|Վարագայ|Աստուածածնի|սուրբ|Յիսնակաց|Առաջաւոր)/.test(s) && !FEAST_KW.test(s.replace(/Բարեկենդան[^,]*/, ''))) push(s, 'barekendan_label', extra);
    else if (FASTLBL.test(s)) push(s, 'fast_label', { ...extra, ...(/^(Երկուշաբթի|Երեքշաբթի|Չորեքշաբթի|Հինգշաբթի|Ուրբաթ|Շաբաթ)/.test(s) ? { detail: 'weekday + պահոց: fast weekday' } : {}) });
    else if (ORD_ONLY.test(s)) push(s, 'sunday_ordinal', extra);
    else if (/^(Կիրակի|Կիւրակէ|Երկուշաբթի|Երեքշաբթի|Չորեքշաբթի|Հինգշաբթի)$/.test(s)) push(s, 'other', { ...extra, detail: 'weekday_word' });
    else if (/^Եօթներորդ[,.]?\s*(պահոց|Պահոց)$/.test(s)) push(s, 'sunday_ordinal', extra);
    else if (/^([Ա-Ժ]{1,2}\.\s*օր|(Վեցերորդ|Եօթներորդ|Ութերորդ)\s+օր)/.test(s)) push(s, 'feast', { ...extra, detail: 'numbered day of a feast octave/fast' });
    else if (FEAST_KW.test(s) && !/^(Սրբ|Սրբոց)/.test(s) && !etc) push(s, 'feast', extra);
    else if (/^Վերափոխումն|^Տեառնընդառաջ|^Խաչվերաց|^Վարդավառ|^Համբարձումն|^Զատիկ|^Գալուստ/.test(s)) push(s, 'feast', extra);
    else push(s, 'saint', { ...extra, ...(etc ? { etc: true } : {}) });
  }
  return parts;
}

export function analyseRowText(text) {
  const parts = splitRowText(text);
  const commemorations = parts.filter((p) => p.role === 'saint' || p.role === 'feast').map((p) => p.armenian);
  return { text, parts, commemorations, key: commemorations.map(keyOf).join(' | ') };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
export function buildTables(H1list, H2) {
  const idToOrd = new Map(H1list.map((r) => [r.id, r.ordinal]));
  const records = H1list.map((r) => classifyHador1(r, idToOrd));
  // A continuation that is the rest of its parent's saint list (page break inside the heading, e.g. rec 70+71) is joined to the parent's name.
  const byO = new Map(records.map((r) => [r.ordinal, r]));
  for (const r of records) {
    if (r.kind !== 'continuation' || r.continues_ordinal == null) continue;
    const par = byO.get(r.continues_ordinal), tail = (r.extracted_name || '').replace(/\s*\(շարունակութիւն[^)]*\)\s*$/, '').trim();
    if (par && ['saint', 'saints_group'].includes(par.kind) && tail && !/^(Կարգ|Ճաշու)/.test(tail) && !weekdayOf(tail) && tail !== (r.extracted_name || '')) {
      par.heading_tail = tail; par.joined_from = [par.ordinal, r.ordinal]; par.kind = 'saints_group';
      par.commemoration_armenian = par.commemoration_armenian + ' ' + tail; par.rule = 'R-NAME-CONTINUED-HEADING'; par.status = 'rule_derived';
      par.basis = 'The saint list of the heading is split by a page break into two records; the continuation record carries the rest of the list. Joined in the book\'s order, words verbatim.';
      r.joined_into = par.ordinal;
    }
  }
  const rows = [], seen = new Set();
  for (const t of (H2.tables || [])) for (const r of t.rows) { if (seen.has(r.text)) continue; seen.add(r.text); rows.push(analyseRowText(r.text)); }
  rows.sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
  return { records, rows };
}

const SUN_ORD = { 1: 'Առաջին', 2: 'Երկրորդ', 3: 'Երրորդ', 4: 'Չորրորդ', 5: 'Հինգերորդ', 6: 'Վեցերորդ', 7: 'Եօթներորդ' };
const NINTH_ORD = { 4: 'Չորրորդ', 5: 'Հինգերորդ', 6: 'Վեցերորդ', 7: 'Եօթներորդ', 8: 'Ութերորդ', 9: 'Իններորդ' };
const cache = new WeakMap();
function tablesFor(ctx) {
  if (ctx.names) return ctx.names;
  const k = ctx.H1;
  if (!cache.has(k)) {
    const t = buildTables(ctx.H1list || [...ctx.H1.values()], ctx.H2 || { tables: [] });
    cache.set(k, { records: new Map(t.records.map((r) => [r.ordinal, r])), rows: new Map(t.rows.map((r) => [r.text, r])) });
  }
  return cache.get(k);
}
const asMap = (x) => (x instanceof Map ? x : new Map(x));

/**
 * commemorationsFor(ctx, day) -> [{armenian, kind, role, source:{record|row}, rule, status, basis, ...}]
 * Order: main records (day.records), then overlay records (day.overlays), then Hador 2 row labels (Barekendan / fast labels).
 * A Hador 2 row yields commemorations of its own ONLY when no Hador 1 record is placed on the day (the row is then the only source; status 'interpretation').
 * Fast-weekday rule (R-NAME-FASTWEEKDAY): for a weekday-heading record the commemoration is the weekday word; if day.fast.status === 'fast' it is "<weekday> (Պահք)".
 * When day.fast is absent, a record the book marks as a fasting weekday (kind fast_weekday) uses the fast form; a plain ferial record stays bare.
 */
export function commemorationsFor(ctx, day) {
  const T = tablesFor(ctx), recs = asMap(T.records), rowsT = asMap(T.rows);
  const fastSt = day && day.fast && day.fast.status ? day.fast.status : null;
  const out = [], seenKey = new Set();
  const add = (item) => {
    // a service title under the same Holy-week day (e.g. Great Thursday 99 + 101 "Ճաշու ժամ և Սուրբ Պատարագ"): the day is named once, the further service is listed on the first item
    const same = out.find((x) => x.armenian === item.armenian && x.role === item.role && x.kind === item.kind);
    if (same && (item.rule === 'R-NAME-SERVICE-UNDER-HOLYDAY' || same.rule === 'R-NAME-SERVICE-UNDER-HOLYDAY')) { (same.further_records = same.further_records || []).push(item.source.record ?? null); if (item.service_title) (same.further_services = same.further_services || []).push(item.service_title); return; }
    const k = item.armenian + '|' + (item.source.parent_record ?? item.source.record ?? item.source.row); if (seenKey.has(k)) return; seenKey.add(k); out.push(item); };
  const fromRecord = (ord, role) => {
    let r = recs.get(ord); if (!r) return;
    let via = null;
    if (r.kind === 'continuation' && r.continues_ordinal != null && recs.get(r.continues_ordinal)) { via = ord; r = recs.get(r.continues_ordinal); }
    if (!r.commemoration_armenian) return;
    // record 260 is the heading "Nativity of the Mother of God, or the Holy Council of Nicaea" with the rubric "one of the two feasts is kept on this Saturday, according to the Taregir": when the
    // Taregir row of the day names Nicaea (record 253 is placed with it) the day is named by 253 alone.
    if (r.ordinal === 260 && (day.records || []).includes(253)) return;
    // records 31 and 32 are the two parts of ONE feast (Teaunendaraj: 31 = feast and its eve, 32 = second part): one commemoration, record 32 listed as a further record
    if (r.ordinal === 32 && (day.records || []).includes(31)) return;
    if (r.sunday_heading) add({ armenian: r.sunday_heading, kind: 'sunday', role, source: { record: r.ordinal }, rule: 'R-NAME-SUNDAY-HEADING', status: PAGE_EVIDENCE[ord] ? 'page_confirmed' : 'rule_derived',
      basis: 'The printed heading of this day begins with the ordinal Sunday ("' + r.sunday_heading + '") followed by the feast; the Sunday is listed first.' });
    if (r.label_only) { add({ armenian: r.commemoration_armenian, kind: 'barekendan_label', role: 'label', source: { record: r.ordinal }, rule: r.rule, status: r.status, basis: r.basis }); return; }
    let armenian = r.commemoration_armenian, rule = r.rule, status = r.status, basis = r.basis, note;
    if (r.rule === 'R-NAME-WEEKDAY-HEADING' && r.fast_form) {
      const wantFast = fastSt === 'fast' || (fastSt == null && r.kind === 'fast_weekday');
      if (wantFast) { armenian = r.fast_form; rule = 'R-NAME-FASTWEEKDAY'; basis = 'Fasting weekday: the book\'s heading word plus the fast marker (owner\'s form "' + r.fast_form + '"). Hymn types such as Հարց ապաշխարութեան are NOT the commemoration.'; if (fastSt == null) { status = 'interpretation'; note = 'day.fast absent; fast form chosen because the book marks this record as a fasting weekday'; } }
      else if (r.kind === 'fast_weekday' && fastSt && fastSt !== 'fast') note = 'record is a fasting-weekday record but the day is ' + fastSt + ': bare weekday shown';
    }
    // nine days of the Assumption: the three forms (records 239-241) repeat on days 4-9; the day is named by its number (book wording of rec 240/241: "Երկրորդ/Երրորդ օր Վերափոխման Սուրբ Աստուածածնի")
    if (r.ordinal >= 239 && r.ordinal <= 241 && ctx.anchor && day.date) {
      const as = ctx.anchor('assumption'), [yy, mm, dd] = day.date.split('-').map(Number), n = as == null ? null : Math.round((ctx.core.utc(yy, mm, dd) - as) / ctx.core.DAY) + 1;
      if (n >= 4 && n <= 9) { armenian = `${NINTH_ORD[n]} օր Վերափոխման Սուրբ Աստուածածնի`; rule = 'R-NAME-NINE-DAYS-NUMBER'; status = 'interpretation'; basis = 'Day ' + n + ' of the nine days of the Assumption repeats one of the three printed forms (records 239-241); the day is named by its number in the book\'s wording of records 240-241.'; }
    }
    // Sundays after the octave of the Nativity: records 9/12/15 are headed by the ordinal («Առաջին/Երկրորդ/Երրորդ Կիւրակէ զկնի ութօրէից»); records 35/43 are printed as the bare word «Կիրակէ»
    // (rec 35 page-confirmed, p.12). The ordinal of the day is counted from the first Sunday after the octave (on or after Jan 14) and worded as in records 9/12/15 (interpretation).
    if ((r.ordinal === 35 || r.ordinal === 43) && armenian === 'Կիրակէ' && day.date && ctx.anchor) {
      const j6 = ctx.anchor('jan6'), [yy, mm, dd] = day.date.split('-').map(Number), k = j6 == null ? null : Math.round((ctx.core.utc(yy, mm, dd) - j6) / ctx.core.DAY), n = k == null || k < 8 ? 0 : Math.floor((k - 8) / 7) + 1;
      if (n >= 1 && n <= 7) { note = 'book heading is the bare «Կիրակէ»; ordinal counted from the first Sunday after the octave'; armenian = `${SUN_ORD[n]} Կիւրակէ զկնի ութօրէից`; rule = 'R-NAME-SUNDAY-AFTER-OCTAVE-NUMBER'; status = 'interpretation'; basis = 'Records 9, 12, 15 head the Sundays after the octave of the Nativity by ordinal («Առաջին/Երկրորդ/Երրորդ Կիւրակէ զկնի ութօրէից»); records 35 and 43 print the bare word «Կիրակէ». The day is named by its ordinal (Sunday ' + n + ' counted from the first Sunday on or after Jan 14), worded as in records 9/12/15; the printed bare heading is kept in `book_heading`.'; }
    }
    // wave 12 (H1C-D08, record 253 small print, p.522): «Յակոբ եւ Շմաւոն առաքեալքն բաժանելով ՚ի Թովմայէն, յայլ շաբաթի օր տօնին»: where the Taregir row of the Saturday reads
    // «Թովմայի առաքելոյն» (Thomas alone; the James+Simon row follows a week later) the day is Thomas ALONE. Record 246 stays the source of the text; only the NAME splits.
    let titleSplit = null;
    if (r.ordinal === 246) { const tr = (day.hador2Rows || []).find((x) => /^Թովմայի առաքելոյն$/u.test(String(x.text).trim())); if (tr) { armenian = tr.text.trim(); rule = 'R-NAME-SPLIT-THOMAS'; status = 'rule_derived'; basis = 'Record 253 small print (p.522): James and Simon are separated from Thomas and celebrated on another Saturday; this Saturday\'s Taregir row names Thomas alone, so the day is named Thomas alone (record 246 supplies the text).'; titleSplit = 'apostle_thomas'; } }
    const item = { armenian, kind: titleSplit ? 'saint' : r.kind, role, source: { record: via ?? ord, ...(via ? { parent_record: r.ordinal } : {}) }, rule, status, basis, ...(r.ordinal === 35 || r.ordinal === 43 ? { book_heading: r.commemoration_armenian } : {}), ...(r.ordinal === 31 && (day.records || []).includes(32) ? { further_records: [32] } : {}) };
    if (titleSplit) { item.title_id = titleSplit; item.title_basis = 'record 253 small print (p.522): Thomas separated from James and Simon'; }
    if (note) item.note = note; if (r.qualifier && r.qualifier.length) item.qualifier = r.qualifier;
    if (r.service_title) item.service_title = r.service_title;
    add(item);
    if (r.label_tail) add({ armenian: r.label_tail, kind: 'barekendan_label', role: 'label', source: { record: r.ordinal }, rule: 'R-NAME-SUNDAY-BAREKENDAN', status: r.status, basis: r.basis });
  };
  // Claims may carry `commemoration_hint` {kind, armenian|null, borrowed_hymnody, basis}: the day's NAME comes from the hint (the Hador 2 row text / printed heading),
  // while the record the claim places is only the source of readings and hymns (zone-2 request; docs/notes/b03_b04_requests.md item 6).
  const hints = new Map();
  for (const c of (day.claims || [])) if (c.commemoration_hint && c.kind === 'day') for (const o of (c.records || [])) if (!hints.has(o)) hints.set(o, c);
  const fromHint = (o, role) => {
    const c = hints.get(o), h = c.commemoration_hint, st = c.status === 'needs_human_review' ? 'needs_human_review' : (c.status === 'rule' || c.status === 'structural' ? 'rule_derived' : c.status || 'interpretation');
    const src = { record: o, claim: c.rule };
    if (h.kind === 'weekday' || !h.armenian) {
      const wd = WEEKDAY_NOM[day.weekday] || '', fast = fastSt === 'fast';
      if (!wd) return fromRecord(o, role);
      add({ armenian: fast && day.weekday !== 'Sun' ? `${wd} ${FAST_MARK}` : wd, kind: fast ? 'fast_weekday' : 'ferial', role, source: src, rule: fast ? 'R-NAME-FASTWEEKDAY' : 'R-NAME-HINT-WEEKDAY', status: st, basis: h.basis, borrowed_hymnody: !!h.borrowed_hymnody });
      return;
    }
    add({ armenian: h.armenian, kind: h.kind === 'numbered_day' ? 'numbered_day' : 'sunday', role, source: src, rule: 'R-NAME-HINT', status: st, basis: h.basis, borrowed_hymnody: !!h.borrowed_hymnody });
    if (!h.borrowed_hymnody && h.kind === 'sunday_ordinal') { // the record's own name is then the Barekendan label of that Sunday (rec 231)
      const r = recs.get(o); if (r && /բարեկենդան/i.test(r.commemoration_armenian || '')) add({ armenian: r.commemoration_armenian, kind: 'barekendan_label', role: 'label', source: { record: o }, rule: 'R-NAME-HINT-BAREKENDAN', status: r.status, basis: 'The record names the Barekendan; the ordinal Sunday is given by the claim hint.' });
    }
  };
  for (const o of (day.records || [])) { if (hints.has(o)) fromHint(o, 'main'); else fromRecord(o, 'main'); }
  const haveMain = out.length > 0;
  for (const o of (day.overlays || [])) fromRecord(o, 'overlay');
  // Hador 2 rows
  const nk = (x) => keyOf(x).replace(/կիւրակէ|կիրակի/g, 'կիր').replace(/(.)\1/g, '$1');
  const hasLabel = (text) => out.some((x) => x.role === 'label' && (nk(x.armenian).includes(nk(text)) || nk(text).includes(nk(x.armenian))));
  const sundayHas = (text) => out.some((x) => x.kind === 'sunday' && x.role !== 'label' && nk(x.armenian).includes(nk(text).split(' ')[0]));
  for (const row of (day.hador2Rows || [])) {
    const a = rowsT.get(row.text) || analyseRowText(row.text);
    for (const p of a.parts) {
      // labels printed in the row are kept as secondary parts even when a Hador 1 record is placed (the record may not carry them)
      if ((p.role === 'barekendan_label' || p.role === 'fast_label' || p.role === 'sunday_ordinal' || p.role === 'series_label') && !hasLabel(p.armenian) && !(p.role === 'sunday_ordinal' && sundayHas(p.armenian))) {
        add({ armenian: p.role === 'series_label' ? p.armenian.charAt(0).toUpperCase() + p.armenian.slice(1) : p.armenian, kind: p.role, role: 'label', source: { row: row.id, text: row.text }, rule: 'R-NAME-H2-LABEL', status: 'rule_derived', basis: 'Label printed in the Hador 2 row (season/fast marker or ordinal of a Sunday); not a commemoration by itself.' });
      } else if ((p.role === 'saint' || p.role === 'feast') && !haveMain) {
        add({ armenian: p.armenian, kind: p.role === 'saint' ? 'saint' : 'dominical_feast', role: 'main', source: { row: row.id, text: row.text }, rule: 'R-NAME-H2-ROW', status: 'interpretation', basis: 'No Hador 1 record is placed on this day; the Hador 2 row text (abbreviated list) is the only source. Words are the book\'s, unexpanded.', ...(p.etc ? { abbreviated: true } : {}),
          ...(row.m === 9 && /^(Յակոբայ եւ Շմաւոնի առաքելոցն|Առաքելոցն Յակոբայ եւ Շմաւոնի)$/u.test(String(row.text).trim()) ? { title_id: 'apostles_james_and_simon', title_basis: 'record 253 small print (p.522): James and Simon celebrated on the later Saturday, separated from Thomas' } : {}) });
      }
    }
  }
  // label claims of the blocks (day.labels): only those that name something in the book's words (Barekendan of a fast, ordinal of a Sunday, eve service).
  // Labels that mean "no readings", plates, collisions or rubrics about Sunday readings are not names and are not rendered.
  for (const c of (day.labels || [])) {
    if (c.noReadings || /PLATE|COLLISION|OCTAVE-ON-SUNDAY|JAN6-ON-SUNDAY/.test(c.rule || '')) continue;
    if (c.commemoration_hint && c.commemoration_hint.armenian && c.kind === 'label') { // a label claim that names the day's ordinal Sunday (R-B04-ASSUMPTION-SUNDAY-2): a name, listed with the main names
      const h = c.commemoration_hint;
      add({ armenian: h.armenian, kind: 'sunday', role: 'main', source: { claim: c.rule, records: c.records || [] }, rule: 'R-NAME-HINT', status: c.status === 'needs_human_review' ? 'needs_human_review' : (c.status === 'interpretation' ? 'interpretation' : 'rule_derived'), basis: h.basis });
      continue;
    }
    // WAVE 9: a label claim may carry a complete label spec `commemoration_label` {armenian, kind, title_id?, title_basis?, dedupe_title_ids?, dedupe_words?}: remembrances (Elijah, of the Dead),
    // the New Year, eve-of-fast labels. The label is additional (never a main commemoration, takes no readings) and is skipped when the day already shows the same label.
    if (c.commemoration_label) {
      const L = c.commemoration_label, low = (s) => String(s || '').toLowerCase();
      const dup = out.some((x) => (L.title_id && x.title_id === L.title_id) || (x.role !== 'overlay' && (L.dedupe_words || []).length && /բարեկենդան/i.test(x.armenian) && L.dedupe_words.some((w) => low(x.armenian).includes(w))));
      if (!dup) add({ armenian: L.armenian, kind: L.kind || 'remembrance_label', role: 'label', source: { claim: c.rule, records: c.records || [], rows: c.rows || [] }, rule: c.rule, status: c.status === 'needs_human_review' ? 'needs_human_review' : c.status,
        basis: c.basis, no_readings: true, ...(L.title_id ? { title_id: L.title_id, title_basis: L.title_basis || c.basis } : {}), ...(L.owner_decision ? { owner_decision: L.owner_decision } : {}) });
      continue;
    }
    const q = (c.source && c.source.quote) || '';
    const rule = 'R-NAME-LABEL-CLAIM';
    let lab = null;
    const bk = /([Բբ]արեկենդան [^;։:.,()\[\]]+)/.exec(q);
    if (c.label_text) lab = { armenian: c.label_text, kind: 'barekendan_label' };
    else if (bk) lab = { armenian: bk[1].trim(), kind: 'barekendan_label' };
    else if (new RegExp('^' + ORDINAL + '\\s+(Կիւրակէ|Կիրակի|կիւրակէ|կիրակի)(\\s+Յիսնակաց)?$').test(q.trim())) lab = { armenian: q.trim(), kind: 'sunday_ordinal' };
    else if (/-EVE-/.test(c.rule || '')) { const rr = (c.records || []).map((o) => recs.get(o)).find((r) => r && r.commemoration_armenian); lab = { armenian: 'Նախատօնակ', kind: 'eve_label', ...(rr ? { of: rr.commemoration_armenian } : {}) }; }
    if (!lab || hasLabel(lab.armenian) || (lab.kind === 'sunday_ordinal' && sundayHas(lab.armenian))) continue;
    add({ ...lab, role: 'label', source: { claim: c.rule, records: c.records || [], rows: c.rows || [] }, rule, status: c.status === 'needs_human_review' ? 'needs_human_review' : 'rule_derived', basis: 'Label of a block claim ' + c.rule + ', worded as the book words it (quote in the claim).' });
  }
  // WAVE 9 (collisions, docs/notes/collisions_labels.md): when a fixed feast takes the day, the Sunday (of a fast) or the bare weekday / numbered season day that the day's own record carries is the
  // feast's SECONDARY label, not a second main commemoration (claim R-FIX-SECONDARY-LABELS from fixed.mjs). The record stays on the day (readings are unchanged); only the naming changes.
  { const sc = (day.claims || []).find((c) => c.secondary_labels);
    if (sc && out.some((x) => x.role === 'main' && !x.demoted_by && x.kind === 'dominical_feast')) {
      const P = sc.secondary_labels;
      for (const it of out) {
        if (it.role !== 'main') continue;
        const bare = ['ferial', 'fast_weekday', 'numbered_day'].includes(it.kind) || (it.kind === 'feast_weekday' && !/^Աւագ/.test(it.armenian) && it.rule !== 'R-NAME-WEEKDAY-OCCASION');
        if ((it.kind === 'sunday' && P.sundays) || (bare && P.weekdays)) { it.role = 'label'; it.demoted_by = sc.rule; it.secondary_to_records = P.feast_records; }
      }
    } }
  const RANK = { main: 0, overlay: 1, label: 2 }; out.sort((x, y) => (RANK[x.role] ?? 3) - (RANK[y.role] ?? 3));
  // nothing commemorative at all: the weekday itself (plain/fasting weekday) from the day's weekday
  if (!out.some((x) => x.role === 'main')) {
    const wd = WEEKDAY_NOM[day.weekday];
    if (wd) {
      const fast = fastSt === 'fast';
      out.unshift({ armenian: fast ? `${wd} ${FAST_MARK}` : wd, kind: fast ? 'fast_weekday' : 'ferial', role: 'main', source: { row: (day.hador2Rows || [])[0]?.id ?? null }, rule: fast ? 'R-NAME-FASTWEEKDAY' : 'R-NAME-WEEKDAY-ONLY',
        status: 'interpretation', basis: 'The day has no named observance in the placed records/rows; the book heads such days with the weekday word' + (fast ? ' and the day is a fast day.' : '.') });
    }
  }
  return TITLES ? TITLES.annotate(ctx, day, out) : out;
}

// Plain-English rule catalogue (written into rulebook/commemoration_names.json). Page numbers are pdf pages (printed page = pdf + 448).
export const NAME_RULES = [
  { id: 'R-NAME-HEADING', pages: [6, 12, 15, 16, 22, 33, 34, 64, 68, 73], status: 'rule',
    plain: 'Each Hador 1 day is printed as: HEADING. then "ահ." (Օրհնութիւն) + tone + incipit, then "Հարց" + tone + incipit, then Մեծ./Մկք./Համբ., then Ճաշու սաղ., then the readings (Առաք./Ալէ./Աւետ.). The HEADING is the commemoration. Nothing after "ահ." or "Հարց" is part of it.' },
  { id: 'R-NAME-WEEKDAY-HEADING', pages: [12, 15, 16, 22, 33, 64, 68, 73], status: 'rule',
    plain: 'An ordinary weekday (no saint, no feast) is headed by the weekday word alone ("Չորեքշաբաթ.", "Ուրբաթ."), also in Great Lent, Eastertide and the fasts. Words such as (Պահք), պահոց, Մեծի Պահոց, (Հինանց), Զատկի, զկնի ..., and the hymn types Հարց ապաշխարութեան / Հարց հանգստեան that the extractor added to the name are not part of the heading. Hymn types are removed to hymn_info_found_in_name; the others go to `qualifier`.' },
  { id: 'R-NAME-FASTWEEKDAY', pages: [12, 68, 73], status: 'owner_ruling',
    plain: 'A weekday that is a fast day is shown as "<weekday> (Պահք)" (owner\'s form, e.g. "Չորեքշաբաթ (Պահք)"). The marker is added when the engine says the day is fast; "Հարց ապաշխարութեան" / "Հարց հանգստեան" (the hymn the book assigns to the Wednesday / Friday) is never used as the name. If no fast verdict exists, the records the book marks as fasting weekdays use the fast form (status interpretation).' },
  { id: 'R-NAME-SAINT', pages: [12, 16, 73], status: 'rule', plain: 'A saint or feast after the weekday word is the commemoration, printed verbatim (e.g. "Հինգշաբաթ. Սրբոյն Երեմիայի մարգարէին. ահ. ..."). The weekday word is not repeated in the name.' },
  { id: 'R-NAME-CANON-STRIP', pages: [34, 68, 71], status: 'rule', plain: '"Կանոն" (canon) at the head of a section is the name of the hymn set, not the commemoration. The commemoration is the feast named in the section title, or (when a full feast phrase stands in parentheses / on the first printed line, e.g. "Սուրբ Աստուածածնի Վերափոխման Կիւրակէ", "Տօն է Շողակաթին սրբոյ Էջմիածնի ...") that phrase.' },
  { id: 'R-NAME-NUMBERED-DAY', pages: [6, 15, 16, 64], status: 'interpretation', plain: 'Numbered days ("Երկրորդ աւուր", "Գ. օր Մեծի Պահոց") are kept as the extractor/series label; in Great Lent the printed heading is only the weekday word, so the day number is a label added for sequence (owner to decide whether to show the weekday form or the day number).' },
  { id: 'R-NAME-SUNDAY', pages: [15, 16], status: 'rule', plain: 'An ordinal Sunday is headed by its name ("Երկրորդ կիւրակէ մեծի պահոց"). Popular names in parentheses ("Արտաքսման", "Անառակին") are qualifiers.' },
  { id: 'R-NAME-CONTINUATION', pages: [], status: 'interpretation', plain: 'A continuation record belongs to the same day as its parent; it contributes no commemoration of its own. Rite titles ("Կարգ ...") are services, not commemorations.' },
  { id: 'R-NAME-PLATE', pages: [70], status: 'rule', plain: 'Illustrated plates have no heading; no commemoration.' },
  { id: 'R-NAME-RUBRIC-ONLY', pages: [], status: 'rule', plain: 'Prefatory/closing rubric records are not days.' },
  { id: 'R-NAME-H2-LABEL', pages: [110], status: 'interpretation', plain: 'Hador 2 row text = (weekday abbreviation) (tone code) COMMEMORATION[։ LABEL]. Segments are separated by ։ : or a dash (— = "and also"). Labels: Բարեկենդան ... (season start), Պահք/Պահոց (fast), ordinal of a Sunday. "եւայլն/եւն" marks an abbreviated list whose full text is in Hador 1. Words are never expanded or translated.' },
];
