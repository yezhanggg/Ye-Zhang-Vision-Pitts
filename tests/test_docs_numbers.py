"""Numbers written in the documents must match the data they describe.

Reads the generated `app/src/data/meta.json`, `config/scoring.json`, `app/src/data/tracts.json`, the parity fixture,
the flip list and the slider component, then checks every documented count against them. Each claim is a regex with
capture groups over one document; a failure names the file, the claim, what the document says and what the data says.
When the pipeline changes a number, fix the sentence (or, if the sentence was reworded, the pattern here).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DOCS = {
    "assumptions": ROOT / "docs" / "assumptions.md",
    "methods": ROOT / "docs" / "data" / "factor_methods.md",
    "readme": ROOT / "README.md",
    "about": ROOT / "app" / "src" / "lib" / "about.ts",
}
WORDS = {5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten"}
MONEY = r"(\d{1,3}(?:,\d{3})*)"  # a dollar figure with thousands separators; never swallows a trailing comma


def _json(path: Path):
    return json.loads(path.read_text())


def _thousands(n: int | float) -> str:
    return f"{int(n):,}"


def _pct_word(x: float) -> str:
    """0.05 -> '.05' as the docs write margins."""
    return f"{x:.3f}".rstrip("0").lstrip("0")


def expected() -> dict[str, str]:
    """Every number the documents may quote, computed from the data files (never typed here)."""
    meta = _json(ROOT / "app" / "src" / "data" / "meta.json")
    cfg = _json(ROOT / "config" / "scoring.json")
    tracts = _json(ROOT / "app" / "src" / "data" / "tracts.json")["features"]
    fixture = _json(ROOT / "tests" / "fixtures" / "scoring_cases.json")
    flips = _json(ROOT / "app" / "src" / "data" / "flips.json")
    panel = (ROOT / "app" / "src" / "components" / "WeightPanel.tsx").read_text()

    props = [f["properties"] for f in tracts]
    ranked = [p for p in props if p.get("residential")]
    assert len(props) == meta["n_tracts"], "tracts.json and meta.json disagree on the tract count"
    assert len(ranked) == meta["n_residential"], "tracts.json and meta.json disagree on the ranked count"
    assert cfg["version"] == meta["scoring_version"], "config/scoring.json and meta.json carry different versions"

    floor = cfg["factor_options"]["transit"]["household_floor"]
    floored = sum(1 for p in ranked if (p.get("households") or 0) < floor)
    over50 = cfg["factor_options"]["flood"]["implausible_share_pct"]
    flood_low = sum(1 for p in ranked if (p.get("flood_share_pct") or 0) > over50)
    assert flood_low == meta["flood_over_50"]
    hcv_ranked = sum(1 for p in ranked if p.get("hcv_per_renter") is None)
    hcv_all = sum(1 for p in props if p.get("hcv_per_renter") is None)
    assert hcv_ranked == meta["hcv_suppressed_ranked"]
    tiers = meta["subsidy_tiers"]
    win = meta["winners"]["balanced"]
    mg = meta["margins"]["balanced"]
    cc = meta["confidence_counts"]
    hud = meta["hud"]

    slider_max = re.search(r"const MAX = (\d+);", panel)
    slider_step = re.search(r"type=\"range\"[^>]*step=\{([\d.]+)\}", panel)
    assert slider_max and slider_step, "WeightPanel.tsx no longer declares MAX and step where this test looks"

    return {
        "n_tracts": str(meta["n_tracts"]),
        "n_ranked": str(meta["n_residential"]),
        "n_unranked": str(meta["n_tracts"] - meta["n_residential"]),
        "n_factors_word": WORDS[len(cfg["factors"])],
        "n_factors": str(len(cfg["factors"])),
        "version": cfg["version"],
        "tier_full": str(tiers["1"]),
        "tier_half": str(tiers["0.5"]),
        "tier_none": str(tiers["0"]),
        "win_adu": str(win["adu"]),
        "win_duplex": str(win["duplex_triplex"]),
        "win_townhome": str(win["townhome"]),
        "win_small": str(win["small_apartment"]),
        "win_senior": str(win["senior"]),
        "win_senior_anti": str(meta["winners"]["anti_displacement"]["senior"]),
        "win_senior_transit": str(meta["winners"]["transit_first"]["senior"]),
        "win_senior_market": str(meta["winners"]["market_led"]["senior"]),
        "margin_lt05": str(mg["lt05"]),
        "margin_lt03": str(mg["lt03"]),
        "margin_lt02": str(mg["lt02"]),
        "margin_ties": str(mg["ties"]),
        "margin_median": _pct_word(round(mg["median"], 3)),
        "watch": str(meta["watch_list_count"]),
        "draws": _thousands(cfg["scoring"]["stability_draws"]),
        "concentration": str(cfg["scoring"]["stability_concentration"]),
        "tie_margin": _pct_word(cfg["scoring"]["tie_margin"]),
        "close_margin": _pct_word(cfg["scoring"]["close_margin"]),
        "slider_max": slider_max.group(1),
        "slider_step": slider_step.group(1),
        "hcv_ranked": str(hcv_ranked),
        "hcv_all": str(hcv_all),
        "fmr": _thousands(hud["fmr_2br"]),
        "mfi": _thousands(hud["median_family_income"]),
        "ami30": _thousands(hud["ami_30_4p"]),
        "ami50": _thousands(hud["ami_50_4p"]),
        "ami80": _thousands(hud["ami_80_4p"]),
        "floor": str(floor),
        "floored": str(floored),
        "flood_pct": str(over50),
        "flood_low": str(flood_low),
        "zip_dominant_pct": str(int(round(cfg["factor_options"]["displacement"]["eviction_zip_dominant_min"] * 100))),
        "disp_medium": str(cc["displacement_risk"]["medium"]),
        "disp_low": str(cc["displacement_risk"]["low"]),
        "need_medium": str(cc["need"]["medium"]),
        "need_low": str(cc["need"]["low"]),
        "transit_high": str(cc["transit_access"]["high"]),
        "transit_medium": str(cc["transit_access"]["medium"]),
        "flood_medium": str(cc["flood_exposure"]["medium"]),
        "senior_high": str(cc["senior_demand"]["high"]),
        "senior_medium": str(cc["senior_demand"]["medium"]),
        "stock_high": str(cc["small_multifamily_stock"]["high"]),
        "stock_medium": str(cc["small_multifamily_stock"]["medium"]),
        "subsidy_high": str(cc["subsidy_eligible"]["high"]),
        "subsidy_medium": str(cc["subsidy_eligible"]["medium"]),
        "subsidy_low": str(cc["subsidy_eligible"]["low"]),
        "fixture_cases": str(len(fixture["cases"])),
        "fixture_stability": str(len(fixture["stability"])),
        "flips": str(len(flips)),
    }


# (document, claim, regex with capture groups, keys of the expected values the groups must equal)
CLAIMS: list[tuple[str, str, str, tuple[str, ...]]] = [
    # docs/assumptions.md
    ("assumptions", "scoring version", r"Config: `config/scoring\.json` v(\d+\.\d+\.\d+)", ("version",)),
    ("assumptions", "ranked count", r"Tracts with ≥25 households: (\d+) ranked of (\d+) city tracts", ("n_ranked", "n_tracts")),
    ("assumptions", "unranked count", r"(\d+) of (\d+) tracts are left unranked", ("n_unranked", "n_tracts")),
    ("assumptions", "factor count", r"(\w+) factors since v0\.4\.0", ("n_factors_word",)),
    ("assumptions", "senior wins under Balanced", r"senior housing now ranks first in (\d+) of (\d+) tracts \(Anti-displacement (\d+), Transit-first (\d+), Market-led (\d+)\)",
     ("win_senior", "n_ranked", "win_senior_anti", "win_senior_transit", "win_senior_market")),
    ("assumptions", "Balanced picks", r"Balanced picks are ADU (\d+) / duplex (\d+) / townhome (\d+) / small apartment (\d+) / senior (\d+)",
     ("win_adu", "win_duplex", "win_townhome", "win_small", "win_senior")),
    ("assumptions", "eligible tiers", r"(\d+) ranked tracts carry the full grade [^.]*?, (\d+) the partial grade [^.]*?, (\d+) none", ("tier_full", "tier_half", "tier_none")),
    ("assumptions", "close-call margins", r"margin is under \.05 in (\d+) of (\d+) tracts \((\d+) under \.03, (\d+) under \.02; (\d+) ties within (\.\d+); median (\.\d+)\)",
     ("margin_lt05", "n_ranked", "margin_lt03", "margin_lt02", "margin_ties", "tie_margin", "margin_median")),
    ("assumptions", "watch list", r"most likely to displace\. (\d+) tracts today", ("watch",)),
    ("assumptions", "stability draws", r"([\d,]+) Dirichlet draws, concentration (\d+)", ("draws", "concentration")),
    ("assumptions", "tie and close margins", r"margin under (\.\d+) is a tie, under (\.\d+) a close call", ("tie_margin", "close_margin")),
    ("assumptions", "sliders", r"Sliders run 0–(\d+) in steps of ([\d.]+)", ("slider_max", "slider_step")),
    ("assumptions", "voucher suppression", r"HUD suppresses vouchers in (\d+) of (\d+) ranked tracts", ("hcv_ranked", "n_ranked")),
    ("assumptions", "FMR", r"HUD FY2026 2BR FMR, Pittsburgh HMFA, \$" + MONEY, ("fmr",)),
    ("assumptions", "income limits", r"median family income is \$" + MONEY + r", so 50% for a family of four is \$" + MONEY + r" \(30%: \$" + MONEY + r"; 80%: \$" + MONEY + r"\)",
     ("mfi", "ami50", "ami30", "ami80")),
    ("assumptions", "transit floor", r"households floored at (\d+) \|[^|]*?It applies to (\d+) ranked tracts", ("floor", "floored")),
    ("assumptions", "displacement confidence (R-5)", r"none holds at least (\d+)% of the tract's housing units \|[^|]*?Now medium (\d+), low (\d+)",
     ("zip_dominant_pct", "disp_medium", "disp_low")),
    ("assumptions", "flood confidence", r"low where more than (\d+)% of the land reads as inundated \((\d+) ranked tracts", ("flood_pct", "flood_low")),
    ("assumptions", "2-4 unit confidence", r"so that factor reads medium in (\d+)", ("stock_medium",)),
    ("assumptions", "fixture stability cases", r"\((\d+) stability cases, tolerance", ("fixture_stability",)),
    # docs/data/factor_methods.md
    ("methods", "scoring version", r"`config/scoring\.json` \(v(\d+\.\d+\.\d+)\)", ("version",)),
    ("methods", "factor count", r"into the (\w+) scoring factors", ("n_factors_word",)),
    ("methods", "ranked set", r"≥25 households\*\* \(ACS 2020–24\): \*\*(\d+) of (\d+)\*\*", ("n_ranked", "n_tracts")),
    ("methods", "confidence: need", r"\| need \|[^\n]*\| medium (\d+) · low (\d+) \|", ("need_medium", "need_low")),
    ("methods", "confidence: displacement", r"\| displacement_risk \|[^\n]*\| medium (\d+) · low (\d+) \|", ("disp_medium", "disp_low")),
    ("methods", "confidence: subsidy", r"\| subsidy_eligible \|[^\n]*\| high (\d+) · medium (\d+) · low (\d+) \|", ("subsidy_high", "subsidy_medium", "subsidy_low")),
    ("methods", "confidence: transit", r"\| transit_access \|[^\n]*\| high (\d+) · medium (\d+) \|", ("transit_high", "transit_medium")),
    ("methods", "confidence: flood", r"\| flood_exposure \|[^\n]*\| medium (\d+) · low (\d+) \|", ("flood_medium", "flood_low")),
    ("methods", "confidence: 65+", r"\| senior_demand \|[^\n]*\| high (\d+) · medium (\d+) \|", ("senior_high", "senior_medium")),
    ("methods", "confidence: 2-4 units", r"\| small_multifamily_stock \|[^\n]*\| high (\d+) · medium (\d+) \|", ("stock_high", "stock_medium")),
    ("methods", "R-5 counts", r"no dominant share ≥ 0\.8 \(\d+ ranked tracts\)[^:]*: medium (\d+), low (\d+)", ("disp_medium", "disp_low")),
    ("methods", "voucher suppression", r"Vouchers are missing \(suppressed\) in (\d+) of (\d+) ranked tracts \((\d+) of (\d+) city tracts\)",
     ("hcv_ranked", "n_ranked", "hcv_all", "n_tracts")),
    ("methods", "eligible tiers", r"the full grade in (\d+) ranked tracts, the partial grade in (\d+), none in (\d+)", ("tier_full", "tier_half", "tier_none")),
    ("methods", "transit floor", r"floored at (\d+): `transit_departures_per_hh", ("floor",)),
    ("methods", "transit floor count", r"The floor applies to (\d+) ranked tracts", ("floored",)),
    ("methods", "flood confidence", r"low in the (\d+) ranked tracts where more than (\d+)% of the land", ("flood_low", "flood_pct")),
    ("methods", "65+ confidence", r"\(high (\d+), medium (\d+)\)\.\n- \*\*Definition note:\*\* the share measures where seniors live", ("senior_high", "senior_medium")),
    ("methods", "2-4 unit confidence", r"so the factor reads medium in (\d+) and high in (\d+)", ("stock_medium", "stock_high")),
    ("methods", "watch list", r"\*\*Watch list = H-rising\*\* \((\d+) tracts\)", ("watch",)),
    ("methods", "flip count", r"Balanced → Anti-displacement flips (\d+) of (\d+) ranked tracts", ("flips", "n_ranked")),
    ("methods", "stability draws", r"Stability: ([\d,]+) Dirichlet draws \(concentration (\d+)", ("draws", "concentration")),
    ("methods", "tie and close margins", r"margin under (0\.\d+) is a tie [^\n]*? and under (0\.\d+) a close call", ("tie_margin_0", "close_margin_0")),
    ("methods", "fixture size", r"\((\d+) scoring cases and (\d+) stability cases", ("fixture_cases", "fixture_stability")),
    ("methods", "Balanced picks", r"gives ADU (\d+) · duplex/triplex (\d+) · townhome (\d+) · small apartment (\d+) · senior (\d+) top picks",
     ("win_adu", "win_duplex", "win_townhome", "win_small", "win_senior")),
    ("methods", "close-call margins", r"margin is under 0\.05 in (\d+) of (\d+) ranked tracts and under 0\.005 \(a tie\) in (\d+)", ("margin_lt05", "n_ranked", "margin_ties")),
    ("methods", "FMR", r"Fair Market Rent for the Pittsburgh HMFA, \$" + MONEY, ("fmr",)),
    ("methods", "income limits", r"median family income \$" + MONEY + r"; 50% of it for a family of four \$" + MONEY + r" \(30%: \$" + MONEY + r"; 80%: \$" + MONEY + r"\)",
     ("mfi", "ami50", "ami30", "ami80")),
    # README.md
    ("readme", "ranked count", r"(\d+) city tracts, of which (\d+) with 25\+ households are ranked", ("n_tracts", "n_ranked")),
    ("readme", "factor count", r"# (\w+) scoring factors \+ confidence", ("n_factors_word",)),
    ("readme", "factor count in brief", r"\*\*(\w+) factors\*\* \(scoring v(\d+\.\d+\.\d+)\)", ("n_factors_word", "version")),
    ("readme", "senior wins under Balanced", r"senior housing tops (\d+) of (\d+) tracts", ("win_senior", "n_ranked")),
    ("readme", "duplex wins under Balanced", r"tops (\d+) now that the 2–4 unit stock is measured", ("win_duplex",)),
    ("readme", "close calls", r"under 5 points in (\d+) of (\d+) tracts", ("margin_lt05", "n_ranked")),
    ("readme", "voucher suppression", r"vouchers are suppressed in (\d+) of the (\d+) ranked tracts", ("hcv_ranked", "n_ranked")),
    ("readme", "flood confidence", r"low in the (\d+) tracts where more than half the land", ("flood_low",)),
    ("readme", "fixture size", r"shared fixture of (\d+) scoring cases and (\d+) stability cases", ("fixture_cases", "fixture_stability")),
    # app/src/lib/about.ts
    ("about", "ranked count", r"(\d+) ranked of (\d+) city tracts", ("n_ranked", "n_tracts")),
    ("about", "factor count", r"from (\w+) public-data factors", ("n_factors_word",)),
    ("about", "voucher suppression", r"\((\d+) of the (\d+) ranked tracts\)", ("hcv_ranked", "n_ranked")),
    ("about", "senior wins under Balanced", r"senior housing ranks first in (\d+) of (\d+) tracts", ("win_senior", "n_ranked")),
    ("about", "R-5 dominant share", r"none holds at least (\d+)% of it", ("zip_dominant_pct",)),
    ("about", "flood confidence", r"low in the (\d+) tracts where more than half the land", ("flood_low",)),
    ("about", "transit floor", r"households are floored at (\d+)", ("floor",)),
    ("about", "50% income limit", r"50% income limit for a family of four in the Pittsburgh area is \$" + MONEY, ("ami50",)),
]


@pytest.fixture(scope="module")
def values() -> dict[str, str]:
    v = expected()
    v["tie_margin_0"] = "0" + v["tie_margin"]      # the methods file writes 0.005, the assumptions file .005
    v["close_margin_0"] = "0" + v["close_margin"]
    return v


@pytest.fixture(scope="module")
def texts() -> dict[str, str]:
    return {k: p.read_text() for k, p in DOCS.items()}


@pytest.mark.parametrize("doc,claim,pattern,keys", CLAIMS, ids=[f"{d}:{c}" for d, c, _, _ in CLAIMS])
def test_documented_number_matches_data(doc, claim, pattern, keys, values, texts):
    path = DOCS[doc].relative_to(ROOT)
    m = re.search(pattern, texts[doc])
    assert m, (f"{path}: the claim '{claim}' was not found. Expected it to read {dict(zip(keys, (values[k] for k in keys)))}. "
               "If the sentence was reworded, update the pattern in tests/test_docs_numbers.py; if it was deleted, delete this claim.")
    want = tuple(values[k] for k in keys)
    got = tuple(g.lower() for g in m.groups())  # "Eight factors" at a sentence start is the word eight
    assert got == want, (f"{path}: '{claim}' says {m.groups()} but the data says {want} "
                                f"(from app/src/data/meta.json, config/scoring.json, tracts.json, the fixture or WeightPanel.tsx).")


def test_every_doc_is_checked():
    assert set(d for d, *_ in CLAIMS) == set(DOCS), "a document listed in DOCS has no claims"


def test_no_stale_six_factor_wording(texts):
    for doc, text in texts.items():
        for phrase in ("six factor", "six-factor", "six scoring factors", "six public-data factors"):
            assert phrase not in text, f"{DOCS[doc].relative_to(ROOT)}: still says '{phrase}'"


def test_config_and_meta_agree():
    meta = _json(ROOT / "app" / "src" / "data" / "meta.json")
    cfg = _json(ROOT / "config" / "scoring.json")
    app_cfg = _json(ROOT / "app" / "src" / "data" / "scoring.json")
    assert cfg == app_cfg, "app/src/data/scoring.json is not the copy of config/scoring.json (rerun scripts/04_export_app_data.py)"
    assert meta["scoring_version"] == cfg["version"]
    assert set(meta["factor_coverage"]) == {f["id"] for f in cfg["factors"]}
    assert set(meta["winners"]) == {p["id"] for p in cfg["presets"]}
    assert sum(meta["winners"]["balanced"].values()) == meta["n_residential"]
    assert sum(meta["subsidy_tiers"].values()) == meta["n_residential"]
