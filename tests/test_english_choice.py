"""E1: one English per stanza, labelled by source (Krapar Sharagnots English vs our Claude translation)."""
import json, os, re, subprocess, sys, unittest
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(p): return json.load(open(os.path.join(SITE, p), encoding="utf8"))

class EnglishChoice(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = load("data/corpus.json"); cls.ai = load("data/ai-en.json")["items"]
        cls.verses = [v for sec in cls.corpus for st in sec["stanzas"] for v in st["verses"]]
    def test_every_stanza_has_exactly_one_english_source(self):
        krapar = [v for v in self.verses if v.get("en")]
        supp = [v for v in self.verses if not v.get("en")]
        self.assertGreater(len(krapar), 4000)
        self.assertTrue(all(v.get("src") != "scan" for v in krapar), "scan supplement verses must not carry Krapar English")
        self.assertTrue(all(v.get("a") in self.ai for v in supp), "every stanza without Krapar English needs our translation")
    def test_renderers_prefer_krapar_and_label_both(self):
        js = open(os.path.join(SITE, "sharagan.js"), encoding="utf8").read()
        self.assertIn("AI translation (Krapar Sharagnots)", js)
        block = js[js.index("function englishBlockHtml"):js.index("function verseMetaHtml")]
        self.assertLess(block.index("verse.en"), block.index("verse.ai"))  # Krapar first, ours only as the fallback
        cal = open(os.path.join(SITE, "calendar.js"), encoding="utf8").read()
        self.assertRegex(cal, r"if \(v\.en && vs\.every\(\(x\) => x\.en\)\) en \+=")
        self.assertRegex(cal, r"else if \(aiT\) en \+=")   # never both
        ext = open(os.path.join(SITE, "day-extras.js"), encoding="utf8").read()
        self.assertIn("AI translation (Krapar Sharagnots)", ext)
    def test_checked_in_sharagan_js_is_the_patch_output(self):
        before = open(os.path.join(SITE, "sharagan.js"), "rb").read()
        subprocess.check_call([sys.executable, os.path.join(SITE, "tools", "apply_patches.py")], stdout=subprocess.DEVNULL)
        self.assertEqual(before, open(os.path.join(SITE, "sharagan.js"), "rb").read())
if __name__ == "__main__": unittest.main()
