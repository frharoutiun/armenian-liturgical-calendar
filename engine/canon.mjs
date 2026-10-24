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

// where each part is sung (W11_SERVICE_MAP: Zhamagirk order of services; ZH = line of the Zhamagirk text layer, ST = sacredtradition.am page)
export const PART_SERVICE = {
  orhnutyun: { service: 'midnight', label: 'Midnight service', slot: "after «Օրհնեսցուք զՏէր»", evidence: ['ZH:2616'], confidence: 'medium' },
  harts: { service: 'morning', label: 'Morning service', slot: 'after the Song of the Three Children', evidence: ['ZH:4252'], confidence: 'high' },
  metsatsutse: { service: 'morning', label: 'Morning service', slot: 'after the songs of Mary, Zachariah and Simeon', evidence: ['ZH:4486'], confidence: 'high' },
  voghormya: { service: 'morning', label: 'Morning service', slot: 'after Psalm 50', evidence: ['ZH:4861'], confidence: 'high' },
  der_hergnits: { service: 'morning', label: 'Morning service', slot: 'after the Alleluia and praise psalms', evidence: ['ZH:5024'], confidence: 'high' },
  mankunk: { service: 'morning', label: 'Morning service', slot: 'after the psalm «Օրհնեցէք, մանկունք, զՏէր»; non-dominical days only', evidence: ['ZH:5891'], confidence: 'high' },
  jashoo: { service: 'divine_liturgy', label: 'Divine Liturgy', slot: 'after the entrance psalm «Ճաշու փոխ», before the Trisagion', evidence: ['ST:20260906_dl.html', 'ZH:8443'], confidence: 'high' },
  hampartsi: { service: 'evening', label: 'Evening service', slot: 'Psalm 140 block «Համբարձումն ձեռաց»', evidence: ['ZH:10298-10320'], confidence: 'low', unconfirmed: 'exact slot' },
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
      if (mk && mk.also && mk.also.length) r.also = mk.also;
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
const kindStemOf = (s) => { const k = armKey(s); for (const [a, b] of KIND_STEMS) if (k.includes(a)) return b; return null; };

function seasonOf(ctx) {
  const o = ctx.easterOffset;
  const lentWeek = o != null && o >= -48 && o <= -1 ? Math.floor((o + 48) / 7) + 1 : null;
  return { lent: o != null && o >= -48 && o <= -1, lentWeek, eastertide: o != null && o >= 0 && o <= 49, fast: ctx.fastStatus === 'fast' };
}

function titleFacts(title) {
  const k = armKey(title);
  const wd = WEEKDAY_WORDS.find(([a]) => k.includes(a));
  const ord = /շաբաթ/.test(String(title).toLowerCase().replace(/\s+/g, '')) || k.includes(armKey('շաբաթու')) ? ORDINALS.find(([a]) => k.includes(a)) : null;
  return { weekday: wd ? wd[1] : null, lentOrdinal: ord && k.includes(armKey('ապաշխար')) ? ord[1] : null, lent: k.includes(armKey('ապաշխար')) || k.includes(armKey('աղուհաց')) || k.includes(armKey('պահոց')),
    eastertide: k.includes(armKey('յինանց')) || k.includes(armKey('յարութեան')) };
}

// canons: refined canons map. Returns the best generic canon for (part, modes) on this day, or the ranked list.
function genericFor(canons, part, modes, ctx, kindStem) {
  const season = seasonOf(ctx), cands = [];
  for (const [cid, k] of Object.entries(canons)) {
    const generic = ['generic_by_mode', 'generic_by_weekday'].includes(k.kind) || (kindStem && armKey(k.title).includes(kindStem)) || (k.kind === 'other' && /ճաշու/.test(String(k.title).toLowerCase().replace(/\s+/g, '')));
    if (!generic) continue;
    const hs = (k.hymns || []).filter((h) => h.part === part && modes.has(normMode(h.mode)));
    if (!hs.length) continue;
    const f = titleFacts(k.title);
    let score = 1, why = ['mode agrees'], bad = false;
    if (kindStem) { if (armKey(k.title).includes(kindStem)) { score += 3; why.push('section is of the kind the rubric names'); } else bad = true; }
    if (f.weekday) { if (f.weekday === ctx.weekday) { score += 3; why.push('weekday agrees'); } else bad = true; }
    if (f.lentOrdinal) { if (season.lentWeek === f.lentOrdinal) { score += 3; why.push(`Lenten week ${f.lentOrdinal}`); } else bad = true; }
    else if (f.lent) { if (season.lent || season.fast) { score += 2; why.push('Lent / fast day'); } }
    if (f.eastertide && !f.lent) { if (season.eastertide) { score += 2; why.push('Eastertide'); } else if (ctx.weekday === 'Sun' && armKey(k.title).includes(armKey('յարութեան'))) { score += 2; why.push('Sunday: Resurrection sharagan by mode'); } }
    if (!bad) cands.push({ cid, k, hs, score, why });
  }
  cands.sort((a, b) => b.score - a.score);
  return cands;
}

// ---------- the day ----------
// hr: resolver result. ctx: { weekday, modeArmenian, easterOffset, fastStatus, commemorationKinds }
export function assembleCanon(refined, hr, ctx = {}) {
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
    heading: h.heading || null, printedCategory: h.cat_printed || null, subpart: h.subpart || null, partBasis: h.part_basis, namedByRubric: named.has(h.id), ...extra });
  const rubricView = (h) => ({ hymnId: h.resolved.hymnId, canonId: h.resolved.sectionId, sectionId: h.resolved.sectionId, incipit: h.resolved.incipit, mode: h.resolved.mode, page: h.resolved.page, pagesAll: h.resolved.pagesAll, stanzaIds: ((canons[h.resolved.sectionId] || {}).hymns || []).find((x) => x.id === h.resolved.hymnId)?.stanza_ids || [],
    heading: null, printedCategory: null, subpart: null, partBasis: 'named by the Tonatsoyts rubric', namedByRubric: true, basis: h.basis, confidence: h.confidence });
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
      let hs = (canons[cid].hymns || []).filter((h) => h.part === part);
      if (modes) { const m = hs.filter((h) => modes.has(normMode(h.mode))); if (m.length || strict) hs = m; }
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
        let cands = genericFor(canons, part, modes, ctx, ks);
        if (!cands.length && ks) cands = genericFor(canons, part, modes, ctx, null);
        const top = cands[0], second = cands[1];
        if (top && top.score >= 3 && (!second || top.score - second.score >= 1)) {
          const exact = top.hs.filter((h) => normMode(h.mode) === (normMode(cue && cue.mode) || dayMode));
          const hs = exact.length ? exact : top.hs;
          entry.status = 'present'; entry.source = ks ? 'generic_kind' : 'generic_rule'; entry.complete = true; entry.needsReview = true;
          entry.note = `The day has no canon of its own for this part; the book's generic section «${String(top.k.title).replace(/\s+/g, ' ').trim()}» was chosen by rule (${top.why.join(', ')}).`;
          entry.hymns = hs.map((h) => hymnView(h, top.cid, { basis: 'generic section chosen by rule: ' + top.why.join(', '), confidence: Math.min(0.6, 0.3 + 0.05 * top.score) }));
          entry.from = [fromOf(top.cid)]; lastCanon = { cid: top.cid, generic: true };
        } else {
          entry.note = 'This part could not be located for this day: to be confirmed.';
          entry.candidates = cands.slice(0, 3).map((c) => ({ canonId: c.cid, title: c.k.title, startPage: (c.k.pages || [])[0] || null, page: c.hs[0].page, hymnId: c.hs[0].id, score: c.score, why: c.why }));
        }
      }
    }
    if (part === 'mankunk' && hasLiturgy) {
      // dominical day: Mankunk is not sung (a procession and Gospel come at this point)
      entry.suppressed = !!entry.hymns.length; entry.needsReview = false;
      if (!entry.hymns.length) entry.status = 'not_applicable';
      entry.note = (entry.note ? entry.note + ' ' : '') + 'Mankunk is sung on non-dominical days; this day has the Liturgy (a Sunday or feast).';
    }
    if (part === 'jashoo' && !hasLiturgy && entry.hymns.length) entry.note = (entry.note ? entry.note + ' ' : '') + 'Appointed for the day; the Divine Liturgy itself is celebrated on Sundays and feasts only (whether it is sung on this weekday is unconfirmed).';
    parts.push(entry);
  }
  const located = (p) => p.status === 'not_applicable' || p.status === 'present' || (p.status === 'from_rubric' && p.complete);
  const missing = parts.filter((p) => p.status === 'missing').map((p) => p.part);
  return { schema: 'day-canon/1.0', canons: dayCanons, parts, summary: { primaryCanon: primary ? primary.section : null, present: parts.filter((p) => p.status === 'present').length, fromRubric: parts.filter((p) => p.status === 'from_rubric').length, missing, allPartsLocated: parts.every(located), hasLiturgy } };
}
