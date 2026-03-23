# PV Dashboard

High-quality map interface scaffold for the `global_pv_facility_inventory` dataset.

Session handoff/status: [PROJECT_HANDOFF.md](/Users/rs/Projects/pv_dashboard/PROJECT_HANDOFF.md)

## What is included

- Responsive map dashboard (`index.html`, `styles.css`, `app.js`)
- Real metadata extracted from your GeoPackage (`metadata.json`)
- Config file for links and tile endpoint (`config.js`)
- Metadata generator script (`scripts/generate_metadata.py`)
- Presentation-style interactions:
  - Year window mode
  - Compare two years mode
  - Country drilldown from dropdown and top-country list
  - Story views (global, East Asia, North America, Europe)
  - Download visible filtered features as GeoJSON

## Quick start

1. Generate metadata (already generated once):

```bash
python3 scripts/generate_metadata.py
```

2. Serve the site:

```bash
python3 -m http.server 8080
```

3. Start local vector tiles (Docker required):

```bash
./scripts/start_martin.sh
```

`start_martin.sh` will automatically:

- build `data/global_pv_facility_inventory.mbtiles` from the GeoPackage if needed,
- use Docker if a Docker engine is running, or
- fallback to a native Martin binary in this project (no Docker required).

4. Open:

```text
http://localhost:8080
```

Stop tiles later with:

```bash
./scripts/stop_martin.sh
```

### If you want to use Compose later

Your current Docker install is missing the Compose plugin. After installing it, you can use:

```bash
docker compose up -d
```

### Troubleshooting: Docker daemon not running

If you see:

```text
Cannot connect to the Docker daemon ...
```

run:

```bash
open -a Docker
docker context use default
docker info
```

Then retry:

```bash
./scripts/start_martin.sh
```

### Troubleshooting: `open -a Docker` says app not found

You currently have Docker CLI but no Docker engine app/runtime installed.
Use this CLI-only path:

```bash
brew install colima
colima start
docker context use colima
docker info
./scripts/start_martin.sh
```

If you prefer, you can skip Docker/Colima entirely and just run:

```bash
./scripts/start_martin.sh
```

It will download and run native Martin automatically.

## Tile server requirement

The frontend is designed for vector tiles (for performance with 140k+ polygons).

Update `config.js` with your endpoint and source layer:

```js
vectorTilesUrl: "http://localhost:3000/global_pv_facility_inventory/{z}/{x}/{y}",
sourceLayer: "global_pv_facility_inventory",
```

## Recommended architecture

For your case (global public scientific dataset, 140k+ polygons), the recommended production path is:

1. Frontend: static hosting (`Cloudflare Pages`, `Netlify`, or `GitHub Pages`).
2. Tiles: `PMTiles` (single-file vector tile archive) served from object storage/CDN.
3. Fallback local dev: `Martin` directly on the GeoPackage.

Why:

- PMTiles gives lower ops overhead and strong global CDN performance.
- Static frontend + static tile file is cheaper and simpler than always-on tile API servers.
- Martin is still excellent for local iteration and QA.

## Suggested hosting

- Best default: `Cloudflare Pages` (frontend) + `Cloudflare R2` (PMTiles object) + CDN.
- Alternative: GitHub Pages (frontend) + any object storage/CDN for PMTiles.

## Update publication links

Set these in `config.js`:

- `paperUrl`
- `zenodoUrl`
- `githubUrl`

## Options needed from you for final production build

1. Nature paper URL (you said you will add later).
2. Final brand direction details and any logo assets.
3. Exact GitHub URL for this dataset/project.
4. Access model: public open site or auth-protected internal dashboard.

## Notes

- This scaffold is intentionally clean and publication-grade, but still configurable.
- The map will show a status warning until vector tiles are reachable.
