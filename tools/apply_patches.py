#!/usr/bin/env python3
"""Produce the site's sharagan.js from the vendored upstream (frharoutiun/Armenian-Church-Tools, sharagan/sharagan.js).

Every change is a documented, anchored replacement (each anchor must occur exactly once), so the upstream behaviour
(search, concordance, transliteration, phrase links, scripture reference mode, themes, history) is preserved and our
additions are easy to see. Re-run after updating the vendored snapshot:   python3 tools/apply_patches.py
Additions (see docs/DATA.md):
  P1  load optional data/ai-en.json (AI translations, filled by W2) and attach them to verses by anchored id
  P2  helpers: english block (human translation / AI translation labelled / pending), provenance + scan buttons
  P3  reading mode + whole-canon: show the helpers
  P4  English search also covers AI translations
  P5  Armenian search is schwa-insensitive (retries with the epenthetic ը, then every ը, removed)
  P6  window.LCS API so the calendar tab can open hymns by section/stanza or by anchored id
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
SRC = os.path.join(SITE, "vendor", "krapar-upstream", "sharagan.js")
DST = os.path.join(SITE, "sharagan.js")

s = open(SRC, encoding="utf-8").read()


def sub(anchor, new, label):
    global s
    n = s.count(anchor)
    if n != 1:
        sys.exit("patch %s: anchor occurs %d times" % (label, n))
    s = s.replace(anchor, new)


# P1 --- load AI translations
sub('''      fetch("data/alignments.json").then(function (r) { return r.json(); }).catch(function () { return {}; }),
    ]).then(function (results) {''',
    '''      fetch("data/alignments.json").then(function (r) { return r.json(); }).catch(function () { return {}; }),
      fetch("data/ai-en.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    ]).then(function (results) {''', "P1a")
sub('''      alignments = results[4];
    });''',
    '''      alignments = results[4];
      applyAiTranslations(results[5]);
    });''', "P1b")

# P2 --- helpers (inserted before stanzaLabel)
HELPERS = r'''
  // ---- additions for the Liturgical Calendar site (see docs/DATA.md) ----
  // AI translations (data/ai-en.json, {items: {anchoredId: "text" | {t: "text"}}}) are attached to verses by their
  // anchored stanza id (verse.a). They are ALWAYS shown with the label "AI translation (Claude)".
  function applyAiTranslations(data) {
    var items = (data && data.items) || {};
    var label = (data && data.label) || "AI translation (Claude)";
    corpus.forEach(function (section) {
      section.stanzas.forEach(function (stanza) {
        stanza.verses.forEach(function (verse) {
          var hit = verse.a && items[verse.a];
          if (hit) verse.ai = { t: typeof hit === "string" ? hit : hit.t, label: label };
        });
      });
    });
  }

  function pageSpan(pages) {
    if (!pages || !pages.length) return "";
    var a = pages[0], b = pages[pages.length - 1];
    return a === b ? String(a) : a + "–" + b;
  }
  function scanButtonHtml(pages, loc, text) {
    if (!pages || !pages.length) return "";
    return '<button type="button" class="scan-btn" data-scan-page="' + pages[0] + '"'
      + (loc ? ' data-scan-loc="' + loc.join(",") + '"' : "")
      + ' data-scan-pages="' + pages.join(",") + '">' + escapeHtml(text || "Show scan page") + " " + pageSpan(pages) + '</button>';
  }
  function englishBlockHtml(verse, pairs, groupPrefix, scripturePairs, activeTab, whole) {
    if (verse.en) {
      // E1 decision: ONE English per stanza. Krapar verses show the English published with the Krapar Sharagnots (machine-generated:
      // labelled honestly); stanzas outside the Krapar corpus show our Claude translation below.
      var KLABEL = '<span class="ai-label ai-label-krapar" title="Machine translation published with the Krapar Sharagnots hymnal; not reviewed by a person">AI translation (Krapar Sharagnots)</span> ';
      return whole
        ? '<div class="whole-verse-en">' + KLABEL + escapeHtml(verse.en) + '</div>'
        : '<div class="verse-english">' + KLABEL + renderEnglishVerseHtml(verse.text, verse.en, pairs, groupPrefix, scripturePairs, activeTab) + '</div>';
    }
    if (verse.ai && verse.ai.t) {
      return '<div class="' + (whole ? "whole-verse-en" : "verse-english") + ' ai-translation">'
        + '<span class="ai-label" title="Machine translation, not reviewed by a person">' + escapeHtml(verse.ai.label || "AI translation (Claude)") + '</span> '
        + escapeHtml(verse.ai.t) + '</div>';
    }
    return '<div class="' + (whole ? "whole-verse-en" : "verse-english") + ' pending">English translation not yet available for this verse.</div>';
  }
  function verseMetaHtml(section, verse) {
    var parts = [];
    if (verse.p) parts.push(scanButtonHtml(verse.p, verse.l));
    if (verse.src === "scan") {
      var ATTR = "Text: Unicode edition prepared by Fr Ghevond Ajemian, checked against the scan";
      if (verse.ts === "u" || verse.ts === "uc") parts.push('<span class="prov-badge prov-scan" title="' + ATTR + (verse.ts === "uc" ? "; " + verse.cn + " word(s) corrected where the printed page proved the typed word wrong" : "") + '">Unicode text (Ajemian)</span>');
      else if (verse.ts === "ur") parts.push('<span class="prov-badge prov-scan" title="This stanza is a cue in the scan; the wording shown is the same text printed in full on scan page ' + (verse.ur || []).join(", ") + ' (' + ATTR + '). Matched by machine, not yet reviewed.">Unicode text (same wording as p.' + (verse.ur || []).join(", ") + ')</span>');
      else parts.push('<span class="prov-badge prov-warn" title="No reliable counterpart in the Unicode edition for this stanza; this is our transcription of the scan with print marks removed">transcription only, not yet proofread</span>');
      if (verse.al) parts.push('<span class="prov-badge prov-warn" title="Weak word overlap between the Unicode text and our transcription of this stanza: check against the scan">check against scan</span>');
    }
    if (verse.a2 && verse.a2.length && verse.p && verse.p.length > 1) parts.push('<span class="prov-badge prov-scan" title="This stanza runs over a column or page break in the print; the continuation was joined to its opening">continues over a page break (p.' + verse.p.join("\u2013") + ')</span>');
    if (verse.x) parts.push('<span class="prov-badge prov-warn" title="The print gives only a cue here (' + escapeHtml(verse.x.c) + '). The rest of the refrain is completed from ' + (verse.x.f ? "the same hymn" : "the Krapar/W1 expansion of the same hymn") + ' (rule: ' + escapeHtml(verse.x.r) + ', confidence ' + escapeHtml(verse.x.k) + '). Check against the scan.">cue completed</span>');
    var html = parts.length ? '<div class="verse-meta">' + parts.join(" ") + '</div>' : "";
    if (verse.x) html += '<div class="cue-completed">Printed cue: <span class="script-original" lang="hy">' + escapeHtml(verse.x.c) + '</span> &rarr; completed: <span class="script-original cue-added" lang="hy">' + escapeHtml(verse.x.a) + '</span></div>';
    if (verse.o) {
      html += '<details class="scan-reading"><summary>Scan transcription (unreviewed)</summary><div class="script-original" lang="hy">'
        + escapeHtml(verse.o) + '</div></details>';
    }
    if (verse.rd) {
      html += '<details class="scan-reading"><summary>Scan reading (1888 print spelling)</summary><div class="script-original" lang="hy">'
        + escapeHtml(verse.rd) + '</div></details>';
    }
    return html;
  }
  function stanzaPages(stanza) {
    var set = {};
    stanza.verses.forEach(function (v) { (v.p || []).forEach(function (p) { set[p] = 1; }); });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }

  function stanzaLabel(stanza, idx) {'''
sub("\n  function stanzaLabel(stanza, idx) {", HELPERS, "P2")

# P3 --- reading mode
sub('''      if (verse.en) {
        html += '<div class="verse-english">' + renderEnglishVerseHtml(verse.text, verse.en, pairs, groupPrefix, scripturePairs, scriptureActiveTab) + '</div>';
      } else {
        html += '<div class="verse-english pending">English translation not yet available for this verse.</div>';
      }
      if (hasScripture)''',
    '''      html += englishBlockHtml(verse, pairs, groupPrefix, scripturePairs, scriptureActiveTab, false);
      html += verseMetaHtml(section, verse);
      if (hasScripture)''', "P3a")
sub('''    html += '<div class="verse-progress">Sharagan ' + (stanzaIdx + 1) + ' of ' + section.stanzas.length + '</div>';''',
    '''    html += '<div class="verse-progress">Sharagan ' + (stanzaIdx + 1) + ' of ' + section.stanzas.length + '</div>';
    var hymnPages = stanzaPages(stanza);
    if (hymnPages.length) html += '<div class="hymn-scan-row">' + scanButtonHtml(hymnPages, null, "Show scan page(s) of this Sharagan") + '</div>';
    if (section.src === "scan") html += '<div class="supplement-note">This hymn is not in the verified Krapar corpus. The Armenian is the Unicode edition prepared by Fr Ghevond Ajemian, checked against the scan (the printed page is the source of truth: use the scan button); stanzas without a reliable Unicode counterpart show our own transcription and say so. English is provided as an AI translation where available.</div>';''', "P3b")
sub('''        if (verse.en) {
          html += '<div class="whole-verse-en">' + escapeHtml(verse.en) + '</div>';
        } else {
          html += '<div class="whole-verse-en pending">Translation not yet available.</div>';
        }''',
    '''        html += englishBlockHtml(verse, null, "", [], 0, true);
        if (verse.p) html += '<div class="verse-meta">' + scanButtonHtml(verse.p, verse.l, "Scan") + '</div>';''', "P3c")

# P7 --- nicer labels for supplement hymns (no genre code): the hymn incipit as the label, no stray separator before "Mode"
sub("""    var name = info ? info.name : (stanza.type || null);""",
    """    var name = info ? info.name : (stanza.type || null);
    if (!info && stanza.incipit) name = stanza.incipit.length > 30 ? stanza.incipit.slice(0, 30) + "\\u2026" : stanza.incipit;""", "P7a")
sub("""var modeText = (stanza.modes || []).length ? ' &middot; Mode ' + stanza.modes.map(escapeHtml).join(", ") : "";""",
    """var modeText = (stanza.modes || []).length ? (parts.length ? ' &middot; ' : '') + 'Mode ' + stanza.modes.map(escapeHtml).join(", ") : "";""", "P7b")

# P4 --- English search covers AI translations
sub('''        if (entry.verse.en && entry.verse.en.toLowerCase().indexOf(qLower) !== -1) {''',
    '''        var enText = entry.verse.en || (entry.verse.ai && entry.verse.ai.t) || "";
        if (enText && enText.toLowerCase().indexOf(qLower) !== -1) {''', "P4a")
sub('''    if (verse.en) html += '<div class="result-en">' + escapeHtml(verse.en) + '</div>';''',
    '''    if (verse.en) html += '<div class="result-en"><span class="ai-label ai-label-krapar" title="Machine translation published with the Krapar Sharagnots hymnal; not reviewed by a person">AI translation (Krapar Sharagnots)</span> ' + escapeHtml(verse.en) + '</div>';
    else if (verse.ai && verse.ai.t) html += '<div class="result-en"><span class="ai-label">' + escapeHtml(verse.ai.label || "AI translation (Claude)") + '</span> ' + escapeHtml(verse.ai.t) + '</div>';''', "P4b")

# P5 --- schwa-insensitive Armenian search
sub("  function searchArmenian(query) {", "  function searchArmenianRaw(query) {", "P5a")
sub("  function searchEnglish(query) {", r'''  // Schwa-insensitive: the 1888 text writes an epenthetic ը (syllabification) that the verified Krapar text omits.
  // If the query finds nothing, retry without the epenthetic ը (rule schwa-strip-1.0, tools/build_data.py), then without any ը.
  var ARM_VOWELS = "աեէիոօԱԵԷԻՈՕ";
  function stripEpentheticSchwa(text) {
    return text.replace(/[Ա-Ֆա-և]+/g, function (run) {
      var out = "";
      for (var i = 0; i < run.length; i++) {
        var ch = run.charAt(i);
        if ((ch === "ը" || ch === "Ը") && i > 0 && i < run.length - 1) {
          var a = run.charAt(i - 1), b = run.charAt(i + 1);
          if (ARM_VOWELS.indexOf(a) === -1 && a !== "ը" && a !== "Ը" && ARM_VOWELS.indexOf(b) === -1 && b !== "ը" && b !== "Ը") continue;
        }
        out += ch;
      }
      return out;
    });
  }
  function searchArmenian(query) {
    var out = searchArmenianRaw(query);
    if (out.results.length) return out;
    var variants = [stripEpentheticSchwa(query), query.replace(/[ըԸ]/g, "")];
    for (var i = 0; i < variants.length; i++) {
      if (variants[i] && variants[i] !== query) {
        var alt = searchArmenianRaw(variants[i]);
        if (alt.results.length) return alt;
      }
    }
    return out;
  }

  function searchEnglish(query) {''', "P5b")

# P6 --- API for the calendar tab
sub("  // --- boot ---", r'''  // --- API for the calendar tab (calendar.js) and other pages ---
  window.LCS = {
    ready: null,
    corpus: function () { return corpus; },
    anchorMap: null,
    openHymn: function (sectionId, stanzaIdx, verseIdx) {
      if (!corpus || !corpus[sectionId]) return false;
      state.query = ""; if (el.searchInput) el.searchInput.value = "";
      state.openSection = sectionId; state.openStanzaIdx = stanzaIdx || 0;
      state.highlightVerseIdx = (verseIdx === undefined ? null : verseIdx); state.highlightWord = null; state.wholeCanon = false;
      if (window.LCSShowHymnal) window.LCSShowHymnal();
      renderMain();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    },
    openByAnchor: function (anchoredId) {
      var m = window.LCS.anchorMap && window.LCS.anchorMap.stanza && window.LCS.anchorMap.stanza[anchoredId];
      if (!m) return false;
      var loc = locateStanza(corpus[m[0]], m[2]);
      return window.LCS.openHymn(m[0], loc.stanzaIdx, loc.localVerseIdx);
    },
    openByHymnId: function (hymnId) {
      var m = window.LCS.anchorMap && window.LCS.anchorMap.hymn && window.LCS.anchorMap.hymn[hymnId];
      return m ? window.LCS.openHymn(m[0], m[1]) : false;
    }
  };
  fetch("data/anchor-map.json").then(function (r) { return r.json(); }).then(function (m) { window.LCS.anchorMap = m; }).catch(function () {});

  // --- boot ---''', "P6")
sub("""  loadAll().then(function () {
    suppressHistoryPush = true;""", """  window.LCS.ready = loadAll().then(function () {
    suppressHistoryPush = true;""", "P6b")

tmp = DST + ".tmp"
open(tmp, "w", encoding="utf-8").write(
    "/* Derived from frharoutiun/Armenian-Church-Tools sharagan/sharagan.js (commit in vendor/krapar-upstream/UPSTREAM_COMMIT.txt)\n"
    "   by tools/apply_patches.py. Do not edit by hand: edit the patch script and re-run it. */\n" + s)
os.replace(tmp, DST)
print("wrote", DST, len(s))
