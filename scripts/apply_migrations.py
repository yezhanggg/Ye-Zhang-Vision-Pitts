"""Apply supabase/migrations/*.sql to the hosted project through the Supabase Management API.

For when the project is not linked to the CLI on this machine. Needs SUPABASE_URL (for the project ref) and a
personal access token in SUPABASE_ACCESS_TOKEN (Supabase dashboard -> Account -> Access Tokens), both in .env.
Every migration file is written to be re-runnable (IF NOT EXISTS / DROP ... IF EXISTS), so applying one twice is
harmless. The token is never printed.
Run: uv run python scripts/apply_migrations.py [--from 0002] [--dry-run]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import os
import re

import requests

from visionpitts.config import ROOT

MIGRATIONS = ROOT / "supabase" / "migrations"
API = "https://api.supabase.com/v1/projects/{ref}/database/query"


def project_ref(url: str) -> str:
    m = re.match(r"https?://([a-z0-9-]+)\.supabase\.co", url.strip())
    if not m:
        sys.exit("SUPABASE_URL does not look like https://<ref>.supabase.co")
    return m.group(1)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--from", dest="start", default="0001", help="first migration number to apply (default 0001)")
    ap.add_argument("--dry-run", action="store_true", help="list the files and their sizes; no network")
    args = ap.parse_args()

    files = sorted(p for p in MIGRATIONS.glob("*.sql") if p.name[:4] >= args.start)
    if not files:
        sys.exit(f"no migrations at or after {args.start} in {MIGRATIONS.relative_to(ROOT)}")
    for p in files:
        print(f"  {p.name}: {len(p.read_text().encode())} bytes")
    if args.dry_run:
        print("dry run: nothing applied")
        return

    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not token:
        sys.exit("SUPABASE_ACCESS_TOKEN is empty in .env: create a personal access token in the Supabase dashboard "
                 "(Account -> Access Tokens), add it to .env, and run again. Alternatively paste each file into the "
                 "dashboard's SQL editor in order.")
    ref = project_ref(os.environ.get("SUPABASE_URL", ""))
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    for p in files:
        r = s.post(API.format(ref=ref), json={"query": p.read_text()}, timeout=120)
        if r.status_code >= 300:
            sys.exit(f"{p.name}: HTTP {r.status_code} {r.text[:400]}")
        print(f"  applied {p.name}")
    print("done")


if __name__ == "__main__":
    main()
