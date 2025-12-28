#!/bin/bash

# Script to automatically increment service worker versions across all sites
# Usage: ./scripts/increment-sw-version.sh

# SSH Configuration
SSH_USER="akhan"
SSH_HOST="wallmuse.com"
SSH_CONNECTION="${SSH_USER}@${SSH_HOST}"

# Service worker paths on remote server
SW_WALLMUSE="/data/www/wallmuse-wp/service-worker.js"
SW_OOO2="/data/www/ooo2/service-worker.js"
SW_SHAREX="/data/www/sharex/service-worker.js"

# Function to increment version in a file on remote server
increment_version() {
    local file=$1
    local site_name=$2

    echo "📝 Checking $site_name..."

    # Check if file exists on server
    if ! ssh "$SSH_CONNECTION" "[ -f '$file' ]"; then
        echo "❌ Error: File not found on server: $file"
        return 1
    fi

    # Extract current version number from remote file
    current_version=$(ssh "$SSH_CONNECTION" "grep 'const CACHE_NAME' '$file' | grep -o 'v4\.[0-9]*' | cut -d'.' -f2")

    if [ -z "$current_version" ]; then
        echo "❌ Error: Could not find version in $file"
        return 1
    fi

    # Increment version
    new_version=$((current_version + 1))

    echo "   v4.$current_version → v4.$new_version"

    # Execute on remote server: create backup and update version
    ssh "$SSH_CONNECTION" bash <<EOF
        # Create backup
        cp "$file" "$file.backup"

        # Replace both CACHE_NAME and STATIC_CACHE version numbers
        sed -i "s/${site_name}-pwa-v4\.${current_version}/${site_name}-pwa-v4.${new_version}/" "$file"
        sed -i "s/static-v4\.${current_version}/static-v4.${new_version}/" "$file"
EOF

    echo "✅ Updated $site_name (backup: $file.backup)"
}

echo "🚀 Incrementing service worker versions..."
echo ""

# Increment each service worker
increment_version "$SW_WALLMUSE" "wallmuse"
increment_version "$SW_OOO2" "ooo2"
increment_version "$SW_SHAREX" "sharex"

echo ""
echo "✨ Done! All service worker versions incremented."
echo "💡 Backups saved with .backup extension"
