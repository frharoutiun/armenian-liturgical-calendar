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
    ix = json.load(open(os.path.join(PROJ, 'output/sharagnots_anchored/index.json'), encoding='utf-8'))
    hymns, secs = [], []
    for s in ix['sections']:
        secs.append({'id': s['id'], 'title': s.get('title'), 'kind': s.get('kind'), 'modes': s.get('modes'), 'pages': s.get('pages'), 'key': sec_title_key(s.get('title'))})
        for h in s.get('hymns') or []:
            hymns.append({'id': h['id'], 'section': s['id'], 'seq': h.get('seq'), 'incipit': h.get('incipit'), 'key': arm_key(h.get('incipit')),
                          'category': (h.get('category') or {}).get('expanded') or (h.get('category') or {}).get('source'), 'mode': h.get('mode'), 'pages': h.get('pages'), 'n_stanzas': h.get('n_stanzas')})
    write_json(os.path.join(OUT, 'hymn_index.json'), {'schema': 'hymn-index/1.0', 'source': 'output/sharagnots_anchored/index.json', 'hymns': hymns, 'sections': [s for s in secs if s['key']]})
    return hymns, secs


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
    c = build_record_canons(s)
    print(json.dumps({'reading_keys': len(r), 'hymns': len(h), 'sections': len(s), 'records_with_canons': len(c)}))
