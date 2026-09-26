"""The C layer: market pressure from neighbors, the need x market-change bivariate class, and the flip list.

All of this is derived from observed data. None of it enters the score; it drives map modes and the watch list.
"""
from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd

from visionpitts import scoring
from visionpitts.factors import pct


def queen_neighbors(tracts: gpd.GeoDataFrame) -> dict[str, list[str]]:
    """Queen contiguity (shared edge or corner) among the study tracts, as GEOID -> [GEOID]."""
    t = tracts[["GEOID", "geometry"]].reset_index(drop=True)
    j = gpd.sjoin(t, t, how="inner", predicate="intersects")
    j = j[j["GEOID_left"] != j["GEOID_right"]]
    nb = j.groupby("GEOID_left")["GEOID_right"].apply(lambda s: sorted(set(s))).to_dict()
    return {g: nb.get(g, []) for g in t["GEOID"]}


def spatial_lag(values: pd.Series, nbrs: dict[str, list[str]]) -> pd.Series:
    """Row-standardized mean of neighbors' values, ignoring neighbors without data. NaN if none."""
    out = {}
    for g, ns in nbrs.items():
        v = values.reindex(ns).dropna()
        out[g] = v.mean() if len(v) else np.nan
    return pd.Series(out).reindex(values.index)


def tercile(p: pd.Series) -> pd.Series:
    return pd.cut(p, [-np.inf, 1 / 3, 2 / 3, np.inf], labels=["L", "M", "H"]).astype(object).where(p.notna(), None)


def direction(change: pd.Series, band: float) -> pd.Series:
    d = pd.Series(np.where(change > band, "rising", np.where(change < -band, "falling", "flat")), index=change.index, dtype=object)
    return d.where(change.notna(), None)


def compute(df: pd.DataFrame, tracts: gpd.GeoDataFrame, cfg: dict) -> pd.DataFrame:
    """Add market_lag, market_pressure(+_pct), need_tercile, market_direction, bivariate_class, watch_list, n_neighbors."""
    out = df.copy()
    nbrs = queen_neighbors(tracts)
    out["n_neighbors"] = pd.Series({g: len(n) for g, n in nbrs.items()}).reindex(out.index)
    out["market_lag"] = spatial_lag(out["market_strength"], nbrs)
    out["market_pressure"] = out["market_lag"] - out["market_strength"]
    out["market_pressure_pct"] = pct(out["market_pressure"])
    out["need_tercile"] = tercile(out["need"])
    out["market_direction"] = direction(out["mva_change"], cfg["pressure"]["flat_band"])
    both = out["need_tercile"].notna() & out["market_direction"].notna()
    out["bivariate_class"] = (out["need_tercile"].astype(str) + "-" + out["market_direction"].astype(str)).where(both, None)
    out["watch_list"] = (out["bivariate_class"] == "H-rising").fillna(False)
    return out


def flip_list(df: pd.DataFrame, cfg: dict, a: str = "balanced", b: str = "anti_displacement") -> pd.DataFrame:
    """Tracts whose top typology differs between two presets."""
    sa = scoring.score_table(df, scoring.preset_weights(cfg, a), cfg)
    sb = scoring.score_table(df, scoring.preset_weights(cfg, b), cfg)
    f = pd.DataFrame({"from": sa["top"], "to": sb["top"]})
    f = f[(f["from"] != f["to"]) & f["from"].notna() & f["to"].notna()]
    f.index.name = "GEOID"
    return f.reset_index()
