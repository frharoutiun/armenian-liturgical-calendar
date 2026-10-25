# Hymnal data: how the Krapar corpus and our Unicode-anchored Sharagnots are combined

Built by `python3 tools/build_data.py` (deterministic; byte-identical on re-run), then `python3 tools/apply_patches.py` (produces `sharagan.js`).
Inputs: `vendor/krapar-upstream/` (verbatim snapshot of `frharoutiun/Armenian-Church-Tools/sharagan/`, commit in `UPSTREAM_COMMIT.txt`)
and the project's `output/sharagnots_anchored/` (8,497 stanzas of the 1888 Etchmiadzin Sharagnots: Unicode wording backbone + our catalog
structure + scan pages; the reading text keeps the book's inserted ը and uses OUR word wherever a page check or a rule kept ours).

## Rule
1. **Krapar sections keep everything.** The 116 sections (ids 0-115) keep their verified corrected-spelling text, English translations,
   identifiers, phrase alignments (`alignments.json`), scripture references (`stanza-refs.json`) and facets (`facets.json`). `text` and `en`
   are never altered (tested).
2. **Every Krapar verse is linked to the anchored stanza it corresponds to** (98.3% of the 4,654 verses). Word-bigram containment on a
   matching-only skeleton (schwa, ու/ւ, օ/ո folded, first four letters of each word), voted per Krapar stanza so stock refrains resolve inside
   the right hymn. Added fields (all optional): `a` anchored stanza id (`AS-...`), `p` scan pages, `l` estimated [col, line, col, line] span,
   `m` match percent, `rd` the scan reading when it differs from the Krapar spelling (shown under "Scan reading (1888 print spelling)"),
   `rv` number of words that differ from the typed Unicode text and have not been checked against the page.
3. **Anchored stanzas that no Krapar verse claims** (about 4,300) become the "Scan supplement (not in Krapar)" category: one section per catalog
   section, one stanza per hymn, one verse per anchored stanza (`src:"scan"`), text = anchored reading, no English (AI slot). Marked with a
   badge and a note; `fb` = no Unicode counterpart (our transcription only); `rv` as above.
4. **Search**: `search-index.json` / `word-forms.json` extend the upstream lemma index with the supplement text. Lemma lookup uses the form,
   the schwa-stripped form (rule `schwa-strip-1.0`) and the form without any ը; the app also retries a failing Armenian query without the
   inserted ը. Words with no known lemma become their own lemma (no morphological analysis is claimed for them).
5. **AI translations**: `data/ai-en.json` `{"label": "AI translation (Claude)", "items": {"AS-...": "text" | {"t": "text"}}}`, keyed by the anchored
   stanza id; attached to verses with that `a`. The UI always shows the label. **One English per stanza (decision E1, 2026-10-25):** a Krapar verse
   (`en` present) shows the English published with the Krapar Sharagnots, labelled "AI translation (Krapar Sharagnots)" (the owner confirmed it is
   machine-generated too); a verse without `en` (scan supplement) shows ours, "AI translation (Claude)". Our translation of a Krapar verse stays in
   `ai-en.json` but is not displayed (evidence: output/site_build/E1_REPORT.md: on 4,569 Krapar stanzas the two are about equal in wording, Krapar's is
   complete and written for the displayed Armenian, ours has 108 cut-offs, 52 too-short and about 66 clear mismatches where the translated reading is a
   different stanza from the displayed Krapar one).
6. **Scan viewer**: `pages/pNNN.jpg` (1100 px wide copies of the 513 scan pages), `data/scan-geometry.json` (column/line boxes). The yellow
   band is an estimate (it can be a line or two off); the page itself is the source of truth.
7. **Calendar links**: `data/anchor-map.json` maps anchored stanza id -> [section, stanza, verse index] and catalog hymn id (`SH...`) ->
   [section, stanza]; `window.LCS.openByHymnId / openByAnchor / openHymn` open them.

## Provenance and review status shown to readers
Blue badge "Scan supplement"; amber badges "scan transcription only" and "N unchecked wording"; every AI translation carries its label.
`data/build-report.json` has the counts (links, supplement size, tokens added).

## Not done / limits
* Krapar section headings are not rewritten: our catalog titles are used only for supplement sections.
* The scan highlight uses estimated line spans; the match score `m` is a containment percentage, not a proof (spot-check with the scan button).
* No new morphological analysis for supplement words (see 4).
