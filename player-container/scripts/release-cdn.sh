#!/bin/sh
# Builds with absolute CDN URL so chunks load from wallmuse.com on any external site.
set -e
PUBLIC_URL=https://wallmuse.com/cdn/wm_player npm run build
TIMESTAMP=$(date +%s)
JS=$(sed 's/.*static.js.//' build/index.html | sed 's/">.*//')
CSS=$(sed 's/.*static.css.//' build/index.html | sed 's/" .*//')
rsync -Pav build/static/ akhan@wallmuse.com:/data/www/cdn/wm_player/static/
echo "{\"css\":\"$CSS\",\"js\":\"$JS\",\"v\":$TIMESTAMP}" > /tmp/manifest.json
rsync -Pav /tmp/manifest.json akhan@wallmuse.com:/data/www/cdn/wm_player/
echo "Done — v=$TIMESTAMP  js=$JS  css=$CSS"
