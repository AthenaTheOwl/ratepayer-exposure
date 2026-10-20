// bill_delta.ts — per-customer bill-delta attributable to data-center
// load growth in a PJM LDA zone (v0.2: DOM + COMED). pure function,
// no I/O. data is inlined so the client bundle has no runtime fetches.
//
// formula (also rendered on /methodology/):
//
//   delta_usd(zone, year) =
//       capacity_price_delta_usd_per_mw_day(zone, year)   # USD / MW-day
//     * 365                                               # day / year
//     * household_plc_mw(zone)                            # MW of capacity obligation
//     * data_center_load_share(zone)                      # dimensionless
//                                                         # = USD / year per customer
//
// a capacity price is charged per MW of capacity obligation. PJM
// Manual 18 bills an LSE its UCAP obligation, built from customer peak
// load contributions (PLC), times the zonal price. annual kWh is energy
// and enters only through the documented PLC derivation.
//
// see decisions/DEC-002-capacity-obligation.md (which supersedes the
// DEC-001 formula and calibration) for every assumption tagged
// conservative / median / upper-bound.

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
  data_center_load_share_source_url: string;
  household_plc_mw: number;
  household_plc_source_url: string;
  typical_residential_kwh_per_year: number;
  baseline_usd_per_year: number;
  // source for typical_residential_kwh_per_year and baseline_usd_per_year.
  source_url: string;
  retrieved_iso: string;
  last_verified: string;
};

export type ZipToLdaMap = Record<string, string>;

export type LdaCode = "DOM" | "COMED";

export const VALID_YEARS: readonly BillDeltaYear[] = [
  2026, 2027, 2028, 2029, 2030,
] as const;

// v0.2 ships two LDA zones, each keyed by ZIP-3 prefix. widening within
// each zone's footprint lands in spec 0004; more zones in spec 0005.
//   232 -> DOM   : central Richmond, VA, inside the Dominion LDA.
//   606 -> COMED : central Chicago, IL, inside the ComEd LDA.
export const ZIP_TO_LDA: ZipToLdaMap = {
  "232": "DOM",
  "606": "COMED",
};

// capacity-price deltas vs. the 2024/2025 base residual auction clearing
// price ($28.92/MW-day system-wide). DOM zonal deltas extrapolate the
// 2025/2026 BRA result (cleared $444.26/MW-day in DOM) forward through
// 2030 under PJM's published load-forecast curve. tagged conservative
// in DEC-001; DEC-002 (open) notes how far they sit below the 2026/27
// and 2027/28 cleared prices.
//
// the 2026 and 2027 rows cite PJM's July 30, 2024 article on the
// 2025/2026 BRA. that article anchors only the 2025/2026 base these
// values are extrapolated from; it does not verify the row values, so
// their last_verified dates stay at the original 2026-06 check.
export const PJM_LDA_RATES: Record<LdaCode, Record<BillDeltaYear, LdaRateRecord>> = {
  DOM: {
    2026: {
      capacity_price_delta_usd_per_mw_day: 20,
      source_url:
        "https://insidelines.pjm.com/pjm-capacity-auction-procures-sufficient-resources-to-meet-rto-reliability-requirement/",
      retrieved_iso: "2026-06-20",
      last_verified: "2026-06-20",
    },
    2027: {
      capacity_price_delta_usd_per_mw_day: 35,
      source_url:
        "https://insidelines.pjm.com/pjm-capacity-auction-procures-sufficient-resources-to-meet-rto-reliability-requirement/",
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
  // COMED zonal deltas extrapolate the 2025/2026 BRA result (cleared
  // $269.92/MW-day in ComEd, the rest-of-RTO price) forward through
  // 2030 under PJM's published load-forecast curve. ($329.17/MW-day is
  // the 2026/2027 BRA price, which cleared at the cap across the whole
  // PJM footprint, ComEd included.) tagged conservative in DEC-001;
  // values stay below the cleared ComEd zonal delta so the formula does
  // not overstate exposure.
  COMED: {
    2026: {
      capacity_price_delta_usd_per_mw_day: 15,
      source_url:
        "https://insidelines.pjm.com/pjm-capacity-auction-procures-sufficient-resources-to-meet-rto-reliability-requirement/",
      retrieved_iso: "2026-06-22",
      last_verified: "2026-06-22",
    },
    2027: {
      capacity_price_delta_usd_per_mw_day: 28,
      source_url:
        "https://insidelines.pjm.com/pjm-capacity-auction-procures-sufficient-resources-to-meet-rto-reliability-requirement/",
      retrieved_iso: "2026-06-22",
      last_verified: "2026-06-22",
    },
    2028: {
      capacity_price_delta_usd_per_mw_day: 45,
      source_url:
        "https://www.pjm.com/-/media/markets-ops/rpm/rpm-auction-info/2025-2026/2025-2026-base-residual-auction-report.ashx",
      retrieved_iso: "2026-06-22",
      last_verified: "2026-06-22",
    },
    2029: {
      capacity_price_delta_usd_per_mw_day: 65,
      source_url:
        "https://www.pjm.com/-/media/markets-ops/rpm/rpm-auction-info/2025-2026/2025-2026-base-residual-auction-report.ashx",
      retrieved_iso: "2026-06-22",
      last_verified: "2026-06-22",
    },
    2030: {
      capacity_price_delta_usd_per_mw_day: 90,
      source_url:
        "https://www.pjm.com/-/media/markets-ops/rpm/rpm-auction-info/2025-2026/2025-2026-base-residual-auction-report.ashx",
      retrieved_iso: "2026-06-22",
      last_verified: "2026-06-22",
    },
  },
};

const EIA_TABLE_5A =
  "https://www.eia.gov/electricity/sales_revenue_price/pdf/table_5A.pdf";
const IMM_2026_27_BRA_PART_A =
  "https://www.monitoringanalytics.com/reports/Reports/2025/IMM_Analysis_of_the_20262027_RPM_Base_Residual_Auction_Part_A_20251001.pdf";
const DEC_002 =
  "https://github.com/AthenaTheOwl/ratepayer-exposure/blob/main/decisions/DEC-002-capacity-obligation.md";

// per-zone household inputs. each value is tagged in DEC-002.
//   household_plc_mw       -- the household's capacity obligation (peak
//                             load contribution), MW. assumption, derived
//                             as annual kWh / 8,760 h / 0.5, where 0.5 is
//                             an assumed residential load factor at PJM's
//                             five summer coincident peaks. no published
//                             Dominion or ComEd residential PLC was found.
//   data_center_load_share -- share of the capacity-price delta attributed
//                             to data-center load. assumption; the PJM
//                             market monitor attributes 45.1% of 2026/27
//                             BRA revenues to data-center load, so these
//                             values sit well below the published figure.
//   typical_residential_kwh_per_year, baseline_usd_per_year -- EIA
//                             Table 5A (2024 data), monthly figure x 12.
export const COST_ALLOCATION: Record<LdaCode, CostAllocationRecord> = {
  DOM: {
    data_center_load_share: 0.10,
    data_center_load_share_source_url: IMM_2026_27_BRA_PART_A,
    // 12,384 kWh / 8,760 h / 0.5 = 2.83 kW, rounded to 2.8 kW.
    household_plc_mw: 0.0028,
    household_plc_source_url: DEC_002,
    // Virginia: 1,032 kWh/month x 12.
    typical_residential_kwh_per_year: 12384,
    // Virginia: $148.77/month x 12.
    baseline_usd_per_year: 1785.24,
    source_url: EIA_TABLE_5A,
    retrieved_iso: "2026-10-19",
    last_verified: "2026-10-19",
  },
  COMED: {
    data_center_load_share: 0.12,
    data_center_load_share_source_url: IMM_2026_27_BRA_PART_A,
    // 8,316 kWh / 8,760 h / 0.5 = 1.90 kW, rounded to 1.9 kW. ComEd's
    // published ~$10.60/month residential increase from the 2025/26
    // auction implies ~1.45 kW, so this value runs high (upper-bound).
    household_plc_mw: 0.0019,
    household_plc_source_url: DEC_002,
    // Illinois: 693 kWh/month x 12.
    typical_residential_kwh_per_year: 8316,
    // Illinois: $109.99/month x 12.
    baseline_usd_per_year: 1319.88,
    source_url: EIA_TABLE_5A,
    retrieved_iso: "2026-10-19",
    last_verified: "2026-10-19",
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

  // USD/MW-day x day/yr x MW x share = USD/yr. annual kWh only feeds
  // the PLC derivation documented in DEC-002.
  const delta_usd =
    rate.capacity_price_delta_usd_per_mw_day *
    365 *
    cost.household_plc_mw *
    cost.data_center_load_share;

  return {
    kind: "ok",
    zip_prefix: match.prefix,
    lda,
    year: input.year,
    delta_usd: Math.round(delta_usd * 100) / 100,
    baseline_usd: cost.baseline_usd_per_year,
    sources: [
      rate.source_url,
      cost.household_plc_source_url,
      cost.data_center_load_share_source_url,
      cost.source_url,
    ],
  };
}
