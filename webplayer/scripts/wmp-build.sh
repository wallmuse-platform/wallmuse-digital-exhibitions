#!/bin/bash (changed permissions of folder not tested as erases past)

echo "Starting wm-player deployment..."

# Build the React app
cd /Users/akhan/www/wallmusev4/wallmuseB/wm-player
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
cp build/index.html /tmp/wm-player-index.html

# Add the wm-player class to body tag
perl -pi -e 's#<body>#<body class="wm-player">#' /tmp/wm-player-index.html

# Fix all asset paths to use full WordPress paths
perl -pi -e 's#href="/wm-player/#href="/wp-content/themes/neve-child-master/wm-player/#g' /tmp/wm-player-index.html
perl -pi -e 's#src="/wm-player/#src="/wp-content/themes/neve-child-master/wm-player/#g' /tmp/wm-player-index.html

# Show preview of the fixed index.html
echo "=== Fixed index.html preview ==="
head -n 15 /tmp/wm-player-index.html

# Upload everything to the wm-player folder on server
echo "Uploading files to wm-player folder..."

# Upload the fixed index.html
rsync -Pav /tmp/wm-player-index.html akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/index.html

# Clean old JS files first (delete all main.*.js files except the current one)
echo "Cleaning old JS files..."
ssh akhan@wallmuse.com "cd /data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/static/js/ && ls main.*.js 2>/dev/null | grep -v '$JS' | xargs rm -f"

# Clean old CSS files 
echo "Cleaning old CSS files..."
ssh akhan@wallmuse.com "cd /data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/static/css/ && ls main.*.css 2>/dev/null | grep -v '$CSS' | xargs rm -f"

# Upload all JS files (main + map + license)
echo "Uploading JS files..."
rsync -Pav build/static/js/$JS* akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/static/js/

# Upload all CSS files (main + map)
echo "Uploading CSS files..."
rsync -Pav build/static/css/$CSS* akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/static/css/

# Upload other static assets (favicon, manifest, etc.)
rsync -Pav build/favicon.ico akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/
rsync -Pav build/manifest.json akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/
rsync -Pav build/logo192.png akhan@wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/

echo "Deployment complete!"
echo "All wm-player files uploaded with correct paths and wm-player class"