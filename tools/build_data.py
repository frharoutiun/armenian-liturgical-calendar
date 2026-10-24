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
SITE = os.path.dirname(HERE)
PROJECT = "/Users/frharoutiun/Documents/Church/Coding/06 - Donatsooyts Digitization"
DEFAULT_ANCHORED = os.path.join(PROJECT, "output", "sharagnots_anchored")
DEFAULT_VIEWER = os.path.join(PROJECT, "output", "sharagnots_viewer")
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
    args = ap.parse_args()

    K = load(os.path.join(KRAPAR, "corpus.json"))
    SI = load(os.path.join(KRAPAR, "search-index.json"))
    WF = load(os.path.join(KRAPAR, "word-forms.json"))
    FA = load(os.path.join(KRAPAR, "facets.json"))
    AL = load(os.path.join(KRAPAR, "alignments.json"))
    SR = load(os.path.join(KRAPAR, "stanza-refs.json"))
    A = load(os.path.join(args.anchored, "stanzas.json"))["stanzas"]
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
    unclaimed = [i for i in range(len(A)) if i not in claimed]
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
        heading = title or ("ՇԱՐԱԿԱՆ / " + collapse_spaced_letters(first_h.get("incipit", "")))
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
                v = {"text": ws(a["reading"] or a["ours_diplomatic"]), "a": a["id"], "p": a["scan_pages"], "src": "scan"}
                if loc:
                    v["l"] = [loc["start"]["column"], loc["start"]["line"], loc["end"]["column"], loc["end"]["line"]]
                if a["counts"].get("unconfirmed_wording"):
                    v["rv"] = a["counts"]["unconfirmed_wording"]
                if a.get("reading_basis") == "ours_fallback":
                    v["fb"] = 1
                verses.append(v)
            st = {"type": label, "hymnTypes": [code] if code else [], "modes": [mode] if mode else [], "verses": verses,
                  "src": "scan", "hy": hid, "incipit": hm.get("incipit", "")}
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
    dump(os.path.join(out, "anchor-map.json"), {"stanza": anchor_map, "hymn": hymn_map})
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
    report = {
        "krapar_sections": len(K), "krapar_verses": total_k, "krapar_verses_linked": stats["linked"],
        "krapar_verses_unlinked": stats["unlinked"], "linked_by_global_fallback": stats["fallback_global"],
        "krapar_verse_link_pct": round(100 * stats["linked"] / total_k, 2),
        "anchored_stanzas": len(A), "anchored_stanzas_claimed_by_krapar": len(claimed),
        "supplement_sections": len(corpus) - len(K), "supplement_verses": len(unclaimed),
        "krapar_verses_with_differing_scan_reading": rd_count,
        "tokens_added_to_search_index": added_tokens, "lemmas": len(SI),
        "vendor_krapar_corpus_sha256": vendor_hash, "page_images_copied_this_run": copied,
    }
    dump(os.path.join(out, "build-report.json"), report)
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
