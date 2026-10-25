"""A1: display-text cleaning (tools/display_clean.py) and the artifact invariants of the shipped data.

    python3 -m unittest tests.test_display_clean
"""
import json, os, re, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(SITE, "tools"))
import display_clean as DC  # noqa: E402
import stanza_fixes as SF  # noqa: E402


def load(*p):
    with open(os.path.join(SITE, *p), encoding="utf-8") as f:
        return json.load(f)


class TestRules(unittest.TestCase):
    def test_stray_slash_and_markers(self):
        self.assertEqual(DC.clean_stanza("/ Այսօր խընդրի պատուական")[0], "Այսօր խընդրի պատուական")
        self.assertEqual(DC.clean_stanza("(հբ)/ Շնորհեա մեզ տէր")[0], "Շնորհեա մեզ տէր")
        self.assertEqual(DC.clean_stanza("/(գկ) Աստուածային հաւատոյ")[0], "Աստուածային հաւատոյ")
        self.assertEqual(DC.clean_stanza("()Որ ըզ կեանքն")[0], "Որ ըզ կեանքն")
        self.assertEqual(DC.clean_stanza("/ / Ամենագովելի եւ")[0], "Ամենագովելի եւ")
        self.assertEqual(DC.clean_stanza("եւ / վըկայք Քրիստոսի")[0], "եւ վըկայք Քրիստոսի")
        self.assertEqual(DC.clean_stanza("*\tՃՇՒ ՊՀՑ")[0], "ՃՇՒ ՊՀՑ")

    def test_folio_bullet_latin_space(self):
        self.assertEqual(DC.clean_stanza("171.Կանոն Ծաղկազարդ")[0], "Կանոն Ծաղկազարդ")
        self.assertEqual(DC.clean_stanza("հրեշտակաց • ձայնիւ եր")[0], "հրեշտակաց. ձայնիւ եր")
        self.assertEqual(DC.clean_stanza("զժանիu մահու")[0], "զժանիս մահու")
        self.assertEqual(DC.clean_stanza("քո . աստուած")[0], "քո. աստուած")
        self.assertEqual(DC.clean_stanza("աստուածա­տունկ եդեմ")[0], "աստուածատունկ եդեմ")

    def test_hyphen_joins_only_attested_words(self):
        lex = DC.Lexicon(["օրհնութեամբ"])
        q = []
        self.assertEqual(DC.clean_stanza("օրհնութ-եամբ զքեզ", lex, q)[0], "օրհնութեամբ զքեզ")
        self.assertEqual(DC.clean_stanza("օրհնեբարձր֊ցէք", lex, q)[0], "օրհնեբարձր֊ցէք")
        self.assertIn(["hyphen_unattested", "օրհնեբարձր֊ցէք"], q)

    def test_title_glue_and_backtick(self):
        t, log = DC.clean_stanza("171.Կանոն Ծաղկազարդ Կիւրակէին` յաւուր գալստեան Տեառն յԵրուսաղէմ: Այսօր զանըսկիզբըն")
        self.assertEqual(t, "Այսօր զանըսկիզբըն")
        self.assertIn("title_glue", [c for c, _ in log])
        self.assertEqual(DC.clean_legacy_armenian("ապաւէն իմ` զի մի՛")[0], "ապաւէն իմ, զի մի՛")
        self.assertEqual(DC.clean_legacy_armenian("Խոստովանութիւն`` եւ վայելչութիւն")[0], "Խոստովանութիւն եւ վայելչութիւն")

    def test_part_label_glued_to_stanza(self):
        t, log = DC.clean_stanza("Օրհնութիւն. / Ճառագայթ փառաց հօր որդիդ")
        self.assertEqual(t, "Ճառագայթ փառաց հօր որդիդ")
        self.assertIn("heading_glue", [c for c, _ in log])
        self.assertEqual(DC.clean_stanza("Ողորմեա ինձ Աստուած իմ ողորմեա ինձ")[0], "Ողորմեա ինձ Աստուած իմ ողորմեա ինձ")   # a verse that begins with the word

    def test_headings_keep_line_break_marks(self):
        self.assertEqual(DC.clean_heading("ԿԱՆՈՆ / ԾՆՆԴԵԱՆ ՍՐԲՈՅ")[0], "ԿԱՆՈՆ / ԾՆՆԴԵԱՆ ՍՐԲՈՅ")
        self.assertEqual(DC.clean_heading("Հարցք ապաշխարութեան ։ / Առաջին ձայն ։")[0], "Հարցք ապաշխարութեան։ / Առաջին ձայն։")

    def test_incipit_neumes_out(self):
        self.assertEqual(DC.clean_incipit("Օ՛րհնեսցուք ը́զտէ՜ր զի փա՛ռօք")[0], "Օրհնեսցուք ըզտէր զի փառօք")

    def test_english(self):
        self.assertEqual(DC.clean_english("/ You who built… come [cut off]")[0], "You who built… come…")
        self.assertEqual(DC.clean_english("Christ is ris... [cut off].")[0], "Christ is ris….")
        self.assertEqual(DC.clean_english("[?] kept [?]")[0], "[?] kept [?]")

    def test_idempotent(self):
        for t in ["/ (ո)/(բձ) Այսօր • եւ / քո . աստուած`", "171.Կանոն Ծ Կ` յ Ե: Այսօր եկայք", "ժանիu մահու"]:
            once = DC.clean_stanza(t)[0]
            self.assertEqual(DC.clean_stanza(once)[0], once)
        for t in ["/ a [cut off]", "b [cut off] [cut off]"]:
            once = DC.clean_english(t)[0]
            self.assertEqual(DC.clean_english(once)[0], once)

    def test_jashots_second_layer_stays_diplomatic(self):
        t, _ = DC.clean_jashots_text("փափկու_թեան գործել • և Ղովտ  նստէր իւր ։")
        self.assertEqual(t, "փափկութեան գործել • և Ղովտ նստէր իւր։")        # '•' (printed verse mark) is kept


class TestShippedData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = load("data", "corpus.json")
        cls.ai = load("data", "ai-en.json")

    def test_no_artifacts_in_displayed_stanza_text(self):
        bad = []
        for sec in self.corpus:
            for st in sec["stanzas"]:
                for v in st["verses"]:
                    if sec.get("src") != "scan":
                        continue
                    t = v["text"]
                    if re.search(r"^\s*[/*•|]|\s/\s|[`•]|\([Ա-և]{0,4}\)|^\d{1,3}\s*[.․]|[\u00ad\u200b\u0300-\u036f]", t):
                        bad.append((v.get("a"), t[:50]))
        self.assertEqual(bad, [], bad[:5])

    def test_raw_kept_when_changed(self):
        n = 0
        for sec in self.corpus:
            for st in sec["stanzas"]:
                for v in st["verses"]:
                    if v.get("dc"):
                        n += 1
                        self.assertIn("dr", v)
                        self.assertNotEqual(v["dr"], v["text"])
        self.assertGreater(n, 50)

    def test_incipits_and_headings_clean(self):
        for sec in self.corpus:
            if sec.get("src") != "scan":
                continue
            self.assertFalse(re.search(r"\s[։:,.]", sec["heading"]), sec["heading"][:60])
            for st in sec["stanzas"]:
                self.assertFalse(re.search("[՛՜՞]", st.get("incipit", "")), st.get("incipit"))

    def test_ai_english_clean(self):
        for sid, it in self.ai["items"].items():
            t = it["t"]
            self.assertNotIn("[cut off]", t, sid)
            self.assertFalse(re.match(r"^\s*[/*•|]", t), sid)

    def test_owner_screenshot_stanzas(self):
        by = {v["a"]: v for sec in self.corpus for st in sec["stanzas"] for v in st["verses"] if v.get("a")}
        first = by["AS-6af09ad01ffc"]                       # «/ Այսօր խընդրի պատուական …» (p.371)
        self.assertTrue(first["text"].startswith("Այսօր խընդրի պատուական"))
        self.assertEqual(first["dr"][:2], "/ ")
        second = by["AS-435be6b430a5"]                      # «… յուդայի եկայք:» : the cue is completed from the same hymn's refrain
        self.assertTrue(second["text"].endswith("եկայք հաւատացեալք երկըրպագեսցուք աստուածային սուրբ նըշանիս:"))
        self.assertEqual(second["x"]["r"], "same_hymn_refrain+single_word_cue")
        self.assertIn("pt", second)
        ai = self.ai["items"]["AS-435be6b430a5"]["t"]
        self.assertIn("let us worship", ai)


class TestSingleWordCue(unittest.TestCase):
    A = "Այսօր ընծայէ գողգոթա զծածկեալն ի յերկրի վերաբերեալ անուշահոտ խընկովք ի ձեռն երանելւոյն յուդայի եկայք:"
    H = "Այսօր խընդրի պատուական փայտ խաչին աւանդեալն ի գողգոթա ի ձեռն աստուածասէր դըշխոյին եկայք հաւատացեալք երկըրպագեսցուք աստուածային սուրբ նըշանիս:"

    def test_needs_sibling_and_print_corroboration(self):
        r = SF.find_single_word_expansion(self.A, [("H", self.H)], {"H"}, "յուդայի . եկայք հաւատացեալք երկըրպա :")
        self.assertTrue(r and not r.get("uncorroborated"))
        self.assertTrue(r["full"].endswith("աստուածային սուրբ նըշանիս:"))
        self.assertTrue(SF.find_single_word_expansion(self.A, [("H", self.H)], {"H"}, "յուդայի . եկայք :").get("uncorroborated"))
        self.assertIsNone(SF.find_single_word_expansion(self.A, [("H", self.H)], set(), None))

    def test_short_complete_verse_is_not_a_cue(self):
        self.assertIsNone(SF.find_single_word_expansion("Ողորմեա ինձ Աստուած:", [("H", "Ողորմեա ինձ Աստուած խաղաղութեան օգնեա ինձ:")], {"H"}, None))


if __name__ == "__main__":
    unittest.main()
