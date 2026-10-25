#!/bin/sh
# Fail (exit 1) if anything that looks like a credential or private file is about to be published.
cd "$(dirname "$0")/.." || exit 2
bad=0
# 1. forbidden file names
for f in $(git ls-files); do
  case "$f" in
    .env|*/.env|*.pem|*.key|*credential*|*secret*|*token*|*recovery*|*.p12|id_rsa*|*password*) echo "FORBIDDEN FILE: $f"; bad=1;;
  esac
done
# 2. credential-looking content in tracked text files (skip big data/page assets)
git ls-files -z -- '*.js' '*.mjs' '*.py' '*.sh' '*.md' '*.html' '*.css' '*.json' ':!data/*' ':!vendor/*' ':!tools/check_publish.sh' ':!engine/calgen/rulebook/*' 2>/dev/null | xargs -0 grep -nE '(sk-[A-Za-z0-9]{20,}|xi-api-key|ELEVENLABS[A-Z_]*=|GEMINI[A-Z_]*=|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer [A-Za-z0-9._-]{30,})' 2>/dev/null && bad=1
# 3. the same patterns inside data shards (cheap check)
git ls-files -z -- 'data/*.json' 'data/*/*.json' 'data/*/*/*.json' | xargs -0 grep -lE '(sk-[A-Za-z0-9]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' 2>/dev/null && bad=1
# 4. files over 90 MB (GitHub limit is 100 MB)
git ls-files -z | xargs -0 ls -l 2>/dev/null | awk '$5 > 90*1024*1024 {print "TOO BIG: " $9; b=1} END {exit b}' || bad=1
# 5. no stored canonical-book English scripture (served live from ACHR instead); only Apocrypha shards may carry "en"
python3 - <<'PY' || bad=1
import glob, json, os, sys
keep = {"azariah", "baruch", "judith", "ii-maccabees", "i-maccabees", "iii-maccabees", "wisdom", "sirach", "tobit"}
badn = 0
for f in glob.glob("data/scripture/shards/*.json"):
    if os.path.basename(f)[:-5] in keep: continue
    for k, r in json.load(open(f, encoding="utf-8"))["citations"].items():
        if "en" in r: print("CANONICAL ENGLISH STORED:", f, k); badn += 1
sys.exit(1 if badn else 0)
PY
# 6. no iCloud conflict copies ("name 2.json", "name 3.mp3") may ship: they are stale duplicates of a sibling
dups=$(git ls-files | grep -E ' [0-9]+(\.[A-Za-z0-9]+)?$' | while IFS= read -r f; do base=$(printf '%s' "$f" | sed -E 's/ [0-9]+(\.[A-Za-z0-9]+)?$/\1/'); [ -e "$base" ] && echo "$f"; done)
if [ -n "$dups" ]; then echo "ICLOUD DUPLICATE FILES (move them out of the site tree):"; echo "$dups"; bad=1; fi
if [ $bad -ne 0 ]; then echo "secrets scan FAILED"; exit 1; fi
echo "secrets scan ok"
