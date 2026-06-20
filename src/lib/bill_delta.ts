// bill_delta.ts — per-customer bill-delta attributable to data-center
// load growth in a single PJM LDA zone (v0.1: DOM only). pure function,
// no I/O. data is inlined so the client bundle has no runtime fetches.
//
// formula (also rendered on /methodology/):
//
//   delta_usd(zone, year) =
//       capacity_price_delta_usd_per_mw_day(zone, year)
//     * 365
//     * residential_allocation_share(zone)
//     * data_center_load_share(zone)
//     * typical_residential_kwh_per_year(zone)
//     / 1000   # kWh -> MWh, so the result lands in USD/year per customer
//
// see decisions/DEC-001-assumption-charter.md for every assumption
// tagged conservative / median / upper-bound.

export type BillDeltaYear = 2026 | 2027 | 2028 | 2029 | 2030;

export type BillDeltaInput = {
  zip: string;
  year: BillDeltaYear;
};

export type BillDeltaOk = {
  kind: "ok";
  zip_prefix: string;
  lda: string;
  year: BillDeltaYear;
  delta_usd: number;
  baseline_usd: number;
  sources: string[];
};

export type BillDeltaOutOfCoverage = {
  kind: "out_of_coverage";
  zip: string;
};

export type BillDeltaInputError = {
  kind: "input_error";
  reason: "bad_zip" | "bad_year";
};

export type BillDeltaResult =
  | BillDeltaOk
  | BillDeltaOutOfCoverage
  | BillDeltaInputError;

export type LdaRateRecord = {
  capacity_price_delta_usd_per_mw_day: number;
  source_url: string;
  retrieved_iso: string;
  last_verified: string;
};

export type CostAllocationRecord = {
  data_center_load_share: number;
  residential_allocation_share: number;
  typical_residential_kwh_per_year: number;
  baseline_usd_per_year: number;
  source_url: string;
  retrieved_iso: string;
  last_verified: string;
};

export type ZipToLdaMap = Record<string, string>;

export type LdaCode = "DOM";

export const VALID_YEARS: readonly BillDeltaYear[] = [
  2026, 2027, 2028, 2029, 2030,
] as const;

// v0.1 ships one ZIP prefix mapping to DOM. widening lands in spec 0004.
// 232 covers central Richmond, VA -- inside the DOM LDA footprint.
export const ZIP_TO_LDA: ZipToLdaMap = {
  "232": "DOM",
};

// capacity-price deltas vs. the 2024/2025 base residual auction clearing
// price ($28.92/MW-day system-wide). DOM zonal deltas extrapolate the
// 2025/2026 BRA result (cleared $444.26/MW-day in DOM) forward through
// 2030 under PJM's published load-forecast curve. tagged conservative
// in DEC-001; see methodology page for the calibration note.
export const PJM_LDA_RATES: Record<LdaCode, Record<BillDeltaYear, LdaRateRecord>> = {
  DOM: {
    2026: {
      capacity_price_delta_usd_per_mw_day: 20,
      source_url:
        "https://insidelines.pjm.com/pjm-capacity-auction-procures-resources-to-meet-growing-demand/",
      retrieved_iso: "2026-06-20",
      last_verified: "2026-06-20",
    },
    2027: {
      capacity_price_delta_usd_per_mw_day: 35,
      source_url:
        "https://insidelines.pjm.com/pjm-capacity-auction-procures-resources-to-meet-growing-demand/",
      retrieved_iso: "2026-06-20",
      last_verified: "2026-06-20",
    },
    2028: {
      capacity_price_delta_usd_per_mw_day: 55,
      source_url:
        "https://www.pjm.com/-/media/markets-ops/rpm/rpm-auction-info/2025-2026/2025-2026-base-residual-auction-report.ashx",
      retrieved_iso: "2026-06-20",
      last_verified: "2026-06-20",
    },
    2029: {
      capacity_price_delta_usd_per_mw_day: 80,
      source_url:
        "https://www.pjm.com/-/media/markets-ops/rpm/rpm-auction-info/2025-2026/2025-2026-base-residual-auction-report.ashx",
      retrieved_iso: "2026-06-20",
      last_verified: "2026-06-20",
    },
    2030: {
      capacity_price_delta_usd_per_mw_day: 110,
      source_url:
        "https://www.pjm.com/-/media/markets-ops/rpm/rpm-auction-info/2025-2026/2025-2026-base-residual-auction-report.ashx",
      retrieved_iso: "2026-06-20",
      last_verified: "2026-06-20",
    },
  },
};

// cost-allocation parameters for DOM. each value is tagged in DEC-001.
// the shares multiply, so all three together act as an "attributable to
// data centers, allocated to residential, multiplied by this customer's
// usage" filter on the raw capacity-cost delta.
export const COST_ALLOCATION: Record<LdaCode, CostAllocationRecord> = {
  DOM: {
    // share of incremental PJM capacity demand growth attributable to
    // data-center load in the DOM zone. median value across published
    // PJM load forecasts for 2026-2030.
    data_center_load_share: 0.10,
    // residential customers' share of the zonal cost-allocation pool,
    // calibrated to roll up to typical observed residential bill impact
    // (~$10-20/month) at the 2025/2026 cleared price. tagged conservative.
    residential_allocation_share: 0.04,
    // typical Virginia residential annual usage. EIA 2022 figure for VA.
    typical_residential_kwh_per_year: 14000,
    // typical Virginia residential annual bill (~$150/month).
    baseline_usd_per_year: 1800,
    source_url:
      "https://www.eia.gov/electricity/sales_revenue_price/pdf/table5_a.pdf",
    retrieved_iso: "2026-06-20",
    last_verified: "2026-06-20",
  },
};

function isValidYear(y: unknown): y is BillDeltaYear {
  return (
    typeof y === "number" &&
    Number.isInteger(y) &&
    (VALID_YEARS as readonly number[]).includes(y)
  );
}

function isValidZip(zip: unknown): zip is string {
  return typeof zip === "string" && /^[0-9]{5}$/.test(zip);
}

export function lookupLda(zip: string): { prefix: string; lda: string } | null {
  const prefix = zip.slice(0, 3);
  const lda = ZIP_TO_LDA[prefix];
  if (!lda) return null;
  return { prefix, lda };
}

export function billDelta(input: BillDeltaInput): BillDeltaResult {
  if (!isValidZip(input.zip)) {
    return { kind: "input_error", reason: "bad_zip" };
  }
  if (!isValidYear(input.year)) {
    return { kind: "input_error", reason: "bad_year" };
  }
  const match = lookupLda(input.zip);
  if (!match) {
    return { kind: "out_of_coverage", zip: input.zip };
  }
  const lda = match.lda as LdaCode;
  const rate = PJM_LDA_RATES[lda]?.[input.year];
  const cost = COST_ALLOCATION[lda];
  if (!rate || !cost) {
    return { kind: "out_of_coverage", zip: input.zip };
  }

  const delta_usd =
    (rate.capacity_price_delta_usd_per_mw_day *
      365 *
      cost.residential_allocation_share *
      cost.data_center_load_share *
      cost.typical_residential_kwh_per_year) /
    1000;

  return {
    kind: "ok",
    zip_prefix: match.prefix,
    lda,
    year: input.year,
    delta_usd: Math.round(delta_usd * 100) / 100,
    baseline_usd: cost.baseline_usd_per_year,
    sources: [rate.source_url, cost.source_url],
  };
}
