import { describe, expect, it } from "vitest";
import {
  billDelta,
  lookupLda,
  COST_ALLOCATION,
  PJM_LDA_RATES,
  ZIP_TO_LDA,
} from "./bill_delta";

// three reference cases per DEC-001 tags:
//   low      -> earliest year, smallest delta  (2026)
//   median   -> middle year                    (2028)
//   upper    -> last year, largest delta       (2030)
// hand-computed against the inlined DOM data so any drift in either the
// formula or the data trips the test.

const FORMULA_FACTOR =
  365 *
  COST_ALLOCATION.DOM.residential_allocation_share *
  COST_ALLOCATION.DOM.data_center_load_share *
  COST_ALLOCATION.DOM.typical_residential_kwh_per_year /
  1000;

function expectedDelta(year: 2026 | 2027 | 2028 | 2029 | 2030): number {
  const raw =
    PJM_LDA_RATES.DOM[year].capacity_price_delta_usd_per_mw_day *
    FORMULA_FACTOR;
  return Math.round(raw * 100) / 100;
}

describe("billDelta — reference cases", () => {
  it("low case: 2026 (conservative)", () => {
    const r = billDelta({ zip: "23219", year: 2026 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.lda).toBe("DOM");
    expect(r.zip_prefix).toBe("232");
    expect(r.year).toBe(2026);
    expect(r.delta_usd).toBeCloseTo(expectedDelta(2026), 2);
    expect(r.delta_usd).toBeCloseTo(408.8, 2);
    expect(r.baseline_usd).toBe(1800);
    expect(r.sources.length).toBeGreaterThanOrEqual(2);
    // sanity: a "low" reference must stay well under the 2x bound.
    expect(r.delta_usd / r.baseline_usd).toBeLessThan(0.5);
  });

  it("median case: 2028", () => {
    const r = billDelta({ zip: "23219", year: 2028 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.delta_usd).toBeCloseTo(expectedDelta(2028), 2);
    expect(r.delta_usd).toBeCloseTo(1124.2, 2);
    expect(r.delta_usd / r.baseline_usd).toBeLessThan(1.0);
  });

  it("upper case: 2030", () => {
    const r = billDelta({ zip: "23219", year: 2030 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.delta_usd).toBeCloseTo(expectedDelta(2030), 2);
    expect(r.delta_usd).toBeCloseTo(2248.4, 2);
    // even at the upper bound the sanity gate must pass.
    expect(r.delta_usd / r.baseline_usd).toBeLessThanOrEqual(2.0);
  });
});

const COMED_FACTOR =
  365 *
  COST_ALLOCATION.COMED.residential_allocation_share *
  COST_ALLOCATION.COMED.data_center_load_share *
  COST_ALLOCATION.COMED.typical_residential_kwh_per_year /
  1000;

function expectedComedDelta(
  year: 2026 | 2027 | 2028 | 2029 | 2030
): number {
  const raw =
    PJM_LDA_RATES.COMED[year].capacity_price_delta_usd_per_mw_day *
    COMED_FACTOR;
  return Math.round(raw * 100) / 100;
}

describe("billDelta — COMED reference cases", () => {
  it("low case: 2026 maps 606 -> COMED", () => {
    const r = billDelta({ zip: "60601", year: 2026 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.lda).toBe("COMED");
    expect(r.zip_prefix).toBe("606");
    expect(r.delta_usd).toBeCloseTo(expectedComedDelta(2026), 2);
    expect(r.delta_usd).toBeCloseTo(195.46, 2);
    expect(r.baseline_usd).toBe(1140);
    expect(r.sources.length).toBeGreaterThanOrEqual(2);
    expect(r.delta_usd / r.baseline_usd).toBeLessThan(0.5);
  });

  it("upper case: 2030 stays under the 2x bound", () => {
    const r = billDelta({ zip: "60601", year: 2030 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.delta_usd).toBeCloseTo(expectedComedDelta(2030), 2);
    expect(r.delta_usd).toBeCloseTo(1172.74, 2);
    expect(r.delta_usd / r.baseline_usd).toBeLessThanOrEqual(2.0);
  });
});

describe("billDelta — coverage and input errors", () => {
  it("returns out_of_coverage for a ZIP outside covered prefixes", () => {
    const r = billDelta({ zip: "10001", year: 2026 });
    expect(r.kind).toBe("out_of_coverage");
    if (r.kind === "out_of_coverage") {
      expect(r.zip).toBe("10001");
    }
  });

  it("returns input_error for a non-5-digit ZIP", () => {
    const r = billDelta({ zip: "abcde", year: 2026 });
    expect(r).toEqual({ kind: "input_error", reason: "bad_zip" });
  });

  it("returns input_error for a year outside 2026-2030", () => {
    // cast through unknown so the runtime guard is what we're testing.
    const r = billDelta({ zip: "23219", year: 2025 as unknown as 2026 });
    expect(r).toEqual({ kind: "input_error", reason: "bad_year" });
  });

  it("never throws on user input", () => {
    expect(() =>
      billDelta({ zip: "" as string, year: 9999 as unknown as 2026 })
    ).not.toThrow();
  });
});

describe("data integrity", () => {
  it("every covered (zone, year) stays under the 2x sanity bound", () => {
    for (const lda of Object.keys(PJM_LDA_RATES)) {
      const baseline =
        COST_ALLOCATION[lda as keyof typeof COST_ALLOCATION].baseline_usd_per_year;
      for (const yearStr of Object.keys(
        PJM_LDA_RATES[lda as keyof typeof PJM_LDA_RATES]
      )) {
        const year = Number(yearStr) as 2026 | 2027 | 2028 | 2029 | 2030;
        const zip =
          Object.entries(ZIP_TO_LDA).find(([, v]) => v === lda)?.[0] + "00";
        const r = billDelta({ zip, year });
        expect(r.kind).toBe("ok");
        if (r.kind !== "ok") continue;
        expect(r.delta_usd / baseline).toBeLessThanOrEqual(2.0);
      }
    }
  });

  it("zip prefix lookup returns the LDA code", () => {
    expect(lookupLda("23219")).toEqual({ prefix: "232", lda: "DOM" });
    expect(lookupLda("60601")).toEqual({ prefix: "606", lda: "COMED" });
    expect(lookupLda("99999")).toBeNull();
  });
});
