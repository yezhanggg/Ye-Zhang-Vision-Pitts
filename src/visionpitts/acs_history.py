"""ACS 5-year history, end-years 2014-2024, for the Explore charts. Information only, never scored.

Every catalogue variable is rebuilt for every vintage with the same math as the current year (acs_levels.derive).
Vintages 2014-2019 are published on 2010 tracts; they are carried to 2020 tracts with the housing-unit block
crosswalk before deriving: counts are apportioned by the share of a 2010 tract's 2020 housing units that sits in
each 2020 tract (MOE root-sum-square of the apportioned parts), medians are housing-unit-weighted means. Shares
are derived after the carry, so their MOE math stays the ACS proportion formula. ZCTAs join on code (a 2010 ZCTA
code that vanished in 2020 simply has no later value); municipalities, the county and the city keep their GEOIDs.

Caveats the app prints: consecutive 5-year windows overlap by four years; dollars are in each vintage's own
dollars; carried tract values are flagged when less than 90% of a 2020 tract's housing came from one 2010 tract.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import requests

from visionpitts import acs_levels as al
from visionpitts.config import CENSUS_API_KEY, STATE_FIPS

YEARS: list[int] = list(range(2014, 2025))
HISTORY_LEVELS: tuple[str, ...] = ("tract", "zcta", "muni", "county", "city")
# Variables bundled with the app (est for all; MOE bands only for the six the charts draw with a band).
HISTORY_VARS: list[str] = ["pop", "households", "med_hh_income", "poverty_share", "renter_share", "med_gross_rent",
                           "med_home_value", "rent_burden30_share", "vacancy_share", "bachelors_share",
                           "black_nh_share", "white_nh_share", "transit_share", "no_vehicle_share"]
BAND_VARS: list[str] = ["med_hh_income", "med_gross_rent", "med_home_value", "renter_share", "poverty_share",
                        "rent_burden30_share"]
FIRST_2020_VINTAGE = 2020      # ACS 5-year 2016-2020 and later use 2020 geography
XW_DOMINANT_FLAG = 0.9         # below this share the 2020 tract is assembled from several 2010 tracts
BUNDLE_BUDGET = 520_000        # bytes for app/src/data/acs_history.json (measured 483 KB for 14 vars x 11 years)


def api_url(year: int) -> str:
    return f"https://api.census.gov/data/{year}/acs/acs5"


def cache_path(level: str, year: int):
    return al.ACS_CACHE / f"acs5_{year}_{level}.csv"


def geo_clause(level: str, year: int, zctas: list[str] | None = None) -> dict[str, str]:
    """Same as the current year, except that ZCTAs before the 2020 vintage are asked for by state."""
    if level == "zcta" and year < FIRST_2020_VINTAGE:
        return {"for": "zip code tabulation area:*", "in": f"state:{STATE_FIPS}"}
    return al.geo_clause(level, zctas)


def fetch_year(level: str, year: int, *, zctas: list[str] | None = None, session: requests.Session | None = None,
               refresh: bool = False) -> pd.DataFrame:
    """Raw E/M strings for one level and vintage, county-wide, cached like the current year."""
    path = cache_path(level, year)
    needed = [f"{s}{x}" for s in al.raw_vars() for x in ("E", "M")]
    if path.exists() and not refresh:
        cached = pd.read_csv(path, dtype=str).set_index("GEOID").sort_index()
        if all(c in cached.columns for c in needed):
            return cached
    session = session or requests.Session()
    frames = []
    for stems in al.batches(al.raw_vars()):
        cols = [f"{s}{x}" for s in stems for x in ("E", "M")]
        params = {"get": ",".join(cols), **geo_clause(level, year, zctas)}
        if CENSUS_API_KEY:
            params["key"] = CENSUS_API_KEY
        frame = al.rows_to_frame(al.request_rows(session, params, url=api_url(year)), level)
        frames.append(frame[[c for c in cols if c in frame.columns]])  # the by-state ZCTA query also returns `state`
    df = pd.concat(frames, axis=1) if frames else pd.DataFrame()
    if level == "zcta" and zctas is not None:
        df = df[df.index.isin(zctas)]
    df.index.name = "GEOID"
    al.ACS_CACHE.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index_label="GEOID")
    return df


# ------------------------------------------------------------------------------------- 2010 -> 2020
def crosswalk_weights(xw: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Housing-unit weights between 2010 and 2020 tracts from the block crosswalk (block20 -> tract10 with hu).

    Returns (W_count, W_mean), both indexed by tract10 with 2020 tracts as columns:
    W_count[t10, t20] = share of t10's housing units that now sit in t20 (rows sum to 1) -> apportion counts;
    W_mean[t10, t20]  = share of t20's housing units that came from t10 (columns sum to 1) -> weighted means.
    """
    g = xw.groupby(["tract10", "tract20"])["hu"].sum().unstack(fill_value=0).astype(float)
    w_count = g.div(g.sum(axis=1).replace(0, np.nan), axis=0).fillna(0)
    w_mean = g.div(g.sum(axis=0).replace(0, np.nan), axis=1).fillna(0)
    return w_count, w_mean


def carry_counts(est: pd.DataFrame, moe: pd.DataFrame, w_count: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Apportion 2010-tract counts to 2020 tracts; MOE = sqrt(sum of (w * moe)^2). Missing inputs propagate."""
    w = w_count.reindex(est.index).fillna(0)
    e = est.astype(float)
    m = moe.astype(float)
    out_e = w.T @ e.fillna(0)
    out_m = np.sqrt((w.T ** 2) @ (m.fillna(0) ** 2))
    covered = (w.T @ e.notna().astype(float))
    total = w.T.sum(axis=1)
    ok = covered.ge(total.to_numpy()[:, None] * 0.999)  # every contributing 2010 tract had a value
    return out_e.where(ok), out_m.where(ok)


def carry_means(est: pd.DataFrame, moe: pd.DataFrame, w_mean: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Housing-unit-weighted mean of 2010-tract medians onto 2020 tracts, renormalised over tracts with a value."""
    w = w_mean.reindex(est.index).fillna(0)
    e = est.astype(float)
    m = moe.astype(float)
    has = e.notna().astype(float)
    denom = w.T @ has
    out_e = (w.T @ e.fillna(0)).div(denom.replace(0, np.nan))
    out_m = np.sqrt((w.T ** 2) @ (m.fillna(0) ** 2)).div(denom.replace(0, np.nan))
    return out_e, out_m


def median_stems() -> list[str]:
    return sorted({v.num[0] for v in al.CATALOGUE if v.kind == "median"})


def carry_raw_to_2020(raw10: pd.DataFrame, xw: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """A cleaned 2010-tract E/M frame -> the same columns on 2020 tracts, plus each 2020 tract's dominant share."""
    w_count, w_mean = crosswalk_weights(xw)
    meds = set(median_stems())
    stems = sorted({c[:-1] for c in raw10.columns})
    est = raw10[[f"{s}E" for s in stems]].rename(columns=lambda c: c[:-1])
    moe = raw10[[f"{s}M" for s in stems]].rename(columns=lambda c: c[:-1])
    count_cols = [s for s in stems if s not in meds]
    mean_cols = [s for s in stems if s in meds]
    e1, m1 = carry_counts(est[count_cols], moe[count_cols], w_count)
    e2, m2 = carry_means(est[mean_cols], moe[mean_cols], w_mean)
    out = pd.concat([e1.add_suffix("E"), m1.add_suffix("M"), e2.add_suffix("E"), m2.add_suffix("M")], axis=1)
    out = out[[f"{s}{x}" for s in stems for x in ("E", "M")]]
    out.index.name = "GEOID"
    dominant = w_mean.max(axis=0).rename("xw_dominant")
    return out.sort_index(), dominant.reindex(out.index)


def build_year(level: str, year: int, raw: pd.DataFrame, xw: pd.DataFrame | None) -> pd.DataFrame:
    """Derived, rounded variables for one level-year on 2020 geography (tracts carried when the vintage is 2010)."""
    cleaned = al.clean_raw(raw)
    dominant = None
    if level == "tract" and year < FIRST_2020_VINTAGE:
        if xw is None:
            raise ValueError("the block crosswalk is needed for tract vintages before 2020")
        cleaned, dominant = carry_raw_to_2020(cleaned, xw)
    out = al.round_values(al.derive(cleaned))
    out.insert(0, "year", year)
    if dominant is not None:
        out["xw_dominant"] = dominant.round(3)
    return out


# ---------------------------------------------------------------------------------------------- bundle
def bundle(tables: dict[str, pd.DataFrame], geoids: dict[str, list[str]], years: list[int] = YEARS) -> dict:
    """Compact JSON for the app: {meta, levels: {level: {geoid: {var: [[est...], [moe...] | null]}}}}.

    `tables[level]` is the wide history (index GEOID, column `year`) and `geoids[level]` the units to bundle.
    """
    out: dict = {"meta": {"years": years, "vars": HISTORY_VARS, "band_vars": BAND_VARS,
                          "first_2020_vintage": FIRST_2020_VINTAGE, "xw_flag": XW_DOMINANT_FLAG},
                 "levels": {}, "xw_dominant": {}}
    for level, df in tables.items():
        by_unit: dict[str, dict] = {}
        sub = df[df.index.isin(geoids[level])]
        for g, grp in sub.groupby(level=0):
            yrs = grp.set_index("year")
            rec: dict[str, list] = {}
            for v in HISTORY_VARS:
                est = [al.jsonable(yrs[v].get(y)) if v in yrs else None for y in years]
                mcol = f"{v}_moe"
                moe = [al.jsonable(yrs[mcol].get(y)) if mcol in yrs else None for y in years] if v in BAND_VARS else None
                rec[v] = [est, moe]
            by_unit[str(g)] = rec
            if "xw_dominant" in yrs:
                d = yrs["xw_dominant"].dropna()
                if len(d):
                    out["xw_dominant"][str(g)] = float(d.min())
        out["levels"][level] = by_unit
    return out
