# Engine vs 2001-2040 lectionary tables

Fast, names and reading sets: out-of-sample. Service class: in-sample (learned from the same tables).

| field | all days 2001-2040 | feed window 2026-10-23..2027-12-31 |
|---|---|---|
| fast | 14379/14610 (98.4%) | 430/435 (98.9%) |
| name_hy | 14350/14447 (99.3%) | 427/429 (99.5%) |
| name_en | 11080/11597 (95.5%) | 324/338 (95.9%) |
| readings_exact | 10032/14458 (69.4%) | 300/431 (69.6%) |
| readings_eng_superset | 10229/14458 (70.7%) | 305/431 (70.8%) |
| readings_final_superset | 10471/14458 (72.4%) | 311/431 (72.2%) |
| readings_any_overlap | 14390/14458 (99.5%) | 430/431 (99.8%) |
| service | 53287/54999 (96.9%) | 1538/1580 (97.3%) |

Disagreement kinds (all days):
- fast: {"not_fast->fast":199,"fast->no-fast":21,"feast->fast":8,"unknown->fast":3}
- name_hy: {"x":97}
- name_en: {"x":517}
- readings_exact: {"both_differ":3730,"engine_extra":197,"engine_missing":431,"disjoint":68}
- readings_eng_superset: {"x":4229}
- readings_final_superset: {"x":3987}
- readings_any_overlap: {"x":68}
- service: {"jashoo->other":319,"other->jashoo":1393}
