// generic-chants.mjs (C1) - resolves a printed rubric such as "մարտիրոսաց ՚ի ձայնէն" ("martyrs, from the mode") to the Zhamagirk's GENERIC verse.
// The Tonatsoyts does not name a verse for these chants: the verse is the Zhamagirk's generic entry for the CATEGORY (martyrs, fast days, Resurrection)
// in the MODE of the day (ԱՁ ԱԿ ԲՁ ԲԿ ԳՁ ԳԿ ԴՁ ԴԿ). Table: data/calendar/generic_chants.json (built by pipeline/s122 from the owner's typed Zhamagirk).
// Nothing is guessed: if the category or the mode cannot be determined, or the Zhamagirk has no entry, status is 'unresolved' and the page says so.
const norm = (m) => String(m || '').normalize('NFC').toUpperCase().replace(/\s+/g, '');
const CAT_LABEL = { martyrs: 'martyrs', fast_days: 'fast days', resurrection: 'Resurrection' };
const KIND_LABEL = { alleluia: 'alleluia', mesedi: 'mesedi', psalm: 'psalm' };

export function dayCategory(desc, ctx) {
  if (desc.category && desc.category !== 'by_day') return { category: desc.category, basis: 'rubric word', method: 'rubric_word', confidence: 0.95, alternatives: [], why: 'the printed rubric names the category' + (desc.category_word ? ' (' + desc.category_word + ')' : '') };
  const rec = desc.by_record && desc.by_record[String(ctx.recordOrdinal)];
  if (rec && rec.category && /^sun/i.test(ctx.weekday || '') && rec.category !== 'resurrection' && (rec.alternatives || []).includes('resurrection')) return { category: 'resurrection', basis: "a Sunday (the commemoration's title also names " + rec.category + ')', method: 'title_pattern+sunday', confidence: 0.65, alternatives: [rec.category], why: 'a Sunday takes the Resurrection verses; the title also matches ' + rec.category, record_name: rec.record_name };
  if (rec && rec.category) return { category: rec.category, basis: "the carrying commemoration's title", method: rec.method, confidence: rec.confidence, alternatives: rec.alternatives || [], why: rec.why, record_name: rec.record_name };
  if (/^sun/i.test(ctx.weekday || '')) return { category: 'resurrection', basis: 'Sunday', method: 'weekday', confidence: 0.6, alternatives: [], why: 'a Sunday takes the Resurrection verses', record_name: rec && rec.record_name };
  if (ctx.fasting && ctx.fasting.status === 'fast' && !/^sun/i.test(ctx.weekday || '')) return { category: 'fast_days', basis: 'fast day', method: 'fasting', confidence: 0.6, alternatives: [], why: 'the day is a fast day', record_name: rec && rec.record_name };
  return { category: null, basis: 'not determined', method: 'none', confidence: 0, alternatives: (rec && rec.alternatives) || [], why: (rec && rec.why) || 'the rubric names no category and the commemoration does not settle it', record_name: rec && rec.record_name };
}

export function resolveGeneric(desc, ctx, table) {
  const cat = dayCategory(desc, ctx);
  const mode = norm(ctx.mode);
  const inputs = { kind: desc.kind, category: cat.category, category_basis: cat.basis, category_method: cat.method, category_confidence: cat.confidence, category_alternatives: cat.alternatives, category_why: cat.why,
    commemoration: cat.record_name || null, commemorations_today: ctx.commemorations || [], mode: mode || null, mode_basis: mode ? "the engine's mode of the day" : null };
  const fail = (why) => ({ status: 'unresolved', inputs, why, text: 'generic verse (Zhamagirk), ' + why, review_status: 'needs_review' });
  if (!cat.category) return fail('category not determined');
  if (!mode) return fail('mode not determined');
  const fam = table && table.families && table.families[desc.kind + '/' + cat.category];
  if (!fam || fam.missing) return fail('the Zhamagirk has no generic ' + (KIND_LABEL[desc.kind] || desc.kind) + ' for the ' + (CAT_LABEL[cat.category] || cat.category) + ' category');
  const es = fam.modes && fam.modes[mode];
  if (!es || !es.length) return fail('the Zhamagirk section for ' + (CAT_LABEL[cat.category] || cat.category) + ' has no entry for mode ' + mode);
  const entries = es.map((e, gi) => ({ gkey: desc.kind + '/' + cat.category + '|' + mode + '|' + gi, role: e.role, armenian_full: e.text, page: e.page, arak29_ref: e.arak29_ref || null, english_ref_kjv: e.english_ref_kjv || null, english_full: e.english_full || null, english_ref_esv_lookup: e.english_ref_esv_lookup || null, pointer_to: e.pointer_to || null, armenian_bible_full: e.armenian_bible_full || null }));
  const pages = [...new Set(entries.map((e) => e.page))];
  const provenance = 'from the Zhamagirk, generic ' + (CAT_LABEL[cat.category] || cat.category) + ' ' + (KIND_LABEL[desc.kind] || desc.kind) + ' verse in mode ' + mode + ', p.' + pages.join('/');
  const inferred = cat.method !== 'rubric_word' || (cat.alternatives || []).length > 0;
  return { status: 'resolved', inputs, family: { heading: fam.heading, page: fam.page }, entries, provenance, review_status: inferred ? 'needs_review' : 'auto_accepted', confidence: inferred ? Math.min(cat.confidence, 0.7) : 0.9 };
}
