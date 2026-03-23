# Project Handoff (March 4, 2026)

This document captures the current state of the PV dashboard project so development can resume quickly.

## 1) Goal and scope

Build a high-standard presentation-style website to visualize a global solar PV polygon dataset (~140k polygons) on an interactive map with filtering and storytelling interactions.

## 2) Data discovered

Primary dataset in `./data`:

- `global_pv_facility_inventory.gpkg` (~778 MB)
- `global_pv_facility_inventory.parquet` (~310 MB)

Core table and schema (from GeoPackage):

- table: `global_pv_facility_inventory`
- geometry: `MULTIPOLYGON` (EPSG:4326)
- attributes: `PV_ID`, `latitude`, `longitude`, `country`, `year`, `area_m2`
- row count: `140,945`
- countries: `181`
- year range: `2017-2024`

Generated metadata is in `metadata.json`.

## 3) Frontend implemented

Files:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `metadata.json`

Implemented UI/UX:

- Presentation-style map layout (desktop + mobile)
- Summary cards from real metadata
- Year filter and area filter
- Country filter + top-country quick drilldown
- Basemap switch (light/satellite)
- Compare mode (two-year comparison)
- Story views (Global, East Asia, North America, Europe)
- Feature inspector panel (click polygon)
- Download visible features as GeoJSON

Link config status:

- Zenodo set to: `https://zenodo.org/records/18794231`
- Paper URL placeholder still pending
- GitHub URL placeholder still pending

## 4) Tile pipeline implemented

### Why this changed

Martin v1.3.1 does **not** consume `.gpkg` directly as a tile source in this setup. It works reliably with MBTiles/PMTiles/PostGIS.

### Current working local pipeline

1. Convert GeoPackage -> MBTiles (already generated):
   - output: `data/global_pv_facility_inventory.mbtiles` (~159 MB)
2. Serve MBTiles with Martin
3. Frontend consumes:
   - `http://localhost:3000/global_pv_facility_inventory/{z}/{x}/{y}`

## 5) Scripts created/updated

- `scripts/generate_metadata.py`
  - generates `metadata.json` from GeoPackage
- `scripts/start_martin.sh`
  - ensures MBTiles exists (builds it if missing)
  - tries Docker if daemon is running
  - otherwise runs native Martin fallback from `.tools/martin`
- `scripts/stop_martin.sh`
  - stops Docker/native Martin process

Supporting:

- `docker-compose.yml` updated for MBTiles source

## 6) Current known-good startup commands

From project root:

```bash
./scripts/start_martin.sh
python3 -m http.server 8080
```

Open:

- Website: `http://127.0.0.1:8080`
- TileJSON test: `http://127.0.0.1:3000/global_pv_facility_inventory`
- Catalog test: `http://127.0.0.1:3000/catalog`

## 7) Environment issues encountered and resolved

1. Docker Compose plugin missing
- `docker compose` not available.
- Mitigated by native Martin fallback in `start_martin.sh`.

2. Docker daemon not running / Docker Desktop absent
- Mitigated by running native Martin fallback.

3. Apple Silicon vs x86 toolchain mismatch
- Existing Homebrew stack is under `/usr/local` and x86-oriented.
- Native arm64 Martin binary expected `/opt/homebrew` libs and failed.
- Script now falls back to x86_64 Martin binary when needed.

4. GDAL/Homebrew broken link state
- Fixed through tap reset + relinking/reinstalling.
- MBTiles conversion succeeded afterward.

## 8) Files added during this phase

- `PROJECT_HANDOFF.md` (this file)
- `scripts/start_martin.sh` (enhanced)
- `scripts/stop_martin.sh`
- `scripts/generate_metadata.py`
- `docker-compose.yml`
- `metadata.json`
- `data/global_pv_facility_inventory.mbtiles` (generated)

## 9) Remaining work (next session)

1. Replace placeholders in `config.js`:
- `paperUrl`
- `githubUrl`

2. Decide production architecture finalization:
- recommended: static frontend + PMTiles on CDN/object storage

3. Production packaging tasks (not yet implemented):
- MBTiles -> PMTiles conversion step
- deploy scripts for hosting target
- domain/SEO/analytics settings (if needed)

4. Optional UX enhancements:
- side-by-side split compare map
- per-country summary chart panel
- citation/download panel for publication assets

## 10) Quick resume checklist

When resuming work:

1. `cd /Users/rs/Projects/pv_dashboard`
2. `./scripts/start_martin.sh`
3. `python3 -m http.server 8080`
4. Open `http://127.0.0.1:8080`
5. If map loads but no polygons, check `http://127.0.0.1:3000/catalog`

