import zipfile
from pathlib import Path

import pytest

from visionpitts import hud

CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'
RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'
# The FMR workbook's defect: a space inside the month ("2026- 2-19"), which openpyxl refuses to parse.
CORE = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>sas user</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2026- 2-19T18:17:31Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026- 2-19T18:17:31Z</dcterms:modified></cp:coreProperties>'
WB = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Field_Descriptions" sheetId="2" r:id="rId5"/><sheet name="FY26_FMRs_revised" sheetId="1" r:id="rId1"/></sheets></workbook>'
WB_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'
SST = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="6" uniqueCount="6"><si><t>hud_area_name</t></si><si><t>fips</t></si><si><t>fmr_2</t></si><si><t>Pittsburgh, PA HUD Metro FMR Area</t></si><si><t>4200399999</t></si><si><t>Somewhere, AL MSA</t></si></sst>'
SHEET = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
         '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="inlineStr"><is><t>note</t></is></c></row>'
         '<row r="2"><c r="A2" t="s"><v>5</v></c><c r="B2" t="s"><v>4</v></c><c r="C2"><v>999</v></c></row>'
         '<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3" t="s"><v>4</v></c><c r="C3" s="9"><v>1299</v></c><c r="D3" t="b"><v>1</v></c></row>'
         '<row r="4"><c r="A4" t="s"><v>5</v></c><c r="B4" t="inlineStr"><is><t>0100199999</t></is></c><c r="C4"><v>860.5</v></c><c r="D4"/></row>'
         '</sheetData></worksheet>')
SHEET2 = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
          '<row r="1"><c r="A1" t="inlineStr"><is><t>Field_Name</t></is></c></row><row r="2"><c r="A2" t="s"><v>2</v></c></row></sheetData></worksheet>')


def _write_xlsx(path: Path) -> Path:
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("[Content_Types].xml", CT)
        z.writestr("_rels/.rels", RELS)
        z.writestr("docProps/core.xml", CORE)
        z.writestr("xl/workbook.xml", WB)
        z.writestr("xl/_rels/workbook.xml.rels", WB_RELS)
        z.writestr("xl/sharedStrings.xml", SST)
        z.writestr("xl/worksheets/sheet1.xml", SHEET)
        z.writestr("xl/worksheets/sheet2.xml", SHEET2)
    return path


def test_read_sheet_reads_a_workbook_whose_core_properties_openpyxl_rejects(tmp_path):
    import openpyxl

    p = _write_xlsx(tmp_path / "broken_date.xlsx")
    with pytest.raises(Exception):
        openpyxl.load_workbook(p, read_only=True)
    df = hud.read_sheet(p, "FY26_FMRs_revised")
    assert df is not None
    assert df.columns.tolist() == ["hud_area_name", "fips", "fmr_2", "note"]
    assert len(df) == 3
    assert df["fips"].tolist() == ["4200399999", "4200399999", "0100199999"]  # text stays text, zeros kept
    assert df["fmr_2"].tolist() == [999, 1299, 860.5]                         # int where integral, float otherwise
    assert df["note"].tolist() == [None, True, None]
    # the row for the Pittsburgh area, whichever row order the file has
    hit = df[(df["fips"] == "4200399999") & (df["hud_area_name"].str.contains("Pittsburgh"))]
    assert hit["fmr_2"].iloc[0] == 1299
    # sheets are found by name, not by position
    d2 = hud.read_sheet(p, "Field_Descriptions")
    assert d2 is not None and d2.columns.tolist() == ["Field_Name"] and d2["Field_Name"].tolist() == ["fmr_2"]


def test_read_sheet_returns_none_for_missing_file_sheet_or_bad_zip(tmp_path):
    assert hud.read_sheet(tmp_path / "nope.xlsx", "x") is None
    p = _write_xlsx(tmp_path / "ok.xlsx")
    assert hud.read_sheet(p, "no such sheet") is None
    bad = tmp_path / "bad.xlsx"
    bad.write_bytes(b"not a zip")
    assert hud.read_sheet(bad, "x") is None


def test_absent_workbooks_give_none_or_empty(tmp_path, monkeypatch):
    monkeypatch.setattr(hud, "FMR_XLSX", tmp_path / "missing_fmr.xlsx")
    monkeypatch.setattr(hud, "IL_XLSX", tmp_path / "missing_il.xlsx")
    hud._area_row.cache_clear()
    assert hud.fmr(2) is None
    assert hud.income_limits() == {}
    assert hud.summary() is None
    hud._area_row.cache_clear()


def test_fmr_from_a_synthetic_workbook(tmp_path, monkeypatch):
    monkeypatch.setattr(hud, "FMR_XLSX", _write_xlsx(tmp_path / "fmr.xlsx"))
    monkeypatch.setattr(hud, "IL_XLSX", tmp_path / "missing_il.xlsx")
    hud._area_row.cache_clear()
    assert hud.fmr(2) == 1299
    assert hud.fmr(3) is None
    s = hud.summary()
    assert s["fmr_2br"] == 1299 and s["median_family_income"] is None and s["source_files"] == ["fmr.xlsx"]
    assert s["hmfa"] == "Pittsburgh, PA HUD Metro FMR Area"
    hud._area_row.cache_clear()


@pytest.mark.skipif(not (hud.FMR_XLSX.exists() and hud.IL_XLSX.exists()), reason="HUD workbooks not downloaded")
def test_real_fy2026_workbooks_read_the_pittsburgh_figures():
    hud._area_row.cache_clear()
    assert hud.fmr(2) == 1299
    assert [hud.fmr(b) for b in range(5)] == [1001, 1077, 1299, 1661, 1789]
    il = hud.income_limits()
    assert il["median_family_income"] == 110400
    assert il["ami_50"][4] == 55200 and il["ami_30"][4] == 33100 and il["ami_80"][4] == 88300
    s = hud.summary()
    assert s["hmfa"] == "Pittsburgh, PA HUD Metro FMR Area" and s["fy"] == 2026
    assert (s["fmr_2br"], s["median_family_income"], s["ami_30_4p"], s["ami_50_4p"], s["ami_80_4p"]) == (1299, 110400, 33100, 55200, 88300)
