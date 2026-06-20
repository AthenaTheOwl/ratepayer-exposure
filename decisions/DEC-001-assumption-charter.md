# DEC-001 — assumption charter

Status: accepted for v0.1 (PJM DOM zone only).

Every assumption used by `src/lib/bill_delta.ts` is enumerated below
with one of three tags. The tag pins the direction of the assumption so
the calculator's bias cannot be quietly swapped from "conservative" to
"upper-bound" between releases without a charter update.

## tag definitions

- **conservative** — biases the computed delta toward a smaller number.
  A reader who only trusts conservative tags is reading the floor of
  the model's estimate.
- **median** — uses the central value of published estimates. Neither
  the floor nor the ceiling.
- **upper-bound** — biases the computed delta toward a larger number. A
  reader who only trusts upper-bound tags is reading the ceiling of
  the model's estimate.

The methodology page renders the tag next to each row; the
calculator's user-facing copy does not. A reader who wants to see the
charter is expected to click through to `/methodology/` or read this
file directly.

## assumptions used by `billDelta()`

Each row names the constant as it appears in `src/lib/bill_delta.ts`,
the v0.1 value, the tag, and the source URL.

### inputs from `COST_ALLOCATION.DOM`

| constant | v0.1 value | tag | source |
|---|---|---|---|
| `data_center_load_share` | `0.10` | `median` | PJM 2026 load forecast report (link on methodology page) |
| `residential_allocation_share` | `0.04` | `conservative` | Dominion Energy Virginia tariff schedule; calibrated against observed 2025/2026 residential bill impact (~$10-20/month) |
| `typical_residential_kwh_per_year` | `14000` | `median` | EIA Table 5.A, residential sales by state (VA), 2022 average |
| `baseline_usd_per_year` | `1800` | `median` | EIA Table 5.A residential price × typical kWh for VA |

### inputs from `PJM_LDA_RATES.DOM` (per year 2026-2030)

| field | tag | source |
|---|---|---|
| `capacity_price_delta_usd_per_mw_day` (each year) | `conservative` | PJM 2025/2026 BRA result ($444.26/MW-day cleared in DOM) extrapolated forward; values are below the cleared DOM zonal delta so the formula does not overstate exposure |

The 2025/2026 PJM Base Residual Auction cleared at $269.92/MW-day
system-wide and at $444.26/MW-day in DOM, against a prior auction
clearing of $28.92/MW-day. v0.1 extrapolates a DOM-specific delta of
$20-110/MW-day across 2026-2030 (below the cleared DOM delta) and
tags this as conservative.

## structural assumptions

These are not parameters in a JSON file but are baked into the formula
itself. A future charter revision may move any of these to an explicit
tagged row.

- The formula treats `residential_allocation_share` and
  `data_center_load_share` as multiplicative independent factors. In
  reality the two are negatively correlated (more data-center load
  raises the residential allocation share under fixed-cost recovery).
  Tagging this combined assumption as `conservative` because the
  v0.1 residential share is calibrated to observed bill impact rather
  than derived from first principles.
- The formula ignores intra-year demand response and load-following
  curtailment. Tagged `upper-bound` (omitting these biases the delta
  upward); the omission is acceptable in v0.1 because the sanity-bound
  gate caps the ratio at 2.0 of baseline.
- The formula uses a single annual capacity-cost figure rather than a
  monthly bill-by-bill walk. Tagged `median` — neither systematically
  high nor low; eliminates seasonal noise.

## sanity bound

`eval/sanity_bounds.py` asserts that for every covered (zone, year):

    delta_usd / baseline_usd <= 2.0

A violation either means the assumptions above are mis-tagged
(specifically: a `conservative` row is no longer conservative) or that
a real edge case must be called out on the methodology page. The build
fails on violation; the failure is not silenced.

## change log

| date | change |
|---|---|
| 2026-06-20 | v0.1 — initial charter for DOM zone, four parameters, three structural assumptions. |
