"""Tests for the hymnal data build (W6): python3 -m unittest tests.test_hymnal_data   (from the site root)."""
import json, os, re, shutil, subprocess, sys, unittest

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(SITE, "data")
V = os.path.join(SITE, "vendor", "krapar-upstream", "data")


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


class HymnalData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = load(os.path.join(D, "corpus.json"))
        cls.krapar = load(os.path.join(V, "corpus.json"))
        cls.si = load(os.path.join(D, "search-index.json"))
        cls.wf = load(os.path.join(D, "word-forms.json"))
        cls.amap = load(os.path.join(D, "anchor-map.json"))
        cls.report = load(os.path.join(D, "build-report.json"))

    def test_krapar_sections_unchanged(self):
        """Krapar text/English/ids are never altered (additive fields only)."""
        self.assertGreater(len(self.corpus), len(self.krapar))
        for k, s in zip(self.krapar, self.corpus):
            self.assertEqual(k["id"], s["id"])
            for f in ("titleEn", "heading", "category", "hymnTypes", "modes"):
                self.assertEqual(k[f], s[f])
            self.assertEqual(len(k["stanzas"]), len(s["stanzas"]))
            for ks, ss in zip(k["stanzas"], s["stanzas"]):
                self.assertEqual(len(ks["verses"]), len(ss["verses"]))
                for kv, sv in zip(ks["verses"], ss["verses"]):
                    self.assertEqual(kv["text"], sv["text"])
                    self.assertEqual(kv["en"], sv["en"])

    def test_section_id_is_index(self):
        for i, s in enumerate(self.corpus):
            self.assertEqual(s["id"], i)

    def test_every_anchored_stanza_appears_once_or_more(self):
        ids = set()
        for s in self.corpus:
            for st in s["stanzas"]:
                for v in st["verses"]:
                    if v.get("a"):
                        ids.add(v["a"])
                    ids.update(v.get("a2") or [])        # pieces of a stanza cut by a column / page break are shown with their head
        self.assertEqual(len(ids), 8497)
        self.assertEqual(set(self.amap["stanza"]), ids)

    def test_supplement_verses_are_unclaimed_and_unique(self):
        seen = set()
        for s in self.corpus[len(self.krapar):]:
            self.assertEqual(s.get("src"), "scan")
            for st in s["stanzas"]:
                for v in st["verses"]:
                    self.assertEqual(v["src"], "scan")
                    self.assertTrue(v["text"].strip())
                    self.assertNotIn(v["a"], seen)
                    seen.add(v["a"])
                    self.assertNotIn("en", v)  # no English: AI slot, filled through data/ai-en.json
        self.assertEqual(len(seen), self.report["supplement_verses"])

    def test_scan_pages_exist(self):
        pages = set()
        for s in self.corpus:
            for st in s["stanzas"]:
                for v in st["verses"]:
                    for p in v.get("p", []):
                        pages.add(p)
        self.assertTrue(pages)
        for p in pages:
            self.assertTrue(os.path.exists(os.path.join(SITE, "pages", "p%03d.jpg" % p)), p)

    def test_search_index_references_are_valid(self):
        counts = [sum(len(st["verses"]) for st in s["stanzas"]) for s in self.corpus]
        for lemma, occs in self.si.items():
            for o in occs:
                self.assertLess(o["s"], len(self.corpus))
                self.assertLess(o["v"], counts[o["s"]])
            self.assertIn(lemma, self.wf)

    def test_schwa_insensitive_forms_present(self):
        # a schwa-spelled word from the supplement is findable through its stripped form too
        forms = [f for fs in self.wf.values() for f in fs]
        self.assertTrue(any("ը" in f for f in forms))
        self.assertIn("սրբոյ", forms)

    def test_link_rate(self):
        self.assertGreater(self.report["krapar_verse_link_pct"], 97.0)

    def test_hymn_map_resolves(self):
        for hid, (sec, st) in self.amap["hymn"].items():
            self.assertLess(sec, len(self.corpus))
            self.assertLess(st, len(self.corpus[sec]["stanzas"]))

    def test_ai_slot_file_exists(self):
        d = load(os.path.join(D, "ai-en.json"))
        self.assertIn("items", d)
        self.assertEqual(d.get("label"), "AI translation (Claude)")

    def test_patched_js_is_reproducible(self):
        before = open(os.path.join(SITE, "sharagan.js"), encoding="utf-8").read()
        subprocess.run([sys.executable, os.path.join(SITE, "tools", "apply_patches.py")], check=True, capture_output=True)
        after = open(os.path.join(SITE, "sharagan.js"), encoding="utf-8").read()
        self.assertEqual(before, after)

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_js_syntax(self):
        for f in ("sharagan.js", "scan-viewer.js", "maroon-translit.js"):
            subprocess.run(["node", "--check", os.path.join(SITE, f)], check=True, capture_output=True)
        # calendar.js is an ES module
        subprocess.run(["node", "--input-type=module", "--check"], input=open(os.path.join(SITE, "calendar.js"), encoding="utf-8").read().encode(), check=True, capture_output=True)

    def test_every_ai_text_is_labelled_in_js(self):
        js = open(os.path.join(SITE, "sharagan.js"), encoding="utf-8").read()
        self.assertGreaterEqual(js.count("ai-label"), 2)
        self.assertIn("AI translation (Claude)", js)


if __name__ == "__main__":
    unittest.main()
