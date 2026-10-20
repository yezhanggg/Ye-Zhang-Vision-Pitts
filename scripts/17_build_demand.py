"""Step 17: who needs homes here. Renter households by size, age and income, the homes they rent and what those homes
cost, growth since 2014, and the tax credit homes in and near each place, for the Place page's "Who needs it" card.

Reads the ACS 2020-2024 5-year tables through the Census API (cached in data/raw/acs/acs5_2024_<level>_demand.csv),
the ACS history files of step 09, HUD's tax credit property layer (cached in data/raw/benchmark/lihtc/), the city
tracts and ZCTA shapes, and app/src/data/place.json for the ZIP each tract's Market card uses. Writes
app/src/data/lazy/demand.json (src/visionpitts/demand.py; method in docs/data/demand.md).

Before trusting a fetch it checks that the stem numbers still carry the expected labels in the API's variable list.
Run: uv run --no-sync python scripts/17_build_demand.py [--refresh] [--no-labels]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import json

import requests

from visionpitts import acs_levels as al
from visionpitts import demand as dm
from visionpitts import geo_levels as gl
from visionpitts import place_measures as pm
from visionpitts.config import APP_DATA


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--refresh", action="store_true", help="refetch the ACS tables and the tax credit layer")
    ap.add_argument("--no-labels", action="store_true", help="skip the variable label check (offline, cache only)")
    args = ap.parse_args()
    session = requests.Session()

    if not args.no_labels:
        bad = dm.check_labels(dm.fetch_labels(session))
        if bad:
            raise SystemExit("ACS labels changed; nothing written:\n  " + "\n  ".join(bad))
        print(f"labels: {len(dm.EXPECTED_LABELS)} stems carry the expected wording")

    places = json.loads((APP_DATA / "place.json").read_text())
    tract_zip = {g: (p.get("market") or {}).get("zip") for g, p in places.items() if isinstance(p, dict)}
    zctas = sorted(json.loads((APP_DATA / "acs_zcta.json").read_text()).keys())
    print(f"{len(tract_zip)} city tracts, {len(zctas)} city ZCTAs, {len(dm.stems())} ACS stems")

    tract_raw = dm.fetch("tract", refresh=args.refresh, session=session)
    zcta_raw = dm.fetch("zcta", zctas=zctas, refresh=args.refresh, session=session).reindex(zctas)
    city_raw = dm.fetch("city", refresh=args.refresh, session=session)
    missing = sorted(set(tract_zip) - set(tract_raw.index))
    if missing:
        raise SystemExit(f"{len(missing)} city tracts are missing from the ACS tract file, e.g. {missing[0]}")

    lihtc = dm.fetch_lihtc(refresh=args.refresh, session=session)
    pts = dm.lihtc_points(lihtc)
    info = json.loads(dm.LIHTC_INFO.read_text()) if dm.LIHTC_INFO.exists() else {}
    print(f"tax credit properties in Allegheny County: {len(lihtc)} ({len(pts)} located), {int(pts['li'].fillna(0).sum()):,} tax credit homes")
    tracts = pm.tracts_city()
    supply = dm.tract_supply(pts, tracts)
    zgeo = gl.zctas("county")
    zip_supply = dm.area_supply(pts, zgeo[zgeo["GEOID"].isin(zctas)])
    city_geo = gl.city()
    city_supply = dm.supply_counts(pts[pts.within(city_geo.to_crs(pts.crs).geometry.iloc[0])])

    histories = {level: dm.growth(level) for level in ("tract", "zcta", "city")}
    depth = dm.tract_depth(tracts, places)
    payload = dm.build(tract_raw, zcta_raw, city_raw, tract_zip, supply, zip_supply, city_supply, histories,
                       {"retrieved": info.get("retrieved"), "properties": len(lihtc)}, depth)

    # Checks: the parts of each table add up to its total, for the city and every tract.
    city = al.clean_raw(city_raw).iloc[0]
    renters = city[f"{dm.RENTER_HH}E"]
    for name, group in (("household size", dm.SIZE), ("bedrooms", dm.BEDROOMS), ("income", dm.INCOME), ("age", dm.AGE)):
        total = sum(city[f"{s}E"] for s in group)
        print(f"city renters {renters:,.0f}; by {name} {total:,.0f}")
        if abs(total - renters) > 0.002 * renters:
            raise SystemExit(f"city renters by {name} do not add up to the renter total; nothing written")
    off = [g for g in tract_zip if g in tract_raw.index and (lambda c: abs(sum(c[f'{s}E'] for s in dm.SIZE) - c[f'{dm.RENTER_HH}E']) > 1)(al.clean_raw(tract_raw.loc[[g]]).iloc[0])]
    if off:
        raise SystemExit(f"{len(off)} tracts' renters by size do not add up, e.g. {off[0]}; nothing written")
    c = payload["city"]["shares"]
    print(f"city: renter share {c['renter'][0]:.1%}, one-person renter households {c['one_person'][0]:.1%}, 5+ people {c['large5'][0]:.1%}, "
          f"renter householders 65+ {c['age65'][0]:.1%}, renters in 1-4 unit buildings {c['small_bldg'][0]:.1%}; "
          f"tax credit homes in the city {city_supply['li_units']:,}")
    dm.write(payload)
    print(f"wrote {dm.DEMAND_JSON.relative_to(dm.DEMAND_JSON.parents[3])} ({dm.DEMAND_JSON.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
