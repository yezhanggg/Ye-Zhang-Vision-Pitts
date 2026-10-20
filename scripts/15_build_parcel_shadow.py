"""Step 15: shadow by parcel. For every lot in the city, the share of the day it sits in shadow in each season.

Reads a finished shadow run as it was cast (nopush/shadow/out/, 6 ft cells) and the county parcel shapes
(data/raw/parcels/), counts each lot's shadowed cells at every half hour (src/visionpitts/parcel_shadow.py), and writes

  nopush/shadow/parcels/            analysis files, kept on this machine: parcel_shadow.csv (one row per lot),
                                    parcel_shadow.gpkg (the same with shapes), parcel_profiles.parquet (every half
                                    hour), tract_shadow.csv and use_shadow.csv (weighted by area)
  app/public/data/parcel-shadow/    what the Explore map draws its By parcel view from (git-ignored; the app shows
                                    the view only where these files are)

No GPU and no download. Before anything is written, a sample of lots is counted a second, slower way and the two
counts have to agree cell for cell. --no-app leaves the map files alone.
Run: uv run python scripts/15_build_parcel_shadow.py [--from nopush/shadow/out] [--no-app] [--sample 20]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import time

import numpy as np

from visionpitts import parcel_shadow as ps

ROOT = Path(__file__).resolve().parents[1]
TABLES = ROOT / "nopush" / "shadow" / "parcels"
APP = ROOT / "app" / "public" / "data" / "parcel-shadow"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--from", dest="src", default=str(ROOT / "nopush" / "shadow" / "out"), help="run folder with manifest.json, as cast")
    ap.add_argument("--app", action=argparse.BooleanOptionalAction, default=True, help="also write the map files")
    ap.add_argument("--sample", type=int, default=20, help="lots to count a second way before writing")
    args = ap.parse_args()
    src = Path(args.src)
    if not (src / "manifest.json").exists():
        sys.exit(f"{src} has no manifest.json: unzip the Colab run there first (scripts/13_build_shadow_notebook.py)")
    t0 = time.time()
    run = ps.load_run(src)
    res = ps.resolution(run)
    sqft = ps.cell_sqft(run)
    days = run["days"]
    print(f"{src}: {run['engine']}; {len(run['chunks'])} chunks of {run['grid']['px']} px, {ps.total_steps(run)} steps, {sqft:.1f} sq ft per cell")

    lots = ps.load_lots()
    merc = lots.geometry.to_crs("EPSG:3857").to_numpy()
    lot, col, row = ps.lot_cells(merc, res)
    print(f"cells: {len(lot):,} centers inside a lot; {len(lot) * sqft / lots['sqft'].sum():.2%} of the lots' own area ({time.time() - t0:.0f} s)")
    shaded, cells, touched = ps.count(src, run, lot, col, row, len(lots))
    m = ps.measures(shaded, cells, touched, run)
    ok = m["ok"]
    print(f"counted: {int(cells.sum()):,} cells with data. Every chunk and day passed the check that shadow bits and sunlit steps add up.")
    print(f"lots: {int(ok.sum()):,} rated; not rated: {int((cells == 0).sum()):,} with no data, "
          f"{int(((cells > 0) & (cells < ps.MIN_CELLS)).sum()):,} under {ps.MIN_CELLS} cells, "
          f"{int(((cells >= ps.MIN_CELLS) & ~ok).sum()):,} with under half their cells in the data")

    # The slow second count, on a sample.
    rng = np.random.default_rng(15)
    pick = rng.choice(np.flatnonzero(ok), size=min(args.sample, int(ok.sum())), replace=False)
    first = np.full(len(lots), -1, dtype=np.int64)
    first[lot[::-1]] = np.arange(len(lot))[::-1]
    px = run["grid"]["px"]
    pick = sorted(pick, key=lambda i: (col[first[i]] // px, row[first[i]] // px))
    cache: dict = {}
    agree = 0
    for i in pick:
        if len(cache) > 9:
            cache.clear()
        again, n = ps.recount(src, run, merc[i], res, cache)
        agree += n == cells[i] and np.array_equal(again, shaded[i])
    print(f"second count: {agree} of {len(pick)} sampled lots agree cell for cell")
    if agree != len(pick):
        sys.exit("NOT written: the two counts disagree")

    offsets = ps.day_offsets(run)
    print("hours of direct sun, lots (by area) next to every cell of the surface:")
    for d, day in enumerate(days):
        n = len(day["steps"])
        on_lots = (1 - shaded[ok, offsets[d] : offsets[d] + n].sum() / (cells[ok].sum() * n)) * n * run["stepMinutes"] / 60
        surface = sum(1 - s["shade"] for s in day["steps"]) * run["stepMinutes"] / 60
        mid = np.nanmedian(m["shade"][ok, d])
        print(f"  {day['label']:>12}: {on_lots:5.2f} h on lots, {surface:5.2f} h over the surface; the middle lot is in shadow {mid:.0%} of the day")
    by_id = {day["id"]: d for d, day in enumerate(days)}
    if {"jun21", "dec21"} <= set(by_id):
        less = (m["shade"][ok, by_id["dec21"]] < m["shade"][ok, by_id["jun21"]]).sum()
        print(f"lots with less shadow in winter than in summer: {int(less):,} of {int(ok.sum()):,}")
    print("by assessed use (rated lots, weighted by area):")
    print(ps.rollup(lots, shaded, cells, ok, run, "use").to_string())

    for name, size in ps.write_tables(lots, m, shaded, cells, run, TABLES).items():
        print(f"wrote {(TABLES / name).relative_to(ROOT)} ({size / 1e6:.1f} MB)")
    if args.app:
        out = ps.write_app(lots, m, cells, run, APP)
        most = max(c[2] for c in out["chunks"])
        print(f"wrote {APP.relative_to(ROOT)} ({out['bytes'] / 1e6:.1f} MB, git-ignored): {out['lots']:,} lots in {len(out['chunks'])} chunks, the fullest with {most:,}")
    print(f"done in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
