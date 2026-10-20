"""Step 16: tree canopy. How much of every Explore geography, every map pixel and every city lot is under trees.

Reads the 2020 canopy shapes (data/raw/canopy/, PASDA: Tree Pittsburgh and the University of Vermont), the Census
shapes of the six Explore levels, a finished shadow run (nopush/shadow/out/, for its grid and its days) and the tables
of step 15 (nopush/shadow/parcels/), and writes (src/visionpitts/canopy.py)

  data/processed/canopy_<level>.csv        canopy acres, land acres and canopy share of every unit in the county
  app/src/data/online/canopy.json          the same shares for the Explore map
  app/public/data/canopy/{z}/{x}/{y}.png   the canopy itself as map tiles (zoom 11 to 15) with manifest.json
  nopush/canopy/parcel_canopy.csv          canopy share of every city lot, kept on this machine
  app/src/data/lazy/site_tract.json        per tract for the Analysis page: canopy, sun, vacant lots, transit

No download. Without a shadow run only the first two are built; without the step 15 tables the last file holds
canopy and transit and null for the rest. --no-app leaves everything under app/ alone, --no-tiles only the map tiles.
Run: uv run --no-sync python scripts/16_build_canopy.py [--from nopush/shadow/out] [--no-app] [--no-tiles]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import json
import time

import numpy as np
import pandas as pd

from visionpitts import canopy as cn
from visionpitts import geo_levels as gl
from visionpitts import parcel_shadow as ps
from visionpitts import place_measures as pm
from visionpitts.config import CRS_PA_SOUTH

ROOT = Path(__file__).resolve().parents[1]
APP_DATA = ROOT / "app" / "src" / "data"
VALUES = APP_DATA / "online" / "canopy.json"
SITE = APP_DATA / "lazy" / "site_tract.json"
TILES = ROOT / "app" / "public" / "data" / "canopy"
LOTS = ROOT / "nopush" / "canopy" / "parcel_canopy.csv"
SHADOW_TABLES = ROOT / "nopush" / "shadow" / "parcels"
PUBLISHED_RUN = ROOT / "app" / "public" / "data" / "shadow"
PENN_HILLS_2020 = 6524    # acres of canopy Tree Pittsburgh published for Penn Hills, 2020
AGREE = 0.015             # how far the checks may be off before nothing more is written


def near(got: float, want: float) -> str:
    return f"{got / want - 1:+.2%}"


def levels(shapes: np.ndarray, info: dict) -> dict[str, pd.DataFrame]:
    """The six level tables, with the checks that the file is what it is taken for."""
    print("canopy share by geography:")
    tables = cn.level_tables(shapes)
    county, city = tables["county"].iloc[0], tables["city"].iloc[0]
    county_acres = float(gl.county().to_crs(CRS_PA_SOUTH).geometry.area.iloc[0]) / cn.SQFT_PER_ACRE
    city_acres = float(gl.city().to_crs(CRS_PA_SOUTH).geometry.area.iloc[0]) / cn.SQFT_PER_ACRE
    munis = gl.munis()
    penn = tables["muni"].set_index("GEOID").loc[munis.loc[munis["name"].str.startswith("Penn Hills"), "GEOID"].iloc[0]]
    print(f"county: {info['acres']:,.0f} acres of canopy in the file, {info['acres'] / county_acres:.1%} of the county's {county_acres:,.0f} acres; "
          f"{county['canopy_acres']:,.0f} inside the Census county line, {county['canopy_share']:.2%} of its land")
    print(f"Penn Hills: {penn['canopy_acres']:,.0f} acres, Tree Pittsburgh published {PENN_HILLS_2020:,} for 2020 ({near(penn['canopy_acres'], PENN_HILLS_2020)}): "
          "the file is the 2020 canopy extent")
    print(f"City of Pittsburgh: {city['canopy_acres']:,.0f} acres, {city['canopy_acres'] / city_acres:.2%} of all {city_acres:,.0f} acres with the rivers, "
          f"{city['canopy_share']:.2%} of its {city['land_acres']:,.0f} acres of land")
    if abs(penn["canopy_acres"] / PENN_HILLS_2020 - 1) > AGREE:
        sys.exit("NOT written: the canopy inside Penn Hills is not what was published for 2020")
    for level, t in tables.items():
        if t["basis"].iloc[0] == "total":
            print(f"{level}: its file has no Census land and water figures, so the share is of the whole polygon, water included")
        blank = t.loc[t["canopy_share"].isna(), "GEOID"].tolist()
        if blank:
            print(f"{level}: {len(blank)} units have less than {cn.MIN_INSIDE:.0%} of their area inside the county and get no figure "
                  f"(the canopy map stops at the county line): {' '.join(blank)}")
    return tables


def bundled(tables: dict[str, pd.DataFrame], values: dict) -> None:
    """Says how many of the areas the app bundles have a value."""
    for level in tables:
        keys = set(json.loads((APP_DATA / f"acs_{level}.json").read_text()))
        missing = sorted(keys - set(values["values"][level]))
        print(f"  {level:>6}: {len(values['values'][level]):,} values; {len(keys) - len(missing):,} of the {len(keys):,} bundled areas have one"
              + (f", missing {' '.join(missing)}" if missing else ""))


def shadow_run(src: Path) -> dict | None:
    """The manifest of the shadow run: as cast, or else the copy published with the app (same tiles and days)."""
    for folder in (src, PUBLISHED_RUN):
        if (folder / "manifest.json").exists():
            return ps.load_run(folder)
    return None


def cells_and_lots(shapes: np.ndarray, tables: dict, run: dict, args, t0: float):
    """The canopy on the shadow run's grid: the check against the exact overlay, the map tiles, the lot table.
    Returns (lots, lots joined to the shadow table, the tract shadow table); None for what could not be built."""
    zoom, x0, y0, nx, ny = cn.tile_rect(run)
    deeper = cn.MAX_ZOOM - zoom
    res = cn.resolution()
    sqft = cn.cell_sqft(res)
    col0, row0, width, height = (x0 << deeper) * cn.TILE_PX, (y0 << deeper) * cn.TILE_PX, (nx << deeper) * cn.TILE_PX, (ny << deeper) * cn.TILE_PX
    same = "the shadow run's own cells" if ps.resolution(run) == res else f"{ps.resolution(run) / res:g} to a side of this run's {run['grid']['px']} px cells"
    print(f"grid: {nx} x {ny} tiles of zoom {zoom}, {width:,} x {height:,} cells of {sqft:.1f} sq ft ({same})")
    grid = cn.rasterize(cn.web_shapes(shapes, cn.rect_bounds(zoom, x0, y0, nx, ny)), res, col0, row0, width, height)
    print(f"canopy cells: {int(grid.sum()):,}, {grid.mean():.1%} of the grid ({time.time() - t0:.0f} s)")
    looked, wrong = cn.second_look(grid, shapes, res, col0, row0)
    print(f"second look: {looked - wrong:,} of {looked:,} sampled cells agree with the shapes when their center is looked up on the State Plane grid")
    if wrong > looked / 1000:
        sys.exit("NOT written: the canopy cells are not where the shapes are")

    city = gl.city().to_crs("EPSG:3857").geometry.to_numpy()
    cells, canopy = cn.count_inside(grid, city, res, col0, row0)
    exact = float(tables["city"]["canopy_acres"].iloc[0])
    counted = canopy * sqft / cn.SQFT_PER_ACRE
    print(f"city, cells against the exact overlay: {counted:,.0f} acres of canopy cells in {cells * sqft / cn.SQFT_PER_ACRE:,.0f} acres of cells, "
          f"{exact:,.0f} acres exact ({near(counted, exact)}); canopy share by cells {canopy / cells:.2%}")
    if abs(counted / exact - 1) > AGREE:
        sys.exit("NOT written: the canopy cells inside the city do not add up to the exact overlay")

    if args.app and args.tiles:
        out = cn.write_tiles(grid, cn.MAX_ZOOM, x0 << deeper, y0 << deeper, TILES)
        print(f"wrote {TILES.relative_to(ROOT)}: {out['tiles']:,} tiles of {out['tileSize']} px, zoom {out['minzoom']} to {out['maxzoom']}, "
              f"{out['bytes'] / 1e6:.1f} MB, bounds {out['bounds']}")

    if not (pm.PARCELS_GEOJSON.exists() and pm.ASSESSMENTS_CSV.exists()):
        print("skipped the lots: the county parcel files are not in data/raw/parcels/")
        return None, None, None
    lots = ps.load_lots()
    lot, col, row = ps.lot_cells(lots.geometry.to_crs("EPSG:3857").to_numpy(), res)
    n, under = cn.lot_canopy(lot, col, row, len(lots), grid, col0, row0)
    table = cn.lot_table(lots, n, under)
    LOTS.parent.mkdir(parents=True, exist_ok=True)
    table.to_csv(LOTS, index=False)
    _, c, r = cn.on_grid(grid, col, row, col0, row0)
    ground = np.zeros_like(grid)
    ground[r, c] = 1   # lots overlap here and there (condominiums, common ground); the ground under them is counted once
    acre = sqft / cn.SQFT_PER_ACRE
    print(f"lots: {len(lot):,} cells in {len(lots):,} lots ({len(lot) - int(n.sum()):,} off the grid, {int(n.sum()) - int(ground.sum()):,} in more than one lot), "
          f"{int(table['canopy_share'].notna().sum()):,} lots with a figure")
    print(f"canopy on lots: {int((grid & ground).sum()) * acre:,.0f} acres on the {int(ground.sum()) * acre:,.0f} acres under a lot ({(grid & ground).sum() / ground.sum():.1%}), "
          f"against {exact:,.0f} acres in the whole city by the exact overlay: the rest is over streets, rivers and ground without a parcel")
    print(f"wrote {LOTS.relative_to(ROOT)} ({LOTS.stat().st_size / 1e6:.1f} MB)")

    if not (SHADOW_TABLES / "parcel_shadow.csv").exists():
        print(f"no shadow tables in {SHADOW_TABLES.relative_to(ROOT)} (scripts/15_build_parcel_shadow.py): sun and vacant-lot figures left empty")
        return lots, None, None
    try:
        frame = cn.join_lots(cn.read_lot_table(SHADOW_TABLES / "parcel_shadow.csv"), table)
    except ValueError as e:
        print(f"sun and vacant-lot figures left empty: {e}")
        return lots, None, None
    by_tract = SHADOW_TABLES / "tract_shadow.csv"
    return lots, frame, pd.read_csv(by_tract, dtype={"geoid": str}) if by_tract.exists() else None


def transit(lots) -> pd.DataFrame | None:
    """Per lot: its tract and whether a transit stop is within half a mile of its representative point."""
    if not pm.GTFS.exists():
        print("no transit feed in data/raw/benchmark/gtfs/: the share of lots near a stop is left empty")
        return None
    stops, _ = pm.gtfs_stop_departures()
    points = lots.geometry.representative_point().to_numpy()
    out = pd.DataFrame({"geoid": lots["geoid"].to_numpy(), "near": cn.near_a_stop(points, stops.geometry.to_numpy())})
    print(f"transit: {len(stops):,} stops in the feed; {out['near'].mean():.1%} of the {len(out):,} lots are within half a mile of one")
    return out


def report(site: dict) -> None:
    """The figures worth a look, from the file as written."""
    tracts = site["tracts"]
    by_canopy = sorted(tracts, key=lambda g: tracts[g]["canopy"])
    print("  least canopy: " + ", ".join(f"{g} {tracts[g]['canopy']:.1%}" for g in by_canopy[:5]))
    print("  most canopy:  " + ", ".join(f"{g} {tracts[g]['canopy']:.1%}" for g in by_canopy[:-6:-1]))
    c = site["city"]
    if c["vacant"] is not None:
        print(f"  city: {c['lots']:,} rated lots; {c['vacant']:,} vacant, {c['vacant_2k']:,} of them at least {cn.MIN_LOT_SQFT:,} sq ft, "
              f"{c['vacant_open']:,} of those under {cn.OPEN_BELOW:.0%} canopy ({c['vacant_open_acres']:,} acres), "
              f"{c['vacant_sunny']:,} of those with sun for half the shortest day ({c['vacant_sunny_acres']:,} acres)")
        print(f"  city: {c['sun']} hours of direct sun on lots over days of {site['day_hours']} hours")
    near_stop = {g: t["transit_half"] for g, t in tracts.items() if t["transit_half"] is not None}
    if near_stop:
        low = sorted((v, g) for g, v in near_stop.items() if v < 0.9)
        print(f"  lots within half a mile of a transit stop: all of them in {sum(v == 1 for v in near_stop.values())} of {len(near_stop)} tracts, "
              f"lowest {min(near_stop.values()):.1%}, city {c['transit_half']:.1%}; under 90%: " + (", ".join(f"{g} {v:.1%}" for v, g in low) or "none"))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--from", dest="src", default=str(ROOT / "nopush" / "shadow" / "out"), help="shadow run folder with manifest.json")
    ap.add_argument("--app", action=argparse.BooleanOptionalAction, default=True, help="also write the files under app/")
    ap.add_argument("--tiles", action=argparse.BooleanOptionalAction, default=True, help="also write the map tiles")
    args = ap.parse_args()
    if not cn.CANOPY_SHP.exists():
        sys.exit(f"{cn.CANOPY_SHP} is missing: download PASDA 'Allegheny County - Tree Canopy Change, 2015-2020' and unzip it there")
    t0 = time.time()
    shapes, info = cn.load_canopy()
    tables = levels(shapes, info)
    for f in cn.write_levels(tables):
        print(f"wrote {f.relative_to(ROOT)}")
    if args.app:
        values = cn.app_values(tables)
        VALUES.parent.mkdir(parents=True, exist_ok=True)
        size = VALUES.write_text(cn.dump(values))
        print(f"wrote {VALUES.relative_to(ROOT)} ({size / 1e3:.0f} kB)")
        bundled(tables, values)

    run = shadow_run(Path(args.src))
    lots = frame = stops = tract_shadow = None
    if run is None:
        print(f"skipped the map tiles and the lots: no shadow run in {args.src} to take the grid from (the Analysis file gets canopy only)")
    else:
        lots, frame, tract_shadow = cells_and_lots(shapes, tables, run, args, t0)
        stops = transit(lots) if lots is not None and args.app else None
    if args.app:
        geoids = sorted(json.loads((APP_DATA / "place.json").read_text()))
        site = cn.site_tract(geoids, tables["tract"], tables["city"], run, tract_shadow, frame, stops)
        SITE.parent.mkdir(parents=True, exist_ok=True)
        size = SITE.write_text(cn.dump(site))
        print(f"wrote {SITE.relative_to(ROOT)} ({size / 1e3:.0f} kB): {len(site['tracts'])} tracts")
        report(site)
    print(f"done in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
