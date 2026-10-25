// Hymns the Tonatsoyts names only by KIND and mode («Հարց մարտիրոսաց», «Օրհնութիւն Ա ձայն», an opening printed in several canons) are found in the
// Sharagnots' GENERIC canons, which the book arranges by category (martyrs, apostles, bishops, ascetics, prophets, repose, penitence, the Cross ...)
// and by mode. The day's canon (engine/canon.mjs) already chooses that generic canon from the category the rubric names, the day's mode, the weekday and
// the season; this pass ties each still-unresolved named hymn to the part of that canon it belongs to:
//   category + mode + hymn type  ->  generic section  ->  the hymn (by its opening when one is printed, else the part's first hymn).
// Nothing is forced: an opening that is not found inside the chosen part stays unresolved, every link states category, mode and section, and every link made here
// is marked needsReview (it rests on the choice of generic canon, not on a printed cross-reference).
import { armKey, normMode, fragments, lev } from './hymns.mjs';
import { partsOfType, kindStemOf, PART_LABEL } from './canon.mjs';

// category words that may appear in a commemoration's title (used only when the rubric itself names no category)
const TITLE_CATEGORIES = [['մարտիրոս', 'մարտիրոս'], ['նահատակ', 'մարտիրոս'], ['վկայ', 'մարտիրոս'], ['հայրապետ', 'հայրապետ'], ['վարդապետ', 'հայրապետ'], ['առաքել', 'առաքել'], ['մարգարէ', 'մարգարէ'], ['աստուածածն', 'աստուածածն'], ['ճգնաւոր', 'ճգնաւոր'], ['խաչ', 'խաչ']].map(([a, b]) => [armKey(a), armKey(b)]);
export function categoriesOfNames(names) {
  const out = new Set();
  for (const n of names || []) { const k = armKey(n); for (const [a, b] of TITLE_CATEGORIES) if (k.includes(a)) out.add(b); }
  return [...out];
}
const CATEGORY_LABEL = { [armKey('մարտիրոս')]: 'martyrs', [armKey('հայրապետ')]: 'bishops / patriarchs', [armKey('առաքել')]: 'apostles', [armKey('մարգարէ')]: 'prophets', [armKey('աստուածածն')]: 'Mother of God', [armKey('ճգնաւոր')]: 'ascetics', [armKey('խաչ')]: 'the Cross', [armKey('հանգստեան')]: 'repose', [armKey('ապաշխար')]: 'penitence', [armKey('նախահարց')]: 'forefathers' };
const labelOfStem = (st) => CATEGORY_LABEL[st] || st;

// an opening as the Tonatsoyts spells it vs as the Sharagnots prints it: same prefix, a few letters apart, or the printed one has lost its initial (dropcap)
function closeOpening(fk, hk) {
  const n = Math.min(fk.length, 12);
  return hk.startsWith(fk.slice(0, n)) || fk.startsWith(hk.slice(0, n)) || (fk.length >= 8 && (lev(fk.slice(0, 10), hk.slice(0, 10), 2) <= 2 || lev(fk.slice(1, 11), hk.slice(0, 10), 2) <= 2));
}

// ctx: { modeArmenian, names, weekday }; resolver: createHymnResolver(...) result (for hymn views)
export function linkGeneric(hr, canon, ctx, resolver) {
  const dayMode = normMode(ctx.modeArmenian);
  const dayCats = categoriesOfNames(ctx.names);
  let linked = 0;
  for (const it of hr.hymns) {
    if (it.resolved || (it.status !== 'unlinked' && it.status !== 'ambiguous')) continue;
    const parts = partsOfType(it.type); if (!parts.length) continue;
    const frs = fragments(it.specIncipit || it.incipit);
    const kindStem = kindStemOf((it.specIncipit || '') + ' ' + (it.type || ''));
    const mode = normMode(it.mode) || dayMode;
    for (const part of parts) {
      const entry = canon.parts.find((p) => p.part === part);
      if (!entry || !['present', 'from_rubric'].includes(entry.status) || !entry.hymns.length) continue;
      if (entry.suppressed) continue;
      const sources = new Set(entry.hymns.map((h) => h.canonId));
      const sectionIsGeneric = ['generic_kind', 'generic_rule', 'generic_same_canon', 'generic_weekday_orhnutyun', 'generic_eight_modes', 'generic_mode_beginnings', 'generic_friday_repose', 'canon'].includes(entry.source);
      if (!sectionIsGeneric) continue;
      let pool = entry.hymns.filter((h) => !h.mode || normMode(h.mode) === mode); if (!pool.length) pool = entry.hymns;
      let pick = null, how = '', conf = 0.6;
      if (frs.length) {
        const hits = pool.filter((h) => frs.some((f) => { const hk = armKey(h.incipit); const n = Math.min(f.key.length, 12); return hk.startsWith(f.key.slice(0, n)) || f.key.startsWith(hk.slice(0, n)); }));
        const fuzzy = hits.length ? hits : pool.filter((h) => frs.some((f) => f.key.length >= 8 && lev(f.key.slice(0, 10), armKey(h.incipit).slice(0, 10), 2) <= 2));
        if (fuzzy.length === 1) { pick = fuzzy[0]; how = hits.length ? 'its opening is printed in this part' : 'its opening matches a hymn of this part up to spelling'; conf = hits.length ? 0.8 : 0.65; }
      } else if (pool.length === 1) { pick = pool[0]; how = 'the only hymn of this part in this mode'; conf = 0.75; }
      else if (pool.length > 1 && !frs.length) { pick = pool.find((h) => !h.subpart) || pool[0]; how = `the rubric names no opening; this part has ${pool.length} hymns in this mode in the generic canon, the first is shown`; conf = 0.55; }
      if (!pick && frs.length && normMode(it.mode)) {
        // the opening is not in the part the day's rule chose, but the rubric gives its own mode: look for it among the hymns of this part in that mode
        const m = normMode(it.mode);
        const near = [...resolver.hymnById.values()].filter((h) => h.m === m && partsOfType(h.category || '').includes(part) && frs.some((f) => closeOpening(f.key, armKey(h.incipit))));
        const ids = [...new Set(near.map((h) => h.id))];
        if (ids.length === 1) { const h = near[0]; pick = { hymnId: h.id, canonId: h.section }; how = 'the only hymn of this part and mode whose opening matches (spelling variants allowed)'; conf = 0.6; }
      }
      if (!pick && /ասա(?:սցես)?\s*$/i.test(String(it.specIncipit || it.incipit || '').trim())) {
        // a cross reference: «Համբարձի զՀռիփսիմեանցն ասա» = "say the Hampartsi of the Hripsimian canon"
        const m = /(?:^|\s)զ(\S{5,})/.exec(String(it.specIncipit || it.incipit));
        const stem = m && armKey(m[1]).replace(/ն$/, '').replace(/ց$/, 'ց');
        if (stem && stem.length >= 6) {
          const secs = [...resolver.sections.values()].filter((x) => (x.title || '').trim() && armKey(x.title).includes(stem.slice(0, Math.max(6, stem.length - 2))) && ['full_canon', 'partial', 'generic_by_mode', 'generic_by_weekday'].includes(x.kind));
          if (secs.length === 1) {
            const hs = [...resolver.hymnById.values()].filter((h) => h.section === secs[0].id && partsOfType(h.category || '').includes(part) && (!normMode(it.mode) || !h.m || h.m === normMode(it.mode)));
            if (hs.length >= 1) { pick = { hymnId: hs[0].id, canonId: secs[0].id }; how = `the rubric refers to this canon («${m[0].trim()} ասա»)${hs.length > 1 ? `; its ${hs.length} hymns of this part, the first is shown` : ''}`; conf = hs.length === 1 ? 0.75 : 0.6; }
          }
        }
      }
      if (!pick) continue;
      const h = resolver.hymnById.get(pick.hymnId); if (!h) continue;
      const cat = kindStem ? labelOfStem(kindStem) : (dayCats.length ? dayCats.map(labelOfStem).join(' / ') : null);
      const sec = resolver.sections.get(pick.canonId) || {};
      const basis = `generic_by_mode: ${cat ? `category ${cat}, ` : ''}mode ${mode || 'not determined'}, ${PART_LABEL[part].replace(/ \(.*\)/, '')} in «${String(sec.title || '').replace(/\s+/g, ' ').trim()}» (p${(sec.pages || [])[0] || '?'}): ${how}`;
      const old = it.candidates;
      it.resolved = { ...resolver.view(h), basis, confidence: conf, generic: { category: cat, categorySource: kindStem ? 'named by the Tonatsoyts rubric' : (dayCats.length ? "the day's commemoration title" : null), mode: mode || null, part, sectionId: pick.canonId, sectionTitle: sec.title || null, sectionPage: (sec.pages || [])[0] || null, hymnsInPart: pool.length } };
      it.status = 'linked_section'; it.basis = basis; it.confidence = conf; it.candidates = (old || []).filter((c) => c.hymnId !== h.id).slice(0, 2);
      it.needsReview = true; it.method = 'generic_by_mode';
      pick.namedByRubric = true;
      linked++;
      break;
    }
  }
  return { linked, categories: dayCats };
}
