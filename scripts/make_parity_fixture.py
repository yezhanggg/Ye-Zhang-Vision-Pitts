"""Write tests/fixtures/scoring_cases.json (and a copy for the app) so the Python and TypeScript engines are checked
against the same numbers.

The file is {"version", "cases", "stability"}:
  cases      synthetic tracts and edge cases under every preset, plus the focus tracts from the built data under all
             four presets. Each case carries `scores`, `top`, `margin` and `tie` from the Python engine.
  stability  the focus tracts under Balanced: the share of weight draws that keep the top pick, from the Python
             engine. The two engines use different random generators, so the TypeScript share is compared within
             `tolerance`, not digit for digit.

Run: uv run python scripts/make_parity_fixture.py   (after scripts 02 and 03, and after any change to config/scoring.json)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import json

import pandas as pd

from visionpitts import scoring
from visionpitts.config import INTERIM, ROOT, load_scoring

STABILITY_TOLERANCE = 0.05


def case(name: str, x: dict, weights: dict, cfg: dict, **extra) -> dict:
    s = scoring.score(x, weights, cfg)
    rk = scoring.ranking(s)
    eps = cfg["scoring"].get("tie_margin", 0.005)
    return {"name": name, **extra, "x": x, "weights": weights, "scores": s, "top": rk[0] if rk else None,
            "margin": scoring.margin(s), "tie": scoring.is_tie(s, eps)}


def main() -> None:
    cfg = load_scoring()
    fids = [f["id"] for f in cfg["factors"]]
    balanced = scoring.preset_weights(cfg, "balanced")
    cases = []

    def tract(**values) -> dict:
        """A synthetic tract: every factor of the config, None where not given."""
        unknown = set(values) - set(fids)
        assert not unknown, f"not a factor id: {unknown}"
        return {f: values.get(f) for f in fids}

    high_need = tract(need=0.95, market_strength=0.1, displacement_risk=0.8, subsidy_eligible=1.0, transit_access=0.6,
                      flood_exposure=0.2, senior_demand=0.7, small_multifamily_stock=0.3)
    synthetic = [
        ("all mid", {f: 0.5 for f in fids}),
        ("high need low market", high_need),
        ("strong market low need", tract(need=0.1, market_strength=0.95, displacement_risk=0.2, subsidy_eligible=0.0,
                                         transit_access=0.5, flood_exposure=0.1, senior_demand=0.3, small_multifamily_stock=0.2)),
        ("partial subsidy, many 2-4 unit homes", tract(need=0.6, market_strength=0.45, displacement_risk=0.55, subsidy_eligible=0.5,
                                                       transit_access=0.5, flood_exposure=0.3, senior_demand=0.2, small_multifamily_stock=0.95)),
        ("many residents 65 and over", tract(need=0.4, market_strength=0.3, displacement_risk=0.5, subsidy_eligible=1.0,
                                             transit_access=0.7, flood_exposure=0.2, senior_demand=0.98, small_multifamily_stock=0.1)),
        ("missing market", tract(need=0.7, displacement_risk=0.6, subsidy_eligible=1.0, transit_access=0.3, flood_exposure=0.9,
                                 senior_demand=0.5, small_multifamily_stock=0.6)),
        ("missing both new factors", tract(need=0.7, market_strength=0.4, displacement_risk=0.6, subsidy_eligible=0.5,
                                           transit_access=0.3, flood_exposure=0.9)),
        ("only need has data", tract(need=0.7)),
        ("nothing", tract()),
    ]
    for name, x in synthetic:
        for p in cfg["presets"]:
            cases.append(case(f"{name} / {p['id']}", x, p["weights"], cfg))

    # Edge cases on the weights: nothing switched on, one factor switched on.
    zero = {f: 0 for f in fids}
    edge = [("all weights zero", zero), ("need only", {**zero, "need": 1}), ("senior_demand only", {**zero, "senior_demand": 1})]
    for name, w in edge:
        cases.append(case(f"high need low market / {name}", high_need, w, cfg))

    stability = []
    wide = INTERIM / "wide_pressure.parquet"
    if wide.exists():
        w = pd.read_parquet(wide)
        focus = json.loads((INTERIM / "focus.json").read_text())
        for f in focus:
            r = w.loc[f["geoid"], fids]
            x = {k: (None if pd.isna(v) else float(v)) for k, v in r.items()}
            for p in cfg["presets"]:
                cases.append(case(f"{f['label']} / {p['id']}", x, p["weights"], cfg, geoid=f["geoid"]))
            if f is focus[0]:
                for name, wts in edge:
                    cases.append(case(f"{f['label']} / {name}", x, wts, cfg, geoid=f["geoid"]))
            st = scoring.rank_stability(x, balanced, cfg)
            stability.append({"name": f"{f['label']} / balanced", "geoid": f["geoid"], "x": x, "weights": balanced,
                              "top": st["top"], "share": st["stability"], "draws": st["draws"],
                              "seed": cfg["scoring"].get("stability_seed", 42), "tolerance": STABILITY_TOLERANCE})
    else:
        print(f"  {wide} not found: focus-tract and stability cases skipped (run scripts 02 and 03 first)")

    out = json.dumps({"version": cfg["version"], "factors": fids, "cases": cases, "stability": stability}, indent=1)
    (ROOT / "tests" / "fixtures").mkdir(exist_ok=True)
    (ROOT / "tests" / "fixtures" / "scoring_cases.json").write_text(out)
    app_fix = ROOT / "app" / "src" / "lib" / "__fixtures__"
    app_fix.mkdir(parents=True, exist_ok=True)
    (app_fix / "scoring_cases.json").write_text(out)
    ties = sum(c["tie"] for c in cases)
    print(f"{len(cases)} parity cases ({ties} ties) and {len(stability)} stability cases written")
    for s in stability:
        print(f"  {s['name']:<32} top {s['top']:<16} share {s['share']:.3f} over {s['draws']} draws")


if __name__ == "__main__":
    main()
