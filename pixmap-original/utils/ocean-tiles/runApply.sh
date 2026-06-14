#!/bin/bash
# Runs applyOcean fully detached from any terminal/shell session
export PATH="/home/runner/.nix-profile/bin:$PATH"
cd /home/runner/workspace/pixmap-original

# Ensure Redis is running
if ! redis-cli ping 2>/dev/null | grep -q PONG; then
  redis-server --daemonize yes 2>&1
  sleep 3
fi

# Run in fully detached sub-shell (double fork)
(
  setsid node --expose-gc --max-old-space-size=3500 \
    utils/ocean-tiles/applyOcean.cjs /tmp/ocean/ocean \
    > /tmp/ocean_apply.log 2>&1
  echo "Exit: $?" >> /tmp/ocean_apply.log
) &
disown $!
echo "Started PID: $!"
