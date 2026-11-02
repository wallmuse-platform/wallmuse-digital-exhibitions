#!/bin/bash
# sync-to-github.sh
# Syncs production/dev source trees into the GitHub repo, blanks Sentry DSNs,
# runs npm audit, then commits if anything changed.
# Run from anywhere. Push manually after reviewing the commit.

set -euo pipefail

GITHUB="/Users/alexandrekhan/react/wallmuse-github"

# ── Source directories ──────────────────────────────────────────────────────

DESC_SRC="/Users/alexandrekhan/react/descriptions2/descriptions/src"
CM_SRC="/Users/alexandrekhan/react/createmontagedev/CreateMontage/src"
PC_SRC="/Users/alexandrekhan/react/play C/play/src"
WP_SRC="/Users/alexandrekhan/react/webplayer2/src"

# ── Helpers ─────────────────────────────────────────────────────────────────

step() { echo; echo "▶ $*"; }
ok()   { echo "  ✓ $*"; }

blank_dsn() {
  local f="$1"
  if [ -f "$f" ]; then
    # Replace any live Sentry DSN with an empty string
    sed -i '' 's|dsn: "https://[^"]*"|dsn: ""|g' "$f"
    ok "DSN blanked: ${f#$GITHUB/}"
  fi
}

# ── 1. Sync descriptions-app/src ────────────────────────────────────────────

step "descriptions-app/src"
rsync -a --checksum \
  --exclude="App copy.js" \
  --exclude="api_backup*.js" \
  --exclude="jest.mock" \
  --exclude="coverage" \
  --exclude=".DS_Store" \
  "$DESC_SRC/" "$GITHUB/descriptions-app/src/"
ok "synced"
blank_dsn "$GITHUB/descriptions-app/src/index.js"

# ── 2. Sync create-montage/src ──────────────────────────────────────────────

step "create-montage/src"
rsync -a --checksum \
  --exclude=".DS_Store" \
  "$CM_SRC/" "$GITHUB/create-montage/src/"
ok "synced"
blank_dsn "$GITHUB/create-montage/src/index.js"

# ── 3. Sync player-container/src ────────────────────────────────────────────

step "player-container/src"
rsync -a --checksum \
  --exclude=".DS_Store" \
  --exclude="*backup*" \
  --exclude="*copy*" \
  "$PC_SRC/" "$GITHUB/player-container/src/"
ok "synced"
blank_dsn "$GITHUB/player-container/src/index.js"

# ── 4. Sync webplayer/src ───────────────────────────────────────────────────

step "webplayer/src"
rsync -a --checksum \
  --exclude=".DS_Store" \
  --exclude="*.production-backup" \
  --exclude="*.backup" \
  --exclude=".env" \
  --exclude=".env.*" \
  "$WP_SRC/" "$GITHUB/webplayer/src/"
ok "synced"
blank_dsn "$GITHUB/webplayer/src/index.tsx"

# ── 5. npm audit ────────────────────────────────────────────────────────────

step "npm audit"
cd "$GITHUB"
npm audit --audit-level=high || true   # print but don't abort on moderate

# ── 6. Commit if changed ────────────────────────────────────────────────────

step "git status"
cd "$GITHUB"

git add \
  descriptions-app/src \
  create-montage/src \
  player-container/src \
  webplayer/src

if git diff --cached --quiet; then
  echo "  Nothing changed — working tree is already in sync."
else
  git --no-pager diff --cached --stat
  echo
  DATESTAMP=$(date '+%Y-%m-%d')
  git commit -m "Sync source from production ($DATESTAMP)"
  echo
  echo "  Committed. Run: git push origin main"
fi
