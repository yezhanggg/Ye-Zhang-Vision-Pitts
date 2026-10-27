"""What can be built by right: Pittsburgh's zoning standards (config/zoning_standards.json, transcribed from Title Nine)
applied to every city lot, summed to tracts for the Place page's "What can be built" card.

Per lot: the district at its representative point (WPRDC zoning), its area (the assessment's LOTAREA, else the shape),
and a rough frontage and depth (the sides of the lot's minimum rotated rectangle, scaled to the lot's area). Then:
  R1D, R1A, R2, R3   at most 1, 1, 2 or 3 homes when the lot meets the district's minimum lot size, else none;
  RM and the mixed-use districts (NDO, LNC, NDI, UNC)   the envelope: (frontage - side setbacks) x (depth - front - rear)
       x stories, held to the lot coverage and floor area ratio where the district sets them, then homes at
       HOME_SQFT a home and EFFICIENCY of the floor area (assumptions, printed on the card);
  every other district   not computed (height maps, downtown, riverfront, special and planned districts).

Only tract totals are written (the README promises "tracts or larger"); no lot, owner or address leaves this module.
Vacant land is not buildable land: slopes, rights of way, lots of record and parking are not checked, so the vacant
figures are an upper bound. Nothing here enters the score.
"""
from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

from visionpitts import place_measures as pm
from visionpitts.config import APP_DATA, CRS_PA_SOUTH, RAW, ROOT

STANDARDS = ROOT / "config" / "zoning_standards.json"
OUT_JSON = APP_DATA / "lazy" / "zoning_capacity.json"
STANDARDS_COPY = APP_DATA / "lazy" / "zoning_standards.json"
FIXTURE = ROOT / "tests" / "fixtures" / "zoning_capacity_cases.json"
IZO_GEOJSON = RAW / "benchmark" / "zoning" / "izo_overlay.geojson"
IZO_OUT = APP_DATA / "lazy" / "izo_overlay.json"
IZO_URL = ("https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/InclusionaryHousingOverlayDistrict/FeatureServer/0/"
           "query?where=1%3D1&outFields=OBJECTID_1&returnGeometry=true&outSR=4326&f=geojson")

HOME_SQFT = 850        # floor area of an average home (assumption)
EFFICIENCY = 0.85      # share of a building's floor area that is homes, not halls and stairs (assumption)
STORY_FT = 10          # feet a story where a district caps height but not stories (RM-VH: 180 ft)
EXISTING_HOMES = {"SINGLE FAMILY": 1, "ROWHOUSE": 1, "TOWNHOUSE": 1, "TWO FAMILY": 2, "THREE FAMILY": 3, "FOUR FAMILY": 4}


def load_standards(path: Path = STANDARDS) -> dict:
    return json.loads(path.read_text())


def by_code(cfg: dict) -> dict[str, dict]:
    return {d["code"]: d for d in cfg["districts"]}


# ------------------------------------------------------------------------------------------------ one lot
def stories_of(std: dict) -> int | None:
    if std.get("max_stories"):
        return int(std["max_stories"])
    h = std.get("max_height_ft")
    return int(h // STORY_FT) if h else None


def envelope(std: dict, lot_sqft: float, frontage_ft: float, depth_ft: float) -> float:
    """Rough floor area allowed: buildable footprint x stories, held to lot coverage and FAR where set."""
    width = max(0.0, frontage_ft - (std.get("side_total_ft") or 0))
    deep = max(0.0, depth_ft - (std.get("front_ft") or 0) - (std.get("rear_ft") or 0))
    footprint = width * deep
    if std.get("max_coverage"):
        footprint = min(footprint, std["max_coverage"] * lot_sqft)
    floor_area = footprint * (stories_of(std) or 0)
    if std.get("max_far"):
        floor_area = min(floor_area, std["max_far"] * lot_sqft)
    return floor_area


def homes_by_right(std: dict | None, lot_sqft: float, frontage_ft: float | None = None, depth_ft: float | None = None) -> dict:
    """{homes, below_min, computed, floor_area} for one lot under one district's standards."""
    if std is None or lot_sqft is None or not (lot_sqft > 0):
        return {"homes": 0, "below_min": False, "computed": False, "floor_area": None}
    if lot_sqft < (std.get("min_lot_sqft") or 0):
        return {"homes": 0, "below_min": True, "computed": True, "floor_area": None}
    if std.get("max_homes"):
        return {"homes": int(std["max_homes"]), "below_min": False, "computed": True, "floor_area": None}
    if frontage_ft is None or depth_ft is None:
        side = math.sqrt(lot_sqft)
        frontage_ft, depth_ft = side, side
    fa = envelope(std, lot_sqft, frontage_ft, depth_ft)
    return {"homes": int(fa * EFFICIENCY // HOME_SQFT), "below_min": False, "computed": True, "floor_area": round(fa)}


def lot_dims(geom, lot_sqft: float) -> tuple[float, float]:
    """(frontage, depth): the short and long sides of the minimum rotated rectangle, scaled so their product is the lot area."""
    with np.errstate(divide="ignore", invalid="ignore"):  # shapely's rectangle divides by zero on slivers and exact boxes
        rect = geom.minimum_rotated_rectangle
    xs, ys = rect.exterior.coords.xy
    a = math.dist((xs[0], ys[0]), (xs[1], ys[1]))
    b = math.dist((xs[1], ys[1]), (xs[2], ys[2]))
    short, long = sorted((a, b))
    if short <= 0 or long <= 0:
        s = math.sqrt(lot_sqft)
        return s, s
    k = math.sqrt(lot_sqft / (short * long))
    return short * k, long * k


# ------------------------------------------------------------------------------------------------ inputs
def izo_overlay(refresh: bool = False) -> gpd.GeoDataFrame:
    if not IZO_GEOJSON.exists() or refresh:
        import requests

        r = requests.get(IZO_URL, timeout=90)
        r.raise_for_status()
        IZO_GEOJSON.parent.mkdir(parents=True, exist_ok=True)
        IZO_GEOJSON.write_bytes(r.content)
    return gpd.read_file(IZO_GEOJSON).to_crs(CRS_PA_SOUTH)


def write_izo(izo: gpd.GeoDataFrame) -> None:
    """The IZ-O outline for the Place page's pin lookup (lib/policy/applies): one simplified shape, no lots or owners.
    Simplified at 15 ft, so a pin within a few feet of the edge can read either way; the card says it is a map reading."""
    shape = gpd.GeoSeries([izo.union_all().simplify(15)], crs=CRS_PA_SOUTH).to_crs(4326)
    geom = json.loads(shape.to_json())["features"][0]["geometry"]

    def r6(c):
        return [r6(x) for x in c] if isinstance(c[0], list) else [round(c[0], 6), round(c[1], 6)]

    geom["coordinates"] = r6(geom["coordinates"])
    IZO_OUT.write_text(json.dumps({"source": IZO_URL.split("/query")[0], "geometry": geom}, separators=(",", ":")))


def city_lots(tracts: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """City lots (one row per shape whose point is in a city tract) with tract, district, area, use and existing homes."""
    import pyogrio

    pin_tract = pm.parcel_tracts(tracts)
    t = tracts.to_crs(CRS_PA_SOUTH)
    lots = pyogrio.read_dataframe(pm.PARCELS_GEOJSON, columns=["PIN"], bbox=tuple(float(x) for x in t.total_bounds))  # the file is in EPSG:2272
    lots = lots[lots["PIN"].isin(pin_tract.index)].to_crs(CRS_PA_SOUTH).reset_index(drop=True)
    lots["GEOID"] = lots["PIN"].map(pin_tract)
    pts = lots.copy()
    pts["geometry"] = lots.geometry.representative_point()
    zoning = pm.zoning_download().to_crs(CRS_PA_SOUTH)[["zon_new", "geometry"]]
    j = gpd.sjoin(pts[["geometry"]], zoning, how="left", predicate="within")
    lots["district"] = j[~j.index.duplicated(keep="first")]["zon_new"].reindex(lots.index)
    a = pd.read_csv(pm.ASSESSMENTS_CSV, usecols=["PARID", "CLASSDESC", "USEDESC", "LOTAREA"], dtype=str, low_memory=False).drop_duplicates("PARID").set_index("PARID")
    lots["use"] = [pm.land_use_class(c, u) for c, u in zip(lots["PIN"].map(a["CLASSDESC"]), lots["PIN"].map(a["USEDESC"]))]
    lots["usedesc"] = lots["PIN"].map(a["USEDESC"]).fillna("").str.upper().str.strip()
    lotarea = pd.to_numeric(lots["PIN"].map(a["LOTAREA"]), errors="coerce")
    lots["sqft"] = lotarea.where(lotarea > 0, lots.geometry.area)
    lots["existing"] = lots["usedesc"].map(EXISTING_HOMES)
    return lots


def lot_capacity(lots: gpd.GeoDataFrame, standards: dict[str, dict]) -> pd.DataFrame:
    """Per lot: homes allowed by right, whether it is under the minimum lot size, and whether its district is computed."""
    rows = []
    for r in lots.itertuples():
        std = standards.get(r.district) if isinstance(r.district, str) else None
        f, d = lot_dims(r.geometry, r.sqft) if std is not None and not std.get("max_homes") and r.sqft and r.sqft > 0 else (None, None)
        rows.append(homes_by_right(std, float(r.sqft) if r.sqft == r.sqft else 0.0, f, d))
    return pd.DataFrame(rows, index=lots.index)


# ------------------------------------------------------------------------------------------------ tract totals
def tract_totals(lots: gpd.GeoDataFrame, cap: pd.DataFrame, standards: dict[str, dict], tracts: gpd.GeoDataFrame,
                 izo: gpd.GeoDataFrame | None) -> dict[str, dict]:
    df = lots.drop(columns="geometry").join(cap)
    df["family"] = df["district"].map(lambda c: standards[c]["family"] if isinstance(c, str) and c in standards else None)
    out: dict[str, dict] = {}
    izo_union = izo.union_all() if izo is not None and len(izo) else None
    t = tracts.to_crs(CRS_PA_SOUTH).set_index("GEOID")
    for g, rows in df.groupby("GEOID"):
        vac = rows[rows["use"] == "vacant"]
        vac_c = vac[vac["computed"]]
        by_family = {f: int(x["homes"].sum()) for f, x in vac_c.groupby("family") if x["homes"].sum() > 0}
        gentle = rows[(rows["use"] == "residential") & rows["family"].isin(["R2", "R3"]) & rows["existing"].notna() & (~rows["below_min"])]
        cap_now = gentle["family"].map({"R2": 2, "R3": 3})
        more = gentle[cap_now > gentle["existing"]]
        districts = rows.groupby("district").size().sort_values(ascending=False)
        geom = t.geometry.get(g)
        izo_share = None if izo_union is None or geom is None else round(float(geom.intersection(izo_union).area / geom.area), 3)
        out[g] = {
            "lots": int(len(rows)),
            "vacant": {
                "lots": int(len(vac)), "acres": round(float(vac["sqft"].sum()) / 43560, 1),
                "median_sqft": None if vac.empty else int(vac["sqft"].median()),
                "computed": int(len(vac_c)), "below_min": int(vac_c["below_min"].sum()),
                "homes": int(vac_c["homes"].sum()), "by_family": by_family,
                # The largest computed vacant lot: one big lot can carry most of the envelope figure.
                "largest": None if vac_c.empty else {"acres": round(float(vac_c["sqft"].max()) / 43560, 1),
                                                     "homes": int(vac_c.loc[vac_c["sqft"].idxmax(), "homes"]),
                                                     "district": str(vac_c.loc[vac_c["sqft"].idxmax(), "district"])},
            },
            "gentle": {"lots": int(len(more)), "homes": int((cap_now[more.index] - more["existing"]).sum())},
            "districts": {k: int(v) for k, v in districts.items() if isinstance(k, str)},
            "izo_share": izo_share,
        }
    return out


# ------------------------------------------------------------------------------------------------ fixture and files
FIXTURE_CASES = [
    ("R2-M", 2000, None, None), ("R2-M", 3000, None, None), ("R1D-VL", 7000, None, None), ("R3-L", 3500, None, None),
    ("RM-M", 10000, 80, 125), ("RM-H", 20000, 100, 200), ("RM-VH", 15000, 100, 150), ("LNC", 5000, 40, 125),
    ("NDO", 8000, 50, 160), ("UNC", 12000, 80, 150), ("RM-VL", 6000, 40, 150),
]


def fixture_cases(standards: dict[str, dict]) -> list[dict]:
    """Hand-checkable lots and the homes the rule gives (the app's TypeScript reads the same file and must agree)."""
    out = []
    for code, sqft, f, d in FIXTURE_CASES:
        r = homes_by_right(standards[code], sqft, f, d)
        out.append({"code": code, "lot_sqft": sqft, "frontage_ft": f, "depth_ft": d, **r})
    return out


def write(totals: dict, cfg: dict, cases: list[dict]) -> None:
    payload = {
        "built": datetime.now(UTC).date().isoformat(), "current_through": cfg["current_through"], "url": cfg["url"],
        "assumptions": {"home_sqft": HOME_SQFT, "efficiency": EFFICIENCY, "story_ft": STORY_FT},
        "tracts": totals,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
    STANDARDS_COPY.write_text(json.dumps(cfg, separators=(",", ":"), ensure_ascii=False))
    FIXTURE.write_text(json.dumps({"assumptions": payload["assumptions"], "cases": cases}, indent=1) + "\n")
