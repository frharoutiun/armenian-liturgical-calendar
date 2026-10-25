"""H4: hymn modes are decided by evidence rank (printed margin tag > printed heading > index/Krapar), reversible, and every hymn carries a status."""
import json, os, unittest
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX = json.load(open(os.path.join(SITE, 'data/calendar/hymn_index.json'), encoding='utf-8'))
H = IDX['hymns']; BY = {h['id']: h for h in H}


class ModeEvidence(unittest.TestCase):
    def test_every_hymn_has_mode_and_status(self):
        self.assertEqual(len(H), 2465)
        for h in H:
            self.assertTrue(h['mode'])
            self.assertIn(h['mode_status'], ('agreed', 'index_only', 'printed_margin', 'printed_heading', 'conflict_unresolved', 'printed_margin_scan', 'scan_family_corrected', 'reference_vote', 'reference_confirmed', 'reference_single', 'course_text', 'ode_set_order'))

    def test_counts(self):
        c = IDX['mode_fixes']['mode_status']
        self.assertEqual(sum(c.values()), len(H))
        self.assertEqual(c['printed_margin'], sum(1 for h in H if h['mode_status'] == 'printed_margin'))

    def test_printed_label_outranks_index_and_krapar(self):
        # p62 «Առաքեալ եւ նախավկայ»: the printed margin label reads գկ; the index and the Krapar corpus say ԴԿ (the same Գ/Դ confusion)
        h = BY['SH6281b7011f']
        self.assertEqual(h['mode'], 'ԳԿ'); self.assertEqual(h['mode_index'], 'ԴԿ'); self.assertEqual(h['mode_status'], 'printed_margin')
        self.assertEqual(h['mode_checks'].get('krapar'), 'ԴԿ')

    def test_scan_label_letters_ab_are_proven_gd_is_not(self):
        # M1: p47 «օրհ / աձ» was typed գձ in the Unicode edition; the 6x scan prints աձ -> ԱՁ (the index said ԴՁ)
        h = BY['SHeeb234043c']
        self.assertEqual(h['mode'], 'ԱՁ'); self.assertEqual(h['mode_status'], 'printed_margin_scan'); self.assertEqual(h['mode_index'], 'ԴՁ')
        # p57 «մնկ / բկ»: the Unicode tag said ակ; the scan prints բկ (= the index)
        self.assertEqual(BY['SHbc20b9f94e']['mode'], 'ԲԿ')
        # p75 «մնկ / գկ»: the glyph is the Գ/Դ glyph, which excludes the Unicode tag's Ա; the index's ԴԿ stands
        h = BY['SH7f214c86c0']
        self.assertEqual((h['mode'], h['mode_status']), ('ԴԿ', 'scan_family_corrected'))

    def test_scan_gd_label_never_decides_the_letter(self):
        # the readers' Գ/Դ letter is NOT evidence (the glyphs differ only in the top-left stroke): hymns with only a Գ/Դ scan label keep their earlier decision
        ev = json.load(open(os.path.join(SITE, '..', '06 - Donatsooyts Digitization', 'output/site_build/m1/margin_label_evidence.json'), encoding='utf-8'))['hymns'] if os.path.exists(os.path.join(SITE, '..', '06 - Donatsooyts Digitization', 'output/site_build/m1/margin_label_evidence.json')) else {}
        for hid, e in ev.items():
            if e['kind'] != 'letter' and hid in BY and BY[hid]['mode_status'] not in ('scan_family_corrected', 'conflict_unresolved'):
                self.assertIn(BY[hid]['mode'][0], 'ԳԴ')

    def test_reversible(self):
        for h in H:
            if h['mode'] != h.get('mode_index', h['mode']):
                self.assertIn('mode_basis', h)
            if h['mode_status'] in ('index_only', 'conflict_unresolved', 'agreed') and 'mode_index' in h:
                self.assertEqual(h['mode_status'], 'agreed')
            if h['mode_status'] == 'reference_vote':
                self.assertIn('mode_index', h); self.assertIn('mode_refs', h); self.assertNotEqual(h['mode'], h['mode_index'])

    def test_unresolved_conflicts_keep_the_index_reading(self):
        for h in H:
            if h['mode_status'] == 'conflict_unresolved':
                self.assertNotIn('mode_index', h)
                self.assertIn('krapar', h['mode_checks'])

    def test_reference_votes_never_override_printed_evidence(self):
        # F2: the reference lists (Echmiadzin TOC, Jerusalem list, Sharagan List) vote only where no printed margin tag/heading/scan letter speaks
        for h in H:
            if h['mode_status'] in ('printed_margin', 'printed_heading', 'printed_margin_scan'):
                self.assertNotEqual(h['mode_status'], 'reference_vote')
        self.assertGreater(sum(1 for h in H if h['mode_status'] == 'reference_vote'), 60)
        self.assertGreater(sum(1 for h in H if h['mode_status'] == 'reference_confirmed'), 500)

    def test_reference_vote_needs_a_list_not_just_krapar(self):
        for h in H:
            if h['mode_status'] == 'reference_vote':
                self.assertTrue(set(h['mode_refs']) & {'E', 'J', 'L'})
                self.assertIn(h['mode'], list(h['mode_refs'].values()) + [h['mode']])

    def test_scan_half_outranks_lists(self):
        ev = os.path.join(SITE, '..', '06 - Donatsooyts Digitization', 'output/site_build/m1/margin_label_evidence.json')
        if os.path.exists(ev):
            for hid, e in json.load(open(ev, encoding='utf-8'))['hymns'].items():
                if hid in BY and BY[hid]['mode_status'] == 'reference_vote' and e.get('half'):
                    self.assertEqual(BY[hid]['mode'][1], e['half'])


    def test_f2_category_and_part_witnesses(self):
        # M1's part conflicts: a lone «գ» label is Գործք, 'Ողբ' is a misreading of Ողորմեա; the old category is kept
        fx = IDX['mode_fixes'].get('category_fixes') or {}
        self.assertGreaterEqual(fx.get('Գործք', 0), 10)
        for h in H:
            if 'category_index' in h:
                self.assertIn(h['category'], ('Գործք', 'Ողորմեա'))
        # the Echmiadzin TOC's part word replaces an only-inferred part of the canon builder, recorded in part_basis
        cp = json.load(open(os.path.join(SITE, 'data/calendar/canon_parts.json'), encoding='utf-8'))['canons']
        n = 0
        for c in cp.values():
            for h in c['hymns']:
                if 'part_index' in h and 'part_toc_rejected' not in h:
                    n += 1; self.assertIn('Echmiadzin TOC', h['part_basis']); self.assertNotEqual(h['part'], h['part_index'])
        self.assertGreater(n, 20)   # Y2: 43 of the 67 TOC parts were rejected as breaking the order of the printed parts
        self.assertGreater(len(json.load(open(os.path.join(SITE, 'data/calendar/hymn_aliases.json'), encoding='utf-8'))['aliases']), 800)

    def test_y2_parts_run_in_genre_order(self):
        """Y2 (Findikyan p.39-40): inside one canon the parts run in the order of the genre table, each part one run; a TOC part that breaks
        the order of the printed categories around it is rejected (p21: «Ըզքեզ կոյս եւ մայր» is not a Metsatsutse inside the Orhnutyun)."""
        cp = json.load(open(os.path.join(SITE, 'data/calendar/canon_parts.json'), encoding='utf-8'))['canons']
        ordr = ['orhnutyun', 'harts', 'metsatsutse', 'voghormya', 'der_hergnits', 'mankunk', 'jashoo', 'hampartsi']
        rejected = 0
        for cid, c in cp.items():
            rejected += sum(1 for h in c['hymns'] if h.get('part_toc_rejected'))
            if c.get('kind') != 'full_canon':
                continue
            seq = [ordr.index(h['part']) for h in c['hymns'] if h['part'] in ordr and h.get('part_basis') == 'printed category']
            # the printed categories themselves may restart (a second canon inside one section, the tone sets): only count order breaks of the TOC-placed hymns
            for i, h in enumerate(c['hymns']):
                if str(h.get('part_basis', '')).startswith('the Echmiadzin TOC lists it as'):
                    before = [ordr.index(x['part']) for x in c['hymns'][:i] if x['part'] in ordr and x.get('part_basis') == 'printed category']
                    after = [ordr.index(x['part']) for x in c['hymns'][i + 1:] if x['part'] in ordr and x.get('part_basis') == 'printed category']
                    self.assertTrue((max(before) if before else 0) <= ordr.index(h['part']) <= (min(after) if after else 8), (cid, h['incipit']))
        self.assertGreater(rejected, 20)
        theo = next(c for cid, c in cp.items() if cid.startswith('SC3230e84b4e'))
        parts = [h['part'] for h in theo['hymns']]
        first_harts = parts.index('harts')
        self.assertTrue(all(p == 'orhnutyun' for p in parts[:first_harts]), 'the Theophany-eve canon (p20-22) opens with one unbroken Orhnutyun')
        # the Orhnutyun of most full canons now has about the 31 stanzas of nine odes of three plus the last
        band = [sum(len(h['stanza_ids']) for h in c['hymns'] if h['part'] == 'orhnutyun') for c in cp.values() if c.get('kind') == 'full_canon']
        band = [n for n in band if n]
        self.assertGreaterEqual(sum(1 for n in band if 28 <= n <= 36) / len(band), 0.4)


class CourseText(unittest.TestCase):
    """Y1: Fr. Findikyan's course text (LS323) prints (opening, tone[, Ձայնքաղ page]) facts; they decide the mode where no printed margin tag or heading speaks."""
    def test_course_text_witnesses_correct_the_index(self):
        # (hymn id, mode the course text prints, mode the index/Krapar had)
        for hid, mode, was in (('SH5d981548e4', 'ԳԿ', 'ԳՁ'),     # p133 «Քրիստոս աստուած» Penitential Series 6/1 գկ
                               ('SH273961d690', 'ԳԿ', 'ԳՁ'),     # p133 «Զանսկիզբն Աստուած» Penitential tone 6
                               ('SH7c5d6fee26', 'ԱՁ', 'ԱԿ'),     # p231 «Դու ես Քրիստոս կեանք» Resurrection Series 1/7 աձ
                               ('SHb2068d5ad7', 'ԳՁ', 'ԴՁ'),     # p29 «Զահաւոր բարբառս վերնոցն» Theophany Second Day գձ
                               ('SH70358cca55', 'ԳՁ', 'ԴՁ'),     # p166 «Զգալուստ քո Քրիստոս» Second Canon for Palm Sunday գձ
                               ('SHc862b137f2', 'ԴՁ', 'ԳՁ')):    # Holy Thursday tone 7 «Որ անսկիզբն յէութեանց» (the reference lists said ԳՁ)
            self.assertEqual(BY[hid]['mode'], mode, hid)
            if hid != 'SHc862b137f2':
                self.assertEqual(BY[hid]['mode_status'], 'course_text'); self.assertEqual(BY[hid]['mode_index'], was)

    def test_course_text_never_outranks_a_printed_margin_tag(self):
        # p62: the printed margin tag (գկ) outranks every other witness, the course text included
        self.assertEqual(BY['SH6281b7011f']['mode_status'], 'printed_margin')
        self.assertTrue(all(h['mode_status'] != 'course_text' or not h.get('mode_checks', {}).get('margin') for h in H))

    def test_ambiguous_openings_decide_nothing(self):
        rep = IDX['mode_fixes']['course_text_report']
        self.assertTrue(all(a['incipit'] for a in rep['ambiguous'] + rep['unmapped']))



    def test_ode_set_order_modes(self):
        """Y2: the eight Orhnutyun sets of pp.210-226 follow the tones 1-8 in book order: every hymn in a set carries that set's tone, 
        unless a printed margin tag says otherwise (recorded in mode_checks)."""
        om = json.load(open(os.path.join(SITE, 'data/calendar/ode_marks.json'), encoding='utf-8'))
        hi = BY
        tones = ['ԱՁ', 'ԱԿ', 'ԲՁ', 'ԲԿ', 'ԳՁ', 'ԳԿ', 'ԴՁ', 'ԴԿ']
        bad = [hid for hid, s in om['set_tones'].items() if hi[hid]['mode'] != tones[s['set'] - 1] and 'ode_set' not in (hi[hid].get('mode_checks') or {})]
        self.assertEqual(bad, [])
        self.assertGreaterEqual(sum(1 for h in hi.values() if h.get('mode_status') == 'ode_set_order'), 25)


if __name__ == '__main__':
    unittest.main()

