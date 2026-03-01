#!/bin/sh
set -e

PUID=${PUID:-1001}
PGID=${PGID:-1001}

# Create group and user with the requested IDs if they don't exist
addgroup -g "$PGID" appgroup 2>/dev/null || true
adduser -D -u "$PUID" -G appgroup appuser 2>/dev/null || true

# Ensure the uploads directory exists and is owned by the app user
mkdir -p /app/public/uploads
chown -R "$PUID:$PGID" /app/public/uploads

# Run prisma db push then start the server as the app user
exec su-exec "$PUID:$PGID" sh -c \
  'node node_modules/prisma/build/index.js db push && node server.js'
