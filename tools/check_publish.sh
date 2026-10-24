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
if [ $bad -ne 0 ]; then echo "secrets scan FAILED"; exit 1; fi
echo "secrets scan ok"
