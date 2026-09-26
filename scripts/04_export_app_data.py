"""Step 4: write data/processed/tracts.geojson and app/src/data/*.json.

Run: uv run python scripts/04_export_app_data.py   (after 03_build_pressure.py; step 06 re-runs this export itself)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

from visionpitts import export


def main() -> None:
    print("export")
    export.write_from_interim()


if __name__ == "__main__":
    main()
