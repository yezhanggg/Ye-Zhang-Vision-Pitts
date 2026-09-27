import { describe, expect, it } from "vitest";
import { hud, placeById } from "./data";
import { suggestAll } from "./suggest";
import type { Stance } from "./types";
import { plain, whyTheyDiffer } from "./whyDiffer";

const PLAN = {
  level: 50,
  size: "auto",
  age: "any",
  flood: "any",
  transitMi: 0.5,
} as const;
const rows = (focus: Stance) => {
  const m = suggestAll(placeById, hud!, focus, PLAN as never);
  const side = (id: string, name: string) => ({
    name,
    p: placeById.get(id) ?? null,
    rec: m.get(id) ?? null,
  });
  return whyTheyDiffer(
    side("42003562300", "Hazelwood"),
    side("42003140300", "Squirrel Hill North"),
    50,
  );
};

describe("why they differ", () => {
  it("strips worked arithmetic", () => {
    expect(plain("Listings ask $1,150 (a − b = c) for a 2-bedroom (x).")).toBe(
      "Listings ask $1,150 for a 2-bedroom.",
    );
  });
  it("explains Hazelwood vs Squirrel Hill North under anti-displacement from real values", () => {
    const r = rows("anti_displacement");
    const t = r
      .map((x) => `${x.topic}|${x.a}|${x.b}|${x.both ?? ""}`)
      .join("\n");
    expect(r.map((x) => x.topic)).toEqual([
      "What each gets",
      "The focus rule",
      "Who needs homes",
      "What the market asks",
      "Land and buildings",
      "Transit and flood",
    ]);
    expect(t).toContain("Duplex / triplex: converts an existing house");
    expect(t).toContain("590 renter households at or below 50% AMI");
    expect(t).toContain("Hazelwood has 3.6 times as many");
    expect(t).toContain("641 vacant parcels");
    expect(t).not.toMatch(/\/ ?100| = /);
    expect(t).toContain("gap $653 a month");
  });
  it("says why a side gets nothing under market-led", () => {
    const r = rows("market_led");
    expect(r[0].a).toMatch(/^No unsubsidized product/);
    expect(r[0].b).toMatch(/^Townhome:/);
  });
  it("survives a missing side", () => {
    const r = whyTheyDiffer(
      { name: "A", p: null, rec: null },
      { name: "B", p: null, rec: null },
      50,
    );
    expect(r[0].a).toMatch(/No place measures/);
  });
});
