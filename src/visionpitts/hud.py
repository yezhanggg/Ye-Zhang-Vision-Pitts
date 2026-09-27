"""HUD FY2026 Fair Market Rents and Section 8 income limits for the Pittsburgh HUD Metro FMR Area.

The two workbooks are public HUD downloads kept in data/raw/benchmark/hud/ (git-ignored):
  FY26_FMRs_revised.xlsx   https://www.huduser.gov/portal/datasets/fmr.html
  Section8-FY26.xlsx       https://www.huduser.gov/portal/datasets/il.html
The FMR workbook carries a malformed date in docProps/core.xml ("2026- 2-19T18:17:31Z"), which makes openpyxl
refuse the whole file, so `read_sheet` reads the worksheet XML straight from the xlsx zip and never opens the
document properties. Every function returns None (or an empty dict) when a file is absent or has no such row:
callers keep their documented fallback and nothing is invented.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
import zipfile
from functools import lru_cache
from pathlib import Path, PurePosixPath

import pandas as pd

from visionpitts.config import RAW

HUD_DIR = RAW / "benchmark" / "hud"
FMR_XLSX = HUD_DIR / "FY26_FMRs_revised.xlsx"
IL_XLSX = HUD_DIR / "Section8-FY26.xlsx"
FMR_SHEET = "FY26_FMRs_revised"
IL_SHEET = "Section8-FY26"
FY = 2026
AREA_FIPS = "4200399999"  # Allegheny County row: state 42 + county 003 + "99999" (no county subdivision)
HMFA = "Pittsburgh, PA HUD Metro FMR Area"

_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
_PKG = "{http://schemas.openxmlformats.org/package/2006/relationships}"
_REF = re.compile(r"([A-Z]+)(\d+)")


def _col(letters: str) -> int:
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def _number(text: str):
    try:
        f = float(text)
    except ValueError:
        return text
    return int(f) if f.is_integer() else f


def _cell(c: ET.Element, shared: list[str]):
    kind = c.get("t")
    if kind == "inlineStr":
        return "".join(t.text or "" for t in c.iter(f"{_MAIN}t"))
    v = c.find(f"{_MAIN}v")
    if v is None or v.text is None:
        return None
    if kind == "s":
        return shared[int(v.text)]
    if kind == "b":
        return v.text == "1"
    if kind in ("str", "e"):
        return v.text
    return _number(v.text)


def _sheet_member(z: zipfile.ZipFile, name: str) -> str | None:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rid = next((s.get(f"{_REL}id") for s in wb.iter(f"{_MAIN}sheet") if s.get("name") == name), None)
    if rid is None:
        return None
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = next((r.get("Target") for r in rels.iter(f"{_PKG}Relationship") if r.get("Id") == rid), None)
    if target is None:
        return None
    member = target.lstrip("/") if target.startswith("/") else str(PurePosixPath("xl") / target)
    return member if member in z.namelist() else None


def read_sheet(path: Path | str, name: str) -> pd.DataFrame | None:
    """One worksheet as a DataFrame (first row = header), read from the xlsx zip without openpyxl.

    Text cells stay text (FIPS codes keep their leading zeros); numeric cells become int or float; an empty
    cell is None. Returns None when the file, the sheet or its XML is missing or unreadable.
    """
    path = Path(path)
    if not path.exists():
        return None
    try:
        with zipfile.ZipFile(path) as z:
            member = _sheet_member(z, name)
            if member is None:
                return None
            shared: list[str] = []
            if "xl/sharedStrings.xml" in z.namelist():
                sst = ET.fromstring(z.read("xl/sharedStrings.xml"))
                shared = ["".join(t.text or "" for t in si.iter(f"{_MAIN}t")) for si in sst.findall(f"{_MAIN}si")]
            rows: list[dict[int, object]] = []
            for row in ET.fromstring(z.read(member)).iter(f"{_MAIN}row"):
                cells: dict[int, object] = {}
                for i, c in enumerate(row.findall(f"{_MAIN}c")):
                    m = _REF.match(c.get("r") or "")
                    cells[_col(m.group(1)) if m else i] = _cell(c, shared)
                rows.append(cells)
    except (zipfile.BadZipFile, ET.ParseError, KeyError, ValueError, IndexError):
        return None
    if not rows or not rows[0]:
        return None
    width = max(max(r) for r in rows if r) + 1
    header = [str(rows[0].get(i)) if rows[0].get(i) is not None else f"col{i}" for i in range(width)]
    return pd.DataFrame([[r.get(i) for i in range(width)] for r in rows[1:]], columns=header)


@lru_cache(maxsize=4)
def _area_row(path: Path, sheet: str) -> dict | None:
    df = read_sheet(path, sheet)
    if df is None or "fips" not in df.columns:
        return None
    hit = df[df["fips"].astype(str) == AREA_FIPS]
    if "hud_area_name" in df.columns:  # the county row must also name the Pittsburgh metro area
        named = hit[hit["hud_area_name"].astype(str).str.contains("Pittsburgh", case=False, na=False)]
        hit = named if not named.empty else hit
    return None if hit.empty else hit.iloc[0].to_dict()


def _int(v) -> int | None:
    try:
        return None if v is None or pd.isna(v) else int(round(float(v)))
    except (TypeError, ValueError):
        return None


def fmr(bedrooms: int = 2) -> int | None:
    """FY2026 Fair Market Rent in dollars for 0-4 bedrooms, Pittsburgh HMFA; None when the workbook is absent."""
    row = _area_row(FMR_XLSX, FMR_SHEET)
    return None if row is None else _int(row.get(f"fmr_{bedrooms}"))


def income_limits() -> dict:
    """FY2026 median family income and the 30% / 50% / 80% limits by household size (1-8 people); {} when absent.

    HUD's 30% column is the Extremely Low Income limit: the greater of 30% of the median and the poverty
    guideline, capped at the 50% limit, which is why larger households do not scale like the other two.
    """
    row = _area_row(IL_XLSX, IL_SHEET)
    if row is None:
        return {}
    sizes = range(1, 9)
    return {
        "hmfa": row.get("hud_area_name") or HMFA,
        "fy": FY,
        "median_family_income": _int(row.get("median2026")),
        "ami_30": {n: _int(row.get(f"ELI_{n}")) for n in sizes},
        "ami_50": {n: _int(row.get(f"l50_{n}")) for n in sizes},
        "ami_80": {n: _int(row.get(f"l80_{n}")) for n in sizes},
    }


def summary() -> dict | None:
    """The figures the app and the docs quote, or None when neither workbook is present."""
    rent = fmr(2)
    il = income_limits()
    if rent is None and not il:
        return None
    frow = _area_row(FMR_XLSX, FMR_SHEET) or {}
    return {
        "hmfa": il.get("hmfa") or frow.get("hud_area_name") or HMFA,
        "fy": FY,
        "fmr_2br": rent,
        "median_family_income": il.get("median_family_income"),
        "ami_30_4p": (il.get("ami_30") or {}).get(4),
        "ami_50_4p": (il.get("ami_50") or {}).get(4),
        "ami_80_4p": (il.get("ami_80") or {}).get(4),
        "source_files": [p.name for p in (FMR_XLSX, IL_XLSX) if p.exists()],
    }
