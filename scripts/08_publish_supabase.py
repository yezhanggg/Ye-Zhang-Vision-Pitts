"""Step 8: publish the ACS levels to Supabase over PostgREST so every device reads the same county-wide data.

Tables (supabase/migrations/0001_init.sql): acs_variables (37 rows), geo_units (394 + 1062 + 170 + 1 + 1),
acs_values (one long row per level x geoid x variable) and dataset_versions (one row per publish). Rows are upserted
on their primary keys, so reruns are idempotent. Inputs are the step-7 outputs in data/processed/ plus the boundary
files in data/raw/. Credentials: SUPABASE_URL and SUPABASE_SECRET_KEY from .env (loaded by visionpitts.config); the
secret key stays on this machine and is never printed. --dry-run builds every payload and prints counts without
touching the network.
Run: uv run python scripts/08_publish_supabase.py [--dry-run] [--only variables geo values version] [--levels ...]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import json
import os
import subprocess
import time

import pandas as pd
import requests

from visionpitts import acs_levels as al
from visionpitts import geo_levels as gl
from visionpitts.config import PROCESSED, ROOT

CATALOGUE_JSON = PROCESSED / "acs_variables.json"
PARTS = ("variables", "geo", "values", "version")
TABLE_OF = {"variables": "acs_variables", "geo": "geo_units", "values": "acs_values", "version": "dataset_versions"}
BATCH = 500
VAR_FIELDS = ("id", "label", "group", "unit", "description", "table_id", "sort")


# ------------------------------------------------------------------------------------------- payloads
def variables_rows(cat: dict) -> list[dict]:
    return [{k: v[k] for k in VAR_FIELDS} for v in cat["variables"]]


def geo_rows(levels: list[str]) -> list[dict]:
    rows = []
    for level in levels:
        fc = gl.to_fc(gl.units(level, "county"), gl.props_for(level), gl.SIMPLIFY_M[level])
        for f in fc["features"]:
            p = f["properties"]
            rows.append({"level": level, "geoid": p["GEOID"], "name": p["name"], "pgh_share": p["pgh_share"],
                         "tract": p.get("tract"), "kind": p.get("kind"), "geom": f["geometry"]})
    return rows


def value_rows(levels: list[str]) -> list[dict]:
    rows = []
    for level in levels:
        path = PROCESSED / f"acs_{level}.csv"
        if not path.exists():
            sys.exit(f"{path.relative_to(ROOT)} is missing: run scripts/07_build_acs_levels.py first")
        df = pd.read_csv(path, dtype={"GEOID": str, "tract": str}).set_index("GEOID")
        long = al.to_long(df, level)
        long = long.astype(object).where(long.notna(), None)
        rows.extend(long.to_dict(orient="records"))
    return rows


def git_sha() -> str | None:
    try:
        out = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        return None
    return out.stdout.strip() or None


def version_row(cat: dict, counts: dict) -> dict:
    return {"built_at": cat["meta"]["built_at"], "acs_year": cat["meta"]["acs_year"], "git_sha": git_sha(),
            "counts": counts}


# ------------------------------------------------------------------------------------------- PostgREST
class Client:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1"
        self.s = requests.Session()
        self.s.headers.update({"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})

    def upsert(self, table: str, rows: list[dict], batch: int = BATCH, merge: bool = True) -> None:
        prefer = "resolution=merge-duplicates,return=minimal" if merge else "return=minimal"
        for i in range(0, len(rows), batch):
            chunk = rows[i:i + batch]
            body = json.dumps(chunk, ensure_ascii=False).encode()
            for attempt in range(3):
                r = self.s.post(f"{self.base}/{table}", data=body, headers={"Prefer": prefer}, timeout=180)
                if r.status_code < 300:
                    break
                if r.status_code >= 500 and attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f"{table} rows {i}-{i + len(chunk)}: HTTP {r.status_code} {r.text[:400]}")
            print(f"    {table}: {min(i + batch, len(rows))}/{len(rows)}", end="\r", flush=True)
        print(f"    {table}: {len(rows)}/{len(rows)} upserted")

    def count(self, table: str, params: dict) -> int:
        r = self.s.head(f"{self.base}/{table}", params=params, headers={"Prefer": "count=exact"}, timeout=60)
        r.raise_for_status()
        return int(r.headers.get("content-range", "*/0").rsplit("/", 1)[-1])


def payload_bytes(rows: list[dict]) -> str:
    return f"{len(json.dumps(rows, ensure_ascii=False).encode()) / 1024 / 1024:.1f} MB"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="build payloads and print counts; no network")
    ap.add_argument("--only", nargs="+", choices=PARTS, default=list(PARTS))
    ap.add_argument("--levels", nargs="+", choices=al.LEVELS, default=list(al.LEVELS))
    args = ap.parse_args()

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SECRET_KEY", "")
    key_ok = key.startswith("sb_secret_")
    if args.dry_run:
        print(f"dry run: SUPABASE_URL {'set' if url else 'missing'}; SUPABASE_SECRET_KEY "
              f"{'present (sb_secret_...)' if key_ok else 'missing or not a secret key'}")
    else:
        if not url:
            sys.exit("SUPABASE_URL is not set in .env; nothing published")
        if not key_ok:
            sys.exit("SUPABASE_SECRET_KEY is missing or does not start with sb_secret_ (the service key, not the "
                     "publishable one); nothing published")
    if not CATALOGUE_JSON.exists():
        sys.exit(f"{CATALOGUE_JSON.relative_to(ROOT)} is missing: run scripts/07_build_acs_levels.py first")
    cat = json.loads(CATALOGUE_JSON.read_text())

    payloads: dict[str, list[dict]] = {}
    if "variables" in args.only:
        payloads["acs_variables"] = variables_rows(cat)
    if "geo" in args.only:
        payloads["geo_units"] = geo_rows(args.levels)
    if "values" in args.only:
        payloads["acs_values"] = value_rows(args.levels)
    counts = {t: len(rows) for t, rows in payloads.items()}
    for t in ("geo_units", "acs_values"):
        if t in payloads:
            per = pd.Series([r["level"] for r in payloads[t]]).value_counts()
            counts[f"{t}_by_level"] = {lv: int(per.get(lv, 0)) for lv in args.levels}
    counts["variables_total"] = len(cat["variables"])
    counts["levels"] = cat["meta"]["levels"]
    if "version" in args.only:
        payloads["dataset_versions"] = [version_row(cat, counts)]

    print("payloads")
    for t, rows in payloads.items():
        print(f"  {t:17} {len(rows):6} rows  {payload_bytes(rows):>8}")
    if "acs_values" in payloads:
        nn = sum(r["est"] is not None for r in payloads["acs_values"])
        print(f"  acs_values by level: {counts['acs_values_by_level']}; non-null estimates {nn} of "
              f"{len(payloads['acs_values'])}")
    if "geo_units" in payloads:
        print(f"  geo_units by level: {counts['geo_units_by_level']}")
    if args.dry_run:
        for t, rows in payloads.items():
            sample = {k: (v if k != "geom" else f"<{v['type']}>") for k, v in rows[0].items()}
            print(f"  sample {t}: {json.dumps(sample, ensure_ascii=False)[:220]}")
        print("dry run: nothing sent")
        return

    client = Client(url, key)
    print("publishing")
    for t in ("acs_variables", "geo_units", "acs_values", "dataset_versions"):
        if t in payloads:
            client.upsert(t, payloads[t], merge=(t != "dataset_versions"))

    print("verifying (HEAD with Prefer: count=exact)")
    problems = []
    n = client.count("acs_variables", {"select": "id"})
    print(f"  acs_variables: {n}")
    if n != counts["variables_total"]:
        problems.append(f"acs_variables {n} != {counts['variables_total']}")
    for lv in args.levels:
        total = cat["meta"]["levels"].get(lv, {}).get("total")
        g = client.count("geo_units", {"select": "geoid", "level": f"eq.{lv}"})
        v = client.count("acs_values", {"select": "geoid", "level": f"eq.{lv}", "var": "eq.pop"})
        print(f"  {lv:7} geo_units {g:5}  acs_values(pop) {v:5}  expected {total}")
        if total is not None and (g != total or v != total):
            problems.append(f"{lv}: geo {g}, values {v}, expected {total}")
    if problems:
        sys.exit("verification failed: " + "; ".join(problems))
    print("done")


if __name__ == "__main__":
    main()
