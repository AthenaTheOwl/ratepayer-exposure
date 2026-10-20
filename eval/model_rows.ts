// model_rows.ts -- print the shipped model's inputs and outputs as JSON
// for eval/sanity_bounds.py. it imports the module the calculator
// bundles, so the python gate checks what the user sees rather than a
// second copy of the formula. run with: node_modules/.bin/tsx eval/model_rows.ts

import {
  billDelta,
  COST_ALLOCATION,
  PJM_LDA_RATES,
  VALID_YEARS,
  ZIP_TO_LDA,
  type LdaCode,
} from "../src/lib/bill_delta";

const rows: unknown[] = [];
for (const [prefix, lda] of Object.entries(ZIP_TO_LDA)) {
  const zone = lda as LdaCode;
  const cost = COST_ALLOCATION[zone];
  for (const year of VALID_YEARS) {
    rows.push({
      zone,
      year,
      result: billDelta({ zip: prefix + "00", year }),
      capacity_price_delta_usd_per_mw_day:
        PJM_LDA_RATES[zone]?.[year]?.capacity_price_delta_usd_per_mw_day ?? null,
      household_plc_mw: cost?.household_plc_mw ?? null,
      data_center_load_share: cost?.data_center_load_share ?? null,
      typical_residential_kwh_per_year: cost?.typical_residential_kwh_per_year ?? null,
      baseline_usd_per_year: cost?.baseline_usd_per_year ?? null,
    });
  }
}

console.log(
  JSON.stringify({
    zip_zones: [...new Set(Object.values(ZIP_TO_LDA))],
    rate_zones: Object.keys(PJM_LDA_RATES),
    cost_zones: Object.keys(COST_ALLOCATION),
    rows,
  })
);
