#!/bin/bash
set -e

# Start Redis if not already running
redis-server --daemonize yes --logfile /tmp/redis.log 2>/dev/null || true
sleep 1

# Map Replit's PostgreSQL env vars to PixMap's MySQL env vars
export MYSQL_HOST="${PGHOST:-localhost}"
export MYSQL_DATABASE="${PGDATABASE:-pixelplanet}"
export MYSQL_USER="${PGUSER:-pixelplanet}"
export MYSQL_PW="${PGPASSWORD:-password}"
export PORT="${PORT:-3000}"
export HOST="0.0.0.0"
export REDIS_URL="redis://localhost:6379"
export SESSION_SECRET="${SESSION_SECRET:-pixelglobesecret}"

# Run from dist/ directory (server.js uses relative paths like ./workers/lua/)
cd /home/runner/workspace/pixmap-original/dist

exec node --expose-gc ./server.js
