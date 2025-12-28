#!/bin/sh
echo "Script started at: $(date)"

DIR=$(dirname "$0")
DIR=$(cd "$DIR"; pwd)
cd "$DIR/.."

if ! npm run build; then
    echo "Build failed at: $(date)"
    exit 1
fi

TIMESTAMP=$(date +%s)

# Remove cached PHP file first to ensure fresh fetch
rm -f /tmp/wm_v4B_player_static.php

# Fetch remote PHP file
rsync -Paq akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm_v4B_player_static.php /tmp/

# Extract JS and CSS filenames from index.html
JS=$(sed 's/.*static.js.//' build/index.html | sed 's/">.*//')
CSS=$(sed 's/.*static.css.//' build/index.html | sed 's/" .*//')

# Modify PHP file with new JS/CSS filenames and timestamp
perl -pi -e "s#css/main[^\"]+#css/$CSS?v=$TIMESTAMP#" /tmp/wm_v4B_player_static.php
perl -pi -e "s#js/main[^\"]+#js/$JS?v=$TIMESTAMP#" /tmp/wm_v4B_player_static.php

# Remove existing chunk script tags first
perl -pi -e "s#<script src=\"/wp-content/themes/neve-child-master/play-v4B-assets/js/[^/]+\.chunk\.js[^>]*></script>\s*##g" /tmp/wm_v4B_player_static.php

# Extract all chunk filenames and create script tags
CHUNK_SCRIPTS=""
echo "Searching for chunks in: build/static/js/"

for chunk_file in build/static/js/*.chunk.js; do
    if [ -f "$chunk_file" ]; then
        chunk_name=$(basename "$chunk_file")
        echo "Found chunk: $chunk_name"
        CHUNK_SCRIPTS="$CHUNK_SCRIPTS<script src=\"/wp-content/themes/neve-child-master/play-v4B-assets/js/$chunk_name?v=$TIMESTAMP\" async></script>\n"
    fi
done

# Debugging log
echo "JS Filename: $JS"
echo "CSS Filename: $CSS" 
echo "Chunk scripts: $CHUNK_SCRIPTS"

# Insert chunk script tags BEFORE the main script tag
if [ -n "$CHUNK_SCRIPTS" ]; then
    echo "Adding chunk scripts to PHP file..."
    perl -pi -e "s#(<script src=\"/wp-content/themes/neve-child-master/play-v4B-assets/js/main[^\"]+\")#$CHUNK_SCRIPTS\$1#" /tmp/wm_v4B_player_static.php
    echo "Chunk scripts added successfully"
else
    echo "No chunk scripts to add"
fi

# View first few lines of the modified PHP file for debugging
echo "=== Modified PHP file preview ==="
head -n 20 /tmp/wm_v4B_player_static.php

# Upload modified PHP file back to the server
rsync -Pav /tmp/wm_v4B_player_static.php akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/

# Upload static assets - IMPORTANT: This includes all chunks
rsync -Pav --delete build/static/ akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/play-v4B-assets/

echo "All files uploaded"
echo "Script ended at: $(date)"