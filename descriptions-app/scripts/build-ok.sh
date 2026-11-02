#!/bin/sh

echo "Script started at: $(date)"

DIR=$(dirname "$0")
DIR=$(cd "$DIR"; pwd)
cd "$DIR/.."

# Run the build process
if ! npm run build; then
  echo "Build failed at: $(date)"
  exit 1
fi

TIMESTAMP=$(date +%s)

# Fetch remote PHP file
REMOTE_PHP="/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm_descriptions_static.php"
TMP_PHP="/tmp/wm_descriptions_static.php"
echo "Fetching remote PHP file..."
rsync -Paq akhan@wallmuse.com:$REMOTE_PHP $TMP_PHP || { echo "Failed to fetch PHP file"; exit 1; }

# Extract JS and CSS filenames from index.html
echo "Extracting filenames from index.html..."
JS=$(grep -o 'js/[^\"]*' build/index.html | head -n 1)
CSS=$(grep -o 'css/[^\"]*' build/index.html | head -n 1)

# Debugging log
if [ -z "$JS" ] || [ -z "$CSS" ]; then
  echo "Failed to extract JS or CSS filenames."
  exit 1
fi

echo "Extracted JS: $JS"
echo "Extracted CSS: $CSS"

# Modify PHP file with new JS/CSS filenames and timestamp
echo "Updating PHP file..."
perl -pi -e "s#css/main[^\"]+#$CSS?v=$TIMESTAMP#" $TMP_PHP || { echo "Failed to update CSS in PHP file"; exit 1; }
perl -pi -e "s#js/main[^\"]+#$JS?v=$TIMESTAMP#" $TMP_PHP || { echo "Failed to update JS in PHP file"; exit 1; }

# Optional: Preview updated PHP file
echo "Preview of updated PHP file:"
head -n 10 $TMP_PHP

# Upload modified PHP file back to the server
echo "Uploading updated PHP file..."
rsync -Pav $TMP_PHP akhan@wallmuse.com:$REMOTE_PHP || { echo "Failed to upload updated PHP file"; exit 1; }

# Upload static assets
echo "Uploading static assets..."
rsync -Pav --delete build/static/ akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/descriptions-assests/ || { echo "Failed to upload static assets"; exit 1; }

echo "Script ended successfully at: $(date)"