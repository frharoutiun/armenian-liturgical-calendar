#!/usr/bin/env python3
"""Build data/calendar/cue_lines.json: the one-line cues «Ճաշու: <opening>» and «Համբարձի: <opening>» printed at the end of a few canons.

The book prints, at the end of a canon, small centred labels «Ճաշու :» / «Համբարձի :» each followed by the opening words of the hymn of
that canon that serves as its Jashoo / Hampartsi. An exhaustive image search of all 513 pages (tools/cue_label_scan.py: normalised
cross-correlation of the label glyphs taken from p372) finds these labels on only six pages: 337, 340, 352, 362, 369, 372 (8 labels).
The printed cue text below was READ BY CLAUDE (AI) FROM THE SCAN (crop, 2-5x zoom, read twice) and is UNREVIEWED; each reading is
checked against the hymn it names (the hymn's own text in the canon, from the Unicode edition / our anchored dataset).
Never overwrites anything; atomic write.   python3 tools/build_cue_lines.py
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CANONS = os.path.join(ROOT, "data/calendar/canon_parts.json")
OUT = os.path.join(ROOT, "data/calendar/cue_lines.json")
SCAN = {337: 0.785, 340: 0.827, 352: 0.815, 362: 0.845, 369: 0.815, 372: 1.0}   # best NCC of the «Ճաշու :» label template per page
METHOD = "visual reading by Claude (AI) from the scan, unreviewed"
# page, label, part, canon (section id), printed cue as read from the scan (neume ticks dropped), target stanza (the hymn the cue names, in the same canon)
CUES = [
 (337, "Ճաշու", "jashoo", "SCa935a31e1f", "Աստուածածին ամպ լուսա:", "AS-d058f4a0822d",
  "The printed cue is itself abbreviated («լուսա:» for «լուսաւոր»); our transcription holds it as its own stanza AS-fecae71f9329. The hymn it names is «Աստուածածին ամպ լուսաւոր» of this canon."),
 (340, "Ճաշու", "jashoo", "SC3f4a5d2dba", "Աստուածածին գերագոյն երկնից:", "AS-c8e59cdef1e9",
  "The Unicode edition keeps this label and cue glued to the end of the previous stanza («… մայր տեառն: Ճաշու: (մ) Աստուածածին գերագոյն երկնից:»)."),
 (352, "Ճաշու", "jashoo", "SC2c0523b19e", "Որ հաստատեցեր բանիւ:", "AS-6ce0eb3b913d",
  "Glued by the Unicode edition to the end of the previous stanza."),
 (362, "Ճաշու", "jashoo", "SC157b0c831f", "Ով քառաթեւ լուսածին:", "AS-72f2485952ad",
  "Glued by the Unicode edition to the end of the previous stanza."),
 (369, "Ճաշու", "jashoo", "SCbd7b6d8f25", "Քեզ Քրիստոսի կաթուղիկէ:", "AS-452f4bdf3703",
  "The Unicode edition keeps the label but drops this cue text («Ճաշու: Համբարձի: Հրաշափառ տեսութիւն:»); read from the scan."),
 (369, "Համբարձի", "hampartsi", "SCbd7b6d8f25", "Հրաշափառ տեսութիւն:", "AS-b81a7904a991", "Kept by the Unicode edition after the Ճաշու label."),
 (372, "Ճաշու", "jashoo", "SC02f8dc881f", "Այսօր խընդրի պատուական:", "AS-6af09ad01ffc",
  "Absent from both our transcription and the Unicode edition; read from the scan (the last letters of the printed word are small and slightly unclear)."),
 (372, "Համբարձի", "hampartsi", "SC02f8dc881f", "Ապաւինեցաք ՚ի խաչ քո:", "AS-55780b5749a3", "Absent from both our transcription and the Unicode edition; read from the scan."),
]
def norm(t): return re.sub(r"[^ա-և]", "", t.lower().replace("ը", "").replace("՚", ""))
def main():
    cp = json.load(open(CANONS))["canons"]
    cues = []
    for (page, label, part, cid, text, sid, note) in CUES:
        k = cp.get(cid)
        if not k: sys.exit("canon not found " + cid)
        hit = [h for h in k["hymns"] if sid in h["stanza_ids"]]
        if not hit: sys.exit(f"stanza {sid} not in canon {cid}")
        h = hit[0]
        a, b = norm(text), norm(h["incipit"])
        ok = b.startswith(a[:12]) or a.startswith(b[:12]) or norm(h["incipit"].split()[0]) == norm(text.split()[0])
        cues.append({"id": f"CUE-{page}-{part}", "page": page, "label": label, "labelHy": label + ":", "part": part, "canonId": cid,
                     "printed": text, "printed_method": METHOD, "review_status": "unreviewed",
                     "target": {"hymnId": h["id"], "stanzaId": sid, "incipit": h["incipit"], "hymnPart": h["part"], "page": h.get("page"),
                                "match": "the cue is the opening of this hymn of the same canon", "incipitAgrees": bool(ok)},
                     "note": note, "confidence": "high" if ok else "medium"})
    out = {"schema": "cue-lines/1.0", "source": "scan labels «Ճաշու :» / «Համբարձի :» at the end of canons",
           "audit": {"method": "tools/cue_label_scan.py: normalised cross-correlation of the label glyphs (template cut from p372) over all 513 page images, threshold 0.62",
                     "pages_with_label": sorted(SCAN), "best_score_by_page": {str(p): s for p, s in SCAN.items()},
                     "reading": "no other page carries these labels, so a canon without an entry here prints no Jashoo/Hampartsi cue of this kind"},
           "cues": cues}
    tmp = OUT + ".tmp"; json.dump(out, open(tmp, "w"), ensure_ascii=False, indent=1); os.replace(tmp, OUT)
    print(json.dumps({"cues": len(cues), "incipitAgrees": sum(c["target"]["incipitAgrees"] for c in cues)}))
if __name__ == "__main__": main()
