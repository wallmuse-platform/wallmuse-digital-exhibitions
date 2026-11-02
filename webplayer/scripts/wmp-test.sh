#!/bin/bash

echo "Starting wm-playerB deployment..."

# Build the React app
cd /Users/akhan/www/wallmusev4/wallmuseB/wm-playerB
npm run build

# Extract JS and CSS filenames from the build
JS=$(grep -o 'static/js/main\.[^"]*\.js' build/index.html | head -1 | sed 's/static\/js\///')
CSS=$(grep -o 'static/css/main\.[^"]*\.css' build/index.html | head -1 | sed 's/static\/css\///')

echo "Found JS: $JS"
echo "Found CSS: $CSS"

if [ -z "$JS" ] || [ -z "$CSS" ]; then
    echo "Error: Could not extract JS/CSS filenames from build"
    exit 1
fi

# Copy and fix the index.html with proper paths and wm-player class
cp build/index.html /tmp/wm-playerB-index.html

# Add the wm-player class to body tag
perl -pi -e 's#<body>#<body class="wm-player">#' /tmp/wm-playerB-index.html

# Fix all asset paths to use full WordPress paths
perl -pi -e 's#href="/wm-playerB/#href="/wp-content/themes/neve-child-master/wm-playerB/#g' /tmp/wm-playerB-index.html
perl -pi -e 's#src="/wm-playerB/#src="/wp-content/themes/neve-child-master/wm-playerB/#g' /tmp/wm-playerB-index.html

# Show preview of the fixed index.html
echo "=== Fixed index.html preview ==="
head -n 15 /tmp/wm-playerB-index.html

# Upload everything to the wm-playerB folder on server
echo "Uploading files to wm-playerB folder..."

# Upload the fixed index.html
rsync -Pav /tmp/wm-playerB-index.html akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-playerB/index.html

# Clean old JS files first (delete all main.*.js files except the current one)
echo "Cleaning old JS files..."
ssh akhan@wallmuse.com "cd /data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-playerB/static/js/ && find . -name 'main.*.js' -not -name '$JS' -delete && find . -name 'main.*.js.map' -not -name '$JS.map' -delete && find . -name 'main.*.js.LICENSE.txt' -not -name '$JS.LICENSE.txt' -delete"

# Clean old CSS files 
echo "Cleaning old CSS files..."
ssh akhan@wallmuse.com "cd /data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-playerB/static/css/ && find . -name 'main.*.css' -not -name '$CSS' -delete && find . -name 'main.*.css.map' -not -name '$CSS.map' -delete"

# Upload all JS files (main + map + license)
echo "Uploading JS files..."
rsync -Pav build/static/js/$JS* akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-playerB/static/js/

# Upload all CSS files (main + map)
echo "Uploading CSS files..."
rsync -Pav build/static/css/$CSS* akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-playerB/static/css/

# Upload other static assets (favicon, manifest, etc.)
rsync -Pav build/favicon.ico akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-playerB/
rsync -Pav build/manifest.json akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-playerB/
rsync -Pav build/logo192.png akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-playerB/

echo "Deployment complete!"
echo "All wm-playerB files uploaded with correct paths and wm-player class"