"""ZIP-code (ZCTA) values for the six Equity & policy measures, built from the city's census tracts.

CHAS counts and the access measures exist only by tract, so a ZIP's value is an aggregate of the city's residential
tracts, weighted by 2020 housing units: each 2020 census block of a city tract is placed (at its representative point)
in one of the bundled ZCTAs (app/src/data/geo_zcta.json), and a tract's weight in a ZIP is the share of the tract's
housing units whose blocks fall there.

  burdened renters  sum over tracts of count x (tract's homes in the ZIP / tract's homes)
  jobs, school,     mean of the tract values weighted by the tract's homes in the ZIP
  transit, services
  rent gap          the ZIP's own median 2-bedroom asking rent (Dewey, 2025-26; whole ZIP, not only the city part)
                    minus the rent that fits, which the app computes from the HUD table; plus the ZIP's SAFMR

Edge ZIPs (under half their homes in the city) cover only their city part. Descriptive only; nothing enters a score.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from .config import APP_DATA, INTERIM, PROCESSED, RAW

BLOCKS_ZIP = RAW / "crosswalks" / "tiger" / "tl_2020_42_tabblock20.zip"
BLOCKS_CACHE = INTERIM / "blocks20_zcta.parquet"
OUT_JSON = APP_DATA / "equity_zip.json"
RENTS_CSV = PROCESSED / "asking_rents_zcta.csv"

#: Burden bands summed for each income level, as in app/src/lib/equity/measures.ts burdenedAt.
BURDEN_LEVELS: dict[str, tuple[str, ...]] = {
    "30": ("le30",),
    "50": ("le30", "b30_50"),
    "80": ("le30", "b30_50", "b50_80"),
    "100": ("b80_100", "gt100"),
}
#: Access measures: output key -> (place.json block, field), and the rounding digits.
MEANS: dict[str, tuple[str, str, int]] = {
    "jobs": ("access", "jobs_1mi", 0),
    "school": ("access", "school_mi", 2),
    "transit": ("transit", "freq_dist_mi", 2),
    "services": ("access", "services_halfmi", 1),
}
USABLE_CONF = {"high", "medium"}
EDGE_SHARE = 0.5


def block_zcta(zcta_fc: dict, refresh: bool = False) -> pd.DataFrame:
    """Every 2020 block in the ZCTAs' bounding box: GEOID20, tract, zcta (None outside every ZCTA), hu (housing units).

    Reads the statewide block file only within the ZCTAs' bounding box, and caches the result.
    """
    if BLOCKS_CACHE.exists() and not refresh:
        return pd.read_parquet(BLOCKS_CACHE)
    import geopandas as gpd

    z = gpd.GeoDataFrame.from_features(zcta_fc["features"], crs="EPSG:4326")
    b = gpd.read_file(f"zip://{BLOCKS_ZIP}", bbox=tuple(z.total_bounds))
    z = z.to_crs(b.crs)
    pts = gpd.GeoDataFrame({"GEOID20": b["GEOID20"].values, "hu": b["HOUSING20"].astype(int).values}, geometry=b.geometry.representative_point().values, crs=b.crs)
    j = gpd.sjoin(pts, z[["GEOID", "geometry"]], how="left", predicate="within")
    out = pd.DataFrame({"GEOID20": j["GEOID20"].values, "tract": j["GEOID20"].str[:11].values, "zcta": j["GEOID"].values, "hu": j["hu"].values})
    out = out.drop_duplicates("GEOID20")
    out.to_parquet(BLOCKS_CACHE, index=False)
    return out


def crosswalk(blocks: pd.DataFrame, city_tracts: set[str]) -> tuple[pd.DataFrame, pd.Series]:
    """(tract x zcta rows with hu and w = the tract's share of homes in the ZIP, total homes per ZIP from all blocks).

    `blocks` must hold every block of the city tracts (with its zcta) and every block of the ZIPs for the totals.
    A tract's homes outside every ZIP stay in its denominator, so its weights sum to at most 1.
    """
    zip_total = blocks.dropna(subset=["zcta"]).groupby("zcta")["hu"].sum()
    c = blocks[blocks["tract"].isin(city_tracts)]
    g = c.dropna(subset=["zcta"]).groupby(["tract", "zcta"], as_index=False)["hu"].sum()
    tract_hu = c.groupby("tract")["hu"].sum()
    g["w"] = g["hu"] / g["tract"].map(tract_hu)
    g = g[g["hu"] > 0].reset_index(drop=True)
    return g, zip_total


def _num(v) -> float | None:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and v == v else None


def burdened(p: dict | None, bands: tuple[str, ...], field: str = "burden30") -> float | None:
    """Sum of bands.<id>.<field> (burden30, or hh for all renters) over `bands`, or None when any is missing."""
    got = (p or {}).get("bands") or {}
    xs = [_num((got.get(b) or {}).get(field)) for b in bands]
    return None if any(x is None for x in xs) else float(sum(x for x in xs if x is not None))


def aggregate(xw: pd.DataFrame, zip_total: pd.Series, place: dict[str, dict], rents: pd.DataFrame | None = None, safmr: dict[str, list[int]] | None = None, all_zips: list[str] | None = None) -> dict[str, dict]:
    """Per ZIP: city homes, share of the ZIP's homes in the city, contributing tracts, burdened counts, weighted means,
    asking rent and SAFMR. Pure: `xw` from crosswalk(), `place` = place.json (tract -> measures). ZIPs in `all_zips`
    with no city tract homes get a row with n = 0 and no measure values."""
    rents_by = {} if rents is None else {str(r["GEOID"]).zfill(5): r for _, r in rents.iterrows()}
    out: dict[str, dict] = {}
    groups = {str(z): g for z, g in xw.groupby("zcta")}
    # each tract's main ZIP: the one holding most of its 2020 homes (ties: the first ZIP in code order)
    main_zip = xw.sort_values(["tract", "hu", "zcta"], ascending=[True, False, True]).drop_duplicates("tract").set_index("tract")["zcta"].astype(str)
    for z in sorted(set(groups) | set(all_zips or [])):
        g = groups.get(z, xw.iloc[0:0])
        city_hu = float(g["hu"].sum())
        total = float(zip_total.get(z, city_hu))
        rec: dict = {
            "hu": int(round(city_hu)),
            "share": round(min(1.0, city_hu / total), 3) if total else 0.0,
            "n": int(len(g)),
            "t": {t: round(float(w), 3) for t, w in zip(g["tract"], g["w"])},
            "main": sorted(t for t in g["tract"] if main_zip.get(t) == z),
        }
        rec["edge"] = rec["share"] < EDGE_SHARE
        b: dict[str, int | None] = {}
        for lvl, ids in BURDEN_LEVELS.items():
            parts = [(burdened(place.get(t), ids), w) for t, w in zip(g["tract"], g["w"])]
            have = [v * w for v, w in parts if v is not None]
            b[lvl] = int(round(sum(have))) if have else None
        rec["burdened"] = b
        rn: dict[str, int | None] = {}
        for lvl, ids in BURDEN_LEVELS.items():
            parts = [(burdened(place.get(t), ids, "hh"), w) for t, w in zip(g["tract"], g["w"])]
            have = [v * w for v, w in parts if v is not None]
            rn[lvl] = int(round(sum(have))) if have else None
        rec["renters"] = rn
        for key, (block, field, nd) in MEANS.items():
            num = den = 0.0
            for t, hu in zip(g["tract"], g["hu"]):
                v = _num(((place.get(t) or {}).get(block) or {}).get(field))
                if v is not None:
                    num += v * hu
                    den += hu
            rec[key] = (round(num / den) if nd == 0 else round(num / den, nd)) if den > 0 else None
        r = rents_by.get(z)
        ask = _num(r.get("rent_2br_2025_26")) if r is not None else None
        conf = str(r.get("asking_rents_conf")) if r is not None and isinstance(r.get("asking_rents_conf"), str) else None
        rec["asking_2br"] = int(round(ask)) if ask is not None else None
        rec["asking_n"] = int(r["n_units_2025_26"]) if r is not None and _num(r.get("n_units_2025_26")) is not None else None
        rec["asking_conf"] = conf
        s = (safmr or {}).get(z)
        rec["safmr_2br"] = int(s[2]) if s else None
        out[z] = rec
    return dict(sorted(out.items()))


def compact(zips: dict[str, dict]) -> dict[str, dict]:
    """The bundled form, as small as possible: h city homes, p share of the ZIP's homes in the city, t city tracts
    (county tract codes as integers, most of the tract inside the ZIP first), b burdened renters at 30/50/80/100,
    j jobs, s school mi, tr transit mi, sv services, a the 2-bedroom asking rent (only when high or medium confidence),
    m the positions in t of the tracts whose main ZIP (most of their 2020 homes) this is, r renter households at
    30/50/80/100 (same weighting as b).
    Missing values are left out; edge ZIPs are p < 0.5; the SAFMR stays in hud_2026.json."""
    out: dict[str, dict] = {}
    for z, r in zips.items():
        c: dict = {"h": r["hu"], "p": r["share"]}
        if r["t"]:
            order = [t for t, _ in sorted(r["t"].items(), key=lambda kv: -kv[1])]
            c["t"] = [int(t[5:]) for t in order]
            main = set(r.get("main") or [])
            if main:
                c["m"] = [i for i, t in enumerate(order) if t in main]
        b = [r["burdened"][k] for k in BURDEN_LEVELS]
        if any(v is not None for v in b):
            c["b"] = b
        rn = [(r.get("renters") or {}).get(k) for k in BURDEN_LEVELS]
        if any(v is not None for v in rn):
            c["r"] = rn
        for key, short in (("jobs", "j"), ("school", "s"), ("transit", "tr"), ("services", "sv")):
            if r[key] is not None:
                c[short] = r[key]
        if r["asking_2br"] is not None and r["asking_conf"] in USABLE_CONF:
            c["a"] = r["asking_2br"]
        out[z] = c
    return out


def build(refresh: bool = False) -> dict:
    """Read the bundled ZCTAs, tracts, place.json, HUD SAFMR and ZIP asking rents; return {tracts, city_hu, zips}."""
    zfc = json.loads((APP_DATA / "geo_zcta.json").read_text())
    tracts = json.loads((APP_DATA / "tracts.json").read_text())["features"]
    city = {f["properties"]["GEOID"] for f in tracts if f["properties"].get("residential")}
    place = json.loads((APP_DATA / "place.json").read_text())
    hud = json.loads((APP_DATA / "hud_2026.json").read_text())
    rents = pd.read_csv(RENTS_CSV, dtype={"GEOID": str}) if RENTS_CSV.exists() else None
    blocks = block_zcta(zfc, refresh=refresh)
    xw, zip_total = crosswalk(blocks, city)
    zips = aggregate(xw, zip_total, place, rents, hud.get("safmr"), [str(f["properties"]["GEOID"]) for f in zfc["features"]])
    return {"tracts": len(city), "city_hu": int(xw["hu"].sum()), "zips": zips}


def write(doc: dict, path: Path = OUT_JSON) -> int:
    """Write the compact bundle ({"z": {zip: compact record}}); returns its size in bytes."""
    text = json.dumps({"z": compact(doc["zips"])}, separators=(",", ":"), ensure_ascii=False)
    path.write_text(text)
    return len(text.encode())
