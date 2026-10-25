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
export const lev = (a, b, max) => { if (Math.abs(a.length - b.length) > max) return max + 1; const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };

// rubric directions that name no opening: «զերեք Ողորմեայսն ասասցես», «զՈղորմեայն ասա», «ըստ կարգին»
const DIRECTION = /(?:^|\s)ասա(?:սցես|սցեն)?(?:\s|$)|ըստ\s+կարգի/i;
const MARKERS = /ց\s*վերջ[ըն]?|իւր\s+սար(?:օ|ո)?ք[ըն]?|…|\.{2,}/gi;   // "to the end", "with its own arrangement", ellipses
// "Ի գերեզման. և Եկին 'ի գերեզման. և Ձայն աւետաւոր" -> three openings
// a rubric word that names a KIND of canon (martyrs', repose, penitence...) is not an opening: it must never be matched as one
const KIND_WORDS = new Set(['հանգստեան', 'ապաշխարութեան', 'մարտիրոսաց', 'աստուածածնի', 'խաչի', 'առաքելոց', 'հայրապետաց', 'մարգարէից', 'կուսանաց', 'ճգնաւորաց', 'յարութեան', 'հոգեգալստեան', 'հոգեգալուստ', 'ապաշխարութիւն', 'ողբ', 'երգ', 'միաբանական'].map(armKey));
export function fragments(incipit) {
  // «Մարտիրոսաց ՚ի ձայնէն»: "the martyrs' hymn, from the mode" is a pointer to a generic canon (engine/generic.mjs), not an opening
  const s = String(incipit || '').replace(MARKERS, ' ').replace(/(?:^|\s|[՚'’ʼ])ի\s+ձայնէն/gi, ' ').replace(/[()\[\]]/g, ' ');
  return s.split(/[.։:;]\s*|\s+(?:և|եւ)\s+/).map((x) => x.trim().replace(/^(?:և|եւ)\s+/, '')).map((x) => ({ text: x, key: armKey(x) })).filter((x) => x.key.length >= 4 && !KIND_WORDS.has(x.key));
}

export function createHymnResolver(hymnIdx, openings, helpers = {}) {
  const partsOfType = helpers.partsOfType || (() => []);
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
  // F2: the Echmiadzin TOC's own wording of an opening (hymn_aliases.json: key, hymn id, part, mode, pages), tied to the hymn it stands for by incipit + page
  const aliasByPrefix = new Map();
  for (const row of helpers.aliases || []) { const k4 = row[0].slice(0, 4); if (k4.length < 4) continue; if (!aliasByPrefix.has(k4)) aliasByPrefix.set(k4, []); aliasByPrefix.get(k4).push(row); }
  const byPrefix = new Map();
  for (const h of hymns.concat(stanzaRows)) { const k = (h.key || '').slice(0, 4); if (k.length < 4) continue; if (!byPrefix.has(k)) byPrefix.set(k, []); byPrefix.get(k).push(h); }
  const stemDf = new Map();
  const dfOf = (st) => { if (!stemDf.has(st)) { let n = 0; for (const ws of secWords.values()) if (ws.some((w) => w.startsWith(st))) n++; stemDf.set(st, n); } return stemDf.get(st); };

  function candidatesFor(fragKey) {
    const n = Math.min(fragKey.length, 12), pre = fragKey.slice(0, 4), out = [];
    const buckets = byPrefix.get(pre) || [];
    for (const h of buckets) { const hk = h.key; if (hk.startsWith(fragKey.slice(0, n)) || fragKey.startsWith(hk.slice(0, n))) out.push(h); }
    if (!out.length && fragKey.length >= 6) {   // not printed as such: the reference list's wording of the opening names the hymn
      const seen = new Set();
      for (const [ak, hid, part] of aliasByPrefix.get(pre) || []) {
        const m = Math.min(fragKey.length, ak.length, 12);
        if (ak.slice(0, m) === fragKey.slice(0, m) && m >= 6 && !seen.has(hid) && hymnById.get(hid)) { seen.add(hid); out.push({ ...hymnById.get(hid), viaAlias: part }); }
      }
    }
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
      if (!it.cands.length && it.frag && DIRECTION.test(it.frag.text)) { base.kind = 'direction'; base.basis = `a direction of the rubric, not an opening: «${it.frag.text}»`; out.push(base); continue; }
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
      // several hymns still share the opening: narrow by what the rubric itself says (H3). Each step keeps the pool only when it leaves at least one hymn,
      // and a decision is taken only when exactly one hymn is left.
      const nBefore = uniq.length; const narrowSteps = [];
      if (uniq.length > 1) {
        const parts = partsOfType(it.spec.type);
        if (parts.length) { const labelled = uniq.filter((h) => h.category && partsOfType(h.category).length); const fit = labelled.filter((h) => partsOfType(h.category).some((p) => parts.includes(p))); if (fit.length && fit.length < uniq.length && fit.length >= 1) { const keep = new Set(fit.map((h) => h.id + '/' + h.stanzaN)); const rest = uniq.filter((h) => !labelled.includes(h) || keep.has(h.id + '/' + h.stanzaN)); uniq.splice(0, uniq.length, ...rest); if (rest.length < nBefore) narrowSteps.push('hymn type'); } }
      }
      if (uniq.length > 1 && it.frag) {   // the rubric prints more of the opening than the first words: the printed hymn that shares most of it wins by a clear margin
        const pl = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
        const sc = uniq.map((h) => ({ h, n: pl(it.frag.key, h.key) })).sort((a, b) => b.n - a.n);
        if (sc[0].n >= Math.min(it.frag.key.length, 14) && sc[0].n - sc[1].n >= 3) { uniq.splice(0, uniq.length, sc[0].h); narrowSteps.push('longer shared opening'); }
      }
      if (uniq.length > 1 && (ctx.categoryStems || []).length) {   // the day's category (martyrs, apostles ...) names the canon the hymn belongs to
        const inCat = uniq.filter((h) => { const t = secKey.get(h.section) || ''; return ctx.categoryStems.some((c) => t.includes(c)); });
        if (inCat.length === 1) { uniq.splice(0, uniq.length, inCat[0]); narrowSteps.push("the day's category"); }
      }
      if (uniq.length > 1) {   // F2: several hymns print this opening, and the Echmiadzin TOC lists it at only one of them: the others are repeats / cross-references
        const listed = uniq.filter((h) => h.ref_listed && h.ref_listed.length);
        if (listed.length === 1) { uniq.splice(0, uniq.length, listed[0]); narrowSteps.push('the only occurrence the Echmiadzin TOC lists'); }
      }
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
        const narrowed = nBefore > 1 && narrowSteps.length && uniq.length === 1;
        const stronglyDay = st && (st.cover >= 3 || st.title >= 1.0 || primary);
        const strong = (unique && (it.fuzzy ? false : (it.frag ? it.frag.key.length >= 6 : false))) || (!elsewhere.length && st && (st.cover >= 2 || st.title >= 0.5)) || (elsewhere.length && stronglyDay);
        base.resolved = { ...view(h), basis: '' };
        base.status = strong && !narrowed ? 'linked_exact' : 'linked_section';
        base.basis = (it.fuzzy ? 'opening matches a hymn of the day\'s canon up to spelling' : unique ? 'the only place in the Sharagnots where this opening is printed' : `opening found in the day's canon (${st ? `${st.cover} of the day's openings` : ''}${st && st.title >= 0.5 ? ', feast name in the canon title' : ''}${it.mode ? ', mode agrees' : ''})`) + (primary ? '; the canon named by the day\'s feast outranks the other canons holding this opening' : '') + (it.cands.length > 1 && !st ? '; chosen by mode' : '') + (elsewhere.length ? `; the same opening is also printed in ${elsewhere.length} other canon${elsewhere.length > 1 ? 's' : ''}` : '');
        if (narrowed) base.basis += `; ${nBefore} hymns share this opening, narrowed to one by ${narrowSteps.join(' and ')}`;
        if (h.viaAlias) base.basis += `; the opening is not printed in this spelling: the Echmiadzin TOC lists it as «${h.viaAlias}» at this hymn`;
        base.resolved.basis = base.basis; base.confidence = narrowed ? 0.65 : strong ? (unique ? 0.95 : 0.85) : 0.65; base.resolved.confidence = base.confidence;
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
  return { resolve, hymnById, sections, view: (h) => view(h) };
}
