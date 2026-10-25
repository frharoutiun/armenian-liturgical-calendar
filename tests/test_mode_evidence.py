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
            self.assertIn(h['mode_status'], ('agreed', 'index_only', 'printed_margin', 'printed_heading', 'conflict_unresolved'))

    def test_counts(self):
        c = IDX['mode_fixes']['mode_status']
        self.assertEqual(sum(c.values()), len(H))
        self.assertEqual(c['printed_margin'], sum(1 for h in H if h['mode_status'] == 'printed_margin'))

    def test_printed_label_outranks_index_and_krapar(self):
        # p62 «Առաքեալ եւ նախավկայ»: the printed margin label reads գկ; the index and the Krapar corpus say ԴԿ (the same Գ/Դ confusion)
        h = BY['SH6281b7011f']
        self.assertEqual(h['mode'], 'ԳԿ'); self.assertEqual(h['mode_index'], 'ԴԿ'); self.assertEqual(h['mode_status'], 'printed_margin')
        self.assertEqual(h['mode_checks'].get('krapar'), 'ԴԿ')

    def test_reversible(self):
        for h in H:
            if h['mode'] != h.get('mode_index', h['mode']):
                self.assertIn('mode_basis', h)
            if h['mode_status'] in ('index_only', 'conflict_unresolved', 'agreed') and 'mode_index' in h:
                self.assertEqual(h['mode_status'], 'agreed')

    def test_unresolved_conflicts_keep_the_index_reading(self):
        for h in H:
            if h['mode_status'] == 'conflict_unresolved':
                self.assertNotIn('mode_index', h)
                self.assertIn('krapar', h['mode_checks'])


if __name__ == '__main__':
    unittest.main()
