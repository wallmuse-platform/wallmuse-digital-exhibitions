#!/bin/sh

DIR=`dirname "$0"`
DIR=`cd "$DIR"; pwd`
cd "$DIR/.."

if ! npm run build; then
  exit 1
fi
perl -pi -e 's?/wm-player/??g' build/index.html
perl -pi -e 's?/wm-player/??g' build/static/js/*.js
rsync -Pav --delete build/ ../WallMuseDaemonCrypt/src/player/
