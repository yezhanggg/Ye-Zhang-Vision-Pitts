"""Eight scoring factors and a confidence tag for each (scoring v0.4.0).

Seven factors are 0-1 percentile ranks across the ranked City of Pittsburgh tracts. Subsidy eligibility is a grade
(0, 0.5 or 1), not a percentile. Observed data only: direction and importance are set by the fit matrix and the
weights in config/scoring.json. How each factor is built is switched by `factor_options` in the same file; the
defaults below reproduce v0.4.0 when no config is passed.
"""
from __future__ import annotations

import copy

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
    "senior_demand": 2024, "small_multifamily_stock": 2024,
}
# Factors that are the percentile of one ACS share: factor id -> column in data/processed/acs_tract.csv.
ACS_SHARE_FACTORS = {"senior_demand": "age65_share", "small_multifamily_stock": "units_2_4_share"}
SUBSIDY_TIERS = {"qct_or_dda": 1.0, "oz_or_cdbg_only": 0.5, "none": 0.0}
DEFAULT_OPTIONS = {
    "subsidy": {"mode": "graded", "tiers": dict(SUBSIDY_TIERS)},
    "transit": {"basis": "household", "household_floor": 400},
    "flood": {"base_confidence": "medium", "implausible_share_pct": 50},
    "displacement": {"eviction_zip_dominant_min": 0.8},
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


def options(cfg: dict | None = None) -> dict:
    """`factor_options` from the scoring config laid over the v0.4.0 defaults (a missing block or key keeps its default)."""
    out = copy.deepcopy(DEFAULT_OPTIONS)
    for block, vals in ((cfg or {}).get("factor_options") or {}).items():
        if block in out and isinstance(vals, dict):
            out[block].update(vals)
    return out


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


def displacement_risk(df: pd.DataFrame, zip_dominant_min: float = 0.8) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Composite of up to four percentile-ranked parts, renormalized over the parts a tract has.

    Confidence (rule R-5) drops one level only when fewer than 3 parts are present, the burden CV is above 30%, or
    the eviction part is an estimate split across ZIP codes: the tract's housing sits in more than one ZIP and no
    single ZIP holds at least `zip_dominant_min` of it. A tract inside one ZIP keeps its level.
    """
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
    if "eviction_zip_dominant" in df:
        dominant = df["eviction_zip_dominant"].astype(float)
        several = df["eviction_zip_n"].astype(float) > 1 if "eviction_zip_n" in df else pd.Series(True, index=df.index)
        split = apportioned & several & ~(dominant >= zip_dominant_min)  # an unknown share counts as not dominant
    else:
        split = apportioned  # no ZIP shares in the table: every apportioned estimate is treated as split
    down = ((n < 3) | (df["chas_burden_le50_share_cv"] > CV_MAX) | split).astype(int)
    return value, tag(level + down, value), n


def subsidy_eligible(df: pd.DataFrame, mode: str = "graded", tiers: dict | None = None) -> tuple[pd.Series, pd.Series]:
    """Graded: 1.0 for a 2026 designation (QCT or Small-Area DDA), 0.5 when the only designation is an Opportunity
    Zone or CDBG area (2018, carried from 2010 geography), 0 for none. `mode="flag"` is the v0.3.0 switch (any
    designation = 1). The value is NOT percentile-ranked: it enters the score as the grade itself."""
    f = df[["qct", "dda", "oz", "cdbg"]].astype("boolean")
    new = f[["qct", "dda"]].fillna(False).any(axis=1).astype(bool)
    old_only = ~new & f[["oz", "cdbg"]].fillna(False).any(axis=1).astype(bool)  # 2018 designations on 2010 geography
    if mode == "graded":
        t = {**SUBSIDY_TIERS, **(tiers or {})}
        value = pd.Series(float(t["none"]), index=df.index)
        value[old_only] = float(t["oz_or_cdbg_only"])
        value[new] = float(t["qct_or_dda"])
    elif mode == "flag":
        value = (new | old_only).astype(float)
    else:
        raise ValueError(f"factor_options.subsidy.mode must be 'graded' or 'flag', not {mode!r}")
    value = value.where(f.notna().any(axis=1))
    level = const(0, df.index) + old_only.astype(int)
    down = (old_only & (df["xw10_dominant"] < DOMINANT_MIN)).astype(int)
    return value, tag(level + down, value)


def transit_access(df: pd.DataFrame, basis: str = "household", floor: float = 400) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Percentile of weekday departures within 400 m per household (or per acre of land, the v0.3.0 basis).

    Households are floored at `floor` so a tract with very few households cannot rank first on a tiny denominator.
    Confidence drops one level where the floor was applied or the household count has a CV above 30%.
    Returns (value, confidence, departures per household); the third is kept whatever the basis.
    """
    hh = df["households"].astype(float)
    den = hh.clip(lower=floor)
    per_hh = df["transit_departures"].astype(float) / den.where(den > 0)
    if basis == "household":
        raw = per_hh
        cv = df["households_cv"].astype(float) if "households_cv" in df else pd.Series(np.nan, index=df.index)
        down = ((hh < floor) | (cv > CV_MAX)).astype(int)
    elif basis == "acre":
        raw = df["transit_departures_per_acre"]
        down = const(0, df.index)
    else:
        raise ValueError(f"factor_options.transit.basis must be 'household' or 'acre', not {basis!r}")
    value = pct(raw)
    return value, tag(const(age_level(YEARS["transit_access"]), df.index) + down, value), per_hh


def flood_exposure(df: pd.DataFrame, base_level: str | int = "medium", implausible_pct: float = 50) -> tuple[pd.Series, pd.Series]:
    """Percentile of the HAND inundation share. A terrain screening model: the tag starts at `base_level` (never
    better than the data's age allows) and drops one level where more than `implausible_pct` % of the land reads as
    inundated, because readings that high are not plausible for these neighborhoods."""
    base = LEVELS.index(base_level) if isinstance(base_level, str) else int(base_level)
    base = max(base, age_level(YEARS["flood_exposure"]))
    value = pct(df["flood_share_pct"])
    down = (df["flood_share_pct"] > implausible_pct).astype(int)
    return value, tag(const(base, df.index) + down, value)


def acs_share_factor(df: pd.DataFrame, col: str, year: float) -> tuple[pd.Series, pd.Series]:
    """Percentile of an ACS share. Confidence starts from the data's age and drops one level where the CV is above
    30% or cannot be computed (a share of zero has no CV, so its reliability cannot be shown)."""
    if col not in df or f"{col}_cv" not in df:
        raise KeyError(f"columns {col!r} and '{col}_cv' are needed; join ingest.acs_shares() onto the table first")
    value = pct(df[col])
    cv = df[f"{col}_cv"].astype(float)
    down = ((cv > CV_MAX) | cv.isna()).astype(int)
    return value, tag(const(age_level(year), df.index) + down, value)


def compute(df: pd.DataFrame, cfg: dict | None = None) -> pd.DataFrame:
    """Add the factor columns, their `<factor>_conf` tags and a few helper columns to the wide table.

    `cfg` is the scoring config; its `factor_options` switch how factors are built and its factor list decides
    whether the two ACS share factors are computed. With no config, all eight factors are built the v0.4.0 way.
    """
    o = options(cfg)
    defs = {f["id"]: f for f in (cfg or {}).get("factors", [])}
    out = df.copy()
    out["need"], out["need_conf"] = need(out)
    out["market_strength"], out["market_strength_conf"], out["mva_raw"] = market_strength(out)
    out["displacement_risk"], out["displacement_risk_conf"], out["displacement_n"] = displacement_risk(
        out, o["displacement"]["eviction_zip_dominant_min"])
    out["subsidy_eligible"], out["subsidy_eligible_conf"] = subsidy_eligible(out, o["subsidy"]["mode"], o["subsidy"]["tiers"])
    out["transit_access"], out["transit_access_conf"], out["transit_departures_per_hh"] = transit_access(
        out, o["transit"]["basis"], o["transit"]["household_floor"])
    out["flood_exposure"], out["flood_exposure_conf"] = flood_exposure(
        out, o["flood"]["base_confidence"], o["flood"]["implausible_share_pct"])
    for fid, col in ACS_SHARE_FACTORS.items():
        if cfg is not None and fid not in defs:
            continue  # dropped from the config (the "core" and "minimal" variants)
        d = defs.get(fid, {})
        out[fid], out[f"{fid}_conf"] = acs_share_factor(out, d.get("raw_field") or col, d.get("year") or YEARS[fid])
    return out
