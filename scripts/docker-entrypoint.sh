#!/bin/sh
# Container entrypoint: hosting platforms often mount the photo volume owned by
# root, so make the uploads directory writable for the app user, then drop
# root before running the app.
set -e

if [ "$(id -u)" = "0" ]; then
  if [ "$STORAGE_DRIVER" = "local" ] && [ -n "$LOCAL_UPLOADS_DIR" ]; then
    mkdir -p "$LOCAL_UPLOADS_DIR"
    if [ "$(stat -c %U "$LOCAL_UPLOADS_DIR")" != "node" ]; then
      chown -R node:node "$LOCAL_UPLOADS_DIR"
    fi
  fi
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
