#!/usr/bin/env python3
"""sanity_bounds.py -- check the shipped bill-delta model against bounds
it cannot satisfy by construction, for every covered (zone, year).

This script does not re-implement the formula. A second copy of a
formula agrees with the first on its own mistakes: the DEC-001 version
of this file multiplied a $/MW-day price by annual kWh exactly as
src/lib/bill_delta.ts did, and passed it. Instead it runs the module the
calculator bundles (eval/model_rows.ts, via tsx from the npm
devDependencies) and checks the model's outputs against facts that do
not depend on how the model combines them:

  1. ratio gate      delta_usd / baseline_usd <= 2.0 (DEC-001).
  2. ceiling         delta_usd <= price_delta x 365 x household_plc_mw.
                     the data-center slice cannot exceed the household's
                     whole capacity-charge change. ($/MW-day x day x MW.)
  3. PLC is power    household_plc_mw is 0.5-10 kW, and its implied load
                     factor (annual kWh / 8,760 h / PLC kW) is 0.25-1.0,
                     so a kWh or kW figure entered as MW fails.
  4. share           0 <= data_center_load_share <= 1.
  5. anchor          COMED: the model's PLC priced at the 2025/26 ComEd
                     capacity-price change lands within 0.5x-2x of
                     ComEd's published residential bill increase.
  6. price inputs    each price delta equals the zone's BRA price less
                     its baseline; the baseline is the 2024/25 BRA price
                     ($28.92); every price lies inside the BRA collar
                     ($175.00 floor to the highest posted cap, $337.83).
                     (DEC-003.)

Python stdlib only; needs `npm install` first so node_modules/.bin/tsx
exists. exits 0 on pass, 1 on a bound violation, 2 on a data shape or
tooling error.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_ROWS = ROOT / "eval" / "model_rows.ts"

BOUND = 2.0
VALID_YEARS = (2026, 2027, 2028, 2029, 2030)
DAYS_PER_YEAR = 365.0
HOURS_PER_YEAR = 8760.0
ROUNDING_USD = 0.005  # billDelta rounds delta_usd to cents

# a single household's capacity obligation, kW. a residential PLC
# outside this band is a units slip (kWh, kW or MW confused), not a home.
PLC_KW_MIN, PLC_KW_MAX = 0.5, 10.0
# average load / load at PJM's summer coincident peaks.
LOAD_FACTOR_MIN, LOAD_FACTOR_MAX = 0.25, 1.0

# external anchor, kept here and out of the model on purpose.
# ComEd: "the average monthly residential customer bill in the ComEd
# service territory is expected to rise by about $10.60" due to the PJM
# capacity auction for 2025/26.
#   https://poweringlives.comed.com/why-is-your-electric-bill-going-up/
# 2025/26 BRA: ComEd cleared $269.92/MW-day; 2024/25 RTO cleared $28.92.
#   https://www.pjm.com/-/media/markets-ops/rpm/rpm-auction-info/2025-2026/2025-2026-base-residual-auction-report.ashx
COMED_PUBLISHED_USD_PER_MONTH = 10.60
COMED_PRICE_DELTA_2025_26 = 269.92 - 28.92
ANCHOR_MIN_RATIO, ANCHOR_MAX_RATIO = 0.5, 2.0

# DEC-003 price anchors, from PJM's own reports:
# 2024/25 BRA report, Table 3: COMED and rest of RTO cleared $28.92.
#   https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2024-2025/2024-2025-base-residual-auction-report.ashx
# collar: 2028/29 cap $325.00 / floor $175.00; 2029/30 cap $337.83 /
# floor $181.91 (2029/2030 planning parameters report). the 2026/27 and
# 2027/28 caps were $329.17 and $333.44.
#   https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2029-2030/2029-2030-planning-period-parameters-for-base-residual-auction-report.pdf
BASELINE_PRICE_2024_25 = 28.92
PRICE_MIN, PRICE_MAX = 175.00, 337.83


def load_model_rows() -> dict:
    tsx = ROOT / "node_modules" / ".bin" / "tsx"
    if not tsx.exists():
        print(
            f"ERROR: {tsx} not found; run `npm install` first.",
            file=sys.stderr,
        )
        sys.exit(2)
    proc = subprocess.run(
        [str(tsx), str(MODEL_ROWS)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        print(f"ERROR: {MODEL_ROWS.name} failed:\n{proc.stderr}", file=sys.stderr)
        sys.exit(2)
    return json.loads(proc.stdout)


def number(row: dict, key: str) -> float:
    value = row.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        print(
            f"ERROR: zone={row.get('zone')} year={row.get('year')} "
            f"has no numeric {key} ({value!r}).",
            file=sys.stderr,
        )
        sys.exit(2)
    return float(value)


def main() -> int:
    data = load_model_rows()

    zones = set(data["zip_zones"])
    if zones != set(data["rate_zones"]) or zones != set(data["cost_zones"]):
        print(
            "ERROR: ZIP_TO_LDA, PJM_LDA_RATES and COST_ALLOCATION cover "
            f"different zones: {data['zip_zones']} / {data['rate_zones']} "
            f"/ {data['cost_zones']}.",
            file=sys.stderr,
        )
        return 2

    violations: list[str] = []
    rows = 0
    checked_zone_inputs: set[str] = set()
    for row in data["rows"]:
        zone, year = row["zone"], row["year"]
        result = row["result"]
        if result.get("kind") != "ok":
            print(f"ERROR: zone={zone} year={year} returned {result}.", file=sys.stderr)
            return 2
        rows += 1

        delta = number(result, "delta_usd")
        baseline = number(result, "baseline_usd")
        price = number(row, "capacity_price_delta_usd_per_mw_day")
        plc_mw = number(row, "household_plc_mw")
        share = number(row, "data_center_load_share")
        kwh = number(row, "typical_residential_kwh_per_year")

        ratio = delta / baseline
        whole = price * DAYS_PER_YEAR * plc_mw
        problems = []
        if ratio > BOUND:
            problems.append(f"ratio {ratio:.3f} > {BOUND:.1f}")
        if delta > whole + ROUNDING_USD:
            problems.append(
                f"delta {delta:.2f} exceeds the whole capacity-charge "
                f"change {whole:.2f} (price x 365 x PLC)"
            )
        cleared = number(row, "capacity_price_usd_per_mw_day")
        base = number(row, "baseline_price_usd_per_mw_day")
        if abs(base - BASELINE_PRICE_2024_25) > 1e-9:
            problems.append(f"baseline {base} != 2024/25 BRA {BASELINE_PRICE_2024_25}")
        if abs(price - (cleared - base)) > ROUNDING_USD:
            problems.append(
                f"price delta {price} != price {cleared} - baseline {base}"
            )
        if not PRICE_MIN <= cleared <= PRICE_MAX:
            problems.append(
                f"price {cleared} outside the {PRICE_MIN}-{PRICE_MAX} collar"
            )
        status = "FAIL" if problems else "OK"
        line = (
            f"{status} zone={zone} year={year} delta={delta:.2f} "
            f"capacity_charge={whole:.2f} baseline={baseline:.2f} "
            f"ratio={ratio:.4f} price={cleared:.2f} ({row.get('price_basis')})"
        )
        if problems:
            line += " [" + "; ".join(problems) + "]"
        print(line)
        if problems:
            violations.append(line)

        if zone in checked_zone_inputs:
            continue
        checked_zone_inputs.add(zone)

        plc_kw = plc_mw * 1000.0
        load_factor = (kwh / HOURS_PER_YEAR) / plc_kw if plc_kw > 0 else float("inf")
        input_problems = []
        if not PLC_KW_MIN <= plc_kw <= PLC_KW_MAX:
            input_problems.append(
                f"PLC {plc_kw:.4g} kW outside {PLC_KW_MIN}-{PLC_KW_MAX} kW"
            )
        if not LOAD_FACTOR_MIN <= load_factor <= LOAD_FACTOR_MAX:
            input_problems.append(
                f"implied load factor {load_factor:.3g} outside "
                f"{LOAD_FACTOR_MIN}-{LOAD_FACTOR_MAX}"
            )
        if not 0.0 <= share <= 1.0:
            input_problems.append(f"data_center_load_share {share} outside 0-1")
        anchor = ""
        if zone == "COMED":
            modelled = COMED_PRICE_DELTA_2025_26 * DAYS_PER_YEAR * plc_mw
            published = COMED_PUBLISHED_USD_PER_MONTH * 12.0
            anchor_ratio = modelled / published
            anchor = (
                f" anchor={modelled:.2f}/{published:.2f}={anchor_ratio:.2f}x"
            )
            if not ANCHOR_MIN_RATIO <= anchor_ratio <= ANCHOR_MAX_RATIO:
                input_problems.append(
                    f"2025/26 capacity-charge change {modelled:.2f} is "
                    f"{anchor_ratio:.2f}x ComEd's published {published:.2f}"
                )
        status = "FAIL" if input_problems else "OK"
        line = (
            f"{status} zone={zone} inputs plc_kw={plc_kw:.2f} "
            f"load_factor={load_factor:.3f} share={share}{anchor}"
        )
        if input_problems:
            line += " [" + "; ".join(input_problems) + "]"
        print(line)
        if input_problems:
            violations.append(line)

    years_by_zone: dict[str, list[int]] = {}
    for row in data["rows"]:
        years_by_zone.setdefault(row["zone"], []).append(row["year"])
    for zone in zones:
        if tuple(sorted(years_by_zone.get(zone, []))) != VALID_YEARS:
            print(
                f"ERROR: zone={zone} has years {years_by_zone.get(zone)}; "
                f"expected {list(VALID_YEARS)}.",
                file=sys.stderr,
            )
            return 2

    if violations:
        print(
            f"\nFAIL: {len(violations)} check(s) failed across {rows} rows.",
            file=sys.stderr,
        )
        return 1

    print(
        f"\nOK: {rows} rows within the {BOUND:.1f}x ratio gate and the "
        "capacity-charge ceiling; price, PLC, share and ComEd anchor checks pass."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
