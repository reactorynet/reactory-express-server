#!/bin/bash

# Find the node process listening on port 4000 (take only the first one if multiple exist)
NODE_PID=$(lsof -t -i :4000 | head -n 1)

SHELL_PID=""
RESTART_CMD=""

if [ ! -z "$NODE_PID" ]; then
  # Walk up the parent process chain to find the startup script
  PID=$NODE_PID
  while [ "$PID" -ne 1 ] && [ ! -z "$PID" ]; do
    CMD_LINE=$(ps -o args= -p $PID 2>/dev/null)
    if echo "$CMD_LINE" | grep -qE "bin/start.sh|bin/start-otel.sh|bin/run.sh|bin/run-otel.sh|start.sh|start-otel.sh|run.sh|run-otel.sh"; then
      SHELL_PID=$PID
      # Strip leading "sh " or "bash " or "/bin/sh " or "/bin/bash "
      RESTART_CMD=$(echo "$CMD_LINE" | sed -E 's|^sh ||; s|^bash ||; s|^/bin/sh ||; s|^/bin/bash ||')
      break
    fi
    PID=$(ps -o ppid= -p $PID 2>/dev/null | head -n 1 | awk '{print $1}')
  done
fi

# Fallback: if we didn't find it via PPID chain, check the process list
if [ -z "$RESTART_CMD" ]; then
  # Find any start.sh, start-otel.sh, run.sh, run-otel.sh processes
  MATCHING_PROC=$(ps aux | grep -E "bin/start.sh|bin/start-otel.sh|bin/run.sh|bin/run-otel.sh" | grep -v grep | grep -v "restart-server.sh" | head -n 1)
  if [ ! -z "$MATCHING_PROC" ]; then
    SHELL_PID=$(echo "$MATCHING_PROC" | awk '{print $2}')
    CMD_LINE=$(ps -o args= -p $SHELL_PID 2>/dev/null)
    RESTART_CMD=$(echo "$CMD_LINE" | sed -E 's|^sh ||; s|^bash ||; s|^/bin/sh ||; s|^/bin/bash ||')
  fi
fi

# Default fallback if nothing is found
if [ -z "$RESTART_CMD" ]; then
  RESTART_CMD="bin/start.sh --no-nodemon"
fi

# Schedule the restart in the background
(
  echo "[$(date)] Initiating graceful restart in 3 seconds..." >> /tmp/restart-server.log
  sleep 3
  
  # Kill the startup script process if found
  if [ ! -z "$SHELL_PID" ]; then
    echo "[$(date)] Killing startup shell process $SHELL_PID..." >> /tmp/restart-server.log
    kill -15 "$SHELL_PID" 2>/dev/null
    sleep 1
    kill -9 "$SHELL_PID" 2>/dev/null
  fi
  
  # Find and kill the node process on port 4000
  CURR_NODE_PID=$(lsof -t -i :4000)
  if [ ! -z "$CURR_NODE_PID" ]; then
    echo "[$(date)] Killing node process(es) on port 4000..." >> /tmp/restart-server.log
    for p in $CURR_NODE_PID; do
      echo "[$(date)] Killing node process $p..." >> /tmp/restart-server.log
      kill -15 "$p" 2>/dev/null
      sleep 0.5
      kill -9 "$p" 2>/dev/null
    done
  fi
  
  # Wait for port 4000 to clear
  echo "[$(date)] Waiting for port 4000 to clear..." >> /tmp/restart-server.log
  while lsof -i :4000 >/dev/null 2>&1; do
    sleep 0.5
  done
  
  # Wait an extra second for safety
  sleep 1
  
  # Start the server back up
  echo "[$(date)] Starting server back up with: sh $RESTART_CMD" >> /tmp/restart-server.log
  
  # Ensure we run from the correct directory
  cd /Users/wweber/Source/reactory/reactory-express-server
  
  # Run the command with sh
  nohup sh $RESTART_CMD >> /tmp/restart-server.log 2>&1 &
  echo "[$(date)] Restart command executed in background." >> /tmp/restart-server.log
) >/dev/null 2>&1 &

echo "true"
exit 0
