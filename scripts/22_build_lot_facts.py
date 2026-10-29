"""Step 22: lot facts for the Place page's Parcel level. For every city lot: its zoning district, its area, a rough
frontage and depth, and the homes on it today, written per chunk of the By parcel files' grid so the app reads a lot's
facts next to its shape and sun.

Reads the county parcel shapes and assessments (data/raw/parcels/) and the WPRDC zoning districts (downloaded once by
step 06). Writes app/public/data/parcel-lots/ (src/visionpitts/lot_facts.py; method in docs/data/parcel_level.md).
Lot facts only: no parcel ID, owner, address, value or sale.
Run: PYTHONPATH=src uv run --no-sync python scripts/22_build_lot_facts.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import time

from visionpitts import lot_facts as lf


def main() -> None:
    t0 = time.time()
    rows = lf.build()
    m = lf.write(rows)
    print(f"wrote {len(m['tiles'])} chunks, {m['lots']:,} lots, {m['bytes'] / 1e6:.1f} MB to {lf.DEST} in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
