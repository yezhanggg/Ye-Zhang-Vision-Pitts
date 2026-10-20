"""Sun for open space, by tract: how much direct sun the vacant lots and the park-zoned lots of each city tract get.

Reads the lot figures step 15 writes (nopush/shadow/parcels/parcel_shadow.gpkg, kept on this machine) and the city's
zoning districts (app/src/data/zoning_districts.json, family "parks"), and rolls them up per tract. Only the roll-up
is published; the lot files stay on the machine.

The yardstick (docs/data/shadow.md, "Sun for open space"): UK BRE guidance asks that at least half of an outdoor
amenity space get two or more hours of sun on March 21. The run's September 22 has the same sun. A lot's hours with
at least half of it in sun are (1 - mostly shaded) x steps x 0.5, a proxy for "half the space": the half in sun may
move during the day. NYC CEQR's 6 hours (lawns, play fields) and 4 hours (planted areas) are shown as a stricter
reference, on the lot's own hours of direct sun.
"""

from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd

# Half-hour steps in each day of the shadow run (docs/data/shadow.md).
STEPS = {"jun": 29, "sep": 24, "dec": 18}
BRE_HOURS = 2.0
CEQR_LAWN = 6.0
CEQR_PLANTED = 4.0
GROUPS = ("vacant", "park")


def half_sun_hours(df: pd.DataFrame, day: str) -> pd.Series:
    """Hours with at least half the lot in sun: the steps not "mostly shaded", each half an hour."""
    return (1 - df[f"mostly_{day}"]) * STEPS[day] * 0.5


def mark_parks(lots: gpd.GeoDataFrame, zoning: gpd.GeoDataFrame) -> pd.Series:
    """True where a lot's representative point is in a parks-family zoning district."""
    parks = zoning[zoning["family"] == "parks"].to_crs(lots.crs)
    if parks.empty:
        return pd.Series(False, index=lots.index)
    pts = gpd.GeoDataFrame(geometry=lots.representative_point(), crs=lots.crs)
    hit = gpd.sjoin(pts, parks[["geometry"]], how="left", predicate="within")
    return hit.groupby(level=0)["index_right"].apply(lambda s: s.notna().any()).reindex(lots.index, fill_value=False)


def group_figures(df: pd.DataFrame) -> dict | None:
    """One group's figures (rated lots only), or None when the tract has none."""
    df = df[df["rated"].astype(bool)]
    if df.empty:
        return None
    acres = df["sqft"] / 43560
    bre = half_sun_hours(df, "sep") >= BRE_HOURS
    winter = half_sun_hours(df, "dec") >= BRE_HOURS
    return {
        "lots": int(len(df)),
        "acres": round(float(acres.sum()), 1),
        "sun_h": {d: round(float(np.median(df[f"sun_h_{d}"])), 1) for d in STEPS},
        "bre": int(bre.sum()),
        "bre_acres": round(float(acres[bre].sum()), 1),
        "winter2": int(winter.sum()),
        "ceqr6": int((df["sun_h_sep"] >= CEQR_LAWN).sum()),
        "ceqr4": int((df["sun_h_sep"] >= CEQR_PLANTED).sum()),
    }


def build(lots: pd.DataFrame, built: str) -> dict:
    """The published file: city figures and, per tract, the vacant and park groups. `lots` carries `park` (bool)."""
    def groups(df: pd.DataFrame) -> dict:
        out = {}
        for g in GROUPS:
            sel = df[df["park"]] if g == "park" else df[(df["use"] == "vacant") & ~df["park"]]
            f = group_figures(sel)
            if f:
                out[g] = f
        return out

    tracts = {geoid: groups(df) for geoid, df in lots.groupby("geoid")}
    return {
        "built": built,
        "yardstick": {
            "bre_hours": BRE_HOURS,
            "day": "sep22",
            "rule": "At least half of the space gets two or more hours of direct sun on the equinox (UK BRE, Site layout planning for daylight and sunlight, BR 209). Not a Pittsburgh rule.",
            "ceqr_lawn": CEQR_LAWN,
            "ceqr_planted": CEQR_PLANTED,
        },
        "city": groups(lots),
        "tracts": {k: v for k, v in tracts.items() if v},
    }
