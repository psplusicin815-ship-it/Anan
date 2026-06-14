#!/bin/bash
set -e

export PATH="/home/runner/.nix-profile/bin:$PATH"

# Prevent two instances from running at once
LOCK=/tmp/pixmap.lock
if [ -f "$LOCK" ] && kill -0 "$(cat $LOCK)" 2>/dev/null; then
  echo "PixMap already running (PID $(cat $LOCK)), exiting."
  exit 0
fi
echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT

# Start Redis if not already running
DUMP_DIR="/home/runner/workspace/pixmap-original/dist"
mkdir -p "$DUMP_DIR"
if ! redis-cli ping 2>/dev/null | grep -q "PONG"; then
  echo "Starting Redis..."
  redis-server --daemonize yes --dir "$DUMP_DIR" --dbfilename dump.rdb 2>&1
fi

# Wait for Redis to be fully ready (loading:0)
echo "Waiting for Redis to be ready..."
for i in $(seq 1 120); do
  if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    loading=$(redis-cli info persistence 2>/dev/null | grep "^loading:" | tr -d '\r\n ')
    if [ "$loading" = "loading:0" ]; then
      echo "Redis ready after ${i}s"
      break
    else
      echo "Redis loading... (${i}s)"
    fi
  fi
  sleep 1
done

# PostgreSQL env mapping
export MYSQL_HOST="${PGHOST:-localhost}"
export MYSQL_DATABASE="${PGDATABASE:-pixelplanet}"
export MYSQL_USER="${PGUSER:-pixelplanet}"
export MYSQL_PW="${PGPASSWORD:-password}"
export PORT="${PORT:-3000}"
export HOST="0.0.0.0"
export REDIS_URL="redis://localhost:6379"
export SESSION_SECRET="${SESSION_SECRET:-pixelglobesecret}"
export CAPTCHA_TIME=-1
export USE_MAILER=0

cd /home/runner/workspace/pixmap-original/dist
exec node --expose-gc ./server.js
