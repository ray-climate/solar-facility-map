#!/usr/bin/env python3
"""Generate a full point GeoJSON from the GeoPackage attributes (lon/lat)."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "global_pv_facility_inventory.gpkg"
OUT_PATH = ROOT / "data" / "global_pv_sites_points.geojson"


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Missing dataset: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        """
        SELECT PV_ID, country, year, area_m2, latitude, longitude
        FROM global_pv_facility_inventory
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND latitude BETWEEN -90 AND 90
          AND longitude BETWEEN -180 AND 180
        """
    )

    count = 0
    with OUT_PATH.open("w", encoding="utf-8") as f:
        f.write('{"type":"FeatureCollection","features":[\n')

        first = True
        for row in cursor:
            pv_id, country, year, area_m2, lat, lon = row
            feature = {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
                "properties": {
                    "PV_ID": pv_id,
                    "country": country,
                    "year": year,
                    "area_m2": area_m2,
                    "latitude": lat,
                    "longitude": lon,
                },
            }

            if not first:
                f.write(",\n")
            first = False
            f.write(json.dumps(feature, separators=(",", ":"), ensure_ascii=False))
            count += 1

        f.write("\n]}")

    conn.close()
    print(f"Wrote {OUT_PATH} with {count} points")


if __name__ == "__main__":
    main()
