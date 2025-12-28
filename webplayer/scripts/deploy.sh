#!/bin/sh

DIR=`dirname "$0"`
DIR=`cd "$DIR"; pwd`

cd "$DIR"
if ! ./compile.sh; then
  exit 1
fi

cd "$DIR/.."
#perl -pi -e 's?/wm-player/??g' build/index.html
rsync -Pav --delete build/ wallmuse.com:/data/www/wallmuse-wp/wp-content/themes/neve-child-master/wm-player/
