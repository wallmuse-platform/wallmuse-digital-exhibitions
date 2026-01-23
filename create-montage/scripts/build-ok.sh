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

# Fetch remote PHP file
rsync -Paq akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/create-montage.php /tmp/

# Extract JS and CSS filenames from index.html
JS=$(sed 's/.*static.js.//' build/index.html | sed 's/">.*//')
CSS=$(sed 's/.*static.css.//' build/index.html | sed 's/" .*//')

# Debugging log (optional)
echo "JS Filename: $JS"
echo "CSS Filename: $CSS"

# Modify PHP file with new JS/CSS filenames and timestamp
perl -pi -e "s#css/main[^\"]+#css/$CSS?v=$TIMESTAMP#" /tmp/create-montage.php
perl -pi -e "s#js/main[^\"]+#js/$JS?v=$TIMESTAMP#" /tmp/create-montage.php

# Optional: View first few lines of the modified PHP file for debugging
head -n 10 /tmp/create-montage.php

# Upload modified PHP file back to the server
rsync -Pav /tmp/create-montage.php akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/

# Upload static assets
rsync -Pav --delete build/static/ akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/create-montage-v2-assets/

echo "Script ended at: $(date)"