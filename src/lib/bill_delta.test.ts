import { describe, expect, it } from "vitest";
import {
  billDelta,
  lookupLda,
  BASELINE_PRICE_USD_PER_MW_DAY,
  COST_ALLOCATION,
  PJM_LDA_RATES,
  VALID_YEARS,
  ZIP_TO_LDA,
} from "./bill_delta";

// three reference cases: 2026, 2028 and 2030. since DEC-003 the price
// rows are cleared BRA prices (2026-2028) and stated assumptions
// (2029-2030), so the years no longer rise monotonically; 2028 (the
// 2028/29 BRA, $325.00) is the smallest and 2029-2030 the largest.
// hand-computed against the inlined DOM data so any drift in either the
// formula or the data trips the test. formula per DEC-002:
//   USD/MW-day x 365 day/yr x household PLC (MW) x data-center share.

const FORMULA_FACTOR =
  365 *
  COST_ALLOCATION.DOM.household_plc_mw *
  COST_ALLOCATION.DOM.data_center_load_share;

function expectedDelta(year: 2026 | 2027 | 2028 | 2029 | 2030): number {
  const raw =
    PJM_LDA_RATES.DOM[year].capacity_price_delta_usd_per_mw_day *
    FORMULA_FACTOR;
  return Math.round(raw * 100) / 100;
}

describe("billDelta — reference cases", () => {
  it("2026: 2026/27 BRA, cleared at $329.17", () => {
    const r = billDelta({ zip: "23219", year: 2026 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.lda).toBe("DOM");
    expect(r.zip_prefix).toBe("232");
    expect(r.year).toBe(2026);
    expect(r.delta_usd).toBeCloseTo(expectedDelta(2026), 2);
    expect(r.delta_usd).toBeCloseTo(30.69, 2);
    expect(r.baseline_usd).toBe(1785.24);
    expect(r.sources.length).toBeGreaterThanOrEqual(2);
    // sanity: a "low" reference must stay well under the 2x bound.
    expect(r.delta_usd / r.baseline_usd).toBeLessThan(0.5);
  });

  it("2028: 2028/29 BRA, cleared at $325.00", () => {
    const r = billDelta({ zip: "23219", year: 2028 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.delta_usd).toBeCloseTo(expectedDelta(2028), 2);
    expect(r.delta_usd).toBeCloseTo(30.26, 2);
    expect(r.delta_usd / r.baseline_usd).toBeLessThan(1.0);
  });

  it("2030: assumption, 2029/30 cap carried forward", () => {
    const r = billDelta({ zip: "23219", year: 2030 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.delta_usd).toBeCloseTo(expectedDelta(2030), 2);
    expect(r.delta_usd).toBeCloseTo(31.57, 2);
    // even at the upper bound the sanity gate must pass.
    expect(r.delta_usd / r.baseline_usd).toBeLessThanOrEqual(2.0);
  });
});

const COMED_FACTOR =
  365 *
  COST_ALLOCATION.COMED.household_plc_mw *
  COST_ALLOCATION.COMED.data_center_load_share;

function expectedComedDelta(
  year: 2026 | 2027 | 2028 | 2029 | 2030
): number {
  const raw =
    PJM_LDA_RATES.COMED[year].capacity_price_delta_usd_per_mw_day *
    COMED_FACTOR;
  return Math.round(raw * 100) / 100;
}

describe("billDelta — COMED reference cases", () => {
  it("2026 maps 606 -> COMED", () => {
    const r = billDelta({ zip: "60601", year: 2026 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.lda).toBe("COMED");
    expect(r.zip_prefix).toBe("606");
    expect(r.delta_usd).toBeCloseTo(expectedComedDelta(2026), 2);
    expect(r.delta_usd).toBeCloseTo(24.99, 2);
    expect(r.baseline_usd).toBe(1319.88);
    expect(r.sources.length).toBeGreaterThanOrEqual(2);
    expect(r.delta_usd / r.baseline_usd).toBeLessThan(0.5);
  });

  it("2030 stays under the 2x bound", () => {
    const r = billDelta({ zip: "60601", year: 2030 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.delta_usd).toBeCloseTo(expectedComedDelta(2030), 2);
    expect(r.delta_usd).toBeCloseTo(25.71, 2);
    expect(r.delta_usd / r.baseline_usd).toBeLessThanOrEqual(2.0);
  });
});

// units: a capacity price ($/MW-day) is charged on a capacity obligation
// (MW). the v0.2 formula multiplied it by annual energy (kWh / 1000), so
// a home that used twice the energy at the same peak paid twice the
// capacity charge, and the "data-center share" ran ~20x the household's
// whole capacity-charge delta (DOM 2030: $2,248 vs ~$112). the first
// two cases fail on that formula; the third checks the PLC input itself
// and guards against a units slip there (a PLC entered in kW as MW).
type Lda = keyof typeof COST_ALLOCATION;
type Year = 2026 | 2027 | 2028 | 2029 | 2030;

function zipFor(lda: Lda): string {
  return Object.entries(ZIP_TO_LDA).find(([, v]) => v === lda)![0] + "00";
}

function okDelta(lda: Lda, year: Year): number {
  const r = billDelta({ zip: zipFor(lda), year });
  if (r.kind !== "ok") throw new Error(`expected ok for ${lda} ${year}`);
  return r.delta_usd;
}

describe("billDelta — units and invariants", () => {
  const ldas = Object.keys(COST_ALLOCATION) as Lda[];
  const years = [2026, 2027, 2028, 2029, 2030] as const;

  it("the data-center slice never exceeds the household's whole capacity-charge delta", () => {
    for (const lda of ldas) {
      for (const year of years) {
        // whole capacity-charge delta = $/MW-day x 365 x PLC (MW).
        const whole =
          PJM_LDA_RATES[lda][year].capacity_price_delta_usd_per_mw_day *
          365 *
          COST_ALLOCATION[lda].household_plc_mw;
        expect(Number.isFinite(whole)).toBe(true);
        expect(okDelta(lda, year)).toBeLessThanOrEqual(whole + 0.005);
      }
    }
  });

  it("annual energy does not move the capacity charge; the capacity obligation does", () => {
    for (const lda of ldas) {
      const cost = COST_ALLOCATION[lda];
      const before = okDelta(lda, 2030);
      const kwh = cost.typical_residential_kwh_per_year;
      const plc = cost.household_plc_mw;
      try {
        cost.typical_residential_kwh_per_year = kwh * 2;
        expect(okDelta(lda, 2030)).toBeCloseTo(before, 2);
        cost.typical_residential_kwh_per_year = kwh;
        cost.household_plc_mw = plc * 2;
        expect(okDelta(lda, 2030)).toBeCloseTo(before * 2, 1);
      } finally {
        cost.typical_residential_kwh_per_year = kwh;
        cost.household_plc_mw = plc;
      }
    }
  });

  it("each PLC is a household-scale power, consistent with its annual energy", () => {
    for (const lda of ldas) {
      const cost = COST_ALLOCATION[lda];
      const plcKw = cost.household_plc_mw * 1000;
      expect(plcKw).toBeGreaterThan(0.5);
      expect(plcKw).toBeLessThan(10);
      // implied load factor at the coincident peaks: average kW / PLC kW.
      const loadFactor = cost.typical_residential_kwh_per_year / 8760 / plcKw;
      expect(loadFactor).toBeGreaterThanOrEqual(0.25);
      expect(loadFactor).toBeLessThanOrEqual(1.0);
    }
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

// DEC-003: the price rows are PJM Base Residual Auction resource clearing
// prices for the delivery year starting June 1 of the calculator year,
// less the same zone's 2024/2025 BRA price. the published values are
// pinned here so an edit to the data has to be an edit to this list too.
//   2024/25 BRA report, Table 3: COMED and rest of RTO $28.92.
//   2026/27 BRA report: every LDA $329.17 (cap).
//   2027/28 BRA report: every LDA $333.44 (cap).
//   2028/29 BRA report: every LDA $325.00 (cap).
//   2029/30 planning parameters: cap $337.83, floor $181.91 (no auction yet).
describe("capacity price inputs (DEC-003)", () => {
  const ldas = Object.keys(PJM_LDA_RATES) as Lda[];
  const PUBLISHED: Record<Year, { dy: string; price: number; basis: string }> = {
    2026: { dy: "2026/2027", price: 329.17, basis: "cleared" },
    2027: { dy: "2027/2028", price: 333.44, basis: "cleared" },
    2028: { dy: "2028/2029", price: 325.0, basis: "cleared" },
    2029: { dy: "2029/2030", price: 337.83, basis: "assumption" },
    2030: { dy: "2030/2031", price: 337.83, basis: "assumption" },
  };

  it("baseline is the 2024/2025 BRA price, $28.92, in both zones", () => {
    expect(BASELINE_PRICE_USD_PER_MW_DAY).toBe(28.92);
    for (const lda of ldas) {
      for (const year of VALID_YEARS) {
        const r = PJM_LDA_RATES[lda][year];
        expect(r.baseline_price_usd_per_mw_day).toBe(28.92);
        expect(r.baseline_source_url).toMatch(/2024-2025-base-residual-auction-report/);
      }
    }
  });

  it("each year carries the published price for its delivery year", () => {
    for (const lda of ldas) {
      for (const year of VALID_YEARS) {
        const r = PJM_LDA_RATES[lda][year];
        expect(r.delivery_year).toBe(PUBLISHED[year].dy);
        expect(r.price_basis).toBe(PUBLISHED[year].basis);
        expect(r.capacity_price_usd_per_mw_day).toBe(PUBLISHED[year].price);
      }
    }
  });

  it("delta = price - baseline, to the cent", () => {
    for (const lda of ldas) {
      for (const year of VALID_YEARS) {
        const r = PJM_LDA_RATES[lda][year];
        expect(r.capacity_price_delta_usd_per_mw_day).toBeCloseTo(
          r.capacity_price_usd_per_mw_day - r.baseline_price_usd_per_mw_day,
          2
        );
      }
    }
    expect(PJM_LDA_RATES.DOM[2026].capacity_price_delta_usd_per_mw_day).toBe(300.25);
    expect(PJM_LDA_RATES.DOM[2027].capacity_price_delta_usd_per_mw_day).toBe(304.52);
    expect(PJM_LDA_RATES.DOM[2028].capacity_price_delta_usd_per_mw_day).toBe(296.08);
    expect(PJM_LDA_RATES.DOM[2029].capacity_price_delta_usd_per_mw_day).toBe(308.91);
  });

  it("cleared rows cite the PJM BRA report for that delivery year", () => {
    for (const lda of ldas) {
      for (const year of VALID_YEARS) {
        const r = PJM_LDA_RATES[lda][year];
        expect(r.source_url).toMatch(/^https:\/\/www\.pjm\.com\//);
        if (r.price_basis === "cleared") {
          expect(r.source_url).toContain(r.delivery_year.replace("/", "-"));
          expect(r.source_url).toMatch(/bra-(results-)?report\.pdf$/);
        }
      }
    }
  });

  it("prices sit inside the published collar and a plausible band", () => {
    for (const lda of ldas) {
      for (const year of VALID_YEARS) {
        const p = PJM_LDA_RATES[lda][year].capacity_price_usd_per_mw_day;
        // every BRA from 2026/27 to 2029/30 runs under a ~$175-$338 collar.
        expect(p).toBeGreaterThanOrEqual(175);
        expect(p).toBeLessThanOrEqual(337.83);
      }
    }
  });

  it("household bill delta stays in a sane band at these prices", () => {
    for (const lda of ldas) {
      for (const year of VALID_YEARS) {
        const d = okDelta(lda, year);
        // $5-$100 a year: well under 2x the bill, and far above the
        // pre-DEC-003 fixture values ($1-$11).
        expect(d).toBeGreaterThan(5);
        expect(d).toBeLessThan(100);
      }
    }
  });
});
