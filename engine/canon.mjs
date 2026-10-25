// The day's whole Sharagnots canon, part by part (Orhnutyun ... Hampartsi), assembled from the canon(s) the day uses.
//
// Evidence for where a part starts inside a canon, strongest first: the category printed in the book (Հարց, Մեծացուսցէ, ...), the same margin
// abbreviation kept by the Unicode document, and the part the Tonatsoyts assigns to a hymn it names (marks gathered over four years of days).
// A hymn with no label continues the part above it. Where the day's own canon lacks a part, the book's generic by-mode / by-weekday / by-season
// sections are chosen by rule (mode, weekday, Lenten week, Eastertide, fast day) and labelled as rule-based; anything else is an explicit gap.
import { armKey, normMode } from './hymns.mjs';

export const PART_ORDER = ['orhnutyun', 'harts', 'metsatsutse', 'voghormya', 'der_hergnits', 'mankunk', 'jashoo', 'hampartsi'];
export const PART_LABEL = { orhnutyun: 'Orhnutyun', harts: 'Harts (with its Gordzk)', metsatsutse: 'Metsatsutse', voghormya: 'Voghormya', der_hergnits: 'Der Hergnits', mankunk: 'Mankunk', jashoo: 'Jashoo', hampartsi: 'Hampartsi' };
export const PART_HY = { orhnutyun: 'Օրհնութիւն', harts: 'Հարց', metsatsutse: 'Մեծացուսցէ', voghormya: 'Ողորմեա', der_hergnits: 'Տէր յերկնից', mankunk: 'Մանկունք', jashoo: 'Ճաշու', hampartsi: 'Համբարձի' };
const ORD = Object.fromEntries(PART_ORDER.map((p, i) => [p, i]));

// where each part is sung (W11_SERVICE_MAP: Zhamagirk order of services; ZH = line of the Zhamagirk text layer, ST = sacredtradition.am page,
// LS323 = Findikyan's course text, page 39-40 'Šarakan Genres': Orhnutyun = Night office, Harts / Gordzk / Metsatsutse / Voghormya / Der Hergnits / Mankunk = Morning,
// Chashu = Divine Liturgy, Hampartsi = Evening; the office of every genre is therefore confirmed, only a slot within the office comes from the Zhamagirk)
export const PART_SERVICE = {
  orhnutyun: { service: 'night', label: 'Night service', slot: "after «Օրհնեսցուք զՏէր»", evidence: ['ZH:2616', 'LS323:39'], confidence: 'high' },
  harts: { service: 'morning', label: 'Morning service', slot: 'after the Song of the Three Children', evidence: ['ZH:4252'], confidence: 'high' },
  metsatsutse: { service: 'morning', label: 'Morning service', slot: 'after the songs of Mary, Zachariah and Simeon', evidence: ['ZH:4486'], confidence: 'high' },
  voghormya: { service: 'morning', label: 'Morning service', slot: 'after Psalm 50', evidence: ['ZH:4861'], confidence: 'high' },
  der_hergnits: { service: 'morning', label: 'Morning service', slot: 'after the Alleluia and praise psalms', evidence: ['ZH:5024'], confidence: 'high' },
  mankunk: { service: 'morning', label: 'Morning service', slot: 'after the psalm «Օրհնեցէք, մանկունք, զՏէր»; non-dominical days only', evidence: ['ZH:5891'], confidence: 'high' },
  jashoo: { service: 'divine_liturgy', label: 'Divine Liturgy', slot: 'after the entrance psalm «Ճաշու փոխ», before the Trisagion', evidence: ['ST:20260906_dl.html', 'ZH:8443'], confidence: 'high' },
  hampartsi: { service: 'evening', label: 'Evening service', slot: 'Psalm 140 block «Համբարձումն ձեռաց»', evidence: ['ZH:10298-10320', 'LS323:40'], confidence: 'high', unconfirmed: 'exact slot within the evening service' },
};

const TYPE_PART = [['օրհնութ', ['orhnutyun']], ['մանկունքեւհամբարձի', ['mankunk', 'hampartsi']], ['հարց', ['harts']], ['գործք', ['harts']], ['մեծացուսցէ', ['metsatsutse']], ['ողորմեա', ['voghormya']], ['տէրյերկնից', ['der_hergnits']],
  ['տէրերկնից', ['der_hergnits']], ['մանկունք', ['mankunk']], ['ճաշու', ['jashoo']], ['համբարձի', ['hampartsi']]].map(([a, b]) => [armKey(a), b]);
export const partsOfType = (t) => { const k = armKey(t); for (const [a, b] of TYPE_PART) if (k.includes(a)) return b; return []; };

// ---------- part boundaries inside each canon ----------
// canonParts: data/calendar/canon_parts.json; marks: data/calendar/canon_marks.json { canonId: { hymnId: { part, n, also? } } }
export function refineCanonParts(canonParts, marks) {
  const out = {};
  let rubricAnchors = 0, uniAnchors = 0, conflicts = 0;
  for (const [cid, k] of Object.entries((canonParts && canonParts.canons) || {})) {
    let cur = null, curOrd = -1;
    // a part the book labels itself keeps the book's start: rubric marks (weaker evidence) only fill parts the book does not label in this canon
    const labelled = new Set((k.hymns || []).filter((h) => h.part_basis === 'printed category' || h.uni_part).map((h) => h.part_basis === 'printed category' ? h.part : h.uni_part));
    const hymns = (k.hymns || []).map((h) => {
      const printed = h.part_basis === 'printed category' ? h.part : null;
      const mk = marks && marks[cid] && marks[cid][h.id];
      let anchor = null, basis = null, strength = 0;
      if (printed) { anchor = printed; basis = 'printed category'; strength = 2; }
      else if (h.uni_part) { anchor = h.uni_part; basis = 'margin label kept by the Unicode document'; strength = 2; uniAnchors++; }
      else if (mk && mk.part && !labelled.has(mk.part)) { anchor = mk.part; basis = 'the Tonatsoyts assigns this hymn to this part'; strength = 1; }
      let part;
      if (anchor) {
        const o = ORD[anchor];
        if (anchor === 'other') { part = 'other'; cur = 'other'; }
        else if (o >= curOrd || cur === 'other' || cur === null) { part = anchor; cur = anchor; curOrd = o; if (strength === 1) rubricAnchors++; }
        else if (strength === 2) { part = anchor; cur = anchor; curOrd = o; conflicts++; basis += ' (the canon restarts the order here)'; }
        else { part = cur; basis = 'continues the part above (a rubric mark out of order was ignored)'; conflicts++; }
      } else if (cur) { part = cur; basis = 'continues the part above'; }
      else { part = 'orhnutyun'; cur = part; curOrd = 0; basis = 'inferred: the first hymn of a canon is its Orhnutyun'; }
      const r = { ...h, part, part_basis: basis };
      if (h.uni_gordzk || h.subpart === 'gordzk') r.subpart = 'gordzk';
      if (mk && mk.also && mk.also.length) r.also = [...new Set([...(h.also || []), ...mk.also])].filter((x) => x !== part);
      return r;
    });
    out[cid] = { ...k, hymns };
  }
  return { canons: out, stats: { rubricAnchors, uniAnchors, conflicts } };
}

// ---------- generic sections chosen by rule ----------
const WEEKDAY_WORDS = [['երկուշաբ', 'Mon'], ['երեքշաբ', 'Tue'], ['չորեքշաբ', 'Wed'], ['հինգշաբ', 'Thu'], ['ուրբաթ', 'Fri'], ['շաբաթւ', 'Sat']].map(([a, b]) => [armKey(a), b]);
const ORDINALS = [['առաջին', 1], ['երկրորդ', 2], ['երրորդ', 3], ['չորրորդ', 4], ['հինգերորդ', 5], ['վեցերորդ', 6]].map(([a, b]) => [armKey(a), b]);
const KIND_STEMS = [['հանգստեան', 'հանգստեան'], ['մարտիրոս', 'մարտիրոս'], ['ապաշխար', 'ապաշխար'], ['աստուածածն', 'աստուածածն'], ['խաչ', 'խաչ'], ['առաքելոց', 'առաքել'], ['հայրապետ', 'հայրապետ'], ['մարգարէ', 'մարգարէ'], ['նախահարց', 'նախահարց']].map(([a, b]) => [armKey(a), armKey(b)]);
export const kindStemOf = (s) => { const k = armKey(s); for (const [a, b] of KIND_STEMS) if (k.includes(a)) return b; return null; };

function seasonOf(ctx) {
  const o = ctx.easterOffset;
  const lentWeek = o != null && o >= -48 && o <= -1 ? Math.floor((o + 48) / 7) + 1 : null;
  return { lent: o != null && o >= -48 && o <= -1, lentWeek, eastertide: o != null && o >= 0 && o <= 49, fast: ctx.fastStatus === 'fast' };
}

function titleFacts(title) {
  const k = armKey(title);
  const ord = /շաբաթ/.test(String(title).toLowerCase().replace(/\s+/g, '')) || k.includes(armKey('շաբաթու')) ? ORDINALS.find(([a]) => k.includes(a)) : null;
  // «առաջին շաբաթու աղուհացիցն» = "of the first WEEK": «շաբաթու» there is the week, not the Saturday
  const weekWord = !!ord && (k.includes(armKey('ապաշխար')) || k.includes(armKey('աղուհաց')));
  const wd = WEEKDAY_WORDS.find(([a, d]) => k.includes(a) && !(weekWord && d === 'Sat'));
  return { weekday: wd ? wd[1] : null, lentOrdinal: ord && k.includes(armKey('ապաշխար')) ? ord[1] : null, lent: k.includes(armKey('ապաշխար')) || k.includes(armKey('աղուհաց')) || k.includes(armKey('պահոց')),
    eastertide: k.includes(armKey('յինանց')) || k.includes(armKey('յարութեան')) };
}

// canons: refined canons map. Returns the best generic canon for (part, modes) on this day, or the ranked list.
export function genericFor(canons, part, modes, ctx, kindStem) {
  const season = seasonOf(ctx), cands = [];
  for (const [cid, k] of Object.entries(canons)) {
    const generic = !!k.family || ['generic_by_mode', 'generic_by_weekday'].includes(k.kind) || (kindStem && armKey(k.family_title || k.title).includes(kindStem)) || (k.kind === 'other' && /ճաշու/.test(String(k.title).toLowerCase().replace(/\s+/g, '')));
    if (!generic) continue;
    const f = titleFacts(k.title);
    // a section keyed by weekday (Օրհնութիւն Երեքշաբաթի աւուրն) or by Lenten week is chosen by that key; its hymns' mode is its own, not the day's mode
    // «Հարց ապաշխարութեան»: the book prints the Harts of penitence in one section per Lenten week, each in ONE mode (week 1 first mode, week 2 first side ...),
    // so when the rubric names the category the mode selects the section, in or out of Lent
    const kindLent = !!(kindStem && f.lentOrdinal);
    const keyed = !!(f.weekday || f.lentOrdinal) && !kindLent;
    const hs = (k.hymns || []).filter((h) => (h.part === part || (h.also || []).includes(part)) && (keyed || modes.has(normMode(h.mode))));
    if (!hs.length) continue;
    let score = 1, why = ['mode agrees'], bad = false;
    if (kindStem) { if (armKey(k.family_title || k.title).includes(kindStem)) { score += 3; why.push('section is of the kind the rubric names'); } else bad = true; }
    if (f.weekday) { if (f.weekday === ctx.weekday) { score += 3; why.push('weekday agrees'); } else bad = true; }
    if (f.lentOrdinal) { if (kindLent) { score += 0; why.push(`penitence Harts of Lenten week ${f.lentOrdinal}, chosen by the mode`); } else if (season.lentWeek === f.lentOrdinal) { score += 3; why.push(`Lenten week ${f.lentOrdinal}`); } else bad = true; }
    else if (f.lent) { if (season.lent || season.fast) { score += 2; why.push('Lent / fast day'); } }
    if (f.eastertide && !f.lent) { if (season.eastertide) { score += 2; why.push('Eastertide'); } else if (ctx.weekday === 'Sun' && armKey(k.title).includes(armKey('յարութեան'))) { score += 2; why.push('Sunday: Resurrection sharagan by mode'); } }
    if (!bad) cands.push({ cid, k, hs, score, why });
  }
  cands.sort((a, b) => b.score - a.score || b.hs.length - a.hs.length);
  return cands;
}

// ---------- the day ----------
// hr: resolver result. ctx: { weekday, modeArmenian, easterOffset, fastStatus, commemorationKinds }
export function assembleCanon(refined, hr, ctx = {}) {
  const labelOf0 = (part) => PART_LABEL[part].replace(/ \(.*\)/, '');
  const canons = refined.canons || {};
  const named = new Map();
  for (const h of hr.hymns) if (h.resolved) named.set(h.resolved.hymnId, h);
  const ranked = (hr.secStats || []).filter((x) => canons[x.section]).sort((a, b) => (b.title * 2 + b.cover) - (a.title * 2 + a.cover));
  const kindOk = (id) => ['full_canon', 'partial'].includes(canons[id].kind);
  const genericOk = (id) => ['generic_by_weekday', 'generic_by_mode'].includes(canons[id].kind);
  const primary = ranked.find((x) => kindOk(x.section)) || ranked.find((x) => genericOk(x.section)) || null;
  const primaryGeneric = !!(primary && !kindOk(primary.section));
  const dayMode = normMode(ctx.modeArmenian);
  const wantModes = new Set([dayMode, ...hr.hymns.filter((h) => h.resolved && primary && h.resolved.sectionId === primary.section).map((h) => normMode(h.resolved.mode))].filter(Boolean));
  const hasLiturgy = ctx.weekday === 'Sun' || ctx.fastStatus === 'feast';
  const dayCanons = ranked.map((x) => ({ canonId: x.section, title: canons[x.section].title, startPage: (canons[x.section].pages || [])[0] || null, kind: canons[x.section].kind, role: primary && x.section === primary.section ? 'primary' : 'also',
    basis: `holds ${x.cover} of the openings the Tonatsoyts names for this day${x.title >= 0.3 ? ', and the feast name is in its title' : ''}` }));
  const hymnView = (h, canonId, extra = {}) => ({ hymnId: h.id, canonId, sectionId: h.block, incipit: h.incipit, mode: h.mode || null, page: h.page, pagesAll: h.pages || [h.page], stanzaIds: h.stanza_ids || [],
    heading: h.heading || null, printedCategory: h.cat_printed || null, subpart: h.subpart || null, partBasis: h.part_basis, namedByRubric: named.has(h.id), cues: h.cues || null, ode: h.ode || null, odeSet: h.ode_set || null, ...extra });
  const rubricView = (h) => ({ hymnId: h.resolved.hymnId, canonId: h.resolved.sectionId, sectionId: h.resolved.sectionId, incipit: h.resolved.incipit, mode: h.resolved.mode, page: h.resolved.page, pagesAll: h.resolved.pagesAll, stanzaIds: ((canons[h.resolved.sectionId] || {}).hymns || []).find((x) => x.id === h.resolved.hymnId)?.stanza_ids || [],
    heading: null, printedCategory: null, subpart: null, partBasis: 'named by the Tonatsoyts rubric', namedByRubric: true, basis: h.basis, confidence: h.confidence });
  // Y2: a day whose Orhnutyun is taken from the generic sets of pp.210-226 (the Easter order and the generic Orhnutyun hold the eight tones' sets one after the
  // other) gets exactly ONE set, the day's tone: an Orhnutyun is nine odes plus the last, not eight tones' worth (Findikyan, Armenian Hymnography p.4, 22-25)
  const restrictToDaySet = (entry) => {
    if (entry.part !== 'orhnutyun' || !entry.hymns.some((x) => x.odeSet) || !dayMode) return;
    const setHymns = [];
    for (const cid of refined.order || Object.keys(canons)) for (const h of (canons[cid] || {}).hymns || []) if (h.part === 'orhnutyun' && h.ode_set && normMode(h.ode_set.tone) === dayMode) setHymns.push([cid, h]);
    if (!setHymns.length) return;
    entry.hymns = setHymns.map(([cid, h]) => hymnView(h, cid, { basis: `the Orhnutyun of the day's tone: set ${h.ode_set.set} of the eight sets of pp.210-226`, confidence: 0.6 }));
    entry.from = [...new Map(setHymns.map(([cid]) => [cid, fromOf(cid)])).values()];
    entry.needsReview = true;
    if (!/eight tones in turn/.test(entry.note || '')) entry.note = (entry.note ? entry.note + ' ' : '') + `The book prints the Orhnutyun for each of the eight tones in turn (pp.210-226); this day's tone is ${dayMode}.`;
  };
  const fromOf = (id) => ({ canonId: id, title: (canons[id] || {}).title || null, startPage: ((canons[id] || {}).pages || [])[0] || null });
  // type-only cues (no opening printed): «Հարց հանգստեան», «Մարտիրոսաց» ... name a KIND of canon
  const kindCues = hr.hymns.filter((h) => !h.resolved && partsOfType(h.type).length);

  const parts = [];
  let lastCanon = null;   // section that supplied the previous part (a generic section also carries the parts that follow)
  for (const part of PART_ORDER) {
    const svc = PART_SERVICE[part];
    const entry = { part, label: PART_LABEL[part], labelHy: PART_HY[part], status: 'missing', source: 'none', complete: false, hymns: [], from: [], note: '', candidates: [], needsReview: true,
      service: { ...svc, dayHasService: part === 'jashoo' ? hasLiturgy : part === 'mankunk' ? !hasLiturgy : null } };
    const take = (cid, modes, strict) => {
      let hs = (canons[cid].hymns || []).filter((h) => h.part === part || (h.also || []).includes(part));
      if (modes) { const m = hs.filter((h) => modes.has(normMode(h.mode))); if (m.length || strict) hs = m; }
      // Y2: the Easter order and the generic Orhnutyun hold the eight tones' sets one after the other (pp.210-226): one Orhnutyun = ONE set, the day's tone
      if (part === 'orhnutyun' && hs.some((h) => h.ode_set)) {
        const want = new Set([dayMode, ...(modes || [])].filter(Boolean));
        const m = hs.filter((h) => h.ode_set && want.has(normMode(h.ode_set.tone)));
        if (m.length) hs = m;
      }
      return hs;
    };
    let src = null;
    if (primary) { const hs = take(primary.section, primaryGeneric ? wantModes : null); if (hs.length) src = { cid: primary.section, hs, basis: 'the day\'s canon', conf: primaryGeneric ? 0.55 : 0.85, review: primaryGeneric }; }
    if (!src) for (const x of ranked) { if (primary && x.section === primary.section) continue; if (!(x.cover >= 2 || x.title >= 0.3)) continue; const hs = take(x.section, wantModes); if (hs.length) { src = { cid: x.section, hs, basis: 'another canon the day uses', conf: 0.6, review: true }; break; } }
    if (!src && lastCanon && lastCanon.generic) { const hs = take(lastCanon.cid, wantModes.size ? new Set([...wantModes, dayMode].filter(Boolean)) : null); if (hs.length) src = { cid: lastCanon.cid, hs, basis: 'the same generic section that supplies the preceding part', conf: 0.45, review: true }; }
    // hymns shared with another part (e.g. one sharagan sung as Mankunk and Hampartsi)
    if (!src) { for (const [cid] of ranked.map((x) => [x.section])) { const hs = (canons[cid].hymns || []).filter((h) => (h.also || []).includes(part)); if (hs.length) { src = { cid, hs, basis: 'the same sharagan serves this part too (the Tonatsoyts lists it under both)', conf: 0.7, review: true }; break; } } }
    if (src) {
      entry.status = 'present'; entry.source = 'canon'; entry.complete = true; entry.needsReview = src.review || !primary || src.cid !== primary.section;
      entry.hymns = src.hs.map((h) => hymnView(h, src.cid, { basis: src.basis, confidence: src.conf }));
      entry.from = [fromOf(src.cid)]; if (!lastCanon || !lastCanon.generic) lastCanon = { cid: src.cid, generic: genericOk(src.cid) };
    } else {
      const items = []; const seen = new Set();
      for (const h of hr.hymns) if (h.resolved && partsOfType(h.type).includes(part) && !seen.has(h.resolved.hymnId)) { seen.add(h.resolved.hymnId); items.push(h); }
      if (items.length) {
        const single = ['mankunk', 'jashoo', 'hampartsi'].includes(part);   // a one-sharagan part: the opening the rubric names IS the part
        entry.status = 'from_rubric'; entry.source = 'rubric'; entry.complete = single; entry.needsReview = !single || items.some((h) => h.status !== 'linked_exact');
        entry.note = single ? 'The Tonatsoyts names the sharagan for this part; the canon prints no separate section for it.' : 'Only the opening(s) the Tonatsoyts names are located; the rest of this part is not yet assembled from the book.';
        entry.hymns = items.map(rubricView); entry.from = [...new Set(items.map((h) => h.resolved.sectionId))].map(fromOf);
      } else {
        // generic section by rule: by the kind the rubric names, else by mode / weekday / season
        const cue = kindCues.find((h) => partsOfType(h.type).includes(part));
        const modes = new Set([normMode(cue && cue.mode), dayMode, ...wantModes].filter(Boolean));
        const ks = cue ? kindStemOf((cue.incipit || '') + ' ' + (cue.type || '')) : null;
        // a category named by the rubric («Հարց մարտիրոսաց») is looked up in the day's OWN mode first: the modes of hymns the day's primary canon happens to hold
        // (wantModes) would otherwise pull in generic canons of other modes and make the choice a tie
        const ownMode = normMode(cue && cue.mode) || dayMode;
        let cands = ks && ownMode ? genericFor(canons, part, new Set([ownMode]), ctx, ks) : [];
        if (!cands.length) cands = genericFor(canons, part, modes, ctx, ks);
        // a category the rubric names (martyrs, repose, penitence ...) is never replaced by the weekday's or the season's own canon: that is a different canon.
        // If the book's generic canon of that category has nothing in this mode the part stays unlocated, and the weekday canon is only offered as a candidate for review.
        let weekdayAlt = [];
        if (!cands.length && ks) { weekdayAlt = genericFor(canons, part, modes, ctx, null); entry.kindUnlocated = ks; }
        else if (!cands.length) cands = genericFor(canons, part, modes, ctx, null);
        const top = cands[0], second = cands.slice(1).find((c) => !(top && c.k.family && c.k.family === top.k.family));   // sections of one series are alternatives of the same rule, not competing candidates
        if (top && top.score >= 3 && (!second || top.score - second.score >= 1)) {
          const exact = top.hs.filter((h) => normMode(h.mode) === (normMode(cue && cue.mode) || dayMode));
          const hs = exact.length ? exact : top.hs;
          entry.status = 'present'; entry.source = ks ? 'generic_kind' : 'generic_rule'; entry.complete = true; entry.needsReview = true;
          entry.note = `The day has no canon of its own for this part; the book's generic section «${String(top.k.title).replace(/\s+/g, ' ').trim()}» was chosen by rule (${top.why.join(', ')}).`;
          entry.hymns = hs.map((h) => hymnView(h, top.cid, { basis: 'generic section chosen by rule: ' + top.why.join(', '), confidence: Math.min(0.6, 0.3 + 0.05 * top.score) }));
          entry.from = [fromOf(top.cid)]; lastCanon = { cid: top.cid, generic: true };
        } else {
          entry.note = 'This part could not be located for this day: to be confirmed.';
          const alt = cands.length ? cands : weekdayAlt;
          entry.candidates = alt.slice(0, 3).map((c) => ({ canonId: c.cid, title: c.k.title, startPage: (c.k.pages || [])[0] || null, page: c.hs[0].page, hymnId: c.hs[0].id, score: c.score, why: c.why }));
          if (entry.kindUnlocated) entry.note = `The rubric names the category «${entry.kindUnlocated}» but the book's generic canon of that category has no ${labelOf0(part)} for this mode in our index; the weekday's own canon is shown only as a candidate. To be confirmed.`;
        }
      }
    }
    if (part === 'mankunk' && hasLiturgy) {
      // dominical day: Mankunk is not sung (a procession and Gospel come at this point)
      entry.suppressed = !!entry.hymns.length; entry.needsReview = false;
      if (!entry.hymns.length) { entry.status = 'not_applicable'; entry.note = ''; entry.candidates = []; }
      entry.note = (entry.note ? entry.note + ' ' : '') + 'Mankunk is sung on non-dominical days; this day has the Liturgy (a Sunday or feast).';
    }
    if (part === 'jashoo' && !hasLiturgy && entry.hymns.length) entry.note = (entry.note ? entry.note + ' ' : '') + 'Appointed for the day; the Divine Liturgy itself is celebrated on Sundays and feasts only (whether it is sung on this weekday is unconfirmed).';
    restrictToDaySet(entry);
    parts.push(entry);
  }
  // ---- second pass (H2): what the first pass left missing
  const season = seasonOf(ctx);
  const labelOf = (part) => PART_LABEL[part].replace(/ \(.*\)/, '');
  const clean = (t) => String(t).replace(/\s+/g, ' ').trim();
  const hymnsOf = (cid, part) => ((canons[cid] || {}).hymns || []).filter((h) => h.part === part || (h.also || []).includes(part));
  const fillFrom = (entry, cid, hs, source, basis, conf, note) => {
    entry.status = 'present'; entry.source = source; entry.complete = true; entry.needsReview = true; entry.note = note;
    entry.hymns = hs.map((h) => hymnView(h, cid, { basis, confidence: conf }));
    entry.from = [fromOf(cid)]; entry.candidates = [];
  };
  // (a0) the Tonatsoyts names one hymn of a part and that hymn sits inside a canon that prints the whole part: the part is that canon's, in book order
  for (const e of parts) {
    if (e.status !== 'from_rubric' || e.complete || !['orhnutyun', 'harts', 'metsatsutse', 'voghormya', 'der_hergnits'].includes(e.part)) continue;
    for (const f of e.from) {
      const all = hymnsOf(f.canonId, e.part); const named = new Set(e.hymns.map((h) => h.hymnId));
      if (all.length > e.hymns.length && all.some((h) => named.has(h.id))) {
        const nm = e.hymns.map((h) => h.hymnId);
        e.status = 'present'; e.source = 'canon_via_rubric'; e.complete = true; e.needsReview = true;
        e.note = `The Tonatsoyts names a hymn of this part; it is printed in «${clean(canons[f.canonId].title)}» (p${(canons[f.canonId].pages || [])[0]}), which prints the whole part.`;
        e.hymns = all.map((h) => hymnView(h, f.canonId, { basis: 'the canon in which the rubric\'s hymn is printed', confidence: 0.6, namedByRubric: nm.includes(h.id) }));
        e.from = [fromOf(f.canonId)];
        restrictToDaySet(e);
        break;
      }
    }
  }
  // (a) the day's other parts come from one generic canon (e.g. «Կանոն Երեքշաբաթի աւուրն»): its remaining parts belong to the same day
  const genericCids = [...new Set([...parts.filter((p) => p.status === 'present' && p.from.length && genericOk(p.from[0].canonId)).map((p) => p.from[0].canonId)])];
  for (const e of parts) {
    if (e.status !== 'missing' || e.kindUnlocated) continue;
    for (const cid of genericCids) {
      let hs = hymnsOf(cid, e.part); if (!hs.length) continue;
      const m = hs.filter((h) => normMode(h.mode) === dayMode); if (m.length) hs = m;
      fillFrom(e, cid, hs, 'generic_same_canon', 'the same generic canon that supplies the day\'s other parts', 0.5,
        `The day's other parts come from the book's generic section «${clean(canons[cid].title)}»; this part is taken from the same section.`);
      break;
    }
  }
  // (b) Orhnutyun of the fasts «of the eight modes» (p87): the book prints one Orhnutyun for every mode of a fast day when a mode has none of its own
  const eightKey = armKey('զութն ձայնի');
  for (const e of parts) {
    if (e.status !== 'missing' || e.part !== 'orhnutyun' || !(season.fast || season.lent)) continue;
    const hit = Object.entries(canons).find(([cid, k]) => armKey(k.title).includes(eightKey) && armKey(k.title).includes(armKey('պահոց')) && hymnsOf(cid, 'orhnutyun').length);
    if (hit) fillFrom(e, hit[0], hymnsOf(hit[0], 'orhnutyun'), 'generic_eight_modes', 'the Orhnutyun of the fasts printed for the eight modes', 0.45,
      `No Orhnutyun of the fasts is printed for this mode; the book gives «${clean(hit[1].title)}» for the eight modes (p${(hit[1].pages || [])[0]}).`);
  }
  // (b2) Orhnutyun still missing: a weekday's own «Օրհնութիւն <weekday> աւուրն», else the book's table of Orhnutyun openings for the eight modes (p6)
  for (const e of parts) {
    if (e.status !== 'missing' || e.part !== 'orhnutyun') continue;
    if (ctx.weekday && ctx.weekday !== 'Sun') {
      const hit = Object.entries(canons).filter(([cid, k]) => k.kind === 'generic_by_weekday' && titleFacts(k.title).weekday === ctx.weekday && armKey(k.title).includes(armKey('օրհնութիւն')) && hymnsOf(cid, 'orhnutyun').length);
      if (hit.length === 1) { fillFrom(e, hit[0][0], hymnsOf(hit[0][0], 'orhnutyun'), 'generic_weekday_orhnutyun', 'the weekday\'s own Orhnutyun', 0.5, `The day's canon prints no Orhnutyun; the book's «${clean(hit[0][1].title)}» is the Orhnutyun of this weekday.`); continue; }
    }
    const beginnings = Object.entries(canons).filter(([cid, k]) => k.kind === 'generic_by_mode' && armKey(k.title).includes(armKey('սկսուածք')) && hymnsOf(cid, 'orhnutyun').some((h) => normMode(h.mode) === dayMode));
    if (beginnings.length === 1) {
      const [cid, k] = beginnings[0];
      fillFrom(e, cid, hymnsOf(cid, 'orhnutyun').filter((h) => normMode(h.mode) === dayMode), 'generic_mode_beginnings', 'the book\'s table of Orhnutyun openings for the eight modes', 0.4,
        `The day's canon prints no Orhnutyun; the book's «${clean(k.title)}» (p${(k.pages || [])[0]}) gives the Orhnutyun opening for the day's mode. Only the opening is printed there.`);
    }
  }
  // (b3) an ordinary fast Friday: the Tonatsoyts names «Հարց հանգստեան» (the Harts of repose) for the great majority of fast Fridays of the year, so a fast Friday
  // for which it names nothing takes the Harts of repose by the day's mode (Metsatsutse, Voghormya and Der Hergnits follow in the same series)
  if (ctx.weekday === 'Fri' && season.fast) {
    for (const e of parts) {
      if (e.status !== 'missing' || !['harts', 'metsatsutse', 'voghormya', 'der_hergnits'].includes(e.part)) continue;
      const cands = genericFor(canons, e.part, new Set([dayMode].filter(Boolean)), ctx, armKey('հանգստեան'));
      const top = cands[0], second = cands.slice(1).find((c) => !(top && c.k.family && c.k.family === top.k.family));
      if (top && top.score >= 4 && (!second || top.score - second.score >= 1)) {
        const exact = top.hs.filter((h) => normMode(h.mode) === dayMode);
        fillFrom(e, top.cid, exact.length ? exact : top.hs, 'generic_friday_repose', 'fast Friday: the Harts of repose by the day\'s mode', 0.45,
          `The Tonatsoyts names nothing for this fast Friday; on ordinary fast Fridays it appoints «Հարց հանգստեան», so the book's «${clean(top.k.family_title || top.k.title)}» series was used for the day's mode.`);
      }
    }
  }
  // (c) a part the book does not print for this canon / this day is stated, not left as an unexplained gap
  for (const e of parts) {
    if (e.status !== 'missing') continue;
    if (e.part === 'jashoo' && !hasLiturgy) {
      e.status = 'not_in_data'; e.needsReview = false; e.note = 'The Divine Liturgy is celebrated on Sundays and feasts only (not on this weekday), and no Jashoo hymn is transcribed for it.'; e.reason = 'no_liturgy';
    } else if (['jashoo', 'hampartsi', 'mankunk'].includes(e.part) && ((primary && !primaryGeneric) || genericCids.length)) {
      const cid = primary && !primaryGeneric ? primary.section : genericCids[0];
      e.status = 'not_in_data'; e.needsReview = false; e.reason = 'canon_has_none';
      e.note = `The book names no ${labelOf(e.part)} hymn for this canon (${clean(canons[cid].title)}). It prints a one-line cue («${PART_HY[e.part]}: opening words») at the end of only a few canons (an image search of all 513 pages finds these labels on pp. 337, 340, 352, 362, 369 and 372); this canon has none.`;
    }
  }
  const located = (p) => p.status === 'not_applicable' || p.status === 'present' || (p.status === 'from_rubric' && p.complete);
  const missing = parts.filter((p) => p.status === 'missing').map((p) => p.part);
  return { schema: 'day-canon/1.0', canons: dayCanons, parts, summary: { primaryCanon: primary ? primary.section : null, present: parts.filter((p) => p.status === 'present').length, fromRubric: parts.filter((p) => p.status === 'from_rubric').length, missing, allPartsLocated: parts.every(located), allPartsAccounted: parts.every((p) => located(p) || p.status === 'not_in_data'), notPrinted: parts.filter((p) => p.status === 'not_in_data').map((p) => p.part), hasLiturgy } };
}
