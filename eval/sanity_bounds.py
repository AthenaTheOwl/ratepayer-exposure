#!/usr/bin/env python3
"""sanity_bounds.py -- verify delta_usd / baseline_usd <= 2.0 for every
covered (zone, year) in the v0.1 model.

This script is an INDEPENDENT re-implementation of the formula and the
data in src/lib/bill_delta.ts. Independence is the point: if the TS
constants drift away from the Python constants below, the bound is no
longer being checked against what the user sees. Keep both in sync; the
vitest suite also asserts the same bound from the TS side, so any
divergence between the two implementations shows up in CI.

Python stdlib only -- no pip install. exits 0 on pass, 1 on bound
violation, 2 on data shape error.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass

BOUND = 2.0
VALID_YEARS = (2026, 2027, 2028, 2029, 2030)


@dataclass(frozen=True)
class CostAllocation:
    data_center_load_share: float
    residential_allocation_share: float
    typical_residential_kwh_per_year: float
    baseline_usd_per_year: float


COST_ALLOCATION: dict[str, CostAllocation] = {
    "DOM": CostAllocation(
        data_center_load_share=0.10,
        residential_allocation_share=0.04,
        typical_residential_kwh_per_year=14000.0,
        baseline_usd_per_year=1800.0,
    ),
    "COMED": CostAllocation(
        data_center_load_share=0.12,
        residential_allocation_share=0.035,
        typical_residential_kwh_per_year=8500.0,
        baseline_usd_per_year=1140.0,
    ),
}

# capacity_price_delta_usd_per_mw_day, per (zone, year)
LDA_RATES: dict[str, dict[int, float]] = {
    "DOM": {
        2026: 20.0,
        2027: 35.0,
        2028: 55.0,
        2029: 80.0,
        2030: 110.0,
    },
    "COMED": {
        2026: 15.0,
        2027: 28.0,
        2028: 45.0,
        2029: 65.0,
        2030: 90.0,
    },
}


def bill_delta(zone: str, year: int) -> tuple[float, float]:
    """returns (delta_usd, baseline_usd) for the (zone, year)."""
    cost = COST_ALLOCATION[zone]
    rate = LDA_RATES[zone][year]
    delta = (
        rate
        * 365.0
        * cost.residential_allocation_share
        * cost.data_center_load_share
        * cost.typical_residential_kwh_per_year
    ) / 1000.0
    return delta, cost.baseline_usd_per_year


def main() -> int:
    if set(COST_ALLOCATION.keys()) != set(LDA_RATES.keys()):
        print(
            "ERROR: COST_ALLOCATION and LDA_RATES cover different zones.",
            file=sys.stderr,
        )
        return 2

    violations: list[str] = []
    rows = 0
    for zone, rates in LDA_RATES.items():
        years = sorted(rates.keys())
        if tuple(years) != VALID_YEARS:
            print(
                f"ERROR: zone={zone} has years {years}; expected {list(VALID_YEARS)}.",
                file=sys.stderr,
            )
            return 2
        for year in years:
            rows += 1
            delta, baseline = bill_delta(zone, year)
            ratio = delta / baseline
            status = "OK" if ratio <= BOUND else "FAIL"
            line = (
                f"{status} zone={zone} year={year} "
                f"delta={delta:.2f} baseline={baseline:.2f} ratio={ratio:.3f}"
            )
            print(line)
            if ratio > BOUND:
                violations.append(line)

    if violations:
        print(
            f"\nFAIL: {len(violations)} of {rows} rows exceed the "
            f"{BOUND:.1f}x sanity bound.",
            file=sys.stderr,
        )
        return 1

    print(f"\nOK: {rows} rows all within the {BOUND:.1f}x sanity bound.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
