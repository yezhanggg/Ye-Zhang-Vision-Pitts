"""Six scoring factors (0-1 percentile ranks across City of Pittsburgh tracts) and a confidence tag for each.

Observed data only. Direction and importance are set by the fit matrix and weights in config/scoring.json.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from visionpitts.config import YEAR_NOW

LEVELS = ["high", "medium", "low"]
CV_MAX = 0.30
COVERAGE_MIN = 0.90
DOMINANT_MIN = 0.80
MVA_CHANGE_WEIGHT = 0.20
MVA_CHANGE_CLIP = 0.5
DISPLACEMENT_WEIGHTS = {"svi_overall": 0.30, "chas_burden_le50_share": 0.30, "eviction_filing_rate": 0.20, "hcv_per_renter": 0.20}
DISPLACEMENT_MIN_PARTS = 2
YEARS = {
    "need": 2022, "market_strength": 2021, "svi_overall": 2022, "chas_burden_le50_share": 2022,
    "eviction_filing_rate": 2025, "hcv_per_renter": 2025, "transit_access": 2026, "flood_exposure": 2024,
}


def pct(s: pd.Series) -> pd.Series:
    """Percentile rank in (0, 1] among tracts with a value; ties share the average rank; NaN stays NaN."""
    return s.astype(float).rank(method="average", pct=True)


def age_level(year: float) -> int:
    age = YEAR_NOW - year
    return 0 if age <= 2 else 1 if age <= 5 else 2


def tag(level: pd.Series, value: pd.Series) -> pd.Series:
    """0/1/2 (clipped) -> high/medium/low; None where the factor has no value."""
    lv = level.fillna(2).clip(0, 2).astype(int).map(dict(enumerate(LEVELS))).astype(object)
    lv[value.isna()] = None
    return lv


def const(level: int, index) -> pd.Series:
    return pd.Series(level, index=index, dtype=float)


def need(df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    value = pct(df["need_count"])
    down = (df["need_count_cv"] > CV_MAX).astype(int)
    return value, tag(const(age_level(YEARS["need"]), df.index) + down, value)


def market_strength(df: pd.DataFrame) -> tuple[pd.Series, pd.Series, pd.Series]:
    s21, s16 = df["mva21_score"], df["mva16_score"]
    change = (s21 - s16).clip(-MVA_CHANGE_CLIP, MVA_CHANGE_CLIP).fillna(0.0)  # no 2016 value: change term is 0 and flagged
    raw = (1 - MVA_CHANGE_WEIGHT) * s21 + MVA_CHANGE_WEIGHT * change
    value = pct(raw)
    down = ((df["mva21_coverage"] < COVERAGE_MIN) | (df["xw10_dominant"] < DOMINANT_MIN) | s16.isna()).astype(int)
    return value, tag(const(age_level(YEARS["market_strength"]), df.index) + down, value), raw


def displacement_risk(df: pd.DataFrame) -> tuple[pd.Series, pd.Series, pd.Series]:
    parts = {c: pct(df[c]) if c in df else pd.Series(np.nan, index=df.index) for c in DISPLACEMENT_WEIGHTS}
    comps = pd.DataFrame(parts)
    w = pd.Series(DISPLACEMENT_WEIGHTS)
    present = comps.notna()
    wsum = present.mul(w, axis=1).sum(axis=1)
    value = comps.fillna(0).mul(w, axis=1).sum(axis=1) / wsum.replace(0, np.nan)
    n = present.sum(axis=1)
    value = value.where(n >= DISPLACEMENT_MIN_PARTS)
    yrs = pd.Series({c: YEARS[c] for c in DISPLACEMENT_WEIGHTS})
    year = present.mul(w * yrs, axis=1).sum(axis=1) / wsum.replace(0, np.nan)
    level = year.fillna(YEAR_NOW - 10).map(age_level).astype(float)
    apportioned = comps["eviction_filing_rate"].notna()  # ZIP filings spread to tracts: an estimate, not an observation
    down = ((n < 3) | (df["chas_burden_le50_share_cv"] > CV_MAX) | apportioned).astype(int)
    return value, tag(level + down, value), n


def subsidy_eligible(df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    f = df[["qct", "dda", "oz", "cdbg"]].astype("boolean")
    value = f.any(axis=1, skipna=True).astype(float).where(f.notna().any(axis=1))
    new = f[["qct", "dda"]].fillna(False).any(axis=1)
    old_only = ~new & f[["oz", "cdbg"]].fillna(False).any(axis=1)  # 2018 designations on 2010 geography
    level = const(0, df.index) + old_only.astype(int)
    down = (old_only & (df["xw10_dominant"] < DOMINANT_MIN)).astype(int)
    return value, tag(level + down, value)


def compute(df: pd.DataFrame) -> pd.DataFrame:
    """Add the six factor columns, their `<factor>_conf` tags and a few helper columns to the wide table."""
    out = df.copy()
    out["need"], out["need_conf"] = need(out)
    out["market_strength"], out["market_strength_conf"], out["mva_raw"] = market_strength(out)
    out["displacement_risk"], out["displacement_risk_conf"], out["displacement_n"] = displacement_risk(out)
    out["subsidy_eligible"], out["subsidy_eligible_conf"] = subsidy_eligible(out)
    out["transit_access"] = pct(out["transit_departures_per_acre"])
    out["transit_access_conf"] = tag(const(age_level(YEARS["transit_access"]), out.index), out["transit_access"])
    out["flood_exposure"] = pct(out["flood_share_pct"])
    out["flood_exposure_conf"] = tag(const(age_level(YEARS["flood_exposure"]), out.index), out["flood_exposure"])
    return out
