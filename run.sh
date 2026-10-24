#!/bin/sh
# Serve the site locally:  ./run.sh [port]   (default 4190)  then open http://localhost:4190/
cd "$(dirname "$0")" && exec python3 -m http.server "${1:-4190}"
