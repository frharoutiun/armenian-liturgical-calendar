"""Y1: the chants layer pairs Armenian (LXX) psalm numbers with English (Masoretic) chapters; the course text (Findikyan, LS323 p.2-3, 'Numeration of the Psalms')
is the authority for the numbering: LXX 1-8 = MT 1-8; 9:1-21 = 9; 9:22-39 = 10; 10-112 = 11-113; 113:1-8 = 114; 113:9-26 = 115; 114 = 116a; 115 = 116b; 116 = 117;
117-144 = 118-145; 145 = 146; 146 = 147a; 147 = 147b; 148-150 = 148-150."""
import json, os, re, unittest
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def mt_chapter(lxx, v):
    if lxx <= 8: return lxx
    if lxx == 9: return 9 if v <= 21 else 10
    if 10 <= lxx <= 112: return lxx + 1
    if lxx == 113: return 114 if v <= 8 else 115
    if lxx in (114, 115): return 116
    if lxx == 116: return 117
    if 117 <= lxx <= 144: return lxx + 1
    if lxx == 145: return 146
    if lxx in (146, 147): return 147
    return lxx


class PsalmNumbering(unittest.TestCase):
    def test_table_spot_values(self):
        for lxx, v, mt in ((1, 1, 1), (9, 21, 9), (9, 22, 10), (10, 1, 11), (50, 1, 51), (112, 1, 113), (113, 8, 114), (113, 9, 115), (114, 1, 116), (115, 1, 116),
                           (116, 1, 117), (131, 1, 132), (145, 1, 146), (146, 1, 147), (147, 1, 147), (148, 1, 148)):
            self.assertEqual(mt_chapter(lxx, v), mt, (lxx, v))

    def test_chants_layer_english_chapters_follow_the_table(self):
        c = json.load(open(os.path.join(SITE, 'data/calendar/chants_layer.json'), encoding='utf-8'))['chants']
        n = 0
        for ch in c.values():
            for sg in ch.get('segments', []):
                a = sg.get('armenian_ref') or ''
                e = sg.get('english_ref_esv_lookup') or sg.get('english_ref_kjv') or ''
                m, m2 = re.match(r'Ps (\d+):(\d+)', a), re.match(r'(?:Psalm|Ps) (\d+)', e)
                if m and m2:
                    n += 1
                    self.assertEqual(int(m2.group(1)), mt_chapter(int(m.group(1)), int(m.group(2))), (a, e))
        self.assertGreater(n, 400)


if __name__ == '__main__':
    unittest.main()
