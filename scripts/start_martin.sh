#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GPKG_DATASET="$PROJECT_ROOT/data/global_pv_facility_inventory.gpkg"
MBTILES_DATASET="$PROJECT_ROOT/data/global_pv_facility_inventory.mbtiles"
DATASET="$MBTILES_DATASET"
MARTIN_DIR="$PROJECT_ROOT/.tools/martin"
MARTIN_BIN="$MARTIN_DIR/martin"
MARTIN_TARGET_FILE="$MARTIN_DIR/.target"
PID_FILE="$PROJECT_ROOT/.martin.pid"
LOG_FILE="$PROJECT_ROOT/.martin.log"
PORT="3000"
HOST="127.0.0.1"

ensure_tileset() {
  if [ -f "$MBTILES_DATASET" ]; then
    DATASET="$MBTILES_DATASET"
    return 0
  fi

  if [ ! -f "$GPKG_DATASET" ]; then
    echo "Dataset not found. Expected one of:"
    echo "  - $MBTILES_DATASET"
    echo "  - $GPKG_DATASET"
    exit 1
  fi

  if ! command -v ogr2ogr >/dev/null 2>&1; then
    echo "MBTiles not found and ogr2ogr is not available to build it."
    echo "Install GDAL first, then rerun this script."
    exit 1
  fi

  echo "Building MBTiles from GeoPackage (one-time step)..."
  rm -f "$MBTILES_DATASET"
  ogr2ogr -progress \
    -f MBTILES "$MBTILES_DATASET" "$GPKG_DATASET" global_pv_facility_inventory \
    -dsco MINZOOM=0 -dsco MAXZOOM=12 -lco NAME=global_pv_facility_inventory
  DATASET="$MBTILES_DATASET"
}

cleanup_stale_pid() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

start_with_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    return 1
  fi

  if ! docker info >/dev/null 2>&1; then
    return 1
  fi

  if docker ps -a --format '{{.Names}}' | grep -qx 'pv-dashboard-martin'; then
    docker rm -f pv-dashboard-martin >/dev/null
  fi

  echo "Starting Martin with Docker on http://localhost:$PORT ..."
  docker run -d \
    --name pv-dashboard-martin \
    -p "$PORT:3000" \
    -v "$PROJECT_ROOT/data:/data:ro" \
    ghcr.io/maplibre/martin:latest \
    --listen-addresses 0.0.0.0:3000 \
    /data/global_pv_facility_inventory.mbtiles >/dev/null

  echo "Martin started (Docker)."
  echo "Tile URL: http://localhost:$PORT/global_pv_facility_inventory/{z}/{x}/{y}"
  return 0
}

candidate_targets_for_host() {
  case "$(uname -m)" in
    arm64|aarch64)
      # Try native arm64 first, then x86_64 fallback (Rosetta) for environments
      # that have x86 Homebrew libs only.
      echo "aarch64-apple-darwin"
      echo "x86_64-apple-darwin"
      ;;
    x86_64)
      echo "x86_64-apple-darwin"
      ;;
    *)
      echo "Unsupported macOS architecture: $(uname -m)" >&2
      exit 1
      ;;
  esac
}

resolve_release_asset_url() {
  local target="$1"
  local api_url="https://api.github.com/repos/maplibre/martin/releases/latest"
  curl -fsSL "$api_url" | grep -Eo "https://[^\"]*martin-${target}\.tar\.gz" | head -n 1
}

download_target_binary() {
  local target="$1"
  local asset_url tmp_tgz

  asset_url="$(resolve_release_asset_url "$target")"
  if [ -z "$asset_url" ]; then
    echo "Failed to locate martin release asset for target: $target"
    return 1
  fi

  mkdir -p "$MARTIN_DIR"
  tmp_tgz="$(mktemp /tmp/martin.XXXXXX.tar.gz)"
  curl -fL "$asset_url" -o "$tmp_tgz"

  rm -f "$MARTIN_BIN"
  tar -xzf "$tmp_tgz" -C "$MARTIN_DIR"
  rm -f "$tmp_tgz"
  chmod +x "$MARTIN_BIN"
  echo "$target" > "$MARTIN_TARGET_FILE"

  return 0
}

binary_runs() {
  if [ ! -x "$MARTIN_BIN" ]; then
    return 1
  fi
  "$MARTIN_BIN" --version >/dev/null 2>&1
}

ensure_native_binary() {
  if binary_runs; then
    return 0
  fi

  local target
  while IFS= read -r target; do
    [ -z "$target" ] && continue
    echo "Downloading Martin target: $target"
    if ! download_target_binary "$target"; then
      continue
    fi
    if binary_runs; then
      return 0
    fi
  done < <(candidate_targets_for_host)

  echo "Unable to get a runnable native Martin binary."
  echo "Last log (if present):"
  [ -f "$LOG_FILE" ] && tail -n 20 "$LOG_FILE" || true
  return 1
}

start_native() {
  if cleanup_stale_pid; then
    echo "Martin already running (native) with PID $(cat "$PID_FILE")."
    echo "Tile URL: http://localhost:$PORT/global_pv_facility_inventory/{z}/{x}/{y}"
    return 0
  fi

  if ! ensure_native_binary; then
    exit 1
  fi

  echo "Starting Martin (native) on http://localhost:$PORT ..."
  nohup "$MARTIN_BIN" --listen-addresses "$HOST:$PORT" "$DATASET" >"$LOG_FILE" 2>&1 &
  echo "$!" > "$PID_FILE"

  sleep 1
  local pid
  pid="$(cat "$PID_FILE")"
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "Martin failed to start. See log: $LOG_FILE"
    [ -f "$LOG_FILE" ] && sed -n '1,80p' "$LOG_FILE"
    exit 1
  fi

  echo "Martin started (native), PID $pid."
  if [ -f "$MARTIN_TARGET_FILE" ]; then
    echo "Native target: $(cat "$MARTIN_TARGET_FILE")"
  fi
  echo "Tile URL: http://localhost:$PORT/global_pv_facility_inventory/{z}/{x}/{y}"
}

ensure_tileset

if start_with_docker; then
  exit 0
fi

echo "Docker engine unavailable; using native Martin fallback."
start_native
