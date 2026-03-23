#!/usr/bin/env python3
"""Generate lightweight metadata JSON from the GeoPackage dataset."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "global_pv_facility_inventory.gpkg"
OUT_PATH = ROOT / "metadata.json"


def q1(conn: sqlite3.Connection, query: str):
    row = conn.execute(query).fetchone()
    return row[0] if row else None


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Dataset not found: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    total_facilities = q1(conn, "SELECT COUNT(*) FROM global_pv_facility_inventory")
    min_year = q1(conn, "SELECT MIN(year) FROM global_pv_facility_inventory")
    max_year = q1(conn, "SELECT MAX(year) FROM global_pv_facility_inventory")
    countries_count = q1(
        conn,
        "SELECT COUNT(DISTINCT country) FROM global_pv_facility_inventory",
    )

    area_row = conn.execute(
        """
        SELECT
          SUM(area_m2) AS total_area_m2,
          AVG(area_m2) AS avg_area_m2,
          MIN(area_m2) AS min_area_m2,
          MAX(area_m2) AS max_area_m2
        FROM global_pv_facility_inventory
        """
    ).fetchone()

    bbox_row = conn.execute(
        """
        SELECT
          MIN(minx) AS minx,
          MIN(miny) AS miny,
          MAX(maxx) AS maxx,
          MAX(maxy) AS maxy
        FROM rtree_global_pv_facility_inventory_geom
        """
    ).fetchone()

    year_counts = [
        {"year": int(row[0]), "count": int(row[1])}
        for row in conn.execute(
            """
            SELECT year, COUNT(*)
            FROM global_pv_facility_inventory
            WHERE year IS NOT NULL
            GROUP BY year
            ORDER BY year
            """
        )
    ]

    country_counts = [
        {"country": row[0], "count": int(row[1])}
        for row in conn.execute(
            """
            SELECT country, COUNT(*)
            FROM global_pv_facility_inventory
            WHERE country IS NOT NULL AND country != ''
            GROUP BY country
            ORDER BY COUNT(*) DESC, country ASC
            """
        )
    ]

    metadata = {
        "dataset": "global_pv_facility_inventory",
        "feature_count": int(total_facilities or 0),
        "countries_count": int(countries_count or 0),
        "year_range": {
            "min": int(min_year) if min_year is not None else None,
            "max": int(max_year) if max_year is not None else None,
        },
        "area_m2": {
            "total": float(area_row[0] or 0),
            "average": float(area_row[1] or 0),
            "minimum": float(area_row[2] or 0),
            "maximum": float(area_row[3] or 0),
        },
        "bbox_wgs84": {
            "minx": float(bbox_row[0]),
            "miny": float(bbox_row[1]),
            "maxx": float(bbox_row[2]),
            "maxy": float(bbox_row[3]),
        },
        "year_counts": year_counts,
        "country_counts": country_counts,
        "top_countries": country_counts[:20],
    }

    OUT_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
