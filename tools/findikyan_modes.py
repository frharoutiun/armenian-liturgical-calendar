"""Y1: hymn modes witnessed by Fr. Findikyan's course text (LS323), an authoritative source (owner, 2026-10-25).

`course_modes(hymns)` maps hymn id -> {mode, src, page, series} for the entries of tools/findikyan_witnesses.json that can be tied to ONE hymn of the index:
  * with a page (Ձայնքաղ Jerusalem 1914 pagination = our scan pages): the hymn on that page whose opening starts like the entry's (and the entry's genre when the hymn carries one);
  * without a page: the opening, restricted to the entry's genre; accepted only when exactly ONE hymn carries that opening in that genre. An opening printed in several
    canons (several series of different tones) is not a conflict for the others, so ambiguous entries are listed in the report as `ambiguous` and decide nothing.
Returns (modes, report)."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))


def norm(s):
    s = (s or '').lower().replace('և', 'եւ')
    s = re.sub(r'[^ա-և]', '', s)
    return s.replace('ու', 'ւ').replace('օ', 'ո').replace('ը', '')


def _genre(h):
    return norm(h.get('category') or '')


def course_modes(hymns):
    entries = json.load(open(os.path.join(HERE, 'findikyan_witnesses.json'), encoding='utf-8'))['entries']
    modes, report = {}, {'accepted': [], 'ambiguous': [], 'unmapped': [], 'satisfied': []}
    for e in entries:
        k = norm(e['incipit'])[:11]
        cands = [h for h in hymns if norm(h.get('incipit')).startswith(k) or norm(h.get('key')).startswith(k)]
        g = norm(e['genre'])
        if e.get('page'):
            on = [h for h in cands if h.get('pages') and h['pages'][0] == e['page']]
            if len(on) > 1:
                on = [h for h in on if _genre(h) == g] or on
            if len(on) == 1:
                h = on[0]
            else:
                report['unmapped' if not on else 'ambiguous'].append({**e, 'candidates': [h['id'] for h in on]}); continue
        else:
            in_g = [h for h in cands if _genre(h) == g or (g == norm('Տէր յերկնից') and _genre(h) in (norm('Տէր յերկնից'), norm('Տէր երկնից')))]
            others_ok = [h for h in cands if h.get('mode') == e['mode'] and h not in in_g]
            if len(in_g) == 1 and in_g[0].get('mode') != e['mode'] and others_ok:
                # the only hymn of this genre disagrees, but another hymn with the opening (no category) already carries the printed tone: the course text most
                # likely names that one (several series print the same opening in different tones), so it must not move this hymn
                report.setdefault('satisfied', []).append({**e, 'hymns': [h['id'] for h in others_ok]}); continue
            if len(in_g) != 1 and any(h.get('mode') == e['mode'] for h in cands):
                report.setdefault('satisfied', []).append({**e, 'hymns': [h['id'] for h in cands if h.get('mode') == e['mode']]}); continue
            if len(in_g) == 1:
                h = in_g[0]
            else:
                report['unmapped' if not in_g else 'ambiguous'].append({**e, 'candidates': [h['id'] for h in in_g]}); continue
        modes[h['id']] = {'mode': e['mode'], 'src': 'LS323 p.%d' % e['ls323_page'], 'page': e.get('page'), 'series': e.get('series')}
        report['accepted'].append({'id': h['id'], 'incipit': e['incipit'], 'mode': e['mode'], 'index_mode': h.get('mode'), 'page': (h.get('pages') or [None])[0]})
    return modes, report
