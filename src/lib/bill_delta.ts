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
// DEC-001 formula and calibration) and decisions/DEC-003-cleared-bra-prices.md
// (which replaces the DEC-001 price rows with cleared BRA prices) for
// every assumption tagged conservative / median / upper-bound.

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

export type AssumptionTag = "conservative" | "median" | "upper-bound";

// "cleared": a published PJM Base Residual Auction clearing price.
// "assumption": no auction result exists yet; DEC-003 states the basis.
export type PriceBasis = "cleared" | "assumption";

export type LdaRateRecord = {
  // PJM delivery year, June 1 to May 31.
  delivery_year: string;
  price_basis: PriceBasis;
  // zone's BRA resource clearing price, USD / MW-day (UCAP).
  capacity_price_usd_per_mw_day: number;
  // same zone's 2024/2025 BRA clearing price, USD / MW-day (UCAP).
  baseline_price_usd_per_mw_day: number;
  // capacity_price_usd_per_mw_day - baseline_price_usd_per_mw_day.
  capacity_price_delta_usd_per_mw_day: number;
  tag: AssumptionTag;
  source_url: string;
  baseline_source_url: string;
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

// capacity-price deltas, per DEC-003. each row is one PJM delivery year:
// calculator year Y means the delivery year June 1, Y to May 31, Y+1.
//
//   capacity_price_delta_usd_per_mw_day =
//       capacity_price_usd_per_mw_day     # zone's BRA resource clearing price
//     - baseline_price_usd_per_mw_day     # same zone, 2024/2025 BRA ($28.92)
//
// 2026-2028 are cleared BRA prices, read from PJM's BRA reports. every
// LDA cleared at the price cap in all three auctions, so DOM and COMED
// equal the RTO price. 2029 and 2030 have no auction result yet; their
// prices are assumptions (price_basis "assumption"), see DEC-003.
const PJM_BRA_2024_25 =
  "https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2024-2025/2024-2025-base-residual-auction-report.ashx";
const PJM_BRA_2026_27 =
  "https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2026-2027/2026-2027-bra-report.pdf";
const PJM_BRA_2027_28 =
  "https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2027-2028/2027-2028-bra-report.pdf";
const PJM_BRA_2028_29 =
  "https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2028-2029/2028-2029-bra-results-report.pdf";
const PJM_PARAMS_2029_30 =
  "https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2029-2030/2029-2030-planning-period-parameters-for-base-residual-auction-report.pdf";
const PJM_COLLAR_FILING_ER26_1556 =
  "https://www.pjm.com/pjmfiles/directory/etariff/FercDockets/9481/20260227-er26-1556-000.pdf";

// 2024/2025 BRA: COMED and the rest of RTO (DOM was not a modelled LDA)
// cleared at $28.92/MW-day (2024/2025 BRA report, Table 3).
export const BASELINE_PRICE_USD_PER_MW_DAY = 28.92;

function rateRow(
  delivery_year: string,
  price_basis: PriceBasis,
  capacity_price_usd_per_mw_day: number,
  tag: AssumptionTag,
  source_url: string
): LdaRateRecord {
  return {
    delivery_year,
    price_basis,
    capacity_price_usd_per_mw_day,
    baseline_price_usd_per_mw_day: BASELINE_PRICE_USD_PER_MW_DAY,
    capacity_price_delta_usd_per_mw_day:
      Math.round(
        (capacity_price_usd_per_mw_day - BASELINE_PRICE_USD_PER_MW_DAY) * 100
      ) / 100,
    tag,
    source_url,
    baseline_source_url: PJM_BRA_2024_25,
    retrieved_iso: "2026-10-20",
    last_verified: "2026-10-20",
  };
}

// one schedule for both zones: no LDA separated from the RTO price in
// the 2026/27, 2027/28 or 2028/29 BRA, and the 2029/30 cap applies to
// the RTO and every LDA.
//   2026  2026/2027 BRA cleared $329.17 (cap) in every LDA.     median
//   2027  2027/2028 BRA cleared $333.44 (cap) in every LDA.     median
//   2028  2028/2029 BRA cleared $325.00 (cap) in every LDA.     median
//   2029  assumption: the posted 2029/2030 BRA cap, $337.83.    upper-bound
//         the auction runs December 2026 and cannot clear higher.
//   2030  assumption: the 2029/2030 cap carried forward.        conservative
//         the collar ends with 2029/2030 (ER26-1556); PJM's
//         no-cap simulations of the last three BRAs cleared at
//         $388.57-$776.69, all above it.
function schedule(): Record<BillDeltaYear, LdaRateRecord> {
  return {
    2026: rateRow("2026/2027", "cleared", 329.17, "median", PJM_BRA_2026_27),
    2027: rateRow("2027/2028", "cleared", 333.44, "median", PJM_BRA_2027_28),
    2028: rateRow("2028/2029", "cleared", 325.0, "median", PJM_BRA_2028_29),
    2029: rateRow("2029/2030", "assumption", 337.83, "upper-bound", PJM_PARAMS_2029_30),
    2030: rateRow("2030/2031", "assumption", 337.83, "conservative", PJM_COLLAR_FILING_ER26_1556),
  };
}

export const PJM_LDA_RATES: Record<LdaCode, Record<BillDeltaYear, LdaRateRecord>> = {
  DOM: schedule(),
  COMED: schedule(),
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
      rate.baseline_source_url,
      cost.household_plc_source_url,
      cost.data_center_load_share_source_url,
      cost.source_url,
    ],
  };
}
