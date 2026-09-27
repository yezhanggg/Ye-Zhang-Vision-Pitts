"""The city zoning map for Explore: WPRDC district polygons dissolved by district code -> app/src/data/zoning_districts.json.

Each district code (zon_new) becomes one (multi)polygon, simplified in EPSG:2272 and written with 5-decimal WGS84
coordinates. Properties: code, the rules family (config/zoning_rules.json, via place_measures.zoning_family), a
display family for the map colors, and the by-right status of the five building types from the same UNVERIFIED table
(an annotation to confirm in Title 9, never a gate). Mount Oliver (MTOBOR, a separate borough inside the city) and
codes the rules do not cover are dropped from the map.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import mapping

from visionpitts.config import APP_DATA, CRS_PA_SOUTH, CRS_WGS84
from visionpitts.place_measures import ZONING_TYPES, load_zoning_rules, zoning_download, zoning_family

ZONING_MAP_JSON = APP_DATA / "zoning_districts.json"
FT_PER_M = 3.28084

# Display families: map colors group the rules families into nine readable classes (order = legend order).
DISPLAY_FAMILIES: list[tuple[str, str, list[str]]] = [
    ("res_single", "Residential single-unit", ["R1D", "R1A"]),
    ("res_2_3", "Residential 2–3 unit", ["R2", "R3"]),
    ("res_multi", "Residential multi-unit", ["RM"]),
    ("mixed", "Neighborhood commercial / mixed use", ["LNC", "NDO", "UNC", "RIV"]),
    ("commercial", "Commercial / downtown", ["HC", "GT"]),
    ("industrial", "Industrial", ["UI", "NDI", "GI"]),
    ("parks", "Parks and open space", ["P"]),
    ("planned", "Planned / institutional", ["PLANNED"]),
    ("hillside", "Hillside", ["H"]),
]
DISPLAY_OF = {fam: (did, label) for did, label, fams in DISPLAY_FAMILIES for fam in fams}


def display_family(rules_family: str | None) -> tuple[str, str] | None:
    """(display id, label) for a rules family id, or None when the family is not on the map."""
    return DISPLAY_OF.get(rules_family) if rules_family else None


def _round(coords, nd: int):
    if isinstance(coords, (list, tuple)) and coords and isinstance(coords[0], (int, float)):
        return [round(float(coords[0]), nd), round(float(coords[1]), nd)]
    return [_round(c, nd) for c in coords]


def zoning_districts(zoning: gpd.GeoDataFrame, rules: dict, tolerance_m: float = 5.0) -> gpd.GeoDataFrame:
    """District polygons dissolved by code with family, display family and by-right statuses (WGS84)."""
    z = zoning[["zon_new", "geometry"]].copy()
    z["code"] = z["zon_new"].map(lambda c: c.strip().upper() if isinstance(c, str) else None)
    z["zfam"] = z["code"].map(lambda c: zoning_family(c, rules))
    z = z[z["zfam"].notna()].to_crs(CRS_PA_SOUTH)
    z["geometry"] = z.geometry.make_valid()
    d = z.dissolve(by="code", as_index=False)[["code", "zfam", "geometry"]]
    d["geometry"] = d.geometry.simplify(tolerance_m * FT_PER_M, preserve_topology=True).make_valid()
    d = d[~d.geometry.is_empty]
    table = {f["id"]: f["by_type"] for f in rules["families"]}
    d["family"] = d["zfam"].map(lambda f: display_family(f)[0])
    d["family_label"] = d["zfam"].map(lambda f: display_family(f)[1])
    for t in ZONING_TYPES:
        d[t] = d["zfam"].map(lambda f, t=t: table.get(f, {}).get(t, "unknown"))
    return d.to_crs(CRS_WGS84).sort_values("code").reset_index(drop=True)


def to_feature_collection(d: gpd.GeoDataFrame, nd: int = 5) -> dict:
    feats = []
    for _, r in d.iterrows():
        g = mapping(r.geometry)
        if g["type"] == "GeometryCollection":  # make_valid can leave stray lines: keep the polygon parts
            polys = [p for p in g["geometries"] if p["type"] in ("Polygon", "MultiPolygon")]
            parts = [c for p in polys for c in ([p["coordinates"]] if p["type"] == "Polygon" else p["coordinates"])]
            g = {"type": "MultiPolygon", "coordinates": parts}
        props = {"code": r["code"], "family": r["family"], "family_label": r["family_label"], "zfam": r["zfam"]}
        props.update({t: r[t] for t in ZONING_TYPES})
        feats.append({"type": "Feature", "properties": props,
                      "geometry": {"type": g["type"], "coordinates": _round(g["coordinates"], nd)}})
    return {"type": "FeatureCollection", "verified": False,
            "note": "By-right statuses are an UNVERIFIED reading of Title 9 (config/zoning_rules.json): confirm in Title 9.",
            "families": [{"id": i, "label": lab} for i, lab, _ in DISPLAY_FAMILIES], "features": feats}


def build(path: Path = ZONING_MAP_JSON, max_bytes: int = 600_000, refresh: bool = False) -> dict:
    """Write the zoning map, coarsening (5 m / 5 dp -> 8 m / 5 dp -> 8 m / 4 dp) until it fits under max_bytes."""
    rules = load_zoning_rules()
    zoning = zoning_download(refresh)
    text = ""
    for tol, nd in ((5.0, 5), (8.0, 5), (8.0, 4)):
        fc = to_feature_collection(zoning_districts(zoning, rules, tol), nd)
        text = json.dumps(fc, separators=(",", ":"), ensure_ascii=False) + "\n"
        if len(text.encode()) <= max_bytes:
            break
    path.write_text(text)
    return {"path": str(path), "bytes": len(text.encode()), "features": len(fc["features"]), "tolerance_m": tol, "dp": nd}
