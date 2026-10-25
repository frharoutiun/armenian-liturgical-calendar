#!/usr/bin/env python3
"""Stanza-level fixes applied by tools/build_data.py to the anchored Sharagnots dataset (fork D1, owner findings 2026-10-24/25).

1. Split stanzas (page / column breaks).  The anchored dataset cuts a printed stanza in two when it runs over a column or page break:
   the head keeps the opening, the tail (a separate anchored stanza that shares the same Unicode unit) is shown as its own "verse",
   e.g. scan p.76 bottom "...վերափոխեցար" + p.77 top "աղաչեա զԱստուած շնորհել մեզ ըզկեանս անվախճան".
   `tail_chains` finds these (shared Unicode unit, same hymn, head without terminal punctuation, head ends at the bottom of a column)
   and returns tail index -> root head index. The build merges the tail text into the head, or hides it behind the Krapar verse that already
   carries the full stanza, and keeps the tail ids as `a2` on the verse so scan links and the anchor map still work.
2. Cue completion.  The print writes a hymn's refrain once and then cuts it to a cue ("աղա:", "փա ։"). `find_expansion` completes a cue on the
   DISPLAYED text from the same hymn's refrain printed in full (previous stanzas first, then the following ones), records the source
   stanza id and rule, and never touches the printed cue (kept as `x.c`).
3. Neume marks.  In our own transcription the khaz (neume) signs were typed as stress/punctuation marks inside words (Հա՛յր, ՜ ՞ ՝). Where our
   transcription is displayed, `split_neumes` removes them from the displayed form and keeps them as (position, mark) pairs so the operation is
   reversible (`join_neumes`).
"""
import re

TERM = re.compile(r"[:։\.\?!՞]\s*$")
NEUMES = "՛՜՝՞"          # ՛ ՜ ՝ ՞
ARM = re.compile("[Ա-Ֆա-և]")


# ------------------------------------------------------------------ neume marks
def split_neumes(text, chars=NEUMES):
    """-> (clean, marks) where marks = [[index into clean, mark char], ...] (mark sits before clean[index])."""
    out, marks = [], []
    for ch in text or "":
        if ch in chars:
            marks.append([len(out), ch])
        else:
            out.append(ch)
    return "".join(out), marks


def join_neumes(clean, marks):
    out, k = [], 0
    for i, ch in enumerate(clean):
        while k < len(marks) and marks[k][0] == i:
            out.append(marks[k][1])
            k += 1
        out.append(ch)
    while k < len(marks):
        out.append(marks[k][1])
        k += 1
    return "".join(out)


# ------------------------------------------------------------------ split stanzas
def has_terminal(text):
    return bool(TERM.search((text or "").strip()))


def _end_line(s):
    return (s.get("scan_location") or {}).get("end", {}).get("line") or 0


def _start_line(s):
    return (s.get("scan_location") or {}).get("start", {}).get("line") or 0


def starts_lowercase(text):
    t = (text or "").lstrip()
    return bool(t) and "\u0561" <= t[0] <= "\u0587"


def is_tail(head, tail, head_text=None, tail_text=None):
    """True when `tail` is the continuation of `head` over a column or page break.

    Two witnesses (the geometry is always: same hymn, the head ends at the bottom of a column, the tail starts at the top of the next
    column or page, or on the very same lines):
      * the two pieces share a Unicode unit and the head has no terminal sign (it is cut in the middle of the sentence), or
      * the tail text begins with a lowercase letter (a printed stanza never does) and the pieces share a unit or the head has no terminal sign.
    `head_text` / `tail_text` are the displayed texts (default: the anchored reading)."""
    if head["hymn_id"] != tail["hymn_id"]:
        return False
    pd = tail["scan_pages"][0] - head["scan_pages"][-1]
    if pd not in (0, 1):
        return False
    sl, el = (head.get("scan_location") or {}).get("start", {}), (head.get("scan_location") or {}).get("end", {})
    spans_column_break = (sl.get("column") or 0) < (el.get("column") or 0) and (el.get("line") or 99) <= 6      # started in column 1, ends at the top of column 2
    if _end_line(head) < 38 and not spans_column_break:
        return False
    shared = bool(set(head.get("unit_ids") or []) & set(tail.get("unit_ids") or []))
    open_head = not has_terminal(head_text if head_text is not None else head.get("reading"))
    lower = starts_lowercase(tail_text if tail_text is not None else tail.get("reading"))
    top = pd == 1 or _start_line(tail) <= 6 or abs(_start_line(tail) - _end_line(head)) <= 3
    if shared and open_head:
        return True
    return bool(lower and top and (shared or open_head))


def tail_chains(A, texts=None):
    """tail index -> root head index (a stanza can be cut twice). `texts`: optional list of the displayed text per stanza."""
    root = {}
    for i in range(1, len(A)):
        if is_tail(A[i - 1], A[i], texts[i - 1] if texts else None, texts[i] if texts else None):
            root[i] = root.get(i - 1, i - 1)
    return root


# ------------------------------------------------------------------ cue completion
_FOLD = str.maketrans({"և": "եւ", "օ": "ո", "՚": "", "ՙ": ""})
_STRIP = re.compile("[^ա-և]")


def fold(word):
    w = word.lower().translate(_FOLD).replace("ը", "").replace("ու", "ւ")
    return _STRIP.sub("", w)


def split_words(text):
    return [w for w in re.split(r"\s+", (text or "").strip()) if w]


MAX_CUE = 5
MAX_REFRAIN = 14
COMPLETE_SHORT = {fold(w) for w in ("մեր", "քո", "նոր", "մեզ", "իմ", "քեզ", "ինձ", "նմա", "սուրբ", "կոյս")}


def _tails(tw, holders, n, max_cue_letters):
    """All distinct refrain tails (folded key -> (holder id, words)) in `holders` that complete a cue of n words at the end of tw."""
    cue_f = [fold(w) for w in tw[-n:]]
    if not cue_f[-1]:
        return {}
    found = {}
    for hid, htext in holders:
        hw = split_words(htext)
        hf = [fold(w) for w in hw]
        if len(hw) < n + 1:
            continue
        for p in range(max(0, len(hw) - MAX_REFRAIN), len(hw) - n + 1):
            if hf[p:p + n - 1] != cue_f[:-1]:
                continue
            hl, cl = hf[p + n - 1], cue_f[-1]
            strict = hl.startswith(cl) and len(hl) > len(cl)
            equal = hl == cl and n >= 2 and p + n < len(hw)
            if not (strict or equal):
                continue
            if n == 1 and len(cl) > max_cue_letters:
                continue
            found.setdefault(tuple(fold(w) for w in hw[p:]), (hid, hw[p:]))
    return found


def _pick(found):
    """One tail, or the longest when every other tail is a prefix of it (a holder that is itself cut short)."""
    keys = sorted(found, key=len, reverse=True)
    top = keys[0]
    if all(top[:len(k)] == k for k in keys[1:]):
        return found[top]
    return None


def find_expansion(text, holders, max_cue_letters=4):
    """Complete a cue at the end of `text` from the refrain printed in full at the end of one of `holders` (list of (id, text), nearest first).

    -> None, {"ambiguous": True}, or dict(cue, added, full, holder, rule, n_cue_words). Rule (same family as W1, applied to the DISPLAYED text):
    the last n (1..5) words of `text` are a prefix-match of the words at the tail of a holder: the first n-1 equal after folding, the last
    is a strict prefix of the holder word (or, for n >= 2, equal); a single-word cue must be at most `max_cue_letters` letters long.
    The expansion is the holder text from that word to its end. Every tail that matches must be a prefix of the longest one (a holder that
    is itself cut short is overruled by the full one); other disagreement is ambiguous and nothing is expanded.
    """
    tw = split_words(text)
    if len(tw) < 2:
        return None
    for n in range(min(MAX_CUE, len(tw) - 1), 0, -1):
        found = _tails(tw, holders, n, max_cue_letters)
        if not found:
            continue
        pick = _pick(found)
        if pick is None:
            return {"ambiguous": True, "n": n}
        hid, tail_words = pick
        lastf = fold(tail_words[-1])
        if len(lastf) <= 3 and lastf not in COMPLETE_SHORT:      # the holder's own refrain is itself cut short: do not copy a cue
            return None
        truncated = len(fold(tw[-1])) < len(fold(tail_words[n - 1]))
        cue = " ".join(tw[-n:])
        added = " ".join(tail_words[n - 1:] if truncated else tail_words[n:])
        if not added:
            return None
        full = " ".join(tw[:-n] + tail_words)
        return {"cue": cue, "added": added, "full": full, "holder": hid, "n_cue_words": n,
                "rule": "same_hymn_refrain+" + ("truncated_cue" if truncated else "whole_word_cue")}
    return None


def complete_with_w1(text, w1, holder_text):
    """W1-guided completion (W1 = pipeline/s73_expand_abbreviations: cue words + added words, confirmed against Krapar's parallel verse
    or the same hymn's refrain). The Unicode text often ends EARLIER than the print (the last cue word is missing or cut short), so W1's
    cue words are matched against the displayed ending with that allowed.

    S = the cue's leading words (cw[:n-1], printed) + W1's added words (the completion of the last cue word and the rest of the refrain).
    The displayed ending corresponds to the first j words of the cue: when the displayed last word is exactly cue word j it is kept and the
    completion starts at S[j], when it is only the beginning of it (cut short) the completion starts at S[j-1].  The completion words are taken
    from the holder's DISPLAYED text when it contains S contiguously (Unicode orthography), otherwise from W1 itself (book orthography, flagged).
    -> dict like find_expansion (cue, added, full, rule, spelling), or None."""
    cw, aw = w1.get("cue_words") or [], w1.get("added_words") or []
    n = len(cw)
    if not n or not aw:
        return None
    tw = split_words(text)
    cwf = [fold(w) for w in cw]
    S_book = list(cw[:n - 1]) + list(aw)
    Sf = [fold(w) for w in S_book]
    hw = split_words(holder_text) if holder_text else []
    hf = [fold(w) for w in hw]
    pos = None
    if hw:
        for p in range(len(hw) - len(Sf), -1, -1):
            if hf[p:p + len(Sf)] == Sf:
                pos = p
                break
    for j in range(n, 0, -1):
        if len(tw) <= j:
            continue
        dj = [fold(w) for w in tw[-j:]]
        if dj[:-1] != Sf[:j - 1] or not dj[-1] or not Sf[j - 1].startswith(dj[-1]):
            continue
        exact = dj[-1] == Sf[j - 1]
        c = j if exact else j - 1
        keep = list(tw) if exact else list(tw[:-1])
        if exact:
            keep[-1] = keep[-1].rstrip(":։.\u00b7")        # the sentence goes on: the cue's terminal sign is not wanted any more
        if c >= len(Sf):
            return None
        if pos is not None:
            comp, spelling = hw[pos + c:], "unicode"
        else:
            comp, spelling = S_book[c:], "book_orthography"
        if not comp:
            return None
        return {"cue": " ".join(cw), "added": " ".join(comp), "full": " ".join(keep + comp), "holder": None, "n_cue_words": n,
                "rule": "w1_cue+" + spelling, "spelling": spelling}
    return None
