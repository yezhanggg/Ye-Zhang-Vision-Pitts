"""Step 14: check a finished shadow run and copy its map pages into the app.

Reads the folder a run left behind (the unzipped Colab download in nopush/shadow/out/, or a dry run), checks that
every page the manifest names is there with the right size and that each day's shadow share falls toward midday and
rises again, then copies the pages and manifest.json to app/public/data/shadow/. The app fetches them from there at
runtime; they are not part of the offline single file.

--reduce N publishes the chunk pages N times coarser each way than the run (default 2: the run is cast on 6 ft
cells and published at 12 ft, about 68 MB instead of 242 MB; the coarse copy is kept next to the run as <run>_x2).
--reduce 1 publishes the run as it is.

--fine (the default when --reduce is above 1) also copies the run's own shadow pages to app/public/data/shadow/fine/
(about 162 MB). The app shows them when the map is zoomed in close. That folder is git-ignored: the live site works
without it, and the line in .gitignore is the switch for publishing it. --no-fine leaves it out.

Nothing is copied when a check fails or when the main pages are over --limit-mb.
Run: uv run python scripts/14_publish_shadows.py [--from nopush/shadow/out] [--reduce 2] [--no-fine] [--limit-mb 120]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse

from visionpitts import shadow as sh

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "app" / "public" / "data" / "shadow"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--from", dest="src", default=str(ROOT / "nopush" / "shadow" / "out"), help="run folder with manifest.json")
    ap.add_argument("--reduce", type=int, default=2, metavar="N", help="publish chunk pages N times coarser each way than the run (1 = as cast)")
    ap.add_argument("--fine", action=argparse.BooleanOptionalAction, default=True, help="also publish the run's own pages as the close-zoom level")
    ap.add_argument("--limit-mb", type=float, default=120.0, help="refuse to publish more than this (main pages)")
    args = ap.parse_args()
    src = Path(args.src)
    cast = src
    run, problems, _ = sh.check_output(src)
    if not problems and args.reduce > 1:
        small = src.with_name(f"{src.name}_x{args.reduce}")
        size = sh.reduce_run(src, small, args.reduce)
        print(f"{small}: chunk pages reduced {args.reduce}x to {run['cellFt'] * args.reduce:g} ft cells, {size / 1e6:.1f} MB")
        src = small
    manifest, problems, total = sh.check_output(src)
    steps = sum(len(d["steps"]) for d in manifest["days"])
    print(f"{src}: {manifest['engine']}; {len(manifest['chunks'])} chunks, {len(manifest['days'])} days, {steps} steps, {total / 1e6:.1f} MB")
    for day in manifest["days"]:
        low = min(day["steps"], key=lambda s: s["shade"])
        print(f"  {day['label']}: {day['steps'][0]['label']} to {day['steps'][-1]['label']}, least shadow {low['shade']:.1%} at {low['label']}")
    if problems:
        print(f"NOT published, {len(problems)} problem(s):")
        for p in problems[:20]:
            print("  " + p)
        sys.exit(1)
    if total > args.limit_mb * 1e6:
        print(f"NOT published: {total / 1e6:.1f} MB is over the {args.limit_mb:g} MB limit")
        sys.exit(1)
    size, fine = sh.publish(src, DEST, fine_from=cast if args.fine and cast != src else None)
    print(f"wrote {DEST.relative_to(ROOT)} ({size / 1e6:.1f} MB)")
    if fine:
        print(f"wrote {DEST.relative_to(ROOT)}/fine ({fine / 1e6:.1f} MB, git-ignored): the {run['cellFt']:g} ft pages for close zoom")


if __name__ == "__main__":
    main()
