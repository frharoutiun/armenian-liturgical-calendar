// engine/h2rules.mjs  (owner: h2rules agent)  -- see docs/notes/h2rules.md, rulebook/review/h2rules.json
// Hador 2 PREFACE ("Counsels", pdf pp.103-104 = printed pp.551-552) and TABLE-LEVEL RULES: every rubric printed in the Hador 2 rows is parsed here into
// machine-usable effects. Nothing here reads anything but the Hador 2 rows / the book text quoted below.
//
//   tableAnnotations(ctx, t) -> [{rule, basis, source:{table,row,pages,quote}, status, effect}]
//
// Status vocabulary (docs/ENGINE_CONTRACT.md): 'rule' (stated plainly), 'interpretation' (my reading of an ambiguous line), 'needs_human_review'.
// Printed page = pdf page + 448 (pdf 104 = printed 552, pdf 168 = printed 616, pdf 189 = printed 637).
export const meta = { id: 'h2rules', description: 'Hador 2 preface counsels + every Hador 2 row rubric parsed into effects (intervals, see-Vol-I pointers, leap-year substitutions, hymn headings, labels)' };

// ---------------------------------------------------------------------------------------------------------------------------------
// 1. PREFACE ("Սակաւի ինչ յառաջաբանութիւն վասն Երկրորդ հատորի Տօնացուցիս", pdf 103-104 = printed 551-552). Wave 8: re-read letter by letter on 2x-6x
//    crops of the page images (italic face). `quote` is now the COMPLETE verbatim counsel as printed (my transcription of the italic print; the print
//    uses the old orthography, italic Դ looks like Ղ and Շ like Չ: the readings below follow the sense). `reading_status`: 'page_confirmed' = every word
//    read on the page image; 'needs_human_review' = at least one word not legible (listed in `doubtful_words`; no rule depends on it).
//    `english` is a literal rendering. `frames` = the fringe cases the counsel governs; `engine` = where/how the engine implements it (see
//    docs/notes/h2_opening.md). `no`: the counsels are numbered Երկրորդ..Եօթներորդ in the print; the OPENING (no=1, unnumbered, two paragraphs P0/P0B and P1)
//    plays the part of the first. The title page (pdf 101) and the dedication (pdf 102) carry no rule except R-H2R-TITLE (36 tables on 36 letters).
//    These are documentation records used by tests and by the integrator; they are not date-specific.
// ---------------------------------------------------------------------------------------------------------------------------------
export const PREFACE = [
  { id: 'R-H2R-TITLE', no: 0, status: 'rule', reading_status: 'page_confirmed', pages: [101],
    quote: 'Տօնացոյց. Երկրորդ Հատոր. Որ է կանոն եւ կառավարիչ առաջնոյ հատորին. Յօրինեալ 36 խորանօք ՚ի վերայ 36 տառիցն մերոյ այբուբենականաց. որոց իւրաքանչիւր Տարեգրոյ խորան ըստ բերման իւրոյ տարւոյն զամենայն շարժական եւ զտեղափոխ տօնսն կանոնաւորեալ տեղաւորէ։',
    english: 'Tonatsoyts, Second Volume, which is the canon and governor of the First Volume, composed in 36 tables (khoran) on the 36 letters of our alphabet; the table of each Taregir arranges in order all the movable and displaceable feasts according to the requirement of its own year.',
    basis: 'The book has exactly 36 tables, one per letter; each table is the complete arrangement of the movable/displaced feasts for the years that carry that letter.', frames: ['order of letters/tables'], engine: 'rulebook/hador2.json 36 tables (TT-01..TT-36); core.tablesForYear' },
  { id: 'R-H2R-P0-ROLE', no: 1, status: 'rule', reading_status: 'page_confirmed', pages: [103], column: 1,
    quote: 'Գիտեա ամենայն նախ, զի Երկրորդ հատորս այս կանոն եւ կառավարիչ ասացաւ առաջնոյ հատորին։ Վասն զի զայն միջոցսն՝ որք յաւելուն եւ նուազին, եւ զորոց որքանութիւնն ոչ կարէ ցուցանել Առաջին հատորն, նոյնպէս եւ զտօնսն որք յայսպիսի միջոցս եղեալք են՝ եւ շարժական գոլով, ոչ կարեն ՚ի նոյն տեղւոջն տօնիլ, զայսպիսին ցուցանէ այս Երկրորդ հատորս՝ կանոնաւորեալ ամենայն պարագայիւքն, որպէս տեսանես։',
    english: 'Know first of all that this Second Volume is called the canon and governor of the First Volume. For the intervals that lengthen and shorten, whose length the First Volume cannot show, and likewise the feasts that are in such intervals and, being movable, cannot be kept in the same place: this Second Volume shows such things, regulated in every detail, as you see.',
    basis: 'Hador 2 is the canon/governor of Hador 1. It prints only (a) the intervals ("Միջոց") that lengthen or shorten from year to year and (b) the movable feasts that cannot stay on one place.',
    frames: ['what Hador 2 governs (intervals and movable feasts)', 'Hador 2 overrides the fixed order of Hador 1 only inside those intervals'], engine: 'ctx.rows / links (a Hador 2 row at a date governs that date); intervalEffect (eating_interval)' },
  { id: 'R-H2R-P0B-SEE-VOL1', no: 1, status: 'rule', reading_status: 'page_confirmed', pages: [103], column: 1,
    quote: 'Իսկ այն միջոցք եւ տօնք՝ որք անշարժք են, եւ որպէս ՚ի յԱռաջին հատորն եղեալք են՝ ՚ի նոյնութեան մնան միշտ անշարժ, զայս ոչ յիչէ Երկրորդ հատորս եւ ոչ ցուցանէ. այլ ՚ի յԱռաջին հատորն տեսանել գրէ յիրաքանչիւր տեղւոջն, որպէս տեսանես։ Բայց եւ յայսոսիկ միջոցս՝ զոմանս ՚ի տօնից՝ որք տեղափոխին երբեմն ՚ի պահանջելոյ Տարեգրոյն, եւ ոչ մնան ՚ի նոյնութեան, դնէ յանուանէ եւ յիչէ այս Երկրորդ հատորս։',
    english: 'But those intervals and feasts that are immovable and, as they stand in the First Volume, always remain unchanged in the same sameness: this Second Volume neither mentions nor shows them; rather it writes "see the First Volume" in each place, as you see. But also in these intervals, some of the feasts that are sometimes displaced at the demand of the Taregir and do not remain in sameness, this Second Volume sets down by name and mentions.',
    basis: 'Where Hador 2 is silent, or says "see Vol. I", the day is governed by Hador 1 (fixed feasts, the fixed order of the weekly series). Hador 2 names only those feasts of a stretch that the Taregir displaces.',
    frames: ['fixed feast (Hador 1 fixed_date) is not listed in Hador 2 and stays', 'a day with no Hador 2 row: Hador 1 decides', '"see Vol. I" rubrics (see_vol1 effects)'], engine: 'engine/blocks/* (Hador 1 order), fixed.mjs; h2rules see_vol1 effects' },
  { id: 'R-H2R-P1-UNMENTIONED-CHANGE', no: 1, status: 'rule', reading_status: 'page_confirmed', pages: [103], column: 1,
    quote: 'Ուրեմն ընդ այսպիսս մի՛ տարակուսիցես, զի զորս յիչէ այս Երկրորդ հատորս, գիտացիր զի փոփոխին այնպիսիքն յայնմ ամի։ Նաեւ յիչէ վասն հարցից, եւ ամսաթուոց, եւ աւուրց ձայնից, զի գիտասցես։ Եւ զորս թողու եւ ոչ յիչէ, պարտիս ՚ի յառաջին հատորն տեսանել, եւ ըստ կարգին վարիլ։ Վասն այսորիկ եւ գրեցաք ՚ի յԵրկրորդ հատորս ՚ի բազում տեղիս թէ՝ տես ՚ի յԱռաջին հատորն պահելով զկարգ տեղւոյս. զի գիտասցես՝ թէ պարտիս միշտ զխորան Տարեգրոյն ՚ի ձեռին ունել յԵրկրորդ հատորս, եւ ըստ ցուցման նորին վարիլ յԱռաջին հատորսն։',
    english: 'So do not be perplexed about such matters: the things that this Second Volume mentions, know that such things are changed in that year. It also mentions, concerning the harajes, the month-dates and the day-tones, so that you may know. And what it leaves out and does not mention, you must look up in the First Volume and proceed according to its order. For this reason we also wrote in many places in the Second Volume "see the First Volume, keeping the order of this place", so that you may know that you must always hold the table (khoran) of the Taregir in your hand in the Second Volume and, according to its indication, proceed in the First Volume.',
    basis: 'What Hador 2 mentions (feasts, harajes, month-dates, day-tones of a stretch) is what changes in that year; what it omits is taken from Hador 1 "in its order". One must always hold the year\'s table of Hador 2 and follow Hador 1 as it directs ("see Vol. I, keeping the order of this place" = keep_place).',
    frames: ['feast falling on a Sunday or in a fast: the Hador 2 row at the date is the placement, Hador 1 supplies the text', 'unmentioned days follow Hador 1 order', 'keep_place rubrics'], engine: 'links.mjs (row -> records), h2rules see_vol1 keep_place; blocks follow Hador 1 order' },
  { id: 'R-H2R-P2-CROSSREF-TABLES', no: 2, status: 'rule', reading_status: 'page_confirmed', pages: [103], column: 2,
    quote: 'Երկրորդ. Երկրորդ հատորս՝ զոմանս միջոցս ՚ի յոմանս գիրս՝ յայլ գիրս տեսանել գրէ, որպէս տեսանես ՚ի Բ, ՚ի Գ, ՚ի Ե, եւայլն. որոյ պատճառն է, զի եթէ զամենայն յամենայն գիրս դնէաք, բազմակրկնութիւն լինէր, եւ գիրք Տօնացուցիս կարի մեծանայր։ Վասն որոյ որպէս զանշարժսն ՚ի յԱռաջին հատորն դնելով՝ անդ տեսանել գրեցաք, նոյնպէս եւ ոմանք շարժական միջոցք եւ տօնք, եթէ կերպիւ ինչ համաձայն գտան ՚ի յոմանս գիրս, զայնոսիկ ՚ի մի ուրեք տարեգրի եղաք ամբողջապէս յԵրկրորդ հատորս, եւ յայլ համաձայն գիրսն՝ ՚ի յայն գիրն տեսանել գրեցաք, զորս ոչ ինչ գոյ դժուարութիւն։',
    english: 'Second. In some tables the Second Volume writes, for some intervals, "see in another table", as you see in Բ, in Գ, in Ե, and so on. The reason is that if we had set everything out in every table there would be great repetition and the book of the Tonatsoyts would have grown very large. Therefore, as we put the immovable ones in the First Volume and wrote "see there", so also some movable intervals and feasts, if they were found to agree somehow in some tables, we set out in full once in one Taregir in the Second Volume, and for the other tables that agree we wrote "see that table", where there is no difficulty.',
    basis: 'To avoid repetition, some tables send the reader to ANOTHER table (letter) for a stretch: the stretch is printed in full once; agreeing tables only point to it. Effect type see_other_table. In the data the target is the previous table in book order (TT-03 two back).',
    frames: ['a "տես ՚ի Ա/Դ/Ը/... տարեգիրն" rubric: haraj of martyrs/fasts, hambardzis, day-tones, last-week feasts of that stretch come from the named table, month-dates kept ("պահելով զամիսդ")'], engine: 'h2rules.resolveOtherTable + see_other_table annotation (information for hymn/tone consumers; the calendar placement itself comes from Hador 1 order, so no row is borrowed)' },
  { id: 'R-H2R-P3-LEAP-COUNSELS', no: 3, status: 'rule', reading_status: 'page_confirmed', pages: [103], column: 2,
    quote: 'Երրորդ. Յերկրորդ հատորս ՚ի յոմանս գիրս վասն Նահանջի ամացն սակաւ ինչ խրատս գրեցաք. զայնոսիկ խրատսն միայն ՚ի նոյն Նահանջ ամին պարտիս պահել՝ յորում նոյն տառքն լինին տարեգիրք, եւ ոչ այլ տարիս։ Զօր օրինակ, ՚ի Թ տարեգիրն գրեցաք նուրբ գրով թէ՝ Յորժամ տարին Նահանջ պատահիցի, եւ գիր տարւոյ ԺԹ լինիցի, յայս շաբաթի օրս զԹէոդոսեան մի՛ տօնիցես. եւայլն։ Զայս խրատս միայն ՚ի նոյն տարին պարտիս պահել՝ որ իցէ Նահանջ, եւ գիր տարւոյ ԺԹ։ Իսկ յայլ տարիսն, եթէ Նահանջ եւ թէ ոչ, այնպէս տօնել անտարակոյս՝ որպէս յիրաքանչիւր գիրսն եղեալ են։ Զսոյն կանոն եւ յամենայն գիրս պահեա, ուր այսպիսի խրատք գոն գրեալ վասն Նահանջ գրոցն։',
    english: 'Third. In the Second Volume, in some tables, we wrote a few counsels for leap years. Those counsels you must keep only in that leap year in which those same letters are the Taregirs, and not in other years. For example, in table Թ we wrote in fine print: "When the year is a leap year and the letters of the year are ԺԹ, on this Saturday do not celebrate Theodosius", and so on. Keep this counsel only in that year which is a leap year with the year-letters ԺԹ. But in the other years, whether leap or not, celebrate without doubt as is set out in each table. Keep this same rule in all tables where such counsels are written for the leap letters.',
    basis: 'A leap-year counsel binds ONLY in a leap year that carries exactly the letter pair named in it (book example: ԺԹ in table Թ). In every other year, leap or not, the rows stand as printed. Same rule for all tables. First letter = table of Jan 1-Feb 29 (Easter+1 day), second = Easter table.',
    frames: ['the nine leap counsels (ԹԸ ԺԹ ԼԻ ԾԽ ՂՁ ՆՅ ՉՈ ՍՌ ՐՏ)', 'a leap year with another pair, or a non-leap year with the same table: rows as printed', 'ՆՅ 2004: Andrew the General and Adrian not in January'], engine: 'h2rules.LEAP_COUNSELS/leapPlans -> leap_year_counsel + leap_substitution annotations; day.mjs applies substitutions' },
  { id: 'R-H2R-P4-DAYTONES-AT-START', no: 4, status: 'rule', reading_status: 'needs_human_review', pages: [103, 104], column: 2,
    quote: 'Չորրորդ. Որոյ խորանի սկզբանն աւուրց ձայնքն ոչ են եղեալ, դու ՚ի Ծննդեան խթման [word not legible] յօրէն պահեա զկարգ ձայնից, եւ հարցից Մարտիրոսաց եւ Պահոց, եւ համբարձեացն Յարութեան, մինչեւ ՚ի Բուն բարեկենդանի Կիւրակէն։ Զի յամենայն գիրս ՚ի սկզբանն ոչ եղեւ հնար դնելոյ զսոսա՝ վասն ոչ միակերպ յաջորդելոյ տարեգրացն զմիմեանց։',
    english: 'Fourth. In whichever table the day-tones are not printed at the beginning, you, from the [unclear word] day of the Nativity, keep the order of the tones, and of the harajes of the Martyrs and of the Fasts, and of the Resurrection hambardzis, until the Sunday of Bun Barekendan. For it was not possible to put these at the beginning of every table, because the Taregirs do not succeed one another uniformly.',
    doubtful_words: [{ word: 'խթման', position: 'col.2 line 3 of the counsel, between Ծննդեան and յօրէն', letters: 'խ ժ/Թ ման (italic)', note: 'not a dictionary word; the sense ("from the day of the Nativity ... continue the order") does not depend on it', dialog: 'H2-DLG-01' }],
    basis: 'The beginning (Jan-Feb) of most tables prints no day-tones/haraj/hambardzis. They are NOT given because the preceding year differs from year to year ("the Taregirs do not succeed one another uniformly"), so the reader continues the cycles unbroken from the Nativity until Bun Barekendan Sunday (when the tone cycle restarts at ԴԿ). Verified: the 13 tables that do print Jan-Feb tones (TT-01..04, TT-27..35) agree with the unbroken chain from the previous Bun Barekendan in 4,312 of 4,703 printed cases (92%; rows dated Jan 6 to Bun Barekendan, years 1583-2600); the whole-table disagreements are the 18 years where the real predecessor differs from the one the print assumed (docs/notes/h2_opening.md).',
    frames: ['tone of every day from Jan 1 to Bun Barekendan Sunday (including Jan 1-5 of the new year and Feb 29)', 'haraj of Martyrs/Fasts and Resurrection hambardzis (hymn cycles): same continuity rule, not generated by the calendar engine'], engine: 'core.modeOfDay (continuous mod-8 count from the last Bun Barekendan, Feb 29 counted); annotation day_tone_continuity' },
  { id: 'R-H2R-P5-SUNDAY-VESPER-HYMN', no: 5, status: 'interpretation', reading_status: 'page_confirmed', pages: [104], column: 1,
    quote: 'Հինգերորդ. Յետ Ծննդեան յառաջին կիւրակէէն մինչեւ ՚ի Բարեկենդանի միջին կիւրակէն որքան կիւրակէ պատահիցի, նոցա երեկոյեան Յարութեան համբարձման, ինչ ձայն եւ իցեն, մինչեւ ցվերջն զՏէր յերկնիցն ասել պարտես, եւ վերջացուցանել յամէն այն տարեգիրս։ Իսկ յայլ կիւրակէսն ուր գրեալ է ցվերջն, անդ եւս մինչեւ ցվերջինն ասել պարտես. եւ ուր ոչ է եղեալ ցվերջն, միայն զեղեալն ասել պարտես։',
    english: 'Fifth. From the first Sunday after the Nativity until the middle Sunday of Barekendan, however many Sundays occur, at their evening Resurrection hambardzum, whatever the tone may be, you must say "Տէր յերկնից" (Lord from the heavens) to the end, and conclude in all those Taregirs. But on the other Sundays, where "to the end" (ցվերջն) is written, there too you must say to the very end; and where "to the end" is not written, you must say only what is written.',
    basis: 'Hymn rubric, not a calendar rule: on every Sunday from the first Sunday after the Nativity to the middle Sunday of Barekendan (= the Sunday printed "Միջին", Easter-56) the evening Resurrection hambardzum "Տէր յերկնից" is sung to the end whatever the tone; on other Sundays only where "ցվերջն" is printed. The word "Միջին" in a Hador 2 row is the end-point marker of this range, never an observance (owner reconciliation).',
    frames: ['"Middle Sunday" (Միջին) rows: marker only, never a displayed observance', 'Sunday evening hymn of the Barekendan stretch'], engine: 'h2rules.tableAnnotations: sunday_vespers_hymn_rule (each Sunday of the range) and middle_sunday_marker (Easter-56); names.mjs must not display "Միջին" (see h2_opening.md)' },
  { id: 'R-H2R-P6-MULTI-SAINT-FEASTS', no: 6, status: 'rule', reading_status: 'page_confirmed', pages: [104], column: 1,
    quote: 'Վեցերորդ. Տօնք Սրբոցն ըստ մեծի մասին յոգնակի են եղեալք ՚ի Տօնացուցիս մերում ՚ի բնէ անտի, այսինքն՝ երկուք, երեք, չորս, հինգ, եւ այլ շատք եւ սակաւք, որք միշտ ՚ի միասին տօնին անբաժան՝ որպէս տեսանես. զորս նոյնպէս եղաք ՚ի յԱռաջին հատորն որպէս յառաջն։ Բայց զայնպիսին ՚ի յիչելն մեր յԵրկրորդ հատորս, զանուն առաջնոց սրբոցն միայն եղաք ՚ի բազում տեղիս վասն կարճելոյ բանին. սակայն ՚ի հանդիպելն քո այսպիսեաց տօնից յԵրկրորդ հատորս, պարտիս ընդ առաջնոյ եղեալ սրբոյն եւ զայլ ամենայն հետեւեալ ընկերսն նորին տօնել, եւ զանուանս նոցին այնու կանոնաւ յիչել՝ որպէս եղեալք են ՚ի յԱռաջին հատորն։',
    english: 'Sixth. The feasts of the Saints are for the most part plural in our Tonatsoyts from the beginning, that is two, three, four, five, and other many and few, which are always kept together inseparably, as you see; which we likewise set down in the First Volume as before. But when mentioning such in the Second Volume we put only the name of the first saints in many places, to shorten the words; yet when you meet such feasts in the Second Volume you must keep, together with the first saint named, also all the other following companions of his, and mention their names by the same rule as they stand in the First Volume.',
    basis: 'Saints\' feasts are mostly plural and always kept together. Hador 2 usually prints only the FIRST saint\'s name; a row naming the first saint = the whole Hador 1 group (record). Companions are those of the Hador 1 record; the dash ("— և X") in a Hador 2 row joins a SECOND Hador 1 record (own record) and is kept with it only where the row lists it.',
    frames: ['row naming only the first saint (Թովմայի առաքելոյն, Պետրոսի հայրապետին եւայլն, Եւգինէոսի Մակարիոսի եւն, Աբրահամու եւ Խորենայ եւն) = whole group', 'leap counsels that name one saint ("Kirakos", "Vahan", "Trifon") mean his whole Hador 1 record'], engine: 'rulebook/row_links.json (links_a/b): every saint row links to the whole Hador 1 record(s); tests: all 640 saint rows of the 35 tables place the full linked records' },
  { id: 'R-H2R-P7-MOVING-FEASTS', no: 7, status: 'rule', reading_status: 'needs_human_review', pages: [104], column: 2,
    quote: 'Եօթներորդ. Ի տօնացուցիս մերում տօնքն որք յաճախօրէն տեղափոխին եւ յայլ եւ այլ միջոցս տօնին, են սոքա։ Զկնի Ծննդեան [word not legible, probably ուրոյն] գրեալ տօնքն, զկնի Վարդավառի երկրորդ շաբաթուց տօնքն, զկնի Աստուածածնի չորրորդ շաբաթու վերջին տօնքն, այսինքն՝ Անդրէ զօրավարն եւ Ադրիանոսին. եւ բուն վերջին երկրորդ տօնքն, այսինքն՝ Աբրահամին եւ Խորէնին, եւ Աստուածատուրն։ Արդ զայսոսիկ վասն այնորիկ յիչեցի, զի նշանագրիցես զայսոսիկ եւ գիտիցես զտեղիս սոցա, զորս ուր եւ տօնիցես, զպատճէնն ՚ի տեղւոջն իւրեանց տեսցես։',
    english: 'Seventh. In our Tonatsoyts the feasts that are frequently displaced and are kept in various different intervals are these: the feasts written [separately(?)] after the Nativity; the feasts of the second weeks after Vardavar; the last feasts of the fourth week after the Assumption, namely Andrew the General and Adrian; and the very last of the second [group of] feasts, namely Abraham and Khoren, and Astvatsatur. Now I mentioned these so that you may mark them and know their places; wherever you celebrate them, look up their text (patchen) in their own place.',
    doubtful_words: [{ word: 'ուրոյն (?)', position: 'between Ծննդեան and գրեալ տօնքն', letters: 'ո ղ/ր ո յ ի ւ (italic)', note: 'one word; the group meant is fixed by the leap counsels and the rows (the feasts Hador 1 prints after the Nativity octave, records 20-29)', dialog: 'H2-DLG-02' }],
    basis: 'The feasts that most often move: (1) the post-Nativity feasts (Hador 1 records 20-29: Antony, Theodosius, Kirakos, Vahan, Trifon, Cyril+Athanasius, Gordios, Eugenia, Theologian, Eugenios+Makarios); (2) the feasts of the second weeks after Vardavar (216-228: Thaddeus, Kyprian, Athanagines, Forefathers, Sons of the Illuminator, Maccabees, Twelve Prophets, Sophia); (3) Andrew the General and Adrian (255, 256: last feasts of the 4th week after the Assumption); (4) Abraham and Khoren (373, with Cosmas and Damian) and Astvatsatur (374). Wherever they are celebrated the text is that of their own Hador 1 record.',
    frames: ['why the nine leap counsels all concern exactly these feasts', 'one celebration per year in ordinary years; leap counsels may repeat a feast that "was placed above/below" (ՉՈ counsel)', 'text of a displaced feast = its own Hador 1 record'], engine: 'h2rules.MOVING_FEASTS (record groups); LEAP_COUNSELS; links give each row its own record' },
  { id: 'R-H2R-TABLE-SELECTION', status: 'rule', reading_status: 'page_confirmed', pages: [187, 188, 189], quote: 'Աստի յառաջ տես ՚ի Փ տարեգիրն, զի Ք տարեգիրն միայն ՚ի նահանջ տարին լինի, եւ մինչեւ ՚ի վերջ փետրուարի ՚ի գործ ածի։ (note under Feb 28 of table Ք, pdf 187 = printed 635; index of year -> letters pdf 189)',
    english: 'From here on see in the Փ table, for the Ք table occurs only in a leap year and is used until the end of February. (Note printed under Feb 28 of table Ք.)',
    basis: 'A leap year has two letters (Taregir pair): the first letter is the table of Jan 1-Feb 29 (the table whose Easter is ONE DAY LATER than the real Easter), the second is the Easter table used from Mar 1. Table Ք exists only for leap years whose Easter is Apr 25 (first letter Ք = pseudo-Easter Apr 26) and is used until the end of February; from Mar 1 table Փ is used. Printed index (pdf 189): leap years show TWO letters in one cell (e.g. 1912 ԵԴ, 1928 ԽԼ, 2004 ԹԸ, 2008 ՉՈ, 2012 ԽԼ, 2016 ՍՌ in the Julian reckoning of the print).',
    frames: ['letter pairs; the Julian-style year index (pdf 188-189)', 'order of letters/years'], engine: 'core.tablesForYear; test_h2rules section 6 (index cells 1909 1910 1911 1912 1928 2004 2008 2012 2016)' },
  { id: 'R-H2R-INDEX-188', status: 'rule', reading_status: 'page_confirmed', pages: [188, 189],
    quote: 'Խրատ վասն առաջիկայ աղիւսակաձեւ շրջանիդ. Աղիւսակաձեւ շրջանն, որ կարգեալ է ՚ի յաջորդ երեսին, է մշտնջենաւոր շրջան Հինգհարիւրերեքին՝ պարունակող 532 ամաց, որ ՚ի ձեռն Թուին Քրիստոսի անսխալ ցուցանէ զՏարեգիրն եւ զՎերագիրն մշտնջենապէս ... Տես ուրեմն, զի սկսանիմ ... զա ՚ի 1909 թուոյն ... գտցես զՏարեգիրն նոյն տարւոյն Ը ... զՎերագիրն նոյն տարւոյն ԺԹ ... 1910 ... Ռ ... Լ ... 1927 ... Թ ... Ը ... 1928 ... ԽԼ ... ԺԹ ... Թէպէտ Վերագիրքն ոչ էին այնքան հարկաւոր՝ որքան Տարեգիրքն, բայց եղաք վասն յարմար բերելոյն զշրջանն։ Իսկ Եօթներեակքն եղեալ են ՚ի խորան իւրաքանչիւր Տարեգրոյն։',
    english: 'Counsel about the coming tabular cycle. The tabular cycle set out on the next page is the perpetual cycle of 532 years which, by means of the year number of Christ, shows the Taregir and the Verakir unerringly for ever. [Worked examples:] 1909 -> Taregir Ը, Verakir ԺԹ; 1910 -> Taregir Ռ, Verakir Լ; 1927 -> Taregir Թ, Verakir Ը; 1928 (leap) -> Taregir ԽԼ, Verakir ԺԹ. To go back or forward add or subtract 532 (or twice 532). The Verakirs were not as necessary as the Taregirs, but we put them to fit the cycle. The Hebdomads ("Եօթներեակք") are set in the table of each Taregir.',
    basis: 'The year index (pdf 189) gives for each year number its Taregir (table letter; TWO letters in a leap year) and Verakir (not used by any rubric); it is a Julian-style reckoning (532 = 28 x 19). The owner ruled that Easter is computed by the Gregorian computus; the index is kept only for the leap-year letter pairs (Jan-Feb table = Easter+1).',
    frames: ['Julian-style year index', 'leap pair order (early letter first)', 'hebdomad number printed in each table head'], engine: 'core.easter (Gregorian, owner ruling); core.tablesForYear; test_h2rules section 6' },
  { id: 'R-H2R-JAN1-5-END-OF-YEAR', status: 'rule', reading_status: 'page_confirmed', pages: [108], quote: 'Վերջ տարւոյն։ (TT-01 Jan 5, pdf 108 = printed 556, on the row "Ճրագալոյց Ծննդեան Քրիստոսի")  /  Վերջ տարւոյս։ (TT-02 Jan 5)',
    english: 'End of the year. (Printed after the Jan 5 row of tables Ա and Բ.)',
    basis: 'Rows dated Jan 1-5 are printed at the END of each table (after Dec 31). The print marks the end of the table\'s year with "Վերջ տարւոյն" on the Jan 5 row (Christmas eve) of the first two tables; in the other 34 the Jan 5 eve row simply ends the table. Their weekday labels are those of the FOLLOWING civil January (checked on all 36 tables). Civil Jan 1-5 of year Y therefore read from the table in force at the end of year Y-1.',
    frames: ['Jan 1-5 of a civil year', 'tables with no Jan 1-4 rows: Hador 1 order (records 384-389)'], engine: 'core.tableAndRows (viaPreviousYear); end_of_year_label annotation' },
];

// Moving-feast groups of counsel 7 (Hador 1 record ordinals; text of a displaced feast is its own record).
export const MOVING_FEASTS = [
  { id: 'after-nativity', phrase: 'Զկնի Ծննդեան [ուրոյն] գրեալ տօնքն', records: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29], note: 'Antony 20, Theodosius 21, Kirakos 22, Vahan 23, Trifon 24, Cyril+Athanasius 25, Gordios 26, Eugenia 27, Theologian 28, Eugenios+Makarios 29' },
  { id: 'second-weeks-after-vardavar', phrase: 'զկնի Վարդավառի երկրորդ շաբաթուց տօնքն', records: [216, 218, 219, 221, 223, 225, 226, 228], note: 'Thaddeus 216, Kyprian 218, Athanagines 219, Forefathers 221, Sons of the Illuminator 223, Maccabees 225, Twelve Prophets 226, Sophia 228' },
  { id: 'andrew-adrian', phrase: 'զկնի Աստուածածնի չորրորդ շաբաթու վերջին տօնքն, այսինքն՝ Անդրէ զօրավարն եւ Ադրիանոսին', records: [255, 256], note: 'Andrew the General 255, Adrian 256' },
  { id: 'abraham-khoren-astvatsatur', phrase: 'բուն վերջին երկրորդ տօնքն, այսինքն՝ Աբրահամին եւ Խորէնին, եւ Աստուածատուրն', records: [373, 374], note: 'Abraham, Khoren, Cosmas, Damian 373; Astvatsatur 374 (258 is the Thursday combination of all three, used where the table prints it)' },
];

// ---------------------------------------------------------------------------------------------------------------------------------
// 2. helpers
// ---------------------------------------------------------------------------------------------------------------------------------
const norm = (s) => String(s ?? '').replace(/[՚'’‘՛՞`՜]/gu, '').replace(/։/gu, ':').replace(/\s+/gu, ' ').replace(/և/gu, 'եւ').trim();
const DAYMS = 86400000;
const WDN = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

// Armenian number words -> integer (used for "Միջոց ուտիքն <N> օր/շաբաթ է")
const UNITS = { 'մի': 1, 'երկու': 2, 'երեք': 3, 'չորս': 4, 'հինգ': 5, 'վեց': 6, 'եօթն': 7, 'էօթն': 7, 'ութ': 8, 'ինն': 9 };
const TEENS = { 'տասն': 10, 'մետասան': 11, 'երկոտասան': 12, 'երեքտասան': 13, 'չորեքտասան': 14, 'հնգետասան': 15, 'վեշտասան': 16, 'եօթնեւտասն': 17, 'ութուտասն': 18, 'իննեւտասն': 19 };
const TENS = { 'քսան': 20, 'երեսուն': 30, 'երիսուն': 30, 'քառասուն': 40 };
const nk = (x) => String(x).replace(/եւ/gu, '\u0587').replace(/և/gu, '\u0587');
const _U = Object.fromEntries(Object.entries(UNITS).map(([k, v]) => [nk(k), v]));
const _T = Object.fromEntries(Object.entries(TEENS).map(([k, v]) => [nk(k), v]));
const _X = Object.fromEntries(Object.entries(TENS).map(([k, v]) => [nk(k), v]));
export function armNumber(words) {
  const w = nk(String(words).toLowerCase().replace(/\s+/gu, ' ').trim());
  if (w in _T) return _T[w];
  if (w in _U) return _U[w];
  if (w in _X) return _X[w];
  const sp = w.split(' ' + '\u0587' + ' ');
  if (sp.length === 2) {
    if (sp[0] in _X && sp[1] in _U) return _X[sp[0]] + _U[sp[1]];
    if (sp[0] === 'տասն' && sp[1] in _U) return 10 + _U[sp[1]];
  }
  return null;
}
const ARM_ORD = { 'առաջին': 1, 'երկրորդ': 2, 'երրորդ': 3, 'չորրորդ': 4, 'հինգերորդ': 5, 'վեցերորդ': 6, 'եօթներորդ': 7, 'ութերորդ': 8, 'իններորդ': 9, 'տասներորդ': 10, 'մետասաներորդ': 11, 'ութտասաներորդ': 18 };

// Fast ("Բարեկենդան X պահոցն") -> canonical key
const FAST_KEYS = [
  [/Առաջաւոր/u, 'arachavorats'], [/Ծննդեան/u, 'nativity'], [/Յակոբ/u, 'james'], [/Յիսնակ/u, 'advent_yisnak'], [/Վարագ/u, 'varak_cross'],
  [/Աստուածածն/u, 'assumption'], [/Եղիական/u, 'elijah'], [/Վարդավառ/u, 'vardavar'], [/Խաչ/u, 'holy_cross'],
];
const LETTERS = ['Ա', 'Բ', 'Գ', 'Դ', 'Ե', 'Զ', 'Է', 'Ը', 'Թ', 'Ժ', 'Ի', 'Լ', 'Խ', 'Ծ', 'Կ', 'Հ', 'Ձ', 'Ղ', 'Ճ', 'Մ', 'Յ', 'Ն', 'Շ', 'Ո', 'Չ', 'Պ', 'Ջ', 'Ռ', 'Ս', 'Վ', 'Տ', 'Ր', 'Ց', 'Ւ', 'Փ', 'Ք'];

// approximate pdf page of a Hador 2 row (rows are not page-tagged in the data): linear in the row ordinal; verified 168 for TT-29 Apr 7.
export function approxPages(row) {
  if (!row || typeof row.ordinal !== 'number') return [105, 188];
  const est = 105 + (row.ordinal - 393) * 83 / 2274;
  return [...new Set([Math.floor(est), Math.ceil(est)])].map((p) => Math.min(188, Math.max(105, p)));
}
const tableIndex = (H2, id) => H2.tables.findIndex((x) => x.id === id);

// Letter pair of a year as the book's p.189 index prints it (first = Jan-Feb table, second = Easter table). Used by tests and by the leap conditions.
export function yearLetters(ctx) {
  const sel = ctx.sel;
  if (!sel.leap) return { leap: false, early: null, base: sel.segments[0].table, pair: sel.segments[0].table.letter };
  const early = sel.segments[0].table, base = sel.segments[1].table;
  return { leap: true, early, base, pair: early.letter + base.letter };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// 3. rubric parser (pure function of the rubric string and the row/table). Returns [{type, ..., status, note?}] ; never guesses.
// ---------------------------------------------------------------------------------------------------------------------------------
const RX_HEBD = /[ԵէԷ]օթներեակ\s+Հռովմայեց\S*\s*([0-9]|[ԱԲԳԴԵԶԷ])(?![Ա-Ֆա-ֆ])/iu;
const RX_SEE1 = /(?:Առաջին|միւս)\s+հատոր/iu;
const RX_KEEP = /պահելով\s+զ(?:կարգ\s+տեղ(?:ո|ւ)յս|սմայդ|ամիսս|ամիսդ|ամսդ|ամսաթիւսդ|չափսդ)/iu;

function hymnEffect(s) {
  // "Հարց ակ. Սուրբ աստուած արարիչ" / "Համբ. բկ. Քրիստոս յարեաւ. և Առաւօտեան" / "Մկք. ստեղծ. Հիացան" / "Ճաշու շարական բձ. Որ լուսով"
  const m = /^(Հարց|Համբ\.?|Մկք\.?|Ճաշու շարական)\s*(ապշ\.|ապց\.)?\s*(?:([ԱԲԳԴ][ՁԿ])\.?\s*)?(.*)$/u.exec(s);
  if (!m) return null;
  const KIND = { 'Հարց': 'haraj', 'Համբ.': 'hambardzis', 'Համբ': 'hambardzis', 'Մկք.': 'mkq_unresolved_abbrev', 'Մկք': 'mkq_unresolved_abbrev', 'Ճաշու շարական': 'chashu_sharakan' };
  const kind = KIND[m[1]];
  return { type: 'hymn_assignment', kind, qualifier_verbatim: m[2] || null, mode: m[3] || null, incipit_verbatim: m[4] || null, verbatim: s,
    status: kind === 'mkq_unresolved_abbrev' ? 'needs_human_review' : (m[2] ? 'interpretation' : 'rule'),
    note: kind === 'haraj' ? 'Haraj ("Հարց") = hymn of request (rows\' structured field prints "Հարց Ապաշխարութեան" for "ապշ."); "ապց." abbreviation not expanded by the book here.'
      : kind === 'hambardzis' ? '"Համբ." = Resurrection hambardzis/"Յարութեան համբարձիս" (preface and rubrics: "զյարութեան համբարձիսն").'
      : kind === 'mkq_unresolved_abbrev' ? '"Մկք." is not expanded anywhere in the book; do not guess.' : undefined };
}

export function parseRubric(rubric, ctx = {}) {
  const out = [];
  const raw = String(rubric ?? '');
  const n = norm(raw);
  const sents = n.split(/:\s*/u).map((x) => x.trim()).filter(Boolean);
  let lastHymn = null, inLeap = false;
  for (let sent of sents) {
    const before = out.length;
    // --- hebdomad of the Romans (table heading printed inside the Jan 6 rubric)
    let m = RX_HEBD.exec(sent);
    if (m) {
      const v = /[0-9]/u.test(m[1]) ? Number(m[1]) : { Ա: 1, Բ: 2, Գ: 3, Դ: 4, Ե: 5, Զ: 6, Է: 7 }[m[1]];
      out.push({ type: 'hebdomad_romans', n: v, printed: m[1], status: 'rule', note: 'Table heading "Եօթներեակ Հռովմայեցւոց N" (Roman concurrent / weekday of Jan 6); not used by any calendar rule.' });
      sent = sent.replace(RX_HEBD, '').replace(/^[Ա-Ք]\.\s*/u, '').replace(/\(\s*Տարեգիր [Ա-Ք],?\s*\)/u, '').replace(/\([Ա-Ք]\)/u, '').replace(/^[\s.,]+|\s+$/gu, '');
      if (!sent || /^[\s().,]*$/u.test(sent)) continue;
    }
    // --- eating interval
    m = /^Միջոց ուտիքն (.+?) (օր|շաբաթ)(?: է)?/u.exec(sent);
    if (m) {
      const nStated = armNumber(m[1]);
      out.push({ type: 'eating_interval', unit: m[2] === 'օր' ? 'days' : 'weeks', n_stated: nStated, n_words: m[1], status: nStated == null ? 'needs_human_review' : 'rule' });
      const rest = sent.slice(m[0].length).replace(/^[\s,.]+/u, '');
      if (rest) { sents.splice(sents.indexOf(sent) + 1, 0, rest); }
      continue;
    }
    if (/^Միջոց ուտիքն/u.test(sent)) {
      // garbled numeral such as "ո–ի օր է"
      out.push({ type: 'eating_interval', unit: /օր/u.test(sent) ? 'days' : (/շաբաթ/u.test(sent) ? 'weeks' : null), n_stated: null, n_words: sent, status: 'needs_human_review', note: 'numeral unreadable in transcription' });
      continue;
    }
    // --- "to the end" modifier of the previous hymn
    if (/^ց?վերջն$/u.test(sent) || /^ցվերջն$/u.test(sent)) {
      out.push({ type: 'hymn_to_end', applies_to: lastHymn ? lastHymn.verbatim : null, status: lastHymn ? 'rule' : 'interpretation', note: '"ցվերջն" = sing/read to the end; attached to the preceding hymn heading when there is one.' });
      continue;
    }
    // --- hymn headings (rubric rows of TT-10 etc.)
    if (/^(Հարց|Համբ|Մկք|Ճաշու շարական)/u.test(sent)) {
      const sub = sent.split(/(?<=\S)\.\s+(?=Եւ\s|եւ\s)/u);
      const h = hymnEffect(sent.replace(/\s*ցվերջն\s*$/u, ''));
      if (h) {
        if (/ցվերջն\s*$/u.test(sent)) h.sung_to_end = true;
        out.push(h); lastHymn = h; continue;
      }
    }
    // --- Barekendan label
    m = /^Բարեկենդան\s+(.+?)\s*$/u.exec(sent);
    if (m) {
      const key = (FAST_KEYS.find(([rx]) => rx.test(m[1])) || [])[1] || null;
      out.push({ type: 'barekendan_label', fast: key, verbatim: sent, status: key ? 'rule' : 'needs_human_review',
        note: key === 'holy_cross' && /Վարագ/u.test(sent) ? 'Barekendan of the (fast of the) Cross of Varak' : undefined });
      continue;
    }
    if (/^Պահք Ծննդեանն Քրիստոսի/u.test(sent)) { out.push({ type: 'fast_label', fast: 'nativity', verbatim: sent, status: 'rule' }); continue; }
    if (/^Վերջ տարւո[յ]/u.test(sent)) { out.push({ type: 'end_of_year_label', verbatim: sent, status: 'rule', note: 'rows Jan 1-5 are the end of the previous liturgical year (R-H2R-JAN1-5-END-OF-YEAR)' }); continue; }
    if (/^(Ի մէջտեղէ )?Ապաշխարհից/iu.test(sent)) { out.push({ type: 'apashkharats_label', verbatim: sent, status: 'rule', note: 'label of the "Sundays of repentance" (Apashkharats) that stand in the first-table interval of TT-01' }); continue; }
    // --- reading assignments
    if (/Գիր(ք|քն)?\s+եւ\s+աւետարան(ն)?\s+Թէոդոս/u.test(sent) || /Զգիր\S*\s+եւ\s+զաւետարան\S*\s+Թէոդ/u.test(sent)) {
      const who = /Թէոդորոս/u.test(sent) ? 'Թէոդորոս' : 'Թէոդոս';
      out.push({ type: 'reading_assignment', feast_ref: who, meaning: 'the Book (apostle/epistle reading) and the Gospel of the day are those of the feast of ' + who + ' (looked up in Hador 1/Jashots)', verbatim: sent, status: 'interpretation',
        note: 'target record is a link-agent matter; "Թէոդոս/Թէոդորոս" is the king Theodosius & Ephesus youths (rows near Dec 4-6) -- unverified' });
      continue;
    }
    if (/Զգիր\S*\s+եւ\s+զաւետարան\S*\s+սուրբ\s+Յակոբայ\s+պահոց\s+երեքշաբաթ\S*\s+աւուրն\s+կարդա/u.test(sent)) {
      out.push({ type: 'reading_assignment', feast_ref: 'Յակոբայ պահոց երեքշաբաթի աւուրն', meaning: 'read the Book and Gospel of the Tuesday of the Fast of St James', verbatim: sent, status: 'rule' });
      continue;
    }
    // --- the note under Feb 28 of table Ք (the truncated leap table)
    if (/^Աստի յառաջ տես ի Փ տարեգիրն/u.test(sent)) { out.push({ type: 'table_switch', target_letter_printed: 'Փ', only_in_leap_year: true, source_table_used_until: 'end of February', verbatim: sent, status: 'rule',
      note: 'Table Ք exists only in a leap year (Easter Apr 25) and serves until the end of February; from here on table Փ.' }); continue; }
    // --- leap-year counsel sentences (the sentence with "նահանջ" and the sentences that continue it in the same rubric)
    if (/նահանջ/iu.test(sent) || (inLeap && /^(Այլ|Իսկ|Բայց)\s/u.test(sent) && !/^Բայց\s+(?:զ|ըզ)?հարց/iu.test(sent))) { inLeap = true; out.push({ type: 'leap_year_counsel', verbatim: sent, status: 'rule', note: 'details hand-coded in LEAP_COUNSELS' }); continue; }
    if (/^Իսկ\s+(?:ի\s+)?(?:յայլ|հասարակ)\s+(?:տարի|ամս)/iu.test(sent)) { out.push({ type: 'leap_year_counsel', verbatim: sent, status: 'rule', note: 'in all other years celebrate as printed' }); continue; }
    // --- Sunday/day hymn-tones of this stretch are printed HERE (not in Hador 1)
    if (/(?:կիւրակէ\S*\s+(?:միջոցիս\s+)?աստ|հարցսն?\s+(?:եւ\s+զձայնսն\s+)?աստ|հարցս\s+կիւրակէից)/iu.test(sent) && !/տարեգիր/iu.test(sent)) { out.push({ type: 'keep_here', items: ['haraj_of_sundays', ...(/ձայն/u.test(sent) ? ['day_tones'] : [])], verbatim: sent, status: 'rule', note: 'for this stretch the Sunday haraj (and tones) are the ones printed in THIS table, not Hador 1' }); continue; }
    if (/^պահոց$/iu.test(sent)) { out.push({ type: 'fast_label', fast: null, verbatim: sent, status: 'interpretation', note: 'bare word "պահոց" (of the fast) on the Candlemas-eve row' }); continue; }
    // --- see ANOTHER table (letter)
    m = /(?:Տես|Տեսցես|տես|տեսցես|տեսանես)?.*?(?:ի|յ)\s*([Ա-Ք]|խ\.|)\s*տարե[գկ]իր?ն?/u.exec(sent);
    const m2 = /(?:^|\s)(?:ի|յ)\s*([Ա-Ք])\s*(?:տարե[գկ]իրն|տարեկիրն|տարեգրին)/u.exec(sent) || /(?:^|\s)տարեգիրն\s+([Ա-Ք])(?![Ա-Ֆա-ֆ])/u.exec(sent) || /(?:^|\s)(?:ի|յ)\s*(խ)\.?\s*արեգիւն/iu.exec(sent);
    if (m2 || /(?:^|\s)(?:ի|յ)\s*տարեգիրն/u.test(sent)) {
      const letterPrinted = m2 ? m2[1].toUpperCase() : null;
      const items = [];
      if (/հարց/iu.test(sent)) items.push('haraj_of_martyrs_and_fasts');
      if (/յարութեան\s+համբարձիս/iu.test(sent)) items.push('resurrection_hambardzis');
      if (/ձայն/iu.test(sent)) items.push('day_tones');
      if (/յետին\s+շաբաթու\s+տօնսն/iu.test(sent)) items.push('last_week_feasts');
      if (/կիւրակէ\s+շաբաթօտօնսն/iu.test(sent)) items.push('sunday_and_saturday_feasts');
      const shift = /միով\s+իւրով\s+աւելի/u.test(sent) ? 1 : (/երկու\s+թուով\s+աւելի/u.test(sent) ? 2 : null);
      const until = /(?:մինչեւ|մինչև)\s+(?:ի\s+)?սուրբ\s+Խաչ/u.test(sent) ? 'holy_cross' : (/(?:մինչեւ|մինչև)\s+(?:ի\s*)?յ?Աստուածածնի\s+բարեկենդան/iu.test(sent) ? 'assumption_barekendan' : (/(?:մինչեւ|մինչև)\s+յԱռաջաւորաց\s+Բարեկենդան/u.test(sent) ? 'arachavorats_barekendan' : (/տասներորդ/u.test(sent) ? 'tenth_sunday' : null)));
      out.push({ type: 'see_other_table', letter_printed: letterPrinted, items, until, date_shift_days: shift, keep_own_month_dates: /պահելով\s+զ(?:ամիս|ամս|ամսաթիւս)|զամսամիւտն/iu.test(sent), verbatim: sent, status: 'interpretation',
        note: 'the referenced table is, wherever the letter is legible, the table immediately BEFORE the current one in book order; resolved by resolveOtherTable()' });
      continue;
    }
    if (/զամսամիւտն\s+(?:միով|երկու)/u.test(sent)) { // "Զամենայն որպէսն ... տես ՚ի Ա տարեգիրն" sentences already handled above; fallback
      out.push({ type: 'needs_review_text', verbatim: sent, status: 'needs_human_review' }); continue;
    }
    // --- "see Volume I"
    if (RX_SEE1.test(sent) || /^Տես\s/iu.test(sent) || /^Տե\s/iu.test(sent) || /^Եւ\s+(?:զ?այլ|զ)/iu.test(sent) || /^Զայլսն\s/u.test(sent) || /^(?:Կարգաւորութիւն ասա|Մինչեւ ի վերջն)/u.test(sent) || /^Մինչ(եւ|և)/iu.test(sent) || /^Զմիջոցս/u.test(sent) || /^Զ(ի ներքոյ|ներքոյ)/u.test(sent) || /^Զհետեւոց/u.test(sent)) {
      const e = { type: 'see_vol1', until: null, keep_place: RX_KEEP.test(sent), keep_own_month_dates: /պահելով\s+զ(?:ամիսս|ամիսդ|ամսդ|ամսաթիւսդ)/u.test(sent), verbatim: sent, status: 'rule' };
      const ord = /(տասներորդ|մետասաներորդ|մեքասաներորդ|ժդատաներորդ|ութտասաներորդ|չորրորդ|պատկերորդ)\s+(?:Կ|կ)ի?ւ?րակ/iu.exec(sent);
      if (/(?:մինչեւ|մինչև)\s+(?:ի\s*)?Վարդավառ/iu.test(sent)) e.until = { kind: 'vardavar' };
      else if (/յերրորդ\s+շաբաթու\s+ուրբաթ\s+օրն/u.test(sent)) { e.until = { kind: 'weekday_of_week', week: 3, weekday: 'Fri', stated_day_number: /իններորդ\s+օր/u.test(sent) ? 9 : null }; e.saturday_here = /շաբաթ\s+օրն/u.test(sent); }
      else if (/երկրորդ\s+շաբաթու\s+ուրբաթ\s+օրն/u.test(sent)) { e.until = { kind: 'weekday_of_week', week: 2, weekday: 'Fri', stated_day_number: null }; e.saturday_here = /շաբաթ\s+օրն/u.test(sent); }
      else if (/մինչեւ\s+յերկրորդ\s+շաբաթու\s+ուրբաթ/u.test(sent) || /մինչև\s+յերկրորդ\s+շաբաթու/u.test(sent)) { e.until = { kind: 'weekday_of_week', week: 2, weekday: 'Fri' }; e.saturday_here = true; }
      else if (ord && /(?:մինչեւ|մինչև)/u.test(sent)) {
        const w = ord[1].toLowerCase();
        const val = { 'տասներորդ': 10, 'չորրորդ': 4, 'մետասաներորդ': 11, 'մեքասաներորդ': 11, 'ժդատաներորդ': null, 'ութտասաներորդ': 18, 'պատկերորդ': null }[w];
        e.until = { kind: 'sunday_ordinal', n: val, word: ord[1], family_inferred_from_month: true };
        if (val == null || w === 'մեքասաներորդ' || w === 'ժդատաներորդ' || w === 'ութտասաներորդ' || w === 'պատկերորդ') { e.status = 'needs_human_review'; e.note = 'ordinal word is an OCR corruption or unusual; do not guess'; }
        else if (w === 'մետասաներորդ') { e.status = 'rule'; }
      }
      else if (/(?:մինչեւ|մինչև)\s+(?:ց|ի\s*)?վերջն|ցվերջն|մինչեւ\s+ի\s+վերջն/iu.test(sent)) e.until = { kind: 'end' };
      else if (/յԱստուածածնի\s+Բարեկենդանն|Աստուածածնի\s+Բարեկենդանն/u.test(sent)) e.until = { kind: 'assumption_barekendan' };
      else if (/Զ(?:ի ներքոյ|ներքոյ)|Զհետեւոց|զկնի\s+Վարդավառին?/u.test(sent) && /Վարդավառ/u.test(sent)) { e.type = 'see_vol1_series'; e.series = 'after_vardavar'; e.scope = 'the rows printed below (weeks after Vardavar) are to be taken from Hador 1'; }
      else if (/զկնի\s+Աստուածածնին/u.test(sent)) { e.type = 'see_vol1_series'; e.series = 'after_assumption'; e.until = { kind: 'week_of_series', week: 4 }; e.status = 'interpretation'; }
      if (/միայն\s+զկարգ\s+(?:Յարութեան\s+)?հարցիցն\s+աստ|զհարցս\s+(?:կիւրակէիցն\s+|կիւրակէից\s+)?աստ|զկարգ\s+կիւրակէից(?:ն)?\s+աստ|զհարցսն\s+եւ\s+զձայնսն\s+աստ|զհարցս\s+եւ\s+զձայնս\s+աստ|զկարգս?\s+կիրակէից\s+եւ\s+պահոց|Զհարցս\s+կիւրակէից|զկիւրակէից\s+հարցսն\s+աստ|կիւրակէից միջոցիս աստ/iu.test(sent))
        e.keep_here = ['haraj_of_sundays', ...(/ձայն/u.test(sent) ? ['day_tones'] : [])];
      if (/շաբաթ\s+օրն\s+(?:ե|ի|ի՛)?կ\s+աստ|շաբաթի\s+օրն\s+(?:ե|ի|ի՛)?կ\s+աստ|շաբաթ\s+օրն\s+(?:ե|ի|ի՛)?կ\s+ասա|շաբաթ օրն իկ աստ|շաբաթի օրն իկ աստ|շաբաթ օրն ե՛կ աստ/iu.test(sent) || (e.saturday_here)) e.saturday_here = true;
      if (/տօնեա\s+զ?ի\s+ներքոյ|տօնսդ|զայսոսիկ\s+տօնք|զի ներքոյ/iu.test(sent) && /Ծննդեան\s+Ութօրէիցն|յետ\s+ութօրէիցն|ութօրէիցն|Ունօփրիոյն|Ո-րօրէից|ո-իօրէից/iu.test(sent)) e.saturday_feasts_below = 'feasts printed below, which in Hador 1 stand after the Nativity octave' + (/Աստուածածնին/u.test(sent) ? ' and after the Assumption' : '');
      out.push(e);
      continue;
    }
    // --- label-like fragments
    if (/^Եւ\s+այլն/u.test(sent) || /^Զայլսն\s+կարգաւ/u.test(sent) || /^Կարգաւորութիւն/u.test(sent) || /^Եւ\s+զայլն?\s+/u.test(sent)) { out.push({ type: 'continue_in_order', verbatim: sent, status: 'rule' }); continue; }
    if (/^Զի յաւուր տօնի սորա Տեառնընդառաջ է$/u.test(sent)) { out.push({ type: 'coincidence_remark', verbatim: sent, status: 'needs_human_review', note: 'remark that on this feast\'s day it is Candlemas; where it applies is unclear' }); continue; }
    if (/^Վասն ուխտի$/u.test(sent) || /^իւր սարօքն$/u.test(sent)) { out.push({ type: 'label', verbatim: sent, status: 'needs_human_review', note: 'short fragment not explained in the book' }); continue; }
    if (/^ցվերջն$/u.test(sent) || /^ց?վերջն\.?$/u.test(sent)) { out.push({ type: 'hymn_to_end', applies_to: null, status: 'interpretation' }); continue; }
    if (/նահանջ/iu.test(sent)) { out.push({ type: 'leap_year_counsel', verbatim: sent, status: 'rule', note: 'parsed by leapRulesFor()' }); continue; }
    out.push({ type: 'unclassified', verbatim: sent, status: 'needs_human_review' });
    if (out.length === before) continue;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// 4. leap-year counsels (hand-transcribed from the rubric text of each row; see docs/notes/h2rules.md for the plain-English account)
//    Each counsel binds ONLY in a leap year in which table `table` is the Jan-Feb table (role 'early') or the Easter table (role 'base'), i.e. in which
//    the year's letter pair equals `pair` (R-H2R-P3-LEAP-COUNSELS). `subs`: for the row found by `find` (nearest to the anchor row inside `win` days,
//    default [-10,+10]) the printed commemoration is removed and replaced as the counsel says.
// ---------------------------------------------------------------------------------------------------------------------------------
export const LEAP_COUNSELS = [
  { id: 'L-TT08', table: 'TT-08', m: 7, d: 25, role: 'base', pair: 'ԹԸ', pair_printed: 'Թը', why: 'Antony was already celebrated in the first letter Թ (Jan-Feb) after the Nativity',
    quote_key: 'Եթէ նահանջ ամի Թը իցեն տարեգիրքն',
    subs: [
      { find: 'Անտ[օո]ն', remove_records: [20, 24], celebrate_records: [21], remove: ['Անտօն', 'Տրիփոն (moves to Thursday)'], celebrate: ['Թէոդոս'], status: 'interpretation' },
      { find: 'Թէոդոս', remove_records: [21], celebrate_records: [22, 26], remove: ['Թէոդոս'], celebrate: ['Կիրակոս (+ Յուղիտա)', 'Գորդիոս (his dash-companion in the printed row)'], status: 'interpretation',
        note: 'wave 8: the counsel closes "իւրեանց ընկերօքն" (each with his companions). The printed rows join Kirakos+Gordios and Vahan+Eugenia with a dash; carrying the dash-companion with the saint is the only reading in which Gordios (26) and Eugenia (27) are celebrated at all in a ԹԸ year (tested: without it they are never celebrated that year). See H2-DLG-03.' },
      { find: 'Կիրակոս', remove_records: [22, 26], celebrate_records: [23, 27], remove: ['Կիրակոս', 'Գորդիոս'], celebrate: ['Վահան (+ Եւգինէ կոյս, his dash-companion)'], status: 'interpretation' },
      { find: 'Վահան', remove_records: [23, 27], celebrate_records: [24], remove: ['Վահան', 'Եւգինէ'], celebrate: ['Տրիփոն (with Parsam, Onuphrios)'], status: 'interpretation' } ] },
  { id: 'L-TT09', table: 'TT-09', m: 7, d: 26, role: 'base', pair: 'ԺԹ', why: 'Theodosius was already celebrated in the first letter Ժ after the Nativity',
    quote_key: 'յորժամ տարին Նահանջ իցէ, և տարեգիրն ԺԹ',
    subs: [
      { find: 'Թէոդոս', remove_records: [21], celebrate_records: [25], remove: ['Թէոդոս'], celebrate: ['Կիւրեղ եւ Աթանաս հայրապետք'], status: 'interpretation' },
      // wave 12 (docs/notes/literal_fidelity.md, 'wave 12 decisions'): «ուղղելով զԱստուածաբանն ՚ի միւս շաբաթի օրն» directs the Theologian to the other Saturday, where the
      // printed row joins him to the patriarchs; the patriarchs were just taken up to Jul 26, so that Saturday is the Theologian alone (same result as the ԼԻ formula «զԱստուածաբանն միայն»).
      { find: 'Աթանաս', remove_records: [25], celebrate_records: [28], win: [0, 10], remove: ['Աթանաս', 'Կիւրղ (taken up to Jul 26)'], celebrate: ['Գրիգոր Աստուածաբան (alone)'], status: 'interpretation',
        note: 'wave 12: the verb ուղղելով (directing) moves the Theologian to the other Saturday; the patriarchs are celebrated on Jul 26 by the same sentence, so they are not repeated on Aug 2.' },
    ] },
  { id: 'L-TT11', table: 'TT-11', m: 7, d: 8, role: 'base', pair: 'ԼԻ', why: 'the other patriarchs were celebrated in the first letter Լ',
    quote_key: 'Բայց եթէ տարին նահանջ իցէ, և տարեգիրքն ԼԻ',
    subs: [ { find: 'Աթանաս', remove_records: [25], celebrate_records: [28], win: [0, 28], remove: ['Աթանաս', 'Կիւրղ'], celebrate: ['Գրիգոր Աստուածաբան (only)'], status: 'rule' } ] },
  { id: 'L-TT13', table: 'TT-13', m: 7, d: 10, role: 'base', pair: 'ԾԽ', why: 'Kirakos was celebrated in the first letter Ծ',
    quote_key: 'Բայց յորժամ տարին նահանջ իցէ, և տարեգիրն ԾԽ',
    subs: [ { find: 'Կիրակոս', remove_records: [22], celebrate_records: [23, 26], win: [0, 28], remove: ['Կիրակոս', 'Յուղիտա'], celebrate: ['Վահան', 'Գորդիոս'], status: 'rule',
      note: 'stated: "զՎահանն և զԳորդիոսն տօնեա յերկուշաբաթի օրն" (Monday: Vahan and Gordios; Kirakos is not celebrated).' },
      // wave 13 (owner, from the page image of table Խ Aug 1-2): the Tuesday row is «Վահանայ Գողթնացւոյն, — և Եւգինեայ կուսին»: Vahan is the HEAD of that row and the counsel has brought him to Monday, so what remains of the Tuesday row is its dash companion Eugenia.
      // Same two saints, same two weekdays and same structure as the explicit ՆՅ and ՍՌ notes («յերեքշաբաթին զԵւգինէ կոյսն»).
      { find: 'Վահան', remove_records: [23], celebrate_records: [27], win: [20, 26], remove: ['Վահան (brought up to Monday Aug 1)'], celebrate: ['Եւգինէ կոյս (the remainder of the Tuesday row)'], status: 'interpretation',
        note: 'wave 13: owner read the table: Vahan heads the Tuesday row; once he is brought to Monday only his dash companion Eugenia is left; parallels ՆՅ/ՍՌ (Tuesday Eugenia).' }
    ] },
  { id: 'L-TT17', table: 'TT-17', m: 8, d: 5, role: 'base', pair: 'ՂՁ', pair_printed: 'ՂԶ', pair_printed_is_ocr: true, pair_page_confirmed: true, why: 'Eugenios and Makarios were celebrated in the first letter Ղ after the Nativity',
    quote_key: 'եթէ տարին նահանջ պատահիցի, և տարեգիրն ՂԶ',
    subs: [ { find: 'Եւգին[եէ]ոս|Մակարիոս', remove_records: [29], celebrate_records: [258, 373, 374], win: [-1, 3], remove: ['Եւգինէոս', 'Մակարիոս'], celebrate: ['Աբրահամ', 'Խորէն', 'Աստուածատուր (printed below with Julian the virgin)'], status: 'rule', source_find: 'Աբրահամ',
      note: 'wave 8 (coordinator OR-12, owner print 1996-08-05): records [258, 373, 374] exactly as the row links do for the same group on the Thursday rows: 258 = the combined name (Abraham, Khoren, Cosmas, Damian, Astvatsatur; no readings of its own, its rubric says "Զպատճէնն սոցա ՚ի վերջն" = see their text at the end) + 373/374 = the text at the end.  the feasts named are exactly the group of counsel 7 (Abraham and Khoren, and Astvatsatur) and counsel 6 makes the first saints stand for the whole Hador 1 group: record 373 (Abraham, Khoren, Cosmas, Damian) + record 374 (Astvatsatur), 258 = both under one heading. The printed row "below with Julian the virgin" (TT-17 Nov 25, row text "Յուլիանեայ եւ Վասիլուհւոյ. - և Աբրահամու և Խորենայ, Կոզմայի եւ Դամիանոսի, և Աստուածատրոյ") links to 344+373+374, Julian (344) is NOT moved. Whether the Nov 25 row still repeats them is not stated (the ՉՈ counsel shows the book repeating feasts that "were placed above/below"): superseded by the wave-10 owner decision: the Nov 25 row is reduced to Julian (next entry). ' } ,
      { find: 'Յուլիանեայ', remove_records: [373, 374], celebrate_records: [344], win: [100, 125], remove: ['Աբրահամ, Խորէն, Աստուածատուր (brought up to Aug 5 by the counsel)'], celebrate: ['Յուլիանեա (alone)'], status: 'owner_ruling',
        note: 'wave 10, OWNER DECISION 2026-10-14: «որք ՚ի ստորև եդեալ են ընդ Յուլիանեայ կուսին» identifies the group placed below with Julian (TT-17 Nov 25 row) which the counsel BRINGS UP to Aug 5 (moved, same mechanism as the other counsels); Eugenios and Makarios stay in January (table Ղ). Nov 25 = Julian (and Vasiluhi) only. Not to be asked again.' },
    ] },
  { id: 'L-TT22', table: 'TT-22', m: 1, d: 29, role: 'early', pair: 'ՆՅ', why: 'Andrew the General and Adrian are celebrated in the last table Յ after the tenth Sunday',
    quote_key: 'յորժամ տարին նահանջ իցէ, և գիրք տարւոյն ՆՅ', owner_note: 'owner: the rubric governs',
    subs: [
      { find: 'Վահան', remove_records: [27], celebrate_records: [23], win: [-6, 0], remove: ['Եւգինէ կոյս'], celebrate: ['Վահան (only)'], status: 'interpretation' },
      { find: 'Եւգին[եէ]ոս', remove_records: [29, 255], celebrate_records: [27], win: [-6, 0], remove: ['Եւգինէոս', 'Մակարիոս', 'Անդրէ զօրավար'], celebrate: ['Եւգինէ կոյս'], status: 'interpretation' },
      { find: 'Ադրիան', remove_records: [256], celebrate_records: [29], win: [-3, 3], remove: ['Ադրիանոս'], celebrate: ['Եւգինէոս', 'Մակարիոս եւ այլք'], status: 'interpretation' }
    ] },
  { id: 'L-TT25', table: 'TT-25', m: 2, d: 3, role: 'early', pair: 'ՉՈ', pair_printed: 'ՁՈ', pair_printed_is_ocr: true, pair_page_confirmed: true, why: 'the four feasts above (Maccabees, Twelve Prophets, Sophia, Sons of the Illuminator) are celebrated in the last table Ո after Vardavar',
    quote_key: 'յորժամ տարին նահանջ պատահիցէ և գիրք տարւոյն ՁՈ',
    subs: [
      { find: 'Մակաբայեց', remove_records: [225], celebrate_records: [27], win: [-8, 2], remove: ['Մակաբայեցիք'], celebrate: ['Եւգինէ կոյս'], status: 'interpretation' },
      { find: 'Երկոտասան մարգարէ', remove_records: [226], celebrate_records: [255], win: [-8, 2], remove: ['Երկոտասան մարգարէք'], celebrate: ['Անդրէ զօրավար'], status: 'interpretation' },
      { find: 'Սոփիայ', remove_records: [228], celebrate_records: [256], win: [-8, 2], remove: ['Սոփիա'], celebrate: ['Ադրիանոս (+ Անատօլիա)'], status: 'interpretation',
        note: 'wave 9: page image pdf 158 (printed 606) read: the counsel names "զԱնդրէ զօրավարն և զԱդրիանոսն, որք ՚ի վայր եդեալ են զկնի Աստուածածնին" (Andrew the General and Adrian, placed below after the Assumption). The earlier OCR reading Սուքիասեանսն (record 37, a February record, not placed after the Assumption) is replaced; this also makes Adrian (256) celebrated once in the ՉՈ year, as in ՆՅ/ՍՌ/ՐՏ' },
      { find: 'Որդւոց', remove_records: [223], celebrate_records: [28], win: [-3, 3], remove: ['Որդիք եւ թոռունք Լուսաւորչին'], celebrate: ['Գրիգոր Աստուածաբան'], status: 'interpretation' },
      // wave 12: «որք ՚ի վերդ ընդ այլոց եդան» = the same construction as ՂՁ «որք ՚ի ստորև եդեալ են ընդ Յուլիանեայ կուսին» (owner reading: the group placed with others in the other row is brought to the new day).
      { find: 'Վահան', remove_records: [27], celebrate_records: [23], win: [-14, -9], remove: ['Եւգինէ կոյս (brought to Monday)'], celebrate: ['Վահան (alone)'], status: 'interpretation', note: 'wave 12: Eugenia was "placed above with others" (Vahan row) and is brought to her own Monday.' },
      { find: 'Աթանաս', remove_records: [28], celebrate_records: [25], win: [-9, -5], remove: ['Գրիգոր Աստուածաբան (brought to Saturday Feb 3)'], celebrate: ['Աթանաս եւ Կիւրեղ (alone)'], status: 'interpretation', note: 'wave 12: the Theologian was "placed above with others" (patriarchs row) and is brought to his own Saturday.' }
    ] },
  { id: 'L-TT29', table: 'TT-29', m: 1, d: 31, role: 'early', pair: 'ՍՌ', pair_printed: 'ՍՈ', pair_printed_is_ocr: true, pair_page_confirmed: true, why: 'Andrew the General and Adrian are celebrated in the last table Ռ after the tenth Sunday',
    quote_key: 'յորժամ տարին նահանջ պատահիցի, և գիր տարւոյ ՍՈ',
    subs: [
      { find: 'Վահան', remove_records: [27], celebrate_records: [23], win: [-8, 0], remove: ['Վահան'], celebrate: ['Վահան (Monday)'], status: 'interpretation' },
      { find: 'Եւգին[եէ]ոս', remove_records: [29, 255], celebrate_records: [27], win: [-8, 0], remove: ['Եւգինէոս', 'Մակարիոս', 'Անդրէ զօրավար'], celebrate: ['Եւգինէ կոյս'], status: 'interpretation' },
      { find: 'Ադրիան', remove_records: [256], celebrate_records: [29], win: [-4, 1], remove: ['Ադրիանոս'], celebrate: ['Եւգինէոս'], status: 'interpretation' }
    ] },
  { id: 'L-TT32', table: 'TT-32', m: 1, d: 28, role: 'early', pair: 'ՐՏ', why: 'Kyprian, Athanagines, the Forefathers and Thaddeus are celebrated in the last table Տ after Vardavar',
    quote_key: 'յորժամ տարին նահանջ իցէ, և տարեգիրքն ՐՏ',
    subs: [
      { find: 'Կիպրիան', remove_records: [218], celebrate_records: [27], win: [0, 8], remove: ['Կիպրիանոս'], celebrate: ['Եւգինէ կոյս'], status: 'interpretation' },
      { find: 'Թադէոս', remove_records: [216], celebrate_records: [28], win: [0, 16], remove: ['Թադէոս'], celebrate: ['Գրիգոր Աստուածաբան'], status: 'interpretation' },
      { find: 'Աթանագին', remove_records: [219], celebrate_records: [255], win: [0, 8], remove: ['Աթանագինէ'], celebrate: ['Անդրէ զօրավար'], status: 'interpretation' },
      { find: 'Նախահարց', remove_records: [221], celebrate_records: [256], win: [0, 8], remove: ['Նախահարք'], celebrate: ['Ադրիանոս'], status: 'interpretation' },
      // wave 12: «որք ՚ի վերջ ընդ այլոց տօնից եդան» (same construction as ՂՁ / ՉՈ): Eugenia and the Theologian are brought out of the January companion rows.
      { find: 'Վահան', remove_records: [27], celebrate_records: [23], win: [-8, -3], remove: ['Եւգինէ կոյս (brought to Monday)'], celebrate: ['Վահան (alone)'], status: 'interpretation', note: 'wave 12: Eugenia was placed with others in the Vahan row.' },
      { find: 'Աթանաս', remove_records: [28], celebrate_records: [25], win: [-3, 0], remove: ['Գրիգոր Աստուածաբան (brought to the Thaddeus place)'], celebrate: ['Աթանաս եւ Կիւրեղ (alone)'], status: 'interpretation', note: 'wave 12: the Theologian was placed with others in the patriarchs row.' }
    ] },
];

// Wave 9 derived counsels for ԷԶ and ՀԿ were REMOVED in wave 10: the books print no counsel for those pairs (counsel 3: other pairs as printed).
export const DERIVED_COUNSELS = [];  // wave 10: emptied (ԷԶ, ՀԿ have no counsel in the books; docs/notes/literal_fidelity.md)

const _planCache = new WeakMap();
function leapPlans(ctx) {
  if (_planCache.has(ctx)) return _planCache.get(ctx);
  const plans = { byDate: new Map(), anchors: new Map(), reviews: [] };
  const sel = ctx.sel, core = ctx.core;
  const tAt = (m, d) => core.utc(ctx.year, m, d);
  for (const L of [...LEAP_COUNSELS, ...DERIVED_COUNSELS]) {
    const tbl = ctx.tableAt(tAt(L.m, L.d));
    const letters = yearLetters(ctx);
    const here = tbl && tbl.id === L.table;
    const tableRoleOk = sel.leap && here && ((L.role === 'early' && letters.early && letters.early.id === L.table) || (L.role === 'base' && letters.base && letters.base.id === L.table));
    const binds = !!tableRoleOk && letters.pair === L.pair;
    const row = here ? tbl.rows.find((r) => r.m === L.m && r.d === L.d) : null;
    if (!here) continue;
    const anchorT = tAt(L.m, L.d);
    const entry = { counsel: L, binds, anchorT, anchorRow: row, subs: [] };
    plans.anchors.set(anchorT, [...(plans.anchors.get(anchorT) || []), entry]);
    if (binds) {
      for (const s of L.subs) {
        const rx = new RegExp(s.find, 'u'); const win = s.win || [-10, 10];
        let best = null;
        for (const r of tbl.rows) {
          if (!rx.test(norm(r.text)) && !rx.test(r.text)) continue;
          const rt = tAt(r.m, r.d); const off = Math.round((rt - anchorT) / DAYMS);
          if (off < win[0] || off > win[1]) continue;
          if (!best || Math.abs(off) < Math.abs(best.off)) best = { r, rt, off };
        }
        const sub = { ...s, row_id: best ? best.r.id : null, row_text: best ? best.r.text : null, date_t: best ? best.rt : null };
        if (s.source_find) { const rx2 = new RegExp(s.source_find, 'u'); const src = tbl.rows.find((r) => rx2.test(r.text) && tAt(r.m, r.d) > anchorT); sub.source_row_id = src ? src.id : null; }
        entry.subs.push(sub);
        if (best) { const k = best.rt; plans.byDate.set(k, [...(plans.byDate.get(k) || []), { entry, sub }]); }
      }
    }
  }
  _planCache.set(ctx, plans);
  return plans;
}

// Which table a "see in <letter> Taregir" refers to. In every legible case it is the table immediately before the current one (book order).
export function resolveOtherTable(H2, tableId, letterPrinted, shift = null) {
  const i = tableIndex(H2, tableId);
  const prev = i > 0 ? H2.tables[i - 1] : null;
  if (!prev) return { table: null, basis: 'no previous table', status: 'needs_human_review' };
  const P = letterPrinted ? H2.tables.findIndex((x) => x.letter === letterPrinted) : -1;
  if (P >= 0 && P < i) {
    const dist = i - P;
    if (dist === 1) return { table: H2.tables[P].id, basis: 'printed letter equals the previous table', status: 'rule', distance: 1 };
    if (shift != null && dist === shift) return { table: H2.tables[P].id, basis: `printed letter ${letterPrinted} is ${dist} tables back and the printed date shift is ${shift} (Easter ${dist} day(s) later)`, status: 'rule', distance: dist };
  }
  if (!letterPrinted) return { table: prev.id, basis: 'letter missing in transcription; previous table assumed (every other legible case is the previous table)', status: 'interpretation', distance: 1 };
  return { table: prev.id, basis: `printed letter ${letterPrinted} is not plausible here (probably an OCR confusion of ${prev.letter}); previous table assumed`, status: 'interpretation', distance: 1 };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// 5. annotations
// ---------------------------------------------------------------------------------------------------------------------------------
const RULE_ID = {
  eating_interval: 'R-H2R-INTERVAL', hebdomad_romans: 'R-H2R-HEBDOMAD', see_vol1: 'R-H2R-SEE-VOL1', see_vol1_series: 'R-H2R-SEE-VOL1-SERIES', see_other_table: 'R-H2R-SEE-OTHER-TABLE',
  barekendan_label: 'R-H2R-BAREKENDAN-LABEL', fast_label: 'R-H2R-FAST-LABEL', end_of_year_label: 'R-H2R-END-OF-YEAR', apashkharats_label: 'R-H2R-APASHKHARATS-LABEL',
  reading_assignment: 'R-H2R-READING', hymn_assignment: 'R-H2R-HYMN', hymn_to_end: 'R-H2R-HYMN-TO-END', continue_in_order: 'R-H2R-CONTINUE', leap_year_counsel: 'R-H2R-LEAP',
  coincidence_remark: 'R-H2R-REMARK', table_switch: 'R-H2R-TABLE-SWITCH', keep_here: 'R-H2R-KEEP-HERE', label: 'R-H2R-LABEL', needs_review_text: 'R-H2R-UNRESOLVED', unclassified: 'R-H2R-UNRESOLVED',
};
const BASIS = {
  eating_interval: 'Intervening eating days: the length of the free-eating stretch that begins at this row, ending on the Barekendan Sunday of the next fast (days: counted inclusively from this row, the Barekendan Sunday being the last eating day; weeks: Sunday to Sunday).',
  hebdomad_romans: 'Table heading, the Roman "hebdomad" number; determined by the weekday of Jan 6 (informational).',
  see_vol1: 'The stretch is governed by Hador 1; Hador 2 only gives the placement ("see Vol. I ... keeping the order of this place").',
  see_vol1_series: 'Weeks printed below belong to the Hador 1 series after the Vardavar (or Assumption); take their text from Hador 1.',
  see_other_table: 'For this stretch the printed rows of ANOTHER table (letter) are to be used.',
  barekendan_label: 'The row is the Barekendan (eve of the fast) of the named fast.', fast_label: 'Row label of the fast.', end_of_year_label: 'End of year marker (Jan 1-5 rows).',
  apashkharats_label: 'Label of the Sundays of repentance printed in table Ա.', reading_assignment: 'The reading (book and gospel) is assigned to another feast/day.', hymn_assignment: 'Hymn appointment printed in the rubric (haraj/hambardzis/chashu sharakan).',
  hymn_to_end: 'Sing to the end.', continue_in_order: 'The rest follows in order (no change).', leap_year_counsel: 'Leap-year counsel (see R-H2R-LEAP-SUBSTITUTION).',
  coincidence_remark: 'Unexplained remark.', table_switch: 'Table Ք (leap-only, Jan 1-Feb 29) hands over to table Փ from Mar 1.', keep_here: 'Sunday haraj/tones of this stretch are printed in this table.', label: 'Unexplained fragment.', needs_review_text: 'Unparsed text.', unclassified: 'Unparsed text.',
};

function intervalEffect(ctx, t, row, tbl, e) {
  const core = ctx.core;
  const isJan6 = row.m === 1 && row.d === 6;
  const idx = tableIndex(ctx.H2, tbl.id) + 1;
  const eff = { ...e };
  if (e.unit === 'days' && isJan6) {
    // Book order of the 36 tables: the day-count is 5 + (position of the table). TT-36 (pseudo-Easter Apr 26) = 41. Checked on every table that has a legible numeral.
    eff.n_expected_by_table_order = idx + 5;
    eff.n = e.n_stated === idx + 5 ? e.n_stated : idx + 5;
    if (e.n_stated !== idx + 5) { eff.status = 'interpretation'; eff.numeral_conflict = { printed_words: e.n_words, parsed: e.n_stated, table_order_demands: idx + 5, note: 'transcription numeral disagrees with the progression 6,7,...,41 (see rulebook meta.numeral_issues); the progression is used' }; }
    eff.counts_inclusive = true;
    eff.start_t = t; eff.end_t = t + (eff.n - 1) * DAYMS; eff.end_is = 'Barekendan Sunday of the Arachavorats fast (last eating day)';
  } else if (e.unit === 'weeks' && e.n_stated != null) {
    eff.n = e.n_stated; eff.start_t = t; eff.end_t = t + 7 * e.n_stated * DAYMS; eff.end_is = 'Barekendan Sunday of the next fast (Sunday-to-Sunday weeks)';
  } else { eff.n = e.n_stated; eff.status = e.status; }
  if (eff.end_t != null) { eff.end_iso = core.iso(eff.end_t); const er = ctx.rows(eff.end_t) || []; eff.end_row_texts = er.map((r) => r.text); eff.end_row_has_barekendan = er.some((r) => /Բարեկենդան/u.test(r.text) || /Բարեկենդան/u.test(r.rubric || '')); }
  return eff;
}

export function tableAnnotations(ctx, t) {
  const out = [];
  const core = ctx.core, [y, m, d] = core.ymd(t);
  const rows = ctx.rows(t) || [];
  const tbl = ctx.tableAt(t);
  const pushAnn = (type, row, eff, extra = {}) => out.push({
    rule: extra.rule || RULE_ID[type] || 'R-H2R-MISC', basis: extra.basis || BASIS[type] || '',
    source: { table: tbl.id, row: row ? row.id : null, pages: row ? approxPages(row) : [104], pages_are_estimates: !!row, quote: row ? row.rubric : extra.quote },
    status: eff.status || extra.status || 'rule', effect: { type, ...eff },
  });
  // 5a. rubric parsing of every row on this date
  for (const row of rows) {
    if (!row.rubric) continue;
    let leapDone = false;
    const effects = parseRubric(row.rubric, ctx);
    for (const e of effects) {
      let eff = e;
      if (e.type === 'eating_interval') eff = intervalEffect(ctx, t, row, tbl, e);
      if (e.type === 'see_other_table') { const rs = resolveOtherTable(ctx.H2, tbl.id, e.letter_printed, e.date_shift_days); eff = { ...e, target_table: rs.table, target_basis: rs.basis, target_distance: rs.distance, status: rs.status }; if (e.date_shift_days != null && rs.status === 'rule') eff.date_shift_basis = 'date shift = number of tables back (each table later = Easter one day later)'; }
      if (e.type === 'table_switch') { const rs = resolveOtherTable(ctx.H2, tbl.id, e.target_letter_printed); eff = { ...e, target_table: rs.table, target_basis: rs.basis, status: rs.status }; }
      if (e.type === 'hebdomad_romans') { const w = ctx.tableJan6Weekday ? ctx.tableJan6Weekday(tbl) : null; const wi = tbl.jan6_weekday ? WDN[tbl.jan6_weekday] : null; eff = { ...e, expected_from_jan6_weekday: wi == null ? null : ((wi + 2) % 7) + 1 }; if (eff.expected_from_jan6_weekday != null && eff.expected_from_jan6_weekday !== e.n) { eff.status = 'needs_human_review'; eff.note = (eff.note || '') + ' Printed value disagrees with the weekday pattern (Mon 3, Tue 4, Wed 5, Thu 6, Fri 7, Sat 1, Sun 2) observed on all other tables.'; } }
      if (e.type === 'leap_year_counsel') { if (leapDone) continue; leapDone = true; const plans = leapPlans(ctx); const entries = plans.anchors.get(t) || []; if (!entries.length) { eff = { ...e, status: 'needs_human_review', note: 'no hand-coded counsel for this row' }; } else {
        for (const en of entries) pushAnn('leap_year_counsel', row, { binds: en.binds, counsel_id: en.counsel.id, required_pair: en.counsel.pair, pair_printed: en.counsel.pair_printed || en.counsel.pair, pair_printed_is_ocr: !!en.counsel.pair_printed_is_ocr,
          year_pair: yearLetters(ctx).pair, role_of_this_table: en.counsel.role, reason: en.counsel.why, substitutions: en.subs.map((s) => ({ remove_records: s.remove_records ?? null, celebrate_records: s.celebrate_records ?? null, row_id: s.row_id, date: s.date_t != null ? core.iso(s.date_t) : null, remove: s.remove, celebrate: s.celebrate, status: s.status, note: s.note })),
          status: en.counsel.pair_printed_is_ocr && !en.counsel.pair_page_confirmed ? 'interpretation' : (en.binds ? 'rule' : 'rule'), note: en.binds ? 'BINDS: leap year with exactly this letter pair' : 'does not bind this year (not a leap year with this letter pair); rows stand as printed' }, { rule: 'R-H2R-LEAP-COUNSEL', basis: 'Leap-year counsel binds only in a leap year with the named letter pair (R-H2R-P3-LEAP-COUNSELS).' });
        continue; } }
      pushAnn(e.type, row, eff);
    }
  }
  // 5b. substitutions planned by binding leap-year counsels on their target dates
  const plans = leapPlans(ctx);
  for (const { entry, sub } of plans.byDate.get(t) || []) {
    out.push({ rule: 'R-H2R-LEAP-SUBSTITUTION', basis: 'Binding leap-year counsel: ' + entry.counsel.why + '. On this date the printed commemoration is replaced as the counsel states.',
      source: { table: entry.counsel.table, row: sub.row_id, pages: entry.anchorRow ? approxPages(entry.anchorRow) : [104], pages_are_estimates: true, quote: entry.anchorRow ? entry.anchorRow.rubric : null },
      status: entry.counsel.pair_printed_is_ocr && !entry.counsel.pair_page_confirmed && sub.status === 'rule' ? 'interpretation' : sub.status,
      effect: { type: 'leap_substitution', counsel_id: entry.counsel.id, pair: entry.counsel.pair, remove: sub.remove, celebrate: sub.celebrate, remove_records: sub.remove_records ?? null, celebrate_records: sub.celebrate_records ?? null, unspecified_records: sub.unspecified_records ?? null, celebrate_candidates: sub.celebrate_candidates ?? null, replaced_row_id: sub.row_id, replaced_row_text: sub.row_text, source_row_id: sub.source_row_id || null, note: sub.note || null } });
  }
  // 5d. counsel 4 (day-tones continue unbroken from the previous Bun Barekendan through the new year to Bun Barekendan) - annotation on Jan 6 only
  if (m === 1 && d === 6) {
    const chain = core.modeOfDay(t).armenian, r6 = rows.find((r) => r.tone) || null;
    const prints = tbl.rows.filter((r) => r.tone && !(r.m === 1 && r.d < 6) && (r.m < 3)).length;
    out.push({ rule: 'R-H2R-P4-DAYTONES', basis: PREFACE.find((p) => p.id === 'R-H2R-P4-DAYTONES-AT-START').basis, source: { table: tbl.id, row: r6 ? r6.id : null, pages: [103, 104], quote: 'զկարգ ձայնից ... մինչեւ ՚ի Բուն բարեկենդանի Կիւրակէն' },
      status: 'rule', effect: { type: 'day_tone_continuity', chain_tone_on_jan6: chain, chain_since: core.modeOfDay(t).since, table_prints_jan_feb_tones: prints > 0, printed_tone_jan6: r6 ? r6.tone : null,
        printed_agrees: r6 ? r6.tone === chain : null, decision: 'the unbroken chain governs every day; a printed Jan-Feb tone of the 13 tables that print them only agrees when the year before had the Easter the print assumed (docs/notes/h2_opening.md section 4)' } });
  }
  // 5e. counsel 5: Sunday evening hymn range (first Sunday after Jan 6 .. Middle Sunday = Easter-56) and the Middle Sunday marker (never an observance)
  if (core.weekday(t) === 6) {
    const jan6 = core.utc(y, 1, 6), mid = ctx.easter - 56 * DAYMS, w6 = core.weekday(jan6), firstSun = jan6 + (((6 - w6 + 7) % 7) || 7) * DAYMS;
    if (t >= firstSun && t <= mid) out.push({ rule: 'R-H2R-P5-SUNDAY-VESPER-HYMN', basis: PREFACE.find((p) => p.id === 'R-H2R-P5-SUNDAY-VESPER-HYMN').basis,
      source: { table: tbl.id, row: null, pages: [104], quote: 'Յետ Ծննդեան յառաջին կիւրակէէն մինչեւ ՚ի Բարեկենդանի միջին կիւրակէն ... մինչեւ ցվերջն զՏէր յերկնիցն ասել պարտես' }, status: 'interpretation',
      effect: { type: 'sunday_vespers_hymn_rule', hymn_verbatim: 'զՏէր յերկնիցն', service: 'evening Resurrection hambardzum (Յարութեան համբարձման)', sing: 'to the end, whatever the tone', range_first_sunday: core.iso(firstSun), range_last_sunday: core.iso(mid), is_last_of_range: t === mid,
        note: '"first Sunday after the Nativity" read as the first Sunday strictly after Jan 6 (if Jan 6 is a Sunday: the next); "middle Sunday of Barekendan" = the Sunday printed "Միջին" = Easter-56 (H2-DLG-04)' } });
    if (t === mid) out.push({ rule: 'R-H2R-P5-MIDDLE-SUNDAY', basis: 'The row/word "Միջին" (Middle Sunday) printed on the Sunday Easter-56 only marks the end of the counsel-5 hymn range; it is not an observance and must never be displayed as a commemoration or label.',
      source: { table: tbl.id, row: (rows.find((r) => /^Միջին/u.test(r.text)) || {}).id || null, pages: [104], quote: 'մինչեւ ՚ի Բարեկենդանի միջին կիւրակէն' }, status: 'rule', effect: { type: 'middle_sunday_marker', display: false, row_text_printed: (rows.find((r) => /^Միջին/u.test(r.text)) || {}).text || null } });
  }
  // 5c. table selection notes (informational)
  const L = yearLetters(ctx);
  if (L.leap && ((m === 1 && d === 6) || (m === 3 && d === 1))) out.push({ rule: 'R-H2R-TABLE-SELECTION', basis: PREFACE.find((p) => p.id === 'R-H2R-TABLE-SELECTION').basis,
    source: { table: tbl.id, row: null, pages: [104, 188, 189], quote: 'Ք տարեգիրն միայն ՚ի նահանջ տարին լինի, եւ մինչեւ ՚ի վերջ փետրուարի ՚ի գործ ածի' }, status: 'rule',
    effect: { type: 'table_selection', leap: true, year_pair: L.pair, early_table: L.early.id, base_table: L.base.id, table_in_force: tbl.id, switches_on: 'Mar 1' } });
  return out;
}

// All distinct rubric strings of the rulebook, for tests/audits.
export function allRubrics(H2) { const s = new Map(); for (const t of H2.tables) for (const r of t.rows) if (r.rubric) { if (!s.has(r.rubric)) s.set(r.rubric, []); s.get(r.rubric).push({ table: t.id, row: r.id, m: r.m, d: r.d }); } return s; }
