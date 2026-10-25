#!/usr/bin/env python3
"""Build the site's hymnal data files (W6).

Combines two sources (documented in docs/DATA.md):
  1. Krapar corpus  (vendor/krapar-upstream/data/*.json, a verbatim snapshot of frharoutiun/Armenian-Church-Tools sharagan/):
     116 sections, verified corrected-spelling text, English translations, phrase alignments, scripture refs, facets.
     Section ids 0..115, text and English are NEVER altered.
  2. Unicode-anchored dataset (project output/sharagnots_anchored/): 8,497 stanzas of the 1888 Sharagnots with scan pages,
     reading text (ours-default, schwa kept), provenance and review flags.

Combination rule:
  * every Krapar verse is linked to the anchored stanza it corresponds to (word-bigram containment, voted per Krapar stanza
    so that stock refrains resolve inside the right hymn). The link adds `a` (anchored id), `p` (scan pages), `l` (estimated
    column/line span), `m` (match %), `rd` (the scan reading when it differs from the Krapar spelling) and `rv` (review flag).
  * every anchored stanza that no Krapar verse claims becomes a verse of a "Scan supplement" section (ids 116+), grouped by
    its catalog section and hymn. Its text is the anchored reading; it has no English (AI translation slot, filled by W2
    through data/ai-en.json); source flag `src:"scan"`.
  * search-index / word-forms are extended for the supplement text (schwa-insensitive: the lemma is looked up on the
    schwa-stripped form too); alignments, stanza-refs and genreInfo are carried over unchanged.

Usage:  python3 tools/build_data.py [--anchored DIR] [--viewer DIR]
Deterministic: running twice gives byte-identical files.
"""
import argparse, collections, hashlib, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import stanza_fixes as SF   # D1: split stanzas, cue completion, neume marks
import display_clean as DC  # A1: artifacts (stray '/', rubric markers, bullets, line-break hyphens ...) out of the DISPLAYED text; raw display text kept in `dr`
SITE = os.path.dirname(HERE)
PROJECT = "/Users/frharoutiun/Documents/Church/Coding/06 - Donatsooyts Digitization"
DEFAULT_ANCHORED = os.path.join(PROJECT, "output", "sharagnots_anchored")
DEFAULT_VIEWER = os.path.join(PROJECT, "output", "sharagnots_viewer")
DEFAULT_W10 = os.path.join(PROJECT, "output", "site_build", "w10")   # Unicode display layer (pipeline/s110_unicode_display_layer.py)
TEXT_SOURCE = {"unicode": "u", "unicode_corrected": "uc", "unicode_repeat": "ur", "ours_cleaned": "oc"}
BASIS_RANK = {"unicode": 0, "unicode_corrected": 1, "unicode_repeat": 2, "ours_cleaned": 3}   # worst basis wins when stanza pieces are merged
W1_EXPANDED = os.path.join(PROJECT, "output", "sharagnots_unicode_proof", "expanded", "expanded_stanzas.json")
D1_OUT = os.path.join(PROJECT, "output", "site_build", "d1")
KRAPAR = os.path.join(SITE, "vendor", "krapar-upstream", "data")

WORD = re.compile(r"[Ա-Ֆա-և]+")
VOWELS = set("աեէիոօ" + "ԱԵԷԻՈՕ")
PROTECTED_STEMS = ("ընկըղմ",)
PROCLITIC_ROOT = re.compile(r"^[զյիսԶՅԻՍ]ը(?:ն[դտկթգձ]|ստ)")


def dump(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    os.replace(tmp, path)


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def ws(t):
    return re.sub(r"\s+", " ", t or "").strip()


def strip_epenthetic(text):
    """schwa-strip-1.0 (see the project's pipeline/schwa.py): remove an epenthetic ը only."""
    out, last = [], 0
    for m in WORD.finditer(text):
        run = m.group(0)
        for i, ch in enumerate(run):
            if ch not in "ըԸ" or not (0 < i < len(run) - 1):
                continue
            a, b = run[i - 1], run[i + 1]
            if a in VOWELS or a in "ըԸ" or b in VOWELS or b in "ըԸ":
                continue
            low = run.lower()
            if any(s in low for s in PROTECTED_STEMS) or (i == 1 and PROCLITIC_ROOT.match(low)):
                continue
            out.append(text[last:m.start() + i])
            last = m.start() + i + 1
    out.append(text[last:])
    return "".join(out)


def skeleton_words(text):
    """matching-only normal form of each word (never shown)."""
    out = []
    for w in WORD.findall(text or ""):
        w = w.lower().replace("ը", "").replace("օ", "ո").replace("ու", "ո").replace("ւ", "").replace("և", "եւ")
        if w:
            out.append(w[:4])
    return out


def bigrams(ws):
    return {(ws[i], ws[i + 1]) for i in range(len(ws) - 1)} if len(ws) > 1 else set(ws)


def collapse_spaced_letters(s):
    """'Ձ Ա Յ Ն Ք Ա Ղ' -> 'ՁԱՅՆՔԱՂ' (the 1888 print letter-spaces some headings)."""
    toks = s.split(" ")
    out, run = [], []
    for t in toks + [""]:
        if len(t) == 1 and t.isalpha():
            run.append(t)
            continue
        if run:
            out.append("".join(run) if len(run) >= 3 else " ".join(run))
            run = []
        if t:
            out.append(t)
    return " ".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--anchored", default=DEFAULT_ANCHORED)
    ap.add_argument("--viewer", default=DEFAULT_VIEWER)
    ap.add_argument("--w10", default=DEFAULT_W10)
    args = ap.parse_args()

    K = load(os.path.join(KRAPAR, "corpus.json"))
    LEX = DC.Lexicon.from_corpus(K)                    # words attested in the verified Krapar text: a line-break hyphen is joined only when the joined word is in it
    dc_queue = []                                      # artifacts we did not dare to fix (reported, not hidden)
    SI = load(os.path.join(KRAPAR, "search-index.json"))
    WF = load(os.path.join(KRAPAR, "word-forms.json"))
    FA = load(os.path.join(KRAPAR, "facets.json"))
    AL = load(os.path.join(KRAPAR, "alignments.json"))
    SR = load(os.path.join(KRAPAR, "stanza-refs.json"))
    A = load(os.path.join(args.anchored, "stanzas.json"))["stanzas"]
    W10 = load(os.path.join(args.w10, "unicode_display_layer.json"))["stanzas"]   # owner decision 2026-10-24: Unicode text is what supplement stanzas display
    W10SEQ = load(os.path.join(args.w10, "unicode_sequence.json"))
    IDX = load(os.path.join(args.anchored, "index.json"))
    vendor_hash = hashlib.sha256(json.dumps(K, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

    # ---- anchored lookups
    by_id = {a["id"]: a for a in A}
    hymn_of = {a["id"]: a["hymn_id"] for a in A}
    hymn_meta = {}
    sec_meta = {s["id"]: s for s in IDX["sections"]}
    for s in IDX["sections"]:
        for h in s["hymns"]:
            hymn_meta[h["id"]] = dict(h, section_id=s["id"])
    bg = []
    inv = collections.defaultdict(set)
    for i, a in enumerate(A):
        b = bigrams(skeleton_words(a["reading"] or a["ours_diplomatic"]))
        bg.append(b)
        for g in b:
            inv[g].add(i)

    # ---- link Krapar verses to anchored stanzas
    TH_ACCEPT = 0.35
    links = {}          # (sec, stanzaIdx, verseIdx) -> (stanza index in A, score)
    claimed = set()
    stats = collections.Counter()
    dc_stats = {}
    for s in K:
        for si, st in enumerate(s["stanzas"]):
            cand = []   # per verse: list of (score, idx)
            for v in st["verses"]:
                kb = bigrams(skeleton_words(v["text"]))
                cnt = collections.Counter()
                for g in sorted(kb):
                    for i in sorted(inv.get(g, ())):
                        cnt[i] += 1
                top = [(c / max(1, len(kb)), i) for i, c in sorted(cnt.items(), key=lambda t: (-t[1], t[0]))[:8]]
                cand.append(top)
            votes = collections.Counter()
            for top in cand:
                best = {}
                for sc, i in top:
                    h = A[i]["hymn_id"]
                    best[h] = max(best.get(h, 0), sc)
                for h, sc in best.items():
                    votes[h] += sc
            hymn = sorted(votes.items(), key=lambda t: (-t[1], t[0]))[0][0] if votes else None
            for vi, top in enumerate(cand):
                pick = None
                for sc, i in sorted(top, key=lambda t: (-t[0], t[1])):
                    if A[i]["hymn_id"] == hymn and sc >= TH_ACCEPT:
                        pick = (i, sc)
                        break
                if pick is None and top and top[0][0] >= 0.7:
                    pick = (top[0][1], top[0][0])
                    stats["fallback_global"] += 1
                if pick:
                    links[(s["id"], si, vi)] = pick
                    claimed.add(pick[0])
                    stats["linked"] += 1
                else:
                    stats["unlinked"] += 1
    total_k = sum(len(st["verses"]) for s in K for st in s["stanzas"])

    # ---- D1: stanzas cut by a column / page break; merged display text; cue completion
    chain = SF.tail_chains(A, [ws(W10[a["id"]]["text"]) for a in A])
    groups = collections.defaultdict(list)          # root head index -> [head, tail, ...] (a stanza cut by column / page breaks)
    for t, hroot in sorted(chain.items()):
        groups[hroot].append(t)
    absorbed = {}          # hidden piece index -> index of the verse that shows it (merged head, or the Krapar verse that is already full)
    carried = collections.defaultdict(list)           # showing index -> [hidden piece indexes]
    tail_audit = []
    for hroot, ts in sorted(groups.items()):
        members = [hroot] + ts
        cl = [m for m in members if m in claimed]
        if len(cl) == 0:
            target, cls = hroot, "merged_into_head"
        elif len(cl) == 1:
            target, cls = cl[0], "hidden_behind_krapar_verse"
        else:
            target, cls = None, "several_pieces_claimed_by_krapar_not_merged"
        for m in members:
            if m == target or target is None:
                continue
            absorbed[m] = target
            carried[target].append(m)
        for t in ts:
            tail_audit.append({"tail": A[t]["id"], "head": A[hroot]["id"], "shown_by": A[target]["id"] if target is not None else None, "class": cls,
                               "pages": [A[hroot]["scan_pages"][-1], A[t]["scan_pages"][0]],
                               "head_text_end": ws(W10[A[hroot]["id"]]["text"])[-40:], "tail_text": ws(W10[A[t]["id"]]["text"])[:60]})
    by_hymn_idx = collections.defaultdict(list)
    for i in range(len(A)):
        if i not in absorbed:
            by_hymn_idx[A[i]["hymn_id"]].append(i)

    def piece_ids(i):
        return sorted([i] + carried.get(i, []))

    def merged_text(i):
        return ws(" ".join(ws(W10[A[j]["id"]]["text"]) for j in piece_ids(i)))

    printed = {i: merged_text(i) for i in range(len(A)) if i not in absorbed}
    def _contains(text, tgt):
        w = [SF.fold(x) for x in SF.split_words(text)]
        return any(w[k:k + len(tgt)] == tgt for k in range(len(w) - len(tgt) + 1))
    try:
        W1 = {r["stanza_id"]: r for r in load(W1_EXPANDED)["records"] if r.get("applied")}
    except OSError:
        W1 = {}
    cue_low = []          # whole-word cues matched only by the same hymn's refrain (unverified): proposed, NOT applied
    completion = {}        # anchored idx -> completion dict (only stanzas shown as scan-supplement verses get it applied below)
    for hid, idxs in by_hymn_idx.items():
        for k, i in enumerate(idxs):
            sid = A[i]["id"]
            if i in claimed:
                continue
            r = None
            if sid in W1:
                hi = W1[sid].get("refrain_holder_stanza_index")
                htxt = printed.get(hi) if isinstance(hi, int) else None
                r = SF.complete_with_w1(printed[i], W1[sid], htxt)
                if r:
                    r["holder"] = A[hi]["id"] if isinstance(hi, int) and htxt else None
                    r["k"] = "high" if r["spelling"] == "unicode" else "medium"
            if not r:
                prev = [(A[j]["id"], printed[j]) for j in reversed(idxs[max(0, k - 6):k])]
                nxt = [(A[j]["id"], printed[j]) for j in idxs[k + 1:k + 5]]
                r = SF.find_expansion(printed[i], prev) or SF.find_expansion(printed[i], nxt)
                if r and r.get("ambiguous"):
                    r = None
                    stats["cue_ambiguous"] += 1
                if r:
                    r["k"] = "medium" if r["rule"].endswith("truncated_cue") else "low"
            if r and r["k"] == "low":
                # F2: a whole-word cue is also taken when the SAME hymn prints the very same words (cue + completion) contiguously in another stanza:
                # the refrain is then attested in the hymn itself (151 of the 181 proposals)
                tgt = [SF.fold(w) for w in SF.split_words(r["cue"] + " " + r["added"])]
                att = [A[j]["id"] for j in idxs if j != i and j not in absorbed and _contains(printed[j], tgt)]
                if att:
                    r["k"] = "medium"; r["rule"] += "+attested_in_hymn"; r["attested_by"] = att[:3]
                    stats["cue_attested_applied"] += 1
            if r and r["k"] == "low":
                cue_low.append({"id": sid, "pages": A[i]["scan_pages"], "printed_end": printed[i][-60:], "cue": r["cue"], "proposed_completion": r["added"], "holder": r.get("holder"), "rule": r["rule"]})
                stats["cue_low_not_applied"] += 1
                r = None
            if r:
                completion[i] = r
        # A1: a whole single-word cue (« ... յուդայի եկայք: ») is taken only when the same hymn completes other stanzas from the same refrain holder
        sib = {completion[i]["holder"] for i in idxs if i in completion and completion[i].get("holder")}
        for k, i in enumerate(idxs):
            if i in claimed or i in completion or not sib:
                continue
            prev = [(A[j]["id"], printed[j]) for j in reversed(idxs[max(0, k - 6):k])] + [(A[j]["id"], printed[j]) for j in idxs[k + 1:k + 5]]
            r = SF.find_single_word_expansion(printed[i], prev, sib, W10[A[i]["id"]].get("ours_transcription") or "")
            if r and r.pop("uncorroborated", False):
                # K3: our diplomatic transcription ends at the cue too (nothing more is printed). The scan crops of 24 of the 36 such stanzas
                # (K3_shots/cues/lowconf_*.png: pages 10-458) show the print ending on the cue word with its terminal sign and a new stanza
                # starting right after, i.e. a printed refrain cue: completed from the same hymn's shared refrain, medium confidence, marked.
                r["k"] = "medium"
                r["rule"] += "+scan_checked_cue"
                completion[i] = r
                stats["cue_single_word_scan_checked_applied"] += 1
            elif r:
                r["k"] = "medium"
                completion[i] = r
                stats["cue_single_word_applied"] += 1

    # ---- build merged corpus
    gname_to_code = {v["name"]: k for k, v in FA["genreInfo"].items()}
    corpus = json.loads(json.dumps(K))  # deep copy; Krapar text/en untouched
    rd_count = 0
    for s in corpus:
        for si, st in enumerate(s["stanzas"]):
            for vi, v in enumerate(st["verses"]):
                link = links.get((s["id"], si, vi))
                if not link:
                    continue
                i, sc = link
                a = A[i]
                v["a"] = a["id"]
                v["p"] = a["scan_pages"]
                if carried.get(i):
                    v["a2"] = [A[t]["id"] for t in sorted(carried[i])]
                    v["p"] = sorted({*a["scan_pages"], *[pg for t in carried[i] for pg in A[t]["scan_pages"]]})
                if a.get("scan_location"):
                    loc = a["scan_location"]
                    v["l"] = [loc["start"]["column"], loc["start"]["line"], loc["end"]["column"], loc["end"]["line"]]
                v["m"] = int(round(sc * 100))
                rd = ws(a["reading"])
                if skeleton_words(rd) != skeleton_words(v["text"]):
                    v["rd"] = rd
                    rd_count += 1
                if a["counts"].get("unconfirmed_wording"):
                    v["rv"] = a["counts"]["unconfirmed_wording"]

    # supplement sections: unclaimed anchored stanzas, grouped by catalog section then hymn
    carry_title = ""
    sec_title = {}
    for s in IDX["sections"]:
        if s["title"]:
            carry_title = collapse_spaced_letters(" / ".join(x.strip() for x in s["title"].split("\n") if x.strip()))
        sec_title[s["id"]] = carry_title
    unclaimed = [i for i in range(len(A)) if i not in claimed and i not in absorbed]
    by_section = collections.OrderedDict()
    for i in unclaimed:
        by_section.setdefault(A[i]["section_id"], []).append(i)
    sec_order = {s["id"]: k for k, s in enumerate(IDX["sections"])}
    next_id = len(corpus)
    sup_modes = collections.Counter()
    anchor_map = {}
    for sid in sorted(by_section, key=lambda x: sec_order[x]):
        idxs = by_section[sid]
        by_hymn = collections.OrderedDict()
        for i in idxs:
            by_hymn.setdefault(A[i]["hymn_id"], []).append(i)
        pages = sorted({p for i in idxs for p in A[i]["scan_pages"]})
        title = sec_title.get(sid) or ""
        first_h = hymn_meta.get(next(iter(by_hymn)), {})
        heading = DC.clean_heading(title or ("ՇԱՐԱԿԱՆ / " + collapse_spaced_letters(first_h.get("incipit", ""))))[0]
        sec = {
            "id": next_id,
            "titleEn": "1888 Sharagnots, scan p. " + (str(pages[0]) if len(pages) == 1 else "%d–%d" % (pages[0], pages[-1])),
            "heading": heading,
            "category": "Scan supplement (not in Krapar)",
            "hymnTypes": [], "modes": [], "stanzas": [], "src": "scan",
        }
        for hid, hi in by_hymn.items():
            hm = hymn_meta.get(hid, {})
            cat = (hm.get("category") or {}).get("expanded") or ""
            code = gname_to_code.get(cat)
            mode = hm.get("mode")
            label = " ".join(x for x in [code or cat, mode] if x) or "ՇԱՐԱԿԱՆ"
            verses = []
            for i in hi:
                a = A[i]
                loc = a.get("scan_location") or {}
                pcs = piece_ids(i)
                lays = [W10[A[j]["id"]] for j in pcs]
                lay = dict(lays[0])
                lay["basis"] = max((l["basis"] for l in lays), key=lambda b: BASIS_RANK[b])
                text = printed[i]
                pages = sorted({pg for j in pcs for pg in A[j]["scan_pages"]})
                v = {"text": text, "a": a["id"], "p": pages, "src": "scan", "ts": TEXT_SOURCE[lay["basis"]]}
                if len(pcs) > 1:
                    v["a2"] = [A[j]["id"] for j in pcs[1:]]            # the tail piece(s) of a stanza cut by a column / page break
                if loc:
                    v["l"] = [loc["start"]["column"], loc["start"]["line"], loc["end"]["column"], loc["end"]["line"]]
                if lay["basis"] == "unicode_corrected":
                    v["cn"] = sum(len(l.get("corrections") or []) for l in lays)          # words corrected against the page (ledger entries in the layer)
                if lay["basis"] == "unicode_repeat":
                    v["ur"] = next(l["repeat_of"]["pages"] for l in lays if l["basis"] == "unicode_repeat")        # the wording is printed in full at these pages
                if lay["basis"] == "ours_cleaned":
                    v["fb"] = 1
                # neume (khaz) signs typed as stress marks (our transcription, and some noise in the Unicode document): kept apart, reversible;
                # the comma sign (055D) is only removed from our own transcription
                clean, marks = SF.split_neumes(text, SF.NEUMES if lay["basis"] == "ours_cleaned" else "\u055b\u055c\u055e")
                if marks:
                    v["text"], v["nm"] = ws(clean), marks
                    stats["neume_marks_removed_from_text"] += len(marks)
                own = " ".join(ws(l["ours_transcription"]) for l in lays if l["ours_transcription"])
                if own and lay["basis"] != "ours_cleaned":
                    clean, marks = SF.split_neumes(own)
                    v["o"] = ws(clean)                                 # diplomatic scan transcription, shown collapsed as "unreviewed"
                    if marks:
                        v["om"] = marks
                        stats["neume_marks_removed_from_o"] += len(marks)
                if any((l.get("alignment") or {}).get("tier") == "low" for l in lays):
                    v["al"] = 1                                # weak word overlap with the transcription: check against the scan
                c = completion.get(i)
                if c:
                    nchars = SF.NEUMES if lay["basis"] == "ours_cleaned" or c.get("spelling") == "book_orthography" else "\u055b\u055c\u055e"
                    added = ws(SF.split_neumes(c["added"], nchars)[0])
                    full = ws(SF.split_neumes(c["full"], nchars)[0])
                    if not full.endswith(added):
                        c = None                                       # never ship a completion that does not end the text
                    elif not SF.has_terminal(full) and SF.has_terminal(v["text"]):
                        # K3: the completion ends where the printed cue ended: keep the printed terminal sign (the refrain holder's text
                        # often carries none, which left 103 completed stanzas without a closing sign)
                        term = v["text"].rstrip()[-1]
                        full += term
                        added += term
                        stats["cue_completed_terminal_restored"] += 1
                if c:
                    v["pt"] = v["text"]                              # the printed text (cue kept), before completion
                    v["text"] = full
                    v["x"] = {"c": c["cue"], "a": added, "n": len(added), "f": c.get("holder"), "r": c["rule"], "k": c["k"]}
                    stats["cue_completed_" + c["k"]] += 1
                DC.clean_verse(v, LEX, dc_stats, dc_queue)       # A1: display artifacts
                verses.append(v)
            st = {"type": label, "hymnTypes": [code] if code else [], "modes": [mode] if mode else [], "verses": verses,
                  "src": "scan", "hy": hid, "incipit": DC.clean_incipit(hm.get("incipit", ""), LEX)[0]}
            sec["stanzas"].append(st)
            for t in st["hymnTypes"]:
                if t not in sec["hymnTypes"]:
                    sec["hymnTypes"].append(t)
            for m in st["modes"]:
                if m not in sec["modes"]:
                    sec["modes"].append(m)
                sup_modes[m] += len(verses)
        corpus.append(sec)
        next_id += 1

    # ---- anchor map: anchored stanza id / hymn id -> [section, stanzaIdx, verseIdx(global in section)]
    for s in corpus:
        g = 0
        for si, st in enumerate(s["stanzas"]):
            for vi, v in enumerate(st["verses"]):
                if v.get("a"):
                    anchor_map.setdefault(v["a"], [s["id"], si, g + vi])
            g += len(st["verses"])
    absorbed_map = {}
    for s_ in corpus:
        g_ = 0
        for st_ in s_["stanzas"]:
            for vi_, v_ in enumerate(st_["verses"]):
                for a2 in v_.get("a2") or []:
                    absorbed_map[a2] = v_["a"]
                    if v_["a"] in anchor_map:
                        anchor_map[a2] = anchor_map[v_["a"]]
            g_ += len(st_["verses"])
    hymn_map = {}
    for hid, hm in hymn_meta.items():
        ids = hm.get("stanza_ids") or []
        for aid in ids:
            if aid in anchor_map:
                hymn_map[hid] = anchor_map[aid][:2]
                break

    # ---- search index + word forms for the supplement sections
    rev = {}
    for lemma, forms in WF.items():
        rev.setdefault(lemma, lemma)
        for f in forms:
            rev.setdefault(f.lower(), lemma)
    SI = {k: list(v) for k, v in SI.items()}
    WF = {k: list(v) for k, v in WF.items()}
    added_tokens = 0
    for s in corpus[len(K):]:
        g = 0
        for st in s["stanzas"]:
            for v in st["verses"]:
                for m in WORD.finditer(v["text"]):
                    f = m.group(0).lower()
                    f0 = strip_epenthetic(f)
                    f00 = f.replace("ը", "")
                    lemma = rev.get(f) or rev.get(f0) or rev.get(f00) or f0
                    SI.setdefault(lemma, []).append({"s": s["id"], "v": g, "f": f})
                    forms = WF.setdefault(lemma, [])
                    for form in (f, f0):
                        if form not in forms:
                            forms.append(form)
                    rev.setdefault(f, lemma)
                    rev.setdefault(f0, lemma)
                    added_tokens += 1
                g += 1
    for lemma in WF:
        WF[lemma].sort()

    # ---- facets
    FA = json.loads(json.dumps(FA))
    cats = [list(c) for c in FA["categories"]]
    cats.append(["Scan supplement (not in Krapar)", len(corpus) - len(K)])
    FA["categories"] = cats
    known = {m[0] for m in FA["modes"]}
    for m in sorted(sup_modes):
        if m not in known:
            FA["modes"].append([m, 0])

    out = os.path.join(SITE, "data")
    os.makedirs(out, exist_ok=True)
    dump(os.path.join(out, "corpus.json"), corpus)
    dump(os.path.join(out, "search-index.json"), SI)
    dump(os.path.join(out, "word-forms.json"), WF)
    dump(os.path.join(out, "facets.json"), FA)
    dump(os.path.join(out, "alignments.json"), AL)
    dump(os.path.join(out, "stanza-refs.json"), SR)
    dump(os.path.join(out, "anchor-map.json"), {"stanza": anchor_map, "hymn": hymn_map, "absorbed": absorbed_map})
    # canon structure of the whole book in document order (parts, headings), for the calendar's canon assembly
    structure = {"version": "sharagnots-structure-1", "source": "output/site_build/w10/unicode_sequence.json",
                 "stanzas": {e["id"]: {"pt": e["part"]["part_key"], "pc": e["part"]["category"], "pr": e["part"]["part_run"],
                                       "pi": 1 if e["part"]["inherited_category"] else 0, "sec": e["section_id"], "hy": e["hymn_id"]}
                             for e in W10SEQ["sequence"] if e["kind"] == "stanza"},
                 "headings": [{"after": None, "text": DC.clean_heading(e["text"])[0], "u": e["unit"], "t": e["unit_type"], "p": e["scan_pages"], "sec": e["section_id"], "hy": e["hymn_id"], "anchor": e["anchor_stanza"]}
                              for e in W10SEQ["sequence"] if e["kind"] == "heading"],
                 "order": [e["id"] if e["kind"] == "stanza" else "H:" + (e["unit"] or e["anchor_stanza"]) for e in W10SEQ["sequence"]]}
    dump(os.path.join(out, "sharagnots-structure.json"), structure)
    if not os.path.exists(os.path.join(out, "ai-en.json")):
        dump(os.path.join(out, "ai-en.json"), {"version": 1, "label": "AI translation (Claude)", "items": {}})
    shutil.copyfile(os.path.join(args.viewer, "data", "geometry.json"), os.path.join(out, "scan-geometry.json"))
    # scan page images
    pdst = os.path.join(SITE, "pages")
    os.makedirs(pdst, exist_ok=True)
    copied = 0
    for fn in sorted(os.listdir(os.path.join(args.viewer, "pages"))):
        if fn.endswith(".jpg") and not os.path.exists(os.path.join(pdst, fn)):
            shutil.copyfile(os.path.join(args.viewer, "pages", fn), os.path.join(pdst, fn))
            copied += 1
    # ---- D1 audit files (project output, not shipped)
    os.makedirs(D1_OUT, exist_ok=True)
    changed, expansions = {}, {}
    for s_ in corpus:
        for st_ in s_["stanzas"]:
            for v_ in st_["verses"]:
                if v_.get("a2") or v_.get("x"):
                    changed[v_["a"]] = {"merged": bool(v_.get("a2")), "completed": bool(v_.get("x")), "krapar": s_.get("src") != "scan",
                                        "text": v_["text"], "a2": v_.get("a2") or [], "pages": v_.get("p")}
                if v_.get("x"):
                    expansions[v_["a"]] = {"printed": v_.get("pt"), "x": v_["x"], "pages": v_.get("p"), "text": v_["text"]}
    dump(os.path.join(D1_OUT, "tail_audit.json"), {"count": len(tail_audit), "by_class": dict(collections.Counter(r["class"] for r in tail_audit)), "records": tail_audit})
    dump(os.path.join(D1_OUT, "expansions.json"), {"count": len(expansions), "by_rule": dict(collections.Counter(e["x"]["r"] for e in expansions.values())),
                                                    "by_confidence": dict(collections.Counter(e["x"]["k"] for e in expansions.values())), "records": expansions})
    dump(os.path.join(D1_OUT, "changed_stanzas.json"), changed)
    dump(os.path.join(D1_OUT, "cue_low_confidence_not_applied.json"), cue_low)
    A1_OUT = os.path.join(PROJECT, "output", "site_build", "a1")
    os.makedirs(A1_OUT, exist_ok=True)
    dump(os.path.join(A1_OUT, "display_clean_queue.json"), dc_queue)
    dump(os.path.join(D1_OUT, "omit_ai_ids.json"), sorted(k for k, c in changed.items() if c["merged"] and not c["krapar"]))
    report = {
        "d1_tails_found": len(tail_audit), "d1_tails_by_class": dict(collections.Counter(r["class"] for r in tail_audit)),
        "a1_display_clean": dict(sorted(dc_stats.items())), "a1_hyphen_unattested": len([q for q in dc_queue if q[0] == "hyphen_unattested"]),
        "d1_cue_completions": {k: v for k, v in sorted(stats.items()) if k.startswith("cue_") or k.startswith("neume_")},
        "krapar_sections": len(K), "krapar_verses": total_k, "krapar_verses_linked": stats["linked"],
        "krapar_verses_unlinked": stats["unlinked"], "linked_by_global_fallback": stats["fallback_global"],
        "krapar_verse_link_pct": round(100 * stats["linked"] / total_k, 2),
        "anchored_stanzas": len(A), "anchored_stanzas_claimed_by_krapar": len(claimed),
        "supplement_sections": len(corpus) - len(K), "supplement_verses": len(unclaimed),
        "krapar_verses_with_differing_scan_reading": rd_count,
        "supplement_text_source": dict(collections.Counter(v.get("ts") for sc in corpus[len(K):] for st in sc["stanzas"] for v in st["verses"])),
        "tokens_added_to_search_index": added_tokens, "lemmas": len(SI),
        "vendor_krapar_corpus_sha256": vendor_hash, "page_images_copied_this_run": copied,
    }
    dump(os.path.join(out, "build-report.json"), report)
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
