#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$PROJECT_ROOT/.martin.pid"

stopped_any=0

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if docker ps -a --format '{{.Names}}' | grep -qx 'pv-dashboard-martin'; then
    docker rm -f pv-dashboard-martin >/dev/null
    echo "Stopped Docker Martin container."
    stopped_any=1
  fi
fi

if [ -f "$PID_FILE" ]; then
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    echo "Stopped native Martin process (PID $pid)."
    stopped_any=1
  fi
  rm -f "$PID_FILE"
fi

if [ "$stopped_any" -eq 0 ]; then
  echo "No running Martin instance found."
fi
