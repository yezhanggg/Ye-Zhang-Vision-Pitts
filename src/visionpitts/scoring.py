"""Typology scoring engine. Mirrors app/src/lib/scoring.ts; the parity fixture is tests/fixtures/scoring_cases.json.

S(t, k) = sum_f w_f * c(x_tf, d_kf) / sum_f w_f * |d_kf|   over factors f with data for tract t and w_f > 0
c(x, d) = d * x          if d >= 0   (typology benefits from a high factor value)
        = |d| * (1 - x)  if d <  0   (typology benefits from a low factor value)

The denominator makes S a weighted-average fit in [0, 1], so a typology with more or larger fit entries is not
favored just for having them. Factor values x are observed percentiles; w and d are value judgments.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd


def contribution(x: float, d: float) -> float:
    return d * x if d >= 0 else abs(d) * (1.0 - x)


def _has(v) -> bool:
    return v is not None and not (isinstance(v, float) and math.isnan(v))


def active_factors(x: dict, weights: dict, cfg: dict) -> list[str]:
    return [f["id"] for f in cfg["factors"] if _has(x.get(f["id"])) and weights.get(f["id"], 0) > 0]


def score(x: dict, weights: dict, cfg: dict) -> dict[str, float | None]:
    """Per-typology score in [0, 1] in config order; None where no weighted factor has data."""
    fit = cfg["fit"]["matrix"]
    act = active_factors(x, weights, cfg)
    out: dict[str, float | None] = {}
    for t in cfg["typologies"]:
        k = t["id"]
        den = sum(weights[f] * abs(fit[k][f]) for f in act)
        num = sum(weights[f] * contribution(float(x[f]), fit[k][f]) for f in act)
        out[k] = num / den if den > 0 else None
    return out


def parts(x: dict, weights: dict, cfg: dict, k: str) -> list[dict]:
    """Each factor's additive share of typology k's score (for the 'why' rows)."""
    fit = cfg["fit"]["matrix"][k]
    act = active_factors(x, weights, cfg)
    den = sum(weights[f] * abs(fit[f]) for f in act)
    if den <= 0:
        return []
    return [{"factor": f, "x": float(x[f]), "w": weights[f], "d": fit[f], "contrib": weights[f] * contribution(float(x[f]), fit[f]) / den} for f in act]


def ranking(scores: dict[str, float | None]) -> list[str]:
    order = list(scores)
    return sorted((k for k in order if scores[k] is not None), key=lambda k: (-scores[k], order.index(k)))


def top(x: dict, weights: dict, cfg: dict) -> str | None:
    r = ranking(score(x, weights, cfg))
    return r[0] if r else None


def rank_stability(x: dict, weights: dict, cfg: dict, seed: int | None = None, draws: int | None = None,
                   concentration: float | None = None) -> dict:
    """Share of Dirichlet weight perturbations (centered on the user's weights) under which the top pick holds."""
    s = cfg["scoring"]
    draws = draws or s["stability_draws"]
    concentration = concentration or s["stability_concentration"]
    seed = s.get("stability_seed", 42) if seed is None else seed
    base = ranking(score(x, weights, cfg))
    act = active_factors(x, weights, cfg)
    if not base:
        return {"top": None, "stability": None, "draws": 0}
    if len(act) < 2:
        return {"top": base[0], "stability": 1.0, "draws": 0}
    w = np.array([weights[f] for f in act], dtype=float)
    rng = np.random.default_rng(seed)
    samples = rng.dirichlet(concentration * w / w.sum(), size=draws)
    same = sum(ranking(score(x, dict(zip(act, row)), cfg))[0] == base[0] for row in samples)
    return {"top": base[0], "stability": same / draws, "draws": draws}


def preset_weights(cfg: dict, preset_id: str) -> dict:
    return next(p["weights"] for p in cfg["presets"] if p["id"] == preset_id)


def score_table(df: pd.DataFrame, weights: dict, cfg: dict) -> pd.DataFrame:
    """Scores for every tract (rows) x typology (columns), plus `top` and `top_score`."""
    fids = [f["id"] for f in cfg["factors"]]
    rows = {}
    for geoid, r in df[fids].iterrows():
        s = score(r.to_dict(), weights, cfg)
        rk = ranking(s)
        rows[geoid] = {**s, "top": rk[0] if rk else None, "top_score": s[rk[0]] if rk else None}
    return pd.DataFrame.from_dict(rows, orient="index")
