# Scripture cache (generated; do not edit by hand)

Built by `pipeline/s81_scripture_cache.py` in the digitization project. Sharded by book (`shards/<book>.json`), `index.json` maps a canonical
citation key (`Book|c1:v1-c2:v2`, Vemkar book naming) to its shard and id (`SC-<sha1[:10]>`), `coverage.json` reports what is missing,
`nonbiblical.json` holds the five non-biblical lections with the label "English translation: AI generated", `attribution.json` has the RSVCE notice.

English: RSVCE (BibleGateway), the same source and request form as the achrct.com site. Armenian: Jashots chain text with scan pages.
Rebuild as the polite fetch cache grows: `python3 pipeline/s81_scripture_cache.py` (add `--no-english` to leave out the copyrighted English text).
