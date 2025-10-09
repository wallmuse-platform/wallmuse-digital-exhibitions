# WordPress Integration Guide

## Overview

This React application integrates into WordPress as a custom page template, allowing seamless embedding of the Wallmuse Player into WordPress sites. The setup supports both **test** and **production** environments with automated deployment scripts.

## Architecture

### Component Structure

```
WordPress Site
├── Theme: Neve Child (neve-child-master)
│   ├── Page Template: wm_v4_player_static.php (production)
│   ├── Page Template: wm_v4B_player_static.php (test)
│   ├── Assets Directory: play-v4-assets/ (production)
│   └── Assets Directory: play-v4B-assets/ (test)
└── React App Build Output
    ├── index.html (processed for asset paths)
    ├── static/css/main.*.css
    └── static/js/*.js (main + chunks)
```

## WordPress Integration

### Theme Compatibility

**Primary Theme:** Neve Child Theme (neve-child-master)

**Other Themes:** This integration should work with any WordPress theme by:
1. Creating a custom page template in your theme directory
2. Adjusting asset paths to match your theme structure
3. Following the same CSS/JS loading pattern shown below

### Page Template Structure

The page template (`wm_v4_player_static.php` or `wm_v4B_player_static.php`) consists of:

#### 1. CSS Reset Styles
```php
<style>
    .MuiGrid2-container p {
        margin-bottom: 0
    }
    .MuiGrid2-container form input:read-write,
    .MuiGrid2-container input:read-write:focus:focus {
        border-style: initial;
        border-color: initial;
        border-width: initial;
        border-radius: initial;
        outline: initial;
        box-shadow: initial;
        --formfieldbordercolor: initial;
    }
    .MuiGrid2-container textarea,
    .MuiGrid2-container textarea:focus {
        outline: initial;
        box-shadow: initial;
        --formfieldbordercolor: initial;
    }
    #root {
        background-color: #FFFFFF;
    }
</style>
```

**Purpose:** Resets Material-UI styles to prevent conflicts with WordPress theme styles.

#### 2. Main CSS File
```php
<link rel='stylesheet'
      href="/wp-content/themes/neve-child-master/play-v4-assets/css/main.4abc86f6.css?v=1759362604"
      type='text/css'
      media='all' />
```

#### 3. JavaScript Chunks (Async)
```php
<script src="/wp-content/themes/neve-child-master/play-v4-assets/js/453.df44467b.chunk.js?v=1759362604" async></script>
<script src="/wp-content/themes/neve-child-master/play-v4-assets/js/753.affc04f0.chunk.js?v=1759362604" async></script>
```

**Note:** Chunk files load asynchronously for better performance.

#### 4. Main JavaScript File
```php
<script src="/wp-content/themes/neve-child-master/play-v4-assets/js/main.e25facfc.js?v=1759362604"></script>
```

**Note:** Main file loads synchronously after chunks.

#### 5. Cache Busting
All files include `?v=TIMESTAMP` query parameter for cache busting on deployments.

## Test vs Production Environments

### Directory Structure

| Environment | Assets Directory | PHP Template | Build Script |
|------------|-----------------|--------------|--------------|
| **Test** | `play-v4B-assets/` | `wm_v4B_player_static.php` | `test-ok.sh` |
| **Production** | `play-v4-assets/` | `wm_v4_player_static.php` | `build-ok.sh` |

### Key Differences

**Test Environment:**
- Uses `play-v4B-assets` directory
- Separate from production for safe testing
- Deployed via `test-ok.sh` script
- Does NOT increment service worker versions

**Production Environment:**
- Uses `play-v4-assets` directory
- Live environment for end users
- Deployed via `build-ok.sh` script
- Automatically increments service worker versions across all sites

## Deployment Scripts

### Test Deployment: `test-ok.sh`

```bash
#!/bin/sh
# Build React app
npm run build

# Extract asset filenames from build/index.html
JS=$(sed 's/.*static.js.//' build/index.html | sed 's/\">.*//')
CSS=$(sed 's/.*static.css.//' build/index.html | sed 's/\" .*//')

# Extract chunk filenames
for chunk_file in build/static/js/*.chunk.js; do
    chunk_name=$(basename "$chunk_file")
    CHUNK_SCRIPTS="$CHUNK_SCRIPTS<script src=\"/wp-content/themes/neve-child-master/play-v4B-assets/js/$chunk_name?v=$TIMESTAMP\" async></script>\n"
done

# Update PHP template with new asset paths
rsync -Paq akhan@wallmuse.com:/data/www/wallmuse-wp/.../wm_v4B_player_static.php /tmp/
perl -pi -e "s#css/main[^\"]+#css/$CSS?v=$TIMESTAMP#" /tmp/wm_v4B_player_static.php
perl -pi -e "s#js/main[^\"]+#js/$JS?v=$TIMESTAMP#" /tmp/wm_v4B_player_static.php

# Upload updated PHP and assets
rsync -Pav /tmp/wm_v4B_player_static.php akhan@wallmuse.com:/data/www/...
rsync -Pav --delete build/static/ akhan@wallmuse.com:/data/www/.../play-v4B-assets/
```

### Production Deployment: `build-ok.sh`

Same as test deployment, but:
1. Uses `play-v4-assets` instead of `play-v4B-assets`
2. Uses `wm_v4_player_static.php` instead of `wm_v4B_player_static.php`
3. **Calls `increment-sw-version.sh` at the end**

```bash
# ... (same deployment steps as test)

# Increment service worker versions across all sites
echo "🔄 Incrementing service worker versions..."
"$DIR/increment-sw-version.sh"
```

### Service Worker Version Script: `increment-sw-version.sh`

```bash
#!/bin/bash
# Increments service worker cache versions on remote server
# Sites: wallmuse, ooo2, sharex

SSH_USER="akhan"
SSH_HOST="wallmuse.com"

SW_WALLMUSE="/data/www/wallmuse-wp/service-worker.js"
SW_OOO2="/data/www/ooo2/service-worker.js"
SW_SHAREX="/data/www/sharex/service-worker.js"

increment_version() {
    local file=$1
    local site_name=$2

    # Extract current version (e.g., v4.112)
    current_version=$(ssh "$SSH_CONNECTION" "grep 'const CACHE_NAME' '$file' | grep -o 'v4\.[0-9]*' | cut -d'.' -f2")

    # Increment version
    new_version=$((current_version + 1))

    # Update on remote server
    ssh "$SSH_CONNECTION" bash <<EOF
        cp "$file" "$file.backup"
        sed -i "s/${site_name}-pwa-v4\.${current_version}/${site_name}-pwa-v4.${new_version}/" "$file"
        sed -i "s/static-v4\.${current_version}/static-v4.${new_version}/" "$file"
EOF
}

# Increment all sites
increment_version "$SW_WALLMUSE" "wallmuse"
increment_version "$SW_OOO2" "ooo2"
increment_version "$SW_SHAREX" "sharex"
```

## Service Worker Integration

### Purpose
Service workers cache app assets for offline functionality and faster loading. Version incrementing forces cache refresh on deployments.

### Cache Names
```javascript
const CACHE_NAME = 'wallmuse-pwa-v4.112';
const STATIC_CACHE = 'static-v4.112';
```

### Sites with Service Workers
1. **wallmuse.com** - Main site
2. **ooo2.wallmuse.com** - Secondary site
3. **sharex.wallmuse.com** - Third site

### Automatic Version Bumping
Production deployments automatically increment service worker versions (e.g., v4.112 → v4.113) to clear old cached assets.

## Setup Instructions

### For Neve Child Theme (Current Setup)

1. **Add Page Template to Theme:**
   ```
   wp-content/themes/neve-child-master/wm_v4_player_static.php
   wp-content/themes/neve-child-master/wm_v4B_player_static.php (test)
   ```

2. **Create Assets Directories:**
   ```
   wp-content/themes/neve-child-master/play-v4-assets/
   wp-content/themes/neve-child-master/play-v4B-assets/ (test)
   ```

3. **Configure Deployment Scripts:**
   - Update SSH credentials in `build-ok.sh` and `test-ok.sh`
   - Update remote paths to match your server structure

4. **Create WordPress Page:**
   - Create new page in WordPress admin
   - Assign custom page template (from dropdown)
   - Publish page

### For Other WordPress Themes

1. **Copy Page Template:**
   - Copy `wm_v4_player_static.php` to your theme directory
   - Add theme-specific template header if needed

2. **Adjust Asset Paths:**
   ```php
   // Change from:
   /wp-content/themes/neve-child-master/play-v4-assets/

   // To:
   /wp-content/themes/YOUR-THEME/play-v4-assets/
   ```

3. **Update Deployment Scripts:**
   - Modify `build-ok.sh` and `test-ok.sh` to use your theme paths

4. **Follow same setup steps as above**

## Asset Management

### Build Output Processing

React's `npm run build` generates:
```
build/
├── index.html (contains asset filenames with hashes)
├── static/
│   ├── css/
│   │   └── main.4abc86f6.css
│   └── js/
│       ├── main.e25facfc.js
│       ├── 453.df44467b.chunk.js
│       └── 753.affc04f0.chunk.js
```

### Filename Extraction

Scripts extract hashed filenames from `build/index.html`:
```bash
JS=$(sed 's/.*static.js.//' build/index.html | sed 's/\">.*//')
CSS=$(sed 's/.*static.css.//' build/index.html | sed 's/\" .*//')
```

### PHP Template Update

Perl updates PHP template with new hashed filenames:
```bash
perl -pi -e "s#css/main[^\"]+#css/$CSS?v=$TIMESTAMP#" /tmp/wm_v4_player_static.php
perl -pi -e "s#js/main[^\"]+#js/$JS?v=$TIMESTAMP#" /tmp/wm_v4_player_static.php
```

## Troubleshooting

### Assets Not Loading

**Problem:** CSS/JS files return 404 errors

**Solutions:**
1. Verify asset directory exists on server
2. Check file permissions (755 for directories, 644 for files)
3. Verify paths in PHP template match actual server paths
4. Check `.htaccess` for rewrite rules blocking static files

### Styles Conflicting with Theme

**Problem:** WordPress theme styles override React app styles

**Solutions:**
1. Increase CSS specificity in React components
2. Add more reset styles to page template `<style>` block
3. Use `!important` sparingly for critical styles
4. Consider CSS Modules or CSS-in-JS for better isolation

### Service Worker Not Updating

**Problem:** Users see old cached version after deployment

**Solutions:**
1. Verify service worker version was incremented
2. Check service worker file on server (`service-worker.js`)
3. Clear browser cache and service worker manually
4. Check browser console for service worker errors

### Build Script Fails

**Problem:** Deployment script exits with error

**Solutions:**
1. Check SSH connection: `ssh akhan@wallmuse.com`
2. Verify remote paths exist
3. Check file permissions on server
4. Review script output for specific error messages
5. Test rsync commands manually

## Best Practices

1. **Always test in test environment first** before deploying to production
2. **Use version control** for PHP templates and deployment scripts
3. **Back up production** before major updates
4. **Monitor browser console** after deployments for errors
5. **Document custom modifications** to deployment process
6. **Keep deployment scripts in sync** between test and production

## File Locations Reference

### Local Development
```
/Users/alexandrekhan/react/play C 3/play/     (test)
/Users/alexandrekhan/react/play C/play/       (production)
```

### Scripts
```
scripts/build-ok.sh                  (production deployment)
scripts/test-ok.sh                   (test deployment)
scripts/increment-sw-version.sh      (service worker versioning)
```

### Remote Server
```
/data/www/wallmuse-wp/wp-content/themes/neve-child-master/
├── wm_v4_player_static.php          (production template)
├── wm_v4B_player_static.php         (test template)
├── play-v4-assets/                  (production assets)
└── play-v4B-assets/                 (test assets)

/data/www/wallmuse-wp/service-worker.js
/data/www/ooo2/service-worker.js
/data/www/sharex/service-worker.js
```

## Console Log Keywords

For debugging deployment and integration issues:

**Build Script:**
- `Script started at` - Build start timestamp
- `Build failed at` - Build error timestamp
- `JS Filename:` - Main JS file extracted
- `CSS Filename:` - Main CSS file extracted
- `Found chunk:` - Chunk file discovered
- `Chunk scripts:` - All chunks to inject
- `Adding chunk scripts to PHP file` - Chunk injection
- `All files uploaded` - Upload complete

**Service Worker Script:**
- `📝 Checking [site]` - Site verification start
- `v4.[old] → v4.[new]` - Version increment
- `✅ Updated [site]` - Update successful
- `❌ Error: File not found` - Missing file error

## Additional Resources

- **React Build Documentation:** See `README.md`
- **Account Creation Flow:** See `TROUBLESHOOTING_ACCOUNT_CREATION.md`
- **Navigation System:** See `NAVIGATION_SYSTEM_REFACTOR.md`
- **Component Documentation:** See `GUEST_ACTION_POPUP_DOCS.md`
