"""Step 19: the pencil's inputs. Copies config/pencil_defaults.json (PHFA caps and fee rules, credit rates, the HACP
2026 utility allowances, example costs) into app/src/data/lazy/pencil_defaults.json with HUD's FY2026 MTSP income
limits for the Pittsburgh area (HUD User API, cached in data/raw/benchmark/hud_api/; the token is read from .env).
Method in docs/data/pencil.md.
Run: uv run --no-sync python scripts/19_build_pencil_defaults.py [--refresh]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse

from visionpitts import pencil_defaults as pd_


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--refresh", action="store_true", help="fetch the MTSP limits again")
    args = ap.parse_args()
    payload = pd_.build(refresh=args.refresh)
    m = payload["mtsp"]
    print(f"MTSP FY{m['fy']} {m['area']}: median ${m['median']:,}; 4 people: " + ", ".join(f"{lv}% ${m['l'][lv][3]:,}" for lv in pd_.LEVELS))
    sixty = [round(x * 1.2) for x in m["l"]["50"]]
    off = max(abs(a - b) for a, b in zip(sixty, m["l"]["60"]))
    print(f"60% limits against 1.2 x the 50% limits: largest difference ${off}")
    examples = [k for k, v in payload["inputs"].items() if v["kind"] == "example"]
    print(f"{len(examples)} example inputs, utility allowances {payload['ua']['by_br']} (studio to 3BR)")
    pd_.write(payload)
    print(f"wrote {pd_.OUT.relative_to(pd_.OUT.parents[3])}")


if __name__ == "__main__":
    main()
