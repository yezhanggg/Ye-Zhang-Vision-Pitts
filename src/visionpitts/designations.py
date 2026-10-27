"""HUD's Qualified Census Tracts and Small Area DDAs for 2026 and 2027, for the pencil's 130% basis boost. HUD's 2027 lists
(91 FR 63573, 2026-10-06) apply to allocations after 2026-12-31 and to bond-financed buildings whose bonds are issued
after that date, unless HUD's 730-day rule keeps an earlier list for a complete application. The tract scores keep the
2026 lists (the subsidy factor, ingest.flags); only the pencil and the QCT policy row read this file.
Method in docs/data/pencil.md.
"""
from __future__ import annotations

import io
import json
import zipfile
from datetime import UTC, datetime

import openpyxl
import pandas as pd

from visionpitts.config import APP_DATA, RAW

FLAGS = RAW / "benchmark" / "flags"
OUT = APP_DATA / "lazy" / "designations.json"
COUNTY = "42003"
YEARS = (2026, 2027)
NOTICE = {"title": "HUD, Statutorily Mandated Designation of Difficult Development Areas and Qualified Census Tracts for 2027 (91 FR 63573, 2026-10-06)",
          "url": "https://www.federalregister.gov/documents/2026/10/06/2026-20390/statutorily-mandated-designation-of-difficult-development-areas-and-qualified-census-tracts-for-2027",
          "effective": "2027-01-01"}


def qcts(year: int) -> list[str]:
    with zipfile.ZipFile(FLAGS / f"QCT{year}CSV.zip") as z:
        name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        q = pd.read_csv(io.BytesIO(z.read(name)), dtype=str, encoding="latin-1")
    return sorted(q.loc[q["stcnty"] == COUNTY, "fips"])


def sdda_zctas(year: int) -> list[str]:
    ws = openpyxl.load_workbook(FLAGS / f"{year}-DDAs-Data-Used-to-Designate.xlsx", read_only=True)[f"{year} MDDA"]
    rows = list(ws.iter_rows(values_only=True))
    d = pd.DataFrame(rows[1:], columns=[str(c).strip() for c in rows[0]])
    pgh = d[d["Area Name"].astype(str).str.contains("Pittsburgh", case=False)]
    col = next(c for c in pgh.columns if "SDDA (1=SDDA)" in c)
    return sorted(str(int(z)).zfill(5) for z in pgh.loc[pd.to_numeric(pgh[col], errors="coerce") == 1, pgh.columns[0]])


def build() -> dict:
    q = {str(y): qcts(y) for y in YEARS}
    s = {str(y): sdda_zctas(y) for y in YEARS}
    a, b = set(q["2026"]), set(q["2027"])
    return {"built": datetime.now(UTC).date().isoformat(), "notice": NOTICE, "qct": q, "sdda_zcta": s,
            "qct_change": {"lose": sorted(a - b), "gain": sorted(b - a)}}


def write(payload: dict) -> None:
    OUT.write_text(json.dumps(payload, separators=(",", ":")))
