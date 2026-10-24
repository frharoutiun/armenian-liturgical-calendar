// Section-first resolution of the hymns a day appoints (Hador 1 records and Hador 2 rows) to Sharagnots hymns and EXACT pages.
//
// The Tonatsoyts names a hymn only by type, mode and an opening phrase, and many openings recur in several canons.
// Matching the phrase against all 2,465 hymns therefore gives several pages. Here the day first selects the Sharagnots
// canon(s) it uses (the section that holds most of the day's named openings, corroborated by the feast name in the
// section title and by the mode); each opening is then looked up inside those sections only.
// Every outcome states its evidence; nothing is forced: an opening that stays ambiguous returns resolved:null and a short
// ranked candidate list for human review.

export const armKey = (s) => String(s || '').toLowerCase().replace(/[^ա-և]/g, '').replace(/ը/g, '').replace(/ու/g, 'ւ').replace(/և/g, 'եւ');
export const normMode = (m) => String(m || '').replace(/[^Ա-Ֆա-և]/g, '').toUpperCase();

// words that name no feast
const STOP = new Set(['կանոն', 'սրբոյ', 'սրբոյն', 'սրբոց', 'սրբոցն', 'սուրբ', 'տօն', 'կիւրակէ', 'կիւրակի', 'շաբաթ', 'օրհնութիւն', 'հարց', 'պահոց', 'պահք', 'աւուրն', 'ձայն', 'եւ', 'ընդ', 'յետ', 'զկնի', 'առաջին', 'երկրորդ', 'երրորդ', 'չորրորդ', 'հինգերորդ', 'վեցերորդ', 'եօթներորդ', 'ութերորդ', 'իններորդ', 'տասներորդ', 'բարեկենդան', 'տեառն', 'մերոյ', 'քրիստոսի', 'յիսուսի', 'աստուծոյ'].map(armKey));

// generic canon categories named by the rubric's type word: the hymn is then in a section of that kind
const TYPE_STEMS = [['հանգստեան', 'հանգստեան'], ['մարտիրոս', 'մարտիրոս'], ['աստուածածն', 'աստուածածն'], ['խաչ', 'խաչ'], ['ապաշխար', 'ապաշխար'], ['յարութ', 'յարութ'], ['հոգեգալ', 'հոգեգալ'], ['առաքելոց', 'առաքել'], ['հայրապետ', 'հայրապետ'], ['մարգարէ', 'մարգարէ'], ['կուսան', 'կուսան'], ['ճգնաւոր', 'ճգնաւոր']].map(([a, b]) => [armKey(a), armKey(b)]);
const typeStem = (type) => { const k = armKey(type); for (const [a, b] of TYPE_STEMS) if (k.includes(a)) return b; return null; };
const lev = (a, b, max) => { if (Math.abs(a.length - b.length) > max) return max + 1; const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };

const MARKERS = /ց\s*վերջ[ըն]?|իւր\s+սար(?:օ|ո)?ք[ըն]?|…|\.{2,}/gi;   // "to the end", "with its own arrangement", ellipses
// "Ի գերեզման. և Եկին 'ի գերեզման. և Ձայն աւետաւոր" -> three openings
// a rubric word that names a KIND of canon (martyrs', repose, penitence...) is not an opening: it must never be matched as one
const KIND_WORDS = new Set(['հանգստեան', 'ապաշխարութեան', 'մարտիրոսաց', 'աստուածածնի', 'խաչի', 'առաքելոց', 'հայրապետաց', 'մարգարէից', 'կուսանաց', 'ճգնաւորաց', 'յարութեան', 'հոգեգալստեան', 'հոգեգալուստ', 'ապաշխարութիւն', 'ողբ', 'երգ', 'միաբանական'].map(armKey));
export function fragments(incipit) {
  const s = String(incipit || '').replace(MARKERS, ' ').replace(/[()\[\]]/g, ' ');
  return s.split(/[.։:;]\s*|\s+(?:և|եւ)\s+/).map((x) => x.trim().replace(/^(?:և|եւ)\s+/, '')).map((x) => ({ text: x, key: armKey(x) })).filter((x) => x.key.length >= 4 && !KIND_WORDS.has(x.key));
}

export function createHymnResolver(hymnIdx, openings) {
  const sections = new Map((hymnIdx.sections || []).map((s) => [s.id, s]));
  // group by the governing headed canon (hymn_index 1.1: untitled column blocks continue the canon above them)
  const hymns = (hymnIdx.hymns || []).map((h) => ({ ...h, block: h.section, section: h.canon || h.section, m: normMode(h.mode), page: (h.pages && h.pages[0]) || null }));
  const hymnById = new Map(hymns.map((h) => [h.id, h]));
  // stanza openings: a cue may name a stanza inside a hymn; the hit is that stanza's own page
  const stanzaRows = [];
  for (const [hid, n, page, key] of (openings && openings.rows) || []) {
    const h = hymnById.get(hid); if (!h) continue;
    stanzaRows.push({ ...h, key, stanzaN: n, page, pages: [page], incipit: h.incipit, isStanza: true });
  }
  for (const h of hymns) h.stanzaN = 1;
  const secKey = new Map(); for (const s of sections.values()) secKey.set(s.id, armKey(s.title));
  // consonant skeleton of each title word: Զատիկ / Զատկի, Ծնունդ / Ծննդեան meet in the same skeleton
  const skel = (k) => k.replace(/[աեէըիոօւյ]/g, '');
  const secWords = new Map(); for (const s of sections.values()) if ((s.title || '').trim()) secWords.set(s.id, String(s.title).split(/[\s,;:.()\u00b7\u2022]+/).map((w) => skel(armKey(w))).filter((w) => w.length >= 3));
  const byPrefix = new Map();
  for (const h of hymns.concat(stanzaRows)) { const k = (h.key || '').slice(0, 4); if (k.length < 4) continue; if (!byPrefix.has(k)) byPrefix.set(k, []); byPrefix.get(k).push(h); }
  const stemDf = new Map();
  const dfOf = (st) => { if (!stemDf.has(st)) { let n = 0; for (const ws of secWords.values()) if (ws.some((w) => w.startsWith(st))) n++; stemDf.set(st, n); } return stemDf.get(st); };

  function candidatesFor(fragKey) {
    const n = Math.min(fragKey.length, 12), pre = fragKey.slice(0, 4), out = [];
    const buckets = byPrefix.get(pre) || [];
    for (const h of buckets) { const hk = h.key; if (hk.startsWith(fragKey.slice(0, n)) || fragKey.startsWith(hk.slice(0, n))) out.push(h); }
    return out;
  }

  // feast-name evidence per section: sum of 1/df over distinct rare stems of the names found in the section title
  function titleScores(names) {
    const stems = new Set();
    for (const name of names || []) for (const w of String(name || '').split(/[\s,;:.()\u00ab\u00bb"'\u2019\u055a\u055b]+/)) {
      const k = armKey(w); if (k.length < 5 || STOP.has(k)) continue;
      const sk = skel(k); if (sk.length >= 3) stems.add(sk.slice(0, 4));
    }
    const sc = new Map();
    for (const st of stems) { const df = dfOf(st); if (!df || df > 12) continue; for (const [id, ws] of secWords) if (ws.some((w) => w.startsWith(st))) sc.set(id, (sc.get(id) || 0) + 1 / df); }
    return sc;
  }

  const pageRange = (h) => (h.pages || []).slice();
  function view(h, sec) {
    return { hymnId: h.id, sectionId: h.section, sectionTitle: (sec || sections.get(h.section) || {}).title || null, sectionPage: ((sec || sections.get(h.section) || {}).pages || [])[0] || null, sectionKind: (sec || sections.get(h.section) || {}).kind || null, page: h.page, pagesAll: pageRange(h), stanzaN: h.stanzaN || 1, incipit: h.incipit, mode: h.mode || null, n_stanzas: h.n_stanzas };
  }

  // specs: [{source, type, incipit, mode}]; ctx: {names:[Armenian names of the day's commemorations and records]}
  function resolve(specs, ctx = {}) {
    const items = [];
    for (const sp of specs) {
      const frs = fragments(sp.incipit);
      const parts = frs.length ? frs : [null];
      parts.forEach((fr, fi) => items.push({ spec: sp, frag: fr, fi, cands: fr ? candidatesFor(fr.key) : [], mode: normMode(sp.mode) }));
    }
    const tscore = titleScores(ctx.names || []);
    // greedy cover: the section holding most still-uncovered openings (ties -> feast-name evidence -> mode)
    const uncovered = new Set(items.map((_, i) => i).filter((i) => items[i].cands.length));
    const daySections = []; const secStats = new Map();
    while (uncovered.size) {
      const sc = new Map();
      for (const i of uncovered) { const secs = new Set(items[i].cands.map((h) => h.section)); for (const s of secs) { const e = sc.get(s) || { cover: 0, modeOk: 0, idx: [] }; e.cover++; if (items[i].mode && items[i].cands.some((h) => h.section === s && h.m === items[i].mode)) e.modeOk++; e.idx.push(i); sc.set(s, e); } }
      const ranked = [...sc.entries()].map(([s, e]) => ({ s, ...e, title: tscore.get(s) || 0 })).sort((a, b) => (b.cover + 2 * Math.min(b.title, 1.5) + 0.5 * b.modeOk) - (a.cover + 2 * Math.min(a.title, 1.5) + 0.5 * a.modeOk) || b.cover - a.cover);
      const top = ranked[0], eq = ranked.filter((r) => Math.abs((r.cover + 2 * Math.min(r.title, 1.5) + 0.5 * r.modeOk) - (top.cover + 2 * Math.min(top.title, 1.5) + 0.5 * top.modeOk)) < 1e-9 && r.cover === top.cover);
      const chosen = eq.length === 1 ? [top] : eq;   // a true tie keeps all tied sections: the openings then stay ambiguous
      for (const c of chosen) { daySections.push(c.s); secStats.set(c.s, { cover: c.cover, title: c.title, tied: chosen.length > 1 }); }
      for (const i of top.idx) uncovered.delete(i);
      if (chosen.length > 1) for (const c of chosen) for (const i of c.idx) uncovered.delete(i);
    }
    // spelling variants: an opening that matches nothing exactly may still match, within a few letters, a hymn of the day's own canon
    const allByOrSection = (secs) => hymns.concat(stanzaRows).filter((h) => secs.includes(h.section));
    for (const it of items) if (it.frag && !it.cands.length && daySections.length && it.frag.key.length >= 8) {
      const k = it.frag.key.slice(0, 10), near = allByOrSection(daySections).filter((h) => h.key.length >= 8 && lev(k, h.key.slice(0, 10), 2) <= 2);
      if (near.length) { it.cands = near; it.fuzzy = true; }
    }
    const out = [];
    for (const it of items) {
      const base = { source: it.spec.source, type: it.spec.type || '', incipit: it.frag ? it.frag.text : (it.spec.incipit || ''), specIncipit: it.spec.incipit || '', mode: it.spec.mode || '', resolved: null, candidates: [], status: 'unlinked', basis: '', confidence: 0 };
      if (!it.cands.length && it.mode && daySections.length && (!it.frag || /սար/.test(armKey(it.spec.incipit)))) {
        // no opening printed ("with its own arrangement" / type and mode only): the day's canon hymns in that mode
        const near = hymns.filter((h) => daySections.includes(h.section) && h.m === it.mode);
        if (near.length === 1) { base.resolved = { ...view(near[0]), basis: '' }; base.status = 'linked_section'; base.confidence = 0.6; base.basis = "no opening is printed in the rubric; the only hymn of the day's canon in this mode"; base.resolved.basis = base.basis; base.resolved.confidence = 0.6; out.push(base); continue; }
        if (near.length > 1) { base.status = 'ambiguous'; base.basis = `no opening is printed in the rubric; ${near.length} hymns of the day's canon are in this mode`; base.candidates = near.slice(0, 3).map((h) => view(h)); out.push(base); continue; }
      }
      if (!it.cands.length) { base.basis = it.frag ? 'no Sharagnots hymn begins with this opening' : 'the rubric gives no usable opening (type/mode only)'; out.push(base); continue; }
      let pool = it.cands, via = 'incipit';
      const inSec = pool.filter((h) => daySections.includes(h.section));
      if (inSec.length) { pool = inSec; via = 'day canon'; }
      const firsts = pool.filter((h) => !h.isStanza); if (firsts.length && firsts.length < pool.length) pool = firsts;   // a hymn's own opening outranks a stanza inside another hymn
      if (it.mode) { const mm = pool.filter((h) => h.m === it.mode); if (mm.length) { pool = mm; via += '+mode'; } }
      const ts = typeStem(it.spec.type);
      if (!inSec.length && ts && pool.length > 1) { const tp = pool.filter((h) => (secKey.get(h.section) || '').includes(ts)); if (tp.length && tp.length < pool.length) { pool = tp; via += '+type'; } }
      // exact duplicates inside one section (same opening printed again): keep the first, noted
      const uniq = []; const seen = new Set();
      for (const h of pool) { const k = h.section + '|' + h.id + '|' + h.stanzaN; if (seen.has(k)) continue; seen.add(k); uniq.push(h); }
      let primary = false;
      if (uniq.length > 1) {   // several of the day's canons hold the opening: the canon named by the day's own feast is the primary one
        const ranked = [...new Set(uniq.map((h) => h.section))].map((sid) => ({ sid, t: tscore.get(sid) || 0 })).sort((a, b) => b.t - a.t);
        if (ranked.length > 1 && ranked[0].t >= 0.3 && ranked[0].t - ranked[1].t >= 0.3) { const keep = uniq.filter((h) => h.section === ranked[0].sid); if (keep.length === 1) { uniq.splice(0, uniq.length, keep[0]); primary = true; } }
      }
      if (uniq.length === 1) {
        const h = uniq[0], st = secStats.get(h.section);
        // distinct places this opening is printed (a hymn or a stanza inside one, counted once per canon)
        const elsewhere = [...new Map(it.cands.filter((c) => c.section !== h.section).map((c) => [c.section, c])).values()];
        const unique = !elsewhere.length && new Set(it.cands.map((c) => c.id + '/' + c.stanzaN)).size === 1;
        const stronglyDay = st && (st.cover >= 3 || st.title >= 1.0 || primary);
        const strong = (unique && (it.fuzzy ? false : (it.frag ? it.frag.key.length >= 6 : false))) || (!elsewhere.length && st && (st.cover >= 2 || st.title >= 0.5)) || (elsewhere.length && stronglyDay);
        base.resolved = { ...view(h), basis: '' };
        base.status = strong ? 'linked_exact' : 'linked_section';
        base.basis = (it.fuzzy ? 'opening matches a hymn of the day\'s canon up to spelling' : unique ? 'the only place in the Sharagnots where this opening is printed' : `opening found in the day's canon (${st ? `${st.cover} of the day's openings` : ''}${st && st.title >= 0.5 ? ', feast name in the canon title' : ''}${it.mode ? ', mode agrees' : ''})`) + (primary ? '; the canon named by the day\'s feast outranks the other canons holding this opening' : '') + (it.cands.length > 1 && !st ? '; chosen by mode' : '') + (elsewhere.length ? `; the same opening is also printed in ${elsewhere.length} other canon${elsewhere.length > 1 ? 's' : ''}` : '');
        base.resolved.basis = base.basis; base.confidence = strong ? (unique ? 0.95 : 0.85) : 0.65; base.resolved.confidence = base.confidence;
        base.candidates = elsewhere.slice(0, 2).map((c) => view(c));   // alternatives, shown only as 'also printed at'
      } else {
        base.status = 'ambiguous';
        base.basis = `${uniq.length} hymns share this opening and the day's canon does not separate them`;
        base.candidates = uniq.map((h) => view(h)).sort((a, b) => (Number(daySections.includes(b.sectionId)) - Number(daySections.includes(a.sectionId)))).slice(0, 3);
      }
      out.push(base);
    }
    return { hymns: out, daySections, secStats: [...secStats].map(([section, e]) => ({ section, ...e })) };
  }
  return { resolve, hymnById, sections };
}

// ---------- the day's whole Sharagnots canon, part by part ----------
export const PART_ORDER = ['orhnutyun', 'harts', 'metsatsutse', 'voghormya', 'der_hergnits', 'mankunk', 'jashoo', 'hampartsi'];
export const PART_LABEL = { orhnutyun: 'Orhnutyun', harts: 'Harts (with its Gordzk)', metsatsutse: 'Metsatsutse', voghormya: 'Voghormya', der_hergnits: 'Der Hergnits', mankunk: 'Mankunk', jashoo: 'Jashoo', hampartsi: 'Hampartsi' };
export const PART_HY = { orhnutyun: 'Օրհնութիւն', harts: 'Հարց', metsatsutse: 'Մեծացուսցէ', voghormya: 'Ողորմեա', der_hergnits: 'Տէր յերկնից', mankunk: 'Մանկունք', jashoo: 'Ճաշու', hampartsi: 'Համբարձի' };
const TYPE_PART = [['օրհնութ', 'orhnutyun'], ['հարց', 'harts'], ['գործք', 'harts'], ['մեծացուսցէ', 'metsatsutse'], ['ողորմեա', 'voghormya'], ['տէրյերկնից', 'der_hergnits'], ['տէրերկնից', 'der_hergnits'], ['մանկունք', 'mankunk'], ['ճաշու', 'jashoo'], ['համբարձի', 'hampartsi']].map(([a, b]) => [armKey(a), b]);
const partOfType = (t) => { const k = armKey(t); for (const [a, b] of TYPE_PART) if (k.includes(a)) return b; return null; };

// canonParts: data/calendar/canon_parts.json. hr: result of resolver.resolve. ctx: { weekday, modeArmenian }
export function assembleCanon(canonParts, hr, ctx = {}) {
  const canons = (canonParts && canonParts.canons) || {};
  const named = new Map();   // hymnId -> rubric item
  for (const h of hr.hymns) if (h.resolved) named.set(h.resolved.hymnId, h);
  // day canons ranked: feast-name evidence first, then how many of the day's named openings they hold
  const ranked = (hr.secStats || []).filter((x) => canons[x.section]).sort((a, b) => (b.title * 2 + b.cover) - (a.title * 2 + a.cover));
  const kindOk = (id) => ['full_canon', 'partial'].includes(canons[id].kind);
  const genericOk = (id) => ['generic_by_weekday', 'generic_by_mode'].includes(canons[id].kind);
  const primary = ranked.find((x) => kindOk(x.section)) || ranked.find((x) => genericOk(x.section)) || null;
  const primaryGeneric = !!(primary && !kindOk(primary.section));
  const wantModes = new Set([normMode(ctx.modeArmenian), ...hr.hymns.filter((h) => h.resolved && primary && h.resolved.sectionId === primary.section).map((h) => normMode(h.resolved.mode))].filter(Boolean));
  const dayCanons = ranked.map((x) => ({ canonId: x.section, title: canons[x.section].title, startPage: (canons[x.section].pages || [])[0] || null, kind: canons[x.section].kind, role: primary && x.section === primary.section ? 'primary' : 'also',
    basis: `holds ${x.cover} of the openings the Tonatsoyts names for this day${x.title >= 0.3 ? ', and the feast name is in its title' : ''}` }));
  const modeNorm = normMode(ctx.modeArmenian);
  const hymnView = (h, canonId, extra = {}) => ({ hymnId: h.id, canonId, sectionId: h.block, incipit: h.incipit, mode: h.mode || null, page: h.page, pagesAll: h.pages || [h.page], stanzaIds: h.stanza_ids || [],
    heading: h.heading || null, printedCategory: h.cat_printed || null, subpart: h.subpart || null, partBasis: h.part_basis, namedByRubric: named.has(h.id), ...extra });
  const parts = [];
  for (const part of PART_ORDER) {
    const entry = { part, label: PART_LABEL[part], labelHy: PART_HY[part], status: 'missing', hymns: [], from: [], note: '', candidates: [], needsReview: true };
    const take = (canonId) => {
      let hs = (canons[canonId].hymns || []).filter((h) => h.part === part);
      if (primaryGeneric && primary && canonId === primary.section) { const m = hs.filter((h) => wantModes.has(normMode(h.mode))); if (m.length) hs = m; }   // a by-mode / by-weekday section carries every mode: keep the day's
      return hs;
    };
    let src = null;
    if (primary) { const hs = take(primary.section); if (hs.length) src = { canonId: primary.section, hs, basis: 'the day\'s canon' }; }
    if (!src) for (const x of ranked) { if (primary && x.section === primary.section) continue; if (!(x.cover >= 2 || x.title >= 0.3)) continue; const hs = take(x.section); if (hs.length) { src = { canonId: x.section, hs, basis: 'another canon the day uses' }; break; } }
    if (src) {
      entry.status = 'present'; entry.needsReview = !primary || src.canonId !== primary.section || primaryGeneric ? true : false;
      entry.hymns = src.hs.map((h) => hymnView(h, src.canonId, { basis: src.basis, confidence: src.canonId === (primary && primary.section) ? 0.85 : 0.6 }));
      entry.from = [{ canonId: src.canonId, title: canons[src.canonId].title, startPage: (canons[src.canonId].pages || [])[0] || null }];
    } else {
      const rub = hr.hymns.filter((h) => h.resolved && partOfType(h.type) === part);
      const seen = new Set(), items = [];
      for (const h of rub) if (!seen.has(h.resolved.hymnId)) { seen.add(h.resolved.hymnId); items.push(h); }
      if (items.length) {
        entry.status = 'from_rubric'; entry.needsReview = true;
        entry.note = 'Only the opening(s) the Tonatsoyts names are located; the rest of this part is not yet assembled from the book.';
        entry.hymns = items.map((h) => ({ hymnId: h.resolved.hymnId, canonId: h.resolved.sectionId, sectionId: h.resolved.sectionId, incipit: h.resolved.incipit, mode: h.resolved.mode, page: h.resolved.page, pagesAll: h.resolved.pagesAll, stanzaIds: [], heading: null, printedCategory: null, subpart: null, partBasis: 'named by the Tonatsoyts rubric', namedByRubric: true, basis: h.basis, confidence: h.confidence }));
        entry.from = [...new Set(items.map((h) => h.resolved.sectionId))].map((id) => ({ canonId: id, title: (canons[id] || {}).title || null, startPage: ((canons[id] || {}).pages || [])[0] || null }));
      } else {
        entry.note = 'This part could not be located for this day: to be confirmed.';
        // generic canons of the book (by mode / by weekday) that carry this part in the day's mode
        if (modeNorm) for (const [id, k] of Object.entries(canons)) if (['generic_by_mode', 'generic_by_weekday'].includes(k.kind)) { const hs = (k.hymns || []).filter((h) => h.part === part && normMode(h.mode) === modeNorm); if (hs.length && entry.candidates.length < 3) entry.candidates.push({ canonId: id, title: k.title, startPage: (k.pages || [])[0] || null, page: hs[0].page, hymnId: hs[0].id }); }
      }
    }
    if (part === 'mankunk' && !entry.hymns.length && ctx.weekday === 'Sun') { entry.status = 'not_applicable'; entry.needsReview = false; entry.note = 'Mankunk is sung on non-dominical days; this is a Sunday.'; }
    if (part === 'mankunk' && entry.hymns.length && ctx.weekday === 'Sun') { entry.suppressed = true; entry.note = (entry.note ? entry.note + ' ' : '') + 'Mankunk is sung on non-dominical days; this is a Sunday, so it is listed but not part of the day\'s service.'; entry.needsReview = false; }
    parts.push(entry);
  }
  const missing = parts.filter((p) => p.status === 'missing').map((p) => p.part);
  return { schema: 'day-canon/1.0', canons: dayCanons, parts, summary: { primaryCanon: primary ? primary.section : null, present: parts.filter((p) => p.status === 'present').length, fromRubric: parts.filter((p) => p.status === 'from_rubric').length, missing } };
}
