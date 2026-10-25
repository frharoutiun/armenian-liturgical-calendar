#!/usr/bin/env python3
"""Display-text cleaning (A1): remove typesetting / transcription artifacts from what the site SHOWS.

Principles
  * Only DISPLAY copies are cleaned. The source text stays verbatim somewhere else (the W10 Unicode layer, the anchored dataset,
    the scan transcription `o`); a cleaned verse keeps its raw display text in `dr` so the change is reversible.
  * Every change is logged as (code, removed text) so it can be audited (output/site_build/A1_ARTIFACTS.md).
  * Nothing ambiguous is "fixed": a hyphen break is joined only when the joined word is attested in the corpus; everything
    else stays visible and is reported.

Artifact classes (Armenian display text)
  zw          zero-width / soft-hyphen / control characters
  marker      editorial rubric markers of the Unicode document, "(ո)", "(հբ)/", "()" and the "/" that joins two of them
  folio_num   a stanza number glued to the first word, "171.Կանոն"
  lead_sep    leading separators  "/ " "* " "• " "|" and a tab
  slash       a stand-alone "/" inside a stanza
  bullet      "•" (the Unicode document's rendering of the printed mid-stanza dot) -> "."
  neume       combining accents typed over vowels (and stress marks in an INCIPIT label): neume signs, not letters
  latin       a Latin letter typed inside an Armenian word ("ժանիu" -> "ժանիս")
  hyphen      a line-break hyphen inside a word, joined only when the joined word is attested
  space_stop  a space before ։ : , .
  dblspace    repeated spaces
  backtick    legacy-font comma marks "`" (typed ՝ in the Zhamagirk and in our transcription) -> ","; the double "``" (Arak29 editorial mark) is removed
              as W9 already does for the Arak29 text
  underscore  "_" typed for a line-break hyphen inside a word of the Jashots second layer ("փափկու_թեան" -> "փափկութեան")
  heading_glue  a part label glued to the first stanza, "Օրհնութիւն. Այսօր …" (the part is shown by the page; label kept in the raw copy)
  title_glue  a canon title glued to the first stanza, "Կանոն … Տեառն յԵրուսաղէմ: Այսօր …" (reported, raw kept)
  neume       stress-like marks typed for neumes in an INCIPIT label

English display text
  lead_sep    leading "/" "•" "*"
  cutoff      "[cut off]" -> "…" (the translation covers only the printed cue)
  dblspace
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ARM = "Ա-Ֆա-և"
NEUMES = "՛՜՝՞՟՚"          # stress/emphasis/comma/apostrophe-like marks used for neumes in the 1888 print transcription

COMBINING = re.compile("[\u0300-\u036f]")     # combining acute/grave accents typed over Armenian vowels (neume signs again)
ZW = re.compile("[​-‏­﻿  \x00-\x08\x0b-\x1f\x7f]")
MARKER = re.compile(r"\s*(?:/\s*)?\(\s*[%s]{0,4}\s*\)\s*(?:/\s*)?" % ARM)
FOLIO = re.compile(r"^\s*(\d{1,3})\s*[.․]\s*(?=\S)")
LEAD_SEP = re.compile(r"^[\s*•/|~_\\]+")
SLASH = re.compile(r"(?:(?<=\s)|^)/(?=\s|$)")
BULLET = re.compile(r"\s*•\s*")
LATIN_IN_ARM = re.compile(r"(?<=[%s])u(?![A-Za-z])" % ARM)
HYPHEN = re.compile(r"([%s]{2,})[\-֊‐‑]\s*([%s]{2,})" % (ARM, ARM))
SPACE_STOP = re.compile(r"\s+([։:,.;])")
DBLSPACE = re.compile(r"[ \t]{2,}")
BACKTICK = re.compile(r"`+")
BACKTICK_COMMA = re.compile(r"(?<=[%s])`(?=\s)" % ARM)
PART_GLUE = re.compile(r"^(Օրհնութիւն|Հարց|Գործք|Մեծացուսցէ|Մեծացուցէ|Ողորմեա|Տէր յերկնից|Մանկունք|Ճաշու|Համբարձի)\s*[.։:]\s+(?=[Ա-Ֆ])")
TITLE_GLUE = re.compile(r"^(Կանոն\s[^։:]{5,110}[։:])\s+(?=[Ա-Ֆ])")
CUTOFF = re.compile(r"\s*\[cut off\]")


def _fold(w):
    """lower-case, schwa-stripped skeleton used to test whether a joined word is attested."""
    return w.lower().replace("ը", "").replace("՚", "")


class Lexicon:
    """Set of attested word skeletons (built from the Krapar corpus text, which is verified)."""

    def __init__(self, words=()):
        self.words = set(_fold(w) for w in words)

    def has(self, w):
        return _fold(w) in self.words

    @classmethod
    def from_corpus(cls, corpus, skip_scan=True):
        words = set()
        for sec in corpus:
            if skip_scan and sec.get("src") == "scan":
                continue
            for st in sec.get("stanzas", []):
                for v in st.get("verses", []):
                    for m in re.finditer("[%s]+" % ARM, v.get("text", "")):
                        words.add(m.group())
        return cls(words)


def _sub_log(rx, repl, s, log, code, flags=0):
    def f(m):
        log.append([code, m.group(0)])
        return repl(m) if callable(repl) else repl
    return rx.sub(f, s)


def clean_stanza(text, lex=None, queue=None):
    """Clean a displayed Armenian stanza. Returns (clean, log)."""
    s = text or ""
    log = []
    s = _sub_log(ZW, "", s, log, "zw")
    s = _sub_log(COMBINING, "", s, log, "neume")
    s = _sub_log(MARKER, " ", s, log, "marker")
    m = FOLIO.match(s)
    if m:
        log.append(["folio_num", m.group(0)])
        s = s[m.end():]
    s = s.strip()
    m = LEAD_SEP.match(s)
    while m and m.end():
        log.append(["lead_sep", m.group(0)])
        s = s[m.end():]
        m = LEAD_SEP.match(s)
    s = _sub_log(SLASH, "", s, log, "slash")
    s = _sub_log(BACKTICK_COMMA, ",", s, log, "backtick")
    s = _sub_log(BACKTICK, "", s, log, "backtick")
    m = PART_GLUE.match(s)
    if m:
        log.append(["heading_glue", m.group(1)])
        s = s[m.end():]
    m = TITLE_GLUE.match(s)
    if m:
        log.append(["title_glue", m.group(1)])
        if queue is not None:
            queue.append(["title_glue", m.group(1)])
        s = s[m.end():]
    s = _sub_log(BULLET, ". ", s, log, "bullet")
    s = _sub_log(LATIN_IN_ARM, "ս", s, log, "latin")

    def join(m):
        a, b = m.group(1), m.group(2)
        if lex is not None and lex.has(a + b):
            log.append(["hyphen", m.group(0)])
            return a + b
        if queue is not None:
            queue.append(["hyphen_unattested", m.group(0)])
        return m.group(0)
    s = HYPHEN.sub(join, s)
    s = _sub_log(SPACE_STOP, lambda m: m.group(1), s, log, "space_stop")
    s = re.sub(r"\.\s*\.", ".", s) if "bullet" in [c for c, _ in log] else s
    s = _sub_log(DBLSPACE, " ", s, log, "dblspace")
    return s.strip(), log


def clean_heading(text):
    """Headings keep their ' / ' line-break marks (the hymnal splits on them); only spacing and invisible characters change."""
    s = text or ""
    log = []
    s = _sub_log(ZW, "", s, log, "zw")
    s = _sub_log(SPACE_STOP, lambda m: m.group(1), s, log, "space_stop")
    s = _sub_log(DBLSPACE, " ", s, log, "dblspace")
    return s.strip(), log


def clean_incipit(text, lex=None):
    """Stanza incipit labels come from our transcription: neume signs typed as stress marks come out; line-break hyphens join."""
    s = text or ""
    log = []
    s = _sub_log(ZW, "", s, log, "zw")
    s = _sub_log(re.compile("[%s\u0300-\u036f]" % NEUMES.replace("՝", "")), "", s, log, "neume")
    s, l2 = clean_stanza(s, lex)
    return s, log + l2


def clean_legacy_armenian(text):
    """Chants / generic verses typed in legacy fonts: backtick comma marks, invisible characters, repeated spaces."""
    s = text or ""
    log = []
    s = _sub_log(BACKTICK_COMMA, ",", s, log, "backtick")
    s = _sub_log(BACKTICK, "", s, log, "backtick")
    s = _sub_log(ZW, "", s, log, "zw")
    s = _sub_log(SPACE_STOP, lambda m: m.group(1), s, log, "space_stop") if log else s
    s = _sub_log(DBLSPACE, " ", s, log, "dblspace")
    return s.strip(), log


UNDERSCORE_JOIN = re.compile(r"(?<=[%s])_+(?=[%s])" % (ARM, ARM))


def clean_jashots_text(text):
    """The Jashots printed-page transcription (second layer): stays diplomatic ("•" verse marks, stress marks, ։ spacing are kept);
    only line-break underscores, invisible characters, Latin look-alikes, spaces before ։ : , . and repeated spaces change."""
    s = text or ""
    log = []
    s = _sub_log(UNDERSCORE_JOIN, "", s, log, "underscore")
    s = _sub_log(ZW, "", s, log, "zw")
    s = _sub_log(LATIN_IN_ARM, "ս", s, log, "latin")
    s = _sub_log(SPACE_STOP, lambda m: m.group(1), s, log, "space_stop")
    s = _sub_log(DBLSPACE, " ", s, log, "dblspace")
    return s, log


def clean_english(text):
    s = text or ""
    log = []
    m = LEAD_SEP.match(s)
    if m and m.end():
        log.append(["lead_sep", m.group(0)])
        s = s[m.end():]
    s = _sub_log(CUTOFF, "…", s, log, "cutoff")
    s = re.sub(r"\.{3}\s*…", "…", s)
    s = _sub_log(DBLSPACE, " ", s, log, "dblspace")
    return s.strip(), log


# ---- appliers -------------------------------------------------------------------------------------------------------

def clean_verse(v, lex=None, stats=None, queue=None):
    """Clean the displayed text (and the printed cue `pt`) of one corpus verse in place; raw display text goes to `dr`."""
    raw = v.get("text")
    if raw is None:
        return v
    new, log = clean_stanza(raw, lex, queue)
    if new != raw:
        v["dr"] = raw
        v["text"] = new
        v["dc"] = sorted({c for c, _ in log})
    x = v.get("x")
    if isinstance(x, dict):
        if x.get("a"):                                   # the added words are shown as the completion: same cleaning, and `n` stays their length
            a2, la = clean_stanza(x["a"], lex, None)
            if a2 != x["a"]:
                x["a"], x["n"] = a2, len(a2)
                log += la
        if x.get("c"):                                   # the printed cue is shown beside it: neume signs out
            c2, lc = clean_incipit(x["c"], lex)
            if c2 != x["c"]:
                x["c"] = c2
                log += lc
    if v.get("pt"):
        newp, logp = clean_stanza(v["pt"], lex, None)
        if newp != v["pt"]:
            v["pt"] = newp
            log += logp
    if v.get("o"):
        # the diplomatic scan transcription stays diplomatic: only invisible characters, double spaces and Latin look-alikes
        o = ZW.sub("", v["o"])
        o = COMBINING.sub("", o)
        o = LATIN_IN_ARM.sub("ս", o)
        o = DBLSPACE.sub(" ", o)
        if o != v["o"]:
            log.append(["o_invisible_or_lookalike", ""])
            v["o"] = o
    if stats is not None:
        for c, x in log:
            stats[c] = stats.get(c, 0) + 1
    return v


def _walk_clean(o, fn, key_filter, stats, path=""):
    if isinstance(o, dict):
        for k, v in list(o.items()):
            if isinstance(v, str) and key_filter(k, v):
                new, log = fn(v)
                if new != v:
                    o[k] = new
                    for c, _ in log:
                        stats[c] = stats.get(c, 0) + 1
            else:
                _walk_clean(v, fn, key_filter, stats, path + "/" + str(k))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, str) and key_filter(None, v):
                new, log = fn(v)
                if new != v:
                    o[i] = new
                    for c, _ in log:
                        stats[c] = stats.get(c, 0) + 1
            else:
                _walk_clean(v, fn, key_filter, stats, path + "/*")


def clean_ai_en(path):
    """data/ai-en.json: {items: {id: {t, c}}, titles}. The raw text is kept in `tr` for every item that changes."""
    d = json.load(open(path, encoding="utf-8"))
    stats = {}
    for sid, it in d.get("items", {}).items():
        if isinstance(it, str):
            it = {"t": it}
            d["items"][sid] = it
        t = it.get("t")
        if not t:
            continue
        new, log = clean_english(t)
        if new != t:
            it.setdefault("tr", t)
            it["t"] = new
            for c, _ in log:
                stats[c] = stats.get(c, 0) + 1
    for k, it in (d.get("titles") or {}).items():
        if isinstance(it, dict) and it.get("t"):
            new, log = clean_english(it["t"])
            if new != it["t"]:
                it.setdefault("tr", it["t"])
                it["t"] = new
                for c, _ in log:
                    stats[c] = stats.get(c, 0) + 1
    _atomic_dump(path, d)
    return stats


def clean_chants_layer(path):
    raw = open(path, encoding="utf-8").read()
    indent = 1 if raw.startswith("{\n ") else None          # keep the builder's own formatting
    d = json.loads(raw)
    stats = {}
    arm = re.compile("[%s]" % ARM)
    _walk_clean(d, clean_legacy_armenian, lambda k, v: bool(arm.search(v)) and ("`" in v or ZW.search(v) or "  " in v), stats)
    if stats:
        _atomic_dump(path, d, indent)
    return stats


def clean_shards(directory):
    """data/scripture/shards/*.json: the 'text' strings of the Jashots second layer."""
    stats = {}
    for fn in sorted(os.listdir(directory)):
        if not fn.endswith(".json"):
            continue
        path = os.path.join(directory, fn)
        raw = open(path, encoding="utf-8").read()
        indent = 1 if raw.startswith("{\n ") else None
        d = json.loads(raw)
        st = {}
        _walk_clean(d, clean_jashots_text, lambda k, v: k == "text" and bool(re.search("[%s]" % ARM, v)) and ("_" in v or ZW.search(v) or "  " in v or LATIN_IN_ARM.search(v) or SPACE_STOP.search(v)), st)
        if st:
            _atomic_dump(path, d, indent)
            for c, n in st.items():
                stats[c] = stats.get(c, 0) + n
    return stats


def _atomic_dump(path, obj, indent=None):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        if indent:
            json.dump(obj, f, ensure_ascii=False, indent=indent)
        else:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def apply_data(site=SITE):
    """Idempotent pass over the data files that other builders regenerate (run from tools/deploy.sh)."""
    out = {}
    p = os.path.join(site, "data", "ai-en.json")
    if os.path.exists(p):
        out["ai-en"] = clean_ai_en(p)
    for name in ("chants_layer.json", "generic_chants.json"):
        p = os.path.join(site, "data", "calendar", name)
        if os.path.exists(p):
            out[name] = clean_chants_layer(p)
    p = os.path.join(site, "data", "scripture", "shards")
    if os.path.isdir(p):
        out["shards"] = clean_shards(p)
    return out


if __name__ == "__main__":
    print(json.dumps(apply_data(), ensure_ascii=False))
