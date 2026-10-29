"""Step 18: what can be built by right. Pittsburgh's zoning standards (config/zoning_standards.json, transcribed from
Title Nine with section numbers) applied to every city lot and summed to tracts for the Place page's "What can be
built" card: vacant lots and the homes they allow by right, lots allowed more homes than they hold today, the
districts present, and the share of the tract in the inclusionary housing overlay (the City's own layer).

Reads the county parcel shapes and assessments (data/raw/parcels/), the WPRDC zoning districts and the City's IZ-O
layer (downloaded once to data/raw/benchmark/zoning/). Writes app/src/data/lazy/zoning_capacity.json, a copy of the
standards at app/src/data/lazy/zoning_standards.json and tests/fixtures/zoning_capacity_cases.json
(src/visionpitts/zoning_capacity.py; method in docs/data/zoning_capacity.md). Tract totals only.
Run: uv run --no-sync python scripts/18_build_zoning_capacity.py [--refresh]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import json
import time

from visionpitts import place_measures as pm
from visionpitts import zoning_capacity as zc


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--refresh", action="store_true", help="download the IZ-O layer again")
    args = ap.parse_args()
    t0 = time.time()
    cfg = zc.load_standards()
    standards = zc.by_code(cfg)
    zoning_codes = {f["properties"]["code"] for f in json.loads((zc.APP_DATA / "zoning_districts.json").read_text())["features"]}
    uncovered = sorted(zoning_codes - set(standards) - set(cfg["not_computed"]))
    if uncovered:
        raise SystemExit(f"districts on the map with no standards and no reason: {uncovered}; nothing written")
    print(f"standards: {len(standards)} districts computed, {len(cfg['not_computed'])} not computed (code current through {cfg['current_through']})")

    tracts = pm.tracts_city()
    lots = zc.city_lots(tracts)
    print(f"city lots: {len(lots):,}; with a district {lots['district'].notna().sum():,}; vacant {(lots['use'] == 'vacant').sum():,}")
    cap = zc.lot_capacity(lots, standards)
    izo = zc.izo_overlay(refresh=args.refresh)
    zc.write_izo(izo)
    totals = zc.tract_totals(lots, cap, standards, tracts, izo)
    # The Policy lab's before/after: the same lots under the minimum lot sizes before May 2025.
    zc.add_old(totals, lots, zc.lot_capacity(lots, zc.old_minimums(standards)), standards)
    print(f"homes by right on vacant lots under the old minimums: {sum(v['vacant'].get('homes_old', 0) for v in totals.values()):,} "
          f"(today {sum(v['vacant']['homes'] for v in totals.values()):,}); gentle {sum(v['gentle'].get('homes_old', 0) for v in totals.values()):,} "
          f"(today {sum(v['gentle']['homes'] for v in totals.values()):,})")
    cases = zc.fixture_cases(standards)

    vac = lots["use"] == "vacant"
    print(f"vacant lots in computed districts: {int((vac & cap['computed']).sum()):,}; homes by right on them: {int(cap.loc[vac, 'homes'].sum()):,}; "
          f"under the minimum lot size: {int((vac & cap['below_min']).sum()):,}")
    print(f"lots in R2/R3 holding fewer homes than allowed: {sum(v['gentle']['lots'] for v in totals.values()):,} "
          f"(+{sum(v['gentle']['homes'] for v in totals.values()):,} homes)")
    print(f"house lots: +{sum(v['gentle']['adu'] for v in totals.values()):,} with an ADU, +{sum(v['gentle']['up3'] for v in totals.values()):,} at up to 3, "
          f"+{sum(v['gentle']['up4'] for v in totals.values()):,} at up to 4 homes")
    print(f"tracts mostly in the IZ-O: {sum(1 for v in totals.values() if (v['izo_share'] or 0) > 0.5)}")
    for c in cases:
        print(f"  {c['code']:7} {c['lot_sqft']:>6,} sq ft -> {c['homes']} homes{' (under the minimum lot size)' if c['below_min'] else ''}")
    zc.write(totals, cfg, cases)
    print(f"wrote {zc.OUT_JSON.name} ({zc.OUT_JSON.stat().st_size / 1024:.0f} KB), {zc.STANDARDS_COPY.name}, {zc.FIXTURE.name} in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
