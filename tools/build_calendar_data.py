#!/usr/bin/env python3
"""Build the static lookup tables the browser engine needs (data/calendar/*.json).

Inputs (read only) live in the digitization project; outputs are year-independent tables:
  readings_index.json  citation key -> Jashots chain ids, pdf/printed pages, intro lines, service-class observations (FINAL_by_date 2001-2040)
  hymn_index.json      Sharagnots hymns (anchored dataset index) with normalized incipit keys, mode, section, pages
  record_canons.json   Hador 1 record id (TF-...) -> anchored sections (canon level) with method and confidence
Run: python3 tools/build_calendar_data.py
"""
import json, os, re, sys, collections, difflib

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
PROJ = os.environ.get('DIGI', '/Users/frharoutiun/Documents/Church/Coding/06 - Donatsooyts Digitization')
OUT = os.path.join(SITE, 'data', 'calendar')
os.makedirs(OUT, exist_ok=True)

ARM = re.compile(r'[ա-ևԱ-Ֆ]')


def write_json(path, obj):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    json.loads(open(tmp, encoding='utf-8').read())  # validate
    os.replace(tmp, path)


def arm_key(s):
    """Letters-only, lower case, schwa removed, ու/ւ unified: used ONLY for matching, never displayed."""
    s = (s or '').lower()
    s = ''.join(ch for ch in s if 'ա' <= ch <= 'և')
    s = s.replace('ը', '').replace('ու', 'ւ').replace('և', 'եւ')
    return s


def cite_key(c):
    if not c or not c.get('book'):
        return None
    a = f"{c['ch1']}:{c['v1']}" if c.get('v1') is not None else f"{c['ch1']}"
    ch2, v2 = c.get('ch2'), c.get('v2')
    if ch2 is not None and ch2 != c['ch1']:
        b = f"-{ch2}:{v2}" if v2 is not None else f"-{ch2}"
    elif v2 is not None and v2 != c.get('v1'):
        b = f"-{v2}"
    else:
        b = ''
    return f"{c['book']} {a}{b}"


def build_readings_index():
    idx = {}
    d = os.path.join(PROJ, 'output/final/readings/FINAL_by_date')
    n = 0
    for fn in sorted(os.listdir(d)):
        if not re.fullmatch(r'\d{4}\.json', fn):
            continue
        y = json.load(open(os.path.join(d, fn), encoding='utf-8'))
        for day in y['days']:
            svc = day.get('services') or {}
            groups = [('jashoo', 'Divine Liturgy (Synaxis)', svc.get('jashoo') or [])]
            for o in svc.get('other') or []:
                groups.append(('other', o.get('service_label') or 'other', o.get('readings') or []))
            groups.append(('unclassified', 'unclassified', svc.get('unclassified') or []))
            for cls, label, rs in groups:
                for r in rs:
                    k = cite_key(r.get('citation'))
                    if not k:
                        continue
                    n += 1
                    e = idx.setdefault(k, {'citation_en': r.get('citation_en'), 'classes': collections.Counter(), 'chains': collections.Counter(),
                                           'pages': {}, 'intro_en': r.get('intro_en'), 'intro_hy': r.get('intro_hy'), 'book_group': r.get('book_group'), 'n': 0})
                    e['classes'][f'{cls}|{label}'] += 1
                    e['n'] += 1
                    if r.get('chain_id'):
                        e['chains'][r['chain_id']] += 1
                        e['pages'].setdefault(r['chain_id'], {'pdf_pages': r.get('pdf_pages'), 'printed_page': r.get('printed_page')})
    out = {}
    for k, e in idx.items():
        out[k] = {'citation_en': e['citation_en'], 'n': e['n'], 'book_group': e['book_group'],
                  'classes': [[c.split('|')[0], c.split('|', 1)[1], v] for c, v in e['classes'].most_common()],
                  'chains': [{'chain_id': c, 'n': v, **e['pages'].get(c, {})} for c, v in e['chains'].most_common(3)],
                  'intro_en': e['intro_en'], 'intro_hy': e['intro_hy']}
    write_json(os.path.join(OUT, 'readings_index.json'), {'schema': 'readings-index/1.0', 'source': 'output/final/readings/FINAL_by_date 2001-2040', 'observations': n, 'keys': out})
    return out


def sec_title_key(t):
    return arm_key(re.sub(r'\s+', '', t or ''))


def build_hymn_index():
    """Hymn and section index. The anchored dataset cuts the book into page/column blocks and only ~190 of the 1,029 blocks carry a
    printed heading; the others continue the canon of the nearest preceding headed block (book order). Each section gets `canon`
    (id of that headed block) and each hymn inherits it, so a hymn can be tied to the feast canon it is printed under."""
    ix = json.load(open(os.path.join(PROJ, 'output/sharagnots_anchored/index.json'), encoding='utf-8'))
    hymns, secs = [], []
    head = None
    for s in ix['sections']:
        if (s.get('title') or '').strip():
            head = s['id']
        secs.append({'id': s['id'], 'title': s.get('title'), 'kind': s.get('kind'), 'modes': s.get('modes'), 'pages': s.get('pages'), 'key': sec_title_key(s.get('title')), 'canon': head})
        for h in s.get('hymns') or []:
            hymns.append({'id': h['id'], 'section': s['id'], 'canon': head, 'seq': h.get('seq'), 'incipit': h.get('incipit'), 'key': arm_key(h.get('incipit')),
                          'category': (h.get('category') or {}).get('expanded') or (h.get('category') or {}).get('source'), 'mode': h.get('mode'), 'pages': h.get('pages'), 'n_stanzas': h.get('n_stanzas')})
    cat_fixes = fix_categories_from_margin_labels(hymns)
    fixes = fix_modes_from_printed_headings(hymns, secs)
    fixes['category_fixes'] = cat_fixes
    write_json(os.path.join(OUT, 'hymn_index.json'), {'schema': 'hymn-index/1.2', 'source': 'output/sharagnots_anchored/index.json', 'mode_fixes': fixes, 'hymns': hymns, 'sections': secs})
    return hymns, secs


MODE_FIX = {}   # hymn id -> corrected mode (set by fix_modes_from_printed_headings, used by build_canon_parts)
MARGIN_MODE = {'աձ': 'ԱՁ', 'ակ': 'ԱԿ', 'բձ': 'ԲՁ', 'բկ': 'ԲԿ', 'գձ': 'ԳՁ', 'գկ': 'ԳԿ', 'դձ': 'ԴՁ', 'դկ': 'ԴԿ'}
ORDINAL_LETTER = {'Առաջին': 'Ա', 'Երկրորդ': 'Բ', 'Երրորդ': 'Գ', 'Չորրորդ': 'Դ'}
MODE_HEADING = re.compile(r'^(?:\d+\.\s*)?(?:Հարց|Օրհնութիւն)\b[^:։]{0,22}?\b(Առաջին|Երկրորդ|Երրորդ|Չորրորդ)\s+ձայն')


def fix_categories_from_margin_labels(hymns):
    """F2: M1's 41 'part word vs index category' conflicts, settled (output/site_build/m1/margin_label_queue.json, part_conflicts):
      * a lone «գ» label is the printed abbreviation of Գործք (the part inside the Harts); the index read the category as 'գ', 'Գ' or 'դ' (OCR of a one-letter label)
        -> category Գործք;  * the label «ողր» (Ողորմեա) against the index category 'Ողբ' (a misreading of the same abbreviation) -> Ողորմեա.
    Every other conflict is two parts served by one hymn («ճշու / մեծ», «հրց / ապշ / մի» ...): the printed label stacks the parts; nothing to change here (the canon builder
    reads such stacks as 'serves both parts'). The old category is kept as `category_index`."""
    p = os.path.join(PROJ, 'output/site_build/m1/margin_label_queue.json')
    if not os.path.exists(p):
        return {}
    by = {h['id']: h for h in hymns}
    n = collections.Counter()
    for c in json.load(open(p, encoding='utf-8')).get('part_conflicts') or []:
        h = by.get(c['hymn_id'])
        if not h:
            continue
        lab, cat = (c.get('label_part') or '').strip(), (h.get('category') or '').strip()
        new = None
        if lab == 'գ' and cat != 'Գործք':
            new = 'Գործք'
        elif lab == 'ողր' and cat == 'Ողբ':
            new = 'Ողորմեա'
        if new:
            h['category_index'] = h.get('category'); h['category'] = new; n[new] += 1
    return dict(n)


def fix_modes_from_printed_headings(hymns, secs):
    """The index's `mode` of a hymn comes from our transcription and is often wrong in the generic by-mode canons: hymns printed under «Հարց Երրորդ ձայն»
    (third mode) are tagged ԴՁ, those under «Հարց Առաջին ձայն» ԳՁ. Two independent witnesses are used, each recorded per hymn (`mode_index` = the old value,
    `mode_basis` = why it changed):
      1. the margin labels printed beside the hymns (գձ, դկ ...), which the Unicode edition (Fr Ghevond Ajemian) kept: a hymn that carries one takes it (346 hymns);
      2. the printed heading words «Հարց|Օրհնութիւն <ordinal> ձայն» (reliable text, read case-insensitively): inside the span of such a heading the first letter of
         the mode (Ա/Բ/Գ/Դ) is the heading's, the second (Ձ or Կ: the two runs of one heading) stays as indexed. A span is used only when no margin label inside it
         contradicts the heading's letter (a heading whose span would run into another family is then left alone, never guessed)."""
    seqp = os.path.join(PROJ, 'output/site_build/w10/unicode_sequence.json')
    if not os.path.exists(seqp):
        return {'by_heading': 0, 'by_margin_label': 0, 'hymns_with_margin_label': 0}
    seq = json.load(open(seqp, encoding='utf-8'))['sequence']
    by_id = {h['id']: h for h in hymns}
    units = {u['u']: u for u in json.load(open(os.path.join(PROJ, 'output/sharagnots_unicode_proof/unicode_units.json'), encoding='utf-8'))['units']}
    st = json.load(open(os.path.join(PROJ, 'output/sharagnots_anchored/stanzas.json'), encoding='utf-8'))['stanzas']
    margin = {}
    for x in sorted(st, key=lambda y: (y['hymn_id'], y.get('stanza_n') or 0)):
        hid = x['hymn_id']
        if hid in margin:
            continue
        for uid in x.get('unit_ids') or []:
            u = units.get(int(str(uid).split('-')[-1]))
            for t in (u or {}).get('tags') or []:
                m = next((MARGIN_MODE[q] for q in t.split('/') if q in MARGIN_MODE), None)
                if m and hid not in margin:
                    margin[hid] = (m, t)
    ANY_MODE = re.compile(r'(Առաջին|Երկրորդ|Երրորդ|Չորրորդ|Վերջ|Վառ|Աւագ)\s+(ձայն|կողմ)', re.I)
    HEAD = re.compile(r'^(?:\d+\.\s*)?(?:Հարց|Օրհնութիւն)\b[^:։]{0,22}?\b(Առաջին|Երկրորդ|Երրորդ|Չորրորդ)\s+ձայն', re.I)
    TITLE = re.compile(r'^\W*(?:Կ\s*Ա\s*Ն\s*Ո\s*Ն|ԿԱՆՈՆ|Կանոն|ՇԱՐԱԿԱՆ|Շարական)')
    letter_of = {k.lower(): v for k, v in ORDINAL_LETTER.items()}
    # 1. spans
    spans, cur, seen = [], None, set()
    for x in seq:
        if x['kind'] == 'heading':
            t = x.get('text') or ''
            if len(t) < 60 and ANY_MODE.search(t):
                m = HEAD.search(t)
                cur = {'letter': letter_of[m.group(1).lower()], 'text': t.strip(), 'page': (x.get('scan_pages') or [None])[0], 'hymns': []} if m else None
                if cur:
                    spans.append(cur)
            elif TITLE.search(t):
                cur = None
        elif x['kind'] == 'stanza' and cur:
            hid = x.get('hymn_id')
            if not hid or hid in seen:
                continue
            seen.add(hid)
            h = by_id.get(hid)
            pg = ((h or {}).get('pages') or [None])[0]
            if h and h.get('mode') and pg is not None and cur['page'] is not None and cur['page'] <= pg <= cur['page'] + 12:
                cur['hymns'].append(h)
    n = skipped = 0
    for h in hymns:
        h['_idx'] = h.get('mode')          # the index's own reading (our transcription), kept as one witness
    for sp in spans:
        if any(h['id'] in margin and margin[h['id']][0][:1] != sp['letter'] for h in sp['hymns']):
            skipped += 1
            continue
        for h in sp['hymns']:
            mode = h['_idx']
            if mode[:1] != sp['letter'] and len(mode) == 2:
                h['_head'] = sp['letter'] + mode[1]
                h['_head_why'] = f"printed heading «{sp['text']}» (p{sp['page']}): the index's {mode} is read as {h['_head']}"
                n += 1
    nm = 0
    for hid, (m, t) in margin.items():
        h = by_id.get(hid)
        if not h:
            continue
        h['_margin'] = m
        h['_margin_tag'] = t
        if h['_idx'] != m:
            nm += 1
    stats = reconcile_modes(hymns)
    for h in hymns:
        MODE_FIX[h['id']] = h.get('mode')
    return {'by_heading': n, 'spans': len(spans), 'spans_skipped_margin_contradicts': skipped, 'margin_label_disagrees_with_index': nm, 'hymns_with_margin_label': len(margin), **stats}


def krapar_modes():
    """Hymn id -> mode, from the verified Krapar corpus: every Krapar verse carries the anchored stanza id it was matched to and the mode of its stanza.
    Only hymns whose Krapar stanzas all name the same single mode are used."""
    cp = os.path.join(SITE, 'data', 'corpus.json')
    sp = os.path.join(PROJ, 'output/sharagnots_anchored/stanzas.json')
    if not (os.path.exists(cp) and os.path.exists(sp)):
        return {}
    hid_of = {x['id']: x['hymn_id'] for x in json.load(open(sp, encoding='utf-8'))['stanzas']}
    seen = collections.defaultdict(collections.Counter)
    for sec in json.load(open(cp, encoding='utf-8')):
        for stz in sec.get('stanzas') or []:
            ms = stz.get('modes') or []
            if len(ms) != 1:
                continue
            for v in stz.get('verses') or []:
                hid = hid_of.get(v.get('a'))
                if hid:
                    seen[hid][ms[0]] += 1
    return {hid: next(iter(c)) for hid, c in seen.items() if len(c) == 1}


def scan_margin_evidence():
    """M1: printed margin labels read from the scan margin crops (pipeline/s121_margin_label_evidence.py, output/site_build/m1/margin_label_evidence.json).
    At the readers' resolution the printed Գ and Դ are not separable, so a scan label proves the LETTER only when it is Ա or Բ (`kind: letter`); for Գ/Դ it proves the
    family (Գ or Դ) and the Ձ/Կ half (`kind: family_GD`)."""
    p = os.path.join(PROJ, 'output/site_build/m1/margin_label_evidence.json')
    if not os.path.exists(p):
        return {}
    return json.load(open(p, encoding='utf-8')).get('hymns') or {}


_E_PART = {arm_key(k)[:3]: v for k, v in {'օրհ': 'orhnutyun', 'հրց': 'harts', 'հարց': 'harts', 'մեծ': 'metsatsutse', 'ողր': 'voghormya', 'տրյ': 'der_hergnits', 'տրլ': 'der_hergnits',   # Y1 note: in the printed margins «տրլ» is also the ode label of Habakkuk 3 inside an Orhnutyun (LS323 p.10-11, 22-25); here it is only the lists' spelling of Տրյ.
                                           'մնկ': 'mankunk', 'ճշ': 'jashoo', 'հմբ': 'hampartsi'}.items()}
REF_PART = {'օրհ': 'Օրհնութիւն', 'հրց': 'Հարց', 'հարց': 'Հարց', 'մեծ': 'Մեծացուսցէ', 'ողր': 'Ողորմեա', 'տրյ': 'Տէր յերկնից', 'տրլ': 'Տէր յերկնից',
            'մնկ': 'Մանկունք', 'ճշ': 'Ճաշու', 'ճշու': 'Ճաշու', 'հմբ': 'Համբարձի'}
REF_WEIGHT = {'E': 1.0, 'J': 0.3, 'L': 0.5, 'K': 0.3, 'I': 0.2}   # calibrated on the 346 hymns that carry a Unicode margin tag (F2_REPORT.md): 81.5% right vs 67% for the index alone
REF_NEED, REF_GAP = 0.5, 0.3                                         # a reference vote changes the index only with weight >= 0.5 and a lead of >= 0.3 over the index's own vote


def _ref_part(p):
    k = arm_key(p)[:3] if p else ''
    for a, b in REF_PART.items():
        if arm_key(a)[:3] == k:
            return b
    return None


def reference_modes(hymns):
    """F2: modes from the owner's reference lists (pipeline/s130_mode_reference_witnesses.py -> output/site_build/f2/reference_entries.json):
      E = Sharagan TOC Echmiadzin (typed list: incipit | part | mode | pages), J = Sharagan MASTER TOC (Jerusalem 1956), L = Sharagan List.pdf (OCR).
    An entry is tied to a hymn by its incipit (normalised prefix match) and, when the hymn's part is known, by compatible part. E's page numbers belong to another
    pagination but are a monotone function of ours (offset 0..26 pages): fitted from the unambiguous matches, used to tell apart repeated incipits (page window +-5)
    and to match abbreviated incipits by fuzzy text inside the page window. J (three volumes, other order) and L (OCR) are used by incipit only.
    Returns hymn id -> {'E': mode, 'J': mode, 'L': mode} (only where all of that source's entries for the hymn agree)."""
    p = os.path.join(PROJ, 'output/site_build/f2/reference_entries.json')
    if not os.path.exists(p):
        return {}
    ents = json.load(open(p, encoding='utf-8'))['entries']
    byk = collections.defaultdict(list)
    for h in hymns:
        byk[h['key']].append(h)
    keys = list(byk)

    def key_match(e):
        w = arm_key(e['incipit'])
        if len(w) < 8:
            return []
        out = []
        for k in keys:
            if k == w or (len(w) >= 10 and k.startswith(w)) or (len(k) >= 10 and w.startswith(k)):
                out += byk[k]
        return out

    def compat(e, h):
        pc = _ref_part(e['part'])
        return not (pc and h.get('category') and arm_key(pc) != arm_key(h['category']))
    # monotone offset E-page minus our page, from hymns with exactly one compatible E entry that has one page
    ent_by_h = collections.defaultdict(list)
    for e in ents:
        if e['src'] == 'E':
            for h in key_match(e):
                if compat(e, h):
                    ent_by_h[h['id']].append(e)
    hy = {h['id']: h for h in hymns}
    off = collections.defaultdict(list)
    for hid, es in ent_by_h.items():
        if len(es) == 1 and len(es[0]['pages']) == 1 and hy[hid].get('pages'):
            a = hy[hid]['pages'][0]
            off[a // 20].append(es[0]['pages'][0] - a)
    pts = sorted((k * 20 + 10, sorted(v)[len(v) // 2]) for k, v in off.items() if len(v) >= 3)

    def fpage(pg):
        if not pts:
            return pg
        if pg <= pts[0][0]:
            return pg + pts[0][1]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if pg <= x1:
                return pg + y0 + (y1 - y0) * (pg - x0) / (x1 - x0)
        return pg + pts[-1][1]
    res = collections.defaultdict(lambda: collections.defaultdict(set))
    alias = {}   # (hymn id, alias key) -> {'src','part','pages'}: the list's own wording of the opening, tied to the hymn it stands for
    for hid, es in ent_by_h.items():
        for e in es:
            if any(abs(fpage(pg) - b) <= 5 for pg in (hy[hid].get('pages') or []) for b in e['pages']):
                res[hid]['E'].add(e['mode'])
                alias[(hid, arm_key(e['incipit']))] = {'src': 'E', 'part': e['part'], 'pages': e['pages'], 'mode': e['mode']}
    byp = collections.defaultdict(list)
    for h in hymns:
        for pg in h.get('pages') or []:
            byp[pg].append(h)
    for e in ents:
        if e['src'] != 'E':
            continue
        w = arm_key(e['incipit'])
        if len(w) < 5:
            continue
        cand = {}
        for pg in range(1, 530):
            if any(abs(fpage(pg) - b) <= 5 for b in e['pages']):
                for h in byp.get(pg, []):
                    cand[h['id']] = h
        sc = sorted(((difflib.SequenceMatcher(None, w[:min(len(w), len(h['key']), 16)], h['key'][:min(len(w), len(h['key']), 16)]).ratio(), hid)
                     for hid, h in cand.items() if compat(e, h)), reverse=True)
        if sc and sc[0][0] >= 0.7 and (len(sc) == 1 or sc[0][0] - sc[1][0] >= 0.04):
            res[sc[0][1]]['E'].add(e['mode'])
            alias[(sc[0][1], w)] = {'src': 'E', 'part': e['part'], 'pages': e['pages'], 'mode': e['mode']}
    for e in ents:
        if e['src'] in ('J', 'L'):
            for h in key_match(e):
                if compat(e, h):
                    res[h['id']][e['src']].add(e['mode'])
    reference_modes.aliases = alias
    return {hid: {src: next(iter(m)) for src, m in d.items() if len(m) == 1} for hid, d in res.items()}


import sys as _sys
_sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from findikyan_modes import course_modes  # noqa: E402


def reconcile_modes(hymns):
    """Final `mode` of every hymn, decided by evidence rank, never by a count of votes.

    Printed evidence outranks transcription: (1) the margin tag the Unicode edition kept beside the hymn (typed from the print), (2) the printed heading
    «<ordinal> ձայն» of the generic canon the hymn stands in; (3) only then the index (our transcription of the margin label) and the Krapar corpus's mode.
    The index and the Krapar corpus are not independent witnesses for Գ/Դ: they disagree with the printed margin label in the same way (Դ for Գ, Կ for Ձ);
    the scan pages confirm the printed reading (p244 «Հարց Երրորդ ձայն» with the margin label գձ; p62 margin label գկ where index and Krapar say ԴԿ; p28 հրց/գձ).
    Where only index and Krapar speak and differ, the index is kept and the hymn is flagged `conflict_unresolved`; where nothing else speaks it is `index_only`.
    `mode_status`: printed_margin | printed_heading | agreed | index_only | conflict_unresolved; `mode_checks` lists every witness that disagrees with the decision; `mode_index` keeps
    the index's own value when it was changed (reversible)."""
    kr = krapar_modes()
    scan = scan_margin_evidence()
    refs = reference_modes(hymns)
    course, course_report = course_modes(hymns)   # Y1: Fr Findikyan's course text (authoritative); ranks below the printed margin tag and heading
    c = collections.Counter()
    for h in hymns:
        idx = h.pop('_idx', h.get('mode'))
        head, head_why = h.pop('_head', None), h.pop('_head_why', None)
        mg, tag = h.pop('_margin', None), h.pop('_margin_tag', None)
        k = kr.get(h['id'])
        checks = {}   # filled after the decision: the witnesses that disagree with it
        if mg:
            final, status, why = mg, 'printed_margin', f"margin tag «{tag}» beside the hymn (kept by the Unicode edition)"
        elif head:
            final, status, why = head, 'printed_heading', head_why
        elif h['id'] in course:
            cm_ = course[h['id']]
            final, status = cm_['mode'], 'course_text'
            why = f"the course text {cm_['src']} ({cm_.get('series')}) prints tone {cm_['mode']} for this hymn" + (f" on p.{cm_['page']}" if cm_.get('page') else '')
        else:
            final = idx
            if k and k != idx:
                status = 'conflict_unresolved'
            elif k or (idx and any(v == idx for v in (mg, head))):
                status = 'agreed'
            else:
                status = 'index_only'
            why = None
            # F2: the owner's reference lists (E Echmiadzin TOC, J Jerusalem 1956 list, L Sharagan List) vote where no printed label or heading speaks
            refd = refs.get(h['id']) or {}
            vote = collections.Counter()
            for src_, m_ in refd.items():
                vote[m_] += REF_WEIGHT[src_]
            if k:
                vote[k] += REF_WEIGHT['K']
            if idx:
                vote[idx] += REF_WEIGHT['I']
            if refd:
                best, bs = vote.most_common(1)[0]
                sc0 = scan.get(h['id'])
                if sc0 and sc0.get('half') and best != idx and best[1] != sc0['half']:
                    best = best[0] + sc0['half']          # the Ձ/Կ half printed on the scan outranks the lists
                n_lists = sum(1 for m_ in refd.values() if m_ == best)
                if best != idx and bs >= REF_NEED and bs - vote.get(idx, 0) >= REF_GAP and n_lists == 1 and k != best:
                    status = 'reference_single'           # one list alone dissents: recorded in mode_checks, the index stands (calibration: 71% right, vs 92% for two lists)
                elif best != idx and bs >= REF_NEED and bs - vote.get(idx, 0) >= REF_GAP:
                    final, status = best, 'reference_vote'
                    why = 'reference lists ' + ', '.join(f'{s_} {m_}' for s_, m_ in sorted(refd.items())) + (f', krapar {k}' if k else '') + f" outvote the index ({vote.get(idx, 0):.1f} vs {bs:.1f})"
                elif any(m_ == idx for m_ in refd.values()):
                    status = 'reference_confirmed'
        # M1: the printed label read from the scan (letter Ա/Բ proven; Գ/Դ only as a family; the Ձ/Կ half in both cases)
        sc = scan.get(h['id'])
        scan_note = None
        if sc:
            ref = (sc.get('source') or {})
            where = f"scan label p{ref.get('page')} {ref.get('strip')} «{ref.get('part')}»"
            if sc['kind'] == 'letter':
                if final != sc['mode']:
                    final, status = sc['mode'], 'printed_margin_scan'
                    why = f"{where} prints {sc['mode']} (letter read on the scan; the other witnesses: " + ', '.join(f'{w} {v}' for w, v in (('index', idx), ('krapar', k), ('margin tag', mg), ('heading', head)) if v) + ')'
                else:
                    scan_note = 'scan confirms'
            else:
                if final[0] not in 'ԳԴ':
                    alt = next((v for v in (idx, k) if v and v[0] in 'ԳԴ'), None)
                    if alt:
                        final, status = alt, 'scan_family_corrected'
                        why = f"{where} shows the Գ/Դ glyph, which excludes {why or 'the earlier reading'}"
                    else:
                        status = 'conflict_unresolved'
                        scan_note = f"{where} shows the Գ/Դ glyph but no witness names Գ or Դ"
                elif sc['half'] != final[1]:
                    scan_note = f"{where} reads the half as {sc['half']}, the decision has {final[1]}"
                else:
                    scan_note = 'scan family confirms'
        checks = {w: v for w, v in (('index', idx), ('krapar', k), ('margin', mg), ('heading', head), ('course_text', (course.get(h['id']) or {}).get('mode'))) if v and v != final}
        for src_, m_ in (refs.get(h['id']) or {}).items():
            if m_ != final:
                checks['ref_' + src_] = m_
        if refs.get(h['id']):
            h['mode_refs'] = refs[h['id']]
        if scan_note and not scan_note.endswith('confirms'):
            checks['scan'] = scan_note
        h['mode'] = final
        if final != idx:
            h['mode_index'] = idx
            h['mode_basis'] = f"{why}: the index's {idx} is read as {final}" if why else f"index {idx}"
        elif status in ('printed_margin', 'printed_heading', 'course_text'):
            status = 'agreed'
        if sc and scan_note and scan_note.endswith('confirms'):
            h['mode_scan'] = scan_note
        h['mode_status'] = status
        if checks:
            h['mode_checks'] = checks
        c[status] += 1
    al = getattr(reference_modes, 'aliases', {})
    write_json(os.path.join(OUT, 'hymn_aliases.json'), {'schema': 'hymn-aliases/1.0', 'source': 'Sharagan TOC Echmiadzin (page-aware match)',
               'aliases': sorted([[k, hid, v['part'], v['mode'], v['pages']] for (hid, k), v in al.items() if len(k) >= 5])})
    listed = collections.defaultdict(list)
    for (hid, k), v in al.items():
        listed[hid].append(v['part'])
    for h in hymns:
        if h['id'] in listed:
            h['ref_listed'] = sorted(set(listed[h['id']]))[:3]   # the Echmiadzin TOC lists this hymn at (about) this place, under this part/occasion
    return {'mode_status': dict(c), 'krapar_modes': len(kr), 'aliases': len(al), 'course_text': {k_: len(v_) for k_, v_ in course_report.items()}, 'course_text_report': {k_: v_ for k_, v_ in course_report.items() if k_ in ('ambiguous', 'unmapped', 'accepted')}}


def build_hymn_openings():
    """Opening words of every stanza after the first (the Tonatsoyts often cues a stanza inside a hymn, e.g. the Hambardzi lists).
    Compact rows [hymn_id, stanza_n, first_scan_page, opening_key]; the first stanza is the hymn incipit already in hymn_index."""
    st = json.load(open(os.path.join(PROJ, 'output/sharagnots_anchored/stanzas.json'), encoding='utf-8'))['stanzas']
    rows = []
    for x in st:
        if (x.get('stanza_n') or 1) <= 1:
            continue
        pages = x.get('scan_pages') or []
        key = arm_key(x.get('reading') or x.get('unicode') or '')[:16]
        if len(key) >= 4 and pages:
            rows.append([x['hymn_id'], x['stanza_n'], pages[0], key])
    write_json(os.path.join(OUT, 'hymn_openings.json'), {'schema': 'hymn-openings/1.0', 'source': 'output/sharagnots_anchored/stanzas.json', 'rows': rows})
    return rows


# canonical order of the parts of a Sharagnots canon (owner model) and the printed category -> part map
PART_OF = {'օրհնութիւն': 'orhnutyun', 'օրհնութիւն պահոց': 'orhnutyun', 'հարց': 'harts', 'գործք': 'harts', 'մեծացուսցէ': 'metsatsutse', 'ողորմեա': 'voghormya',
           'տէր յերկնից': 'der_hergnits', 'տէր երկնից': 'der_hergnits', 'մանկունք': 'mankunk', 'ճաշու': 'jashoo', 'համբարձի': 'hampartsi'}
# categories that are sub-headings inside the current part (an Orhnutyun runs through changing sub-headings: of the Cross, of the Mother of God, ...)
SUBHEADS = {'խաչի', 'աստուածածնի', 'յարութեան', 'յարութիւն', 'ապաշխարութիւն', 'ապաշխարութեան', 'ապաշխարհութեան', 'հանգստեան', 'մարտիրոսաց', 'հոգեգալուստ', 'հոգեգալստեան', 'ծնունդ', 'ծննդեան', 'առաքելոց', 'հայրապետաց', 'ողբ', 'մարգարէից'}


# margin abbreviations / words that name a part; a marker naming two parts at once (``ճշ․ մնկ``) serves both
MARKER_TOKENS = {'օրհ': 'orhnutyun', 'օրհնութիւն': 'orhnutyun', 'հրց': 'harts', 'հարց': 'harts', 'գործք': 'harts', 'մեծ': 'metsatsutse', 'մեծացուսցէ': 'metsatsutse',
                 'ող': 'voghormya', 'ողր': 'voghormya', 'ողբ': 'voghormya', 'ողորմեա': 'voghormya', 'տէր': 'der_hergnits', 'մնկ': 'mankunk', 'մկ': 'mankunk', 'մանկունք': 'mankunk',
                 'ճշ': 'jashoo', 'ճաշու': 'jashoo', 'հմբ': 'hampartsi', 'համբարձի': 'hampartsi'}
PART_ORDER = ['orhnutyun', 'harts', 'metsatsutse', 'voghormya', 'der_hergnits', 'mankunk', 'jashoo', 'hampartsi']
OTHER_CATS = {'մեղեդի', 'երգ', 'շարական', 'ողբ երգ'}


def parts_in_marker(text):
    """Parts named by a printed margin marker, in canon order ([] when the marker names none or is a bare sub-heading)."""
    toks = [t for t in re.split(r'[^\u0531-\u058f]+', (text or '').lower()) if t]
    found = []
    for t in toks:
        pt = MARKER_TOKENS.get(t)
        if pt and pt not in found:
            found.append(pt)
    # a lone «ող» / «ողբ» is the plain Voghormya marker; «ողբ» is also a sub-heading word elsewhere, so only multi-token markers are read here
    if len(toks) < 2:
        return []
    return sorted(found, key=PART_ORDER.index)


def is_subhead(ck, raw):
    return ck in SUBHEADS


def build_canon_parts():
    """Every headed canon with its hymns in book order, each hymn assigned to a part. A hymn's part is the printed category it carries
    (Օրհնութիւն, Հարց, Գործք, Մեծացուսցէ, Ողորմեա, Տէր յերկնից, Մանկունք, Ճաշու, Համբարձի); a hymn without one continues the part above it
    (an Orhnutyun runs until the next Harts, a Harts includes its Gordzk); the first hymn of a canon with no category is taken as its Orhnutyun
    (flagged inferred). Stanzas are referenced by id only, one scan page per hymn."""
    ix = json.load(open(os.path.join(PROJ, 'output/sharagnots_anchored/index.json'), encoding='utf-8'))
    canons, head, order = {}, None, []
    for s in ix['sections']:
        if (s.get('title') or '').strip():
            head = s['id']
            canons[head] = {'title': s.get('title'), 'kind': s.get('kind'), 'pages': s.get('pages'), 'hymns': []}
            order.append(head)
        if head is None:
            continue
        for h in sorted(s.get('hymns') or [], key=lambda x: x.get('seq') or 0):
            cat = h.get('category') or {}
            exp = cat.get('expanded')
            canons[head]['hymns'].append({'id': h['id'], 'block': s['id'], 'incipit': h.get('incipit'), 'mode': MODE_FIX.get(h['id'], h.get('mode')), 'page': (h.get('pages') or [None])[0], 'pages': h.get('pages'),
                                          'stanza_ids': h.get('stanza_ids'), 'cat_printed': cat.get('source'), 'cat': exp})
    # margin abbreviations kept by the Unicode document (Fr Ghevond Ajemian): a second, independent witness of where each part starts
    UNI = {'տ': 'der_hergnits', 'մ': 'metsatsutse', 'գ': 'harts', 'ո': 'voghormya', 'հ': 'harts', 'ճշ': 'jashoo', 'մկ': 'mankunk', 'հբ': 'hampartsi'}
    units = {u['u']: u for u in json.load(open(os.path.join(PROJ, 'output/sharagnots_unicode_proof/unicode_units.json'), encoding='utf-8'))['units']}
    st = json.load(open(os.path.join(PROJ, 'output/sharagnots_anchored/stanzas.json'), encoding='utf-8'))['stanzas']
    uni_tag = {}
    for x in sorted(st, key=lambda y: (y['hymn_id'], y.get('stanza_n') or 0)):
        if x['hymn_id'] in uni_tag:
            continue
        for uid in x.get('unit_ids') or []:
            u = units.get(int(str(uid).split('-')[-1]))
            for t in (u or {}).get('tags') or []:
                if t in UNI and x['hymn_id'] not in uni_tag:
                    uni_tag[x['hymn_id']] = {'part': UNI[t], 'tag': t, 'gordzk': t == 'գ'}
    for cid in order:
        for h in canons[cid]['hymns']:
            if h['id'] in uni_tag:
                h['uni_part'] = uni_tag[h['id']]['part']; h['uni_tag'] = uni_tag[h['id']]['tag']
                if uni_tag[h['id']]['gordzk']:
                    h['uni_gordzk'] = True
    for cid in order:
        prev, first = None, True
        for h in canons[cid]['hymns']:
            ck = (h['cat'] or '').strip().lower()
            raw = (h.get('cat_printed') or '').strip().lower()
            part = PART_OF.get(ck)
            multi = parts_in_marker(ck) or parts_in_marker(raw)
            if len(multi) >= 2:
                # one hymn printed for two parts (e.g. margin «ճշ․ մնկ» = Jashoo and Mankunk): its part is the earlier one in the canon order, the rest go in `also`
                part = multi[0]; h['also'] = multi[1:]
            elif not part and len(multi) == 1:
                part = multi[0]
            if ck and not part and not is_subhead(ck, raw) and (ck.startswith('սաղմոս') or ck in OTHER_CATS):
                part = 'other'
            if not part and (ck or raw):
                h['heading'] = h['cat'] or h.get('cat_printed')   # a sub-heading inside the current part (of Nerses, of the Cross, ...): the part continues
            if part:
                h['part'], h['part_basis'] = part, 'printed category'
                if ck == 'գործք':
                    h['subpart'] = 'gordzk'
            elif prev:
                h['part'], h['part_basis'] = prev, 'continues the part above'
            else:
                h['part'], h['part_basis'] = 'orhnutyun', 'inferred: the first hymn of a canon is its Orhnutyun'
            # F2: the Echmiadzin TOC names the part of (almost) every hymn («Հմբ. Յրթ.», «Ողր. Մրտ.» ...); where our own assignment is only inferred (continues the part
            # above / first hymn of a canon), a different part named there replaces it, recorded in part_basis
            if h['part_basis'] in ('continues the part above', 'inferred: the first hymn of a canon is its Orhnutyun'):
                e_parts = {_E_PART.get(arm_key(v['part'])[:3]) for (hid, k), v in getattr(reference_modes, 'aliases', {}).items() if hid == h['id']} - {None}
                if len(e_parts) == 1 and next(iter(e_parts)) != h['part']:
                    h['part_index'], h['part'] = h['part'], next(iter(e_parts))
                    h['part_basis'] = f"the Echmiadzin TOC lists it as «{next(v['part'] for (hid, k), v in reference_modes.aliases.items() if hid == h['id'])}» (our own reading was only inferred: {h['part_index']})"
            prev = h['part']
    # the weekday canons («Կանոն Երկուշաբաթի / ... / Ուրբաթի / Շաբաթու աւուրն», one per weekday) are generic by weekday, whatever kind the index gave them
    WD = ['երկուշաբ', 'երեքշաբ', 'չորեքշաբ', 'հինգշաբ', 'ուրբաթ', 'շաբաթու']
    for cid in order:
        flat = arm_key(re.sub(r'\s+', '', canons[cid].get('title') or ''))
        if flat.startswith('կանոն') and flat.endswith(arm_key('աւուրն')) and any(w in flat for w in (arm_key(x) for x in WD)) and 'աղուհաց' not in flat:
            canons[cid]['kind'] = 'generic_by_weekday'
    # families: «Կանոն ... ըստ ութն ձայնից» (a canon given by the eight modes) is followed by short partial sections, one per mode or side
    # (Առաջին կողմն, Աւագ կողմն, Վառ ձայն, Վերջ ձայնի ...) that belong to it
    fam, fam_title, root = None, None, None
    for cid in order:
        c = canons[cid]
        flat = arm_key(re.sub(r'\s+', '', c.get('title') or ''))
        if ('ստւթնձայն' in flat or 'ստւթձայն' in flat) and c.get('kind') in ('full_canon', 'generic_by_mode', 'generic_by_weekday'):
            fam, fam_title = cid, c['title']
            c['family'], c['family_title'] = cid, fam_title
        elif fam and c.get('kind') == 'partial':
            c['family'], c['family_title'] = fam, fam_title
        elif root and c.get('kind') in ('partial', 'generic_by_mode') and flat.startswith('հարց') and ((c.get('pages') or [0])[0] - (canons[root].get('pages') or [0])[0]) <= 40:
            # a Harts-only partial («Հարց ․ Վառ ձայն», «Վերջ ձայնի») a few pages after the root of its series continues that series
            c['family'], c['family_title'] = root, canons[root]['title']
        else:
            fam = fam_title = None
        if c.get('family') == cid:
            root = cid
    write_json(os.path.join(OUT, 'canon_parts.json'), {'schema': 'canon-parts/1.0', 'source': 'output/sharagnots_anchored/index.json', 'order': order, 'canons': canons})
    return canons


def build_record_canons(secs):
    links = json.load(open(os.path.join(PROJ, 'output/canonical/links.json'), encoding='utf-8'))['links']
    canons = {c['ordinal']: c for c in json.load(open(os.path.join(PROJ, 'output/canonical/sharagnots_canons.json'), encoding='utf-8'))['canons']}
    by_canon_id = {}
    for c in canons.values():
        for h in c.get('hymns') or []:
            by_canon_id[h['canon_id']] = c
    secs = [x for x in secs if x['key']]
    def find_sections(k):
        if not k:
            return [], None
        eq = [x for x in secs if x['key'] == k]
        if eq:
            return eq, 'title_equal'
        cont = [x for x in secs if len(k) >= 10 and len(x['key']) >= 10 and (k in x['key'] or x['key'] in k)]
        if cont:
            return cont[:3], 'title_contains'
        best = sorted(((difflib.SequenceMatcher(None, k, x['key']).ratio(), x) for x in secs if abs(len(x['key']) - len(k)) < max(12, len(k) // 2)), key=lambda t: -t[0])[:1]
        if best and best[0][0] >= 0.8:
            return [best[0][1]], f'title_similar_{best[0][0]:.2f}'
        return [], None
    out = collections.defaultdict(list)
    unmapped = 0
    for l in links:
        if l['relation'] != 'feast_has_canon':
            continue
        c = by_canon_id.get(l['to']['id'])
        if not c:
            unmapped += 1
            continue
        k = arm_key(re.sub(r'\s+', '', c.get('title_armenian') or ''))
        sec, how = find_sections(k)
        out[l['from']['id']].append({'canon_title': c.get('title_armenian'), 'confidence': l.get('confidence'), 'review_status': l.get('review_status'),
                                     'method': l.get('match_method'), 'sections': [x['id'] for x in sec], 'section_match': how, 'mapped': bool(sec)})
    write_json(os.path.join(OUT, 'record_canons.json'), {'schema': 'record-canons/1.0', 'source': 'output/canonical/links.json (feast_has_canon) mapped to anchored sections by title', 'unmapped_canon_ids': unmapped, 'records': out})
    return out


if __name__ == '__main__':
    r = build_readings_index()
    h, s = build_hymn_index()
    build_hymn_openings()
    build_canon_parts()
    c = build_record_canons(s)
    print(json.dumps({'reading_keys': len(r), 'hymns': len(h), 'sections': len(s), 'records_with_canons': len(c)}))
