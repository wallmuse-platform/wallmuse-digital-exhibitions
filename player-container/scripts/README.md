# Deployment Scripts

These scripts automate the build and deployment process for the WallMuse Player Container.

## Setup

1. **Copy example files:**
   ```bash
   cp build-ok.sh.example build-ok.sh
   cp increment-sw-version.sh.example increment-sw-version.sh
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x build-ok.sh
   chmod +x increment-sw-version.sh
   ```

3. **Configure your server details:**
   Edit the scripts and update the configuration section with your:
   - SSH username and hostname
   - Remote file paths
   - Asset URL paths
   - Service worker file locations

## Scripts

### build-ok.sh (Production Deployment)

Builds the React app and deploys to production server.

**What it does:**
1. Runs `npm run build`
2. Extracts hashed asset filenames from build output
3. Downloads production PHP template from server
4. Updates PHP template with new asset paths
5. Uploads modified PHP template back to server
6. Uploads all build assets (CSS, JS, chunks)
7. Calls `increment-sw-version.sh` to bump service worker versions

**Usage:**
```bash
./scripts/build-ok.sh
```

### increment-sw-version.sh (Service Worker Versioning)

Increments service worker cache versions on remote server(s).

**What it does:**
1. Connects to server via SSH
2. Reads current version from service-worker.js
3. Increments version number (e.g., v4.112 → v4.113)
4. Creates backup of old file
5. Updates version in service worker file

**Usage:**
```bash
./scripts/increment-sw-version.sh
```

**Note:** This script is usually called automatically by `build-ok.sh`

## Configuration Variables

### SSH Configuration
```bash
SSH_USER="your-username"
SSH_HOST="your-server.com"
```

### Remote Paths
```bash
# Path to your WordPress theme PHP template
REMOTE_PHP_PATH="/path/to/wordpress/themes/your-theme/wm_v4_player_static.php"

# Path to your assets directory on server
REMOTE_ASSETS_PATH="/path/to/wordpress/themes/your-theme/play-v4-assets/"
```

### Asset URL Path
```bash
# URL path used in PHP template (relative to site root)
ASSET_URL_PATH="/wp-content/themes/your-theme/play-v4-assets"
```

### Service Worker Paths
```bash
# Paths to service-worker.js files for each site
SW_SITE1="/path/to/site1/service-worker.js"
SW_SITE2="/path/to/site2/service-worker.js"

# Site names used in cache names
SITE1_NAME="mysite"
SITE2_NAME="othersite"
```

## Prerequisites

- **rsync** - For file synchronization
- **perl** - For text replacement in PHP files
- **SSH access** - Passwordless SSH (SSH keys) recommended
- **sed** - For extracting asset filenames

## Troubleshooting

### SSH Connection Issues
```bash
# Test SSH connection
ssh your-username@your-server.com

# If prompted for password, set up SSH keys:
ssh-keygen -t rsa
ssh-copy-id your-username@your-server.com
```

### Permission Denied
```bash
# Make sure scripts are executable
chmod +x scripts/*.sh

# Check remote directory permissions
ssh your-username@your-server.com "ls -la /path/to/assets"
```

### rsync Errors
```bash
# Test rsync manually
rsync -Pav build/static/ your-username@your-server.com:/remote/path/

# Check rsync is installed
which rsync
```

### Service Worker Not Updating
- Verify file paths in increment-sw-version.sh
- Check SSH connection and permissions
- Manually inspect service-worker.js on server
- Look for .backup files to confirm script ran

## Test vs Production

Create separate scripts for test and production environments:

**Test Environment:**
- `test-ok.sh` - Deploys to test assets directory (`play-v4B-assets`)
- Skip service worker incrementing
- Use test PHP template (`wm_v4B_player_static.php`)

**Production Environment:**
- `build-ok.sh` - Deploys to production assets directory (`play-v4-assets`)
- Increment service worker versions
- Use production PHP template (`wm_v4_player_static.php`)

## Security Notes

⚠️ **Never commit files with credentials to version control!**

- Keep `build-ok.sh` and `increment-sw-version.sh` in `.gitignore`
- Only commit `.example` files
- Use SSH keys instead of passwords
- Restrict SSH user permissions on server

## Automation

For CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Build and Deploy
  run: |
    npm install
    npm run build
    ./scripts/build-ok.sh
  env:
    SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
```

Store credentials in CI/CD secrets, not in scripts.
