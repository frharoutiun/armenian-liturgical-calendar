// Cue lines (data/calendar/cue_lines.json): at the end of a few canons the book prints «Ճաշու: <opening>» and «Համբարձի: <opening>»,
// the opening words of the hymn of that canon that serves as its Jashoo / Hampartsi. The hymn named stays where it is in the canon;
// it is ALSO served as the part the cue names (the same mechanism as a margin naming two parts), and carries the cue as provenance.
export function applyCueLines(canons, cueLines) {
  const out = { ...canons };
  for (const c of (cueLines && cueLines.cues) || []) {
    const k = out[c.canonId];
    if (!k || !c.target) continue;
    const has = (h) => h.part === c.part || (h.also || []).includes(c.part);
    const already = (k.hymns || []).filter(has);
    const cue = { label: c.label, labelHy: c.labelHy, part: c.part, printed: c.printed, page: c.page, method: c.printed_method, reviewStatus: c.review_status, confidence: c.confidence, note: c.note || '' };
    const hymns = (k.hymns || []).map((h) => {
      // the part already has its own hymn (p337: the cue is held as its own stanza): attach the cue to that hymn, add nothing
      if (already.length) return already.includes(h) ? { ...h, cues: [...(h.cues || []), cue] } : h;
      if (h.id !== c.target.hymnId) return h;
      return { ...h, cues: [...(h.cues || []), cue], also: [...new Set([...(h.also || []), c.part])].filter((x) => x !== h.part) };
    });
    out[c.canonId] = { ...k, hymns };
  }
  return out;
}
