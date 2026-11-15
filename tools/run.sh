#!/bin/sh
# Runs a JavaScript module with node when it is installed, or with the
# JavaScript shell that ships with macOS when it is not.
#   tools/run.sh tests/engine.test.js
if command -v node >/dev/null 2>&1; then
  exec node "$@"
fi
exec /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m "$@"
