"""Tests for tools/stanza_fixes.py (split stanzas, cue completion, neume marks) and for the hymnal data they produce."""
import json, os, re, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(SITE, "tools"))
import stanza_fixes as SF  # noqa: E402


def st(i, hymn, page, c0, l0, c1, l1, reading, units):
    return {"id": "S%d" % i, "hymn_id": hymn, "scan_pages": [page], "unit_ids": units, "reading": reading,
            "scan_location": {"start": {"column": c0, "line": l0}, "end": {"column": c1, "line": l1}}}


class Neumes(unittest.TestCase):
    def test_roundtrip(self):
        t = "Հա՛յր առաքո՛ղ միածնի՛դ ՜ ՞ ՝"
        clean, marks = SF.split_neumes(t)
        self.assertNotIn("՛", clean)
        self.assertEqual(SF.join_neumes(clean, marks), t)
        self.assertEqual(len(marks), 6)

    def test_only_selected_marks(self):
        clean, marks = SF.split_neumes("Ո՞ր ըզ՝ քեզ", "՛՜՞")
        self.assertIn("՝", clean)
        self.assertEqual(SF.join_neumes(clean, marks), "Ո՞ր ըզ՝ քեզ")


class Tails(unittest.TestCase):
    def test_page_break_tail(self):
        a = [st(0, "H", 76, 2, 20, 2, 30, "Եւ ա։", ["U1"]),
             st(1, "H", 76, 2, 38, 2, 42, "Առաքեալ եւ նախավկայ վերա", ["U2"]),
             st(2, "H", 77, 1, 1, 1, 4, "փոխեցար աղաչեա զԱստուած։", ["U2"]),
             st(3, "H", 77, 1, 3, 1, 10, "Տունկ անմահ։", ["U3"])]
        self.assertEqual(SF.tail_chains(a), {2: 1})

    def test_complete_stanza_is_not_a_tail(self):
        a = [st(0, "H", 76, 2, 38, 2, 42, "Առաքեալ եւ նախավկայ։", ["U2"]), st(1, "H", 77, 1, 1, 1, 4, "Տունկ անմահ։", ["U2"])]
        self.assertEqual(SF.tail_chains(a), {})

    def test_other_hymn_or_unit_is_not_a_tail(self):
        a = [st(0, "H", 76, 2, 38, 2, 42, "Առաքեալ եւ", ["U1"]), st(1, "G", 77, 1, 1, 1, 4, "x", ["U1"])]
        self.assertEqual(SF.tail_chains(a), {})
        a = [st(0, "H", 76, 2, 38, 2, 42, "Առաքեալ եւ", ["U1"]), st(1, "H", 77, 1, 1, 1, 4, "x", ["U2"])]
        self.assertEqual(SF.tail_chains(a), {})

    def test_chain_of_three(self):
        a = [st(0, "H", 1, 2, 38, 2, 42, "ա բ", ["U"]), st(1, "H", 2, 1, 1, 1, 42, "գ դ", ["U"]), st(2, "H", 2, 2, 1, 2, 5, "ե զ։", ["U"])]
        self.assertEqual(SF.tail_chains(a), {1: 0, 2: 0})


class Completion(unittest.TestCase):
    REFRAIN = "Որ մարդասէր ես աղաչանօք սոցա խնայեա ի մեզ մարդասէր փրկիչ։"

    def test_truncated_cue(self):
        r = SF.find_expansion("Նստիս յաթոռ դատողական աղա։", [("H1", self.REFRAIN)])
        self.assertEqual(r["added"], "աղաչանօք սոցա խնայեա ի մեզ մարդասէր փրկիչ։")
        self.assertTrue(r["full"].endswith("փրկիչ։"))
        self.assertEqual(r["cue"], "աղա։")
        self.assertEqual(r["holder"], "H1")

    def test_schwa_and_spelling_are_ignored(self):
        r = SF.find_expansion("Նստիս յաթոռ աղաչա՛նօք սո։", [("H1", self.REFRAIN.replace("սոցա", "սոըցա"))])
        self.assertIsNotNone(r)

    def test_complete_stanza_untouched(self):
        self.assertIsNone(SF.find_expansion("Նստիս յաթոռ դատողական եւ փրկեա զմեզ։", [("H1", self.REFRAIN)]))

    def test_cut_short_holder_is_overruled_by_the_full_one(self):
        short = "Ա բ աղաչանօք սոցա։"
        r = SF.find_expansion("Նստիս աղա։", [("H1", short), ("H2", self.REFRAIN)])
        self.assertTrue(r["added"].endswith("փրկիչ։"))
        self.assertEqual(r["holder"], "H2")

    def test_conflicting_refrains_are_ambiguous(self):
        r = SF.find_expansion("Նստիս աղա։", [("H1", "Ա աղաչեմք քեզ փրկիչ։"), ("H2", "Ա աղաչանօք սոցա ողորմեա։")])
        self.assertTrue(r and r.get("ambiguous"))

    def test_holder_that_is_itself_a_cue_is_not_copied(self):
        self.assertIsNone(SF.find_expansion("Այսօր սըրբոց առ տէր վասըն մեր։", [("H1", "Ա առ տէր վասըն մեր օրհ։")]))

    def test_w1_cue_unicode_ended_early(self):
        w1 = {"cue_words": ["յաթոռ", "դատողական", "աղա"], "added_words": ["աղաչանօք", "սոցա", "խնայեա", "ի", "մեզ", "մարդասէր", "փրկիչ։"]}
        r = SF.complete_with_w1("Որ նստիս յաթոռ դատողական աղ։", w1, None)
        self.assertEqual(r["full"], "Որ նստիս յաթոռ դատողական աղաչանօք սոցա խնայեա ի մեզ մարդասէր փրկիչ։")
        self.assertEqual(r["spelling"], "book_orthography")
        r = SF.complete_with_w1("Որ նստիս յաթոռ դատողական։", w1, None)       # the cue word itself was dropped
        self.assertTrue(r["full"].endswith("աղաչանօք սոցա խնայեա ի մեզ մարդասէր փրկիչ։"))

    def test_w1_uses_holder_orthography_when_it_matches(self):
        w1 = {"cue_words": ["փա՛ռըս", "տա"], "added_words": ["տացուք", "նըմա", "ձայնիւ։"]}
        r = SF.complete_with_w1("Ա Բ փառս։", w1, "Գ Դ փառս տացուք նմա ձայնիւ։")
        self.assertEqual(r["spelling"], "unicode")
        self.assertEqual(r["full"], "Ա Բ փառս տացուք նմա ձայնիւ։")


class BuiltData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c = json.load(open(os.path.join(SITE, "data", "corpus.json"), encoding="utf-8"))
        cls.am = json.load(open(os.path.join(SITE, "data", "anchor-map.json"), encoding="utf-8"))

    def verses(self):
        for s in self.c:
            for stz in s["stanzas"]:
                for v in stz["verses"]:
                    yield s, v

    def test_screenshot_case_the_fragment_is_not_a_stanza_of_its_own(self):
        ids = [v.get("a") for _, v in self.verses()]
        self.assertNotIn("AS-623efc3a74d0", ids)                       # tail "աղաչեա զԱստուած շնորհել մեզ ըզկեանս անվախճան"
        carrier = [v for _, v in self.verses() if v.get("a") == "AS-90cc2ec2553f"][0]
        self.assertIn("AS-623efc3a74d0", carrier["a2"])
        self.assertTrue(carrier["text"].rstrip("։:. ").endswith("անվախճան"))
        self.assertEqual(self.am["absorbed"]["AS-623efc3a74d0"], "AS-90cc2ec2553f")
        self.assertIn("AS-623efc3a74d0", self.am["stanza"])

    def test_owner_example_cue_is_completed(self):
        v = [v for _, v in self.verses() if v.get("a") == "AS-d8eb043dec7e"][0]
        self.assertTrue(v["text"].endswith("աղաչանօք սոցա խնայեա ի մեզ մարդասէր փրկիչ։"))
        self.assertEqual(v["x"]["c"], "աղա")
        self.assertTrue(v["pt"].endswith("աղ:"))                       # the printed text is kept

    def test_completed_text_ends_with_the_added_words(self):
        n = 0
        for s, v in self.verses():
            if v.get("x"):
                n += 1
                self.assertEqual(v["text"][len(v["text"]) - v["x"]["n"]:], v["x"]["a"])
                self.assertIn(v["x"]["k"], ("high", "medium"))
        self.assertGreater(n, 500)

    def test_no_neume_marks_in_displayed_scan_text(self):
        for s, v in self.verses():
            if s.get("src") == "scan":
                for f in ("text", "o", "pt"):
                    self.assertFalse(re.search("[՛՜՞]", v.get(f) or ""), (v.get("a"), f))

    def test_absorbed_ids_resolve_to_a_verse(self):
        for tail, head in self.am["absorbed"].items():
            self.assertIn(head, self.am["stanza"])
            self.assertIn(tail, self.am["stanza"])


if __name__ == "__main__":
    unittest.main()
